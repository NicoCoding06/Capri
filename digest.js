/* Capri: contenuto delle notifiche.
   Usato sia dal sito (anteprima) sia dall'invio automatico su GitHub Actions. */
(function (g) {
  var TZ = 'Europe/Rome';
  var DOT = { 1: '🟢', 2: '🟡', 3: '🟠', 4: '🔴' };
  var DOW = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
  var ALL = [0, 1, 2, 3, 4, 5, 6];
  var KINDS = {
    riepilogo: 'Riepilogo completo',
    ticket: 'Solo ticket urgenti',
    scadenze: 'Abbonamenti e scadenze',
    spese: 'Spese del giorno e del mese',
    custom: 'Un messaggio scritto da me'
  };
  function rome(now) {
    var p = {};
    new Intl.DateTimeFormat('en-US', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23', weekday: 'short' })
      .formatToParts(now).forEach(function (x) { p[x.type] = x.value; });
    return { today: p.year + '-' + p.month + '-' + p.day, hour: +p.hour % 24, dow: DOW[p.weekday] };
  }
  function utc(s) { var a = String(s).split('-'); return Date.UTC(+a[0], +a[1] - 1, +a[2]); }
  function eur(n) { return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n); }
  function plural(n, a, b) { return n === 1 ? a : b; }
  function when(n) {
    return n < 0 ? 'scaduto da ' + (-n) + ' ' + plural(-n, 'giorno', 'giorni') : n === 0 ? 'scade oggi' : n === 1 ? 'scade domani' : 'tra ' + n + ' giorni';
  }
  function greeting(h) { return h < 5 ? 'Buonanotte' : h < 13 ? 'Buongiorno' : h < 18 ? 'Buon pomeriggio' : 'Buonasera'; }
  function timeIcon(h) { return h < 5 ? '🌙' : h < 11 ? '☕️' : h < 18 ? '☀️' : '🌙'; }
  function abbLines(abb, today, max) {
    var dd = function (s) { return Math.round((utc(s) - utc(today)) / 864e5); };
    return (abb || []).filter(function (x) { return x && x.active !== false && x.next; })
      .map(function (x) { return { x: x, n: dd(x.next) }; })
      .filter(function (a) { return a.n <= (a.x.remind == null ? 7 : a.x.remind); })
      .sort(function (a, b) { return a.n - b.n; }).slice(0, max || 2)
      .map(function (a) {
        return '💳 ' + a.x.name + (a.x.amt ? ' ' + eur(+a.x.amt) : '') + ' · ' + (a.n < 0 ? 'scaduto' : a.n === 0 ? 'oggi' : a.n === 1 ? 'domani' : 'tra ' + a.n + ' giorni');
      });
  }
  function build(data, now) {
    now = now || new Date();
    var r = rome(now), today = r.today;
    var dd = function (s) { return Math.round((utc(s) - utc(today)) / 864e5); };
    var cfg = data.cfg || {};
    var act = (data.tickets || []).filter(function (t) { return t && t.status !== 'fatto'; });
    var items = act.map(function (t) { return { t: t, n: t.due ? dd(t.due) : null, u: t.urg || 2 }; });
    var hot = items.filter(function (x) { return (x.n !== null && x.n <= 1) || x.u === 4; })
      .sort(function (a, b) { return ((a.n === null ? 99 : a.n) - (b.n === null ? 99 : b.n)) || (b.u - a.u); });
    var late = items.filter(function (x) { return x.n !== null && x.n < 0; }).length;
    var todayN = items.filter(function (x) { return x.n === 0; }).length;
    var lines = hot.slice(0, 4).map(function (x) {
      return DOT[x.u] + ' ' + (x.t.title || 'Ticket') + ' · ' + (x.n === null ? 'critico' : when(x.n));
    });
    if (!hot.length) {
      items.slice().sort(function (a, b) { return (b.u - a.u) || ((a.n === null ? 99 : a.n) - (b.n === null ? 99 : b.n)); })
        .slice(0, 2).forEach(function (x) { lines.push(DOT[x.u] + ' ' + (x.t.title || 'Ticket') + (x.n !== null ? ' · ' + when(x.n) : '')); });
    }
    var shown = hot.length ? Math.min(hot.length, 4) : Math.min(items.length, 2);
    var rest = act.length - shown;
    var al = cfg.abb !== false ? abbLines(data.abb, today, 2) : [];
    if (!act.length && !al.length) return null;
    var name = (cfg.name || '').trim();
    var head = act.length
      ? act.length + ' ' + plural(act.length, 'ticket aperto', 'ticket aperti') + (late ? ' · ' + late + ' ' + plural(late, 'scaduto', 'scaduti') : '') + (!hot.length ? ' · niente di urgente ✨' : '')
      : 'Nessun ticket aperto ✨';
    var body = [head].concat(lines, rest > 0 && lines.length ? ['+ ' + rest + ' ' + plural(rest, 'altro', 'altri')] : [], al).join('\n');
    return { title: timeIcon(r.hour) + ' ' + greeting(r.hour) + (name ? ', ' + name : ''), body: body, badge: late + todayN, tag: 'capri-daily', url: './#oggi', today: today };
  }
  function budget(cfg) {
    if (cfg.sbudget) return +cfg.sbudget;
    var b = (cfg.scats || []).reduce(function (s, x) { return s + (+x.b || 0); }, 0);
    return b || null;
  }
  function forSlot(slot, data, now) {
    now = now || new Date();
    var r = rome(now), today = r.today, cfg = data.cfg || {};
    var kind = slot.kind || 'riepilogo', tag = 'capri-' + (slot.id || kind);
    var p = null;
    if (kind === 'riepilogo' || kind === 'ticket') {
      p = build({ tickets: data.tickets, abb: data.abb, cfg: { name: cfg.name, abb: kind === 'riepilogo' } }, now);
    } else if (kind === 'scadenze') {
      var l = abbLines(data.abb, today, 4);
      if (l.length) p = { title: '💳 Scadenze in arrivo', body: l.join('\n'), url: './#abbonamenti' };
    } else if (kind === 'spese') {
      var sum = function (a) { return a.reduce(function (s, x) { return s + (+x.amt || 0); }, 0); };
      var sp = data.spese || [];
      var td = sp.filter(function (x) { return x.d === today; });
      var mt = sp.filter(function (x) { return String(x.d || '').slice(0, 7) === today.slice(0, 7); });
      var tot = sum(mt), bud = budget(cfg);
      p = {
        title: '💸 Le tue spese',
        body: (td.length ? 'Oggi: ' + eur(sum(td)) + ' in ' + td.length + ' ' + plural(td.length, 'spesa', 'spese') : 'Oggi non hai ancora registrato spese ✍️') +
          '\nQuesto mese: ' + eur(tot) + (bud ? ' su ' + eur(bud) + ' · ' + (tot > bud ? 'oltre di ' + eur(tot - bud) : 'restano ' + eur(bud - tot)) : ''),
        url: './#spese'
      };
    } else if (kind === 'custom') {
      if (slot.title || slot.text) p = { title: slot.title || 'Capri', body: slot.text || '', url: './#oggi' };
    }
    if (p) { p.tag = tag; p.today = today; }
    return p;
  }
  function slots(notify) {
    if (notify && Array.isArray(notify.slots) && notify.slots.length) return notify.slots;
    return [{ id: 's1', h: notify && notify.hour != null ? +notify.hour : 8, kind: notify && notify.abb === false ? 'ticket' : 'riepilogo', days: ALL.slice() }];
  }
  g.CapriDigest = { build: build, forSlot: forSlot, slots: slots, rome: rome, KINDS: KINDS, ALL: ALL };
})(typeof window !== 'undefined' ? window : globalThis);
