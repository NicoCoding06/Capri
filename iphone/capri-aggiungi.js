// Capri · aggiungi a voce con Siri (app Scriptable)
// Esempi da dire dopo "Ehi Siri, Capri":
//   "spesa 12,50 pizza"          → spesa di 12,50 € (categoria riconosciuta dalle parole, se possibile)
//   "ticket chiamare il commercialista domani urgente"
//   "nota comprare le batterie"
//   "diario il rebase interattivo si fa con git rebase -i"
// Senza parola iniziale: con un numero diventa una spesa, altrimenti una nota.

const API = "__URL__/rest/v1/rpc/capri_api";
const KEY = "__KEY__";
const TOKEN = "__TOKEN__";
const SITE = "__SITE__";

async function call(body) {
  const r = new Request(API);
  r.method = "POST";
  r.timeoutInterval = 15;
  r.headers = { apikey: KEY, "Content-Type": "application/json" };
  r.body = JSON.stringify(Object.assign({ p_token: TOKEN }, body));
  const j = await r.loadJSON();
  if (j && (j.message || j.code)) throw new Error(j.message || "errore");
  return j;
}

function pad(n) { return String(n).padStart(2, "0"); }
function iso(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
function eur(n) { return n.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €"; }
function clean(s) { return s.replace(/\s+/g, " ").replace(/^[\s,.:;-]+|[\s,.:;-]+$/g, "").trim(); }
function cap(s) { return s ? s[0].toUpperCase() + s.slice(1) : s; }

const TYPES = [
  ["spesa", /^(spesa|spese|spesi|ho speso|pagato|ho pagato)\b/],
  ["ticket", /^(ticket|promemoria|ricordami di|ricordami|da fare|devo)\b/],
  ["nota", /^(nota|appunta|scrivi)\b/],
  ["diary", /^(diario|diary|ho imparato che|ho imparato|imparato)\b/]
];
const KEYWORDS = {
  "Spesa": ["supermercato", "esselunga", "coop", "conad", "carrefour", "lidl", "spesa"],
  "Ristoranti e bar": ["pizza", "ristorante", "bar", "caffè", "caffe", "pranzo", "cena", "aperitivo", "sushi", "panino", "colazione"],
  "Trasporti": ["benzina", "treno", "metro", "autobus", "taxi", "parcheggio", "autostrada", "pedaggio", "biglietto"],
  "Casa e bollette": ["bolletta", "luce", "gas", "affitto", "internet", "condominio"],
  "Svago": ["cinema", "concerto", "libro", "videogioco", "gioco", "netflix"],
  "Magic": ["magic", "carte", "busta", "buste", "booster", "mazzo"],
  "Salute": ["farmacia", "medico", "dentista", "visita"],
  "Abbigliamento": ["scarpe", "maglia", "felpa", "pantaloni", "giacca", "vestiti"]
};
const WEEK = ["domenica", "lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato"];

function pickCat(text, cats, kw) {
  const low = " " + text.toLowerCase() + " ";
  const names = (cats || []).map((c) => c.n);
  for (const n of names) if (low.indexOf(" " + n.toLowerCase() + " ") >= 0 || low.indexOf(" " + n.toLowerCase().split(" ")[0] + " ") >= 0) return n;
  if (kw) for (const k in kw) if (kw[k].some((w) => low.indexOf(" " + w + " ") >= 0)) return names.indexOf(k) >= 0 || !names.length ? k : "";
  return "";
}

function parse(raw, cfg) {
  let text = clean(String(raw || ""));
  let low = text.toLowerCase(), tipo = "";
  for (const [t, re] of TYPES) { const m = low.match(re); if (m) { tipo = t; text = clean(text.slice(m[0].length)); low = text.toLowerCase(); break; } }
  const num = low.match(/(\d+)\s*(?:euro|€)\s*e\s*(\d{1,2})\b/) || low.match(/(\d+)[.,](\d{1,2})\b/) || low.match(/(\d+)/);
  if (!tipo) tipo = num ? "spesa" : "nota";
  if (tipo === "spesa") {
    if (!num) return { tipo, err: "Non ho capito l'importo" };
    const amount = +(num[1] + "." + (num[2] ? num[2].padEnd(2, "0") : "0"));
    let note = clean(text.replace(num[0], " ").replace(/\b(euro|€|di|da|per)\b/gi, " "));
    const cat = pickCat(note, cfg.scats, KEYWORDS) || "Altro";
    return { tipo, importo: amount, testo: cap(note), categoria: cat };
  }
  if (tipo === "ticket") {
    let urg = 2, due = "";
    if (/\b(urgente|urgentissimo|critico|subito)\b/i.test(text)) urg = 4;
    else if (/\b(importante)\b/i.test(text)) urg = 3;
    text = text.replace(/\b(urgente|urgentissimo|critico|subito|importante)\b/gi, " ");
    const d = new Date();
    let m;
    if (/\bdopodomani\b/i.test(text)) { d.setDate(d.getDate() + 2); due = iso(d); text = text.replace(/\bdopodomani\b/i, " "); }
    else if (/\bdomani\b/i.test(text)) { d.setDate(d.getDate() + 1); due = iso(d); text = text.replace(/\bdomani\b/i, " "); }
    else if (/\boggi\b/i.test(text)) { due = iso(d); text = text.replace(/\boggi\b/i, " "); }
    else if ((m = text.match(/\btra (\d+) giorni\b/i))) { d.setDate(d.getDate() + (+m[1])); due = iso(d); text = text.replace(m[0], " "); }
    else if ((m = text.match(/\b(?:entro |per )?(luned[iì]|marted[iì]|mercoled[iì]|gioved[iì]|venerd[iì]|sabato|domenica)(?![a-zàèéìòù])/i))) {
      const want = WEEK.findIndex((w) => w.slice(0, 5) === m[1].toLowerCase().slice(0, 5));
      let add = (want - d.getDay() + 7) % 7; if (add === 0) add = 7; d.setDate(d.getDate() + add); due = iso(d); text = text.replace(m[0], " ");
    }
    const cat = pickCat(text, cfg.tcats, null);
    return { tipo, testo: cap(clean(text)), importo: urg, extra: due, categoria: cat };
  }
  if (tipo === "diary") return { tipo, testo: cap(text), categoria: pickCat(text, cfg.dcats, null) };
  return { tipo: "nota", testo: cap(text) };
}

async function ask() {
  const a = new Alert();
  a.title = "Capri";
  a.message = "Es. “spesa 12,50 pizza”, “ticket chiamare Mario domani”, “nota …”, “diario …”";
  a.addTextField("Cosa aggiungo?", "");
  a.addAction("Aggiungi");
  a.addCancelAction("Annulla");
  const i = await a.presentAlert();
  return i === -1 ? "" : a.textFieldValue(0);
}

function done(msg, ok) {
  if (config.runsWithSiri) Speech.speak(msg);
  Script.setShortcutOutput(msg);
  if (!config.runsWithSiri && !config.runsInWidget) {
    const n = new Notification(); n.title = ok ? "Capri ✓" : "Capri"; n.body = msg; n.openURL = SITE + "#oggi"; n.schedule();
  }
}

let input = args.shortcutParameter || (args.plainTexts && args.plainTexts[0]) || (args.queryParameters && args.queryParameters.testo) || "";
if (!input && !config.runsWithSiri) input = await ask();
if (!String(input).trim()) { done("Non ho ricevuto niente da aggiungere.", false); }
else {
  let cfg = {};
  try { cfg = (await call({ p_action: "riepilogo" })).config || {}; } catch (e) { cfg = {}; }
  const p = parse(input, cfg);
  if (p.err) done(p.err + ". Prova con: spesa 12,50 pizza.", false);
  else {
    try {
      const r = await call({ p_action: "aggiungi", p_tipo: p.tipo, p_testo: p.testo || "", p_importo: p.importo == null ? null : p.importo, p_categoria: p.categoria || "", p_extra: p.extra || "" });
      const msg = p.tipo === "spesa" ? "Spesa di " + eur(p.importo) + " registrata" + (p.categoria && p.categoria !== "Altro" ? " in " + p.categoria : "") + "."
        : p.tipo === "ticket" ? "Ticket " + (r && r.num ? "numero " + r.num + " " : "") + "creato: " + p.testo + (p.extra ? ", scadenza " + p.extra.split("-").reverse().join("/") : "") + "."
        : p.tipo === "diary" ? "Appunto salvato nel Diary." : "Nota salvata.";
      done(msg, true);
    } catch (e) { done("Non sono riuscito a salvarlo: " + (e.message || e), false); }
  }
}
Script.complete();
