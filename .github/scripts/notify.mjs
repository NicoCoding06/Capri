// Capri: invio delle notifiche giornaliere (eseguito ogni ora da GitHub Actions).
// Legge da Supabase le iscrizioni, i ticket e le scadenze di ogni utente e,
// all'orario scelto dall'utente, manda il riepilogo a tutti i suoi dispositivi.
import { readFileSync } from 'node:fs';
import { buildICS } from './ics.mjs';
import { webcrypto, createECDH, randomBytes } from 'node:crypto';

await import(new URL('../../digest.js', import.meta.url).href);
const { build, forSlot, slots: slotsOf, rome, ALL } = globalThis.CapriDigest;

const SELFTEST = process.env.SELFTEST === '1';
const MOCK = process.env.MOCK_FILE || '';
const FORCE = process.env.FORCE === 'true';
const BASE = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const KEY = process.env.SUPABASE_SECRET_KEY || '';
const CALTEST = process.env.CALTEST === 'true';
const SITE = process.env.SITE_URL || '';

const b64u = (buf) => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

async function selftest() {
  const webpush = (await import('web-push')).default;
  // 1) chiavi VAPID create come fa il telefono (WebCrypto P-256)
  const kp = await webcrypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const pub = b64u(await webcrypto.subtle.exportKey('raw', kp.publicKey));
  const priv = (await webcrypto.subtle.exportKey('jwk', kp.privateKey)).d;
  // 2) iscrizione finta di un browser
  const ecdh = createECDH('prime256v1'); ecdh.generateKeys();
  const sub = { endpoint: 'https://web.push.apple.com/selftest', keys: { p256dh: b64u(ecdh.getPublicKey()), auth: b64u(randomBytes(16)) } };
  // 3) riepilogo di prova
  const day = (n) => { const d = new Date(Date.now() + n * 864e5); return d.toISOString().slice(0, 10); };
  const payload = build({
    tickets: [
      { title: 'Rinnovo passaporto', urg: 4, due: day(-2), status: 'aperto' },
      { title: 'Bolletta luce', urg: 3, due: day(0), status: 'aperto' },
      { title: 'Montare mensole', urg: 1, status: 'aperto' },
    ],
    abb: [{ name: 'Netflix', amt: 13.99, next: day(2), remind: 7, active: true }],
    cfg: { name: 'Nico' },
  }, new Date());
  if (!payload || !payload.title || !payload.body.includes('Rinnovo passaporto')) throw new Error('riepilogo non valido');
  const data = { tickets: [{ title: 'Bolletta', urg: 3, due: day(0), status: 'aperto' }], abb: [{ name: 'Palestra', amt: 30, next: day(1) }], spese: [{ d: rome(new Date()).today, amt: 12.5 }], habits: [{ name: 'Leggere', emoji: '📚', days: ALL.slice(), done: {} }], diary: [{ title: 'git rebase -i', body: 'Riscrive la storia dei commit.', date: '2026-01-10' }], cfg: { name: 'Nico', sbudget: 1000 } };
  for (const kind of ['riepilogo', 'ticket', 'scadenze', 'spese', 'settimana', 'abitudini', 'ripasso', 'custom']) {
    const p = forSlot({ id: 'x', kind, title: 'Bevi acqua', text: '💧 Un bicchiere adesso' }, data, new Date());
    if (!p || !p.title) throw new Error('notifica ' + kind + ' non valida');
    console.log('[' + kind + '] ' + p.title + ' | ' + p.body.replace(/\n/g, ' / '));
  }
  const req = webpush.generateRequestDetails(sub, JSON.stringify(payload), {
    vapidDetails: { subject: 'mailto:test@example.com', publicKey: pub, privateKey: priv }, TTL: 3600,
  });
  if (!req.headers.Authorization || !/^vapid t=/.test(req.headers.Authorization) || !req.body || req.body.length < 50) throw new Error('richiesta push non valida');
  console.log('Prova superata. Anteprima della notifica:\n' + payload.title + '\n' + payload.body);
}

function headers() {
  const h = { apikey: KEY, 'Content-Type': 'application/json' };
  if (!KEY.startsWith('sb_')) h.Authorization = 'Bearer ' + KEY;
  return h;
}
async function rest(path, opt = {}) {
  const r = await fetch(BASE + '/rest/v1/' + path, { ...opt, headers: { ...headers(), ...(opt.headers || {}) } });
  const txt = await r.text();
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${txt.slice(0, 300)}`);
  return txt ? JSON.parse(txt) : null;
}
async function loadRows() {
  if (MOCK) return JSON.parse(readFileSync(MOCK, 'utf8'));
  const rows = [];
  for (let off = 0; ; off += 1000) {
    const page = await rest(`docs?select=user_id,coll,id,data&coll=in.(push,pushkeys,pushstate,tickets,abbonamenti,spese,diary,habits,calfeed,config)&order=user_id,coll,id&limit=1000&offset=${off}`);
    rows.push(...page); if (page.length < 1000) break;
  }
  return rows;
}
async function saveState(uid, data) {
  if (MOCK) { console.log('[mock] stato', uid, JSON.stringify(data)); return; }
  await rest('docs?on_conflict=user_id,coll,id', {
    method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ user_id: uid, coll: 'pushstate', id: 'daily', data, updated_at: new Date().toISOString() }),
  });
}
// Segnale di vita: una piccola scrittura vera nel database a ogni giro, così Supabase vede attività
// e non mette in pausa il progetto gratuito.
async function heartbeat(uid) {
  if (MOCK) { console.log('[mock] segnale di vita', uid); return; }
  await rest('docs?on_conflict=user_id,coll,id', {
    method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ user_id: uid, coll: 'heartbeat', id: 'main', data: { at: Date.now(), from: 'github' }, updated_at: new Date().toISOString() }),
  });
}
// Calendario per l'iPhone: file .ics in un archivio pubblico, con un nome segreto e impossibile da indovinare.
const BUCKET = 'calendario';
async function storage(path, opt = {}) {
  const base = headers();
  if (opt.raw) delete base['Content-Type'];
  const h = { ...base, ...(opt.headers || {}) };
  return fetch(BASE + '/storage/v1/' + path, { ...opt, headers: h });
}
async function putIcs(file, text) {
  const up = () => storage(`object/${BUCKET}/${file}`, { method: 'POST', raw: true, body: text,
    headers: { 'Content-Type': 'text/calendar; charset=utf-8', 'x-upsert': 'true', 'cache-control': 'max-age=300' } });
  let r = await up();
  if (!r.ok) {
    const t = await r.text();
    if (/bucket.*not.*found|not.*found/i.test(t) || r.status === 404) {
      const c = await storage('bucket', { method: 'POST', body: JSON.stringify({ id: BUCKET, name: BUCKET, public: true, file_size_limit: 1048576, allowed_mime_types: ['text/calendar'] }) });
      if (!c.ok && c.status !== 409) throw new Error('creazione archivio calendario: ' + c.status + ' ' + (await c.text()).slice(0, 200));
      console.log('Creato l\'archivio pubblico «calendario».');
      r = await up();
    } else throw new Error('caricamento calendario: ' + r.status + ' ' + t.slice(0, 200));
  }
  if (!r.ok) throw new Error('caricamento calendario: ' + r.status + ' ' + (await r.text()).slice(0, 200));
}
async function dropIcs(files) {
  if (!files.length) return;
  const r = await storage(`object/${BUCKET}`, { method: 'DELETE', body: JSON.stringify({ prefixes: files }) });
  if (!r.ok && r.status !== 404) console.log('::warning::Pulizia vecchi calendari: ' + r.status);
}
async function publishCalendars(users, today) {
  let n = 0;
  for (const [uid, u] of users) {
    const mig = (u.config.main || {}).migratedLocal;
    if (mig) {
      // trasferito sul tablet: il calendario nel cloud (pubblico) va tolto, non più aggiornato
      const files = [...(mig.cal || []), ...(u.calfeed.main ? [u.calfeed.main.token, ...(u.calfeed.main.prev || [])] : [])].filter((x) => /^[\w-]{20,}$/.test(String(x || ''))).map((x) => x + '.ics');
      if (files.length && !mig.calDropped && !MOCK) {
        try {
          await dropIcs(files);
          await rest('docs?on_conflict=user_id,coll,id', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
            body: JSON.stringify({ user_id: uid, coll: 'config', id: 'main', data: { ...u.config.main, migratedLocal: { ...mig, calDropped: Date.now() } }, updated_at: new Date().toISOString() }) });
          console.log('Calendario nel cloud tolto (dati trasferiti sul tablet).');
        } catch (e) { console.log('::warning::Pulizia calendario: ' + e.message); }
      }
      continue;
    }
    const f = u.calfeed.main;
    if (!f || !f.token || String(f.token).length < 32 || !/^[\w-]+$/.test(f.token)) continue;
    const file = f.token + '.ics';
    const { text, events } = buildICS({ tickets: u.tickets, abbonamenti: u.abbonamenti, site: SITE }, today);
    if (MOCK) { console.log('[mock] calendario', file, events, 'eventi\n' + text.split('\r\n').slice(0, 14).join('\n')); n++; continue; }
    try {
      await putIcs(file, text);
      const old = (f.prev || []).filter((x) => /^[\w-]+$/.test(x)).map((x) => x + '.ics');
      await dropIcs(old);
      await rest('docs?on_conflict=user_id,coll,id', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify({ user_id: uid, coll: 'calstate', id: 'main', data: { at: Date.now(), events, file }, updated_at: new Date().toISOString() }) });
      n++;
    } catch (e) { console.log('::warning::Calendario non aggiornato: ' + e.message); }
  }
  if (n) console.log(`Calendari aggiornati: ${n}.`);
}
async function calTest(today) {
  const { text, events } = buildICS({ tickets: [{ _id: 'x', title: 'Prova', due: today, urg: 3 }], abbonamenti: [] }, today);
  const file = '_prova_' + Date.now() + '.ics';
  await putIcs(file, text);
  const r = await fetch(`${BASE}/storage/v1/object/public/${BUCKET}/${file}`);
  const got = await r.text();
  console.log(`Prova calendario: caricato (${events} evento), letto dal link pubblico: ${r.status} ${r.headers.get('content-type')}, ${got.includes('BEGIN:VCALENDAR') ? 'contenuto giusto' : 'CONTENUTO SBAGLIATO'}`);
  await dropIcs([file]);
  const r2 = await fetch(`${BASE}/storage/v1/object/public/${BUCKET}/${file}`);
  console.log('Dopo la cancellazione il link risponde: ' + r2.status);
  const pub = (readFileSync(new URL('../../config.js', import.meta.url), 'utf8').match(/key:\s*"([^"]+)"/) || [])[1] || '';
  const l = await fetch(`${BASE}/storage/v1/object/list/${BUCKET}`, { method: 'POST', headers: { apikey: pub, 'Content-Type': 'application/json' }, body: '{"prefix":"","limit":100}' });
  const lt = await l.text();
  console.log('Elenco dei file visto da un estraneo: ' + l.status + ' ' + lt.slice(0, 80) + (lt.trim() === '[]' || !l.ok ? ' (bene: nessun file visibile)' : ' (ATTENZIONE)'));
  if (!r.ok || !got.includes('BEGIN:VCALENDAR')) throw new Error('prova calendario non riuscita');
}
async function dropSub(uid, id) {
  if (MOCK) { console.log('[mock] rimuovo iscrizione', id); return; }
  await rest(`docs?user_id=eq.${uid}&coll=eq.push&id=eq.${encodeURIComponent(id)}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
}

async function main() {
  if (SELFTEST) { await selftest(); return; }
  if (!MOCK && (!BASE || !KEY)) { console.log('::notice::Manca il secret SUPABASE_SECRET_KEY: le notifiche non sono ancora attive.'); return; }
  const send = MOCK ? null : (await import('web-push')).default;
  const rows = await loadRows();
  const users = new Map();
  for (const r of rows) {
    if (!users.has(r.user_id)) users.set(r.user_id, { push: [], tickets: [], abbonamenti: [], spese: [], diary: [], habits: [], calfeed: {}, config: {}, pushkeys: {}, pushstate: {} });
    const u = users.get(r.user_id);
    if (Array.isArray(u[r.coll])) u[r.coll].push({ ...(r.data || {}), _id: r.id }); else if (u[r.coll]) u[r.coll][r.id] = r.data || {};
  }
  const now = process.env.NOW ? new Date(process.env.NOW) : new Date(); const { today, hour, dow } = rome(now);
  let sent = 0;
  for (const [uid, u] of users) {
    const keys = u.pushkeys.vapid;
    if (!u.push.length || !keys || !keys.publicKey || !keys.privateKey) continue;
    const conf = u.config.main || {};
    if (conf.migratedLocal && !FORCE) continue; // ora le manda Capri Server dal tablet: niente doppioni
    const notify = { on: true, ...(conf.notify || {}) };
    if (notify.on === false && !FORCE) continue;
    const state = u.pushstate.daily || {};
    const sentMap = { ...(state.sent || {}) };
    if (state.last === today && !state.sent) sentMap.s1 = today;
    const list = slotsOf(notify);
    let toSend = [];
    if (FORCE) toSend = list;
    else {
      const due = list.filter((sl) => (sl.days || ALL).includes(dow) && +sl.h <= hour && sentMap[sl.id] !== today);
      const fresh = due.filter((sl) => hour - +sl.h <= 2);
      const top = Math.max(-1, ...fresh.map((sl) => +sl.h));
      toSend = fresh.filter((sl) => +sl.h === top);
      due.forEach((sl) => { sentMap[sl.id] = today; });
      if (!due.length) continue;
    }
    const data = { tickets: u.tickets, abb: u.abbonamenti, spese: u.spese, diary: u.diary, habits: u.habits, cfg: { name: conf.name, scats: conf.scats, sbudget: conf.sbudget } };
    let ok = 0;
    for (const sl of toSend) {
      const payload = forSlot(sl, data, now);
      if (!payload) continue;
      for (const p of u.push) {
        if (!p.sub || !p.sub.endpoint) continue;
        if (MOCK) { console.log('[mock] invio a', p.dev || p._id, '(' + (sl.kind || 'riepilogo') + ' ore ' + sl.h + ')\n' + payload.title + '\n' + payload.body); ok++; continue; }
        try {
          await send.sendNotification(p.sub, JSON.stringify(payload), {
            vapidDetails: { subject: keys.subject || 'mailto:capri@example.com', publicKey: keys.publicKey, privateKey: keys.privateKey },
            TTL: 3 * 3600, urgency: 'normal',
          });
          ok++;
        } catch (e) {
          console.log(`Invio non riuscito (${e.statusCode || '?'}): ${String(e.body || e.message).slice(0, 200)}`);
          if (e.statusCode === 404 || e.statusCode === 410) { await dropSub(uid, p._id); p.sub = null; }
        }
      }
    }
    sent += ok;
    if (!FORCE) await saveState(uid, { sent: sentMap, at: now.toISOString(), count: ok });
  }
  let hb = 0;
  for (const [uid, u] of users) { if ((u.config.main || {}).migratedLocal) continue; try { await heartbeat(uid); hb++; } catch (e) { console.log('::warning::Segnale di vita non riuscito: ' + e.message); } }
  console.log(`Segnale di vita a Supabase: ${hb} ${hb === 1 ? 'utente' : 'utenti'}.`);
  if (CALTEST && !MOCK) await calTest(today);
  await publishCalendars(users, today);
  console.log(`Fatto: ${sent} notifiche inviate (${today}, ore ${hour} a Roma, giorno ${dow}).`);
}
main().catch((e) => {
  if (/fetch failed|ENOTFOUND|EAI_AGAIN|Supabase (404|5\d\d)/.test(String(e && (e.message + ' ' + (e.cause && e.cause.code))))) {
    console.log('::notice::Supabase non risponde (progetto in pausa o eliminato dopo il trasferimento sul tablet): niente da fare. ' + e.message);
    return;
  }
  console.error(e); process.exit(1);
});
