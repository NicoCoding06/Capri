#!/usr/bin/env node
// Capri Server: tutto Capri su un tuo dispositivo (tablet Android con Termux, Raspberry Pi, PC).
// Nessun cloud: dati, allegati, musica, notifiche e calendario restano qui.
// Si raggiunge da fuori casa solo dai tuoi dispositivi, tramite Tailscale (rete privata cifrata).
//
// Uso:
//   node server/capri-server.mjs                 avvia il server (porta 8080)
//   node server/capri-server.mjs --importa       copia qui tutti i dati da Supabase (una volta sola)
//   node server/capri-server.mjs --password      imposta o cambia la password di accesso
// Opzioni: --porta N  --dati CARTELLA  --musica CARTELLA  --senza-musica  --indirizzo https://…ts.net

import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import readline from 'node:readline';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { randomBytes, scryptSync, timingSafeEqual, createHash, createHmac } from 'node:crypto';
import { sendNotification } from './webpush.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.resolve(HERE, '..');
const ARGS = process.argv.slice(2);
const opt = (n, d) => { const i = ARGS.indexOf(n); return i >= 0 && ARGS[i + 1] && !ARGS[i + 1].startsWith('--') ? ARGS[i + 1] : d; };
const has = (n) => ARGS.includes(n);
const HOME = os.homedir();
const TERMUX = (process.env.PREFIX || '').includes('com.termux');
const DATA = path.resolve(opt('--dati', process.env.CAPRI_DATI || path.join(HOME, 'capri-dati')));
const PORT = +opt('--porta', process.env.CAPRI_PORTA || 8080);
const MUSIC_PORT = 47123;
const SUPA = { url: process.env.CAPRI_SUPABASE_URL || 'https://vwprxhnprbbjfwgkrciy.supabase.co', key: 'sb_publishable_cccF3AAYDzOD7IdZgmlt6g_PWwMdBAu' };
const VERSION = '1.0';

await import(pathToFileURL(path.join(SITE, 'digest.js')).href);
const { forSlot, slots: slotsOf, rome, ALL } = globalThis.CapriDigest;
const { buildICS } = await import(pathToFileURL(path.join(SITE, '.github', 'scripts', 'ics.mjs')).href);

const log = (...a) => console.log(new Date().toLocaleTimeString('it-IT'), ...a);
const b64u = (b) => Buffer.from(b).toString('base64url');
const sha = (s) => createHash('sha256').update(String(s)).digest('hex');
const now = () => Date.now();

// ------------------------------------------------------------------ archivio (un file JSON, salvato in modo sicuro)
fs.mkdirSync(path.join(DATA, 'allegati'), { recursive: true, mode: 0o700 });
const DB_FILE = path.join(DATA, 'capri.json');
let DB = { v: 1, user: null, docs: {}, sessions: {}, meta: {} };
try { DB = { ...DB, ...JSON.parse(fs.readFileSync(DB_FILE, 'utf8')) }; } catch (e) { if (e.code !== 'ENOENT') { console.error('Archivio illeggibile:', e.message); process.exit(1); } }
let saveT = null, saving = Promise.resolve();
function save(soon = 400) {
  clearTimeout(saveT);
  saveT = setTimeout(() => { saving = saving.then(writeDb).catch((e) => log('⚠ Salvataggio non riuscito:', e.message)); }, soon);
}
async function writeDb() {
  const tmp = DB_FILE + '.tmp';
  const fh = await fsp.open(tmp, 'w', 0o600);
  await fh.writeFile(JSON.stringify(DB)); await fh.sync(); await fh.close();
  await fsp.rename(tmp, DB_FILE);
}
const col = (c) => (DB.docs[c] = DB.docs[c] || {});
const getDoc = (c, id) => (DB.docs[c] || {})[id];

// ------------------------------------------------------------------ tempo reale (Server-Sent Events)
const clients = new Set();
function broadcast(ev) {
  const line = 'data: ' + JSON.stringify(ev) + '\n\n';
  for (const c of clients) { try { c.write(line); } catch (e) { clients.delete(c); } }
}
function setDoc(c, id, data, quiet) {
  const had = id in col(c);
  col(c)[id] = data; save();
  if (!quiet) broadcast({ eventType: had ? 'UPDATE' : 'INSERT', new: { coll: c, id, data }, old: { coll: c, id } });
}
function delDoc(c, id) {
  if (!DB.docs[c] || !(id in DB.docs[c])) return;
  delete DB.docs[c][id]; save();
  broadcast({ eventType: 'DELETE', new: {}, old: { coll: c, id } });
}
setInterval(() => { for (const c of clients) { try { c.write(': ok\n\n'); } catch (e) { clients.delete(c); } } }, 25000);

// ------------------------------------------------------------------ accesso
function hashPw(pw, salt = randomBytes(16).toString('hex')) { return { salt, hash: scryptSync(pw, salt, 64).toString('hex') }; }
function checkPw(pw) {
  if (!DB.user || !DB.user.hash) return false;
  const h = scryptSync(String(pw), DB.user.salt, 64);
  return timingSafeEqual(h, Buffer.from(DB.user.hash, 'hex'));
}
const SESSION_DAYS = 30;
function newSession(req) {
  const tok = randomBytes(32).toString('base64url');
  DB.sessions[sha(tok)] = { exp: now() + SESSION_DAYS * 864e5, at: now(), ua: String(req.headers['user-agent'] || '').slice(0, 120) };
  save(); return tok;
}
function cookies(req) { const o = {}; for (const p of String(req.headers.cookie || '').split(';')) { const i = p.indexOf('='); if (i > 0) o[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim()); } return o; }
function session(req) {
  const t = cookies(req).capri_s; if (!t) return null;
  const s = DB.sessions[sha(t)]; if (!s) return null;
  if (s.exp < now()) { delete DB.sessions[sha(t)]; save(); return null; }
  return { key: sha(t), ...s };
}
const tries = new Map();
function tooMany(ip) {
  const t = (tries.get(ip) || []).filter((x) => x > now() - 10 * 60e3);
  tries.set(ip, t); return t.length >= 8;
}

// ------------------------------------------------------------------ utilità HTTP
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.pdf': 'application/pdf', '.txt': 'text/plain; charset=utf-8',
  '.py': 'text/plain; charset=utf-8', '.sql': 'text/plain; charset=utf-8', '.bat': 'text/plain; charset=utf-8', '.ics': 'text/calendar; charset=utf-8', '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.mp4': 'video/mp4', '.zip': 'application/zip' };
const SEC = { 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'X-Frame-Options': 'DENY' };
function send(res, code, body, type = 'application/json; charset=utf-8', extra = {}) {
  const b = typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body);
  res.writeHead(code, { 'Content-Type': type, 'Content-Length': Buffer.byteLength(b), 'Cache-Control': 'no-store', ...SEC, ...extra });
  res.end(b);
}
const fail = (res, code, message) => send(res, code, { message, error: message });
function readBody(req, limit = 2e6) {
  return new Promise((ok, ko) => {
    const parts = []; let n = 0;
    req.on('data', (c) => { n += c.length; if (n > limit) { ko(Object.assign(new Error('troppo grande'), { code: 413 })); req.destroy(); } else parts.push(c); });
    req.on('end', () => ok(Buffer.concat(parts))); req.on('error', ko);
  });
}
async function readJson(req) { const b = await readBody(req); try { return b.length ? JSON.parse(b) : {}; } catch (e) { throw Object.assign(new Error('JSON non valido'), { code: 400 }); } }

// ------------------------------------------------------------------ file del sito
const STATIC = /^\/(index\.html|digest\.js|sw\.js|capri-local\.js|manifest\.webmanifest|icon[\w.-]*\.(?:png|svg)|apple-touch-icon\.png|badge-96\.png|vendor\/[\w.-]+\.js|iphone\/[\w.-]+\.(?:js|sql)|musica\/[\w.-]+\.(?:py|sql))$/;
async function serveStatic(req, res, p) {
  if (p === '/' || p === '') p = '/index.html';
  if (p === '/config.js') { send(res, 200, `window.CAPRI_CONFIG={local:true,url:location.origin,key:'locale',server:${JSON.stringify(VERSION)}};\n`, MIME['.js']); return true; }
  if (!STATIC.test(p)) return false;
  const f = path.join(SITE, decodeURIComponent(p));
  try {
    const data = await fsp.readFile(f);
    send(res, 200, data, MIME[path.extname(f)] || 'application/octet-stream', { 'Cache-Control': 'no-cache' });
  } catch (e) { fail(res, 404, 'non trovato'); }
  return true;
}

// ------------------------------------------------------------------ allegati
const okPath = (p) => typeof p === 'string' && /^[\w-]{1,80}\/[\w.\-]{1,160}$/.test(p) && !p.includes('..');
const fileOf = (p) => path.join(DATA, 'allegati', p);

// ------------------------------------------------------------------ Siri e widget (stessa logica della funzione SQL capri_api)
function romeToday() { return rome(new Date()).today; }
function capriApi(b) {
  const tok = (getDoc('apitoken', 'main') || {}).token || '';
  const given = String(b.p_token || '');
  if (given.length < 32 || tok.length < 32 || given.length !== tok.length || !timingSafeEqual(Buffer.from(given), Buffer.from(tok))) throw Object.assign(new Error('token non valido'), { code: 400 });
  const today = romeToday(), month = today.slice(0, 7), ms = now();
  if (b.p_action === 'riepilogo') {
    const L = (c) => Object.values(DB.docs[c] || {});
    const cfg = getDoc('config', 'main') || {};
    return {
      oggi: today,
      tickets: L('tickets').filter((t) => t.status !== 'fatto').map((t) => ({ title: t.title, urg: t.urg, due: t.due, cat: t.cat })),
      spese: L('spese').filter((x) => String(x.d || '').slice(0, 7) === month).map((x) => ({ d: x.d, amt: x.amt, cat: x.cat })),
      abbonamenti: L('abbonamenti').filter((x) => x.active !== false).map((x) => ({ name: x.name, amt: x.amt, next: x.next })),
      config: { name: cfg.name, sbudget: cfg.sbudget, scats: cfg.scats, tcats: cfg.tcats, dcats: cfg.dcats },
    };
  }
  if (b.p_action !== 'aggiungi') throw Object.assign(new Error('azione non valida'), { code: 400 });
  const testo = String(b.p_testo || '').trim(), id = 'ip' + randomBytes(7).toString('hex');
  let c, data, num;
  if (b.p_tipo === 'spesa') {
    const amt = Math.round(Math.abs(+b.p_importo || 0) * 100) / 100; if (!amt) throw Object.assign(new Error('importo mancante'), { code: 400 });
    c = 'spese'; data = { d: today, amt, cat: String(b.p_categoria || '').trim() || 'Altro', note: testo, at: ms, from: 'iphone' };
  } else if (b.p_tipo === 'ticket') {
    if (!testo) throw Object.assign(new Error('testo mancante'), { code: 400 });
    num = Math.max(0, ...Object.values(DB.docs.tickets || {}).map((t) => +t.num || 0)) + 1;
    c = 'tickets'; data = { title: testo, cat: String(b.p_categoria || '').trim(), urg: Math.min(4, Math.max(1, Math.round(+b.p_importo || 2))), status: 'aperto',
      due: /^\d{4}-\d{2}-\d{2}$/.test(b.p_extra || '') ? b.p_extra : '', desc: '', att: [], notes: [{ t: ms, x: "Creato dall'iPhone" }], created: ms, upd: ms, num };
  } else if (b.p_tipo === 'nota') {
    if (!testo) throw Object.assign(new Error('testo mancante'), { code: 400 });
    c = 'note'; data = { title: '', body: testo, kind: 'testo', items: [], color: '#22d3ee', pin: false, created: ms, upd: ms };
  } else if (b.p_tipo === 'diary') {
    if (!testo) throw Object.assign(new Error('testo mancante'), { code: 400 });
    c = 'diary'; data = { title: testo, body: String(b.p_extra || ''), cat: String(b.p_categoria || '').trim(), tags: [], date: today, pin: false, created: ms, upd: ms };
  } else throw Object.assign(new Error('tipo non valido'), { code: 400 });
  setDoc(c, id, data);
  return { ok: true, tipo: b.p_tipo, id, num: num ?? null };
}

// ------------------------------------------------------------------ musica (programma Python sullo stesso dispositivo)
const MUSIC = { proc: null, ok: false, info: null, stop: has('--senza-musica') };
function musicKey() {
  let k = (getDoc('music', 'key') || {}).key;
  if (!k || k.length < 32) { k = 'mk_' + randomBytes(24).toString('base64url'); setDoc('music', 'key', { key: k, created: now() }); }
  return k;
}
const msig = (what, key) => { const e = Math.ceil(now() / 1000 / 21600) * 21600 + 21600; return `e=${e}&s=${createHmac('sha256', key).update(`${what}.${e}`).digest('base64url').slice(0, 32)}`; };
function musicFolder() { return opt('--musica', DB.meta.musicDir || (TERMUX ? path.join(HOME, 'storage', 'shared') : path.join(HOME, 'Music'))); }
function startMusic() {
  if (MUSIC.stop) return;
  const py = ['python3', 'python'].find((x) => { try { return require_which(x); } catch (e) { return false; } }) || 'python3';
  const args = [path.join(SITE, 'musica', 'capri-musica.py'), '--locale', '--avvio', '--riavvia', '--porta', String(MUSIC_PORT), '--chiave', musicKey(), '--cartella', musicFolder()];
  log('Avvio la musica:', musicFolder());
  try {
    MUSIC.proc = spawn(py, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    MUSIC.proc.stderr.on('data', (d) => { const s = String(d).trim(); if (s) log('[musica]', s.slice(0, 300)); });
    MUSIC.proc.on('exit', (code) => { MUSIC.proc = null; MUSIC.ok = false; if (!MUSIC.stop) { log('La musica si è fermata (' + code + '), la riavvio tra 20 s'); setTimeout(startMusic, 20000); } });
  } catch (e) { log('⚠ Python non trovato: la musica non parte (' + e.message + ')'); }
}
function require_which(x) { for (const d of String(process.env.PATH || '').split(path.delimiter)) { if (fs.existsSync(path.join(d, x))) return true; } return false; }
async function musicPing() {
  if (MUSIC.stop) return;
  try {
    const r = await fetch(`http://127.0.0.1:${MUSIC_PORT}/ping?${msig('ping', musicKey())}`, { signal: AbortSignal.timeout(4000) });
    const j = await r.json();
    if (!j.ok) throw new Error('firma');
    MUSIC.ok = true;
    const prev = getDoc('music', 'host') || {};
    const data = { url: '/musica-api', at: now(), info: { name: j.name, tracks: j.tracks, lib: j.at, v: j.v, os: TERMUX ? 'Android' : os.platform() } };
    const quiet = (prev.info || {}).lib === j.at && prev.url === data.url && now() - (MUSIC.sentAt || 0) < 55e3;
    if (!quiet) MUSIC.sentAt = now();
    setDoc('music', 'host', data, quiet);
    await musicDeletions();
  } catch (e) {
    if (MUSIC.ok) log('⚠ La musica non risponde');
    MUSIC.ok = false;
  }
}
// brani eliminati da Capri: li sposta nel cestino della cartella (e li rimette se li ripristini)
async function musicDeletions() {
  const want = Object.keys(((getDoc('music', 'deleted') || {}).ids) || {}).filter((x) => /^[0-9a-z]{1,16}$/.test(x)).sort();
  const done = DB.meta.musicDel || [];
  if (want.join() === done.join()) return;
  const k = musicKey(), hit = (kind, id) => fetch(`http://127.0.0.1:${MUSIC_PORT}/${kind}/${id}?${msig(kind + '.' + id, k)}`, { signal: AbortSignal.timeout(15000) });
  for (const id of want.filter((x) => !done.includes(x))) await hit('del', id).catch(() => {});
  for (const id of done.filter((x) => !want.includes(x))) await hit('restore', id).catch(() => {});
  DB.meta.musicDel = want; save();
}
function proxyMusic(req, res, rest) {
  const h = {};
  for (const k of ['range', 'if-range', 'if-none-match', 'if-modified-since']) if (req.headers[k]) h[k] = req.headers[k];
  const up = http.request({ host: '127.0.0.1', port: MUSIC_PORT, path: rest, method: req.method === 'HEAD' ? 'HEAD' : 'GET', headers: h }, (r) => {
    const out = { ...SEC };
    for (const k of ['content-type', 'content-length', 'content-range', 'accept-ranges', 'cache-control', 'etag', 'last-modified']) if (r.headers[k]) out[k] = r.headers[k];
    res.writeHead(r.statusCode, out); r.pipe(res);
  });
  up.on('error', () => { if (!res.headersSent) fail(res, 502, 'la musica non risponde'); else res.destroy(); });
  req.on('close', () => up.destroy());
  up.end();
}

// ------------------------------------------------------------------ notifiche (stessa logica di prima, ora dal tablet)
async function notifyTick() {
  const subs = Object.entries(DB.docs.push || {}).map(([id, d]) => ({ ...d, _id: id })).filter((p) => p.sub && p.sub.endpoint);
  const keys = getDoc('pushkeys', 'vapid');
  if (!subs.length || !keys || !keys.publicKey || !keys.privateKey) return;
  const conf = getDoc('config', 'main') || {};
  const notify = { on: true, ...(conf.notify || {}) };
  if (notify.on === false) return;
  const t = new Date(); const { today, hour, dow } = rome(t);
  const state = getDoc('pushstate', 'daily') || {};
  const sentMap = { ...(state.sent || {}) };
  if (state.last === today && !state.sent) sentMap.s1 = today;
  const list = slotsOf(notify);
  const due = list.filter((sl) => (sl.days || ALL).includes(dow) && +sl.h <= hour && sentMap[sl.id] !== today);
  if (!due.length) return;
  const fresh = due.filter((sl) => hour - +sl.h <= 2);
  const top = Math.max(-1, ...fresh.map((sl) => +sl.h));
  const toSend = fresh.filter((sl) => +sl.h === top);
  due.forEach((sl) => { sentMap[sl.id] = today; });
  const L = (c) => Object.entries(DB.docs[c] || {}).map(([id, d]) => ({ ...d, _id: id }));
  const data = { tickets: L('tickets'), abb: L('abbonamenti'), spese: L('spese'), diary: L('diary'), habits: L('habits'), cfg: { name: conf.name, scats: conf.scats, sbudget: conf.sbudget } };
  let ok = 0;
  for (const sl of toSend) {
    const payload = forSlot(sl, data, t);
    if (!payload) continue;
    for (const p of subs) {
      try { await sendNotification(p.sub, payload, { publicKey: keys.publicKey, privateKey: keys.privateKey, subject: keys.subject }); ok++; }
      catch (e) { log('Notifica non consegnata:', e.message); if (e.statusCode === 404 || e.statusCode === 410) delDoc('push', p._id); }
    }
  }
  setDoc('pushstate', 'daily', { sent: sentMap, at: t.toISOString(), count: ok });
  if (ok) log(`Notifiche inviate: ${ok}`);
}

// ------------------------------------------------------------------ calendario privato (.ics)
function calendar() {
  const L = (c) => Object.entries(DB.docs[c] || {}).map(([id, d]) => ({ ...d, _id: id }));
  return buildICS({ tickets: L('tickets'), abbonamenti: L('abbonamenti'), site: DB.meta.url || '' }, romeToday());
}
function calState() {
  const f = getDoc('calfeed', 'main'); if (!f || !f.token) return;
  const { events } = calendar();
  const prev = getDoc('calstate', 'main') || {};
  if (prev.events === events && prev.file === f.token + '.ics' && now() - (prev.at || 0) < 3500e3) return;
  setDoc('calstate', 'main', { at: now(), events, file: f.token + '.ics' });
}

// ------------------------------------------------------------------ copie di sicurezza ogni notte
function backupDir() {
  const shared = path.join(HOME, 'storage', 'shared');
  return opt('--backup', DB.meta.backupDir || (fs.existsSync(shared) ? path.join(shared, 'Documents', 'Capri backup') : path.join(DATA, 'backup')));
}
async function backup(force) {
  const day = romeToday();
  if (!force && DB.meta.lastBackup === day) return;
  const dir = backupDir();
  try {
    await fsp.mkdir(path.join(dir, 'allegati'), { recursive: true });
    await saving; await writeDb();
    await fsp.copyFile(DB_FILE, path.join(dir, `capri-${day}.json`));
    const files = (await fsp.readdir(dir)).filter((f) => /^capri-\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort();
    for (const f of files.slice(0, -14)) await fsp.unlink(path.join(dir, f)).catch(() => {});
    for (const u of await fsp.readdir(path.join(DATA, 'allegati')).catch(() => [])) {
      for (const f of await fsp.readdir(path.join(DATA, 'allegati', u)).catch(() => [])) {
        const dst = path.join(dir, 'allegati', u, f);
        if (!fs.existsSync(dst)) { await fsp.mkdir(path.dirname(dst), { recursive: true }); await fsp.copyFile(path.join(DATA, 'allegati', u, f), dst); }
      }
    }
    DB.meta.lastBackup = day; save();
    log('💾 Copia di sicurezza fatta in', dir);
  } catch (e) { log('⚠ Copia di sicurezza non riuscita:', e.message); }
}

// ------------------------------------------------------------------ server HTTP
const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x');
  const p = u.pathname;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
  try {
    if (p.startsWith('/musica-api/')) return proxyMusic(req, res, p.slice('/musica-api'.length) + u.search);
    if (p.startsWith('/cal/') && /^\/cal\/[\w-]{32,80}\.ics$/.test(p)) {
      const f = getDoc('calfeed', 'main') || {}, want = '/cal/' + f.token + '.ics';
      if (!f.token || p.length !== want.length || !timingSafeEqual(Buffer.from(p), Buffer.from(want))) return fail(res, 404, 'non trovato');
      return send(res, 200, calendar().text, MIME['.ics'], { 'Cache-Control': 'max-age=300' });
    }
    if (p === '/api/rpc/capri_api' || p === '/rest/v1/rpc/capri_api') {
      if (req.method === 'OPTIONS') return send(res, 204, '');
      return send(res, 200, capriApi(await readJson(req)));
    }
    if (p.startsWith('/api/')) return api(req, res, u, ip);
    if (req.method === 'GET' || req.method === 'HEAD') { if (await serveStatic(req, res, p)) return; }
    fail(res, 404, 'non trovato');
  } catch (e) {
    if (!res.headersSent) fail(res, e.code >= 400 && e.code < 600 ? e.code : 500, e.code >= 400 ? e.message : 'errore interno');
    if (!(e.code >= 400)) log('⚠ Errore:', e.stack || e.message);
  }
});

async function api(req, res, u, ip) {
  const p = u.pathname, m = req.method;
  if (m !== 'GET' && req.headers['x-capri'] !== '1') return fail(res, 403, 'richiesta non valida');
  if (p === '/api/login' && m === 'POST') {
    if (tooMany(ip)) return fail(res, 429, 'Troppi tentativi: riprova tra qualche minuto');
    const b = await readJson(req);
    if (!DB.user || !DB.user.hash) return fail(res, 400, 'Password non ancora impostata: esegui capri-server con --password o --importa');
    const okMail = !b.email || !DB.user.email || String(b.email).trim().toLowerCase() === DB.user.email.toLowerCase();
    if (!okMail || !checkPw(b.password || '')) { tries.get(ip).push(now()); return fail(res, 400, 'Invalid login credentials'); }
    const tok = newSession(req);
    return send(res, 200, { user: { id: DB.user.id, email: DB.user.email } }, undefined,
      { 'Set-Cookie': `capri_s=${tok}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${SESSION_DAYS * 86400}` });
  }
  const s = session(req);
  if (!s) return fail(res, 401, 'Non hai fatto l’accesso');
  if (p === '/api/session') return send(res, 200, { user: { id: DB.user.id, email: DB.user.email }, server: VERSION, url: DB.meta.url || '' });
  if (p === '/api/logout' && m === 'POST') {
    const b = await readJson(req);
    if (b.all) DB.sessions = {}; else delete DB.sessions[s.key];
    save(); return send(res, 200, { ok: true }, undefined, { 'Set-Cookie': 'capri_s=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0' });
  }
  if (p === '/api/password' && m === 'POST') {
    const b = await readJson(req);
    if (String(b.password || '').length < 10) return fail(res, 400, 'La password deve avere almeno 10 caratteri');
    Object.assign(DB.user, hashPw(String(b.password)));
    for (const k of Object.keys(DB.sessions)) if (k !== s.key) delete DB.sessions[k];
    save(); return send(res, 200, { ok: true });
  }
  if (p === '/api/events') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive', 'X-Accel-Buffering': 'no', ...SEC });
    res.write('retry: 3000\n\n'); clients.add(res);
    req.on('close', () => clients.delete(res)); return;
  }
  if (p === '/api/docs' && m === 'GET') {
    const rows = [];
    for (const c of Object.keys(DB.docs).sort()) for (const id of Object.keys(DB.docs[c]).sort()) rows.push({ coll: c, id, data: DB.docs[c][id] });
    const only = u.searchParams.get('coll');
    const list = only ? rows.filter((r) => r.coll === only) : rows;
    const from = +(u.searchParams.get('from') || 0), to = +(u.searchParams.get('to') || list.length - 1);
    return send(res, 200, list.slice(from, to + 1));
  }
  const dm = p.match(/^\/api\/docs\/([\w-]{1,40})\/([\w.-]{1,120})$/);
  if (dm && m === 'PUT') { const b = await readJson(req); if (!b || typeof b.data !== 'object' || b.data === null) return fail(res, 400, 'dati mancanti'); setDoc(dm[1], dm[2], b.data); return send(res, 200, { ok: true }); }
  if (dm && m === 'DELETE') { delDoc(dm[1], dm[2]); return send(res, 200, { ok: true }); }
  if (p === '/api/files' && m === 'POST') {
    const fp = u.searchParams.get('path');
    if (!okPath(fp)) return fail(res, 400, 'nome file non valido');
    if (fs.existsSync(fileOf(fp))) return fail(res, 409, 'esiste già');
    const body = await readBody(req, 50 * 1048576 + 1024);
    await fsp.mkdir(path.dirname(fileOf(fp)), { recursive: true });
    await fsp.writeFile(fileOf(fp), body, { mode: 0o600 });
    return send(res, 200, { ok: true, path: fp });
  }
  if (p === '/api/files/delete' && m === 'POST') {
    const b = await readJson(req);
    for (const fp of (b.paths || []).filter(okPath)) await fsp.unlink(fileOf(fp)).catch(() => {});
    return send(res, 200, { ok: true });
  }
  const fm = p.match(/^\/api\/file\/(.+)$/);
  if (fm && m === 'GET') {
    const fp = decodeURIComponent(fm[1]); if (!okPath(fp)) return fail(res, 400, 'nome file non valido');
    let st; try { st = await fsp.stat(fileOf(fp)); } catch (e) { return fail(res, 404, 'file non trovato'); }
    const dl = u.searchParams.get('download');
    const h = { 'Content-Type': MIME[path.extname(fp).toLowerCase()] || 'application/octet-stream', 'Content-Length': st.size, 'Cache-Control': 'private, max-age=3600', ...SEC };
    if (dl) h['Content-Disposition'] = `attachment; filename*=UTF-8''${encodeURIComponent(dl)}`;
    else if (/\.(svg|html?)$/i.test(fp)) h['Content-Disposition'] = 'attachment';
    res.writeHead(200, h); fs.createReadStream(fileOf(fp)).pipe(res); return;
  }
  if (p === '/api/rpc/capri_music') return fail(res, 400, 'chiave non valida');
  if (p === '/api/backup' && m === 'POST') { await backup(true); return send(res, 200, { ok: true, dir: backupDir() }); }
  if (p === '/api/stato') return send(res, 200, { server: VERSION, musica: MUSIC.ok, cartellaMusica: musicFolder(), backup: { dir: backupDir(), ultimo: DB.meta.lastBackup || null }, url: DB.meta.url || '' });
  fail(res, 404, 'non trovato');
}

// ------------------------------------------------------------------ comandi da terminale
function ask(q, hidden) {
  return new Promise((ok) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) { rl._writeToOutput = (s) => { if (s.includes(q)) rl.output.write(s); else rl.output.write(''); }; }
    rl.question(q, (a) => { rl.close(); if (hidden) process.stdout.write('\n'); ok(a.trim()); });
  });
}
async function supa(pathq, { token, method = 'GET', body, headers = {} } = {}) {
  const r = await fetch(SUPA.url + pathq, { method, headers: { apikey: SUPA.key, ...(token ? { Authorization: 'Bearer ' + token } : {}), ...(body && !(body instanceof Uint8Array) ? { 'Content-Type': 'application/json' } : {}), ...headers }, body: body && !(body instanceof Uint8Array) ? JSON.stringify(body) : body });
  if (!r.ok) { const t = await r.text(); throw new Error(`${r.status} ${t.slice(0, 200)}`); }
  return r;
}
async function importa() {
  console.log('\n  ◉ Copio i tuoi dati da Supabase a questo dispositivo\n  (servono email e password con cui entri in Capri: restano le stesse anche dopo)\n');
  const { email, password, token, uid } = await supaLogin();
  return importFrom({ email, password, token, uid });
}
async function supaLogin() {
  const email = opt('--email') || await ask('  Email: ');
  const password = process.env.CAPRI_PASSWORD || await ask('  Password: ', true);
  let auth = await (await supa('/auth/v1/token?grant_type=password', { method: 'POST', body: { email, password } })).json();
  let token = auth.access_token; const uid = auth.user.id;
  const factors = (auth.user.factors || []).filter((f) => f.status === 'verified' && f.factor_type === 'totp');
  if (factors.length) {
    const code = await ask('  Codice della verifica in due passaggi: ');
    const ch = await (await supa(`/auth/v1/factors/${factors[0].id}/challenge`, { token, method: 'POST', body: {} })).json();
    auth = await (await supa(`/auth/v1/factors/${factors[0].id}/verify`, { token, method: 'POST', body: { challenge_id: ch.id, code: code.replace(/\s/g, '') } })).json();
    token = auth.access_token;
  }
  return { email, password, token, uid };
}
async function supaRows(token) {
  const rows = [];
  for (let off = 0; ; off += 1000) {
    const page = await (await supa(`/rest/v1/docs?select=coll,id,data&order=coll,id&limit=1000&offset=${off}`, { token })).json();
    rows.push(...page); if (page.length < 1000) break;
  }
  return rows;
}
async function supaFiles(token, uid) {
  const names = [], sizes = {};
  for (let off = 0; ; off += 1000) {
    const page = await (await supa('/storage/v1/object/list/allegati', { token, method: 'POST', body: { prefix: uid + '/', limit: 1000, offset: off, sortBy: { column: 'name', order: 'asc' } } })).json();
    for (const x of page.filter((x) => x.id)) { names.push(uid + '/' + x.name); sizes[uid + '/' + x.name] = x.metadata && x.metadata.size; }
    if (page.length < 1000) break;
  }
  return { names, sizes };
}
async function supaClean({ token, uid, names, mark, total }) {
  try {
    // il segnale per il vecchio sito resta (senza i tuoi dati), tutto il resto va via
    await supaCfg(token, uid, { migratedLocal: mark });
    await supa(`/rest/v1/docs?user_id=eq.${uid}&or=(coll.neq.config,id.neq.main)`, { token, method: 'DELETE', headers: { Prefer: 'return=minimal' } });
    for (let i = 0; i < names.length; i += 100) await supa('/storage/v1/object/allegati', { token, method: 'DELETE', body: { prefixes: names.slice(i, i + 100) } });
    const left = await (await supa(`/rest/v1/docs?select=coll,id&user_id=eq.${uid}`, { token })).json();
    console.log(`  ✓ Supabase ripulito: ${total - left.length} elementi e ${names.length} allegati cancellati (resta solo l'avviso per il vecchio indirizzo).`);
    console.log('    Il calendario pubblico nel cloud lo toglie da solo il controllo automatico entro un\'ora.');
    return true;
  } catch (e) { console.log('  ⚠ Pulizia di Supabase non completata (' + e.message + '). I dati qui sono al sicuro; puoi riprovare con: capri pulisci'); return false; }
}
const supaCfg = (token, uid, data) => supa('/rest/v1/docs?on_conflict=user_id,coll,id', { token, method: 'POST', body: { user_id: uid, coll: 'config', id: 'main', data, updated_at: new Date().toISOString() }, headers: { Prefer: 'resolution=merge-duplicates,return=minimal' } });
const calTokens = (docs) => { const f = (docs.calfeed || {}).main; return f ? [f.token, ...(f.prev || [])].filter(Boolean) : []; };
const SKIP = new Set(['push', 'heartbeat', 'calstate']);
const skipRow = (r) => SKIP.has(r.coll) || (r.coll === 'music' && r.id === 'host');

async function importFrom({ email, password, token, uid }) {
  const rows = await supaRows(token);
  const docs = {};
  for (const r of rows) { if (skipRow(r)) continue; (docs[r.coll] = docs[r.coll] || {})[r.id] = r.data; }
  console.log(`  ✓ ${rows.length} elementi letti (${Object.entries(docs).map(([c, d]) => c + ' ' + Object.keys(d).length).join(', ')})`);
  const { names, sizes } = await supaFiles(token, uid);
  if (Object.keys(DB.docs).length && !has('--sovrascrivi')) {
    const a = await ask('  Su questo dispositivo ci sono già dei dati: sostituirli con quelli di Supabase? (si/no) ');
    if (!/^s/i.test(a)) { console.log('  Annullato, non ho cambiato niente.'); return; }
  }
  let n = 0, bytes = 0; const bad = [];
  for (const fp of names) {
    if (!okPath(fp)) { console.log('  ⚠ salto un nome file strano:', fp); continue; }
    const r = await supa('/storage/v1/object/authenticated/allegati/' + fp.split('/').map(encodeURIComponent).join('/'), { token });
    const buf = Buffer.from(await r.arrayBuffer());
    await fsp.mkdir(path.dirname(fileOf(fp)), { recursive: true });
    await fsp.writeFile(fileOf(fp), buf, { mode: 0o600 }); n++; bytes += buf.length;
    if (sizes[fp] != null && +sizes[fp] !== buf.length) bad.push(fp);
  }
  console.log(`  ✓ ${n} allegati copiati (${(bytes / 1048576).toFixed(1)} MB)`);
  const cited = Object.values(docs.tickets || {}).flatMap((t) => (t.att || []).map((a) => a.p)).filter(Boolean);
  const missing = cited.filter((fp) => !fs.existsSync(fileOf(fp)));
  if (missing.length) console.log(`  ⚠ ${missing.length} allegati citati nei ticket non erano su Supabase`);
  DB.docs = docs;
  DB.user = { id: uid, email, ...hashPw(password) };
  DB.sessions = {};
  DB.meta.importedAt = new Date().toISOString();
  await writeDb();
  // controllo: tutto quello che è stato letto ora è qui, identico
  const saved = JSON.parse(await fsp.readFile(DB_FILE, 'utf8')).docs;
  const same = rows.filter((r) => !skipRow(r)).every((r) => saved[r.coll] && JSON.stringify(saved[r.coll][r.id]) === JSON.stringify(r.data));
  const verified = same && !bad.length && n === names.filter(okPath).length && names.every((fp) => !okPath(fp) || fs.existsSync(fileOf(fp)));
  console.log(verified ? '  ✓ Controllo superato: tutti gli elementi e gli allegati sono qui, identici.' : '  ⚠ Il controllo ha trovato differenze: non tocco niente su Supabase.');
  await backup(true);
  const mark = { at: Date.now(), url: DB.meta.url || '', cal: calTokens(docs) };
  // avviso al vecchio sito: stop alle notifiche dal cloud e invito ad aprire il nuovo indirizzo
  try { await supaCfg(token, uid, { ...((docs.config || {}).main || {}), migratedLocal: mark }); }
  catch (e) { console.log('  (non sono riuscito a segnare il vecchio sito come trasferito:', e.message + ')'); }
  if (verified) {
    const a = has('--si') ? 'si' : await ask('\n  Cancello adesso i tuoi dati da Supabase (ticket, spese, note, allegati…)? Restano qui e nella copia di sicurezza. (si/no) ');
    if (/^s/i.test(a)) await supaClean({ token, uid, names, mark, total: rows.length });
    else console.log('  Va bene, su Supabase resta tutto. Quando vuoi:  capri pulisci');
  }
  console.log('\n  ✓ Fatto. I dati ora sono su questo dispositivo. Per entrare usa la stessa email e password.\n');
}

// «capri pulisci»: cancella da Supabase solo se ogni cosa che c'è là esiste anche qui
async function pulisci() {
  if (!DB.user || !Object.keys(DB.docs).length) { console.log('  Qui non ci sono ancora dati: prima esegui --importa.'); return; }
  console.log('\n  ◉ Pulizia di Supabase (i dati restano su questo dispositivo)\n');
  const { token, uid } = await supaLogin();
  if (uid !== DB.user.id) { console.log('  ⚠ Questo account Supabase non è quello copiato qui: mi fermo.'); return; }
  const rows = await supaRows(token), { names } = await supaFiles(token, uid);
  const missing = rows.filter((r) => !skipRow(r) && !['pushstate', 'calfeed'].includes(r.coll) && !(r.coll === 'config' && r.id === 'main') && !(DB.docs[r.coll] && r.id in DB.docs[r.coll]));
  const missingF = names.filter((fp) => okPath(fp) && !fs.existsSync(fileOf(fp)));
  if (missing.length || missingF.length) {
    console.log(`  ⚠ Su Supabase ci sono ${missing.length} elementi e ${missingF.length} allegati che qui non ci sono (forse aggiunti dal vecchio sito dopo il trasferimento). Non cancello niente.`);
    missing.slice(0, 10).forEach((r) => console.log('    -', r.coll, r.id));
    return;
  }
  await backup(true);
  const a = has('--si') ? 'si' : await ask(`  Su Supabase ci sono ${rows.length} elementi e ${names.length} allegati, tutti già qui. Li cancello? (si/no) `);
  if (!/^s/i.test(a)) { console.log('  Annullato.'); return; }
  await supaClean({ token, uid, names, total: rows.length, mark: { at: Date.now(), url: DB.meta.url || '', cal: calTokens(DB.docs) } });
}
async function setPassword() {
  const email = opt('--email') || (DB.user && DB.user.email) || await ask('  Email (per entrare): ');
  const a = process.env.CAPRI_PASSWORD || await ask('  Nuova password (almeno 10 caratteri): ', true);
  if (a.length < 10) { console.log('  Troppo corta.'); process.exit(1); }
  if (!process.env.CAPRI_PASSWORD) { const b = await ask('  Ripetila: ', true); if (a !== b) { console.log('  Non coincidono.'); process.exit(1); } }
  DB.user = { id: (DB.user && DB.user.id) || randomBytes(16).toString('hex').replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5'), email, ...hashPw(a) };
  DB.sessions = {}; await writeDb(); console.log('  ✓ Password impostata.');
}

if (opt('--indirizzo')) { DB.meta.url = opt('--indirizzo').replace(/\/+$/, '') + '/'; save(0); }
if (opt('--musica')) { DB.meta.musicDir = opt('--musica'); save(0); }
if (has('--imposta')) { await writeDb(); console.log('  ✓ Impostazioni salvate.'); process.exit(0); }
if (has('--pulisci')) { await pulisci(); process.exit(0); }
if (has('--importa')) { await importa(); if (!has('--avvia')) process.exit(0); }
if (has('--password')) { await setPassword(); if (!has('--avvia')) process.exit(0); }

server.listen(PORT, '127.0.0.1', () => {
  log(`◉ Capri Server ${VERSION} pronto su http://127.0.0.1:${PORT}  (dati: ${DATA})`);
  if (DB.meta.url) log('  Dai tuoi dispositivi:', DB.meta.url);
  if (!DB.user) log('  ⚠ Nessuna password: esegui  node server/capri-server.mjs --importa  (o --password)');
});
server.on('error', (e) => { console.error('Non riesco ad avviare il server:', e.message); process.exit(1); });
startMusic();
setTimeout(musicPing, 4000); setInterval(musicPing, 30000);
setInterval(() => { notifyTick().catch((e) => log('⚠ Notifiche:', e.message)); calState(); const h = rome(new Date()).hour; if (h >= 3) backup(false); }, 60000);
setTimeout(() => { notifyTick().catch(() => {}); calState(); }, 8000);
const bye = async () => { MUSIC.stop = true; try { MUSIC.proc && MUSIC.proc.kill(); } catch (e) {} clearTimeout(saveT); await saving; await writeDb().catch(() => {}); process.exit(0); };
process.on('SIGINT', bye); process.on('SIGTERM', bye);
