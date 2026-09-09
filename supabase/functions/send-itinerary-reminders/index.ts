// Fonction appelée périodiquement par pg_cron (toutes les ~5-10 minutes,
// voir supabase/migrations/0012b_reminders_cron.sql) : pour chaque
// voyageur ayant activé les rappels, envoie une notification push si une
// étape de son itinéraire arrive dans le délai qu'il a choisi.
//
// Secrets à configurer sur cette fonction (Dashboard Supabase → Edge
// Functions → send-itinerary-reminders → Secrets) :
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY  — générés une fois, voir ROADMAP.md
//   VAPID_SUBJECT                        — "mailto:contact@exploreusa..." (contact requis par la norme Web Push)
//   CRON_SECRET                          — jeton partagé avec l'appel pg_cron, pour que cette URL
//                                           (techniquement publique) ignore toute requête qui ne vient pas du cron
//
// SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont fournis automatiquement
// par la plateforme à toutes les fonctions, pas besoin de les configurer.

import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

// Fenêtre dans laquelle on considère qu'une étape est "imminente" : entre
// maintenant et (maintenant + délai choisi par le voyageur). Le cron
// repassant régulièrement, sent_reminders empêche un double envoi.
function zonedTimeToUtc(dateStr: string, timeStr: string, timeZone: string): Date | null {
  var dateParts = dateStr.split('-').map(Number);
  var timeParts = timeStr.split(':').map(Number);
  if (dateParts.length !== 3 || timeParts.length < 2) return null;
  var y = dateParts[0], mo = dateParts[1], d = dateParts[2];
  var hh = timeParts[0], mm = timeParts[1];

  var utcGuess = new Date(Date.UTC(y, mo - 1, d, hh, mm));
  try {
    var fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: timeZone, hourCycle: 'h23',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
    var parts: Record<string, string> = {};
    fmt.formatToParts(utcGuess).forEach(function (p) { parts[p.type] = p.value; });
    var asIfUtc = Date.UTC(
      Number(parts.year), Number(parts.month) - 1, Number(parts.day),
      Number(parts.hour), Number(parts.minute), Number(parts.second)
    );
    var offset = asIfUtc - utcGuess.getTime();
    return new Date(utcGuess.getTime() - offset);
  } catch (err) {
    console.warn('Fuseau horaire invalide pour la géolocalisation du jour :', timeZone, err);
    return null;
  }
}

var timezoneCache: Record<string, string | null> = {};

async function resolveTimezone(locationLabel: string | null): Promise<string | null> {
  if (!locationLabel) return null;
  if (locationLabel in timezoneCache) return timezoneCache[locationLabel];
  try {
    var res = await fetch(
      'https://geocoding-api.open-meteo.com/v1/search?name=' +
        encodeURIComponent(locationLabel) + '&count=1&language=fr&format=json'
    );
    var data = await res.json();
    var place = data.results && data.results[0];
    var tz = place && place.timezone ? place.timezone : null;
    timezoneCache[locationLabel] = tz;
    return tz;
  } catch (err) {
    console.warn('Géocodage indisponible pour', locationLabel, err);
    timezoneCache[locationLabel] = null;
    return null;
  }
}

Deno.serve(async (req) => {
  var cronSecret = Deno.env.get('CRON_SECRET');
  var authHeader = req.headers.get('Authorization') || '';
  if (!cronSecret || authHeader !== 'Bearer ' + cronSecret) {
    return new Response('Unauthorized', { status: 401 });
  }

  var vapidPublic = Deno.env.get('VAPID_PUBLIC_KEY');
  var vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY');
  var vapidSubject = Deno.env.get('VAPID_SUBJECT');
  if (!vapidPublic || !vapidPrivate || !vapidSubject) {
    return new Response('Clés VAPID manquantes (secrets de la fonction)', { status: 500 });
  }
  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

  var supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  var travelersRes = await supabase
    .from('travelers')
    .select('id, trip_id, reminder_lead_minutes, push_subscriptions(*)')
    .eq('reminders_enabled', true);
  if (travelersRes.error) {
    console.error(travelersRes.error);
    return new Response('Erreur lecture travelers', { status: 500 });
  }

  var travelers = (travelersRes.data || []).filter(function (t: any) {
    return (t.push_subscriptions || []).length > 0;
  });
  if (!travelers.length) return new Response('Rien à faire (aucun voyageur abonné).', { status: 200 });

  var tripIds = Array.from(new Set(travelers.map(function (t: any) { return t.trip_id; })));

  var daysRes = await supabase
    .from('itinerary_days')
    .select('id, trip_id, date, location_label, itinerary_items(id, title, time, address, map_query)')
    .in('trip_id', tripIds);
  if (daysRes.error) {
    console.error(daysRes.error);
    return new Response('Erreur lecture itinéraire', { status: 500 });
  }

  var daysByTrip: Record<string, any[]> = {};
  (daysRes.data || []).forEach(function (day: any) {
    if (!daysByTrip[day.trip_id]) daysByTrip[day.trip_id] = [];
    daysByTrip[day.trip_id].push(day);
  });

  var now = new Date();
  var sentCount = 0;
  var expiredEndpoints: string[] = [];

  for (var t = 0; t < travelers.length; t++) {
    var traveler: any = travelers[t];
    var days = daysByTrip[traveler.trip_id] || [];
    var leadMs = (traveler.reminder_lead_minutes || 30) * 60000;

    for (var d = 0; d < days.length; d++) {
      var day = days[d];
      if (!day.date) continue;
      var tz = await resolveTimezone(day.location_label);
      if (!tz) continue;

      var items = day.itinerary_items || [];
      for (var i = 0; i < items.length; i++) {
        var item = items[i];
        if (!item.time) continue;
        var itemUtc = zonedTimeToUtc(day.date, item.time, tz);
        if (!itemUtc) continue;

        var msUntil = itemUtc.getTime() - now.getTime();
        if (msUntil <= 0 || msUntil > leadMs) continue;

        var alreadySent = await supabase
          .from('sent_reminders')
          .select('item_id')
          .eq('item_id', item.id)
          .eq('traveler_id', traveler.id)
          .maybeSingle();
        if (alreadySent.data) continue;

        var minutesLeft = Math.max(1, Math.round(msUntil / 60000));
        var payload = JSON.stringify({
          title: '⏰ ' + item.title,
          body: 'Dans ' + minutesLeft + ' min' + (item.address || day.location_label ? ' · ' + (item.address || day.location_label) : ''),
        });

        var subs = traveler.push_subscriptions || [];
        for (var s = 0; s < subs.length; s++) {
          var sub = subs[s];
          try {
            await webpush.sendNotification(
              { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
              payload
            );
            sentCount++;
          } catch (err: any) {
            if (err && (err.statusCode === 404 || err.statusCode === 410)) {
              expiredEndpoints.push(sub.endpoint);
            } else {
              console.warn('Échec envoi push', err);
            }
          }
        }

        await supabase.from('sent_reminders').insert({ item_id: item.id, traveler_id: traveler.id });
      }
    }
  }

  if (expiredEndpoints.length) {
    await supabase.from('push_subscriptions').delete().in('endpoint', expiredEndpoints);
  }

  return new Response(
    JSON.stringify({ sent: sentCount, cleaned: expiredEndpoints.length }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});
