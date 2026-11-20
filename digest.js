/* Capri: riepilogo giornaliero per le notifiche.
   Usato sia dal sito (anteprima) sia dall'invio automatico su GitHub Actions. */
(function (g) {
  var TZ = 'Europe/Rome';
  var DOT = { 1: '🟢', 2: '🟡', 3: '🟠', 4: '🔴' };
  function rome(now) {
    var p = {};
    new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' })
      .formatToParts(now).forEach(function (x) { p[x.type] = x.value; });
    return { today: p.year + '-' + p.month + '-' + p.day, hour: +p.hour };
  }
  function utc(s) { var a = String(s).split('-'); return Date.UTC(+a[0], +a[1] - 1, +a[2]); }
  function eur(n) { return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n); }
  function plural(n, a, b) { return n === 1 ? a : b; }
  function when(n) {
    return n < 0 ? 'scaduto da ' + (-n) + ' ' + plural(-n, 'giorno', 'giorni') : n === 0 ? 'scade oggi' : n === 1 ? 'scade domani' : 'tra ' + n + ' giorni';
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
    var abbLines = [];
    if (cfg.abb !== false) {
      (data.abb || []).filter(function (x) { return x && x.active !== false && x.next; })
        .map(function (x) { return { x: x, n: dd(x.next) }; })
        .filter(function (a) { return a.n <= (a.x.remind == null ? 7 : a.x.remind); })
        .sort(function (a, b) { return a.n - b.n; }).slice(0, 2)
        .forEach(function (a) {
          abbLines.push('💳 ' + a.x.name + (a.x.amt ? ' ' + eur(+a.x.amt) : '') + ' · ' + (a.n < 0 ? 'scaduto' : a.n === 0 ? 'oggi' : a.n === 1 ? 'domani' : 'tra ' + a.n + ' giorni'));
        });
    }
    if (!act.length && !abbLines.length) return null;
    var h = r.hour, greet = h < 5 ? 'Buonanotte' : h < 13 ? 'Buongiorno' : h < 18 ? 'Buon pomeriggio' : 'Buonasera';
    var name = (cfg.name || '').trim();
    var head = act.length
      ? act.length + ' ' + plural(act.length, 'ticket aperto', 'ticket aperti') + (late ? ' · ' + late + ' ' + plural(late, 'scaduto', 'scaduti') : '') + (!hot.length ? ' · niente di urgente ✨' : '')
      : 'Nessun ticket aperto ✨';
    var body = [head].concat(lines, rest > 0 && lines.length ? ['+ ' + rest + ' ' + plural(rest, 'altro', 'altri')] : [], abbLines).join('\n');
    return { title: '😈 ' + greet + (name ? ', ' + name : ''), body: body, badge: late + todayN, tag: 'capri-daily', url: './#oggi', today: today };
  }
  g.CapriDigest = { build: build, rome: rome };
})(typeof window !== 'undefined' ? window : globalThis);
