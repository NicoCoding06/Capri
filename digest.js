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
    settimana: 'Riepilogo della settimana',
    abitudini: 'Abitudini ancora da fare',
    ripasso: 'Un appunto del Diary da ripassare',
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
  function addDays(iso, n) { return new Date(utc(iso) + n * 864e5).toISOString().slice(0, 10); }
  function dowOf(iso) { return (new Date(utc(iso)).getUTCDay() + 6) % 7; }
  // Abitudini: giorni 0=lun…6=dom; done = { 'AAAA-MM-GG': 1 }
  function habitOn(h, iso) { var d = Array.isArray(h.days) && h.days.length ? h.days : ALL; return d.indexOf(dowOf(iso)) >= 0; }
  function habitStreak(h, today) {
    var n = 0, d = today, done = h.done || {};
    if (habitOn(h, d) && !done[d]) d = addDays(d, -1);
    for (var i = 0; i < 800; i++) {
      if (h.created && utc(d) < utc(new Date(+h.created).toISOString().slice(0, 10)) - 864e5) break;
      if (habitOn(h, d)) { if (done[d]) n++; else break; }
      d = addDays(d, -1);
    }
    return n;
  }
  function habitsLeft(habits, today) {
    return (habits || []).filter(function (h) { return h && !h.archived && habitOn(h, today) && !(h.done || {})[today]; });
  }
  // Ripasso del Diary (ripetizione dilazionata): un appunto torna dopo 3, 7, 14, 30, 60, 120, 240 giorni
  var REV = [3, 7, 14, 30, 60, 120, 240];
  function reviewNext(x) { return x.rev && x.rev.next ? x.rev.next : addDays(String(x.date || '').slice(0, 10), 3); }
  function reviewQueue(diary, today) {
    return (diary || []).filter(function (x) { return x && (x.title || x.body) && /^\d{4}-\d{2}-\d{2}/.test(String(x.date || '')) && reviewNext(x) <= today; })
      .sort(function (a, b) { return reviewNext(a).localeCompare(reviewNext(b)) || String(a.date).localeCompare(String(b.date)); });
  }
  function plain(t) { return String(t || '').replace(/```[\s\S]*?```/g, ' ').replace(/[#*`>_-]+/g, ' ').replace(/\s+/g, ' ').trim(); }
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
    } else if (kind === 'settimana') {
      var dayStr = function (n) { var t = utc(today) + n * 864e5, x = new Date(t); return x.toISOString().slice(0, 10); };
      var d7 = dayStr(-6), d14 = dayStr(-13), ms7 = now.getTime() - 7 * 864e5;
      var tk = data.tickets || [];
      var closed = tk.filter(function (t) { return t && t.status === 'fatto' && (+t.doneAt || 0) >= ms7; }).length;
      var open = tk.filter(function (t) { return t && t.status !== 'fatto'; });
      var lateW = open.filter(function (t) { return t.due && t.due < today; }).length;
      var sumR = function (a, b) { return (data.spese || []).filter(function (x) { return x.d >= a && x.d <= b; }).reduce(function (s, x) { return s + (+x.amt || 0); }, 0); };
      var w = sumR(d7, today), prev = sumR(d14, dayStr(-7));
      var dn = (data.diary || []).filter(function (x) { return x && String(x.date || '') >= d7; }).length;
      var next7 = dayStr(7);
      var dueT = open.filter(function (t) { return t.due && t.due >= today && t.due <= next7; }).length;
      var dueA = (data.abb || []).filter(function (x) { return x && x.active !== false && x.next && x.next >= today && x.next <= next7; }).length;
      var pct = prev ? Math.round((w - prev) / prev * 100) : null;
      var lines = [
        '✅ ' + closed + ' ' + plural(closed, 'ticket chiuso', 'ticket chiusi') + ' · ' + open.length + ' ' + plural(open.length, 'aperto', 'aperti') + (lateW ? ' (' + lateW + ' ' + plural(lateW, 'scaduto', 'scaduti') + ')' : ''),
        '💸 ' + eur(w) + ' spesi' + (pct !== null ? ' (' + (pct > 0 ? '+' : '') + pct + '% sulla settimana prima)' : ''),
        '📒 ' + dn + ' ' + plural(dn, 'appunto', 'appunti') + ' nel Diary',
        '📅 In arrivo: ' + dueT + ' ' + plural(dueT, 'ticket', 'ticket') + ' e ' + dueA + ' ' + plural(dueA, 'pagamento', 'pagamenti')
      ];
      p = { title: '📊 La tua settimana' + (cfg.name ? ', ' + cfg.name : ''), body: lines.join('\n'), url: './#oggi' };
    } else if (kind === 'abitudini') {
      var left = habitsLeft(data.habits, today);
      if (left.length) {
        var risk = left.map(function (h) { return { h: h, s: habitStreak(h, today) }; }).filter(function (x) { return x.s >= 2; }).sort(function (a, b) { return b.s - a.s; })[0];
        p = { title: '✅ ' + (left.length === 1 ? 'Ti manca un\'abitudine' : 'Ti mancano ' + left.length + ' abitudini'),
          body: left.slice(0, 5).map(function (h) { return (h.emoji ? h.emoji + ' ' : '• ') + h.name; }).join('\n') + (risk ? '\n🔥 ' + risk.h.name + ': ' + risk.s + ' giorni di fila in gioco' : ''), url: './#oggi' };
      }
    } else if (kind === 'ripasso') {
      var q = reviewQueue(data.diary, today);
      if (q.length) {
        var x = q[0], txt = plain(x.body);
        p = { title: '🧠 Da ripassare: ' + (x.title || plain(x.body).slice(0, 40)), body: (txt ? (txt.length > 170 ? txt.slice(0, 167) + '…' : txt) : 'Apri Capri per ripassarlo.') + (q.length > 1 ? '\n(+' + (q.length - 1) + ' in coda)' : ''), url: './#oggi' };
      }
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
  g.CapriDigest = { build: build, forSlot: forSlot, slots: slots, rome: rome, KINDS: KINDS, ALL: ALL,
    addDays: addDays, dowOf: dowOf, habitOn: habitOn, habitStreak: habitStreak, habitsLeft: habitsLeft, REV: REV, reviewNext: reviewNext, reviewQueue: reviewQueue, plain: plain };
})(typeof window !== 'undefined' ? window : globalThis);
