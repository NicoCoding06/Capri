// Capri: calendario in formato iCalendar (.ics) per l'abbonamento dal Calendario dell'iPhone.
// Contiene i ticket aperti con scadenza (più le prossime ripetizioni) e i pagamenti/scadenze dei prossimi 12 mesi.

const REP = { g1: 'ogni giorno', s1: 'ogni settimana', s2: 'ogni 2 settimane', m1: 'ogni mese', m3: 'ogni 3 mesi', m6: 'ogni 6 mesi', a1: 'ogni anno' };
const URG = { 1: 'Bassa', 2: 'Media', 3: 'Alta', 4: 'Critica' };

function addPeriod(day, n, u) {
  const [y, m, d] = String(day).split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  n = +n || 1;
  if (u === 'g') dt.setUTCDate(dt.getUTCDate() + n);
  else if (u === 's') dt.setUTCDate(dt.getUTCDate() + 7 * n);
  else {
    const months = u === 'a' ? 12 * n : n;
    dt.setUTCDate(1); dt.setUTCMonth(dt.getUTCMonth() + months);
    const last = new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth() + 1, 0)).getUTCDate();
    dt.setUTCDate(Math.min(d, last));
  }
  return dt.toISOString().slice(0, 10);
}
const plusDays = (day, n) => { const t = new Date(day + 'T00:00:00Z'); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); };
const ymd = (s) => String(s).replace(/-/g, '');
const esc = (s) => String(s ?? '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
const eur = (n) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n);

// Righe lunghe piegate a 75 byte come chiede lo standard
function fold(line) {
  const out = []; let cur = '', bytes = 0;
  for (const ch of line) {
    const b = Buffer.byteLength(ch);
    if (bytes + b > (out.length ? 74 : 75)) { out.push(cur); cur = ''; bytes = 0; }
    cur += ch; bytes += b;
  }
  out.push(cur);
  return out.join('\r\n ');
}

export function buildICS({ tickets = [], abbonamenti = [], site = '' }, today, stamp = new Date()) {
  const dtstamp = stamp.toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const until = plusDays(today, 366), from = plusDays(today, -60);
  const ev = [];
  const push = (uid, day, summary, desc) => {
    if (day < from || day > until) return;
    ev.push(['BEGIN:VEVENT', 'UID:' + uid + '@capri', 'DTSTAMP:' + dtstamp, 'DTSTART;VALUE=DATE:' + ymd(day), 'DTEND;VALUE=DATE:' + ymd(plusDays(day, 1)),
      'SUMMARY:' + esc(summary), desc ? 'DESCRIPTION:' + esc(desc) : null, site ? 'URL:' + site : null, 'TRANSP:TRANSPARENT', 'END:VEVENT'].filter(Boolean));
  };
  for (const t of tickets) {
    if (!t || t.status === 'fatto' || !/^\d{4}-\d{2}-\d{2}$/.test(t.due || '')) continue;
    const desc = [`Urgenza: ${URG[t.urg || 2] || 'Media'}`, t.cat ? `Categoria: ${t.cat}` : '', t.rep && REP[t.rep] ? `Si ripete ${REP[t.rep]}` : '', t.desc || ''].filter(Boolean).join('\n');
    push('t-' + t._id, t.due, `🎫 ${t.title || 'Ticket'}${t.num ? ' #' + t.num : ''}`, desc);
    if (t.rep && REP[t.rep]) {
      let d = t.due;
      for (let i = 0; i < 400; i++) { d = addPeriod(d, +t.rep.slice(1) || 1, t.rep[0]); if (d > until) break; push(`t-${t._id}-${d}`, d, `↻ ${t.title || 'Ticket'}`, desc); }
    }
  }
  for (const x of abbonamenti) {
    if (!x || x.active === false || !/^\d{4}-\d{2}-\d{2}$/.test(x.next || '')) continue;
    let d = x.next;
    for (let i = 0; i < 400 && d <= until; i++) {
      const doc = x.kind === 'doc';
      push(`p-${x._id}-${d}`, d, `${doc ? '📄' : '💳'} ${x.name}${x.amt ? ' · ' + eur(+x.amt) : ''}`, x.note || '');
      if (doc) break;
      d = addPeriod(d, x.n, x.u || 'm');
    }
  }
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Capri//Calendario//IT', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'X-WR-CALNAME:Capri', 'X-WR-TIMEZONE:Europe/Rome', 'X-APPLE-CALENDAR-COLOR:#FF2E93', 'REFRESH-INTERVAL;VALUE=DURATION:PT1H', 'X-PUBLISHED-TTL:PT1H',
    ...ev.flat(), 'END:VCALENDAR'];
  return { text: lines.map(fold).join('\r\n') + '\r\n', events: ev.length };
}
