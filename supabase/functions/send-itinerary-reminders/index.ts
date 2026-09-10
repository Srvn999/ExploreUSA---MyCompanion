// Fonction appelée périodiquement par pg_cron (toutes les ~5 minutes) :
// pour chaque voyageur ayant activé les rappels, envoie une notification
// push si une étape de son itinéraire arrive dans le délai qu'il a
// choisi.
//
// Envoi Web Push implémenté "à la main" (VAPID + chiffrement aes128gcm,
// RFC 8291/8292) avec uniquement l'API Web Crypto standard — la librairie
// npm `web-push` a été retirée : elle utilise en interne des mécanismes
// réseau propres à Node.js qui restent bloqués (timeout) dans le runtime
// Deno des fonctions Supabase.
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

// ---------------------------------------------------------------
// Utilitaires base64url <-> octets
// ---------------------------------------------------------------

function base64UrlToBytes(base64url: string): Uint8Array {
  var padding = '='.repeat((4 - (base64url.length % 4)) % 4);
  var base64 = (base64url + padding).replace(/-/g, '+').replace(/_/g, '/');
  var raw = atob(base64);
  var arr = new Uint8Array(raw.length);
  for (var i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  var str = '';
  for (var i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function concatBytes(arrays: Uint8Array[]): Uint8Array {
  var len = 0;
  for (var i = 0; i < arrays.length; i++) len += arrays[i].length;
  var out = new Uint8Array(len);
  var offset = 0;
  for (var j = 0; j < arrays.length; j++) { out.set(arrays[j], offset); offset += arrays[j].length; }
  return out;
}

// ---------------------------------------------------------------
// VAPID (RFC 8292) : jeton d'identification signé avec la clé privée du
// serveur, prouvant au service de push (Chrome/Firefox/Apple...) que
// c'est bien nous qui envoyons.
// ---------------------------------------------------------------

async function importVapidPrivateKey(publicKeyB64: string, privateKeyB64: string): Promise<CryptoKey> {
  var pub = base64UrlToBytes(publicKeyB64); // point EC non compressé : 0x04 || X(32) || Y(32)
  var priv = base64UrlToBytes(privateKeyB64); // scalaire privé brut, 32 octets
  var jwk = {
    kty: 'EC', crv: 'P-256', alg: 'ES256', ext: true,
    d: bytesToBase64Url(priv),
    x: bytesToBase64Url(pub.slice(1, 33)),
    y: bytesToBase64Url(pub.slice(33, 65)),
  };
  return await crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
}

async function buildVapidAuthHeader(
  endpoint: string, subject: string, publicKeyB64: string, privateKey: CryptoKey
): Promise<string> {
  var aud = new URL(endpoint).origin;
  var header = { typ: 'JWT', alg: 'ES256' };
  var claims = { aud: aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: subject };
  var encoder = new TextEncoder();
  var unsigned =
    bytesToBase64Url(encoder.encode(JSON.stringify(header))) + '.' +
    bytesToBase64Url(encoder.encode(JSON.stringify(claims)));
  var signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' }, privateKey, encoder.encode(unsigned)
  );
  var jwt = unsigned + '.' + bytesToBase64Url(new Uint8Array(signature));
  return 'vapid t=' + jwt + ', k=' + publicKeyB64;
}

// ---------------------------------------------------------------
// Chiffrement du message (RFC 8291, content-coding aes128gcm) : seul
// format que les navigateurs acceptent pour le corps d'une notification
// push contenant des données.
// ---------------------------------------------------------------

async function encryptPushPayload(payload: Uint8Array, p256dhB64: string, authB64: string): Promise<Uint8Array> {
  var uaPublic = base64UrlToBytes(p256dhB64); // clé publique de l'abonnement (navigateur du voyageur)
  var authSecret = base64UrlToBytes(authB64);
  var encoder = new TextEncoder();

  var asKeyPair = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  var asPublic = new Uint8Array(await crypto.subtle.exportKey('raw', asKeyPair.publicKey));

  var uaPublicKey = await crypto.subtle.importKey('raw', uaPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  var ecdhSecret = new Uint8Array(
    await crypto.subtle.deriveBits({ name: 'ECDH', public: uaPublicKey }, asKeyPair.privateKey, 256)
  );

  // Étape HKDF 1 : dérive une clé intermédiaire à partir du secret ECDH,
  // "salée" par le secret d'authentification de l'abonnement.
  var prkKey = await crypto.subtle.importKey('raw', authSecret, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  var prk = new Uint8Array(await crypto.subtle.sign('HMAC', prkKey, ecdhSecret));

  var keyInfo = concatBytes([
    encoder.encode('WebPush: info'), new Uint8Array([0]), uaPublic, asPublic, new Uint8Array([1]),
  ]);
  var ikmKey = await crypto.subtle.importKey('raw', prk, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  var ikm = new Uint8Array(await crypto.subtle.sign('HMAC', ikmKey, keyInfo));

  // Étape HKDF 2 : dérive la clé de chiffrement (CEK) et le nonce à
  // partir d'un sel aléatoire propre à ce message.
  var salt = crypto.getRandomValues(new Uint8Array(16));
  var prk2Key = await crypto.subtle.importKey('raw', salt, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  var prk2 = new Uint8Array(await crypto.subtle.sign('HMAC', prk2Key, ikm));
  var prk2HmacKey = await crypto.subtle.importKey('raw', prk2, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);

  var cekInfo = concatBytes([encoder.encode('Content-Encoding: aes128gcm'), new Uint8Array([0, 1])]);
  var cek = (new Uint8Array(await crypto.subtle.sign('HMAC', prk2HmacKey, cekInfo))).slice(0, 16);

  var nonceInfo = concatBytes([encoder.encode('Content-Encoding: nonce'), new Uint8Array([0, 1])]);
  var nonce = (new Uint8Array(await crypto.subtle.sign('HMAC', prk2HmacKey, nonceInfo))).slice(0, 12);

  // Delimiteur 0x02 = dernier (et unique) enregistrement du message.
  var plaintext = concatBytes([payload, new Uint8Array([2])]);
  var cekKey = await crypto.subtle.importKey('raw', cek, { name: 'AES-GCM' }, false, ['encrypt']);
  var ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, cekKey, plaintext));

  // En-tête aes128gcm : sel(16) || taille d'enregistrement(4, big-endian) || longueur clé(1) || clé publique éphémère
  var header = new Uint8Array(16 + 4 + 1 + asPublic.length);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, 4096, false);
  header[20] = asPublic.length;
  header.set(asPublic, 21);

  return concatBytes([header, ciphertext]);
}

async function sendWebPush(
  sub: { endpoint: string; p256dh: string; auth: string },
  payloadObj: unknown,
  vapidPrivateKey: CryptoKey,
  vapidPublicKeyB64: string,
  vapidSubject: string
): Promise<Response> {
  var payloadBytes = new TextEncoder().encode(JSON.stringify(payloadObj));
  var body = await encryptPushPayload(payloadBytes, sub.p256dh, sub.auth);
  var authHeader = await buildVapidAuthHeader(sub.endpoint, vapidSubject, vapidPublicKeyB64, vapidPrivateKey);

  var controller = new AbortController();
  var timeout = setTimeout(function () { controller.abort(); }, 10000);
  try {
    return await fetch(sub.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
        TTL: '86400',
        Authorization: authHeader,
      },
      body: body,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

// ---------------------------------------------------------------
// Correspondance heure locale de l'étape <-> instant UTC réel, et
// résolution du fuseau horaire d'un jour à partir de son lieu.
// ---------------------------------------------------------------

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
    console.warn('Fuseau horaire invalide :', timeZone, err);
    return null;
  }
}

var timezoneCache: Record<string, string | null> = {};

async function resolveTimezone(locationLabel: string | null): Promise<string | null> {
  if (!locationLabel) return null;
  if (locationLabel in timezoneCache) return timezoneCache[locationLabel];
  var controller = new AbortController();
  var timeout = setTimeout(function () { controller.abort(); }, 8000);
  try {
    var res = await fetch(
      'https://geocoding-api.open-meteo.com/v1/search?name=' +
        encodeURIComponent(locationLabel) + '&count=1&language=fr&format=json',
      { signal: controller.signal }
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
  } finally {
    clearTimeout(timeout);
  }
}

// ---------------------------------------------------------------

Deno.serve(async (req) => {
  var cronSecret = Deno.env.get('CRON_SECRET');
  var authHeader = req.headers.get('Authorization') || '';
  if (!cronSecret || authHeader !== 'Bearer ' + cronSecret) {
    return new Response('Unauthorized', { status: 401 });
  }

  var vapidPublic = Deno.env.get('VAPID_PUBLIC_KEY');
  var vapidPrivateB64 = Deno.env.get('VAPID_PRIVATE_KEY');
  var vapidSubject = Deno.env.get('VAPID_SUBJECT');
  if (!vapidPublic || !vapidPrivateB64 || !vapidSubject) {
    return new Response('Clés VAPID manquantes (secrets de la fonction)', { status: 500 });
  }
  var vapidPrivateKey = await importVapidPrivateKey(vapidPublic, vapidPrivateB64);

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
        var payloadObj = {
          title: '⏰ ' + item.title,
          body: 'Dans ' + minutesLeft + ' min' + (item.address || day.location_label ? ' · ' + (item.address || day.location_label) : ''),
        };

        var subs = traveler.push_subscriptions || [];
        for (var s = 0; s < subs.length; s++) {
          var sub = subs[s];
          try {
            var pushRes = await sendWebPush(sub, payloadObj, vapidPrivateKey, vapidPublic, vapidSubject);
            if (pushRes.status === 404 || pushRes.status === 410) {
              expiredEndpoints.push(sub.endpoint);
            } else if (pushRes.status >= 200 && pushRes.status < 300) {
              sentCount++;
            } else {
              console.warn('Échec envoi push, statut', pushRes.status, await pushRes.text());
            }
          } catch (err) {
            console.warn('Échec envoi push', err);
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
