// Notification push envoyée aux voyageurs d'un voyage quand Alexia ajoute
// un document ou ajoute/modifie une étape d'itinéraire depuis l'espace
// admin (voir js/admin.js, appels à supabase.functions.invoke('notify-
// trip-update', ...)). Complète send-itinerary-reminders (rappels avant
// l'heure d'une étape) avec ces notifications ponctuelles liées au
// contenu du voyage. Réutilise les mêmes abonnements Web Push
// (push_subscriptions) et les mêmes secrets VAPID déjà configurés sur le
// projet — aucun secret supplémentaire à ajouter pour déployer cette
// fonction.
//
// À la différence de send-itinerary-reminders (appelée par pg_cron, donc
// authentifiée par un jeton CRON_SECRET partagé), cette fonction est
// appelée directement depuis le navigateur d'Alexia avec sa propre
// session Supabase : l'option "Verify JWT" de la fonction (activée par
// défaut) garantit déjà que l'appelant est un utilisateur connecté connu
// — mais n'importe quel voyageur connecté aussi, pas seulement Alexia.
// On vérifie donc en plus, à l'intérieur, que l'appelant est bien admin
// (is_admin()) avant d'envoyer quoi que ce soit : sans ça, n'importe quel
// voyageur du voyage pourrait notifier tous les autres.
//
// SUPABASE_URL, SUPABASE_ANON_KEY et SUPABASE_SERVICE_ROLE_KEY sont
// fournis automatiquement par la plateforme à toutes les fonctions, pas
// besoin de les configurer.

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
// VAPID (RFC 8292) + chiffrement aes128gcm (RFC 8291) — identique à
// send-itinerary-reminders/index.ts. Dupliqué plutôt que partagé via un
// module commun : les fonctions de ce projet sont déployées une à une en
// copiant-collant leur code dans l'éditeur du Dashboard Supabase (pas de
// CLI), où un import inter-fonctions ne fonctionnerait pas.
// ---------------------------------------------------------------

async function importVapidPrivateKey(publicKeyB64: string, privateKeyB64: string): Promise<CryptoKey> {
  var pub = base64UrlToBytes(publicKeyB64);
  var priv = base64UrlToBytes(privateKeyB64);
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

async function encryptPushPayload(payload: Uint8Array, p256dhB64: string, authB64: string): Promise<Uint8Array> {
  var uaPublic = base64UrlToBytes(p256dhB64);
  var authSecret = base64UrlToBytes(authB64);
  var encoder = new TextEncoder();

  var asKeyPair = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  var asPublic = new Uint8Array(await crypto.subtle.exportKey('raw', asKeyPair.publicKey));

  var uaPublicKey = await crypto.subtle.importKey('raw', uaPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  var ecdhSecret = new Uint8Array(
    await crypto.subtle.deriveBits({ name: 'ECDH', public: uaPublicKey }, asKeyPair.privateKey, 256)
  );

  var prkKey = await crypto.subtle.importKey('raw', authSecret, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  var prk = new Uint8Array(await crypto.subtle.sign('HMAC', prkKey, ecdhSecret));

  var keyInfo = concatBytes([
    encoder.encode('WebPush: info'), new Uint8Array([0]), uaPublic, asPublic, new Uint8Array([1]),
  ]);
  var ikmKey = await crypto.subtle.importKey('raw', prk, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  var ikm = new Uint8Array(await crypto.subtle.sign('HMAC', ikmKey, keyInfo));

  var salt = crypto.getRandomValues(new Uint8Array(16));
  var prk2Key = await crypto.subtle.importKey('raw', salt, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  var prk2 = new Uint8Array(await crypto.subtle.sign('HMAC', prk2Key, ikm));
  var prk2HmacKey = await crypto.subtle.importKey('raw', prk2, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);

  var cekInfo = concatBytes([encoder.encode('Content-Encoding: aes128gcm'), new Uint8Array([0, 1])]);
  var cek = (new Uint8Array(await crypto.subtle.sign('HMAC', prk2HmacKey, cekInfo))).slice(0, 16);

  var nonceInfo = concatBytes([encoder.encode('Content-Encoding: nonce'), new Uint8Array([0, 1])]);
  var nonce = (new Uint8Array(await crypto.subtle.sign('HMAC', prk2HmacKey, nonceInfo))).slice(0, 12);

  var plaintext = concatBytes([payload, new Uint8Array([2])]);
  var cekKey = await crypto.subtle.importKey('raw', cek, { name: 'AES-GCM' }, false, ['encrypt']);
  var ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, cekKey, plaintext));

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

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  var authHeader = req.headers.get('Authorization') || '';

  var body: any;
  try {
    body = await req.json();
  } catch (err) {
    return new Response('JSON invalide', { status: 400 });
  }
  var tripId = body && body.trip_id;
  var title = body && typeof body.title === 'string' ? body.title.slice(0, 120) : null;
  var text = body && typeof body.body === 'string' ? body.body.slice(0, 200) : null;
  if (!tripId || !title || !text) {
    return new Response('trip_id, title et body sont requis', { status: 400 });
  }

  // Vérifie que l'appelant est bien admin — "Verify JWT" (réglage de la
  // fonction) garantit seulement que c'est un utilisateur connecté connu,
  // pas qu'il a le droit de notifier tout le monde.
  var callerClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  );
  var adminCheck = await callerClient.rpc('is_admin');
  if (adminCheck.error || adminCheck.data !== true) {
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

  var subsRes = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('trip_id', tripId);
  if (subsRes.error) {
    console.error(subsRes.error);
    return new Response('Erreur lecture abonnements', { status: 500 });
  }

  var subs = subsRes.data || [];
  if (!subs.length) return new Response(JSON.stringify({ sent: 0 }), { headers: { 'Content-Type': 'application/json' } });

  var payloadObj = { title: title, body: text };
  var sentCount = 0;
  var expiredEndpoints: string[] = [];

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

  if (expiredEndpoints.length) {
    await supabase.from('push_subscriptions').delete().in('endpoint', expiredEndpoints);
  }

  return new Response(
    JSON.stringify({ sent: sentCount, cleaned: expiredEndpoints.length }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});
