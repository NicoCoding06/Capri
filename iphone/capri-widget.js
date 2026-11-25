// Capri · widget per iPhone (app Scriptable)
// Schermata Home: piccolo, medio, grande. Schermata di blocco: rettangolare, circolare, in linea.
// Tocca il widget per aprire Capri.

const API = "__URL__/rest/v1/rpc/capri_api";
const KEY = "__KEY__";
const TOKEN = "__TOKEN__";
const SITE = "__SITE__";

const C = {
  bg: new Color("#08080a"), panel: new Color("#141418"), w: Color.white(), mut: new Color("#a3a3ae"),
  pink: new Color("#ff2e93"), green: new Color("#3dff9a"), blue: new Color("#43b3ff"),
  u: { 1: new Color("#2ee27a"), 2: new Color("#ffd60a"), 3: new Color("#ff8a1f"), 4: new Color("#ff2d55") }
};

async function load() {
  const r = new Request(API);
  r.method = "POST";
  r.timeoutInterval = 15;
  r.headers = { apikey: KEY, "Content-Type": "application/json" };
  r.body = JSON.stringify({ p_token: TOKEN, p_action: "riepilogo" });
  const j = await r.loadJSON();
  if (!j || j.message || j.code) throw new Error((j && j.message) || "risposta non valida");
  return j;
}

function utc(s) { const a = String(s).split("-"); return Date.UTC(+a[0], +a[1] - 1, +a[2]); }
function eur(n) { return (Math.round(n * 100) / 100).toLocaleString("it-IT", { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + " €"; }
function when(n) { return n < 0 ? "scaduto" : n === 0 ? "oggi" : n === 1 ? "domani" : "tra " + n + " gg"; }

function summary(d) {
  const today = d.oggi, dd = (s) => Math.round((utc(s) - utc(today)) / 864e5);
  const items = (d.tickets || []).map((t) => ({ t: t, n: t.due ? dd(t.due) : null, u: +t.urg || 2 }));
  const hot = items.filter((x) => (x.n !== null && x.n <= 1) || x.u === 4)
    .sort((a, b) => ((a.n === null ? 99 : a.n) - (b.n === null ? 99 : b.n)) || (b.u - a.u));
  const rest = items.filter((x) => hot.indexOf(x) < 0)
    .sort((a, b) => ((a.n === null ? 99 : a.n) - (b.n === null ? 99 : b.n)) || (b.u - a.u));
  const tot = (d.spese || []).reduce((s, x) => s + (+x.amt || 0), 0);
  const cfg = d.config || {};
  const bud = +cfg.sbudget || (cfg.scats || []).reduce((s, x) => s + (+x.b || 0), 0) || 0;
  const next = (d.abbonamenti || []).filter((x) => x.next).map((x) => ({ x: x, n: dd(x.next) })).sort((a, b) => a.n - b.n)[0];
  return { items, hot, list: hot.concat(rest), tot, bud, next, open: items.length };
}

function txt(stack, s, size, color, bold) {
  const t = stack.addText(s);
  t.font = bold ? Font.boldSystemFont(size) : Font.mediumSystemFont(size);
  t.textColor = color; t.lineLimit = 1; t.minimumScaleFactor = 0.7;
  return t;
}

function build(d, err) {
  const fam = config.widgetFamily || "medium";
  const w = new ListWidget();
  w.url = SITE + "#oggi";
  w.refreshAfterDate = new Date(Date.now() + 15 * 60 * 1000);
  const lock = fam.indexOf("accessory") === 0;
  if (!lock) {
    const g = new LinearGradient();
    g.colors = [new Color("#1a0b14"), C.bg, new Color("#061810")];
    g.locations = [0, 0.55, 1];
    w.backgroundGradient = g;
    w.setPadding(14, 14, 12, 14);
  }
  if (err || !d) {
    if (fam === "accessoryInline") { w.addText("Capri: non raggiungibile"); return w; }
    txt(w, "CAPRI", 11, C.green, true);
    w.addSpacer(4);
    const t = w.addText(err ? "Dati non raggiungibili: " + err : "Nessun dato");
    t.font = Font.systemFont(11); t.textColor = lock ? Color.white() : C.pink;
    return w;
  }
  const s = summary(d);
  const urgent = s.hot.length;
  if (fam === "accessoryInline") {
    w.addText((urgent ? "⚠︎ " + urgent + " urgenti · " : s.open + " ticket · ") + eur(s.tot));
    return w;
  }
  if (fam === "accessoryCircular") {
    w.addAccessoryWidgetBackground = true;
    const t = w.addText(String(urgent || s.open)); t.font = Font.boldSystemFont(22); t.centerAlignText();
    const l = w.addText(urgent ? "urgenti" : "ticket"); l.font = Font.systemFont(9); l.centerAlignText();
    return w;
  }
  if (fam === "accessoryRectangular") {
    const h = w.addText(urgent ? urgent + " urgenti · " + eur(s.tot) : s.open + " ticket · " + eur(s.tot));
    h.font = Font.boldSystemFont(13);
    s.list.slice(0, 2).forEach((x) => { const t = w.addText("• " + x.t.title + (x.n !== null ? " · " + when(x.n) : "")); t.font = Font.systemFont(11); t.lineLimit = 1; });
    return w;
  }
  const head = w.addStack(); head.centerAlignContent();
  txt(head, "◉ CAPRI", 11, C.green, true);
  head.addSpacer();
  txt(head, eur(s.tot) + (s.bud ? " / " + eur(s.bud) : ""), 11, s.bud && s.tot > s.bud ? C.u[4] : C.mut, false);
  w.addSpacer(fam === "small" ? 6 : 8);
  const big = w.addStack(); big.bottomAlignContent();
  txt(big, String(urgent || s.open), fam === "small" ? 34 : 30, urgent ? C.pink : C.w, true);
  big.addSpacer(6);
  txt(big, urgent ? "urgenti" : (s.open === 1 ? "ticket aperto" : "ticket aperti"), 12, C.mut, false);
  w.addSpacer(6);
  const n = fam === "small" ? 2 : fam === "large" || fam === "extraLarge" ? 8 : 3;
  if (!s.list.length) txt(w, "Niente da fare ✨", 12, C.green, false);
  s.list.slice(0, n).forEach((x) => {
    const r = w.addStack(); r.centerAlignContent(); r.spacing = 6;
    txt(r, "●", 9, C.u[x.u] || C.mut, true);
    const tt = txt(r, x.t.title || "Ticket", 12, C.w, false); tt.lineLimit = 1;
    if (fam !== "small") { r.addSpacer(); if (x.n !== null) txt(r, when(x.n), 11, x.n < 0 ? C.u[4] : x.n <= 1 ? C.u[3] : C.mut, false); }
    w.addSpacer(3);
  });
  w.addSpacer();
  if (fam !== "small" && s.next) {
    txt(w, "💳 " + s.next.x.name + (s.next.x.amt ? " " + eur(+s.next.x.amt) : "") + " · " + when(s.next.n), 11, C.blue, false);
  }
  if (s.bud && fam !== "small") {
    const bar = w.addStack(); bar.size = new Size(0, 4); bar.cornerRadius = 2; bar.backgroundColor = new Color("#26262c");
    const pct = Math.min(1, s.tot / s.bud);
    const fill = bar.addStack(); fill.size = new Size(Math.max(4, Math.round(280 * pct)), 4); fill.cornerRadius = 2;
    fill.backgroundColor = s.tot > s.bud ? C.u[4] : C.green;
    bar.addSpacer();
  }
  return w;
}

let data = null, err = null;
try { data = await load(); } catch (e) { err = String(e.message || e); }
const widget = build(data, err);
if (config.runsInWidget) Script.setWidget(widget);
else await widget.presentMedium();
Script.complete();
