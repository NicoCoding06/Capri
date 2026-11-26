// Capri Server: invio di notifiche Web Push senza librerie esterne (RFC 8291 aes128gcm + VAPID RFC 8292).
// Il contenuto è cifrato per il solo telefono destinatario: Apple/Google lo consegnano senza poterlo leggere.
import { createECDH, createCipheriv, createPrivateKey, sign, randomBytes, hkdfSync } from 'node:crypto';

const b64u = (buf) => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = (s) => Buffer.from(String(s).replace(/-/g, '+').replace(/_/g, '/'), 'base64');
const hkdf = (salt, ikm, info, len) => Buffer.from(hkdfSync('sha256', ikm, salt, info, len));

export function encrypt(payload, p256dh, auth, { salt = randomBytes(16), asKeys = null } = {}) {
  const uaPub = unb64u(p256dh), authSecret = unb64u(auth);
  const ecdh = createECDH('prime256v1');
  if (asKeys) ecdh.setPrivateKey(asKeys); else ecdh.generateKeys();
  const asPub = ecdh.getPublicKey();
  const shared = ecdh.computeSecret(uaPub);
  const keyInfo = Buffer.concat([Buffer.from('WebPush: info\0'), uaPub, asPub]);
  const ikm = hkdf(authSecret, shared, keyInfo, 32);
  const cek = hkdf(salt, ikm, Buffer.from('Content-Encoding: aes128gcm\0'), 16);
  const nonce = hkdf(salt, ikm, Buffer.from('Content-Encoding: nonce\0'), 12);
  const plain = Buffer.concat([Buffer.from(payload), Buffer.from([2])]);
  const c = createCipheriv('aes-128-gcm', cek, nonce);
  const enc = Buffer.concat([c.update(plain), c.final(), c.getAuthTag()]);
  const rs = Buffer.alloc(4); rs.writeUInt32BE(4096);
  return Buffer.concat([salt, rs, Buffer.from([asPub.length]), asPub, enc]);
}

export function vapidAuth(endpoint, { publicKey, privateKey, subject }) {
  const pub = unb64u(publicKey);
  const key = createPrivateKey({ key: { kty: 'EC', crv: 'P-256', d: privateKey, x: b64u(pub.subarray(1, 33)), y: b64u(pub.subarray(33, 65)) }, format: 'jwk' });
  const aud = new URL(endpoint).origin;
  const head = b64u(JSON.stringify({ typ: 'JWT', alg: 'ES256' }));
  const body = b64u(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: subject || 'mailto:capri@example.com' }));
  const sig = sign('sha256', Buffer.from(head + '.' + body), { key, dsaEncoding: 'ieee-p1363' });
  return `vapid t=${head}.${body}.${b64u(sig)}, k=${publicKey}`;
}

export async function sendNotification(sub, payload, vapid, { ttl = 3 * 3600, urgency = 'normal' } = {}) {
  const body = encrypt(typeof payload === 'string' ? payload : JSON.stringify(payload), sub.keys.p256dh, sub.keys.auth);
  const r = await fetch(sub.endpoint, {
    method: 'POST',
    headers: { 'Content-Encoding': 'aes128gcm', 'Content-Type': 'application/octet-stream', TTL: String(ttl), Urgency: urgency, Authorization: vapidAuth(sub.endpoint, vapid) },
    body,
  });
  if (!r.ok) { const e = new Error(`push ${r.status}: ${(await r.text()).slice(0, 200)}`); e.statusCode = r.status; throw e; }
  return r.status;
}
