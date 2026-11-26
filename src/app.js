{
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8);
const clone=o=>JSON.parse(JSON.stringify(o??null));
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const safeUrl=u=>/^https?:\/\//i.test(String(u||''))?String(u):'#';
const ico=(n,cls='')=>`<svg${cls?` class="${cls}"`:''}><use href="#i-${n}"/></svg>`;
const EUR=new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR'});
const eur=n=>typeof n==='number'&&isFinite(n)?EUR.format(n):'—';
const DFMT=new Intl.DateTimeFormat('it-IT',{day:'numeric',month:'short',year:'numeric'});
const TFMT=new Intl.DateTimeFormat('it-IT',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
const toDate=v=>typeof v==='number'?new Date(v):new Date(String(v).length===10?v+'T12:00:00':v);
const fmtDate=v=>{if(!v)return'—';const d=toDate(v);return isNaN(d)?'—':DFMT.format(d);};
const fmtTime=v=>{if(!v)return'';const d=toDate(v);return isNaN(d)?'':TFMT.format(d);};
const isoDay=(d=new Date())=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const fmtSize=b=>!b?'':b<1024?b+' B':b<1048576?Math.round(b/1024)+' KB':(b/1048576).toFixed(1).replace('.',',')+' MB';
const extOf=n=>{const m=String(n||'').match(/\.([a-z0-9]{1,6})$/i);return m?m[1].toLowerCase():'file';};
const numIn=v=>{if(v===''||v==null)return null;return FX.parseNum(v);};
const plural=(n,a,b)=>n===1?a:b;
{const t=new Intl.DateTimeFormat('it-IT',{weekday:'long',day:'numeric',month:'long'}).format(new Date());$$('[data-today]').forEach(e=>e.textContent=t[0].toUpperCase()+t.slice(1));}

const DEF={
  tcats:[{n:'Lavoro',c:'#4d8dff'},{n:'Casa',c:'#1fe08f'},{n:'Personale',c:'#ff4fd8'},{n:'Burocrazia',c:'#ffd60a'},{n:'Salute',c:'#ff6b6b'}],
  wcats:[{n:'Magic: The Gathering',c:'#ff8a1f'},{n:'Tech',c:'#4d8dff'},{n:'Videogiochi',c:'#a3ff12'},{n:'Casa',c:'#1fe08f'},{n:'Abbigliamento',c:'#ff4fd8'},{n:'Altro',c:'#9a9aa3'}],
  dcats:[{n:'Tecnico',c:'#4d8dff'},{n:'Strumenti e software',c:'#22d3ee'},{n:'Processi',c:'#ffb547'},{n:'Persone e clienti',c:'#ff4fd8'},{n:'Errori da evitare',c:'#ff2d55'},{n:'Idee',c:'#3dff9a'}],
  scats:[{n:'Spesa',c:'#1fe08f'},{n:'Casa e bollette',c:'#4d8dff'},{n:'Trasporti',c:'#ffd60a'},{n:'Ristoranti e bar',c:'#ff8a1f'},{n:'Svago',c:'#ff4fd8'},{n:'Magic',c:'#ff2d55'},{n:'Abbonamenti',c:'#22d3ee'},{n:'Salute',c:'#ff6b6b'},{n:'Abbigliamento',c:'#a78bfa'},{n:'Altro',c:'#9a9aa3'}]
};
const URG=[null,{n:'Bassa',c:'var(--u1)'},{n:'Media',c:'var(--u2)'},{n:'Alta',c:'var(--u3)'},{n:'Critica',c:'var(--u4)'}];
const STAT={aperto:'Aperto',corso:'In corso',attesa:'In attesa',fatto:'Completato'};
const PRIO=[null,{n:'Alta',c:'var(--u4)'},{n:'Media',c:'var(--u2)'},{n:'Bassa',c:'var(--u1)'}];
const um=u=>`<span class="um" aria-hidden="true">${[1,2,3,4].map(i=>`<i${i<=u?' class="on"':''}></i>`).join('')}</span>`;

const S={tickets:[],wish:[],sheets:[],cfg:null,loaded:{t:0,w:0,s:0},view:'ticket',
  tf:{status:'attivi',cat:'',urg:0,q:'',sort:'due',late:false,soon:false},
  wf:{status:'voglio',cat:'',q:'',sort:'prio'},
  as:null,g:{c:0,r:0,c2:0,r2:0},ed:null,redraw:null};
const cfg=()=>({tcats:(S.cfg&&S.cfg.tcats)||DEF.tcats,wcats:(S.cfg&&S.cfg.wcats)||DEF.wcats,scats:(S.cfg&&S.cfg.scats)||DEF.scats,dcats:(S.cfg&&S.cfg.dcats)||DEF.dcats,sbudget:(S.cfg&&S.cfg.sbudget)||null,name:(S.cfg&&S.cfg.name)||''});
const catOf=(list,n)=>cfg()[list].find(c=>c.n===n);

/* ---------- ui helpers ---------- */
function toast(msg,kind=''){const t=document.createElement('div');t.className='toast '+kind;t.textContent=msg;$('#toasts').append(t);setTimeout(()=>t.remove(),4800);}
function setSync(txt,kind){const s=$('#sync');s.textContent=txt;s.className='sync '+(kind||'');s.title=txt;}
const OV=$('#ov'),DLG=$('#dlg');let onClose=null;
function openModal(html,{wide=false,close=null}={}){DLG.innerHTML=html;DLG.className='dlg'+(wide?' wide':'');OV.hidden=false;OV.scrollTop=0;document.body.classList.add('lock');onClose=close;S.redraw=null;const f=DLG.querySelector('[autofocus]');if(f&&matchMedia('(pointer:fine)').matches)setTimeout(()=>f.focus(),30);}
function closeModal(){if(OV.hidden)return;const c=onClose;onClose=null;try{if(c)c();}catch(e){console.error(e);}OV.hidden=true;DLG.innerHTML='';document.body.classList.remove('lock');S.redraw=null;}
DLG.addEventListener('click',e=>{if(e.target.closest('[data-close]'))closeModal();});
document.addEventListener('keydown',e=>{if(OV.hidden)return;if(e.key==='Escape'){e.preventDefault();closeModal();}else if(e.key==='Enter'&&(e.metaKey||e.ctrlKey)){const b=DLG.querySelector('.mf .btn.pri');if(b){e.preventDefault();b.click();}}});
function armed(b,label='Conferma'){if(b.dataset.armed)return true;b.dataset.armed='1';const o=b.innerHTML;b.textContent=label;b.classList.add('warn');setTimeout(()=>{if(b.isConnected){delete b.dataset.armed;b.innerHTML=o;b.classList.remove('warn');}},3500);return false;}
const errMsg=e=>(e&&(e.message||e.error_description||e.code))||'errore';

/* ---------- storage (Supabase) ---------- */
let SB=null,UID=null,EMAIL='';
const LOCAL=!!(window.CAPRI_CONFIG&&window.CAPRI_CONFIG.local); /* Capri Server sul tuo dispositivo */
const CACHE={tickets:new Map(),wishlist:new Map(),sheets:new Map(),config:new Map(),spese:new Map(),abbonamenti:new Map(),note:new Map(),diary:new Map(),push:new Map(),pushkeys:new Map(),pushstate:new Map()};
const SUBS={};
const wq={},pend={};let pendN=0;
function emit(coll){const fn=SUBS[coll];if(fn)fn([...(CACHE[coll]||new Map()).entries()].map(([id,data])=>({id,data})));}
function syncState(){if(pendN>0)setSync('Salvataggio…','warn');else setSync('Sincronizzato','ok');}
function queue(path,fn){
  pend[path]=(pend[path]||0)+1;pendN++;syncState();
  const p=(wq[path]||Promise.resolve()).then(fn).then(()=>true,e=>{toast('Salvataggio non riuscito: '+errMsg(e),'err');return false;}).finally(()=>{pend[path]--;pendN--;syncState();});
  wq[path]=p;return p;
}
function put(path,data){
  const[coll,id]=path.split('/');
  if(!SB||!UID){toast('Non sei collegato','err');return Promise.resolve(false);}
  (CACHE[coll]=CACHE[coll]||new Map()).set(id,clone(data));emit(coll);
  return queue(path,async()=>{const{error}=await SB.from('docs').upsert({user_id:UID,coll,id,data,updated_at:new Date().toISOString()});if(error)throw error;});
}
function drop(path){
  const[coll,id]=path.split('/');
  if(!SB||!UID)return Promise.resolve(false);
  if(CACHE[coll])CACHE[coll].delete(id);emit(coll);
  return queue(path,async()=>{const{error}=await SB.from('docs').delete().eq('user_id',UID).eq('coll',coll).eq('id',id);if(error)throw error;});
}
async function loadAll(){
  const rows=[];
  for(let from=0;;from+=1000){
    const{data,error}=await SB.from('docs').select('coll,id,data').eq('user_id',UID).order('coll').order('id').range(from,from+999);
    if(error)throw error;rows.push(...data);if(data.length<1000)break;
  }
  for(const k in CACHE)CACHE[k]=new Map();
  for(const r of rows){(CACHE[r.coll]=CACHE[r.coll]||new Map()).set(r.id,r.data);}
  for(const k in CACHE)emit(k);
}
function onRealtime(pl){
  const r=pl.new&&pl.new.coll?pl.new:pl.old;if(!r||!r.coll)return;
  const path=r.coll+'/'+r.id;if(pend[path]>0)return;
  const m=CACHE[r.coll]=CACHE[r.coll]||new Map();
  if(pl.eventType==='DELETE')m.delete(r.id);else m.set(r.id,pl.new.data);
  emit(r.coll);
}
const body=o=>{const b=clone(o);delete b.id;return b;};

/* ---------- attachments (Supabase Storage) ---------- */
const BUCKET='allegati';
const URLS=new Map();const urlQ=new Set();let urlT=null;
function surl(p){if(!p)return'';const c=URLS.get(p);if(c&&c.exp>Date.now())return c.url;urlQ.add(p);clearTimeout(urlT);urlT=setTimeout(fetchUrls,40);return'';}
async function fetchUrls(){
  const ps=[...urlQ];urlQ.clear();if(!ps.length||!SB)return;
  ps.forEach(p=>URLS.set(p,{url:'',exp:Date.now()+30e3}));
  const{data,error}=await SB.storage.from(BUCKET).createSignedUrls(ps,3600);
  if(error||!data)return;let n=0;
  for(const d of data){if(d&&d.signedUrl&&d.path){URLS.set(d.path,{url:d.signedUrl,exp:Date.now()+3300e3});n++;}}
  if(n){renderTickets();renderWish();if(S.redraw)S.redraw();}
}
const isImg=a=>/^image\//.test(a.type||'')||/^(png|jpe?g|gif|webp|avif|bmp|svg)$/.test(extOf(a.name));
async function uploadFile(f){
  if(!SB||!UID)throw new Error('non sei collegato');
  if(f.size>50*1048576)throw new Error('file troppo grande (massimo 50 MB)');
  const safe=(f.name||'file').normalize('NFKD').replace(/[^\w.\-]+/g,'_').replace(/_+/g,'_').slice(-80);
  const p=`${UID}/${uid()}-${safe}`;
  const{error}=await SB.storage.from(BUCKET).upload(p,f,{contentType:f.type||'application/octet-stream',upsert:false});
  if(error)throw error;
  return{p,name:f.name,size:f.size,type:f.type||'',at:Date.now()};
}
async function downloadAtt(a){
  try{
    const{data,error}=await SB.storage.from(BUCKET).createSignedUrl(a.p,600,{download:a.name});if(error)throw error;
    const l=document.createElement('a');l.href=data.signedUrl;l.download=a.name;l.rel='noopener';document.body.append(l);l.click();l.remove();
  }catch(e){toast('Download non riuscito: '+errMsg(e),'err');}
}
async function openAtt(a){
  const w=window.open('','_blank');
  try{const{data,error}=await SB.storage.from(BUCKET).createSignedUrl(a.p,3600);if(error)throw error;if(w)w.location.href=data.signedUrl;else location.href=data.signedUrl;}
  catch(e){if(w)w.close();toast('Apertura non riuscita: '+errMsg(e),'err');}
}
function removeStored(paths){paths=paths.filter(Boolean);if(paths.length&&SB)SB.storage.from(BUCKET).remove(paths).catch(()=>{});}
const allAtt=()=>S.tickets.flatMap(t=>t.att||[]);
function attChips(list){
  if(!list||!list.length)return'';
  const imgs=list.filter(isImg),rest=list.filter(a=>!isImg(a));
  return(imgs.length?`<div class="thumbs">${imgs.map(a=>{const u=surl(a.p);return`<button class="file" style="padding:0;border:0;background:none" data-open="${esc(a.p)}" data-stop title="${esc(a.name)}">${u?`<img src="${esc(u)}" alt="${esc(a.name)}" loading="lazy">`:'<span class="ph"></span>'}</button>`;}).join('')}</div>`:'')
    +(rest.length?`<div class="files">${rest.map(a=>`<button class="file" data-open="${esc(a.p)}" data-stop title="Apri ${esc(a.name)}">${ico('clip')}${esc(a.name)}</button>`).join('')}</div>`:'');
}
function attRows(list,editable){
  if(!list.length)return'<p class="mut small" style="margin:0">Nessun allegato.</p>';
  return list.map((a,i)=>{const u=isImg(a)?surl(a.p):'';return`<div class="att">${isImg(a)&&u?`<img src="${esc(u)}" alt="">`:`<span class="ext">${esc(extOf(a.name))}</span>`}
    <div class="an"><b>${esc(a.name)}</b><small>${[fmtSize(a.size),a.at?fmtDate(a.at):''].filter(Boolean).join(' · ')}</small></div>
    <div class="aa"><button class="btn sm ghost" data-op="${i}" type="button">Apri</button><button class="btn sm ghost" data-dl="${i}" type="button">Scarica</button>${editable?`<button class="btn sm danger" data-rm="${i}" type="button">Rimuovi</button>`:''}</div></div>`;}).join('');
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-open]');if(!b)return;e.stopPropagation();const a=allAtt().find(x=>x.p===b.dataset.open);if(a)openAtt(a);},true);

/* ---------- categories manager ---------- */
function catManager(key){
  const title=key==='tcats'?'Macrocategorie dei ticket':key==='wcats'?'Categorie della wishlist':key==='dcats'?'Macrocategorie del Diary':'Categorie e budget delle spese';const sc=key==='scats';
  const orig=cfg()[key].map(c=>c.n);let list=clone(cfg()[key]);
  const draw=()=>{$('#cm-list').innerHTML=list.map((c,i)=>`<div class="catrow"><input type="color" value="${esc(c.c)}" data-i="${i}" data-k="c" aria-label="Colore"><input value="${esc(c.n)}" data-i="${i}" data-k="n" maxlength="40" aria-label="Nome">${sc?`<input value="${c.b!=null&&c.b!==''?esc(String(c.b).replace('.',',')):''}" data-i="${i}" data-k="b" inputmode="decimal" placeholder="Budget €/mese" aria-label="Budget mensile" style="max-width:150px">`:''}<button class="btn sm danger" data-del="${i}" aria-label="Elimina" type="button">×</button></div>`).join('');};
  openModal(`<div class="mh"><h2>${title}</h2><button class="x" data-close aria-label="Chiudi">×</button></div>
    ${sc?`<label class="f" style="margin-bottom:14px"><span>Budget mensile totale (se lo lasci vuoto è la somma dei budget delle categorie)</span><input id="cm-tot" inputmode="decimal" value="${cfg().sbudget?esc(String(cfg().sbudget).replace('.',',')):''}" placeholder="Es. 1200"></label>`:''}
    <div id="cm-list"></div><button class="btn ghost" id="cm-add" type="button">${ico('plus')}Aggiungi categoria</button>
    <p class="mut small">Rinominando una categoria, tutti gli elementi che la usano vengono aggiornati.</p>
    <div class="mf"><span class="sp"></span><button class="btn ghost" data-close>Annulla</button><button class="btn pri" id="cm-save">Salva</button></div>`);
  draw();
  $('#cm-list').addEventListener('input',e=>{const i=e.target.dataset.i;if(i!==undefined)list[+i][e.target.dataset.k]=e.target.value;});
  $('#cm-list').addEventListener('click',e=>{const d=e.target.closest('[data-del]');if(d){list.splice(+d.dataset.del,1);orig.splice(+d.dataset.del,1);draw();}});
  $('#cm-add').onclick=()=>{list.push({n:'Nuova categoria',c:'#9a9aa3'});orig.push('');draw();};
  $('#cm-save').onclick=async()=>{
    list=list.map(c=>{const o={n:c.n.trim(),c:c.c};if(sc){const b=numIn(c.b);if(b)o.b=Math.abs(b);}return o;}).filter(c=>c.n);
    const names=new Set();for(const c of list){if(names.has(c.n)){toast('Due categorie hanno lo stesso nome','err');return;}names.add(c.n);}
    const ren={};orig.forEach((o,i)=>{if(o&&list[i]&&list[i].n!==o)ren[o]=list[i].n;});
    const next={...(S.cfg||{}),...cfg(),[key]:list};if(sc){const t=numIn($('#cm-tot').value);next.sbudget=t?Math.abs(t):null;}closeModal();
    await put('config/main',next);
    const targets=key==='tcats'?[['tickets',S.tickets]]:key==='wcats'?[['wishlist',S.wish]]:key==='dcats'?[['diary',S.diary]]:[['spese',S.spese],['abbonamenti',S.abb]];
    for(const[coll,arr]of targets)for(const it of arr){if(ren[it.cat]){const b=body(it);b.cat=ren[it.cat];await put(coll+'/'+it.id,b);}}
    toast('Categorie salvate','ok');
  };
}

/* ================= TICKETS ================= */
function daysTo(due){if(!due)return null;const d=new Date(due+'T00:00:00');const t=new Date();t.setHours(0,0,0,0);return Math.round((d-t)/864e5);}
function relDays(n){return n===0?'oggi':n===1?'domani':n>1?`tra ${n} giorni`:n===-1?'scaduto ieri':`scaduto da ${-n} giorni`;}
function countdown(t){
  if(t.status==='fatto')return`<div class="cd ok"><b>✓</b><small>fatto</small></div>`;
  const n=daysTo(t.due);if(n===null)return'';
  if(n<0)return`<div class="cd late"><b>${-n}g</b><small>scaduto</small></div>`;
  if(n===0)return`<div class="cd late"><b>Oggi</b><small>scadenza</small></div>`;
  return`<div class="cd${n<=3?' soon':''}"><b>${n}g</b><small>${n===1?'domani':'mancanti'}</small></div>`;
}
function tFiltered(){
  const f=S.tf;let a=S.tickets.slice();
  if(f.status==='attivi')a=a.filter(t=>t.status!=='fatto');else if(f.status==='fatto')a=a.filter(t=>t.status==='fatto');
  if(f.cat)a=a.filter(t=>t.cat===f.cat);
  if(+f.urg)a=a.filter(t=>(t.urg||2)===+f.urg);
  if(f.late)a=a.filter(t=>t.status!=='fatto'&&t.due&&daysTo(t.due)<0);
  if(f.soon)a=a.filter(t=>t.status!=='fatto'&&t.due&&daysTo(t.due)>=0&&daysTo(t.due)<=7);
  if(f.q){const q=f.q.toLowerCase();a=a.filter(t=>[t.title,t.desc,t.cat,'#'+t.num,...(t.notes||[]).map(n=>n.x),...(t.att||[]).map(x=>x.name)].join(' ').toLowerCase().includes(q));}
  const due=t=>t.due?Date.parse(t.due):9e15;
  const cmp={due:(x,y)=>due(x)-due(y)||(y.urg||2)-(x.urg||2),urg:(x,y)=>(y.urg||2)-(x.urg||2)||due(x)-due(y),new:(x,y)=>(y.created||0)-(x.created||0),upd:(x,y)=>(y.upd||0)-(x.upd||0)};
  if(f.status==='fatto'&&f.sort==='due')a.sort((x,y)=>(y.doneAt||0)-(x.doneAt||0));else a.sort(cmp[f.sort]||cmp.due);
  return a;
}
function tCard(t){
  const ul=t.urg||2,u=URG[ul],c=catOf('tcats',t.cat),done=t.status==='fatto';
  const notes=t.notes||[],last=notes[notes.length-1],n=daysTo(t.due);
  return`<article class="tk${done?' done':''}" style="--u:${u.c}" data-id="${esc(t.id)}" tabindex="0">
    <div class="tk-h"><div class="tk-tags"><span class="pill">${um(ul)}${u.n}</span>${t.cat?`<span class="chip" style="--c:${esc(c?c.c:'#9a9aa3')}">${esc(t.cat)}</span>`:''}<span class="st ${esc(t.status)}">${STAT[t.status]||'Aperto'}</span>${t.rep&&REP[t.rep]?`<span class="st rep" title="Si ripete ${REP[t.rep]}">↻ ${REP[t.rep]}</span>`:''}</div>${countdown(t)}</div>
    <h3>${esc(t.title||'Senza titolo')}</h3>
    ${t.desc?`<p class="desc">${esc(t.desc)}</p>`:''}
    <dl class="meta">
      <div><dt>Scadenza</dt><dd class="${!done&&n!==null?(n<0?'late':n<=3?'soon':''):''}">${t.due?fmtDate(t.due):'Nessuna'}${!done&&n!==null?`<br><span style="font-weight:400">${relDays(n)}</span>`:''}</dd></div>
      <div><dt>Aperto il</dt><dd>${fmtDate(t.created)}<br><span class="mut" style="font-weight:400">#${esc(t.num||'')}</span></dd></div>
      ${done?`<div><dt>Completato</dt><dd>${fmtDate(t.doneAt)}</dd></div>`:`<div><dt>Allegati</dt><dd>${(t.att||[]).length||'Nessuno'}</dd></div>`}
    </dl>
    ${attChips(t.att)}
    ${last?`<div class="lastnote"><time>${fmtTime(last.t)}${notes.length>1?` · ${notes.length} aggiornamenti`:''}</time>${esc(last.x)}</div>`:''}
    <div class="tk-f"><button class="btn sm ghost" data-act="open">Apri</button>${!done&&n!==null&&n<=0?'<button class="btn sm ghost" data-act="snooze" title="Sposta la scadenza a domani">→ Domani</button>':''}<button class="btn sm ${done?'ghost':'ok'}" data-act="toggle">${done?'Riapri':'✓ Completa'}</button></div>
  </article>`;
}
function renderTickets(){
  const sel=$('#t-cat');const cv=S.tf.cat;
  sel.innerHTML='<option value="">Tutte le categorie</option>'+cfg().tcats.map(c=>`<option ${c.n===cv?'selected':''}>${esc(c.n)}</option>`).join('');
  const act=S.tickets.filter(t=>t.status!=='fatto');
  const crit=act.filter(t=>(t.urg||2)===4).length,late=act.filter(t=>t.due&&daysTo(t.due)<0).length,soon=act.filter(t=>t.due&&daysTo(t.due)>=0&&daysTo(t.due)<=7).length;
  const f=S.tf;
  $('#t-stats').innerHTML=[
    ['all',act.length,'Ticket attivi','#fff',f.status==='attivi'&&!+f.urg&&!f.late&&!f.soon],
    ['crit',crit,'Critici','var(--u4)',+f.urg===4],
    ['late',late,'Scaduti','var(--u4)',f.late],
    ['soon',soon,'In scadenza (7 giorni)','var(--u3)',f.soon],
    ['done',S.tickets.length-act.length,'Completati','var(--fn)',f.status==='fatto'&&!+f.urg]
  ].map(([k,n,l,c,on])=>`<button class="stat${on?' on':''}" data-st="${k}" style="--c:${c}"><b>${n}</b><span>${l}</span></button>`).join('');
  if(!S.loaded.t)return;
  const next=act.filter(t=>t.due).sort((a,b)=>Date.parse(a.due)-Date.parse(b.due))[0];
  $('#t-sum').innerHTML=!S.tickets.length?'Qui tieni traccia di tutto ciò che devi fare, con urgenza, scadenze e allegati.':
    act.length?`Hai <b>${act.length} ${plural(act.length,'ticket attivo','ticket attivi')}</b>${crit?`, ${crit} ${plural(crit,'critico','critici')}`:''}${late?` e ${late} ${plural(late,'scaduto','scaduti')}`:''}.${next?` Il prossimo è <b>${esc(next.title)}</b>, ${relDays(daysTo(next.due))}.`:''}`:'Nessun ticket aperto. Tutto fatto!';
  const g=$('#t-grid');const list=tFiltered();
  if(!list.length){
    g.innerHTML=S.tickets.length?`<div class="empty">${ico('search')}<b>Nessun ticket con questi filtri</b>Cambia i filtri qui sopra per vedere gli altri.</div>`:`<div class="empty">${ico('ticket')}<b>Nessun ticket, per ora</b>Premi “Nuovo ticket” per aprire il primo: titolo, macrocategoria, urgenza, scadenza, descrizione e allegati.</div>`;
    return;
  }
  g.innerHTML=list.map(tCard).join('');
}
$('#t-stats').addEventListener('click',e=>{const b=e.target.closest('[data-st]');if(!b)return;const k=b.dataset.st,f=S.tf;
  f.late=false;f.soon=false;f.urg=0;
  if(k==='all')f.status='attivi';else if(k==='crit'){f.status='attivi';f.urg=4;}else if(k==='late'){f.status='attivi';f.late=true;}else if(k==='soon'){f.status='attivi';f.soon=true;}else if(k==='done')f.status='fatto';
  $('#t-urg').value=String(f.urg);$$('#t-status button').forEach(x=>x.classList.toggle('on',x.dataset.v===f.status));renderTickets();});
$('#t-status').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;S.tf.status=b.dataset.v;S.tf.late=S.tf.soon=false;$$('#t-status button').forEach(x=>x.classList.toggle('on',x===b));renderTickets();});
$('#t-q').addEventListener('input',e=>{S.tf.q=e.target.value.trim();renderTickets();});
$('#t-cat').addEventListener('change',e=>{S.tf.cat=e.target.value;renderTickets();});
$('#t-urg').addEventListener('change',e=>{S.tf.urg=+e.target.value;renderTickets();});
$('#t-sort').addEventListener('change',e=>{S.tf.sort=e.target.value;try{localStorage.setItem('capri-tsort',S.tf.sort);}catch(err){}renderTickets();});
try{const v=localStorage.getItem('capri-tsort');if(v){S.tf.sort=v;$('#t-sort').value=v;}}catch(e){}
$('#t-new').onclick=()=>ticketModal(null);
$('#t-cats').onclick=()=>catManager('tcats');
$('#t-grid').addEventListener('click',e=>{
  if(e.target.closest('[data-stop]'))return;
  const card=e.target.closest('.tk');if(!card)return;const t=S.tickets.find(x=>x.id===card.dataset.id);if(!t)return;
  const act=e.target.closest('[data-act]');
  if(act&&act.dataset.act==='toggle'){toggleDone(t);return;}
  if(act&&act.dataset.act==='snooze'){snooze(t,1);return;}
  ticketModal(t);
});
$('#t-grid').addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.classList.contains('tk')){const t=S.tickets.find(x=>x.id===e.target.dataset.id);if(t)ticketModal(t);}});
async function snooze(t,days){
  const d=new Date();d.setDate(d.getDate()+days);const due=isoDay(d);const b=body(t);
  b.notes=(b.notes||[]).concat({t:Date.now(),x:`Scadenza spostata: ${fmtDate(t.due)} → ${fmtDate(due)}`});b.due=due;b.upd=Date.now();
  if(await put('tickets/'+t.id,b))toast(`#${t.num} spostato a ${days===1?'domani':fmtDate(due)}`,'ok');
}
/* Ticket ricorrenti: completandone uno, se "si ripete", nasce il prossimo con la nuova scadenza */
const REP={g1:'ogni giorno',s1:'ogni settimana',s2:'ogni 2 settimane',m1:'ogni mese',m3:'ogni 3 mesi',m6:'ogni 6 mesi',a1:'ogni anno'};
function nextDue(rep,from){const u=rep[0],n=+rep.slice(1)||1,today=isoDay();let d=addPeriod(from||today,n,u);for(let i=0;d<today&&i<500;i++)d=addPeriod(d,n,u);return d;}
async function spawnNext(b){
  if(!b.rep||!REP[b.rep]||b.repSpawned)return null;
  b.repSpawned=true;const now=Date.now(),num=Math.max(0,...S.tickets.map(x=>+x.num||0))+1,id=uid(),due=nextDue(b.rep,b.due);
  const n={title:b.title,cat:b.cat||'',urg:b.urg||2,status:'aperto',due,desc:b.desc||'',att:[],rep:b.rep,
    notes:[{t:now,x:`Ricreato dal ticket #${b.num} (si ripete ${REP[b.rep]}).`}],created:now,upd:now,num};
  await put('tickets/'+id,n);return{num,due};
}
async function toggleDone(t){
  const b=body(t);const done=t.status!=='fatto';
  b.status=done?'fatto':'aperto';b.upd=Date.now();if(done)b.doneAt=Date.now();else delete b.doneAt;
  b.notes=(b.notes||[]).concat({t:Date.now(),x:done?'Ticket completato.':'Ticket riaperto.'});
  const nx=done?await spawnNext(b):null;
  if(await put('tickets/'+t.id,b))toast(done?`#${t.num} completato`+(nx?` · il prossimo (#${nx.num}) scade il ${fmtDate(nx.due)}`:''):`#${t.num} riaperto`,'ok');
}
function persistTicketPart(id,part){
  const base=S.tickets.find(t=>t.id===id);if(!base)return Promise.resolve(false);
  return put('tickets/'+id,{...body(base),...clone(part),upd:Date.now()});
}
function ticketModal(t){
  const isNew=!t;
  const d=t?clone(t):{id:uid(),title:'',cat:null,urg:2,status:'aperto',due:'',desc:'',att:[],notes:[],created:Date.now()};
  d.att=d.att||[];d.notes=d.notes||[];
  const ed={busy:0};
  const cats=cfg().tcats.slice();if(d.cat&&!cats.some(c=>c.n===d.cat))cats.push({n:d.cat,c:'#9a9aa3'});
  openModal(`<div class="mh">${isNew?'':`<span class="mut">#${esc(d.num)}</span>`}<h2>${isNew?'Nuovo ticket':'Ticket'}</h2><button class="x" data-close aria-label="Chiudi">×</button></div>
  <form class="form" id="tf" autocomplete="off">
    <label class="f full"><span>Titolo</span><input name="title" maxlength="200" value="${esc(d.title)}" autofocus required></label>
    <div class="f full"><span>Urgenza</span><div class="pick">${[1,2,3,4].map(u=>`<label style="--u:${URG[u].c}"><input type="radio" name="urg" value="${u}" ${(d.urg||2)===u?'checked':''}><b>${um(u)}${URG[u].n}</b></label>`).join('')}</div></div>
    <div class="f full"><span>Macrocategoria${isNew?' <em class="req">scegline una</em>':''}</span><div class="chips" id="t-cat-pick">${cats.map(c=>`<label style="--c:${esc(c.c)}"><input type="radio" name="cat" value="${esc(c.n)}" ${c.n===d.cat?'checked':''}><b>${esc(c.n)}</b></label>`).join('')}<label style="--c:#6f6f7a"><input type="radio" name="cat" value="" ${!isNew&&!d.cat?'checked':''}><b>Nessuna</b></label></div></div>
    <label class="f"><span>Stato</span><select name="status">${Object.entries(STAT).map(([k,v])=>`<option value="${k}" ${d.status===k?'selected':''}>${v}</option>`).join('')}</select></label>
    <label class="f"><span>Scadenza</span><input type="date" name="due" value="${esc(d.due||'')}"></label>
    <label class="f"><span>Si ripete</span><select name="rep"><option value="">Mai</option>${Object.entries(REP).map(([k,v])=>`<option value="${k}" ${d.rep===k?'selected':''}>${v[0].toUpperCase()+v.slice(1)}</option>`).join('')}</select></label>
    <div class="f full"><span>Scadenza rapida</span><div class="snz" id="t-snz"><button type="button" data-sz="0">Oggi</button><button type="button" data-sz="1">Domani</button><button type="button" data-sz="3">+3 giorni</button><button type="button" data-sz="7">+1 settimana</button><button type="button" data-sz="30">+1 mese</button><button type="button" data-sz="x">Nessuna</button></div></div>
    <label class="f full"><span>Descrizione</span><textarea name="desc" rows="7" placeholder="Tutti i dettagli: contesto, cosa serve, contatti, riferimenti…">${esc(d.desc)}</textarea></label>
  </form>
  <div class="sec"><div class="sh"><h3>Allegati</h3><label class="btn ghost sm">${ico('clip')}<input type="file" multiple hidden id="t-file">Allega file</label></div>
    <div class="drop" id="t-drop">Trascina qui i file: PDF, foto, documenti, fogli di calcolo, archivi (fino a 50 MB l'uno)</div>
    <div class="attlist" id="t-att"></div></div>
  <div class="sec"><h3>Aggiornamenti</h3><div class="note-add" style="margin-top:10px"><textarea id="t-note" rows="2" placeholder="Scrivi un aggiornamento, una telefonata fatta, un passo successivo…"></textarea><button class="btn" id="t-addnote" type="button">Aggiungi</button></div><ol class="notes" id="t-notes"></ol></div>
  <div class="mf">${isNew?'':'<button class="btn danger" id="t-del" type="button">Elimina ticket</button>'}<span class="sp"></span><button class="btn ghost" data-close type="button">Annulla</button><button class="btn pri" id="t-save" type="button">${isNew?'Crea ticket':'Salva modifiche'}</button></div>`,{wide:true});
  const drawAtt=()=>{const el=$('#t-att');if(!el)return;el.innerHTML=attRows(d.att,true)+(ed.busy?`<p class="mut small" style="margin:0">Caricamento di ${ed.busy} file…</p>`:'');};
  const drawNotes=()=>{const el=$('#t-notes');if(!el)return;el.innerHTML=d.notes.length?d.notes.map((n,i)=>({n,i})).reverse().map(({n,i})=>`<li><time>${fmtTime(n.t)}</time>${esc(n.x)}<button class="btn sm ghost" data-nrm="${i}" aria-label="Elimina aggiornamento" type="button">×</button></li>`).join(''):'<li class="mut small">Ancora nessun aggiornamento.</li>';};
  drawAtt();drawNotes();S.redraw=drawAtt;
  $('#t-snz').addEventListener('click',e=>{const b=e.target.closest('[data-sz]');if(!b)return;const inp=$('#tf [name=due]');if(b.dataset.sz==='x'){inp.value='';return;}const base=new Date();base.setDate(base.getDate()+(+b.dataset.sz));inp.value=isoDay(base);});
  const read=()=>{const fd=new FormData($('#tf'));d.title=String(fd.get('title')||'').trim();d.urg=+fd.get('urg')||2;d.cat=fd.get('cat')===null?null:String(fd.get('cat'));d.status=String(fd.get('status')||'aperto');d.due=String(fd.get('due')||'');d.desc=String(fd.get('desc')||'');d.rep=String(fd.get('rep')||'');if(!d.rep)delete d.rep;};
  async function addFiles(files){
    files=[...files];if(!files.length)return;
    ed.busy+=files.length;drawAtt();
    for(const f of files){
      try{const a=await uploadFile(f);d.att.push(a);if(!isNew)await persistTicketPart(d.id,{att:d.att});}
      catch(e){toast(f.name+': '+errMsg(e),'err');}
      ed.busy--;drawAtt();
    }
  }
  $('#t-file').onchange=e=>{addFiles(e.target.files);e.target.value='';};
  const dz=$('#t-drop');
  dz.addEventListener('dragover',e=>{e.preventDefault();dz.classList.add('over');});dz.addEventListener('dragleave',()=>dz.classList.remove('over'));dz.addEventListener('drop',e=>{e.preventDefault();dz.classList.remove('over');addFiles(e.dataTransfer.files);});
  $('#t-att').addEventListener('click',async e=>{
    const op=e.target.closest('[data-op]');if(op){openAtt(d.att[+op.dataset.op]);return;}
    const dl=e.target.closest('[data-dl]');if(dl){downloadAtt(d.att[+dl.dataset.dl]);return;}
    const rm=e.target.closest('[data-rm]');if(rm){if(!armed(rm))return;const a=d.att[+rm.dataset.rm];d.att.splice(+rm.dataset.rm,1);drawAtt();
      if(!isNew)await persistTicketPart(d.id,{att:d.att});removeStored([a.p]);}
  });
  $('#t-addnote').onclick=async()=>{const x=$('#t-note').value.trim();if(!x)return;d.notes.push({t:Date.now(),x});$('#t-note').value='';drawNotes();if(!isNew)await persistTicketPart(d.id,{notes:d.notes});};
  $('#t-notes').addEventListener('click',async e=>{const b=e.target.closest('[data-nrm]');if(!b)return;if(!armed(b,'Elimina'))return;d.notes.splice(+b.dataset.nrm,1);drawNotes();if(!isNew)await persistTicketPart(d.id,{notes:d.notes});});
  $('#t-save').onclick=async()=>{
    read();if(!d.title){toast('Il ticket ha bisogno di un titolo','err');$('#tf [name=title]').focus();return;}
    if(d.cat===null){toast('Scegli la macrocategoria (o “Nessuna”)','err');const p=$('#t-cat-pick');p.classList.add('need');p.scrollIntoView({block:'center',behavior:'smooth'});setTimeout(()=>p.classList.remove('need'),1600);return;}
    if(ed.busy){toast('Attendi la fine del caricamento degli allegati','err');return;}
    const b=body(d);
    if(isNew)b.num=Math.max(0,...S.tickets.map(x=>+x.num||0))+1;
    const prev=S.tickets.find(x=>x.id===d.id);
    if(b.status==='fatto'&&!b.doneAt)b.doneAt=Date.now();
    if(b.status!=='fatto')delete b.doneAt;
    if(b.rep&&!b.due&&isNew)b.due=isoDay();
    const nx=b.status==='fatto'&&(!prev||prev.status!=='fatto')?await spawnNext(b):null;
    if(nx)setTimeout(()=>toast(`Il prossimo (#${nx.num}) scade il ${fmtDate(nx.due)}`,'ok'),300);
    if(prev&&prev.status!==b.status)b.notes=(b.notes||[]).concat({t:Date.now(),x:`Stato: ${STAT[prev.status]||'Aperto'} → ${STAT[b.status]}`});
    b.upd=Date.now();
    closeModal();
    if(await put('tickets/'+d.id,b))toast(isNew?`Ticket #${b.num} creato`:'Ticket salvato','ok');
  };
  const del=$('#t-del');
  if(del)del.onclick=async()=>{if(!armed(del,'Conferma eliminazione'))return;const att=d.att.map(a=>a.p);closeModal();if(await drop('tickets/'+d.id)){toast('Ticket eliminato','ok');removeStored(att);}};
}

/* ================= WISHLIST ================= */
const priceOf=w=>typeof w.price==='number'?w.price:((w.hist||[]).length?w.hist[w.hist.length-1].p:null);
function wDelta(w){const h=w.hist||[];if(h.length<2)return null;const a=h[h.length-2].p,b=h[h.length-1].p;return a?(b-a)/a:null;}
let sparkN=0;
function spark(h){
  if(!h||h.length<2)return'';
  const ps=h.map(x=>x.p),mn=Math.min(...ps),mx=Math.max(...ps),rg=mx-mn||1;
  const pts=h.map((x,i)=>`${(i/(h.length-1)*100).toFixed(2)},${(44-(x.p-mn)/rg*36).toFixed(2)}`).join(' ');
  const dn=ps[ps.length-1]<ps[0],up=ps[ps.length-1]>ps[0],col=dn?'var(--u1)':up?'var(--u4)':'var(--wl)',id='sg'+(++sparkN);
  return`<svg class="spark" viewBox="0 0 100 48" preserveAspectRatio="none" aria-label="Andamento del prezzo" style="color:${col}"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity=".35"/><stop offset="1" stop-color="currentColor" stop-opacity="0"/></linearGradient></defs><polygon points="0,48 ${pts} 100,48" fill="url(#${id})"/><polyline points="${pts}" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg>`;
}
const host=u=>{try{return new URL(u).hostname.replace(/^www\./,'');}catch(e){return u;}};
function wFiltered(){
  const f=S.wf;let a=S.wish.slice();
  if(f.status!=='tutti')a=a.filter(w=>(w.status||'voglio')===f.status);
  if(f.cat)a=a.filter(w=>w.cat===f.cat);
  if(f.q){const q=f.q.toLowerCase();a=a.filter(w=>[w.name,w.cat,w.note,w.deck,...(w.links||[])].join(' ').toLowerCase().includes(q));}
  const P=w=>priceOf(w)??-1;
  const cmp={prio:(x,y)=>(x.prio||2)-(y.prio||2)||(y.created||0)-(x.created||0),pd:(x,y)=>P(y)*(y.qty||1)-P(x)*(x.qty||1),pa:(x,y)=>(P(x)<0?9e15:P(x)*(x.qty||1))-(P(y)<0?9e15:P(y)*(y.qty||1)),var:(x,y)=>(wDelta(x)??0)-(wDelta(y)??0),new:(x,y)=>(y.created||0)-(x.created||0)};
  a.sort(cmp[f.sort]||cmp.prio);return a;
}
function wCard(w){
  const c=catOf('wcats',w.cat),col=c?c.c:'#9a9aa3',h=w.hist||[],last=h[h.length-1];
  const p=priceOf(w),qty=w.qty||1,dl=wDelta(w),got=w.status==='preso';
  const under=!got&&w.target&&p!=null&&p<=w.target;
  const initials=String(w.name||'?').split(/\s+/).filter(Boolean).slice(0,2).map(s=>s[0]).join('').toUpperCase();
  const pr=PRIO[w.prio||2],img=w.img?surl(w.img):'';
  const goal=!got&&w.target&&p!=null?Math.min(100,w.target/p*100):null;
  return`<article class="wi${got?' preso':''}" style="--c:${esc(col)}" data-id="${esc(w.id)}">
    <div class="wimg" data-act="edit">${img?`<img src="${esc(img)}" alt="" loading="lazy">`:`<span class="ini">${esc(initials)}</span>`}<span class="prio p${w.prio||2}">Priorità ${pr.n.toLowerCase()}</span>${got?'<span class="gotbadge">Preso</span>':w.mtg?'<span class="autob">Prezzo automatico</span>':''}</div>
    <div class="wb">
      <div class="wtop">${w.cat?`<span class="chip" style="--c:${esc(col)}">${esc(w.cat)}</span>`:''}${under?'<span class="badge">Sotto obiettivo</span>':''}</div>
      <h3>${esc(w.name||'Senza nome')}</h3>
      ${got?`<div class="wprice"><b>${eur(w.paid)}</b><small>pagato${w.gotAt?' il '+fmtDate(w.gotAt):''}</small></div>`:
      `<div class="wprice"><b>${p!=null?eur(p):'—'}</b>${dl!==null?`<span class="delta ${dl<0?'down':dl>0?'up':'flat'}">${dl<0?'▼':dl>0?'▲':'='} ${Math.abs(dl*100).toFixed(1).replace('.',',')}%</span>`:''}${qty>1&&p!=null?`<small>× ${qty} = ${eur(p*qty)}</small>`:''}</div>`}
      ${got?'':spark(h)}
      ${goal!==null?`<div class="goal"><div class="goal-bar"><i style="width:${goal.toFixed(1)}%"></i></div><span>Obiettivo ${eur(w.target)} · ${p<=w.target?'raggiunto':'mancano '+eur(p-w.target)}</span></div>`:''}
      <div class="wmeta">${last?`Prezzo del ${fmtDate(last.d)} · ${last.s==='auto'?(last.src||'automatico'):'inserito a mano'}`:(got?'':'Prezzo non ancora registrato')}</div>
      ${w.pnote&&!got?`<div class="wmeta">${esc(w.pnote)}</div>`:''}
      ${w.note?`<div class="wnote">${esc(w.note)}</div>`:''}
      ${(w.links||[]).length?`<div class="files">${w.links.map(u=>`<a class="file" href="${esc(safeUrl(u))}" target="_blank" rel="noopener">${esc(host(u))}</a>`).join('')}</div>`:''}
      <div class="wf">${got?'':`<button class="btn sm ghost" data-act="price">${w.mtg?ico('refresh'):''}Prezzo</button>`}<button class="btn sm ghost" data-act="edit">Modifica</button><button class="btn sm ${got?'ghost':'ok'}" data-act="got">${got?'Rimetti':'Preso!'}</button></div>
    </div></article>`;
}
function renderWish(){
  sparkN=0;
  const sel=$('#w-cat'),cv=S.wf.cat;
  sel.innerHTML='<option value="">Tutte le categorie</option>'+cfg().wcats.map(c=>`<option ${c.n===cv?'selected':''}>${esc(c.n)}</option>`).join('');
  const want=S.wish.filter(w=>(w.status||'voglio')==='voglio'),got=S.wish.filter(w=>w.status==='preso');
  const tot=want.reduce((s,w)=>s+(priceOf(w)||0)*(w.qty||1),0);
  const under=want.filter(w=>w.target&&priceOf(w)!=null&&priceOf(w)<=w.target).length;
  const down=want.filter(w=>(wDelta(w)??0)<0).length;
  const spent=got.reduce((s,w)=>s+(+w.paid||0),0);
  $('#w-stats').innerHTML=[[eur(tot),'Valore della wishlist','var(--wl)'],[want.length,'Desideri attivi','#fff'],[under,'Sotto il prezzo obiettivo','var(--u1)'],[down,'Prezzi in calo','var(--u1)'],[eur(spent),'Speso per i desideri presi','var(--mut)']]
    .map(([n,l,c])=>`<div class="stat static" style="--c:${c}"><b>${n}</b><span>${l}</span></div>`).join('');
  $('#w-refresh').hidden=!want.some(w=>w.mtg);
  if(!S.loaded.w)return;
  $('#w-sum').innerHTML=want.length?`<b>${want.length} ${plural(want.length,'desiderio','desideri')}</b> per un valore di <b>${eur(tot)}</b>.${under?` ${under} ${plural(under,'è sotto','sono sotto')} il prezzo obiettivo.`:''} Le carte e i mazzi Magic si aggiornano da soli con i prezzi Cardmarket via Scryfall.`:'Aggiungi quello che vuoi comprare: Capri ne segue il prezzo nel tempo. Carte e mazzi Magic si aggiornano da soli.';
  const g=$('#w-grid');const list=wFiltered();
  if(!list.length){g.innerHTML=S.wish.length?`<div class="empty">${ico('search')}<b>Niente con questi filtri</b>Cambia i filtri qui sopra.</div>`:`<div class="empty">${ico('star')}<b>La wishlist è vuota</b>Aggiungi un desiderio con il suo link: una carta Magic, un mazzo, un gadget.</div>`;return;}
  g.innerHTML=list.map(wCard).join('');
}
$('#w-status').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;S.wf.status=b.dataset.v;$$('#w-status button').forEach(x=>x.classList.toggle('on',x===b));renderWish();});
$('#w-q').addEventListener('input',e=>{S.wf.q=e.target.value.trim();renderWish();});
$('#w-cat').addEventListener('change',e=>{S.wf.cat=e.target.value;renderWish();});
$('#w-sort').addEventListener('change',e=>{S.wf.sort=e.target.value;try{localStorage.setItem('capri-wsort',S.wf.sort);}catch(err){}renderWish();});
try{const v=localStorage.getItem('capri-wsort');if(v){S.wf.sort=v;$('#w-sort').value=v;}}catch(e){}
$('#w-new').onclick=()=>wishModal(null);
$('#w-cats').onclick=()=>catManager('wcats');
$('#w-refresh').onclick=()=>autoPrices(true);
$('#w-grid').addEventListener('click',e=>{
  if(e.target.closest('a'))return;
  const card=e.target.closest('.wi');if(!card)return;const w=S.wish.find(x=>x.id===card.dataset.id);if(!w)return;
  const act=e.target.closest('[data-act]');if(!act)return;
  if(act.dataset.act==='got')gotModal(w);else if(act.dataset.act==='price')priceModal(w);else wishModal(w);
});
/* --- Scryfall (Magic prices) --- */
const SF='https://api.scryfall.com';
let sfLast=0;
async function sfFetch(url,opt={}){const wait=Math.max(0,sfLast+120-Date.now());if(wait)await sleep(wait);sfLast=Date.now();
  const r=await fetch(url,{...opt,headers:{Accept:'application/json',...(opt.headers||{})}});let j=null;try{j=await r.json();}catch(e){}
  if(!r.ok)throw new Error((j&&j.details)||'Scryfall non risponde ('+r.status+')');return j;}
async function sfCard(w){
  const link=(w.links||[]).map(u=>u.match(/scryfall\.com\/card\/([^/]+)\/([^/?#]+)/)).find(Boolean);
  let url;
  if(link)url=`${SF}/cards/${link[1]}/${encodeURIComponent(decodeURIComponent(link[2]))}`;
  else{const q=new URLSearchParams({fuzzy:w.sfname||w.name});if(w.sfset)q.set('set',w.sfset.toLowerCase());url=`${SF}/cards/named?${q}`;}
  const j=await sfFetch(url);
  const pr=j.prices||{};const v=w.foil?pr.eur_foil:(pr.eur??pr.eur_foil);
  if(v==null)throw new Error('nessun prezzo in euro per questa stampa');
  return{p:Math.round(+v*100)/100,src:'Cardmarket (Scryfall)',note:`${j.name} · ${j.set_name}${w.foil?' · foil':''}`};
}
function parseDeck(txt){
  const out=new Map();
  for(let l of String(txt||'').split('\n')){
    l=l.trim();if(!l||/^(\/\/|#)/.test(l)||/^(sideboard|deck|commander|companion|maybeboard|mainboard)\s*:?\s*$/i.test(l))continue;
    let m=l.match(/^(\d+)\s*x?\s+(.+)$/i);let q=1,name=l;if(m){q=+m[1];name=m[2];}
    let set=null;const ms=name.match(/^(.*?)\s+\(([A-Za-z0-9]{2,6})\)(?:\s+\S+)?(?:\s+\*F\*)?$/);if(ms){name=ms[1];set=ms[2].toLowerCase();}
    name=name.replace(/\s+\*F\*$/,'').trim();
    const k=name.toLowerCase()+'|'+(set||'');const x=out.get(k);if(x)x.q+=q;else out.set(k,{q,name,set});
  }
  return[...out.values()];
}
async function sfDeck(w){
  const items=parseDeck(w.deck);if(!items.length)throw new Error('la lista carte è vuota');
  let tot=0,count=0;const miss=[];
  for(let i=0;i<items.length;i+=75){
    const chunk=items.slice(i,i+75);
    const j=await sfFetch(SF+'/cards/collection',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({identifiers:chunk.map(x=>x.set?{name:x.name,set:x.set}:{name:x.name})})});
    const by=new Map();for(const c of j.data||[]){by.set(c.name.toLowerCase(),c);by.set(c.name.split(' // ')[0].toLowerCase(),c);}
    for(const x of chunk){const c=by.get(x.name.toLowerCase());const v=c&&c.prices?(c.prices.eur??c.prices.eur_foil):null;count+=x.q;if(v==null)miss.push(x.name);else tot+=x.q*+v;}
  }
  return{p:Math.round(tot*100)/100,src:'Cardmarket (Scryfall)',note:`${count} carte${miss.length?` · senza prezzo: ${miss.slice(0,3).join(', ')}${miss.length>3?` e altre ${miss.length-3}`:''}`:''}`};
}
async function refreshPrice(w,quiet){
  const cur=()=>S.wish.find(x=>x.id===w.id)||w;
  try{
    const r=w.mtg==='deck'?await sfDeck(w):await sfCard(w);
    const b=body(cur());const day=isoDay();
    b.hist=(b.hist||[]).filter(h=>!(h.d===day&&h.s==='auto'));b.hist.push({d:day,p:r.p,s:'auto',src:r.src});
    b.hist.sort((a,c)=>a.d<c.d?-1:a.d>c.d?1:0);b.hist=b.hist.slice(-365);
    b.price=b.hist[b.hist.length-1].p;b.pnote=r.note;b.pupd=Date.now();
    await put('wishlist/'+w.id,b);return true;
  }catch(e){
    if(!quiet)toast(w.name+': '+errMsg(e),'err');
    const b=body(cur());b.pnote='Prezzo automatico non trovato: '+errMsg(e);b.pupd=Date.now();await put('wishlist/'+w.id,b);return false;
  }
}
let autoRan=false,autoBusy=false;
async function autoPrices(force){
  if(autoBusy)return;
  const today=isoDay();
  const list=S.wish.filter(w=>w.mtg&&(w.status||'voglio')==='voglio'&&(force||!w.pupd||isoDay(new Date(w.pupd))!==today));
  if(!list.length){if(force)toast('Nessuna carta o mazzo Magic con prezzo automatico');return;}
  autoBusy=true;const btn=$('#w-refresh');btn.disabled=true;let ok=0;
  for(const w of list){if(await refreshPrice(w,true))ok++;}
  autoBusy=false;btn.disabled=false;
  if(force||ok<list.length)toast(`Prezzi aggiornati: ${ok} su ${list.length}`,ok===list.length?'ok':'err');
}
function priceModal(w){
  const h=w.hist||[];
  openModal(`<div class="mh"><h2>Prezzo</h2><button class="x" data-close aria-label="Chiudi">×</button></div>
  <p style="margin-top:0"><b>${esc(w.name)}</b><br><span class="mut small">Ultimo prezzo: ${eur(priceOf(w))}${h.length?' del '+fmtDate(h[h.length-1].d):''}</span></p>
  ${w.mtg?`<button class="btn ok" id="p-auto" type="button" style="width:100%;margin-bottom:12px">${ico('refresh')}Aggiorna ora da Scryfall</button>`:''}
  ${(w.links||[]).length?`<div class="files" style="margin-bottom:12px">${w.links.map(u=>`<a class="file" href="${esc(safeUrl(u))}" target="_blank" rel="noopener">Controlla su ${esc(host(u))}</a>`).join('')}</div>`:''}
  <label class="f"><span>Prezzo di oggi per un pezzo (€)</span><input id="p-val" inputmode="decimal" placeholder="Es. 24,90" autofocus></label>
  <div class="mf"><span class="sp"></span><button class="btn ghost" data-close>Annulla</button><button class="btn pri" id="p-ok">Registra prezzo</button></div>`);
  const a=$('#p-auto');if(a)a.onclick=async()=>{a.disabled=true;a.textContent='Aggiornamento…';const ok=await refreshPrice(w);closeModal();if(ok)toast('Prezzo aggiornato','ok');};
  $('#p-ok').onclick=async()=>{const p=numIn($('#p-val').value);if(p===null||p<0){toast('Scrivi un prezzo valido, es. 12,50','err');return;}
    const b=body(S.wish.find(x=>x.id===w.id)||w);const day=isoDay();b.hist=(b.hist||[]).filter(x=>!(x.d===day&&x.s!=='auto'));b.hist.push({d:day,p,s:'manuale'});b.hist.sort((x,y)=>x.d<y.d?-1:x.d>y.d?1:0);b.price=b.hist[b.hist.length-1].p;
    closeModal();if(await put('wishlist/'+w.id,b))toast('Prezzo registrato','ok');};
}
function gotModal(w){
  if(w.status==='preso'){const b=body(w);b.status='voglio';delete b.paid;delete b.gotAt;put('wishlist/'+w.id,b).then(ok=>ok&&toast('Rimesso in lista','ok'));return;}
  const p=priceOf(w);
  openModal(`<div class="mh"><h2>Preso!</h2><button class="x" data-close aria-label="Chiudi">×</button></div>
  <p style="margin-top:0">${esc(w.name)}</p>
  <div class="form"><label class="f two"><span>Quanto l'hai pagato in totale (€)</span><input id="g-paid" inputmode="decimal" value="${p!=null?String(+(p*(w.qty||1)).toFixed(2)).replace('.',','):''}" autofocus></label><label class="f"><span>Data</span><input type="date" id="g-day" value="${isoDay()}"></label></div>
  <div class="mf"><span class="sp"></span><button class="btn ghost" data-close>Annulla</button><button class="btn pri" id="g-ok">Segna come preso</button></div>`);
  $('#g-ok').onclick=async()=>{const b=body(w);b.status='preso';b.paid=numIn($('#g-paid').value);b.gotAt=$('#g-day').value||isoDay();closeModal();if(await put('wishlist/'+w.id,b))toast('Segnato come preso','ok');};
}
function wishModal(w){
  const isNew=!w;
  const d=w?clone(w):{id:uid(),name:'',cat:S.wf.cat||(cfg().wcats[0]?cfg().wcats[0].n:''),prio:2,qty:1,target:null,links:[],note:'',deck:'',mtg:'',hist:[],status:'voglio',created:Date.now()};
  d.hist=d.hist||[];d.links=d.links||[];d.mtg=d.mtg||'';
  const cats=cfg().wcats.slice();if(d.cat&&!cats.some(c=>c.n===d.cat))cats.push({n:d.cat,c:'#9a9aa3'});
  const ed={busy:0};
  openModal(`<div class="mh"><h2>${isNew?'Nuovo desiderio':'Desiderio'}</h2><button class="x" data-close aria-label="Chiudi">×</button></div>
  <form class="form" id="wf" autocomplete="off">
    <label class="f full"><span>Nome</span><input name="name" maxlength="200" value="${esc(d.name)}" placeholder="Es. Ragavan, Nimble Pilferer · Mazzo Commander Atraxa · cuffie…" autofocus></label>
    <label class="f"><span>Categoria</span><select name="cat"><option value="">Nessuna</option>${cats.map(c=>`<option ${c.n===d.cat?'selected':''}>${esc(c.n)}</option>`).join('')}</select></label>
    <label class="f"><span>Quantità</span><input name="qty" type="number" min="1" step="1" value="${esc(d.qty||1)}"></label>
    <label class="f"><span>Prezzo obiettivo (€)</span><input name="target" inputmode="decimal" value="${d.target!=null?esc(String(d.target).replace('.',',')):''}" placeholder="Opzionale"></label>
    <div class="f full"><span>Priorità</span><div class="pick three">${[1,2,3].map(p=>`<label style="--u:${PRIO[p].c}"><input type="radio" name="prio" value="${p}" ${(d.prio||2)===p?'checked':''}><b>${PRIO[p].n}</b></label>`).join('')}</div></div>
    <label class="f full"><span>Link (uno per riga: negozio, Cardmarket, Scryfall, Amazon…)</span><textarea name="links" rows="3" placeholder="https://www.cardmarket.com/it/Magic/Products/…">${esc(d.links.join('\n'))}</textarea></label>
    <label class="f full"><span>Prezzo automatico Magic (prezzi Cardmarket tramite Scryfall)</span><select name="mtg" id="w-mtg"><option value="">No, lo inserisco io</option><option value="card" ${d.mtg==='card'?'selected':''}>Sì, è una carta singola</option><option value="deck" ${d.mtg==='deck'?'selected':''}>Sì, è un mazzo (somma della lista carte)</option></select></label>
    <label class="f two" data-m="card"><span>Nome della carta in inglese (se diverso dal nome sopra)</span><input name="sfname" value="${esc(d.sfname||'')}" placeholder="Es. Ragavan, Nimble Pilferer"></label>
    <label class="f" data-m="card"><span>Codice set (opzionale)</span><input name="sfset" value="${esc(d.sfset||'')}" placeholder="Es. MH2" maxlength="6"></label>
    <label class="f row full" data-m="card"><input type="checkbox" name="foil" ${d.foil?'checked':''}><span>Versione foil</span></label>
    <label class="f full" data-m="deck"><span>Lista carte, una per riga (es. “4 Lightning Bolt” oppure “1 Sol Ring (C21) 263”)</span><textarea name="deck" rows="7" placeholder="Incolla qui la lista esportata da Moxfield, Archidekt, MTGA…">${esc(d.deck||'')}</textarea></label>
    <label class="f full"><span>Note</span><textarea name="note" rows="2" placeholder="Edizione, lingua, condizioni, taglia…">${esc(d.note||'')}</textarea></label>
  </form>
  <div class="sec"><div class="sh"><h3>Storico prezzi</h3></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap"><input id="w-pr" inputmode="decimal" placeholder="Prezzo unitario di oggi (€)" style="flex:1 1 200px;width:auto"><button class="btn" id="w-addp" type="button">Registra prezzo</button></div>
    <div class="hist" id="w-hist"></div></div>
  <div class="sec"><div class="sh"><h3>Immagine</h3><label class="btn ghost sm"><input type="file" accept="image/*" hidden id="w-img">Carica immagine</label></div><div id="w-imgv"></div></div>
  <div class="mf">${isNew?'':'<button class="btn danger" id="w-del" type="button">Elimina</button>'}<span class="sp"></span><button class="btn ghost" data-close type="button">Annulla</button><button class="btn pri" id="w-save" type="button">${isNew?'Aggiungi':'Salva modifiche'}</button></div>`,{wide:true});
  const showM=()=>{const m=$('#w-mtg').value;$$('[data-m]',DLG).forEach(el=>el.hidden=el.dataset.m!==m);};showM();$('#w-mtg').onchange=showM;
  const drawHist=()=>{$('#w-hist').innerHTML=d.hist.length?d.hist.map((h,i)=>({h,i})).reverse().map(({h,i})=>`<div><span>${fmtDate(h.d)}</span><span class="mut">${h.s==='auto'?esc(h.src||'automatico'):'a mano'}</span><b>${eur(h.p)}</b><button class="btn sm ghost" data-hrm="${i}" aria-label="Elimina" type="button">×</button></div>`).join(''):'<p class="mut small" style="margin:0">Nessun prezzo registrato.</p>';};
  const drawImg=()=>{const el=$('#w-imgv');if(!el)return;const u=d.img?surl(d.img):'';el.innerHTML=ed.busy?'<p class="mut small">Caricamento…</p>':d.img?`<div class="att">${u?`<img src="${esc(u)}" alt="">`:'<span class="ext">img</span>'}<div class="an"><b>Immagine attuale</b></div><div class="aa"><button class="btn sm danger" id="w-imgrm" type="button">Rimuovi</button></div></div>`:'<p class="mut small" style="margin:0">Nessuna immagine: la scheda mostra le iniziali.</p>';
    const rm=$('#w-imgrm');if(rm)rm.onclick=()=>{ed.oldImg=ed.oldImg||d.img;d.img=null;drawImg();};};
  drawHist();drawImg();S.redraw=drawImg;
  $('#w-addp').onclick=()=>{const p=numIn($('#w-pr').value);if(p===null||p<0){toast('Scrivi un prezzo valido, es. 12,50','err');return;}const day=isoDay();d.hist=d.hist.filter(h=>!(h.d===day&&h.s!=='auto'));d.hist.push({d:day,p,s:'manuale'});d.hist.sort((a,b)=>a.d<b.d?-1:a.d>b.d?1:0);$('#w-pr').value='';drawHist();};
  $('#w-hist').addEventListener('click',e=>{const b=e.target.closest('[data-hrm]');if(!b)return;d.hist.splice(+b.dataset.hrm,1);drawHist();});
  $('#w-img').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;if(!/^image\//.test(f.type)){toast('Scegli un\'immagine','err');return;}ed.busy=1;drawImg();try{const a=await uploadFile(f);if(d.img)ed.oldImg=ed.oldImg||d.img;d.img=a.p;}catch(err){toast('Immagine non caricata: '+errMsg(err),'err');}ed.busy=0;drawImg();};
  $('#w-save').onclick=async()=>{
    const fd=new FormData($('#wf'));
    d.name=String(fd.get('name')||'').trim();if(!d.name){toast('Dai un nome al desiderio','err');return;}
    if(ed.busy){toast('Attendi il caricamento dell\'immagine','err');return;}
    d.cat=String(fd.get('cat')||'');d.qty=Math.max(1,parseInt(fd.get('qty'),10)||1);d.target=numIn(fd.get('target'));d.prio=+fd.get('prio')||2;
    d.links=String(fd.get('links')||'').split(/\s*\n\s*/).map(s=>s.trim()).filter(Boolean).map(s=>/^https?:\/\//i.test(s)?s:'https://'+s);
    d.note=String(fd.get('note')||'').trim();d.mtg=String(fd.get('mtg')||'');
    d.sfname=String(fd.get('sfname')||'').trim();d.sfset=String(fd.get('sfset')||'').trim();d.foil=!!fd.get('foil');d.deck=String(fd.get('deck')||'').trim();
    if(d.mtg==='deck'&&!d.deck){toast('Incolla la lista delle carte del mazzo','err');return;}
    d.price=d.hist.length?d.hist[d.hist.length-1].p:null;
    const prev=S.wish.find(x=>x.id===d.id);const keyChanged=!prev||['mtg','sfname','sfset','foil','deck','name'].some(k=>(prev[k]||'')!==(d[k]||''))||(prev.links||[]).join()!==d.links.join();
    if(keyChanged)delete d.pupd;
    d.upd=Date.now();
    const b=body(d);closeModal();
    if(ed.oldImg&&ed.oldImg!==d.img)removeStored([ed.oldImg]);
    if(await put('wishlist/'+d.id,b)){toast(isNew?'Aggiunto alla wishlist':'Salvato','ok');if(d.mtg&&keyChanged){const ok=await refreshPrice({...b,id:d.id});if(ok)toast('Prezzo Magic aggiornato','ok');}}
  };
  const del=$('#w-del');if(del)del.onclick=async()=>{if(!armed(del,'Conferma eliminazione'))return;const img=d.img;closeModal();if(await drop('wishlist/'+d.id)){toast('Eliminato','ok');removeStored([img]);}};
}

/* ================= FINANZE ================= */
const GW=$('#f-wrap'),GT=$('#f-grid'),FI=$('#f-input');
const N2=new Intl.NumberFormat('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2});
const PCT=new Intl.NumberFormat('it-IT',{style:'percent',maximumFractionDigits:2});
const GEN=new Intl.NumberFormat('it-IT',{maximumFractionDigits:10});
const serialDate=n=>{const d=new Date(Date.UTC(1899,11,30)+Math.round(n)*864e5);return String(d.getUTCDate()).padStart(2,'0')+'/'+String(d.getUTCMonth()+1).padStart(2,'0')+'/'+d.getUTCFullYear();};
function fmtVal(v,f){
  if(v===null||v===undefined)return'';
  if(FX.isErr(v))return v.err;
  if(typeof v==='boolean')return v?'VERO':'FALSO';
  if(typeof v==='number'){switch(f){case'eur':return EUR.format(v);case'pct':return PCT.format(v);case'num':return N2.format(v);case'date':return serialDate(v);default:return Math.abs(v)>=1e15?v.toExponential(4):GEN.format(v);}}
  return String(v);
}
const sheet=()=>S.sheets.find(s=>s.id===S.as)||null;
const key=(c,r)=>FX.colName(c)+(r+1);
const rawAt=(sh,c,r)=>{const x=sh.cells[key(c,r)];return x&&x.v!=null?String(x.v):'';};
const selR=()=>({c1:Math.min(S.g.c,S.g.c2),c2:Math.max(S.g.c,S.g.c2),r1:Math.min(S.g.r,S.g.r2),r2:Math.max(S.g.r,S.g.r2)});
const tdAt=(c,r)=>{const row=GT.rows[r+1];return row?row.cells[c+1]:null;};
const dirty=new Set(),inflight=new Set();let saveT=null;
function markDirty(id){dirty.add(id);clearTimeout(saveT);saveT=setTimeout(flushSheets,700);setSync('Salvataggio…','warn');}
async function flushSheets(){
  const ids=[...dirty];dirty.clear();
  for(const id of ids){const s=S.sheets.find(x=>x.id===id);if(!s)continue;inflight.add(id);await put('sheets/'+id,body(s));inflight.delete(id);}
}
addEventListener('pagehide',()=>{if(dirty.size)flushSheets();});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&dirty.size){clearTimeout(saveT);flushSheets();}});
const UNDO=[];
function pushUndo(ids){UNDO.push(ids.map(id=>{const s=S.sheets.find(x=>x.id===id);return s?{id,j:JSON.stringify({cells:s.cells,rows:s.rows,cols:s.cols,cw:s.cw||{}})}:null;}).filter(Boolean));if(UNDO.length>80)UNDO.shift();}
function undo(){const u=UNDO.pop();if(!u){toast('Niente da annullare');return;}for(const x of u){const s=S.sheets.find(y=>y.id===x.id);if(!s)continue;Object.assign(s,JSON.parse(x.j));markDirty(s.id);}renderGrid();}
function onSheets(docs){
  const list=[];
  for(const d of docs){
    const loc=S.sheets.find(x=>x.id===d.id);
    if(loc&&(dirty.has(d.id)||inflight.has(d.id)||pend['sheets/'+d.id]>0)){list.push(loc);continue;}
    const s=clone(d.data);s.id=d.id;s.cells=s.cells||{};s.rows=s.rows||40;s.cols=s.cols||12;s.cw=s.cw||{};list.push(s);
  }
  for(const loc of S.sheets){if(!list.includes(loc)&&(dirty.has(loc.id)||inflight.has(loc.id)))list.push(loc);}
  list.sort((a,b)=>(a.ord||0)-(b.ord||0)||String(a.name).localeCompare(String(b.name)));
  S.sheets=list;S.loaded.s=1;
  if(!list.some(s=>s.id===S.as))S.as=list[0]?list[0].id:null;
  renderTabs();
  if(S.ed)S.needRender=true;else if(S.view==='finanze'&&S.fsub==='fogli')renderFin();
}
function renderTabs(){
  const t=$('#f-tabs');
  const n=S.sheets.length;
  if(!n){t.innerHTML='';return;}
  t.innerHTML=S.sheets.map(s=>`<button class="tab${s.id===S.as?' on':''}" data-sid="${esc(s.id)}">${ico('sheet')}${esc(s.name)}</button>`).join('')+`<button class="tab more" id="f-sheetmenu" title="Rinomina, duplica, scarica o elimina il foglio" aria-label="Opzioni foglio">${ico('menu')}</button>`;
}
$('#f-tabs').addEventListener('click',e=>{
  if(e.target.closest('#f-sheetmenu')){sheetMenu();return;}
  const b=e.target.closest('[data-sid]');if(!b)return;if(S.ed)commitEdit(0,0);
  if(b.dataset.sid===S.as){sheetMenu();return;}
  S.as=b.dataset.sid;S.g={c:0,r:0,c2:0,r2:0};renderTabs();renderGrid();
});
function uniqueName(base){let n=base,i=2;const has=x=>S.sheets.some(s=>s.name.toLowerCase()===x.toLowerCase());while(has(n))n=base+' '+(i++);return n;}
function newSheet(name,src){
  const ord=Math.max(0,...S.sheets.map(s=>s.ord||0))+1;
  const s={id:uid(),name:uniqueName(name||'Foglio '+(S.sheets.length+1)),ord,rows:src?src.rows:40,cols:src?src.cols:12,cw:src?clone(src.cw||{}):{},cells:src?clone(src.cells):{}};
  S.sheets.push(s);S.as=s.id;S.g={c:0,r:0,c2:0,r2:0};renderTabs();renderGrid();markDirty(s.id);
}
function sheetCsv(sh){
  const ctx=FX.makeCtx(S.sheets);let maxR=-1,maxC=-1;
  for(const k in sh.cells){const m=k.match(/^([A-Z]+)(\d+)$/);if(!m||sh.cells[k].v==null||sh.cells[k].v==='')continue;maxR=Math.max(maxR,+m[2]-1);maxC=Math.max(maxC,FX.colIdx(m[1]));}
  const NF=new Intl.NumberFormat('it-IT',{useGrouping:false,maximumFractionDigits:10});
  const rows=[];for(let r=0;r<=maxR;r++){const row=[];for(let c=0;c<=maxC;c++){const cell=sh.cells[key(c,r)];let v=cell&&cell.v!=null&&cell.v!==''?ctx.value(sh,c,r):'';
    let s=typeof v==='number'?NF.format(v):FX.isErr(v)?v.err:typeof v==='boolean'?(v?'VERO':'FALSO'):String(v??'');if(/[;"\n]/.test(s))s='"'+s.replace(/"/g,'""')+'"';row.push(s);}rows.push(row.join(';'));}
  return'﻿'+rows.join('\r\n');
}
function saveBlob(name,blob){const u=URL.createObjectURL(blob);const a=document.createElement('a');a.href=u;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),4000);}
function sheetMenu(){
  const sh=sheet();if(!sh)return;
  openModal(`<div class="mh"><h2>Foglio</h2><button class="x" data-close aria-label="Chiudi">×</button></div>
  <label class="f"><span>Nome</span><input id="sm-name" value="${esc(sh.name)}" maxlength="40" autofocus></label>
  <p class="mut small">Le formule degli altri fogli che puntano a questo vengono aggiornate quando lo rinomini.</p>
  <div class="mf"><button class="btn danger" id="sm-del">Elimina foglio</button><button class="btn ghost" id="sm-dup">Duplica</button><button class="btn ghost" id="sm-csv">Scarica per Excel (CSV)</button><span class="sp"></span><button class="btn pri" id="sm-ok">Rinomina</button></div>`);
  $('#sm-ok').onclick=()=>{
    const nn=$('#sm-name').value.trim().replace(/[!'"]/g,'');if(!nn){toast('Il nome non può essere vuoto','err');return;}
    if(nn===sh.name){closeModal();return;}
    if(S.sheets.some(s=>s!==sh&&s.name.toLowerCase()===nn.toLowerCase())){toast('Esiste già un foglio con questo nome','err');return;}
    pushUndo(S.sheets.map(s=>s.id));
    for(const s of S.sheets){let ch=false;for(const k in s.cells){const c=s.cells[k];if(typeof c.v==='string'&&c.v[0]==='='){const nv=FX.renameSheet(c.v,sh.name,nn);if(nv!==c.v){c.v=nv;ch=true;}}}if(ch)markDirty(s.id);}
    sh.name=nn;markDirty(sh.id);closeModal();renderTabs();renderGrid();
  };
  $('#sm-dup').onclick=()=>{closeModal();newSheet(sh.name+' copia',sh);};
  $('#sm-csv').onclick=()=>{saveBlob(sh.name.replace(/[^\w\- ]+/g,'_')+'.csv',new Blob([sheetCsv(sh)],{type:'text/csv;charset=utf-8'}));closeModal();};
  const del=$('#sm-del');del.onclick=async()=>{if(!armed(del,'Conferma eliminazione'))return;closeModal();const id=sh.id;S.sheets=S.sheets.filter(s=>s.id!==id);dirty.delete(id);S.as=S.sheets[0]?S.sheets[0].id:null;renderTabs();renderGrid();if(await drop('sheets/'+id))toast('Foglio eliminato','ok');};
}
function renderGrid(){
  S.needRender=false;
  const sh=sheet();
  if(!sh){
    GT.style.width='';
    GT.innerHTML=`<tbody><tr><td style="height:auto;white-space:normal;padding:56px 24px;text-align:center;cursor:default;border:0;color:var(--mut)">${S.loaded.s?`<b style="color:#fff;font-size:19px;display:block">Nessun foglio</b>Premi “Nuovo foglio” per iniziare.`:'Caricamento…'}</td></tr></tbody>`;
    $('#f-stat').innerHTML='';return;
  }
  const ctx=FX.makeCtx(S.sheets);S.ctx=ctx;
  const R=sh.rows,C=sh.cols,s=selR();
  let w=46,h='<thead><tr><th class="corner" data-all="1"></th>';
  for(let c=0;c<C;c++){const cw=+(sh.cw&&sh.cw[c])||110;w+=cw;h+=`<th data-col="${c}" style="width:${cw}px">${FX.colName(c)}<i class="rz" data-rz="${c}"></i></th>`;}
  h+='</tr></thead><tbody>';
  for(let r=0;r<R;r++){
    h+=`<tr><th data-row="${r}">${r+1}</th>`;
    for(let c=0;c<C;c++){
      const cell=sh.cells[FX.colName(c)+(r+1)];let txt='',cls='';
      if(cell&&cell.v!=null&&cell.v!==''){const v=ctx.value(sh,c,r);txt=fmtVal(v,cell.f);
        if(typeof v==='number'){cls='n';if(v<0&&!cell.k)cls+=' neg';}else if(FX.isErr(v))cls='e';else if(typeof v==='boolean')cls='n';}
      if(cell&&cell.b)cls+=' b';
      if(c>=s.c1&&c<=s.c2&&r>=s.r1&&r<=s.r2)cls+=' sel';
      if(c===S.g.c&&r===S.g.r)cls+=' cur';
      h+=`<td data-c="${c}" data-r="${r}"${cls?` class="${cls.trim()}"`:''}${cell&&cell.k?` style="color:${esc(cell.k)}"`:''}>${esc(txt)}</td>`;
    }
    h+='</tr>';
  }
  GT.innerHTML=h+'</tbody>';GT.style.width=w+'px';
  paintHeads();updateBar();updateStat();paintTools();
}
function paintHeads(){
  $$('th.hl',GT).forEach(t=>t.classList.remove('hl'));const s=selR();
  for(let c=s.c1;c<=s.c2;c++){const t=GT.rows[0]&&GT.rows[0].cells[c+1];if(t)t.classList.add('hl');}
  for(let r=s.r1;r<=s.r2;r++){const t=GT.rows[r+1]&&GT.rows[r+1].cells[0];if(t)t.classList.add('hl');}
}
function paintTools(){
  const sh=sheet();if(!sh)return;const x=sh.cells[key(S.g.c,S.g.r)]||{};
  $$('#f-tools [data-f]').forEach(b=>b.classList.toggle('on',b.dataset.f===(x.f||'gen')));
  $('#f-tools [data-t=bold]').classList.toggle('on',!!x.b);
}
function paintSel(){
  if(!sheet())return;
  $$('td.sel,td.cur',GT).forEach(t=>t.classList.remove('sel','cur'));
  const s=selR();
  for(let r=s.r1;r<=s.r2;r++)for(let c=s.c1;c<=s.c2;c++){const t=tdAt(c,r);if(t)t.classList.add('sel');}
  const t=tdAt(S.g.c,S.g.r);if(t)t.classList.add('cur');
  paintHeads();updateBar();updateStat();paintTools();
}
function updateBar(){
  const sh=sheet();if(!sh)return;const s=selR();
  $('#f-addr').textContent=s.c1===s.c2&&s.r1===s.r2?key(s.c1,s.r1):key(s.c1,s.r1)+':'+key(s.c2,s.r2);
  if(!S.ed)FI.value=rawAt(sh,S.g.c,S.g.r);
}
function updateStat(){
  const sh=sheet(),ctx=S.ctx;if(!sh||!ctx)return;const s=selR();const nums=[];let cnt=0;
  if((s.c2-s.c1+1)*(s.r2-s.r1+1)>20000){$('#f-stat').innerHTML='';return;}
  for(let r=s.r1;r<=s.r2;r++)for(let c=s.c1;c<=s.c2;c++){const cell=sh.cells[key(c,r)];if(!cell||cell.v==null||cell.v==='')continue;cnt++;const v=ctx.value(sh,c,r);if(typeof v==='number')nums.push(v);}
  const fm=(sh.cells[key(S.g.c,S.g.r)]||{}).f;const F=v=>fmtVal(v,fm==='eur'||fm==='pct'||fm==='num'?fm:'num');
  if(!nums.length){$('#f-stat').innerHTML=cnt>1?`<span>Conteggio <b>${cnt}</b></span>`:'<span>Doppio clic (o doppio tocco) su una cella per modificarla · scrivi “=” per iniziare una formula</span>';return;}
  const sum=nums.reduce((a,b)=>a+b,0);
  $('#f-stat').innerHTML=`<span>Somma <b>${F(sum)}</b></span><span>Media <b>${F(sum/nums.length)}</b></span><span>Min <b>${F(Math.min(...nums))}</b></span><span>Max <b>${F(Math.max(...nums))}</b></span><span>Conteggio <b>${cnt}</b></span>`;
}
function grow(sh,r,c){let ch=false;if(r>=sh.rows){sh.rows=r+10;ch=true;}if(c>=sh.cols){sh.cols=c+1;ch=true;}if(ch)markDirty(sh.id);return ch;}
function move(dc,dr,ext){
  const sh=sheet();if(!sh)return;
  if(ext){S.g.c2=clamp(S.g.c2+dc,0,sh.cols-1);S.g.r2=clamp(S.g.r2+dr,0,sh.rows-1);paintSel();}
  else{const nc=Math.max(0,S.g.c+dc),nr=Math.max(0,S.g.r+dr);S.g={c:nc,r:nr,c2:nc,r2:nr};if(grow(sh,nr,nc))renderGrid();else paintSel();}
  const t=tdAt(ext?S.g.c2:S.g.c,ext?S.g.r2:S.g.r);if(t)t.scrollIntoView({block:'nearest',inline:'nearest'});
}
function setCellRaw(c,r,v){
  const sh=sheet();const k=key(c,r);const cur=sh.cells[k];const old=cur&&cur.v!=null?String(cur.v):'';
  if(old===v)return false;
  pushUndo([sh.id]);
  if(v===''){if(cur){delete cur.v;if(!cur.f&&!cur.b&&!cur.k)delete sh.cells[k];}}
  else{sh.cells[k]={...(cur||{}),v};if(v[0]!=='='&&!sh.cells[k].f){if(/€/.test(v)&&FX.parseNum(v)!==null)sh.cells[k].f='eur';else if(/%\s*$/.test(v)&&FX.parseNum(v)!==null)sh.cells[k].f='pct';}}
  markDirty(sh.id);return true;
}
function startEdit(init){
  const sh=sheet();if(!sh||S.ed)return;
  const td=tdAt(S.g.c,S.g.r);if(!td)return;
  S.g.c2=S.g.c;S.g.r2=S.g.r;paintSel();
  const raw=init!==undefined?init:rawAt(sh,S.g.c,S.g.r);
  const inp=document.createElement('input');inp.className='cedit';inp.value=raw;inp.spellcheck=false;inp.autocomplete='off';inp.setAttribute('aria-label','Modifica cella '+key(S.g.c,S.g.r));
  td.appendChild(inp);inp.focus({preventScroll:true});inp.setSelectionRange(inp.value.length,inp.value.length);
  S.ed={el:inp,c:S.g.c,r:S.g.r,from:'cell'};FI.value=raw;
  inp.addEventListener('input',()=>{FI.value=inp.value;S.pick=null;});
  inp.addEventListener('keydown',edKey);
  inp.addEventListener('blur',()=>setTimeout(()=>{if(S.ed&&S.ed.el===inp&&document.activeElement!==inp)commitEdit(0,0,true);},0));
}
function edKey(e){
  if(e.key==='Enter'){e.preventDefault();commitEdit(0,e.shiftKey?-1:1);}
  else if(e.key==='Tab'){e.preventDefault();commitEdit(e.shiftKey?-1:1,0);}
  else if(e.key==='Escape'){e.preventDefault();e.stopPropagation();cancelEdit();}
}
function commitEdit(dc,dr,noFocus){
  const ed=S.ed;if(!ed)return;S.ed=null;S.pick=null;
  const v=ed.el.value;
  if(ed.from==='cell')ed.el.remove();else FI.blur();
  setCellRaw(ed.c,ed.r,v.trim()===''?'':v);
  S.g={c:ed.c,r:ed.r,c2:ed.c,r2:ed.r};
  renderGrid();
  if(dc||dr)move(dc,dr);
  if(!noFocus)GW.focus({preventScroll:true});
}
function cancelEdit(){const ed=S.ed;if(!ed)return;S.ed=null;S.pick=null;if(ed.from==='cell')ed.el.remove();else FI.blur();if(S.needRender)renderGrid();else paintSel();GW.focus({preventScroll:true});}
FI.addEventListener('focus',()=>{
  if(!sheet()){FI.blur();return;}
  if(S.ed&&S.ed.from==='cell'){const v=S.ed.el.value;S.ed.el.remove();S.ed={el:FI,c:S.ed.c,r:S.ed.r,from:'bar'};FI.value=v;return;}
  if(!S.ed){S.g.c2=S.g.c;S.g.r2=S.g.r;paintSel();S.ed={el:FI,c:S.g.c,r:S.g.r,from:'bar'};}
});
FI.addEventListener('input',()=>{S.pick=null;});
FI.addEventListener('keydown',edKey);
FI.addEventListener('blur',()=>setTimeout(()=>{if(S.ed&&S.ed.el===FI&&document.activeElement!==FI)commitEdit(0,0,true);},0));
function insertRef(c,r){
  const el=S.ed.el;const a=el.selectionStart??el.value.length,b=el.selectionEnd??a;const t=key(c,r);
  el.setRangeText(t,a,b,'end');S.pick={c,r,start:a,end:a+t.length};
  if(S.ed.from==='cell')FI.value=el.value;
  hiliteRef(c,r,c,r);
}
function extendPick(c,r){
  const p=S.pick,el=S.ed.el;if(!p)return;
  const a=key(Math.min(p.c,c),Math.min(p.r,r)),b=key(Math.max(p.c,c),Math.max(p.r,r));const t=a===b?a:a+':'+b;
  el.setRangeText(t,p.start,p.end,'end');p.end=p.start+t.length;
  if(S.ed.from==='cell')FI.value=el.value;
  hiliteRef(p.c,p.r,c,r);
}
function hiliteRef(c1,r1,c2,r2){$$('td.ref',GT).forEach(t=>t.classList.remove('ref'));for(let r=Math.min(r1,r2);r<=Math.max(r1,r2);r++)for(let c=Math.min(c1,c2);c<=Math.max(c1,c2);c++){const t=tdAt(c,r);if(t)t.classList.add('ref');}}
let drag=null;
GT.addEventListener('pointerdown',e=>{
  const sh=sheet();if(!sh)return;
  if(e.target.classList.contains('rz')){startResize(e);return;}
  const td=e.target.closest('td[data-c]'),th=e.target.closest('th');
  if(td){
    const c=+td.dataset.c,r=+td.dataset.r;
    if(S.ed&&S.ed.from==='cell'&&S.ed.c===c&&S.ed.r===r)return;
    if(S.ed&&S.ed.el.value.trim().startsWith('=')){e.preventDefault();insertRef(c,r);drag={pick:true};return;}
    const touch=e.pointerType!=='mouse';
    if(S.ed)commitEdit(0,0,true);
    if(touch&&!e.shiftKey&&c===S.g.c&&r===S.g.r&&S.g.c2===c&&S.g.r2===r){startEdit();return;}
    if(e.shiftKey){S.g.c2=c;S.g.r2=r;}else S.g={c,r,c2:c,r2:r};
    paintSel();
    if(!touch){e.preventDefault();drag={sel:true};GW.focus({preventScroll:true});}
  }else if(th){
    if(S.ed)commitEdit(0,0,true);
    if(th.dataset.col!==undefined){const c=+th.dataset.col;S.g={c,r:0,c2:c,r2:sh.rows-1};}
    else if(th.dataset.row!==undefined){const r=+th.dataset.row;S.g={c:0,r,c2:sh.cols-1,r2:r};}
    else if(th.dataset.all){S.g={c:0,r:0,c2:sh.cols-1,r2:sh.rows-1};}
    paintSel();if(e.pointerType==='mouse'){e.preventDefault();GW.focus({preventScroll:true});}
  }
});
GT.addEventListener('pointermove',e=>{
  if(!drag)return;const td=e.target.closest('td[data-c]');if(!td)return;const c=+td.dataset.c,r=+td.dataset.r;
  if(drag.pick&&S.ed)extendPick(c,r);
  else if(drag.sel&&(S.g.c2!==c||S.g.r2!==r)){S.g.c2=c;S.g.r2=r;paintSel();}
});
addEventListener('pointerup',()=>{drag=null;});
GT.addEventListener('dblclick',e=>{const td=e.target.closest('td[data-c]');if(td&&!S.ed)startEdit();});
GW.addEventListener('keydown',e=>{
  if(S.ed||e.target!==GW)return;const sh=sheet();if(!sh)return;
  const k=e.key,mod=e.ctrlKey||e.metaKey;
  if(mod&&k.toLowerCase()==='z'){e.preventDefault();undo();return;}
  if(mod&&k.toLowerCase()==='b'){e.preventDefault();tool('bold');return;}
  if(mod||e.altKey)return;
  const mv={ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0]}[k];
  if(mv){e.preventDefault();move(mv[0],mv[1],e.shiftKey);return;}
  if(k==='Enter'){e.preventDefault();move(0,e.shiftKey?-1:1);return;}
  if(k==='Tab'){e.preventDefault();move(e.shiftKey?-1:1,0);return;}
  if(k==='F2'){e.preventDefault();startEdit();return;}
  if(k==='Delete'||k==='Backspace'){e.preventDefault();tool('clear');return;}
  if(k.length===1){e.preventDefault();startEdit(k);}
});
document.addEventListener('copy',e=>{
  if(S.view!=='finanze'||S.ed||document.activeElement!==GW)return;const sh=sheet();if(!sh)return;
  const s=selR(),rows=[],cells=[];
  for(let r=s.r1;r<=s.r2;r++){const row=[],cr=[];for(let c=s.c1;c<=s.c2;c++){row.push(rawAt(sh,c,r));cr.push(clone(sh.cells[key(c,r)]||null));}rows.push(row);cells.push(cr);}
  const txt=rows.map(r=>r.join('\t')).join('\n');
  e.clipboardData.setData('text/plain',txt);e.preventDefault();
  S.clip={txt,rows,cells,c:s.c1,r:s.r1};toast('Copiato');
});
document.addEventListener('paste',e=>{
  if(S.view!=='finanze'||S.ed||document.activeElement!==GW)return;const sh=sheet();if(!sh)return;
  const txt=(e.clipboardData&&e.clipboardData.getData('text/plain'))||'';if(!txt)return;e.preventDefault();
  const internal=S.clip&&S.clip.txt===txt;
  const rows=internal?S.clip.rows:txt.replace(/\r/g,'').replace(/\n$/,'').split('\n').map(l=>l.split('\t'));
  const s=selR();const single=rows.length===1&&rows[0].length===1;
  const H=single?s.r2-s.r1+1:rows.length,W=single?s.c2-s.c1+1:Math.max(...rows.map(r=>r.length));
  pushUndo([sh.id]);grow(sh,s.r1+H-1,s.c1+W-1);
  for(let i=0;i<H;i++)for(let j=0;j<W;j++){
    const si=single?0:i,sj=single?0:j;let raw=(rows[si]||[])[sj];if(raw===undefined)continue;
    const tc=s.c1+j,tr=s.r1+i,k=key(tc,tr);
    let cell=internal?clone(S.clip.cells[si][sj])||{}:{...(sh.cells[k]||{})};
    if(internal&&raw.startsWith('='))raw=FX.shift(raw,tr-(S.clip.r+si),tc-(S.clip.c+sj));
    if(raw==='')delete cell.v;else cell.v=raw;
    if(cell.v===undefined&&!cell.f&&!cell.b&&!cell.k)delete sh.cells[k];else sh.cells[k]=cell;
  }
  S.g.c2=s.c1+W-1;S.g.r2=s.r1+H-1;markDirty(sh.id);renderGrid();
});
function forSel(fn){const s=selR();for(let r=s.r1;r<=s.r2;r++)for(let c=s.c1;c<=s.c2;c++)fn(c,r,key(c,r));}
function structural(axis,delta){
  const sh=sheet();const k=axis==='r'?Math.min(S.g.r,S.g.r2):Math.min(S.g.c,S.g.c2);
  if(delta<0&&(axis==='r'?sh.rows:sh.cols)<=1)return;
  pushUndo(S.sheets.map(s=>s.id));
  const nm=sh.name.toLowerCase();
  for(const s of S.sheets){let ch=false;for(const kk in s.cells){const cell=s.cells[kk];if(typeof cell.v==='string'&&cell.v[0]==='='){const nv=FX.restructure(cell.v,axis,k,delta,ref=>ref?ref.toLowerCase()===nm:s.id===sh.id);if(nv!==cell.v){cell.v=nv;ch=true;}}}if(ch&&s.id!==sh.id)markDirty(s.id);}
  const nc={};
  for(const kk in sh.cells){const m=kk.match(/^([A-Z]+)(\d+)$/);if(!m)continue;let c=FX.colIdx(m[1]),r=+m[2]-1;let p=axis==='r'?r:c;
    if(delta<0&&p===k)continue;if(delta>0&&p>=k)p++;else if(delta<0&&p>k)p--;
    if(axis==='r')r=p;else c=p;nc[key(c,r)]=sh.cells[kk];}
  sh.cells=nc;
  if(axis==='r')sh.rows=Math.max(1,sh.rows+delta);
  else{sh.cols=Math.max(1,sh.cols+delta);const cw={};for(const i in sh.cw||{}){let p=+i;if(delta<0&&p===k)continue;if(delta>0&&p>=k)p++;else if(delta<0&&p>k)p--;cw[p]=sh.cw[i];}sh.cw=cw;}
  S.g={c:Math.min(S.g.c,sh.cols-1),r:Math.min(S.g.r,sh.rows-1)};S.g.c2=S.g.c;S.g.r2=S.g.r;
  markDirty(sh.id);renderGrid();
}
function chartSel(){
  const sh=sheet(),ctx=S.ctx;if(!sh||!ctx)return;const s=selR();const rows=[];let fm=null;
  for(let r=s.r1;r<=s.r2;r++){
    const vals=[];for(let c=s.c1;c<=s.c2;c++)vals.push({c,v:ctx.value(sh,c,r)});
    const nums=vals.filter(x=>typeof x.v==='number');if(!nums.length)continue;
    const n=nums[nums.length-1];if(fm===null)fm=(sh.cells[key(n.c,r)]||{}).f||'';
    const lab=vals.find(x=>typeof x.v==='string'&&x.v.trim());
    let label=lab?lab.v:'';if(!label&&s.c1>0){const a=ctx.value(sh,0,r);label=typeof a==='string'?a:'';}
    rows.push({label:label||'Riga '+(r+1),val:n.v});
  }
  if(!rows.length){toast('Seleziona celle con dei numeri (e se vuoi le etichette a sinistra), poi premi Grafico','err');return;}
  const mx=Math.max(...rows.map(r=>Math.abs(r.val)))||1,tot=rows.reduce((a,r)=>a+r.val,0),F=v=>fmtVal(v,fm||'num');
  openModal(`<div class="mh"><h2>Grafico</h2><button class="x" data-close aria-label="Chiudi">×</button></div>
  <p class="mut small" style="margin-top:0">${esc(sh.name)} · ${key(s.c1,s.r1)}:${key(s.c2,s.r2)} · totale <b style="color:#fff">${F(tot)}</b></p>
  <div class="bars">${rows.map(r=>`<div class="bar"><span class="bl" title="${esc(r.label)}">${esc(r.label)}</span><div class="bt"><i class="${r.val<0?'neg':''}" style="width:${(Math.abs(r.val)/mx*100).toFixed(2)}%"></i></div><b>${F(r.val)}</b></div>`).join('')}</div>`,{wide:true});
}
function tool(t,arg){
  const sh=sheet();if(!sh)return;if(S.ed)commitEdit(0,0,true);
  const s=selR();
  if(t==='undo'){undo();return;}
  if(t==='chart'){chartSel();return;}
  if(t==='rowins')return structural('r',1);if(t==='rowdel')return structural('r',-1);
  if(t==='colins')return structural('c',1);if(t==='coldel')return structural('c',-1);
  pushUndo([sh.id]);
  if(t==='fmt')forSel((c,r,k)=>{const x=sh.cells[k]||{};if(arg==='gen')delete x.f;else x.f=arg;if(Object.keys(x).length)sh.cells[k]=x;});
  else if(t==='bold'){const on=!(sh.cells[key(S.g.c,S.g.r)]||{}).b;forSel((c,r,k)=>{const x=sh.cells[k]||{};if(on)x.b=true;else delete x.b;if(Object.keys(x).length)sh.cells[k]=x;else delete sh.cells[k];});}
  else if(t==='color')forSel((c,r,k)=>{const x=sh.cells[k]||{};if(arg)x.k=arg;else delete x.k;if(Object.keys(x).length)sh.cells[k]=x;else delete sh.cells[k];});
  else if(t==='clear')forSel((c,r,k)=>{const x=sh.cells[k];if(!x)return;delete x.v;if(!x.f&&!x.b&&!x.k)delete sh.cells[k];});
  else if(t==='filldown'||t==='fillright'){
    const down=t==='filldown';
    if(down?s.r1===s.r2:s.c1===s.c2){UNDO.pop();toast(down?'Seleziona la cella da copiare e le celle sotto (trascina o Maiusc+clic)':'Seleziona la cella da copiare e le celle a destra');return;}
    if(down){for(let c=s.c1;c<=s.c2;c++){const src=sh.cells[key(c,s.r1)];for(let r=s.r1+1;r<=s.r2;r++){const k=key(c,r);if(!src){delete sh.cells[k];continue;}const x=clone(src);if(typeof x.v==='string'&&x.v[0]==='=')x.v=FX.shift(x.v,r-s.r1,0);sh.cells[k]=x;}}}
    else{for(let r=s.r1;r<=s.r2;r++){const src=sh.cells[key(s.c1,r)];for(let c=s.c1+1;c<=s.c2;c++){const k=key(c,r);if(!src){delete sh.cells[k];continue;}const x=clone(src);if(typeof x.v==='string'&&x.v[0]==='=')x.v=FX.shift(x.v,0,c-s.c1);sh.cells[k]=x;}}}
  }
  markDirty(sh.id);renderGrid();
}
$('#f-tools').addEventListener('pointerdown',e=>{if(e.target.closest('button'))e.preventDefault();});
$('#f-tools').addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.dataset.f)tool('fmt',b.dataset.f);else if(b.dataset.k!==undefined)tool('color',b.dataset.k);else if(b.dataset.t)tool(b.dataset.t);
  if(matchMedia('(pointer:fine)').matches&&b.dataset.t!=='chart')GW.focus({preventScroll:true});
});
function startResize(e){
  e.preventDefault();e.stopPropagation();const c=+e.target.dataset.rz;const th=e.target.parentElement;const sx=e.clientX,sw=th.offsetWidth,tw=GT.offsetWidth;let w=sw;
  const mv=ev=>{w=Math.max(48,sw+ev.clientX-sx);th.style.width=w+'px';GT.style.width=(tw+w-sw)+'px';};
  const up=()=>{removeEventListener('pointermove',mv);removeEventListener('pointerup',up);const sh=sheet();if(!sh)return;pushUndo([sh.id]);sh.cw=sh.cw||{};sh.cw[c]=Math.round(w);markDirty(sh.id);};
  addEventListener('pointermove',mv);addEventListener('pointerup',up);
}
const FNHELP=[
  ['SOMMA · SUM','=SOMMA(B2:B10)','Somma i numeri'],['MEDIA · AVERAGE','=MEDIA(B2:B10)','Media aritmetica'],['MIN · MAX','=MAX(B2:B10)','Valore minimo o massimo'],
  ['MEDIANA · MEDIAN','=MEDIANA(B2:B10)','Valore centrale'],['CONTA.NUMERI · COUNT','=CONTA.NUMERI(B2:B30)','Quanti numeri ci sono'],['CONTA.VALORI · COUNTA','=CONTA.VALORI(A2:A20)','Quante celle non vuote'],
  ['SE · IF','=SE(B5>1000;"Alto";"Ok")','Condizione: se vero…, altrimenti…'],['SE.ERRORE · IFERROR','=SE.ERRORE(B2/B3;0)','Sostituisce un errore'],['E · O · NON','=E(B2>0;C2>0)','Logica AND, OR, NOT'],
  ['SOMMA.SE · SUMIF','=SOMMA.SE(A2:A30;"Spesa";B2:B30)','Somma solo dove il criterio è vero (anche ">100", "Sp*")'],['CONTA.SE · COUNTIF','=CONTA.SE(B2:B30;">50")','Conta dove il criterio è vero'],['MEDIA.SE · AVERAGEIF','=MEDIA.SE(A2:A30;"Svago";B2:B30)','Media condizionata'],
  ['MATR.SOMMA.PRODOTTO · SUMPRODUCT','=MATR.SOMMA.PRODOTTO(B2:B5;C2:C5)','Somma dei prodotti riga per riga'],['CERCA.VERT · VLOOKUP','=CERCA.VERT("Affitto";A2:B20;2;FALSO)','Cerca nella prima colonna e restituisce un valore'],
  ['ARROTONDA · ROUND','=ARROTONDA(B2;2)','Arrotonda ai decimali (anche .PER.ECC e .PER.DIF)'],['INT · ASS · RADQ','=ASS(B2)','Intero, valore assoluto, radice'],['POTENZA · RESTO','=POTENZA(1,05;10)','Potenza e resto della divisione'],
  ['RATA · PMT','=RATA(3%/12;240;-150000)','Rata di un prestito o mutuo'],['VAL.FUT · FV','=VAL.FUT(4%/12;120;-200)','Valore futuro di un risparmio periodico'],
  ['OGGI · TODAY','=OGGI()','Data di oggi (usa il formato Data)'],['CONCATENA · &','="Totale: "&B10','Unisce testi'],['LUNGHEZZA · MAIUSC · MINUSC','=MAIUSC(A2)','Funzioni sul testo'],
];
const showHelp=()=>openModal(`<div class="mh"><h2>Funzioni e formule</h2><button class="x" data-close aria-label="Chiudi">×</button></div>
  <ul class="tips"><li>Una formula inizia con <b>=</b>. Operatori: + − * / ^ e % (es. <b>=B2*22%</b>), confronti = &lt;&gt; &lt; &gt; &lt;= &gt;=.</li>
  <li>Separa gli argomenti con <b>;</b> (come in Excel italiano) o con la virgola. Con il punto e virgola puoi scrivere i decimali con la virgola: <b>=ARROTONDA(2,345;2)</b>.</li>
  <li>Mentre scrivi una formula, <b>clicca o trascina sulle celle</b> per inserirne il riferimento.</li>
  <li><b>$</b> blocca colonna o riga quando copi o usi “Riempi” (es. <b>=B2/$B$10</b>).</li>
  <li>Riferimenti ad altri fogli: <b>=Entrate!B4</b> oppure <b>='Spese casa'!B4</b>.</li>
  <li>Copia e incolla (Ctrl/⌘+C, V) spostano le formule come in Excel; Ctrl/⌘+Z annulla; puoi incollare righe copiate da Excel o Google Fogli.</li>
  <li>Seleziona etichette e numeri e premi <b>Grafico</b> per vederli a barre. Dal menu ⋯ del foglio lo scarichi per Excel.</li></ul>
  <div class="fnlist">${FNHELP.map(([n,x,d])=>`<div><span><code>${esc(n)}</code><br><span class="mut small">${esc(d)}</span></span><span>${esc(x)}</span></div>`).join('')}</div>`,{wide:true});

/* ================= SPESE ================= */
const MESI=new Intl.DateTimeFormat('it-IT',{month:'long',year:'numeric'});
const DAYF=new Intl.DateTimeFormat('it-IT',{weekday:'long',day:'numeric',month:'long'});
const cap=t=>t?t[0].toUpperCase()+t.slice(1):t;
const monthLabel=m=>cap(MESI.format(new Date(m+'-15T12:00:00')));
const monthName=m=>new Intl.DateTimeFormat('it-IT',{month:'long'}).format(new Date(m+'-15T12:00:00'));
const shiftMonth=(m,d)=>{const[y,mo]=m.split('-').map(Number);const x=new Date(y,mo-1+d,15);return x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0');};
const thisMonth=()=>isoDay().slice(0,7);
S.month=thisMonth();S.fsub=(()=>{try{return localStorage.getItem('capri-fsub')||'spese';}catch(e){return'spese';}})();S.spese=[];S.abb=[];S.notes=[];S.nf={f:'tutte',q:''};
const scatOf=n=>cfg().scats.find(c=>c.n===n);
const scol=n=>(scatOf(n)||{}).c||'#9a9aa3';
const spOfMonth=m=>S.spese.filter(x=>String(x.d||'').startsWith(m));
const total=a=>a.reduce((s,x)=>s+(+x.amt||0),0);
function byCat(list){const m=new Map();for(const x of list){const k=x.cat||'Altro';m.set(k,(m.get(k)||0)+(+x.amt||0));}return m;}
const totBudget=()=>{const c=cfg();if(c.sbudget)return +c.sbudget;const b=c.scats.reduce((s,x)=>s+(+x.b||0),0);return b||null;};
function spesaModal(x){
  const isNew=!x;const d=x?clone(x):{id:uid(),d:isoDay(),amt:null,cat:(cfg().scats[0]||{n:'Altro'}).n,note:'',at:Date.now()};
  const cats=cfg().scats.slice();if(d.cat&&!cats.some(c=>c.n===d.cat))cats.push({n:d.cat,c:'#9a9aa3'});
  openModal(`<div class="mh"><h2>${isNew?'Nuova spesa':'Spesa'}</h2><button class="x" data-close aria-label="Chiudi">×</button></div>
  <form id="spf" autocomplete="off" style="display:grid;gap:16px">
   <input class="amt" name="amt" inputmode="decimal" placeholder="0,00 €" value="${d.amt!=null?esc(String(d.amt).replace('.',',')):''}" autofocus aria-label="Importo in euro">
   <div class="f"><span>Categoria</span><div class="chips">${cats.map(c=>`<label style="--c:${esc(c.c)}"><input type="radio" name="cat" value="${esc(c.n)}" ${c.n===d.cat?'checked':''}><b>${esc(c.n)}</b></label>`).join('')}</div></div>
   <div class="form"><label class="f two"><span>Nota (facoltativa)</span><input name="note" maxlength="120" value="${esc(d.note||'')}" placeholder="Es. Esselunga, pizza con amici…"></label><label class="f"><span>Data</span><input type="date" name="d" value="${esc(d.d)}"></label></div>
  </form>
  <div class="mf">${isNew?'':'<button class="btn danger" id="sp-del" type="button">Elimina</button>'}<span class="sp"></span><button class="btn ghost" data-close type="button">Annulla</button><button class="btn pri" id="sp-ok" type="button">${isNew?'Aggiungi spesa':'Salva'}</button></div>`);
  if(isNew&&!matchMedia('(pointer:fine)').matches)setTimeout(()=>$('#spf [name=amt]')&&$('#spf [name=amt]').focus(),60);
  const save=async()=>{
    const fd=new FormData($('#spf'));const amt=numIn(fd.get('amt'));
    if(amt===null||amt===0){toast('Scrivi l\'importo, es. 12,50','err');$('#spf [name=amt]').focus();return;}
    d.amt=Math.round(Math.abs(amt)*100)/100;d.cat=String(fd.get('cat')||'Altro');d.note=String(fd.get('note')||'').trim();d.d=String(fd.get('d')||isoDay());
    closeModal();if(await put('spese/'+d.id,body(d)))toast(`${eur(d.amt)} · ${d.cat}`,'ok');
  };
  $('#sp-ok').onclick=save;
  $('#spf').addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.tagName==='INPUT'){e.preventDefault();save();}});
  const del=$('#sp-del');if(del)del.onclick=async()=>{if(!armed(del))return;closeModal();if(await drop('spese/'+d.id))toast('Spesa eliminata','ok');};
}
function cbarsHtml(list,limit){
  const m=byCat(list);const cats=cfg().scats;
  let rows=[...m.entries()].map(([n,v])=>({n,v,b:+(scatOf(n)||{}).b||0}));
  if(!limit)for(const c of cats)if(+c.b&&!m.has(c.n))rows.push({n:c.n,v:0,b:+c.b});
  rows.sort((a,b)=>b.v-a.v);if(limit)rows=rows.slice(0,limit);
  if(!rows.length)return'';
  const M=Math.max(...rows.map(r=>Math.max(r.v,r.b)))||1;
  return rows.map(r=>`<div class="cbar" style="--c:${esc(scol(r.n))}"><span class="bl" title="${esc(r.n)}">${esc(r.n)}${r.b?`<small>budget ${eur(r.b)}</small>`:''}</span><div class="bt"><i class="${r.b&&r.v>r.b?'over':''}" style="width:${(r.v/M*100).toFixed(1)}%"></i></div><b>${eur(r.v)}</b></div>`).join('');
}
function renderSpese(){
  const list=spOfMonth(S.month);
  $('#s-month').textContent=monthLabel(S.month);
  $('#s-next').disabled=S.month>=thisMonth();
  $('#s-cbars').innerHTML=cbarsHtml(list)||`<p class="mini">Nessuna spesa a ${monthName(S.month)}.</p>`;
  const ms=[];for(let i=5;i>=0;i--)ms.push(shiftMonth(S.month,-i));
  const tots=ms.map(m=>total(spOfMonth(m)));const mx=Math.max(...tots)||1;
  $('#s-trend').innerHTML=ms.map((m,i)=>`<div class="${m===S.month?'cur':''}" data-m="${m}" title="${esc(monthLabel(m))}"><b>${tots[i]?eur(tots[i]).replace(/,\d\d\s/,' '):''}</b><i style="height:${(tots[i]/mx*100).toFixed(1)}%"></i><span>${esc(monthName(m).slice(0,3))}</span></div>`).join('');
  const sorted=list.slice().sort((a,b)=>String(b.d).localeCompare(String(a.d))||(b.at||0)-(a.at||0));
  const days=new Map();for(const x of sorted){if(!days.has(x.d))days.set(x.d,[]);days.get(x.d).push(x);}
  $('#s-list').innerHTML=sorted.length?[...days.entries()].map(([d,xs])=>`<div class="dayh"><span>${esc(cap(DAYF.format(new Date(d+'T12:00:00'))))}</span><span>${eur(total(xs))}</span></div><div class="rows">${xs.map(x=>`<button class="rowi" data-sp="${esc(x.id)}" style="--c:${esc(scol(x.cat))}"><span class="dot"></span><span class="t">${esc(x.note||x.cat)}</span><span class="s">${x.note?esc(x.cat):''}</span><span class="a">${eur(+x.amt)}</span></button>`).join('')}</div>`).join(''):
    `<div class="empty">${ico('wallet')}<b>Nessuna spesa registrata a ${esc(monthName(S.month))}</b>Premi “Spesa” (o il + in alto, da qualsiasi pagina) e registrala in due tocchi.</div>`;
}
$('#s-prev').onclick=()=>{S.month=shiftMonth(S.month,-1);renderFin();};
$('#s-next').onclick=()=>{if(S.month<thisMonth()){S.month=shiftMonth(S.month,1);renderFin();}};
$('#s-trend').addEventListener('click',e=>{const d=e.target.closest('[data-m]');if(d){S.month=d.dataset.m;renderFin();}});
$('#s-list').addEventListener('click',e=>{const b=e.target.closest('[data-sp]');if(!b)return;const x=S.spese.find(y=>y.id===b.dataset.sp);if(x)spesaModal(x);});
$('#s-cats').onclick=()=>catManager('scats');
function monthToSheet(){
  const list=spOfMonth(S.month).sort((a,b)=>String(a.d).localeCompare(String(b.d)));
  if(!list.length){toast('Nessuna spesa in questo mese','err');return;}
  const cells={};const q=s=>String(s).replace(/"/g,'""');
  cells.A1={v:'Spese di '+monthName(S.month)+' '+S.month.slice(0,4),b:true};
  ['Data','Categoria','Nota','Importo'].forEach((h,i)=>cells[FX.colName(i)+'3']={v:h,b:true});
  list.forEach((x,i)=>{const r=4+i;const[y,m,dd]=String(x.d).split('-');cells['A'+r]={v:`${dd}/${m}/${y}`};cells['B'+r]={v:x.cat||'Altro'};if(x.note)cells['C'+r]={v:x.note};cells['D'+r]={v:String(x.amt),f:'eur'};});
  const last=3+list.length,tr=last+1;
  cells['C'+tr]={v:'Totale',b:true};cells['D'+tr]={v:`=SOMMA(D4:D${last})`,f:'eur',b:true,k:'#1fe08f'};
  cells.F3={v:'Categoria',b:true};cells.G3={v:'Totale',b:true};
  [...byCat(list).keys()].forEach((c,i)=>{cells['F'+(4+i)]={v:c};cells['G'+(4+i)]={v:`=SOMMA.SE(B4:B${last};"${q(c)}";D4:D${last})`,f:'eur'};});
  S.fsub='fogli';history.replaceState(null,'','#fogli');
  newSheet('Spese '+monthLabel(S.month),{rows:Math.max(40,tr+10),cols:12,cw:{0:110,1:160,2:230,3:120,5:170,6:120},cells});
  renderFin();toast('Foglio creato: puoi aggiungere formule e colonne','ok');
}
/* ================= ABBONAMENTI E SCADENZE ================= */
const UNITS={g:['giorno','giorni'],s:['settimana','settimane'],m:['mese','mesi'],a:['anno','anni']};
const perLabel=x=>{const n=+x.n||1,u=UNITS[x.u||'m']||UNITS.m;return n===1?'ogni '+u[0]:`ogni ${n} ${u[1]}`;};
function addPeriod(day,n,u){const d=new Date(day+'T12:00:00');n=+n||1;if(u==='g')d.setDate(d.getDate()+n);else if(u==='s')d.setDate(d.getDate()+7*n);else{const months=u==='a'?12*n:n;const dd=d.getDate();d.setDate(1);d.setMonth(d.getMonth()+months);const last=new Date(d.getFullYear(),d.getMonth()+1,0).getDate();d.setDate(Math.min(dd,last));}return isoDay(d);}
const monthly=x=>{const a=+x.amt||0,n=+x.n||1;switch(x.u||'m'){case'g':return a*365/12/n;case's':return a*52/12/n;case'a':return a/12/n;default:return a/n;}};
const abActive=()=>S.abb.filter(x=>x.active!==false&&x.next);
function cdChip(n){if(n===null)return'';if(n<0)return`<div class="cd late"><b>${-n}g</b><small>scaduto</small></div>`;if(n===0)return`<div class="cd late"><b>Oggi</b><small>scade</small></div>`;return`<div class="cd${n<=7?' soon':''}"><b>${n}g</b><small>${n===1?'domani':'mancanti'}</small></div>`;}
function abbModal(x){
  const isNew=!x;const d=x?clone(x):{id:uid(),kind:'abb',name:'',amt:null,n:1,u:'m',next:'',cat:'Abbonamenti',remind:7,note:'',active:true,created:Date.now()};
  const cats=cfg().scats.slice();if(d.cat&&!cats.some(c=>c.n===d.cat))cats.push({n:d.cat,c:'#9a9aa3'});
  openModal(`<div class="mh"><h2>${isNew?'Nuovo abbonamento o scadenza':esc(d.name)}</h2><button class="x" data-close aria-label="Chiudi">×</button></div>
  <form class="form" id="abf" autocomplete="off">
    <div class="f full"><span>Tipo</span><div class="pick" style="grid-template-columns:repeat(2,minmax(0,1fr))"><label style="--u:var(--og)"><input type="radio" name="kind" value="abb" ${d.kind!=='doc'?'checked':''}><b>Pagamento ricorrente</b></label><label style="--u:var(--tk)"><input type="radio" name="kind" value="doc" ${d.kind==='doc'?'checked':''}><b>Scadenza (documento, revisione…)</b></label></div></div>
    <label class="f two"><span>Nome</span><input name="name" maxlength="80" value="${esc(d.name)}" placeholder="Es. Netflix, palestra, bollo auto, passaporto" autofocus></label>
    <label class="f"><span>Importo (€)</span><input name="amt" inputmode="decimal" value="${d.amt!=null?esc(String(d.amt).replace('.',',')):''}" placeholder="Facoltativo"></label>
    <label class="f"><span>Si ripete ogni</span><input name="n" type="number" min="1" step="1" value="${esc(d.n||1)}"></label>
    <label class="f"><span>&nbsp;</span><select name="u">${Object.entries(UNITS).map(([k,v])=>`<option value="${k}" ${d.u===k?'selected':''}>${v[1]}</option>`).join('')}</select></label>
    <label class="f"><span>Prossima scadenza</span><input type="date" name="next" value="${esc(d.next||'')}" required></label>
    <label class="f"><span>Categoria</span><select name="cat">${cats.map(c=>`<option ${c.n===d.cat?'selected':''}>${esc(c.n)}</option>`).join('')}</select></label>
    <label class="f"><span>Avvisami giorni prima</span><input name="remind" type="number" min="0" max="365" value="${esc(d.remind??7)}"></label>
    <label class="f row"><input type="checkbox" name="active" ${d.active!==false?'checked':''}><span>Attivo</span></label>
    <label class="f full"><span>Note</span><textarea name="note" rows="2" placeholder="Es. disdetta entro 30 giorni, codice cliente…">${esc(d.note||'')}</textarea></label>
  </form>
  <div class="mf">${isNew?'':'<button class="btn danger" id="ab-del" type="button">Elimina</button>'}<span class="sp"></span><button class="btn ghost" data-close type="button">Annulla</button><button class="btn pri" id="ab-ok" type="button">${isNew?'Aggiungi':'Salva'}</button></div>`,{wide:true});
  $$('#abf [name=kind]').forEach(r=>r.onchange=()=>{if(r.checked&&r.value==='doc'&&isNew){$('#abf [name=u]').value='a';}});
  $('#ab-ok').onclick=async()=>{
    const fd=new FormData($('#abf'));d.name=String(fd.get('name')||'').trim();d.next=String(fd.get('next')||'');
    if(!d.name){toast('Dai un nome','err');return;}if(!d.next){toast('Indica la prossima scadenza','err');return;}
    d.kind=String(fd.get('kind')||'abb');d.amt=numIn(fd.get('amt'));if(d.amt!=null)d.amt=Math.abs(d.amt);d.n=Math.max(1,parseInt(fd.get('n'),10)||1);d.u=String(fd.get('u')||'m');
    d.cat=String(fd.get('cat')||'');d.remind=Math.max(0,parseInt(fd.get('remind'),10)||0);d.active=!!fd.get('active');d.note=String(fd.get('note')||'').trim();d.upd=Date.now();
    closeModal();if(await put('abbonamenti/'+d.id,body(d)))toast(isNew?'Aggiunto':'Salvato','ok');
  };
  const del=$('#ab-del');if(del)del.onclick=async()=>{if(!armed(del))return;closeModal();if(await drop('abbonamenti/'+d.id))toast('Eliminato','ok');};
}
function payModal(x){
  const doc=x.kind==='doc',nx=addPeriod(x.next,x.n,x.u);
  openModal(`<div class="mh"><h2>${doc?'Rinnovato':'Pagato'}</h2><button class="x" data-close aria-label="Chiudi">×</button></div>
  <p style="margin-top:0"><b>${esc(x.name)}</b>${x.amt?` · ${eur(+x.amt)}`:''}<br><span class="mut small">La prossima scadenza diventa il <b style="color:#fff">${fmtDate(nx)}</b> (${perLabel(x)}).</span></p>
  <div class="form"><label class="f"><span>${doc?'Rinnovato il':'Pagato il'}</span><input type="date" id="py-d" value="${isoDay()}"></label>
  ${x.amt?`<label class="f row two"><input type="checkbox" id="py-sp" checked><span>Registra ${eur(+x.amt)} nelle spese (${esc(x.cat||'Altro')})</span></label>`:''}</div>
  <div class="mf"><span class="sp"></span><button class="btn ghost" data-close>Annulla</button><button class="btn pri" id="py-ok">Conferma</button></div>`);
  $('#py-ok').onclick=async()=>{
    const day=$('#py-d').value||isoDay();const reg=$('#py-sp')&&$('#py-sp').checked;
    const b=body(S.abb.find(y=>y.id===x.id)||x);b.next=nx;b.last=day;b.upd=Date.now();closeModal();
    await put('abbonamenti/'+x.id,b);
    if(reg)await put('spese/'+uid(),{d:day,amt:+x.amt,cat:x.cat||'Altro',note:x.name,at:Date.now(),from:x.id});
    toast(`${x.name}: prossima scadenza ${fmtDate(nx)}`,'ok');
  };
}
function renderAbb(){
  const list=S.abb.slice().sort((a,b)=>((a.active===false)-(b.active===false))||String(a.next||'9').localeCompare(String(b.next||'9')));
  $('#a-list').innerHTML=list.length?list.map(x=>{const n=x.active===false?null:daysTo(x.next);const c=scol(x.cat);
    return`<div class="ab${x.active===false?' off':''}" data-ab="${esc(x.id)}">${cdChip(n)}<div class="ai"><b>${esc(x.name)}</b><span>${x.kind==='doc'?'Scadenza':'Pagamento'} ${perLabel(x)} · prossima ${fmtDate(x.next)}${x.cat?` · <span style="color:${esc(c)}">${esc(x.cat)}</span>`:''}${x.active===false?' · in pausa':''}</span>${x.note?`<span style="display:block">${esc(x.note)}</span>`:''}</div>
    ${x.amt?`<div class="aa2"><b>${eur(+x.amt)}</b><span>${perLabel(x)}${(x.u||'m')!=='m'||(+x.n||1)!==1?` · ${eur(monthly(x))}/mese`:''}</span></div>`:''}
    <div class="acts">${x.active===false?'':`<button class="btn sm ok" data-pay>${x.kind==='doc'?'Rinnovato':'Pagato'}</button>`}<button class="btn sm ghost" data-edit>Modifica</button></div></div>`;}).join(''):
    `<div class="empty">${ico('repeat')}<b>Nessun abbonamento o scadenza</b>Aggiungi Netflix, palestra, assicurazione, bollo, revisione, passaporto…: Capri ti avvisa prima che scadano e ti dice quanto spendi al mese.</div>`;
}
$('#a-list').addEventListener('click',e=>{const row=e.target.closest('[data-ab]');if(!row)return;const x=S.abb.find(y=>y.id===row.dataset.ab);if(!x)return;if(e.target.closest('[data-pay]'))payModal(x);else abbModal(x);});
/* ================= FINANZE (hub) ================= */
function renderFin(){
  const sub=S.fsub;
  $$('#f-sub button').forEach(b=>b.classList.toggle('on',b.dataset.v===sub));
  $('#fp-spese').hidden=sub!=='spese';$('#fp-abb').hidden=sub!=='abb';$('#fp-fogli').hidden=sub!=='fogli';
  const A=$('#f-actions'),ST=$('#f-stats'),SU=$('#f-sum');
  const stat=a=>a.map(([n,l,c])=>`<div class="stat static" style="--c:${c}"><b>${n}</b><span>${l}</span></div>`).join('');
  if(sub==='spese'){
    A.innerHTML=`<button class="btn ghost" data-fa="tosheet">${ico('sheet')}Foglio del mese</button><button class="btn pri" data-fa="spesa">${ico('plus')}Spesa</button>`;
    const list=spOfMonth(S.month),tot=total(list),bud=totBudget(),cur=S.month===thisMonth();
    const[y,mo]=S.month.split('-').map(Number);const dim=new Date(y,mo,0).getDate();const days=cur?new Date().getDate():dim;
    const top=[...byCat(list).entries()].sort((a,b)=>b[1]-a[1])[0];
    SU.innerHTML=list.length?`A ${esc(monthName(S.month))} ${cur?'hai speso':'avevi speso'} <b>${eur(tot)}</b>${bud?` su un budget di ${eur(bud)}`:''}.${top?` La voce più grande è <b>${esc(top[0])}</b> (${eur(top[1])}).`:''}`:'Registra le spese al volo e guarda dove vanno i tuoi soldi, mese per mese.';
    ST.innerHTML=stat([[eur(tot),'Speso a '+monthName(S.month),'var(--fn)'],[bud?eur(Math.abs(bud-tot)):'—',bud?(tot>bud?'Oltre il budget':'Restano nel budget'):'Budget non impostato',bud&&tot>bud?'var(--u4)':'#fff'],[eur(tot/Math.max(1,days)),'Media al giorno','#fff'],[list.length,'Spese registrate','var(--mut)']]);
    renderSpese();
  }else if(sub==='abb'){
    A.innerHTML=`<button class="btn pri" data-fa="abb">${ico('plus')}Aggiungi</button>`;
    const act=abActive();const mt=act.reduce((s,x)=>s+monthly(x),0);
    const soon=act.filter(x=>{const n=daysTo(x.next);return n>=0&&n<=30;}).length,late=act.filter(x=>daysTo(x.next)<0).length;
    const nx=act.slice().sort((a,b)=>a.next.localeCompare(b.next))[0];
    SU.innerHTML=act.length?`${act.length} tra abbonamenti e scadenze attive.${nx?` La prossima è <b>${esc(nx.name)}</b>, ${relDays(daysTo(nx.next)).replace('scaduto','scaduta')}.`:''}`:'Abbonamenti, bollette fisse e scadenze di documenti: Capri ti avvisa prima e calcola quanto spendi.';
    ST.innerHTML=stat([[eur(mt),'Costo al mese','var(--og)'],[eur(mt*12),'Costo all\'anno','#fff'],[soon,'In scadenza entro 30 giorni','var(--u3)'],[late,'Scaduti','var(--u4)']]);
    renderAbb();
  }else{
    A.innerHTML=`<button class="btn ghost" data-fa="help">${ico('help')}Funzioni e formule</button><button class="btn pri" data-fa="sheet">${ico('plus')}Nuovo foglio</button>`;
    const n=S.sheets.length;ST.innerHTML='';
    SU.innerHTML=n?`${n} ${plural(n,'foglio','fogli')} di calcolo. Scrivi valori e formule direttamente nelle celle: si ricalcola tutto mentre scrivi.`:'Crea un foglio e scrivi valori e formule come in Excel: SOMMA, SE, CERCA.VERT, RATA e molte altre.';
    renderTabs();if(!S.ed)renderGrid();
  }
}
$('#f-actions').addEventListener('click',e=>{const b=e.target.closest('[data-fa]');if(!b)return;const a=b.dataset.fa;
  if(a==='spesa')spesaModal();else if(a==='abb')abbModal();else if(a==='sheet')newSheet();else if(a==='help')showHelp();else if(a==='tosheet')monthToSheet();});
$('#f-sub').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(S.ed)commitEdit(0,0,true);S.fsub=b.dataset.v;try{localStorage.setItem('capri-fsub',S.fsub);}catch(err){}history.replaceState(null,'','#'+({spese:'spese',abb:'abbonamenti',fogli:'fogli'}[S.fsub]));renderFin();});
/* ================= NOTE ================= */
const NCOL=['#22d3ee','#ffd60a','#ff4fd8','#1fe08f','#ff8a1f','#4d8dff','#a78bfa','#9a9aa3'];
function nFiltered(){
  let a=S.notes.slice();const f=S.nf;
  if(f.f==='pin')a=a.filter(n=>n.pin);else if(f.f==='liste')a=a.filter(n=>n.kind==='lista');
  if(f.q){const q=f.q.toLowerCase();a=a.filter(n=>[n.title,n.body,...(n.items||[]).map(i=>i.t)].join(' ').toLowerCase().includes(q));}
  return a.sort((x,y)=>(!!y.pin-!!x.pin)||(y.upd||0)-(x.upd||0));
}
function nCard(n,mini){
  const items=n.items||[],lista=n.kind==='lista',done=items.filter(i=>i.d).length,max=mini?4:12;
  return`<div class="nt" role="button" tabindex="0" data-nid="${esc(n.id)}" style="--c:${esc(n.color||NCOL[0])}"><h3>${esc(n.title||(lista?'Lista':'Nota'))}${n.pin?'<span class="pin" title="Fissata">●</span>':''}</h3>
  ${lista?items.slice(0,max).map((it,i)=>`<label class="ck${it.d?' done':''}" data-stop><input type="checkbox" data-ck="${i}" ${it.d?'checked':''}><span>${esc(it.t)}</span></label>`).join('')+(items.length>max?`<small style="margin-top:4px">+ altre ${items.length-max}</small>`:''):n.body?`<p${mini?' style="-webkit-line-clamp:4"':''}>${esc(n.body)}</p>`:''}
  <small>${fmtTime(n.upd||n.created)}${lista&&items.length?` · ${done}/${items.length} fatte`:''}</small></div>`;
}
function renderNotes(){
  const g=$('#n-grid');const list=nFiltered();
  $('#n-sum').innerHTML=S.notes.length?`${S.notes.length} ${plural(S.notes.length,'nota','note')}${S.notes.some(n=>n.pin)?`, ${S.notes.filter(n=>n.pin).length} fissate in alto e nella pagina Oggi`:''}. Si salvano da sole mentre scrivi.`:'Appunti, idee e liste (anche quella della spesa). Si salvano da sole.';
  if(!S.ready)return;
  g.innerHTML=list.length?list.map(n=>nCard(n)).join(''):(S.notes.length?`<div class="empty">${ico('search')}<b>Nessuna nota trovata</b></div>`:`<div class="empty">${ico('note')}<b>Nessuna nota</b>Premi “Nuova nota” per scrivere un appunto o una lista.</div>`);
}
function toggleCk(id,i){const n=S.notes.find(x=>x.id===id);if(!n)return;const b=body(n);b.items=b.items||[];if(!b.items[i])return;b.items[i].d=!b.items[i].d;b.upd=Date.now();put('note/'+id,b);}
function onNoteClick(e){
  const ck=e.target.closest('[data-ck]');const card=e.target.closest('[data-nid]');if(!card)return;
  if(ck){e.stopPropagation();toggleCk(card.dataset.nid,+ck.dataset.ck);return;}
  if(e.target.closest('[data-stop]'))return;
  const n=S.notes.find(x=>x.id===card.dataset.nid);if(n)noteModal(n);
}
$('#n-grid').addEventListener('click',onNoteClick);
$('#n-grid').addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.dataset.nid){const n=S.notes.find(x=>x.id===e.target.dataset.nid);if(n)noteModal(n);}});
$('#n-new').onclick=()=>noteModal(null);
$('#n-q').addEventListener('input',e=>{S.nf.q=e.target.value.trim();renderNotes();});
$('#n-filter').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;S.nf.f=b.dataset.v;$$('#n-filter button').forEach(x=>x.classList.toggle('on',x===b));renderNotes();});
function noteModal(n,kind){
  const isNew=!n;const d=n?clone(n):{id:uid(),title:'',body:'',kind:kind||'testo',items:[],color:NCOL[0],pin:false,created:Date.now()};
  d.items=d.items||[];const orig=JSON.stringify(body(d));let deleted=false;
  openModal(`<div class="mh"><h2>${isNew?'Nuova nota':'Nota'}</h2><button class="x" data-close aria-label="Chiudi">×</button></div>
  <div style="display:grid;gap:14px">
   <input id="nm-title" placeholder="Titolo" value="${esc(d.title)}" maxlength="140" style="font-size:20px;font-weight:700" ${isNew?'autofocus':''} aria-label="Titolo">
   <div class="seg" id="nm-kind" style="justify-self:start"><button data-v="testo" type="button">Testo</button><button data-v="lista" type="button">Lista con spunte</button></div>
   <textarea id="nm-body" rows="11" placeholder="Scrivi qui…" aria-label="Testo della nota">${esc(d.body)}</textarea>
   <div id="nm-list"></div>
   <div class="f"><span>Colore</span><div class="swatches">${NCOL.map(c=>`<label><input type="radio" name="nc" value="${c}" ${c===d.color?'checked':''}><i style="--c:${c}"></i></label>`).join('')}</div></div>
   <label class="f row"><input type="checkbox" id="nm-pin" ${d.pin?'checked':''}><span>Fissa in alto e nella pagina Oggi</span></label>
  </div>
  <div class="mf">${isNew?'':'<button class="btn danger" id="nm-del" type="button">Elimina</button>'}<span class="sp"></span><button class="btn pri" data-close type="button">Fatto</button></div>`,{wide:true,close:()=>{if(!deleted)saveN();}});
  const read=()=>{d.title=$('#nm-title').value.trim();d.body=$('#nm-body').value;d.color=(DLG.querySelector('[name=nc]:checked')||{}).value||d.color;d.pin=$('#nm-pin').checked;
    d.items=$$('#nm-list .cl-row').map(r=>({t:r.querySelector('[type=text]').value.trim(),d:r.querySelector('[type=checkbox]').checked})).filter(i=>i.t);};
  const drawList=()=>{$('#nm-list').innerHTML=d.items.map((it,i)=>`<div class="cl-row"><input type="checkbox" ${it.d?'checked':''} aria-label="Fatto"><input type="text" value="${esc(it.t)}" placeholder="Elemento"><button class="btn sm ghost" data-rm="${i}" type="button" aria-label="Rimuovi">×</button></div>`).join('')+`<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn ghost sm" id="nm-add" type="button">${ico('plus')}Aggiungi elemento</button>${d.items.some(i=>i.d)?'<button class="btn ghost sm" id="nm-clean" type="button">Togli quelli fatti</button>':''}</div>`;};
  const setKind=k=>{if(d.kind!==k){read();if(k==='lista'&&!d.items.length&&d.body.trim()){d.items=d.body.split('\n').map(t=>t.replace(/^\s*[-*•]\s*/,'').trim()).filter(Boolean).map(t=>({t,d:false}));d.body='';$('#nm-body').value='';}
      else if(k==='testo'&&!d.body.trim()&&d.items.length){d.body=d.items.map(i=>'- '+i.t).join('\n');d.items=[];$('#nm-body').value=d.body;}}
    d.kind=k;$$('#nm-kind button').forEach(b=>b.classList.toggle('on',b.dataset.v===k));$('#nm-body').hidden=k!=='testo';$('#nm-list').hidden=k!=='lista';if(k==='lista'){if(!d.items.length)d.items=[{t:'',d:false}];drawList();}};
  setKind(d.kind);
  $('#nm-kind').addEventListener('click',e=>{const b=e.target.closest('button');if(b)setKind(b.dataset.v);});
  $('#nm-list').addEventListener('click',e=>{const rm=e.target.closest('[data-rm]');if(rm){read();d.items.splice(+rm.dataset.rm,1);drawList();return;}
    if(e.target.closest('#nm-clean')){read();d.items=d.items.filter(i=>!i.d);if(!d.items.length)d.items=[{t:'',d:false}];drawList();return;}
    if(e.target.closest('#nm-add')){read();d.items.push({t:'',d:false});drawList();const ins=$$('#nm-list [type=text]');ins[ins.length-1].focus();}});
  $('#nm-list').addEventListener('change',e=>{if(e.target.type==='checkbox'){read();drawList();}});
  $('#nm-list').addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.type==='text'){e.preventDefault();read();const rows=$$('#nm-list .cl-row');const idx=rows.indexOf(e.target.closest('.cl-row'));const all=$$('#nm-list .cl-row').map(r=>({t:r.querySelector('[type=text]').value.trim(),d:r.querySelector('[type=checkbox]').checked}));all.splice(idx+1,0,{t:'',d:false});d.items=all;drawList();const ins=$$('#nm-list [type=text]');if(ins[idx+1])ins[idx+1].focus();}});
  function saveN(){
    read();const b=body(d);
    if(isNew&&!b.title&&!b.body.trim()&&!b.items.length)return;
    if(JSON.stringify(b)===orig)return;
    b.upd=Date.now();put('note/'+d.id,b);
  }
  const del=$('#nm-del');if(del)del.onclick=async()=>{if(!armed(del))return;deleted=true;closeModal();if(await drop('note/'+d.id))toast('Nota eliminata','ok');};
}
/* ================= OGGI ================= */
let OACT=[];
function renderOggi(){
  if(!S.ready)return;
  OACT=[];const A=fn=>{OACT.push(fn);return OACT.length-1;};
  const c=cfg();let name=(c.name||'').trim();
  if(!name&&EMAIL){name=EMAIL.split('@')[0].replace(/[._\d]+/g,' ').trim().split(' ')[0]||'';name=cap(name);}
  const h=new Date().getHours();const greet=h<5?'Buonanotte':h<13?'Buongiorno':h<18?'Buon pomeriggio':'Buonasera';
  $('#o-hi').textContent=name?`${greet}, ${name}`:greet;
  {const u=$('#o-art use');if(u)u.setAttribute('href',h>=19||h<6?'#i-moon':'#i-home');}
  const act=S.tickets.filter(t=>t.status!=='fatto');
  const late=act.filter(t=>t.due&&daysTo(t.due)<0),soonT=act.filter(t=>t.due&&daysTo(t.due)>=0&&daysTo(t.due)<=1);
  const mList=spOfMonth(thisMonth()),mTot=total(mList),bud=totBudget();
  const abs=abActive().map(x=>({x,n:daysTo(x.next)})).sort((a,b)=>a.n-b.n);
  const due7=abs.filter(a=>a.n>=0&&a.n<=7);
  const al=[];
  late.sort((a,b)=>Date.parse(a.due)-Date.parse(b.due)).slice(0,3).forEach(t=>al.push({c:'var(--u4)',t:`<b>${esc(t.title)}</b>`,s:relDays(daysTo(t.due)),a:A(()=>ticketModal(t))}));
  if(late.length>3)al.push({c:'var(--u4)',t:`Altri ${late.length-3} ticket scaduti`,s:'vedi tutti',a:A(()=>{S.tf={...S.tf,status:'attivi',late:true,soon:false,urg:0};location.hash='#ticket';})});
  soonT.forEach(t=>al.push({c:'var(--u3)',t:`<b>${esc(t.title)}</b>`,s:'scade '+relDays(daysTo(t.due)),a:A(()=>ticketModal(t))}));
  abs.filter(a=>a.n<=(a.x.remind??7)).slice(0,5).forEach(({x,n})=>al.push({c:n<0?'var(--u4)':n<=2?'var(--u3)':'var(--og)',t:`<b>${esc(x.name)}</b>${x.amt?` · ${eur(+x.amt)}`:''}`,s:n<0?`scaduto da ${-n} ${plural(-n,'giorno','giorni')}`:n===0?'scade oggi':`tra ${n} ${plural(n,'giorno','giorni')}`,a:A(()=>payModal(x))}));
  if(bud&&mTot>bud)al.push({c:'var(--u4)',t:`Hai superato il budget di ${esc(monthName(thisMonth()))}`,s:`di ${eur(mTot-bud)}`,a:A(()=>{S.month=thisMonth();location.hash='#spese';})});
  else if(bud&&mTot>.85*bud)al.push({c:'var(--u2)',t:`Hai usato il ${Math.round(mTot/bud*100)}% del budget del mese`,s:`restano ${eur(bud-mTot)}`,a:A(()=>{S.month=thisMonth();location.hash='#spese';})});
  S.wish.filter(w=>(w.status||'voglio')==='voglio'&&w.target&&priceOf(w)!=null&&priceOf(w)<=w.target).slice(0,3).forEach(w=>al.push({c:'var(--u1)',t:`<b>${esc(w.name)}</b> è sotto il tuo prezzo obiettivo`,s:eur(priceOf(w)),a:A(()=>{location.hash='#wishlist';})}));
  if(!(CACHE.push&&CACHE.push.size)&&!(S.cfg&&S.cfg.notifHide))al.push({c:'var(--wt)',t:'Ricevi ogni giorno il riepilogo dei ticket sul telefono',s:'Attiva notifiche',a:A(()=>notifModal())});
  $('#o-alerts').innerHTML=al.map(x=>`<button class="alert" style="--c:${x.c}" data-oa="${x.a}"><span class="dot" style="--c:${x.c}"></span><span class="t">${x.t}</span><span class="s">${esc(x.s)}</span></button>`).join('');
  const parts=[];
  parts.push(act.length?`hai <b>${act.length} ${plural(act.length,'ticket aperto','ticket aperti')}</b>${late.length?` (${late.length} ${plural(late.length,'scaduto','scaduti')})`:''}`:'non hai ticket aperti');
  if(due7.length)parts.push(`<b>${due7.length} ${plural(due7.length,'scadenza','scadenze')}</b> nei prossimi 7 giorni`);
  parts.push(`questo mese hai speso <b>${eur(mTot)}</b>`);
  $('#o-sum').innerHTML=cap(parts.slice(0,-1).join(', ')+(parts.length>1?' e ':'')+parts[parts.length-1])+'.';
  const todo=act.slice().sort((a,b)=>(a.due?Date.parse(a.due):9e15)-(b.due?Date.parse(b.due):9e15)||(b.urg||2)-(a.urg||2)).slice(0,6);
  const card=(cl,icon,title,link,inner)=>`<div class="card" style="--c:${cl}"><h2>${ico(icon)}${title}${link?`<a href="${link[0]}">${link[1]} →</a>`:''}</h2>${inner}</div>`;
  const cTodo=card('var(--tk)','ticket','Da fare',['#ticket','Tutti'],todo.length?`<div class="rows">${todo.map(t=>{const n=daysTo(t.due);return`<div class="rowc"><button class="ckb" data-oa="${A(()=>toggleDone(t))}" title="Segna come completato" aria-label="Completa ${esc(t.title)}" style="--c:${URG[t.urg||2].c}"></button><button class="rowi" data-oa="${A(()=>ticketModal(t))}" style="--c:${URG[t.urg||2].c}"><span class="dot"></span><span class="t">${esc(t.title)}</span><span class="s${n!==null&&n<0?' late':n!==null&&n<=3?' soon':''}">${t.due?relDays(n):'senza scadenza'}</span></button></div>`;}).join('')}</div>`:`<p class="mini">Niente da fare. Goditela!</p>`);
  const pct=bud?Math.min(100,mTot/bud*100):0;
  const cMoney=card('var(--fn)','wallet','Spese di '+monthName(thisMonth()),['#spese','Dettagli'],`<div class="big">${eur(mTot)}</div>${bud?`<div class="prog"><i class="${mTot>bud?'over':''}" style="width:${pct.toFixed(1)}%"></i></div><p class="mini">${mTot>bud?`Oltre il budget di ${eur(mTot-bud)}`:`Restano ${eur(bud-mTot)} su ${eur(bud)}`}</p>`:`<p class="mini">${mList.length} ${plural(mList.length,'spesa','spese')} registrate · imposta un budget da Categorie e budget</p>`}<div class="rows" style="margin-top:12px">${cbarsHtml(mList,4)}</div><button class="btn sm ghost" style="margin-top:12px;width:100%" data-oa="${A(()=>spesaModal())}">${ico('plus')}Aggiungi spesa</button>`);
  const up=abs.filter(a=>a.n<=45).slice(0,6);
  const cNext=card('var(--og)','repeat','In arrivo',['#abbonamenti','Tutti'],up.length?`<div class="rows">${up.map(({x,n})=>`<button class="rowi" data-oa="${A(()=>payModal(x))}" style="--c:${n<0?'var(--u4)':n<=7?'var(--u3)':'var(--og)'}"><span class="dot"></span><span class="t">${esc(x.name)}</span><span class="s">${n<0?'scaduto':relDays(n)}</span>${x.amt?`<span class="a">${eur(+x.amt)}</span>`:''}</button>`).join('')}</div>`:`<p class="mini">Nessuna scadenza nei prossimi 45 giorni.</p><button class="btn sm ghost" style="margin-top:12px;width:100%" data-oa="${A(()=>abbModal())}">${ico('plus')}Aggiungi abbonamento o scadenza</button>`);
  const wl=S.wish.filter(w=>(w.status||'voglio')==='voglio');
  const deals=wl.filter(w=>(w.target&&priceOf(w)!=null&&priceOf(w)<=w.target)||(wDelta(w)??0)<0);
  const show=(deals.length?deals:wl.slice().sort((a,b)=>(a.prio||2)-(b.prio||2))).slice(0,4);
  const cWish=card('var(--wl)','star',deals.length?'Occasioni in wishlist':'Wishlist',['#wishlist','Apri'],show.length?`<div class="rows">${show.map(w=>{const dl=wDelta(w);return`<button class="rowi" data-oa="${A(()=>{location.hash='#wishlist';})}" style="--c:${esc((catOf('wcats',w.cat)||{}).c||'#9a9aa3')}"><span class="dot"></span><span class="t">${esc(w.name)}</span>${dl!==null&&dl!==0?`<span class="s" style="color:${dl<0?'var(--u1)':'var(--u4)'}">${dl<0?'▼':'▲'} ${Math.abs(dl*100).toFixed(0)}%</span>`:''}<span class="a">${eur(priceOf(w))}</span></button>`;}).join('')}</div>`:`<p class="mini">La wishlist è vuota.</p>`);
  const pins=S.notes.filter(n=>n.pin).sort((a,b)=>(b.upd||0)-(a.upd||0)).slice(0,3);
  const cNotes=card('var(--nt)','note','Note fissate',['#note','Tutte'],pins.length?`<div class="onotes">${pins.map(n=>nCard(n,true)).join('')}</div>`:`<p class="mini">Fissa una nota per vederla qui.</p><button class="btn sm ghost" style="margin-top:12px;width:100%" data-oa="${A(()=>noteModal(null))}">${ico('plus')}Nuova nota</button>`);
  const dl=S.diary.slice().sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))||(b.created||0)-(a.created||0)).slice(0,3),stk=dStreak();
  const cDiary=card('var(--dy)','book','Diary',['#diary','Apri'],(dl.length?`<div class="rows">${dl.map(x=>`<button class="rowi" data-oa="${A(()=>diaryModal(x))}" style="--c:${esc(dcatCol(x.cat))}"><span class="dot"></span><span class="t">${esc(x.title||'Senza titolo')}</span><span class="s">${esc(relDays(daysTo(x.date)).replace('scaduto da','').replace('scaduto ieri','ieri').replace(/^ /,'')).replace(/^(\d+) giorni$/,'$1 giorni fa')}</span></button>`).join('')}</div>`:`<p class="mini">Cosa hai imparato oggi al lavoro?</p>`)+`${stk>1?`<p class="mini" style="margin-top:10px">🔥 ${stk} giorni di fila</p>`:''}<button class="btn sm ghost" style="margin-top:12px;width:100%" data-oa="${A(()=>diaryModal(null))}">${ico('plus')}Nuovo appunto</button>`);
  $('#o-dash').innerHTML=cTodo+habitsCard(card,A)+reviewCard(card,A)+cMoney+cNext+cDiary+cWish+cNotes;
}
$('#v-oggi').addEventListener('click',e=>{
  if(e.target.closest('.onotes')){onNoteClick(e);return;}
  const b=e.target.closest('[data-oa]');if(b){const f=OACT[+b.dataset.oa];if(f)f();return;}
  const q=e.target.closest('[data-quick]');if(q)quickAdd(q.dataset.quick);
});
function quickAdd(k){if(k==='spesa')spesaModal();else if(k==='ticket')ticketModal(null);else if(k==='nota')noteModal(null);else if(k==='lista')noteModal(null,'lista');else if(k==='abb')abbModal();}
$('#add-btn').onclick=()=>{
  openModal(`<div class="mh"><h2>Aggiungi</h2><button class="x" data-close aria-label="Chiudi">×</button></div>
  <div class="quick">
    <button style="--c:var(--fn)" data-q="spesa">${ico('wallet')}Spesa<span>Importo e categoria in due tocchi</span></button>
    <button style="--c:var(--tk)" data-q="ticket">${ico('ticket')}Ticket<span>Qualcosa da fare, con scadenza</span></button>
    <button style="--c:var(--nt)" data-q="nota">${ico('note')}Nota<span>Un appunto veloce</span></button>
    <button style="--c:var(--nt)" data-q="lista">${ico('note')}Lista<span>Spesa, cose da comprare…</span></button>
    <button style="--c:var(--og)" data-q="abb">${ico('repeat')}Abbonamento<span>O una scadenza da ricordare</span></button>
    <button style="--c:var(--wl)" data-q="wish">${ico('star')}Desiderio<span>Da aggiungere alla wishlist</span></button>
    <button style="--c:var(--dy)" data-q="diary">${ico('book')}Diary<span>Una cosa imparata al lavoro</span></button>
    <button style="--c:var(--cpg)" data-q="habit">${ico('check')}Abitudine<span>Una cosa da fare ogni giorno</span></button>
  </div>`);
  DLG.querySelector('.quick').addEventListener('click',e=>{const b=e.target.closest('[data-q]');if(!b)return;const k=b.dataset.q;closeModal();if(k==='wish')wishModal(null);else if(k==='diary')diaryModal(null);else if(k==='habit')habitModal(null);else quickAdd(k);});
};

/* ================= NOTIFICHE ================= */
const isIOS=/iphone|ipad|ipod/i.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
const standalone=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
let SWR=null;
if('serviceWorker' in navigator&&location.protocol!=='file:'){navigator.serviceWorker.register('sw.js',{scope:'./'}).then(r=>{SWR=r;}).catch(()=>{});}
try{if(navigator.clearAppBadge)navigator.clearAppBadge().catch(()=>{});}catch(e){}
const b64u=buf=>btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const ub64=s=>{s=String(s).replace(/-/g,'+').replace(/_/g,'/');while(s.length%4)s+='=';return Uint8Array.from(atob(s),c=>c.charCodeAt(0));};
const sha=async s=>b64u(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)));
const notifCfg=()=>({on:true,...((S.cfg&&S.cfg.notify)||{})});
const pushSupported=()=>'serviceWorker' in navigator&&'PushManager' in window&&'Notification' in window;
const myPushId=()=>{try{return localStorage.getItem('capri-push-id')||'';}catch(e){return'';}};
const pushOnHere=()=>pushSupported()&&Notification.permission==='granted'&&!!myPushId()&&CACHE.push&&CACHE.push.has(myPushId());
async function vapidKeys(){
  const m=CACHE.pushkeys&&CACHE.pushkeys.get('vapid');
  if(m&&m.publicKey&&m.privateKey)return m;
  const kp=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
  const pub=b64u(await crypto.subtle.exportKey('raw',kp.publicKey));
  const jwk=await crypto.subtle.exportKey('jwk',kp.privateKey);
  const k={publicKey:pub,privateKey:jwk.d,subject:'mailto:'+(EMAIL||'capri@example.com'),created:Date.now()};
  await put('pushkeys/vapid',k);return k;
}
async function swReady(){if(SWR)return SWR;return Promise.race([navigator.serviceWorker.ready,sleep(8000).then(()=>{throw new Error('service worker non pronto');})]);}
async function enableNotif(){
  if(!pushSupported()){toast(isIOS&&!standalone()?'Su iPhone le notifiche funzionano solo aprendo Capri dall\'icona nella schermata Home.':'Questo browser non supporta le notifiche push.','err');return false;}
  const perm=await Notification.requestPermission();
  if(perm!=='granted'){toast('Permesso non concesso. Puoi attivarlo da Impostazioni → Notifiche → Capri.','err');return false;}
  try{
    const reg=await swReady();const k=await vapidKeys();
    let sub=await reg.pushManager.getSubscription();
    if(sub){const cur=sub.options&&sub.options.applicationServerKey?b64u(sub.options.applicationServerKey):null;if(cur&&cur!==k.publicKey){await sub.unsubscribe();sub=null;}}
    if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:ub64(k.publicKey)});
    const j=sub.toJSON();const id=(await sha(j.endpoint)).slice(0,24);
    await put('push/'+id,{sub:j,dev:isIOS?'iPhone':(navigator.userAgentData&&navigator.userAgentData.platform)||'Browser',at:Date.now()});
    try{localStorage.setItem('capri-push-id',id);}catch(e){}
    {const cur=(S.cfg&&S.cfg.notify)||{};if(cur.on===false)await put('config/main',{...(S.cfg||{}),notify:{...cur,on:true}});}
    return true;
  }catch(e){toast('Attivazione non riuscita: '+errMsg(e),'err');return false;}
}
async function disableNotif(){
  try{const reg=await swReady();const sub=await reg.pushManager.getSubscription();if(sub)await sub.unsubscribe();}catch(e){}
  const id=myPushId();if(id)await drop('push/'+id);try{localStorage.removeItem('capri-push-id');}catch(e){}
}
const DAYS=['L','M','M','G','V','S','D'];
const notifData=()=>({tickets:S.tickets,abb:S.abb,spese:S.spese,diary:S.diary,habits:hList(),cfg:{name:cfg().name,scats:cfg().scats,sbudget:cfg().sbudget}});
function previewDigest(){const sl=CapriDigest.slots(notifCfg())[0];return CapriDigest.forSlot(sl,notifData(),new Date());}
async function testNotif(slot){
  const sl=slot||CapriDigest.slots(notifCfg())[0];
  const p=CapriDigest.forSlot(sl,notifData(),new Date())||{title:'Capri',body:'Oggi questa notifica non partirebbe: non c\'è niente da segnalare ✨'};
  try{const reg=await swReady();await reg.showNotification(p.title,{body:p.body,icon:'icon-192.png',badge:'badge-96.png',tag:'capri-test-'+(sl.id||''),data:{url:p.url||'./#oggi'}});toast('Anteprima inviata','ok');}
  catch(e){toast('Anteprima non riuscita: '+errMsg(e),'err');}
}
function notifModal(){
  const on=pushOnHere(),devs=CACHE.push?CACHE.push.size:0,needInstall=isIOS&&!standalone();
  let list=clone(CapriDigest.slots(notifCfg())).map((x,i)=>({id:x.id||('s'+(i+1)),h:+x.h||0,kind:x.kind||'riepilogo',days:Array.isArray(x.days)?x.days:CapriDigest.ALL.slice(),title:x.title||'',text:x.text||''}));
  let sel=0;
  openModal(`<div class="mh"><h2>Notifiche</h2><button class="x" data-close aria-label="Chiudi">×</button></div>
  <p class="mini" style="margin:0 0 14px">Decidi quante notifiche ricevere, a che ora, in quali giorni e cosa devono dirti. Le notifiche con i ticket o le scadenze partono solo se c'è qualcosa da segnalare.</p>
  ${needInstall?`<div class="note-box" style="margin-bottom:14px;border-color:var(--u2)"><b>Prima un passaggio su iPhone</b><br>Le notifiche funzionano solo dall'app installata: in Safari tocca Condividi → “Aggiungi alla schermata Home”, poi apri Capri dall'icona e torna qui.</div>`:''}
  <div id="sl-list" class="slots"></div>
  <button class="btn ghost sm" id="sl-add" type="button" style="margin-top:10px">${ico('plus')}Aggiungi una notifica</button>
  <h3 style="margin:20px 0 8px;font-size:15px">Anteprima</h3>
  <div class="notif-prev" id="sl-prev"></div>
  <p class="mini" style="margin-top:10px">${on?'✅ Attive su questo dispositivo.':'Non ancora attive su questo dispositivo.'}${devs?` Dispositivi iscritti: ${devs}.`:''} Possono arrivare con qualche minuto di ritardo rispetto all'ora scelta.</p>
  <div class="mf">${on?'<button class="btn danger" id="nt-off" type="button">Disattiva qui</button><button class="btn ghost" id="nt-test" type="button">Prova sul telefono</button>':''}<span class="sp"></span><button class="btn pri" id="nt-on" type="button">${on?'Salva':'Salva e attiva'}</button></div>`,{wide:true});
  const kindOpts=k=>Object.entries(CapriDigest.KINDS).map(([v,n])=>`<option value="${v}" ${k===v?'selected':''}>${esc(n)}</option>`).join('');
  const drawPrev=()=>{const sl=list[sel]||list[0];const el=$('#sl-prev');if(!el)return;if(!sl){el.innerHTML='<p class="mini" style="margin:0">Nessuna notifica impostata: non riceverai niente.</p>';return;}
    const p=CapriDigest.forSlot(sl,notifData(),new Date());
    el.innerHTML=`<div class="np-app"><svg><use href="#i-logo"/></svg><span>CAPRI</span><small>${String(sl.h).padStart(2,'0')}:00</small></div>`+(p?`<b>${esc(p.title)}</b><p>${esc(p.body)}</p>`:`<p class="mini" style="margin:0">Oggi questa non partirebbe: non c'è niente da segnalare ✨</p>`);};
  const draw=()=>{
    $('#sl-list').innerHTML=list.map((x,i)=>`<div class="slot${i===sel?' on':''}" data-i="${i}">
      <div class="sl-top"><select class="sl-h" aria-label="Ora">${Array.from({length:24},(_,h)=>`<option value="${h}" ${x.h===h?'selected':''}>${String(h).padStart(2,'0')}:00</option>`).join('')}</select>
      <select class="sl-k" aria-label="Contenuto">${kindOpts(x.kind)}</select>
      <button class="btn sm ghost sl-del" type="button" aria-label="Elimina questa notifica">×</button></div>
      <div class="sl-days" role="group" aria-label="Giorni">${DAYS.map((d,j)=>`<button type="button" class="${x.days.includes(j)?'on':''}" data-d="${j}" aria-pressed="${x.days.includes(j)}">${d}</button>`).join('')}</div>
      ${x.kind==='custom'?`<div class="sl-c"><input class="sl-t" maxlength="60" placeholder="Titolo, es. 💧 Pausa acqua" value="${esc(x.title)}"><input class="sl-x" maxlength="160" placeholder="Testo, es. Bevi un bicchiere d'acqua" value="${esc(x.text)}"></div>`:''}
    </div>`).join('')||'<p class="mini">Nessuna notifica. Aggiungine una qui sotto.</p>';
    $('#sl-add').hidden=list.length>=8;drawPrev();
  };
  draw();
  const row=e=>{const r=e.target.closest('.slot');return r?+r.dataset.i:-1;};
  $('#sl-list').addEventListener('change',e=>{const i=row(e);if(i<0)return;sel=i;const x=list[i];
    if(e.target.classList.contains('sl-h'))x.h=+e.target.value;
    if(e.target.classList.contains('sl-k')){x.kind=e.target.value;draw();return;}
    drawPrev();$$('#sl-list .slot').forEach((r,j)=>r.classList.toggle('on',j===sel));});
  $('#sl-list').addEventListener('input',e=>{const i=row(e);if(i<0)return;sel=i;const x=list[i];if(e.target.classList.contains('sl-t'))x.title=e.target.value;if(e.target.classList.contains('sl-x'))x.text=e.target.value;drawPrev();});
  $('#sl-list').addEventListener('click',e=>{const i=row(e);if(i<0)return;
    if(e.target.closest('.sl-del')){list.splice(i,1);sel=Math.max(0,Math.min(sel,list.length-1));draw();return;}
    const d=e.target.closest('[data-d]');if(d){const x=list[i],j=+d.dataset.d;x.days=x.days.includes(j)?x.days.filter(k=>k!==j):[...x.days,j].sort();if(!x.days.length){x.days=[j];toast('Serve almeno un giorno','err');}}
    if(sel!==i||d){sel=i;draw();}});
  $('#sl-add').onclick=()=>{const used=new Set(list.map(x=>x.h));let h=[8,13,18,21,10,15,20,12].find(v=>!used.has(v));if(h===undefined)h=9;list.push({id:'s'+uid().slice(-6),h,kind:list.length?'custom':'riepilogo',days:CapriDigest.ALL.slice(),title:'',text:''});sel=list.length-1;draw();};
  const saveCfg=async()=>{
    for(const x of list)if(x.kind==='custom'&&!x.title.trim()&&!x.text.trim()){toast('Scrivi il testo del messaggio personale','err');return false;}
    list.sort((a,b)=>a.h-b.h);
    await put('config/main',{...(S.cfg||{}),notify:{...notifCfg(),on:true,weeklyAdded:true,slots:list.map(x=>({id:x.id,h:x.h,kind:x.kind,days:x.days,...(x.kind==='custom'?{title:x.title.trim(),text:x.text.trim()}:{})}))}});
    return true;
  };
  $('#nt-on').onclick=async()=>{const b=$('#nt-on');b.disabled=true;if(!await saveCfg()){b.disabled=false;return;}
    if(!on){b.textContent='Attivazione…';const ok=await enableNotif();if(ok){toast('Notifiche attive ✨','ok');closeModal();setTimeout(()=>testNotif(list[0]),400);renderOggi();return;}b.disabled=false;b.textContent='Salva e attiva';return;}
    closeModal();toast('Notifiche salvate','ok');};
  const t=$('#nt-test');if(t)t.onclick=()=>testNotif(list[sel]||list[0]);
  const off=$('#nt-off');if(off)off.onclick=async()=>{if(!armed(off))return;await disableNotif();closeModal();toast('Notifiche disattivate su questo dispositivo','ok');renderOggi();};
}

/* ================= DIARY ================= */
S.diary=[];S.df={cat:'',q:'',tag:''};
const dcatCol=n=>(cfg().dcats.find(c=>c.n===n)||{}).c||'#9a9aa3';
function inl(s){return s.replace(/`([^`]+)`/g,'<code>$1</code>').replace(/\*\*([^*]+)\*\*/g,'<b>$1</b>').replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g,'$1<a href="$2" target="_blank" rel="noopener">$2</a>');}
function md(t){
  return String(t||'').split('```').map((b,i)=>{
    if(i%2)return`<pre><code>${esc(b.replace(/^[\w-]*\n/,'').replace(/\n$/,''))}</code></pre>`;
    let out='',list=false;
    for(const l of esc(b).split('\n')){
      const m=l.match(/^\s*[-*•]\s+(.*)$/);
      if(m){if(!list){out+='<ul>';list=true;}out+='<li>'+inl(m[1])+'</li>';continue;}
      if(list){out+='</ul>';list=false;}
      const h=l.match(/^#{1,3}\s+(.*)$/);
      if(h){out+='<h4>'+inl(h[1])+'</h4>';continue;}
      if(l.trim())out+='<p>'+inl(l)+'</p>';
    }
    if(list)out+='</ul>';return out;
  }).join('');
}
const dTags=x=>(x.tags||[]).filter(Boolean);
function dStreak(){
  const days=new Set(S.diary.map(x=>x.date).filter(Boolean));let n=0;const d=new Date();
  if(!days.has(isoDay(d)))d.setDate(d.getDate()-1);
  while(days.has(isoDay(d))){n++;d.setDate(d.getDate()-1);}
  return n;
}
function dFiltered(){
  const f=S.df;let a=S.diary.slice();
  if(f.cat)a=a.filter(x=>x.cat===f.cat);
  if(f.tag)a=a.filter(x=>dTags(x).includes(f.tag));
  if(f.q){const q=f.q.toLowerCase();a=a.filter(x=>[x.title,x.body,x.cat,...dTags(x)].join(' ').toLowerCase().includes(q));}
  return a.sort((x,y)=>(!!y.pin-!!x.pin)||String(y.date||'').localeCompare(String(x.date||''))||(y.created||0)-(x.created||0));
}
function dyCard(x){
  const c=dcatCol(x.cat),tags=dTags(x);
  return`<article class="dy" style="--c:${esc(c)}" data-did="${esc(x.id)}" tabindex="0">
    <div class="dy-h">${x.cat?`<span class="chip" style="--c:${esc(c)}">${esc(x.cat)}</span>`:''}<time>${fmtDate(x.date)}</time>${x.pin?'<span class="pin" title="Fissato">●</span>':''}</div>
    <h3>${esc(x.title||'Senza titolo')}</h3>
    ${x.body?`<div class="dy-body md">${md(x.body)}</div>`:''}
    ${tags.length?`<div class="dy-tags">${tags.map(t=>`<button class="tag" type="button" data-tag="${esc(t)}">#${esc(t)}</button>`).join('')}</div>`:''}
  </article>`;
}
function renderDiary(){
  const all=S.diary,now=new Date(),wk=new Date(now);wk.setDate(now.getDate()-6);const wks=isoDay(wk);
  const week=all.filter(x=>String(x.date||'')>=wks).length,streak=dStreak();
  const used=new Set(all.map(x=>x.cat).filter(Boolean)).size;
  $('#dy-stats').innerHTML=[[all.length,'Appunti in totale','var(--dy)'],[week,'Negli ultimi 7 giorni','#fff'],[streak,streak===1?'Giorno di fila':'Giorni di fila','var(--cpg)'],[used,'Categorie usate','var(--mut)']].map(([n,l,c])=>`<div class="stat static" style="--c:${c}"><b>${n}</b><span>${l}</span></div>`).join('');
  const last=all.slice().sort((a,b)=>(b.created||0)-(a.created||0))[0];
  $('#dy-sum').innerHTML=all.length?`${week?`Negli ultimi 7 giorni hai annotato <b>${week} ${plural(week,'cosa','cose')}</b>.`:'Questa settimana non hai ancora annotato niente.'}${last?` L'ultima: <b>${esc(last.title||'senza titolo')}</b>${last.cat?` in ${esc(last.cat)}`:''}.`:''}`:'Annota quello che impari al lavoro: comandi, procedure, consigli, errori da non ripetere. Tutto diviso per macrocategorie e sempre ricercabile.';
  const counts=new Map();all.forEach(x=>counts.set(x.cat||'',(counts.get(x.cat||'')||0)+1));
  const cats=cfg().dcats.slice();for(const k of counts.keys())if(k&&!cats.some(c=>c.n===k))cats.push({n:k,c:'#9a9aa3'});
  $('#dy-cats').innerHTML=`<button class="dc${!S.df.cat?' on':''}" data-dc="" style="--c:var(--dy)"><i></i><span>Tutte</span><b>${all.length}</b></button>`+cats.map(c=>`<button class="dc${S.df.cat===c.n?' on':''}" data-dc="${esc(c.n)}" style="--c:${esc(c.c)}"><i></i><span>${esc(c.n)}</span><b>${counts.get(c.n)||0}</b></button>`).join('')+`<button class="dc dc-m" id="dy-cm" type="button">${ico('tag')}<span>Gestisci categorie</span></button>`;
  $('#dy-tagf').innerHTML=S.df.tag?`<button class="tag on" type="button" data-untag>#${esc(S.df.tag)} ×</button>`:'';
  if(!S.ready)return;
  const list=dFiltered();const g=$('#dy-list');
  if(!list.length){g.innerHTML=all.length?`<div class="empty">${ico('search')}<b>Nessun appunto trovato</b>Cambia categoria o ricerca.</div>`:`<div class="empty">${ico('book')}<b>Il diario è vuoto</b>Premi “Nuovo appunto” e scrivi la prima cosa che hai imparato oggi.</div>`;return;}
  let html='',cur='';
  const pins=list.filter(x=>x.pin),rest=list.filter(x=>!x.pin);
  if(pins.length)html+=`<h2 class="dy-m">Fissati</h2>`+pins.map(dyCard).join('');
  for(const x of rest){const m=String(x.date||'').slice(0,7);if(m&&m!==cur){cur=m;html+=`<h2 class="dy-m">${esc(monthLabel(m))}</h2>`;}html+=dyCard(x);}
  g.innerHTML=html;
}
$('#dy-cats').addEventListener('click',e=>{if(e.target.closest('#dy-cm')){catManager('dcats');return;}const b=e.target.closest('[data-dc]');if(!b)return;S.df.cat=b.dataset.dc;renderDiary();});
$('#dy-q').addEventListener('input',e=>{S.df.q=e.target.value.trim();renderDiary();});
$('#dy-tagf').addEventListener('click',e=>{if(e.target.closest('[data-untag]')){S.df.tag='';renderDiary();}});
$('#dy-list').addEventListener('click',e=>{
  const t=e.target.closest('[data-tag]');if(t){e.stopPropagation();S.df.tag=t.dataset.tag;renderDiary();scrollTo(0,0);return;}
  if(e.target.closest('a'))return;
  const c=e.target.closest('[data-did]');if(!c)return;const x=S.diary.find(y=>y.id===c.dataset.did);if(x)diaryModal(x);
});
$('#dy-list').addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.dataset.did){const x=S.diary.find(y=>y.id===e.target.dataset.did);if(x)diaryModal(x);}});
$('#dy-new').onclick=()=>diaryModal(null);
function diaryModal(x){
  const isNew=!x;
  const d=x?clone(x):{id:uid(),title:'',body:'',cat:'',tags:[],date:isoDay(),pin:false,created:Date.now()};
  d.tags=d.tags||[];const orig=JSON.stringify(body(d));let deleted=false;
  const cats=cfg().dcats.slice();if(d.cat&&!cats.some(c=>c.n===d.cat))cats.push({n:d.cat,c:'#9a9aa3'});
  const allTags=[...new Set(S.diary.flatMap(dTags))].sort();
  openModal(`<div class="mh"><h2>${isNew?'Nuovo appunto':'Appunto'}</h2><button class="x" data-close aria-label="Chiudi">×</button></div>
  <div style="display:grid;gap:14px">
    <input id="dm-title" placeholder="Cosa hai imparato? Es. Come si fa il rebase su Git" value="${esc(d.title)}" maxlength="160" style="font-size:20px;font-weight:700" ${isNew?'autofocus':''} aria-label="Titolo">
    <div class="f"><span>Macrocategoria</span><div class="chips" id="dm-cat">${cats.map(c=>`<label style="--c:${esc(c.c)}"><input type="radio" name="dcat" value="${esc(c.n)}" ${c.n===d.cat?'checked':''}><b>${esc(c.n)}</b></label>`).join('')}</div></div>
    <div class="form"><label class="f"><span>Data</span><input type="date" id="dm-date" value="${esc(d.date||isoDay())}"></label>
      <label class="f two"><span>Tag (separati da virgola)</span><input id="dm-tags" list="dm-tl" value="${esc(d.tags.join(', '))}" placeholder="es. git, excel, cliente-rossi"><datalist id="dm-tl">${allTags.map(t=>`<option value="${esc(t)}">`).join('')}</datalist></label></div>
    <div class="seg" id="dm-mode" style="justify-self:start"><button data-v="w" type="button" class="on">Scrivi</button><button data-v="p" type="button">Anteprima</button></div>
    <textarea id="dm-body" rows="12" placeholder="Scrivi qui i dettagli. Puoi usare **grassetto**, \`codice\`, elenchi con - e blocchi di codice tra \`\`\`">${esc(d.body)}</textarea>
    <div id="dm-prev" class="md dy-prev" hidden></div>
    <label class="f row"><input type="checkbox" id="dm-pin" ${d.pin?'checked':''}><span>Fissa in alto</span></label>
  </div>
  <div class="mf">${isNew?'':'<button class="btn danger" id="dm-del" type="button">Elimina</button>'}<span class="sp"></span><button class="btn pri" data-close type="button">Fatto</button></div>`,{wide:true,close:()=>{if(!deleted)save();}});
  const read=()=>{d.title=$('#dm-title').value.trim();d.body=$('#dm-body').value;d.cat=(DLG.querySelector('[name=dcat]:checked')||{}).value||'';d.date=$('#dm-date').value||isoDay();
    d.tags=[...new Set($('#dm-tags').value.split(',').map(t=>t.trim().replace(/^#/,'').toLowerCase()).filter(Boolean))];d.pin=$('#dm-pin').checked;};
  $('#dm-mode').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;$$('#dm-mode button').forEach(x=>x.classList.toggle('on',x===b));const p=b.dataset.v==='p';
    if(p){$('#dm-prev').innerHTML=md($('#dm-body').value)||'<p class="mini">Niente da mostrare.</p>';}$('#dm-body').hidden=p;$('#dm-prev').hidden=!p;});
  function save(){read();const b=body(d);if(isNew&&!b.title&&!b.body.trim())return;if(JSON.stringify(b)===orig)return;b.upd=Date.now();put('diary/'+d.id,b).then(ok=>{if(ok&&isNew)toast('Appunto salvato','ok');});}
  const del=$('#dm-del');if(del)del.onclick=async()=>{if(!armed(del))return;deleted=true;closeModal();if(await drop('diary/'+d.id))toast('Appunto eliminato','ok');};
}

/* ================= PC SVEGLIO (Screen Wake Lock) ================= */
let WL=null;
const touchOnly=()=>matchMedia('(pointer:coarse)').matches&&!matchMedia('(pointer:fine)').matches;
const wakeWanted=()=>{try{const v=localStorage.getItem('capri-wake');return v===null?!touchOnly():v==='1';}catch(e){return!touchOnly();}};
const wakeActive=()=>!!(WL&&!WL.released);
function paintWake(){const on=wakeActive();document.body.classList.toggle('awake',on);const b=$('.brand');if(b)b.title=on?'Capri sta tenendo sveglio il computer':(wakeWanted()&&!('wakeLock' in navigator)?'Questo browser non permette di tenere sveglio il computer':'');}
async function wakeOn(){
  if(!wakeWanted()||!('wakeLock' in navigator)||document.visibilityState!=='visible'||wakeActive()){paintWake();return;}
  try{WL=await navigator.wakeLock.request('screen');WL.addEventListener('release',paintWake);}catch(e){WL=null;}
  paintWake();
}
async function wakeOff(){try{if(WL)await WL.release();}catch(e){}WL=null;paintWake();}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')wakeOn();});
['pointerdown','keydown'].forEach(ev=>document.addEventListener(ev,()=>{if(wakeWanted()&&!wakeActive())wakeOn();},{passive:true}));
setInterval(()=>{if(wakeWanted()&&document.visibilityState==='visible'&&!wakeActive())wakeOn();},30000);
wakeOn();

/* ================= MUSICA: player per i brani del PC ================= */
/* SHA-256 e HMAC sincroni: le firme si calcolano subito, così su iPhone il tocco avvia l'audio senza attese */
const SHA_K=new Uint32Array([0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2]);
function sha256(bytes){
  const l=bytes.length,n=((l+9+63)>>6)<<6,m=new Uint8Array(n);m.set(bytes);m[l]=0x80;const dv=new DataView(m.buffer);dv.setUint32(n-4,l*8>>>0);dv.setUint32(n-8,Math.floor(l/0x20000000));
  const H=new Uint32Array([0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19]),W=new Uint32Array(64),r=(x,k)=>(x>>>k)|(x<<(32-k));
  for(let o=0;o<n;o+=64){for(let i=0;i<16;i++)W[i]=dv.getUint32(o+i*4);
    for(let i=16;i<64;i++){const a=W[i-15],b=W[i-2];W[i]=(W[i-16]+(r(a,7)^r(a,18)^(a>>>3))+W[i-7]+(r(b,17)^r(b,19)^(b>>>10)))>>>0;}
    let [a,b,c,d,e,f,g,h]=H;
    for(let i=0;i<64;i++){const t1=(h+(r(e,6)^r(e,11)^r(e,25))+((e&f)^(~e&g))+SHA_K[i]+W[i])>>>0,t2=((r(a,2)^r(a,13)^r(a,22))+((a&b)^(a&c)^(b&c)))>>>0;h=g;g=f;f=e;e=(d+t1)>>>0;d=c;c=b;b=a;a=(t1+t2)>>>0;}
    H[0]+=a;H[1]+=b;H[2]+=c;H[3]+=d;H[4]+=e;H[5]+=f;H[6]+=g;H[7]+=h;}
  const out=new Uint8Array(32),ov=new DataView(out.buffer);H.forEach((v,i)=>ov.setUint32(i*4,v));return out;
}
function hmac256(key,msg){const enc=new TextEncoder();let k=enc.encode(key);if(k.length>64)k=sha256(k);const kb=new Uint8Array(64);kb.set(k);
  const ip=kb.map(x=>x^0x36),op=kb.map(x=>x^0x5c),m=enc.encode(msg),a=new Uint8Array(64+m.length);a.set(ip);a.set(m,64);const ih=sha256(a),b=new Uint8Array(96);b.set(op);b.set(ih,64);return sha256(b);}

const MU={tab:'brani',q:'',sel:null,lib:[],by:{},libAt:0,libHost:'',limit:200,queue:[],orig:[],qi:-1,shuffle:false,repeat:'off',from:'',errs:0,sigs:new Map(),lists:{},reach:null,err:'',seeking:false,stKey:''};
const AU=new Audio();AU.preload='metadata';
let MACT=[];
const muDoc=id=>(CACHE.music&&CACHE.music.get(id))||null;
const muHost=()=>muDoc('host');
const muKey=()=>{const d=muDoc('key');return d&&d.key&&d.key.length>=32?d.key:'';};
const muOnline=()=>{const h=muHost();return !!(h&&h.url&&Date.now()-(+h.at||0)<150000)&&MU.reach!==false;};
const muLikes=()=>new Set((muDoc('likes')||{}).ids||[]);
const muPls=()=>[...((CACHE.playlists||new Map()).entries())].map(([id,d])=>({...d,id})).sort((a,b)=>(a.created||0)-(b.created||0));
const fmtDur=s=>{s=Math.max(0,Math.round(+s||0));const h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=String(s%60).padStart(2,'0');return h?`${h}:${String(m).padStart(2,'0')}:${x}`:`${m}:${x}`;};
const norm=x=>String(x||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
function muSig(what){const k=muKey();if(!k)return'';const e=Math.ceil(Date.now()/1000/21600)*21600+21600,ck=what+'.'+e;
  let q=MU.sigs.get(ck);if(!q){q=`e=${e}&s=${b64u(hmac256(k,ck).buffer).slice(0,32)}`;if(MU.sigs.size>4000)MU.sigs.clear();MU.sigs.set(ck,q);}return q;}
function muUrl(kind,id){const h=muHost();if(!h||!h.url)return'';const q=muSig(id?kind+'.'+id:kind);return q?`${h.url}/${id?kind+'/'+id:kind}?${q}`:'';}
const muDeleted=()=>((muDoc('deleted')||{}).ids)||{};
function muSetLib(j){const gone=muDeleted();MU.lib=(Array.isArray(j.tracks)?j.tracks:[]).filter(t=>!gone[t.i]);MU.libAt=j.at||0;MU.by={};const ac={};
  const ak=t=>(t.al||'')+'\u0001'+(t.aa||t.a||'').toLowerCase();
  for(const t of MU.lib){MU.by[t.i]=t;if(t.pic&&t.al&&!ac[ak(t)])ac[ak(t)]=t.i;}
  for(const t of MU.lib)t.cv=t.pic?t.i:(t.al&&ac[ak(t)])||'';}
try{const c=JSON.parse(localStorage.getItem('capri-mlib')||'null');if(c&&c.tracks){muSetLib(c);MU.libHost=c.host||'';}}catch(e){}
async function muLoadLib(force){
  const h=muHost();if(!h||!h.url||Date.now()-(+h.at||0)>150000){if(S.view==='musica')renderMusic();return;}
  if(!force&&MU.libHost===h.url&&MU.libAt&&h.info&&h.info.lib===MU.libAt&&MU.reach)return;
  if(MU.loading)return;MU.loading=true;
  try{const r=await fetch(muUrl('library'),{cache:'no-store'});if(!r.ok)throw new Error(r.status===403?'la chiave non coincide: riscarica il programma sul PC':'il PC ha risposto '+r.status);
    const j=await r.json();muSetLib(j);MU.libHost=h.url;MU.reach=true;MU.err='';try{localStorage.setItem('capri-mlib',JSON.stringify({...j,host:h.url}));}catch(e){}}
  catch(e){MU.reach=false;MU.err=/fetch|network|load/i.test(errMsg(e))?'il PC non risponde':errMsg(e);}
  MU.loading=false;if(S.view==='musica')renderMusic();mUI();
}
SUBS.music=()=>{const h=muHost(),st=[muOnline(),h&&h.url,h&&h.info&&h.info.lib,muKey(),[...muLikes()].join(),Object.keys(muDeleted()).join()].join('|');
  if(st===MU.stKey){muStatus();return;}const hostChanged=!MU.stKey||MU.stKey.split('|')[1]!==String(h&&h.url);MU.stKey=st;
  if(hostChanged)MU.reach=null;muLoadLib();if(S.view==='musica')renderMusic();mUI();};
SUBS.playlists=()=>{if(S.view==='musica')renderMusic();};

/* ---------- copertine (caricate solo quando si vedono) ---------- */
const muIO='IntersectionObserver' in window?new IntersectionObserver(es=>{for(const e of es){if(!e.isIntersecting)continue;muIO.unobserve(e.target);muFillCover(e.target);}},{rootMargin:'300px'}):null;
function muFillCover(el){const id=el.dataset.cv;if(!id||el.dataset.cvd)return;el.dataset.cvd=1;const u=muUrl('c',id);if(!u)return;
  const im=new Image();im.decoding='async';im.alt='';im.onload=()=>{el.textContent='';el.append(im);};im.onerror=()=>{};im.src=u;}
function muCovers(root){root.querySelectorAll('[data-cv]:not([data-cvd])').forEach(el=>muIO?muIO.observe(el):muFillCover(el));}
const cvId=list=>{const t=list.find(x=>x.cv);return t?t.cv:'';};
const mcv=(id,cls='')=>`<span class="mcv ${cls}"${id?` data-cv="${id}"`:''}>${ico('music')}</span>`;

/* ---------- raggruppamenti ---------- */
function muAlbums(list){const m=new Map();for(const t of list){const art=t.aa||t.a||'';const k=(t.al||'(senza album)')+'\u0001'+art.toLowerCase();if(!m.has(k))m.set(k,{k,al:t.al||'Senza album',a:art,tr:[]});m.get(k).tr.push(t);}
  const out=[...m.values()];for(const a of out){a.tr.sort((x,y)=>(x.dn||0)-(y.dn||0)||(x.n||0)-(y.n||0)||x.t.localeCompare(y.t));a.y=(a.tr.find(t=>t.y)||{}).y||'';a.cv=cvId(a.tr);}
  return out.sort((x,y)=>x.a.localeCompare(y.a,'it')||x.al.localeCompare(y.al,'it'));}
function muArtists(list){const m=new Map();for(const t of list){const a=t.a||'Artista sconosciuto';if(!m.has(a))m.set(a,{a,tr:[]});m.get(a).tr.push(t);}
  return [...m.values()].map(x=>({...x,cv:cvId(x.tr)})).sort((x,y)=>x.a.localeCompare(y.a,'it'));}
function muFilter(list){const q=norm(MU.q).trim();if(!q)return list;const w=q.split(/\s+/);return list.filter(t=>{const h=norm(t.t+' '+t.a+' '+t.al+' '+(t.aa||''));return w.every(x=>h.includes(x));});}

/* ---------- vista ---------- */
function muStatus(){
  const h=muHost(),on=muOnline(),n=MU.lib.length,key=muKey();
  const sum=$('#mu-sum'),acts=$('#mu-acts');if(!sum)return;
  if(!key||!h){sum.innerHTML='Ascolta qui, anche dal telefono, le canzoni che hai sul PC.';
    acts.innerHTML=`<button class="btn pri" data-ma="${MACT.push(muSetupModal)-1}">${ico('plus')}Collega un dispositivo</button>`;return;}
  if(on){sum.innerHTML=`<span class="mu-st on"><i></i>${esc((h.info&&h.info.name)||'Dispositivo')} acceso</span> · ${n.toLocaleString('it-IT')} ${plural(n,'brano','brani')}${MU.loading?' · aggiorno…':''}`;}
  else sum.innerHTML=`<span class="mu-st"><i></i>Nessun dispositivo acceso</span>${h.at?` · ultimo segnale da ${esc((h.info&&h.info.name)||'dispositivo')} ${esc(ago(+h.at))}`:''}${MU.err&&h.url?' · '+esc(MU.err):''}${n?` · vedi la libreria, ma per ascoltare serve il tablet (o il PC) acceso con Capri Musica`:''}`;
  acts.innerHTML=`<div class="mu-acts">${on&&n?`<button class="btn pri" data-ma="${MACT.push(()=>mPlayList(muFilter(MU.lib).map(t=>t.i),0,'Tutti i brani'))-1}"><svg><use href="#i-mplay"/></svg>Riproduci</button><button class="btn" data-ma="${MACT.push(()=>{MU.shuffle=true;const ids=muFilter(MU.lib).map(t=>t.i);mPlayList(ids,Math.floor(Math.random()*ids.length),'Tutti i brani');})-1}"><svg><use href="#i-shuffle"/></svg>Casuale</button>`:`<button class="btn" data-ma="${MACT.push(()=>{MU.reach=null;muLoadLib(true);})-1}">${ico('refresh')}Riprova</button>`}
    <button class="btn ghost" data-ma="${MACT.push(muSetupModal)-1}" aria-label="Impostazioni del collegamento">${ico('menu')}</button></div>`;
}
function renderMusic(){
  if(!S.ready)return;MACT=[];MU.lists={};muStatus();
  $$('#mu-tabs [data-mt]').forEach(b=>b.classList.toggle('on',b.dataset.mt===MU.tab));
  const body=$('#mu-body'),L=muLikes(),on=muOnline(),A=fn=>MACT.push(fn)-1;
  if(!MU.lib.length&&MU.tab!=='playlist'){
    body.innerHTML=!muKey()||!muHost()?`<div class="mu-empty"><b>Collega il tuo PC</b>Un piccolo programma sul PC legge la cartella Musica e la fa ascoltare qui, anche fuori casa. Funziona quando il PC è acceso.<br><br><button class="btn pri" data-ma="${A(muSetupModal)}">Collega un dispositivo</button></div>`
      :on?`<div class="mu-empty"><b>${MU.loading?'Carico la libreria…':'Nessun brano trovato'}</b>${MU.loading?'':'Controlla la cartella scelta sul PC (mp3, m4a, flac, ogg, wav).'}</div>`
      :`<div class="mu-empty"><b>Nessun dispositivo acceso</b>Accendi il tablet con Capri Musica aperto in Termux: la libreria comparirà qui entro un minuto.</div>`;
    return;}
  const rows=(list,ctx,numbered)=>{MU.lists[ctx]=list.map(t=>t.i);const cur=MU.queue[MU.qi];const shown=list.slice(0,MU.limit);
    return `<div class="mu-list">${shown.map((t,i)=>`<div class="mr${t.i===cur?' cur':''}${on?'':' off'}" data-mr="${i}" data-ctx="${ctx}"><span class="mn">${t.i===cur&&!AU.paused?'♪':numbered&&t.n?t.n:i+1}</span>${mcv(t.cv)}<span class="mt"><b>${esc(t.t)}</b><span>${esc(t.a)}</span></span><span class="mal">${esc(t.al)}</span><span class="md2">${t.d?fmtDur(t.d):''}</span><button class="mi${L.has(t.i)?' liked':''}" data-like="${t.i}" aria-label="Mi piace"><svg><use href="#i-heart"/></svg></button><button class="mi" data-more="${t.i}" aria-label="Altro">⋯</button></div>`).join('')}</div>
      ${list.length>shown.length?`<button class="btn ghost mu-more" data-ma="${A(()=>{MU.limit+=400;renderMusic();})}">Mostra altri ${Math.min(400,list.length-shown.length)} (${list.length-shown.length} in tutto)</button>`:''}`;};
  const head=(cv,kick,title,sub,ids,from,extra='')=>`<button class="btn ghost sm mu-back" data-ma="${A(()=>{MU.sel=null;MU.limit=200;renderMusic();scrollTo(0,0);})}">‹ Indietro</button>
    <div class="mu-head">${mcv(cv)}<div><p class="mini">${esc(kick)}</p><h2>${esc(title)}</h2><p>${sub}</p><div class="mu-acts">${on&&ids.length?`<button class="btn pri" data-ma="${A(()=>{MU.shuffle=false;mPlayList(ids,0,from);})}"><svg><use href="#i-mplay"/></svg>Riproduci</button><button class="btn" data-ma="${A(()=>{MU.shuffle=true;mPlayList(ids,Math.floor(Math.random()*ids.length),from);})}"><svg><use href="#i-shuffle"/></svg>Casuale</button>`:''}${extra}</div></div></div>`;
  const tot=list=>{const s=list.reduce((a,t)=>a+(+t.d||0),0);return `${list.length} ${plural(list.length,'brano','brani')}${s?' · '+(s>=3600?Math.floor(s/3600)+' h '+Math.round(s%3600/60)+' min':Math.round(s/60)+' min'):''}`;};
  let html='';const sel=MU.sel;
  if(sel&&sel.k==='album'){const a=muAlbums(MU.lib).find(x=>x.k===sel.id);if(!a){MU.sel=null;return renderMusic();}
    html=head(a.cv,'Album',a.al,`${esc(a.a)}${a.y?' · '+esc(a.y):''} · ${tot(a.tr)}`,a.tr.map(t=>t.i),a.al)+rows(a.tr,'sel',true);}
  else if(sel&&sel.k==='artist'){const ar=muArtists(MU.lib).find(x=>x.a===sel.id);if(!ar){MU.sel=null;return renderMusic();}
    const als=muAlbums(ar.tr);
    html=head(ar.cv,'Artista',ar.a,`${tot(ar.tr)} · ${als.length} ${plural(als.length,'album','album')}`,ar.tr.map(t=>t.i),ar.a)+(als.length>1?`<div class="mu-grid" style="margin-bottom:18px">${als.map(a=>albumCard(a,A)).join('')}</div>`:'')+rows(ar.tr,'sel');}
  else if(sel&&sel.k==='trash'){const del=muDeleted(),ids=Object.keys(del).sort((a,b)=>(del[b].at||0)-(del[a].at||0));
    html=`<button class="btn ghost sm mu-back" data-ma="${A(()=>{MU.sel=null;renderMusic();})}">‹ Indietro</button><div class="mu-head"><div><p class="mini">Eliminati da Capri</p><h2>Cestino</h2><p>${ids.length} ${plural(ids.length,'brano','brani')} · dopo 30 giorni spariscono per sempre dai dispositivi</p></div></div>`+
      (ids.length?`<div class="mu-list">${ids.map(i=>{const x=del[i];const left=Math.max(0,30-Math.floor((Date.now()-(x.at||0))/864e5));return `<div class="mr" style="cursor:default">${mcv('')}<span class="mt"><b>${esc(x.t||'Brano')}</b><span>${esc(x.a||'')}${x.al?' · '+esc(x.al):''}</span></span><span class="mal">${left?`ancora ${left} ${plural(left,'giorno','giorni')}`:'in eliminazione'}</span><span class="md2"></span><button class="btn sm ghost" style="grid-column:span 2" data-ma="${A(()=>muRestore(i))}">Ripristina</button></div>`;}).join('')}</div>`:'<div class="mu-empty">Il cestino è vuoto.</div>');}
  else if(sel&&sel.k==='pl'){const pl=sel.id==='likes'?{id:'likes',name:'Mi piace',ids:[...L].reverse()}:sel.id==='recent'?{id:'recent',name:'Ascoltati di recente',ids:mRecent()}:muPls().find(x=>x.id===sel.id);
    if(!pl){MU.sel=null;return renderMusic();}const tr=(pl.ids||[]).map(i=>MU.by[i]).filter(Boolean);
    const extra=pl.id!=='likes'&&pl.id!=='recent'?`<button class="btn ghost" data-ma="${A(()=>plRename(pl))}">Rinomina</button><button class="btn ghost danger" data-ma="${A(()=>plDelete(pl))}">Elimina</button>`:'';
    html=head(tr.length?cvId(tr):'',pl.id==='likes'?'Raccolta':'Playlist',pl.name,tot(tr)+((pl.ids||[]).length>tr.length?` · ${(pl.ids||[]).length-tr.length} non più sul PC`:''),tr.map(t=>t.i),pl.name,extra)+(tr.length?rows(tr,'sel'):'<div class="mu-empty">Ancora vuota: tocca ⋯ su un brano per aggiungerlo.</div>');}
  else if(MU.tab==='brani'){const list=muFilter(MU.lib);html=list.length?rows(list,'all'):`<div class="mu-empty">Nessun brano per “${esc(MU.q)}”.</div>`;}
  else if(MU.tab==='album'){const als=muAlbums(muFilter(MU.lib));html=als.length?`<div class="mu-grid">${als.slice(0,MU.limit).map(a=>albumCard(a,A)).join('')}</div>${als.length>MU.limit?`<button class="btn ghost mu-more" data-ma="${A(()=>{MU.limit+=400;renderMusic();})}">Mostra altri</button>`:''}`:'<div class="mu-empty">Nessun album.</div>';}
  else if(MU.tab==='artisti'){const ars=muArtists(muFilter(MU.lib));html=`<div class="mu-list mu-art">${ars.slice(0,MU.limit).map(x=>`<button data-ma="${A(()=>{MU.sel={k:'artist',id:x.a};MU.limit=200;renderMusic();scrollTo(0,0);})}">${mcv(x.cv)}<b>${esc(x.a)}</b><span>${x.tr.length} ${plural(x.tr.length,'brano','brani')}</span></button>`).join('')}</div>`;}
  else{const pls=muPls(),rec=mRecent();
    html=`<div class="mu-grid">${[{id:'likes',name:'Mi piace',ids:[...L]},...(rec.length?[{id:'recent',name:'Ascoltati di recente',ids:rec}]:[]),...pls].map(pl=>{const tr=(pl.ids||[]).map(i=>MU.by[i]).filter(Boolean);
      return `<button class="mu-card" data-ma="${A(()=>{MU.sel={k:'pl',id:pl.id};MU.limit=200;renderMusic();scrollTo(0,0);})}">${pl.id==='likes'?`<span class="mcv" style="background:linear-gradient(135deg,var(--cpp),#5b1bff);color:#fff">${ico('heart')}</span>`:mcv(cvId(tr))}<b>${esc(pl.name)}</b><span>${tr.length} ${plural(tr.length,'brano','brani')}</span></button>`;}).join('')}
      <button class="mu-card" data-ma="${A(()=>plNew())}"><span class="mcv" style="background:var(--p2)">${ico('plus')}</span><b>Nuova playlist</b><span>Crea una raccolta</span></button>
      ${Object.keys(muDeleted()).length?`<button class="mu-card" data-ma="${A(()=>{MU.sel={k:'trash'};renderMusic();scrollTo(0,0);})}"><span class="mcv" style="background:var(--p2)">${ico('trash')}</span><b>Cestino</b><span>${Object.keys(muDeleted()).length} eliminati</span></button>`:''}</div>`;}
  body.innerHTML=html;muCovers(body);
}
function albumCard(a,A){const ids=a.tr.map(t=>t.i);return `<div class="mu-card" role="button" tabindex="0" data-ma="${A(()=>{MU.sel={k:'album',id:a.k};MU.limit=200;renderMusic();scrollTo(0,0);})}">${mcv(a.cv)}<b>${esc(a.al)}</b><span>${esc(a.a)}${a.y?' · '+esc(a.y):''}</span>${muOnline()?`<button class="mu-fab" type="button" aria-label="Riproduci ${esc(a.al)}" data-ma="${A(()=>{MU.shuffle=false;mPlayList(ids,0,a.al);})}"><svg><use href="#i-mplay"/></svg></button>`:''}</div>`;}

/* ---------- playlist e mi piace ---------- */
async function muLike(id){const L=muLikes();if(L.has(id))L.delete(id);else L.add(id);await put('music/likes',{ids:[...L]});mUI();}
function plNew(addId){
  openModal(`<div class="mh"><h2>Nuova playlist</h2><button class="x" data-close aria-label="Chiudi">×</button></div><form class="form" id="plf"><label class="f full"><span>Nome</span><input name="n" maxlength="60" required autofocus placeholder="Es. Per correre"></label></form>
  <div class="mf"><span class="sp"></span><button class="btn ghost" data-close type="button">Annulla</button><button class="btn pri" id="pl-ok" type="button">Crea</button></div>`);
  const go=async()=>{const n=$('#plf [name=n]').value.trim();if(!n)return;const id=uid();closeModal();await put('playlists/'+id,{name:n,ids:addId?[addId]:[],created:Date.now(),upd:Date.now()});toast(addId?`Aggiunto a “${n}”`:'Playlist creata','ok');};
  $('#pl-ok').onclick=go;$('#plf').onsubmit=e=>{e.preventDefault();go();};
}
function plRename(pl){const n=prompt('Nuovo nome',pl.name);if(n&&n.trim())put('playlists/'+pl.id,{...body(pl),name:n.trim(),upd:Date.now()});}
async function plDelete(pl){if(!confirm(`Eliminare la playlist “${pl.name}”? I brani restano sul PC.`))return;MU.sel=null;await drop('playlists/'+pl.id);toast('Playlist eliminata','ok');}
async function plAdd(pl,id){const ids=(pl.ids||[]).filter(x=>x!==id).concat(id);await put('playlists/'+pl.id,{...body(pl),ids,upd:Date.now()});toast(`Aggiunto a “${pl.name}”`,'ok');}
async function plRemove(pl,id){await put('playlists/'+pl.id,{...body(pl),ids:(pl.ids||[]).filter(x=>x!==id),upd:Date.now()});}
function muMore(id){const t=MU.by[id];if(!t)return;const sel=MU.sel,pl=sel&&sel.k==='pl'&&sel.id!=='likes'&&sel.id!=='recent'?muPls().find(x=>x.id===sel.id):null;
  openModal(`<div class="mh"><h2 style="font-size:18px">${esc(t.t)}</h2><button class="x" data-close aria-label="Chiudi">×</button></div><p class="mini" style="margin:-8px 0 14px">${esc(t.a)}${t.al?' · '+esc(t.al):''}</p>
  <div class="mu-menu"><button data-m="next">${ico('mnext')}Riproduci dopo questo</button><button data-m="queue">${ico('queue')}Aggiungi in coda</button>
  ${muPls().map(p=>`<button data-pl="${esc(p.id)}">${ico('plus')}Aggiungi a “${esc(p.name)}”</button>`).join('')}<button data-m="newpl">${ico('plus')}Nuova playlist con questo brano</button>
  ${pl?`<button data-m="rmpl">${ico('queue')}Togli da “${esc(pl.name)}”</button>`:''}${t.al?`<button data-m="album">${ico('music')}Vai all'album</button>`:''}<button data-m="artist">${ico('music')}Vai all'artista</button>
  <button data-m="del" class="mu-del">${ico('trash')}Elimina dal dispositivo</button></div>`);
  DLG.querySelector('.mu-menu').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const m=b.dataset.m;closeModal();
    if(b.dataset.pl){const p=muPls().find(x=>x.id===b.dataset.pl);if(p)plAdd(p,id);}
    else if(m==='next'||m==='queue'){if(MU.qi<0){mPlayList([id],0,'');return;}const at=m==='next'?MU.qi+1:MU.queue.length;MU.queue.splice(at,0,id);MU.orig.push(id);mSave();mUI();toast(m==='next'?'Suonerà dopo questo':'Aggiunto in coda','ok');}
    else if(m==='del')muDelete(id);
    else if(m==='newpl')plNew(id);else if(m==='rmpl')plRemove(pl,id);
    else if(m==='album'){MU.sel={k:'album',id:(t.al||'(senza album)')+'\u0001'+(t.aa||t.a||'').toLowerCase()};MU.limit=200;location.hash='#musica';renderMusic();scrollTo(0,0);mClose();}
    else if(m==='artist'){MU.sel={k:'artist',id:t.a||'Artista sconosciuto'};MU.limit=200;location.hash='#musica';renderMusic();scrollTo(0,0);mClose();}});
}
/* ---------- eliminare brani (cestino di 30 giorni su ogni dispositivo) ---------- */
async function muDelete(id){
  const t=MU.by[id];if(!t)return;
  if(!confirm(`Eliminare «${t.t}» di ${t.a}?\n\nVerrà tolto dalla cartella della musica su PC e tablet. Per 30 giorni lo puoi ripristinare da Musica → Playlist → Cestino.`))return;
  const qi=MU.queue.indexOf(id);
  if(qi>=0){const cur=qi===MU.qi;MU.queue.splice(qi,1);MU.orig=MU.orig.filter(x=>x!==id);if(qi<MU.qi)MU.qi--;
    if(cur){AU.pause();AU.removeAttribute('src');try{AU.load();}catch(e){}if(MU.qi>=MU.queue.length)MU.qi=MU.queue.length-1;if(MU.queue.length&&MU.qi>=0)mLoad(true);}mSave();}
  const del={...muDeleted()},lim=Date.now()-60*864e5;for(const k in del)if((del[k].at||0)<lim)delete del[k];
  del[id]={at:Date.now(),t:t.t,a:t.a,al:t.al||''};
  if(!await put('music/deleted',{ids:del}))return;
  muSetLib({tracks:MU.lib,at:MU.libAt});renderMusic();mUI();
  toast(`«${t.t}» eliminato`,'ok');
  if(muOnline())fetch(muUrl('del',id),{cache:'no-store'}).catch(()=>{});
}
async function muRestore(id){
  const del={...muDeleted()};const x=del[id];delete del[id];
  if(!await put('music/deleted',{ids:del}))return;
  toast(`«${(x&&x.t)||'Brano'}» ripristinato`,'ok');
  if(muOnline())fetch(muUrl('restore',id),{cache:'no-store'}).then(()=>setTimeout(()=>muLoadLib(true),2500)).catch(()=>{});
  renderMusic();
}
const mRecent=()=>{try{return JSON.parse(localStorage.getItem('capri-mrecent')||'[]');}catch(e){return[];}};
function mPushRecent(id){try{const r=mRecent().filter(x=>x!==id);r.unshift(id);localStorage.setItem('capri-mrecent',JSON.stringify(r.slice(0,50)));}catch(e){}}

/* ---------- riproduzione ---------- */
function shuffleArr(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function mPlayList(ids,start,from){
  if(!ids.length)return;if(!muOnline()){toast('Nessun dispositivo raggiungibile: accendi il tablet con Capri Musica','err');return;}
  MU.orig=ids.slice();MU.from=from||'';start=Math.max(0,Math.min(start||0,ids.length-1));
  if(MU.shuffle){const first=ids[start],rest=shuffleArr(ids.filter((_,j)=>j!==start));MU.queue=[first,...rest];MU.qi=0;}else{MU.queue=ids.slice();MU.qi=start;}
  MU.errs=0;mLoad(true);
}
function mLoad(play,pos){
  const id=MU.queue[MU.qi],t=MU.by[id];if(!t){mUI();return;}
  const u=muUrl('a',id);if(!u){toast('Il PC non è collegato','err');return;}
  AU.src=u;if(pos)AU.addEventListener('loadedmetadata',()=>{try{AU.currentTime=pos;}catch(e){}},{once:true});
  if(play){const p=AU.play();if(p&&p.catch)p.catch(e=>{if(e&&e.name==='NotAllowedError')toast('Tocca ▶ per avviare','ok');});}
  mPushRecent(id);mSession(t);mUI();mSave();
}
function mToggle(){if(MU.qi<0||!MU.queue.length){const ids=muFilter(MU.lib).map(t=>t.i);if(ids.length)mPlayList(ids,0,'Tutti i brani');return;}
  if(!AU.src||AU.error){mLoad(true,MU.restorePos||0);MU.restorePos=0;return;}if(AU.paused){const p=AU.play();if(p&&p.catch)p.catch(()=>{});}else AU.pause();}
function mNext(auto){if(!MU.queue.length)return;
  if(auto&&MU.repeat==='one'){AU.currentTime=0;AU.play().catch(()=>{});return;}
  if(MU.qi<MU.queue.length-1)MU.qi++;else if(MU.repeat==='all'||!auto)MU.qi=0;else{AU.pause();AU.currentTime=0;mUI();return;}
  mLoad(true);}
function mPrev(){if(AU.currentTime>3){AU.currentTime=0;return;}if(MU.qi>0)MU.qi--;else if(MU.repeat==='all')MU.qi=MU.queue.length-1;mLoad(true);}
function mShuffle(){MU.shuffle=!MU.shuffle;const cur=MU.queue[MU.qi];
  if(MU.queue.length){if(MU.shuffle){const rest=shuffleArr(MU.queue.filter((x,j)=>j!==MU.qi));MU.queue=[cur,...rest];MU.qi=0;}else{MU.queue=MU.orig.slice();MU.qi=Math.max(0,MU.queue.indexOf(cur));}}
  mSave();mUI();toast(MU.shuffle?'Casuale attivo':'Casuale spento','ok');}
function mRepeat(){MU.repeat=MU.repeat==='off'?'all':MU.repeat==='all'?'one':'off';mSave();mUI();toast(MU.repeat==='off'?'Ripetizione spenta':MU.repeat==='all'?'Ripeti la coda':'Ripeti il brano','ok');}
function mSave(){try{localStorage.setItem('capri-mstate',JSON.stringify({queue:MU.queue.slice(0,2000),orig:MU.orig.slice(0,2000),qi:MU.qi,pos:Math.floor(AU.currentTime||0),shuffle:MU.shuffle,repeat:MU.repeat,from:MU.from,vol:AU.volume}));}catch(e){}}
try{const st=JSON.parse(localStorage.getItem('capri-mstate')||'null');if(st&&Array.isArray(st.queue)){Object.assign(MU,{queue:st.queue,orig:st.orig||st.queue,qi:st.qi??-1,shuffle:!!st.shuffle,repeat:st.repeat||'off',from:st.from||''});MU.restorePos=st.pos||0;if(st.vol!=null)AU.volume=st.vol;}}catch(e){}
function mSession(t){if(!('mediaSession' in navigator))return;try{const cu=t.cv?muUrl('c',t.cv):'';
  navigator.mediaSession.metadata=new MediaMetadata({title:t.t,artist:t.a,album:t.al||'',artwork:cu?[{src:cu,sizes:'512x512',type:'image/jpeg'}]:[{src:'icon-512.png',sizes:'512x512',type:'image/png'}]});}catch(e){}}
if('mediaSession' in navigator){const ms=navigator.mediaSession,set=(a,f)=>{try{ms.setActionHandler(a,f);}catch(e){}};
  set('play',()=>mToggle());set('pause',()=>AU.pause());set('nexttrack',()=>mNext());set('previoustrack',()=>mPrev());
  set('seekto',d=>{if(d.seekTime!=null)AU.currentTime=d.seekTime;});set('seekbackward',d=>{AU.currentTime=Math.max(0,AU.currentTime-(d.seekOffset||10));});set('seekforward',d=>{AU.currentTime=Math.min(AU.duration||0,AU.currentTime+(d.seekOffset||10));});}
const icoUse=(el,name)=>{const u=el&&el.querySelector('use');if(u)u.setAttribute('href','#'+name);};
function mUI(){
  const id=MU.queue[MU.qi],t=MU.by[id],mp=$('#mp');const show=!!t;mp.hidden=!show;document.body.classList.toggle('has-mp',show);if(!t)return;
  const L=muLikes(),playing=!AU.paused&&!AU.ended;
  if(mp.dataset.id!==id){mp.dataset.id=id;
    for(const [c,tt,a] of [['#mp-cv','#mp-t','#mp-a'],['#mpf-cv','#mpf-t','#mpf-a']]){$(tt).textContent=t.t;$(a).textContent=t.a+(t.al?' · '+t.al:'');const cv=$(c);cv.innerHTML=ico('music');delete cv.dataset.cvd;if(t.cv){cv.dataset.cv=t.cv;muFillCover(cv);}else delete cv.dataset.cv;}
    const bg=$('#mpf-bg');bg.style.backgroundImage=t.cv?`url("${muUrl('c',t.cv)}")`:'none';
    document.title=`${t.t} · ${t.a} — Capri`;}
  for(const b of ['#mp-play','#mpf-play']){icoUse($(b),playing?'i-mpause':'i-mplay');$(b).setAttribute('aria-label',playing?'Pausa':'Riproduci');}
  for(const b of ['#mp-like','#mpf-like'])$(b).classList.toggle('liked',L.has(id));
  for(const b of ['#mp-shuf','#mpf-shuf'])$(b).classList.toggle('on',MU.shuffle);
  for(const b of ['#mp-rep','#mpf-rep']){$(b).classList.toggle('on',MU.repeat!=='off');$(b).classList.toggle('one',MU.repeat==='one');}
  $('#mpf-from').textContent=MU.from?`Da: ${MU.from}`:'In riproduzione';
  if('mediaSession' in navigator)try{navigator.mediaSession.playbackState=playing?'playing':'paused';}catch(e){}
  if(!$('#mpf-q').hidden)mQueue();
  $$('#mu-body .mr').forEach(r=>{const ctx=MU.lists[r.dataset.ctx];const rid=ctx&&ctx[+r.dataset.mr];r.classList.toggle('cur',rid===id);});
}
function mTime(){
  if(MU.seeking)return;const d=AU.duration||(MU.by[MU.queue[MU.qi]]||{}).d||0,c=AU.currentTime||0,p=d?Math.min(100,c/d*100):0;
  for(const [r,cu,du] of [['#mp-range','#mp-cur','#mp-dur'],['#mpf-range','#mpf-cur','#mpf-dur']]){const el=$(r);el.value=Math.round(p*10);el.style.setProperty('--p',p+'%');$(cu).textContent=fmtDur(c);$(du).textContent=fmtDur(d);}
  $('#mp-prog i').style.width=p+'%';
  if('mediaSession' in navigator&&d&&isFinite(d))try{navigator.mediaSession.setPositionState({duration:d,position:Math.min(c,d),playbackRate:AU.playbackRate||1});}catch(e){}
}
AU.addEventListener('timeupdate',()=>{mTime();if(Math.floor(AU.currentTime)%10===0)mSave();});
AU.addEventListener('play',mUI);AU.addEventListener('pause',()=>{mUI();mSave();});AU.addEventListener('loadedmetadata',mTime);
AU.addEventListener('playing',()=>{MU.errs=0;});
AU.addEventListener('ended',()=>mNext(true));
AU.addEventListener('error',()=>{if(!AU.src||AU.src===location.href)return;MU.errs++;
  if(!muOnline()||MU.errs>=3){toast('Non riesco a riprodurre: il PC è acceso e collegato?','err');MU.reach=false;muStatus();mUI();return;}
  toast('Brano non riproducibile, passo al successivo','err');setTimeout(()=>mNext(true),900);});
function mQueue(){const el=$('#mpf-q'),L=muLikes();const up=MU.queue.slice(MU.qi+1,MU.qi+101);
  el.innerHTML=`<h3>In riproduzione</h3>${qRow(MU.queue[MU.qi],MU.qi,true)}<h3>Prossimi${MU.from?' · '+esc(MU.from):''}</h3>${up.length?up.map((id,j)=>qRow(id,MU.qi+1+j)).join(''):'<p class="mini" style="padding:0 6px">Fine della coda.</p>'}`;
  muCovers(el);
  function qRow(id,i,cur){const t=MU.by[id];if(!t)return'';return `<div class="mr${cur?' cur':''}" data-qi="${i}">${mcv(t.cv)}<span class="mt"><b>${esc(t.t)}</b><span>${esc(t.a)}</span></span>${cur?'':`<button class="mi" data-qrm="${i}" aria-label="Togli dalla coda">×</button>`}</div>`;}}
function mOpen(){const f=$('#mpf');f.hidden=false;document.body.style.overflow='hidden';mUI();mTime();}
function mClose(){$('#mpf').hidden=true;document.body.style.overflow='';}

/* ---------- eventi ---------- */
$('#v-musica').addEventListener('click',e=>{
  const lk=e.target.closest('[data-like]');if(lk){e.stopPropagation();muLike(lk.dataset.like);return;}
  const mo=e.target.closest('[data-more]');if(mo){e.stopPropagation();muMore(mo.dataset.more);return;}
  const a=e.target.closest('[data-ma]');if(a){e.stopPropagation();const f=MACT[+a.dataset.ma];if(f)f();return;}
  const r=e.target.closest('[data-mr]');if(r){const ids=MU.lists[r.dataset.ctx]||[],i=+r.dataset.mr;
    if(MU.queue[MU.qi]===ids[i]&&AU.src){mToggle();return;}
    const from=MU.sel?($('#mu-body h2')||{}).textContent:({brani:'Tutti i brani'})[MU.tab]||'';mPlayList(ids,i,from);}
});
$('#v-musica').addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('.mu-card[role=button]')){e.preventDefault();e.target.click();}});
$('#mu-tabs').addEventListener('click',e=>{const b=e.target.closest('[data-mt]');if(!b)return;MU.tab=b.dataset.mt;MU.sel=null;MU.limit=200;renderMusic();});
let muQT;$('#mu-q').addEventListener('input',e=>{clearTimeout(muQT);muQT=setTimeout(()=>{MU.q=e.target.value;MU.sel=null;MU.limit=200;if(MU.tab==='playlist')MU.tab='brani';renderMusic();},140);});
$('#mp-play').onclick=$('#mpf-play').onclick=()=>mToggle();
$('#mp-next').onclick=$('#mpf-next').onclick=()=>mNext();
$('#mp-prev').onclick=$('#mpf-prev').onclick=()=>mPrev();
$('#mp-shuf').onclick=$('#mpf-shuf').onclick=()=>mShuffle();
$('#mp-rep').onclick=$('#mpf-rep').onclick=()=>mRepeat();
$('#mp-like').onclick=$('#mpf-like').onclick=()=>{const id=MU.queue[MU.qi];if(id)muLike(id);};
$('#mp-del').onclick=$('#mpf-del').onclick=()=>{const id=MU.queue[MU.qi];if(id)muDelete(id);};
$('#mp-open').onclick=mOpen;$('#mpf-close').onclick=mClose;
$('#mp-q').onclick=()=>{mOpen();$('#mpf-q').hidden=false;$('#mpf-cv').hidden=true;mQueue();};
$('#mpf-qbtn').onclick=()=>{const q=$('#mpf-q');q.hidden=!q.hidden;$('#mpf-cv').hidden=!q.hidden;if(!q.hidden)mQueue();};
$('#mpf-q').addEventListener('click',e=>{const rm=e.target.closest('[data-qrm]');if(rm){MU.queue.splice(+rm.dataset.qrm,1);mSave();mQueue();return;}
  const r=e.target.closest('[data-qi]');if(r&&+r.dataset.qi!==MU.qi){MU.qi=+r.dataset.qi;mLoad(true);}});
for(const r of ['#mp-range','#mpf-range']){const el=$(r);
  el.addEventListener('input',()=>{MU.seeking=true;const d=AU.duration||0;el.style.setProperty('--p',el.value/10+'%');$(r==='#mp-range'?'#mp-cur':'#mpf-cur').textContent=fmtDur(d*el.value/1000);});
  el.addEventListener('change',()=>{const d=AU.duration||0;if(d)AU.currentTime=d*el.value/1000;MU.seeking=false;mTime();});}
$('#mp-vol').value=Math.round(AU.volume*100);$('#mp-vol').style.setProperty('--p',AU.volume*100+'%');
$('#mp-vol').addEventListener('input',e=>{AU.volume=e.target.value/100;e.target.style.setProperty('--p',e.target.value+'%');mSave();});
document.addEventListener('keydown',e=>{if($('#mp').hidden||e.target.closest('input,textarea,select,[contenteditable]')||document.querySelector('.ov:not([hidden])'))return;
  if(e.code==='Space'&&!e.target.closest('button,a')){e.preventDefault();mToggle();}else if(e.key==='Escape'&&!$('#mpf').hidden)mClose();});
setInterval(()=>{if(S.ready&&muHost())SUBS.music();},30000);

/* ---------- comando vocale: apre Capri e parte la musica in casuale ---------- */
let muAutoRun=0;
async function muAutoShuffle(){
  const run=++muAutoRun,t0=Date.now();
  while(Date.now()-t0<25000){
    if(run!==muAutoRun)return;
    if(S.ready&&muOnline()&&MU.lib.length&&MU.reach)break;
    if(S.ready&&muHost()&&!MU.loading&&MU.reach!==true)muLoadLib(true);
    await new Promise(r=>setTimeout(r,500));
  }
  if(!(S.ready&&muOnline()&&MU.lib.length)){toast('Nessun dispositivo acceso con la musica: accendi il tablet','err');return;}
  if(!AU.paused&&MU.queue.length)return;
  const ids=MU.lib.map(t=>t.i);MU.shuffle=true;mPlayList(ids,Math.floor(Math.random()*ids.length),'Casuale');
  setTimeout(()=>{if(AU.paused)muTapToPlay();},900);
}
function muTapToPlay(){
  let o=$('#mu-go');if(!o){o=document.createElement('button');o.id='mu-go';o.type='button';document.body.append(o);}
  const t=MU.by[MU.queue[MU.qi]]||{};
  o.innerHTML=`<span class="mu-go-b"><svg><use href="#i-mplay"/></svg></span><b>Tocca per partire</b><span>${esc(t.t||'')}${t.a?' · '+esc(t.a):''}</span><em>Casuale su ${MU.lib.length.toLocaleString('it-IT')} brani</em>`;
  o.hidden=false;
  o.onclick=()=>{o.hidden=true;const p=AU.play();if(p&&p.catch)p.catch(()=>mLoad(true));};
}

/* ---------- collegare il PC ---------- */
async function muNewKey(){const b=crypto.getRandomValues(new Uint8Array(24));const k='mk_'+b64u(b.buffer);await put('music/key',{key:k,created:Date.now()});return k;}
const muVoiceHtml=()=>`  <details class="ip-more" style="margin-top:14px" open><summary><b>Comando vocale: “Ehi Siri, Musica Capri”</b> apre Capri e fa partire la musica in casuale.</summary>
    <div class="ip" style="margin-top:12px">
      <div class="ip-step"><div class="ip-n">1</div><div><b>Copia il link</b><p>Usa il primo se Capri è sulla schermata Home come app (consigliato), il secondo per aprirlo in Safari.</p>
        <div class="ip-b"><button class="btn sm pri" type="button" data-vl="webapp">Link per l'app sulla Home</button><button class="btn sm ghost" type="button" data-vl="https">Link per Safari</button></div></div></div>
      <div class="ip-step"><div class="ip-n">2</div><div><b>Crea il comando</b><p>App <b>Comandi</b> → <b>+</b> → cerca l'azione <b>Apri URL</b> e incolla il link. In alto rinomina il comando <b>Musica Capri</b> e tocca Fine.</p></div></div>
      <div class="ip-step"><div class="ip-n">3</div><div><b>Usalo</b><p>Di' <b>“Ehi Siri, Musica Capri”</b> (o tocca il comando). Capri si apre e parte la musica in casuale; se l'iPhone chiede un tocco per l'audio, compare un grande ▶: basta toccare lo schermo.</p></div></div>
    </div>
  </details>`;
function muVoiceWire(){DLG.querySelectorAll('[data-vl]').forEach(b=>b.onclick=async()=>{const u=SITE_URL()+'?casuale#casuale',l=b.dataset.vl==='webapp'?u.replace(/^https:\/\//,'webapp://'):u;
    if(await copyText(l))toast('Link copiato: incollalo nell\'azione “Apri URL”','ok');else prompt('Copia questo link:',l);});}
async function muLocalModal(){
  openModal(`<div class="mh"><h2>La tua musica</h2><button class="x" data-close aria-label="Chiudi">×</button></div>
  <p class="mini" style="margin:0 0 14px">La musica arriva dal dispositivo dove gira Capri, attraverso la tua rete privata Tailscale: niente cloud e niente collegamenti pubblici.</p>
  <div class="ip">
    <div class="ip-step"><div class="ip-n">✓</div><div><b>Stato</b><p id="mu-lst">${muOnline()?'✅ Collegata.':'Controllo…'}</p></div></div>
    <div class="ip-step"><div class="ip-n">♪</div><div><b>Aggiungere canzoni</b><p>Copiale in qualsiasi cartella del tablet (Music, Download, File audio…): Capri le trova da solo entro qualche minuto e salta chat, registrazioni e suonerie.</p></div></div>
  </div>
  ${muVoiceHtml()}
  <div class="mf"><span class="sp"></span><button class="btn pri" type="button" data-close>Chiudi</button></div>`,{wide:true});
  muVoiceWire();
  try{const j=await (await fetch('api/stato',{cache:'no-store'})).json();const el=$('#mu-lst');const h=muHost()||{},n=h.info&&h.info.tracks;
    if(el)el.innerHTML=j.musica?`✅ Collegata${n?': '+n+' brani':''}. Cartella: <code>${esc(j.cartellaMusica)}</code>`:`⚠ Il programma della musica non risponde. Cartella: <code>${esc(j.cartellaMusica)}</code>. Riavvia Capri sul tablet; se non basta, controlla che Termux abbia il permesso per i file.`;}
  catch(e){const el=$('#mu-lst');if(el)el.textContent='Non riesco a leggere lo stato: '+errMsg(e);}
}
async function muSetupModal(){
  if(LOCAL)return muLocalModal();
  let key=muKey();
  openModal(`<div class="mh"><h2>Collega un dispositivo</h2><button class="x" data-close aria-label="Chiudi">×</button></div>
  <p class="mini" style="margin:0 0 14px">Un piccolo programma sul PC legge la cartella della musica e la fa ascoltare qui, anche dal telefono fuori casa. Ogni brano passa da un collegamento cifrato e protetto dalla tua chiave personale.</p>
  <div class="ip">
    <div class="ip-step"><div class="ip-n">1</div><div><b>Attiva l'ingresso su Supabase (una volta sola)</b><p>Copia il codice, apri il <a href="${SUPA_SQL()}" target="_blank" rel="noopener">SQL Editor</a>, incollalo e premi <b>Run</b>.</p>
      <div class="ip-b"><button class="btn sm" type="button" id="mu-sql">Copia codice SQL</button><button class="btn sm ghost" type="button" id="mu-chk">Verifica</button></div><p class="mini" id="mu-chk-r"></p></div></div>
    <div class="ip-step"><div class="ip-n">2</div><div><b>Serve Python (gratis)</b><p>Se non ce l'hai, scaricalo da <a href="https://www.python.org/downloads/" target="_blank" rel="noopener">python.org</a>. Durante l'installazione spunta <b>“Add python.exe to PATH”</b>.</p></div></div>
    <div class="ip-step"><div class="ip-n">3</div><div><b>Scarica e apri Capri Musica sul PC</b><p>Mettilo in una cartella tua (per esempio Documenti) e aprilo con doppio clic. La prima volta ti chiede la cartella della musica (Invio = Musica) e se partire da solo quando accendi il PC (Invio = sì).</p>
      <div class="ip-b"><button class="btn sm pri" type="button" id="mu-dl">Scarica capri-musica.py</button></div></div></div>
    <div class="ip-step"><div class="ip-n">4</div><div><b>Fatto</b><p id="mu-wait">${muOnline()?'✅ Il PC è collegato.':'In attesa del PC… appena il programma è acceso compare qui (entro un minuto).'}</p></div></div>
  </div>
  <details class="ip-more" style="margin-top:14px" open><summary><b>Comando vocale: “Ehi Siri, Musica Capri”</b> apre Capri e fa partire la musica in casuale.</summary>
    <div class="ip" style="margin-top:12px">
      <div class="ip-step"><div class="ip-n">1</div><div><b>Copia il link</b><p>Usa il primo se Capri è sulla schermata Home come app (consigliato), il secondo per aprirlo in Safari.</p>
        <div class="ip-b"><button class="btn sm pri" type="button" data-vl="webapp">Link per l'app sulla Home</button><button class="btn sm ghost" type="button" data-vl="https">Link per Safari</button></div></div></div>
      <div class="ip-step"><div class="ip-n">2</div><div><b>Crea il comando</b><p>App <b>Comandi</b> → <b>+</b> → cerca l'azione <b>Apri URL</b> e incolla il link. In alto rinomina il comando <b>Musica Capri</b> e tocca Fine.</p></div></div>
      <div class="ip-step"><div class="ip-n">3</div><div><b>Usalo</b><p>Di' <b>“Ehi Siri, Musica Capri”</b> (o tocca il comando). Capri si apre e parte la musica in casuale; se l'iPhone chiede un tocco per l'audio, compare un grande ▶: basta toccare lo schermo.</p></div></div>
    </div>
  </details>
  <details class="ip-more" style="margin-top:14px"><summary><b>Hai un tablet Android da lasciare acceso?</b> Può fare da “PC” al posto suo (consuma molto meno).</summary>
    <div class="ip" style="margin-top:12px">
      <div class="ip-step"><div class="ip-n">1</div><div><b>Installa Termux e Termux:Boot</b><p>Dal tablet, da F-Droid: <a href="https://f-droid.org/packages/com.termux/" target="_blank" rel="noopener">Termux</a> e <a href="https://f-droid.org/packages/com.termux.boot/" target="_blank" rel="noopener">Termux:Boot</a> (apri Termux:Boot una volta, così parte da solo all'accensione).</p></div></div>
      <div class="ip-step"><div class="ip-n">2</div><div><b>Copia le canzoni</b><p>Va bene ovunque siano sul tablet (Music, Download…): il programma le trova da solo e salta chat, registrazioni e suonerie.</p></div></div>
      <div class="ip-step"><div class="ip-n">3</div><div><b>Incolla un comando in Termux</b><p>Copia, incolla in Termux e premi Invio. Quando Android chiede il permesso per i file, tocca <b>Consenti</b>.</p>
        <div class="ip-b"><button class="btn sm pri" type="button" id="mu-android">Copia il comando per Android</button></div></div></div>
      <div class="ip-step"><div class="ip-n">4</div><div><b>Non farlo addormentare</b><p>Impostazioni di Android → App → Termux → Batteria → <b>Senza restrizioni</b>. Lascia il tablet in carica.</p></div></div>
    </div>
    <p class="mini">Se PC e tablet sono accesi insieme, risponde il primo; se si spegne, subentra l'altro entro pochi minuti.</p>
  </details>
  <div class="note-box" style="margin-top:14px">Il PC deve essere acceso e il programma aperto (se hai scelto l'avvio automatico parte da solo, senza finestre). Usa il collegamento gratuito di Cloudflare: non serve aprire porte del router. Per cambiare la cartella della musica: riapri il file e, appena parte, premi il tasto C.</div>
  <div class="mf">${key?'<button class="btn danger ghost sm" id="mu-regen" type="button">Cambia chiave</button>':''}<span class="sp"></span><button class="btn pri" type="button" data-close>Chiudi</button></div>`,{wide:true});
  let sql='';fetch('musica/capri_music.sql',{cache:'no-store'}).then(r=>r.text()).then(t=>sql=t).catch(()=>{});
  $('#mu-sql').onclick=async()=>{if(!sql){try{sql=await (await fetch('musica/capri_music.sql',{cache:'no-store'})).text();}catch(e){toast('Non riesco a leggere il file','err');return;}}if(await copyText(sql))toast('Copiato: incollalo nel SQL Editor','ok');else toast('Copia non riuscita','err');};
  $('#mu-chk').onclick=async()=>{const r=$('#mu-chk-r');r.textContent='Verifico…';const{error}=await SB.rpc('capri_music',{p_key:'x'.repeat(40)});const m=error?(error.message||''):'';
    r.textContent=/chiave non valida/i.test(m)?'✅ Ingresso attivo.':/capri_music|PGRST202|schema cache|not find/i.test(m+(error&&error.code))?'Non ancora attivo: esegui prima il codice SQL.':'Risposta inattesa: '+m;};
  $('#mu-dl').onclick=async()=>{const b=$('#mu-dl');b.disabled=true;try{if(!key)key=await muNewKey();const r=await fetch('musica/capri-musica.py',{cache:'no-store'});if(!r.ok)throw new Error('file non trovato');
    const C=getCfg()||{};let txt=await r.text();const set=(name,v)=>{txt=txt.replace(name+' = "__'+name.replace('SUPA_','').replace('MUSIC_KEY','MUSICKEY')+'__"',name+' = '+JSON.stringify(v));};
    set('SUPA_URL',C.url||'');set('SUPA_KEY',C.key||'');set('MUSIC_KEY',key);set('SITE',SITE_URL());
    if(/= "__[A-Z]+__"/.test(txt))throw new Error('modello del programma non riconosciuto');
    saveBlob('capri-musica.py',new Blob([txt],{type:'text/x-python'}));toast('Scaricato: aprilo sul PC','ok');}catch(e){toast('Errore: '+errMsg(e),'err');}b.disabled=false;};
  muVoiceWire();
  $('#mu-android').onclick=async()=>{try{if(!key)key=await muNewKey();const C=getCfg()||{},q=v=>"'"+String(v).replace(/'/g,"'\\''")+"'";
    const cmd=`pkg install -y python cloudflared && termux-setup-storage; curl -fsSL ${q(SITE_URL()+'musica/capri-musica.py')} -o ~/capri-musica.py && python ~/capri-musica.py --chiave ${q(key)} --supabase ${q(C.url||'')} --pk ${q(C.key||'')} --sito ${q(SITE_URL())} --cartella ~/storage/shared --imposta-avvio`;
    if(await copyText(cmd))toast('Comando copiato: incollalo in Termux sul tablet','ok');else{prompt('Copia questo comando:',cmd);}}catch(e){toast('Errore: '+errMsg(e),'err');}};
  const rg=$('#mu-regen');if(rg)rg.onclick=async()=>{if(!confirm('Il programma già installato smetterà di funzionare finché non riscarichi e riapri il nuovo file. Continuare?'))return;key=await muNewKey();MU.sigs.clear();toast('Nuova chiave: riscarica il programma','ok');};
  const iv=setInterval(()=>{const w=$('#mu-wait');if(!w){clearInterval(iv);return;}if(muOnline())w.textContent='✅ Il PC è collegato: chiudi e goditi la musica.';},3000);
}

/* ================= CALENDARIO ================= */
S.calMonth=isoDay().slice(0,7);S.calSel=isoDay();let CACT=[];
const MONTHF=new Intl.DateTimeFormat('it-IT',{month:'long',year:'numeric'});
function calEvents(from,to){
  const ev={},add=(d,e)=>{if(d>=from&&d<=to)(ev[d]=ev[d]||[]).push(e);},t=isoDay();
  for(const k of S.tickets){if(k.status==='fatto'||!k.due)continue;const c=URG[k.urg||2].c;
    add(k.due,{k:'t',o:0,c:k.due<t?'var(--u4)':c,late:k.due<t,l:k.title||'Ticket',s:'#'+(k.num||''),a:()=>ticketModal(k)});
    if(k.rep&&REP[k.rep]){let d=k.due;for(let i=0;i<60;i++){d=addPeriod(d,+k.rep.slice(1)||1,k.rep[0]);if(d>to)break;add(d,{k:'t',o:0,c,ghost:true,l:'↻ '+(k.title||'Ticket'),s:'si ripete',a:()=>ticketModal(k)});}}}
  for(const x of S.abb){if(x.active===false||!x.next)continue;let d=x.next;
    for(let i=0;i<400&&d<=to;i++){add(d,{k:'p',o:1,c:'var(--og)',l:(x.kind==='doc'?'📄 ':'💳 ')+x.name,s:x.amt?eur(+x.amt):'',a:()=>payModal(x)});if(x.kind==='doc')break;d=addPeriod(d,x.n,x.u||'m');}}
  for(const x of S.diary){const d=String(x.date||'').slice(0,10);if(d)add(d,{k:'d',o:2,c:'var(--dy)',l:'📒 '+(x.title||'Appunto'),s:'',a:()=>diaryModal(x)});}
  for(const d in ev)ev[d].sort((a,b)=>a.o-b.o||(b.late?1:0)-(a.late?1:0));
  return ev;
}
function renderCal(){
  if(!S.ready)return;CACT=[];const A=fn=>{CACT.push(fn);return CACT.length-1;};
  const [y,m]=S.calMonth.split('-').map(Number),first=new Date(y,m-1,1),start=new Date(first);start.setDate(1-((first.getDay()+6)%7));
  const days=Array.from({length:42},(_,i)=>{const d=new Date(start);d.setDate(start.getDate()+i);return isoDay(d);});
  const last=days[35].slice(0,7)===S.calMonth?42:35,grid=days.slice(0,last),t=isoDay();
  const ev=calEvents(grid[0],grid[grid.length-1]),hs=hList();
  $('#c-title').textContent=MONTHF.format(first);
  $('#c-grid').innerHTML=DAYS.map(d=>`<div class="dow">${d}</div>`).join('')+grid.map(d=>{
    const e=ev[d]||[],out=d.slice(0,7)!==S.calMonth;
    const hOn=d<=t?hs.filter(h=>CapriDigest.habitOn(h,d)):[],hDone=hOn.filter(h=>(h.done||{})[d]).length;
    return`<button class="cday${out?' out':''}${d===t?' today':''}${d===S.calSel?' sel':''}" data-cd="${d}" type="button" aria-label="${esc(DAYF.format(new Date(d+'T12:00')))}${e.length?`, ${e.length} ${plural(e.length,'evento','eventi')}`:''}">
      <span class="n">${+d.slice(8)}</span>${hOn.length&&hDone?`<span class="chab${hDone===hOn.length?' full':''}" title="Abitudini ${hDone}/${hOn.length}"></span>`:''}
      ${e.slice(0,3).map(x=>`<span class="cev${x.ghost?' ghost':''}${x.late?' late':''}" style="--c:${x.c}">${esc(x.l)}</span>`).join('')}${e.length>3?`<span class="cmore">+${e.length-3}</span>`:''}
      ${e.length?`<span class="cdots">${e.slice(0,4).map(x=>`<i style="--c:${x.c}"></i>`).join('')}</span>`:''}</button>`;}).join('');
  const inMonth=Object.entries(ev).filter(([d])=>d.slice(0,7)===S.calMonth),nT=inMonth.reduce((s,[,e])=>s+e.filter(x=>x.k==='t'&&!x.ghost).length,0),nP=inMonth.reduce((s,[,e])=>s+e.filter(x=>x.k==='p').length,0);
  $('#c-sum').innerHTML=`In ${esc(MONTHF.format(first).split(' ')[0])}: <b>${nT}</b> ${plural(nT,'ticket in scadenza','ticket in scadenza')} e <b>${nP}</b> ${plural(nP,'pagamento','pagamenti')}.`;
  // giorno scelto
  const sd=S.calSel,se=calEvents(sd,sd)[sd]||[],sp=S.spese.filter(x=>x.d===sd),spT=sp.reduce((s,x)=>s+(+x.amt||0),0);
  const hOn=sd<=t?hs.filter(h=>CapriDigest.habitOn(h,sd)):[],hDone=hOn.filter(h=>(h.done||{})[sd]);
  const rows=se.map(x=>`<button class="rowi" data-ca="${A(x.a)}" style="--c:${x.c}"><span class="dot"></span><span class="t">${esc(x.l)}</span><span class="s">${esc(x.s)}</span></button>`);
  if(sp.length)rows.push(`<a class="rowi" href="#spese" style="--c:var(--fn)"><span class="dot"></span><span class="t">${sp.length} ${plural(sp.length,'spesa','spese')}</span><span class="s">${eur(spT)}</span></a>`);
  if(hOn.length)rows.push(`<div class="rowi" style="--c:var(--cpg);cursor:default"><span class="dot"></span><span class="t">Abitudini ${hDone.length}/${hOn.length}</span><span class="s">${hDone.map(h=>esc(h.emoji||'•')).join(' ')}</span></div>`);
  const rel=daysTo(sd);
  $('#c-day').innerHTML=`<h2>${ico('cal')}<span style="text-transform:capitalize">${esc(DAYF.format(new Date(sd+'T12:00')))}</span></h2>
    <p class="mini" style="margin:-8px 0 12px">${rel===0?'Oggi':rel===1?'Domani':rel===-1?'Ieri':rel>0?`Tra ${rel} giorni`:`${-rel} giorni fa`}</p>
    ${rows.length?`<div class="rows">${rows.join('')}</div>`:'<p class="mini">Niente in questo giorno.</p>'}
    ${sd>=t?`<button class="btn sm ghost" style="margin-top:12px;width:100%" data-ca="${A(()=>{ticketModal(null);setTimeout(()=>{const i=$('#tf [name=due]');if(i)i.value=sd;},30);})}">${ico('plus')}Ticket con scadenza in questo giorno</button>`:''}`;
  renderCalSync();
}
function calFeedUrl(){const f=CACHE.calfeed&&CACHE.calfeed.get('main');const C=getCfg()||{};return f&&f.token?(LOCAL?`${location.origin}/cal/${f.token}.ics`:C.url?`${C.url}/storage/v1/object/public/calendario/${f.token}.ics`:''):'';}
function renderCalSync(){
  const el=$('#c-sync');if(!el)return;const url=calFeedUrl(),st=CACHE.calstate&&CACHE.calstate.get('main');
  const ready=st&&st.at&&url&&st.file===url.split('/').pop();
  el.innerHTML=`<h2>${ico('cal')}Calendario dell'iPhone</h2><div class="csync">
    ${url?`<p class="mini" style="margin-top:-6px">${ready?`✅ Aggiornato ${esc(ago(st.at))} · ${st.events} eventi. L'iPhone lo ricontrolla da solo.`:'⏳ Il link sarà pronto entro un\'ora (lo prepara il controllo automatico orario).'}</p>
      <p class="mini">Dall'iPhone tocca <b>Aggiungi al Calendario</b> e conferma con “Abbonati”. Compaiono ticket con scadenza e pagamenti, sempre aggiornati.</p>
      <div class="ip-b"><a class="btn sm pri" href="${esc(url.replace(/^https:/,'webcal:'))}">Aggiungi al Calendario</a><button class="btn sm" type="button" data-ca="${CACT.push(async()=>{if(await copyText(url))toast('Link copiato','ok');})-1}">Copia link</button></div>
      <p class="mini" style="margin-top:12px">Il link è privato: chi lo ha può vedere titoli e date. <button class="btn sm ghost" type="button" data-ca="${CACT.push(()=>calNewToken(true))-1}">Cambia link</button></p>`
    :`<p class="mini" style="margin-top:-6px">Vedi scadenze dei ticket e pagamenti direttamente nel Calendario dell'iPhone (o di Google, Outlook…), aggiornati ogni ora.</p>
      <button class="btn sm pri" type="button" style="margin-top:10px" data-ca="${CACT.push(()=>calNewToken(false))-1}">Crea il link privato</button>`}</div>`;
}
const ago=ms=>{const m=Math.round((Date.now()-ms)/60000);return m<1?'adesso':m<60?`${m} min fa`:m<1440?`${Math.round(m/60)} ${plural(Math.round(m/60),'ora','ore')} fa`:`${Math.round(m/1440)} ${plural(Math.round(m/1440),'giorno','giorni')} fa`;};
async function calNewToken(again){
  if(again&&!confirm('Il vecchio link smette di funzionare: sull\'iPhone dovrai abbonarti di nuovo. Continuare?'))return;
  const old=CACHE.calfeed&&CACHE.calfeed.get('main');const b=crypto.getRandomValues(new Uint8Array(24));
  const token='cal_'+b64u(b.buffer);const prev=[...((old&&old.prev)||[]),...(old&&old.token?[old.token]:[])].slice(-5);
  if(await put('calfeed/main',{token,prev,created:Date.now()}))toast(again?'Nuovo link creato: pronto entro un\'ora':'Link creato: sarà pronto entro un\'ora','ok');renderCal();
}
$('#c-grid').addEventListener('click',e=>{const b=e.target.closest('[data-cd]');if(!b)return;S.calSel=b.dataset.cd;if(S.calSel.slice(0,7)!==S.calMonth)S.calMonth=S.calSel.slice(0,7);renderCal();
  if(matchMedia('(max-width:1000px)').matches)$('#c-day').scrollIntoView({behavior:'smooth',block:'start'});});
$('#v-calendario').addEventListener('click',e=>{const b=e.target.closest('[data-ca]');if(b){const f=CACT[+b.dataset.ca];if(f)f();}});
const calShift=n=>{const [y,m]=S.calMonth.split('-').map(Number);const d=new Date(y,m-1+n,1);S.calMonth=isoDay(d).slice(0,7);renderCal();};
$('#c-prev').onclick=()=>calShift(-1);$('#c-next').onclick=()=>calShift(1);$('#c-today').onclick=()=>{S.calMonth=isoDay().slice(0,7);S.calSel=isoDay();renderCal();};

/* ================= ABITUDINI ================= */
S.habits=[];
const HCOL=['#3dff9a','#ff2e93','#43b3ff','#ffb547','#b794ff','#22d3ee','#ffd60a'];
const HEMO=['💧','📚','🏃','🧘','💪','🥗','😴','🚭','🎸','🧠','✍️','🌱','💊','🧹','🇬🇧','📵'];
const hList=()=>S.habits.filter(h=>!h.archived).sort((a,b)=>(a.order??a.created??0)-(b.order??b.created??0));
async function habitToggle(h,day=isoDay()){
  const cur=S.habits.find(x=>x.id===h.id)||h;const b=body(cur);b.done={...(b.done||{})};
  if(b.done[day])delete b.done[day];else b.done[day]=1;b.upd=Date.now();await put('habits/'+h.id,b);
  if(b.done[day]){const st=CapriDigest.habitStreak(b,isoDay());if([3,7,14,21,30,50,100,200,365].includes(st))toast(`🔥 ${cur.name}: ${st} giorni di fila!`,'ok');
    else if(!CapriDigest.habitsLeft(hList().map(x=>x.id===h.id?b:x),isoDay()).length&&hList().length>1)toast('Tutte le abitudini di oggi fatte ✨','ok');}
}
function last7(h){const t=isoDay();return Array.from({length:7},(_,i)=>CapriDigest.addDays(t,i-6)).map(d=>({d,on:CapriDigest.habitOn(h,d),done:!!(h.done||{})[d]}));}
function habitsCard(card,A){
  const hs=hList(),t=isoDay();
  if(!hs.length)return card('var(--cpg)','check','Abitudini',null,`<p class="mini">Piccole cose da fare ogni giorno: bere acqua, leggere, allenarti. Le spunti qui e vedi quanti giorni di fila le porti avanti.</p><button class="btn sm ghost" style="margin-top:12px;width:100%" data-oa="${A(()=>habitModal(null))}">${ico('plus')}Prima abitudine</button>`);
  const today=hs.filter(h=>CapriDigest.habitOn(h,t)),done=today.filter(h=>(h.done||{})[t]).length;
  const rows=hs.map(h=>{const on=CapriDigest.habitOn(h,t),dn=!!(h.done||{})[t],st=CapriDigest.habitStreak(h,t);
    return`<div class="hrow${dn?' done':''}${on?'':' rest'}" style="--c:${esc(h.color||HCOL[0])}"><button class="hck" data-oa="${A(()=>habitToggle(h))}" aria-pressed="${dn}" aria-label="${esc(h.name)}">${dn?'✓':''}</button>
      <button class="hname" data-oa="${A(()=>habitModal(h))}"><span class="he">${esc(h.emoji||'•')}</span><b>${esc(h.name)}</b>${on?'':'<em>oggi riposo</em>'}</button>
      <span class="h7" aria-hidden="true">${last7(h).map(x=>`<i class="${x.done?'y':x.on?(x.d===t?'t':'n'):'o'}"></i>`).join('')}</span><span class="hst" title="Giorni di fila">${st?'🔥'+st:''}</span></div>`;}).join('');
  return card('var(--cpg)','check',`Abitudini<span class="hprog">${done}/${today.length}</span>`,null,`<div class="hl">${rows}</div><button class="btn sm ghost" style="margin-top:12px;width:100%" data-oa="${A(()=>habitModal(null))}">${ico('plus')}Nuova abitudine</button>`);
}
function habitModal(h){
  const isNew=!h;const d=h?clone(h):{id:uid(),name:'',emoji:'💧',color:HCOL[hList().length%HCOL.length],days:CapriDigest.ALL.slice(),done:{},created:Date.now()};
  d.days=Array.isArray(d.days)&&d.days.length?d.days:CapriDigest.ALL.slice();
  const st=isNew?0:CapriDigest.habitStreak(d,isoDay()),tot=Object.keys(d.done||{}).length;
  openModal(`<div class="mh"><h2>${isNew?'Nuova abitudine':'Abitudine'}</h2><button class="x" data-close aria-label="Chiudi">×</button></div>
  <form class="form" id="hf" autocomplete="off">
    <label class="f full"><span>Nome</span><input name="name" maxlength="60" value="${esc(d.name)}" placeholder="Es. Bere 2 litri d'acqua" autofocus required></label>
    <div class="f full"><span>Simbolo</span><div class="emo" id="h-emo">${HEMO.map(e=>`<button type="button" class="${e===d.emoji?'on':''}" data-e="${e}">${e}</button>`).join('')}<input id="h-emo-x" maxlength="4" placeholder="Altro" value="${HEMO.includes(d.emoji)?'':esc(d.emoji||'')}" aria-label="Altro simbolo"></div></div>
    <div class="f full"><span>Colore</span><div class="swatches">${HCOL.map(c=>`<label><input type="radio" name="hc" value="${c}" ${c===d.color?'checked':''}><i style="--c:${c}"></i></label>`).join('')}</div></div>
    <div class="f full"><span>In quali giorni</span><div class="sl-days" id="h-days">${DAYS.map((x,j)=>`<button type="button" class="${d.days.includes(j)?'on':''}" data-d="${j}" aria-pressed="${d.days.includes(j)}">${x}</button>`).join('')}</div></div>
  </form>
  ${isNew?'':`<p class="mini">🔥 ${st} ${plural(st,'giorno','giorni')} di fila · fatta ${tot} ${plural(tot,'volta','volte')} in tutto. Puoi spuntare anche ieri: <button class="btn sm ghost" type="button" id="h-yday">${(d.done||{})[CapriDigest.addDays(isoDay(),-1)]?'Togli ieri':'Segna fatta ieri'}</button></p>`}
  <div class="mf">${isNew?'':'<button class="btn danger" id="h-del" type="button">Elimina</button>'}<span class="sp"></span><button class="btn ghost" data-close type="button">Annulla</button><button class="btn pri" id="h-save" type="button">${isNew?'Aggiungi':'Salva'}</button></div>`);
  $('#h-emo').addEventListener('click',e=>{const b=e.target.closest('[data-e]');if(!b)return;d.emoji=b.dataset.e;$('#h-emo-x').value='';$$('#h-emo [data-e]').forEach(x=>x.classList.toggle('on',x===b));});
  $('#h-days').addEventListener('click',e=>{const b=e.target.closest('[data-d]');if(!b)return;const j=+b.dataset.d;d.days=d.days.includes(j)?d.days.filter(x=>x!==j):d.days.concat(j).sort();b.classList.toggle('on');b.setAttribute('aria-pressed',d.days.includes(j));});
  const yb=$('#h-yday');if(yb)yb.onclick=async()=>{await habitToggle(d,CapriDigest.addDays(isoDay(),-1));closeModal();};
  const del=$('#h-del');if(del)del.onclick=async()=>{if(!armed(del,'Conferma'))return;closeModal();await drop('habits/'+d.id);toast('Abitudine eliminata','ok');};
  $('#h-save').onclick=async()=>{
    const fd=new FormData($('#hf'));d.name=String(fd.get('name')||'').trim();if(!d.name){toast('Dai un nome all\'abitudine','err');return;}
    const ex=$('#h-emo-x').value.trim();if(ex)d.emoji=ex;d.color=String(fd.get('hc')||d.color);if(!d.days.length){toast('Scegli almeno un giorno','err');return;}
    const cur=S.habits.find(x=>x.id===d.id);if(cur)d.done=cur.done||{};d.upd=Date.now();
    closeModal();await put('habits/'+d.id,body(d));toast(isNew?'Abitudine aggiunta':'Salvata','ok');if(isNew)addWeekly().catch(()=>{});
  };
}

/* ================= RIPASSO DEL DIARY ================= */
function reviewCard(card,A){
  const q=CapriDigest.reviewQueue(S.diary,isoDay());if(!q.length)return'';
  const x=q[0],n=(x.rev&&x.rev.n)||0;
  return card('var(--dy)','book','Da ripassare',null,`<p class="mini" style="margin:-6px 0 10px">${n?`Ripasso n. ${n+1}`:'Primo ripasso'} · scritto il ${fmtDate(x.date)}${q.length>1?` · altri ${q.length-1} in coda`:''}</p>
    <div class="rv">${x.title?`<b>${esc(x.title)}</b>`:''}<div class="md rv-b">${md(x.body||'')}</div></div>
    <div class="rv-a"><button class="btn sm ok" data-oa="${A(()=>reviewDone(x,true))}">✓ Me lo ricordo</button><button class="btn sm ghost" data-oa="${A(()=>reviewDone(x,false))}">Rivedilo domani</button><button class="btn sm ghost" data-oa="${A(()=>diaryModal(x))}">Apri</button></div>`);
}
async function reviewDone(x,ok){
  const t=isoDay(),R=CapriDigest.REV,n=ok?((x.rev&&x.rev.n)||0)+1:0,days=ok?R[Math.min(n,R.length-1)]:1;
  const cur=S.diary.find(y=>y.id===x.id)||x;const b=body(cur);b.rev={n,next:CapriDigest.addDays(t,days),last:t};
  if(await put('diary/'+x.id,b))toast(ok?`Bene! Torna tra ${days} giorni`:'Lo rivedi domani','ok');
}

/* ================= SICUREZZA DELL'ACCOUNT ================= */
async function securityModal(){
  const at=await loginAt();const until=at?new Date(at+LOGIN_TTL):null;
  let f=null,mfaErr='';if(!LOCAL)try{f=await totpFactor();}catch(e){mfaErr=errMsg(e);}
  openModal(`<div class="mh"><h2>Sicurezza</h2><button class="x" data-close aria-label="Chiudi">×</button></div>
  <div class="sec">
    ${LOCAL?`<div class="sec-row"><div><b>Accesso solo dai tuoi dispositivi</b><p class="mini">Capri è sul tuo dispositivo e si raggiunge soltanto dalla tua rete privata Tailscale: un estraneo non vede nemmeno la pagina di accesso. In più serve la tua password.</p></div></div>`:`    <div class="sec-row"><div><b>Verifica in due passaggi</b><p class="mini">${f?'✅ Attiva: per entrare servono password e codice dell\'app di autenticazione.':'Oltre alla password, chiede un codice di 6 cifre da un\'app come Google Authenticator, Authy o Password di iPhone.'}${mfaErr?' ('+esc(mfaErr)+')':''}</p></div>
      ${f?'<button class="btn sm danger" id="sc-mfa-off" type="button">Disattiva</button>':'<button class="btn sm pri" id="sc-mfa-on" type="button">Attiva</button>'}</div>
    <div id="sc-enroll"></div>
    ${f?`<div class="sec-row"><div><b>Rendila obbligatoria anche per il database</b><p class="mini">Senza il codice, il database rifiuta ogni richiesta, anche fuori dal sito. Copia il codice, incollalo nel <a href="${SUPA_SQL()}" target="_blank" rel="noopener">SQL Editor di Supabase</a> e premi Run. Widget, Siri e notifiche continuano a funzionare.</p></div><button class="btn sm" data-sqlcp type="button">Copia SQL</button></div>`:''}
    <div class="sec-row"><div style="flex:1"><b>Face ID / impronta</b><p class="mini">Entri con il volto o l'impronta invece della password. La chiave resta nel portachiavi del dispositivo (con iCloud vale anche sugli altri tuoi dispositivi Apple).</p><div class="pk-list" id="sc-pk-list"></div></div>
      <button class="btn sm pri" id="sc-pk-add" type="button"${pkSupported()?'':' disabled title="Questo browser non lo supporta"'}>Aggiungi questo dispositivo</button></div>
`}
    <form class="sec-row" id="sc-pw"><div style="flex:1"><b>Cambia password</b><p class="mini">Almeno 10 caratteri. Meglio una frase lunga.</p>
      <div class="sec-pw"><input type="password" id="sc-p1" autocomplete="new-password" placeholder="Nuova password" minlength="10" required><input type="password" id="sc-p2" autocomplete="new-password" placeholder="Ripetila" minlength="10" required></div></div>
      <button class="btn sm" type="submit">Salva</button></form>
    <div class="sec-row"><div><b>Esci da tutti i dispositivi</b><p class="mini">Utile se hai usato un computer non tuo o hai perso il telefono. ${until?`Su questo dispositivo l'accesso scade il ${until.toLocaleDateString('it-IT',{day:'numeric',month:'long'})} alle ${until.toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'})}.`:''}</p></div><button class="btn sm danger" id="sc-out" type="button">Esci ovunque</button></div>
  </div>`,{wide:true});
  const drawPk=async()=>{const el=$('#sc-pk-list');if(!el)return;
    try{const{data,error}=await SB.auth.passkey.list();if(error)throw error;const l=Array.isArray(data)?data:(data&&(data.passkeys||data.items))||[];
      el.innerHTML=l.length?l.map(k=>`<div>🔑<span><b>${esc(k.friendly_name||'Passkey')}</b><br><span class="mini">aggiunta il ${fmtDate(k.created_at)}${k.last_used_at?` · usata ${esc(ago(Date.parse(k.last_used_at)))}`:''}</span></span><button class="btn sm ghost" type="button" data-pkdel="${esc(k.id)}">Rimuovi</button></div>`).join(''):'<p class="mini" style="margin:0">Nessun dispositivo collegato.</p>';}
    catch(e){el.innerHTML=`<p class="mini" style="margin:0">${esc(pkErr(e)||errMsg(e))}</p>`;}};
  drawPk();
  if($('#sc-pk-list'))$('#sc-pk-list').addEventListener('click',async e=>{const b=e.target.closest('[data-pkdel]');if(!b||!armed(b,'Conferma'))return;
    const{error}=await SB.auth.passkey.delete({passkeyId:b.dataset.pkdel});if(error){toast('Non riuscito: '+errMsg(error),'err');return;}toast('Dispositivo rimosso','ok');drawPk();});
  if($('#sc-pk-add'))$('#sc-pk-add').onclick=async()=>{const b=$('#sc-pk-add');b.disabled=true;
    try{const{data,error}=await SB.auth.registerPasskey();if(error)throw error;
      const id=data&&(data.id||(data.passkey&&data.passkey.id));if(id)try{await SB.auth.passkey.update({passkeyId:id,friendlyName:pkName()+' · '+new Date().toLocaleDateString('it-IT')});}catch(e){}
      try{localStorage.setItem('capri-passkey','1');}catch(e){}toast('Fatto: la prossima volta entri con Face ID','ok');drawPk();}
    catch(e){const m=pkErr(e);if(m)toast(m,'err');}b.disabled=false;};
  const on=$('#sc-mfa-on');
  if(on)on.onclick=async()=>{on.disabled=true;
    try{const old=await SB.auth.mfa.listFactors();for(const x of((old.data&&(old.data.all||old.data.totp))||[]).filter(x=>x.status!=='verified'&&(x.factor_type||'totp')==='totp'))await SB.auth.mfa.unenroll({factorId:x.id});
      const{data,error}=await SB.auth.mfa.enroll({factorType:'totp',friendlyName:'Capri '+new Date().toISOString().slice(0,10)});if(error)throw error;
      const qr=String(data.totp.qr_code||'');const src=/^data:image\/svg\+xml/.test(qr)?qr:'data:image/svg+xml;utf-8,'+encodeURIComponent(qr);
      $('#sc-enroll').innerHTML=`<div class="sec-qr"><img src="${esc(src)}" alt="Codice QR da inquadrare con l'app di autenticazione"><div>
        <p class="mini" style="margin-top:0">1. Apri l'app di autenticazione e inquadra il codice QR. Sull'iPhone puoi anche tenere premuto il codice segreto qui sotto e copiarlo.</p>
        <code class="sec-secret">${esc(data.totp.secret)}</code>
        ${data.totp.uri?`<a class="btn sm" style="margin-top:8px" href="${esc(data.totp.uri)}">Apri nell'app di autenticazione (dal telefono)</a>`:''}
        <p class="mini">2. Scrivi il codice di 6 cifre che compare nell'app.</p>
        <div class="sec-pw"><input id="sc-code" inputmode="numeric" autocomplete="one-time-code" maxlength="7" placeholder="123456"><button class="btn sm pri" id="sc-verify" type="button">Conferma</button></div></div></div>`;
      on.hidden=true;
      $('#sc-verify').onclick=async()=>{try{const r=await SB.auth.mfa.challengeAndVerify({factorId:data.id,code:$('#sc-code').value.replace(/\s/g,'')});if(r.error)throw r.error;toast('Verifica in due passaggi attiva','ok');securityModal();}
        catch(e){toast('Codice non valido: riprova con quello nuovo','err');}};
    }catch(e){toast('Non riesco ad attivarla: '+errMsg(e),'err');on.disabled=false;}};
  const off=$('#sc-mfa-off');
  if(off)off.onclick=async()=>{if(!confirm('Disattivare la verifica in due passaggi? Per entrare basterà di nuovo la sola password.'))return;
    try{const{error}=await SB.auth.mfa.unenroll({factorId:f.id});if(error)throw error;toast('Verifica in due passaggi disattivata','ok');securityModal();}catch(e){toast('Non riuscito: '+errMsg(e),'err');}};
  const cp=DLG.querySelector('[data-sqlcp]');
  if(cp)cp.onclick=async()=>{try{const r=await fetch('sicurezza.sql',{cache:'no-store'});if(!r.ok)throw new Error('file non trovato');if(await copyText(await r.text()))toast('Copiato: incollalo nel SQL Editor','ok');else toast('Copia non riuscita','err');}catch(e){toast('Errore: '+errMsg(e),'err');}};
  $('#sc-pw').onsubmit=async e=>{e.preventDefault();const p1=$('#sc-p1').value,p2=$('#sc-p2').value;
    if(p1.length<10){toast('Serve una password di almeno 10 caratteri','err');return;}if(p1!==p2){toast('Le due password non coincidono','err');return;}
    const{error}=await SB.auth.updateUser({password:p1});
    if(error){toast(/reauth|recent/i.test(error.message)?'Per sicurezza Supabase chiede di rientrare: esci, rientra e riprova.':'Non riuscito: '+errMsg(error),'err');return;}
    $('#sc-p1').value=$('#sc-p2').value='';toast('Password cambiata','ok');};
  $('#sc-out').onclick=async()=>{if(!confirm('Esci da Capri su tutti i dispositivi, compreso questo?'))return;
    try{await SB.auth.signOut({scope:'global'});}catch(e){}await authStorage.removeItem('capri-login-at');location.reload();};
}

/* ================= SUPABASE SVEGLIO (contro la pausa del piano gratuito) ================= */
const lastBeat=()=>{const d=CACHE.heartbeat&&CACHE.heartbeat.get('main');return d&&d.at?d:null;};
async function beat(){await put('heartbeat/main',{at:Date.now(),from:'sito'});await SB.from('docs').select('id').eq('coll','heartbeat').range(0,0);}
function beatText(){const h=lastBeat();if(!h)return'Nessun segnale ancora registrato.';const m=Math.round((Date.now()-h.at)/60000);
  const t=m<1?'adesso':m<60?`${m} min fa`:m<1440?`${Math.round(m/60)} ${plural(Math.round(m/60),'ora','ore')} fa`:`${Math.round(m/1440)} ${plural(Math.round(m/1440),'giorno','giorni')} fa`;
  return `Ultimo segnale ${t} (${h.from==='github'?'automatico, ogni ora':'da questo sito'}).`;}

/* ================= RIEPILOGO SETTIMANALE (una volta sola) ================= */
async function addWeekly(){
  if(!S.cfg)return;const n=notifCfg();
  const want=[['weeklyAdded',{id:'sw',h:9,kind:'settimana',days:[0]}],['reviewAdded',{id:'rv',h:18,kind:'ripasso',days:CapriDigest.ALL.slice()}]];
  if(S.habits.some(h=>!h.archived))want.push(['habitsAdded',{id:'hb',h:21,kind:'abitudini',days:CapriDigest.ALL.slice()}]);
  const todo=want.filter(([f])=>!n[f]);if(!todo.length)return;
  const sl=clone(CapriDigest.slots(n)),flags={};
  for(const [f,slot] of todo){flags[f]=true;if(!sl.some(x=>x.kind===slot.kind)&&sl.length<8)sl.push(slot);}
  await put('config/main',{...S.cfg,notify:{...n,...flags,slots:sl}});
}

/* ================= iPHONE: widget e Siri (Scriptable) ================= */
const SITE_URL=()=>location.origin+location.pathname.replace(/index\.html$/,'');
const SUPA_SQL=()=>{const m=String((getCfg()||{}).url||'').match(/https:\/\/([a-z0-9]+)\.supabase\.co/);return m?`https://supabase.com/dashboard/project/${m[1]}/sql/new`:'https://supabase.com/dashboard';};
function apiToken(){const d=CACHE.apitoken&&CACHE.apitoken.get('main');return d&&d.token&&d.token.length>=32?d.token:'';}
async function newToken(){const b=crypto.getRandomValues(new Uint8Array(24));const t='cap_'+b64u(b.buffer);await put('apitoken/main',{token:t,created:Date.now()});return t;}
async function copyText(txt){
  try{await navigator.clipboard.writeText(txt);return true;}catch(e){}
  const ta=document.createElement('textarea');ta.value=txt;ta.setAttribute('readonly','');ta.style.cssText='position:fixed;top:0;left:0;opacity:0';document.body.append(ta);ta.select();ta.setSelectionRange(0,txt.length);
  let ok=false;try{ok=document.execCommand('copy');}catch(e){}ta.remove();return ok;
}
async function iphoneModal(){
  let tok=apiToken();
  if(!tok){try{tok=await newToken();}catch(e){toast('Non riesco a creare la chiave: '+errMsg(e),'err');return;}}
  const C=getCfg()||{};const files={};
  const fill=s=>s.split('__URL__').join(C.url||'').split('__KEY__').join(C.key||'').split('__TOKEN__').join(tok).split('__SITE__').join(SITE_URL());
  const getF=async f=>{if(!files[f]){const r=await fetch('iphone/'+f,{cache:'no-store'});if(!r.ok)throw new Error('file '+f+' non trovato');files[f]=await r.text();}return f.endsWith('.sql')?files[f]:fill(files[f]);};
  Promise.all(['capri_api.sql','capri-widget.js','capri-aggiungi.js'].map(f=>getF(f).catch(()=>{})));
  const step=(n,t,body)=>`<div class="ip-step"><div class="ip-n">${n}</div><div><b>${t}</b>${body}</div></div>`;
  openModal(`<div class="mh"><h2>Siri e widget iPhone</h2><button class="x" data-close aria-label="Chiudi">×</button></div>
  <p class="mini" style="margin:0 0 14px">Con l'app gratuita Scriptable vedi ticket urgenti e spese sulla schermata Home o di blocco, e aggiungi cose a voce: “Ehi Siri, Capri” → “spesa 12,50 pizza”.</p>
  <div class="ip">
  ${step(1,LOCAL?'Tieni acceso Tailscale sull\'iPhone':'Attiva l\'ingresso per l\'iPhone (una volta sola)',(LOCAL?`<p>Widget e Siri parlano direttamente con il tuo dispositivo: funzionano quando sull'iPhone è attiva l'app Tailscale (anche fuori casa).</p>`:`<p>Copia il codice, apri il <a href="${SUPA_SQL()}" target="_blank" rel="noopener">SQL Editor di Supabase</a>, incollalo e premi <b>Run</b>.</p>`)+`
    <div class="ip-b">${LOCAL?'':'<button class="btn sm" type="button" data-cp="capri_api.sql">Copia codice SQL</button>'}<button class="btn sm ghost" type="button" id="ip-check">Verifica collegamento</button></div><p class="mini" id="ip-res"></p>`)}
  ${step(2,'Installa Scriptable e incolla i due script',`<p>Scarica <a href="https://apps.apple.com/app/scriptable/id1405459188" target="_blank" rel="noopener">Scriptable</a>. Per ogni script: tocca <b>+</b>, incolla, poi tocca il titolo in alto e chiamalo come indicato.</p>
    <div class="ip-b"><button class="btn sm" type="button" data-cp="capri-widget.js">Copia script “Capri Widget”</button><button class="btn sm" type="button" data-cp="capri-aggiungi.js">Copia script “Capri Aggiungi”</button></div>`)}
  ${step(3,'Aggiungi il widget',`<p><b>Home:</b> tieni premuto su uno spazio vuoto → <b>Modifica</b> → <b>Aggiungi widget</b> → Scriptable → scegli la misura → tocca il widget → Script: <b>Capri Widget</b>.<br><b>Schermata di blocco:</b> tienila premuta → <b>Personalizza</b> → Schermata di blocco → tocca l'area dei widget → Scriptable → poi scegli <b>Capri Widget</b> allo stesso modo.</p>`)}
  ${step(4,'Crea il comando Siri',`<p>Apri <b>Comandi</b> → <b>+</b> → aggiungi l'azione <b>Detta testo</b>, poi l'azione di Scriptable <b>Run Script</b>: scegli <b>Capri Aggiungi</b> e come parametro (Parameter) il <b>Testo dettato</b>. Chiama il comando <b>Capri</b>.</p>
    <p class="mini">Prova a dire: “spesa 12,50 pizza” · “ho speso 30 euro di benzina” · “ticket chiamare il commercialista domani urgente” · “nota comprare le batterie” · “diario il rebase si fa con git rebase -i”.</p>`)}
  </div>
  <div class="note-box" style="margin-top:14px">La chiave personale è già dentro gli script: non condividerli. Se la rigeneri, ricopia i due script su Scriptable.</div>
  <div class="mf"><button class="btn danger ghost sm" id="ip-regen" type="button">Rigenera chiave</button><span class="sp"></span><button class="btn pri" type="button" data-close>Fatto</button></div>`,{wide:true});
  DLG.querySelectorAll('[data-cp]').forEach(b=>b.onclick=async()=>{
    const f=b.dataset.cp;let txt;try{txt=await getF(f);}catch(e){toast('Non riesco a leggere lo script: '+errMsg(e),'err');return;}
    if(await copyText(txt)){toast('Copiato: ora incollalo','ok');b.classList.add('ok');}
    else{toast('Copia non riuscita: scarico il file','err');saveBlob(f,new Blob([txt],{type:'text/plain'}));}
  });
  $('#ip-check').onclick=async()=>{const r=$('#ip-res');r.textContent='Verifico…';
    try{const {data,error}=await SB.rpc('capri_api',{p_token:apiToken(),p_action:'riepilogo'});if(error)throw error;
      r.innerHTML=`✅ Funziona: ${(data.tickets||[]).length} ticket aperti, ${(data.spese||[]).length} spese questo mese.`;}
    catch(e){const m=errMsg(e);r.textContent=/capri_api|PGRST202|function|schema cache/i.test(m+(e&&e.code))?(LOCAL?'Non funziona: '+m:'Non ancora attivo: esegui prima il codice SQL su Supabase.'):'Non funziona: '+m;}};
  $('#ip-regen').onclick=async()=>{if(!confirm('La vecchia chiave smette di funzionare e dovrai ricopiare i due script. Continuare?'))return;
    try{tok=await newToken();toast('Nuova chiave creata: ricopia i due script','ok');}catch(e){toast('Errore: '+errMsg(e),'err');}};
}

/* ================= MENU: backup, install, logout ================= */
function backupData(){
  const out={app:'capri',version:1,exported:new Date().toISOString()};
  for(const k in CACHE){if(/^(push|apitoken|heartbeat)/.test(k))continue;out[k]=[...CACHE[k].entries()].map(([id,data])=>({id,data}));}
  return out;
}
$('#menu-btn').onclick=()=>{
  const ios=/iphone|ipad|ipod/i.test(navigator.userAgent);
  openModal(`<div class="mh"><h2>Capri</h2><button class="x" data-close aria-label="Chiudi">×</button></div>
  <p class="mut small" style="margin-top:0">Collegato come <b style="color:#fff">${esc(EMAIL)}</b></p>
  <div class="menu">
    <div style="display:flex;gap:8px"><input id="m-name" placeholder="Come ti chiamo?" value="${esc(cfg().name)}" maxlength="30" aria-label="Il tuo nome"><button class="btn" id="m-name-ok" type="button">Salva nome</button></div>
    <button class="btn" id="m-notif" type="button">${ico('bell')}Notifiche giornaliere</button>
    <button class="btn" id="m-ios" type="button">${ico('play')}Siri e widget iPhone</button>
    <button class="btn" id="m-sec" type="button">${ico('lock')}Sicurezza dell'account</button>
    ${LOCAL?`<div class="note-box"><b>I tuoi dati sono a casa tua</b><br><span class="mini">Capri vive sul tuo dispositivo: nessun cloud. Ogni notte fa una copia di sicurezza<span id="m-bk-t"></span>.</span>
      <div style="margin-top:10px"><button class="btn sm" id="m-bk" type="button">${ico('refresh')}Fai una copia adesso</button></div></div>`:`<div class="note-box"><b>Database sveglio</b><br><span id="m-beat-t">${esc(beatText())}</span><br><span class="mini">Supabase gratuito va in pausa dopo una settimana senza attività: Capri manda un segnale ogni ora e ogni volta che lo apri.</span>
      <div style="margin-top:10px"><button class="btn sm" id="m-beat" type="button">${ico('refresh')}Manda un segnale adesso</button></div></div>`}
    <button class="btn" id="m-wake" type="button">${ico('logo')}<span>${'wakeLock' in navigator?(wakeWanted()?'Computer sempre sveglio: attivo (tocca per spegnere)':'Computer sempre sveglio: spento (tocca per attivare)'):'Computer sempre sveglio: non supportato da questo browser'}</span></button>
    <button class="btn" id="m-exp" type="button">Scarica backup completo (file .json)</button>
    <label class="btn" style="cursor:pointer"><input type="file" accept=".json,application/json" hidden id="m-imp">Ripristina da un backup</label>
    <div class="note-box"><b>Installa come app</b><br>${ios?'In Safari tocca Condividi, poi “Aggiungi alla schermata Home”.':'Nel menu del browser (⋮) scegli “Installa app” o “Aggiungi a schermata Home”.'} Capri si aprirà a schermo intero con la sua icona.</div>
    <div class="note-box">${LOCAL?'Il backup scaricato contiene ticket, wishlist, spese, abbonamenti, note, fogli e impostazioni; gli allegati sono nella copia notturna sul dispositivo.':'Gli allegati restano nel tuo archivio Supabase: il backup contiene ticket, wishlist, spese, abbonamenti, note, fogli e impostazioni.'}</div>
    <button class="btn danger" id="m-out" type="button">Esci</button>
  </div>`);
  $('#m-name-ok').onclick=async()=>{const n=$('#m-name').value.trim();await put('config/main',{...(S.cfg||{}),...cfg(),name:n});toast('Nome salvato','ok');renderOggi();};
  $('#m-notif').onclick=()=>{closeModal();notifModal();};
  $('#m-ios').onclick=()=>{closeModal();iphoneModal();};
  $('#m-sec').onclick=()=>{closeModal();securityModal();};
  if(LOCAL){fetch('api/stato',{cache:'no-store'}).then(r=>r.json()).then(j=>{const t=$('#m-bk-t');if(t&&j.backup)t.textContent=` in “${j.backup.dir.split('/').slice(-2).join('/')}”${j.backup.ultimo?' (ultima: '+j.backup.ultimo.split('-').reverse().join('/')+')':''}`;}).catch(()=>{});
    $('#m-bk').onclick=async()=>{const b=$('#m-bk');b.disabled=true;try{const r=await fetch('api/backup',{method:'POST',headers:{'X-Capri':'1'}});if(!r.ok)throw new Error('errore '+r.status);toast('Copia di sicurezza fatta','ok');}catch(e){toast('Non riuscita: '+errMsg(e),'err');}b.disabled=false;};}
  else $('#m-beat').onclick=async()=>{const b=$('#m-beat');b.disabled=true;try{await beat();$('#m-beat-t').textContent=beatText();toast('Segnale inviato: Supabase resta attivo','ok');}catch(e){toast('Non riuscito: '+errMsg(e),'err');}b.disabled=false;};
  $('#m-wake').onclick=async()=>{if(!('wakeLock' in navigator)){toast('Questo browser non lo supporta: usa Chrome, Edge o Safari aggiornati','err');return;}
    const on=!wakeWanted();try{localStorage.setItem('capri-wake',on?'1':'0');}catch(e){}if(on)await wakeOn();else await wakeOff();
    $('#m-wake span').textContent=on?'Computer sempre sveglio: attivo (tocca per spegnere)':'Computer sempre sveglio: spento (tocca per attivare)';toast(on?(wakeActive()?'Il computer resterà sveglio finché Capri è aperto':'Attivo: parte appena Capri è in primo piano'):'Il computer può tornare in standby','ok');};
  $('#m-exp').onclick=()=>{saveBlob(`capri-backup-${isoDay()}.json`,new Blob([JSON.stringify(backupData(),null,1)],{type:'application/json'}));toast('Backup scaricato','ok');};
  $('#m-imp').onchange=async e=>{
    const f=e.target.files[0];e.target.value='';if(!f)return;
    let j;try{j=JSON.parse(await f.text());}catch(err){toast('File di backup non valido','err');return;}
    if(!j||j.app!=='capri'){toast('Questo non è un backup di Capri','err');return;}
    closeModal();let n=0;
    for(const coll of ['config','tickets','wishlist','sheets','spese','abbonamenti','note','diary','habits','playlists'])for(const d of j[coll]||[]){if(d&&d.id&&d.data){await put(coll+'/'+d.id,d.data);n++;}}
    toast(`Ripristinati ${n} elementi`,'ok');
  };
  $('#m-out').onclick=async()=>{await SB.auth.signOut();await authStorage.removeItem('capri-login-at');location.reload();};
};

/* ================= ROUTER + BOOT ================= */
const VIEWS=['oggi','ticket','wishlist','finanze','diary','note','musica','calendario'];
const HALIAS={spese:['finanze','spese'],abbonamenti:['finanze','abb'],fogli:['finanze','fogli']};
function route(){
  let hh=location.hash.slice(1);
  const qs=/(^|[?&])casuale\b/.test(location.search);
  if(hh==='casuale'||hh==='musica-casuale'||qs){hh='musica';try{history.replaceState(null,'',location.pathname+'#musica');}catch(e){}muAutoShuffle();}
  let v=hh;if(HALIAS[hh]){v=HALIAS[hh][0];S.fsub=HALIAS[hh][1];}
  if(!VIEWS.includes(v))v='oggi';
  if(S.ed&&!(v==='finanze'&&S.fsub==='fogli'))commitEdit(0,0,true);
  S.view=v;document.body.dataset.v=v;
  VIEWS.forEach(x=>{$('#v-'+x).hidden=x!==v;});
  $$('[data-nav]').forEach(a=>{a.classList.toggle('on',a.dataset.nav===v);if(a.dataset.nav===v)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
  if(v==='finanze')renderFin();else if(v==='oggi')renderOggi();else if(v==='note')renderNotes();else if(v==='diary')renderDiary();else if(v==='calendario')renderCal();else if(v==='musica'){muLoadLib();renderMusic();}
  try{if(navigator.clearAppBadge)navigator.clearAppBadge().catch(()=>{});}catch(e){}
  scrollTo(0,0);
}
addEventListener('hashchange',route);
/* iPhone: se il comando vocale riporta in primo piano l'app già aperta, ricontrolla l'indirizzo */
const recheckCasuale=()=>{if(/casuale/.test(location.hash+location.search))route();};
addEventListener('pageshow',recheckCasuale);document.addEventListener('visibilitychange',()=>{if(!document.hidden)recheckCasuale();});
route();

const finRefresh=()=>{if(S.view==='finanze'&&S.fsub!=='fogli')renderFin();};
SUBS.tickets=docs=>{S.tickets=docs.map(d=>({...clone(d.data),id:d.id}));S.loaded.t=1;renderTickets();renderOggi();};
SUBS.wishlist=docs=>{S.wish=docs.map(d=>({...clone(d.data),id:d.id}));S.loaded.w=1;renderWish();renderOggi();};
SUBS.sheets=onSheets;
SUBS.config=docs=>{const m=docs.find(d=>d.id==='main');S.cfg=m?clone(m.data):null;renderTickets();renderWish();renderOggi();finRefresh();};
SUBS.spese=docs=>{S.spese=docs.map(d=>({...clone(d.data),id:d.id}));renderOggi();finRefresh();};
SUBS.abbonamenti=docs=>{S.abb=docs.map(d=>({...clone(d.data),id:d.id}));renderOggi();finRefresh();};
SUBS.push=()=>{renderOggi();};
SUBS.diary=docs=>{S.diary=docs.map(d=>({...clone(d.data),id:d.id}));renderDiary();renderOggi();};
SUBS.habits=docs=>{S.habits=docs.map(d=>({...clone(d.data),id:d.id}));renderOggi();};
SUBS.calfeed=()=>{if(S.view==='calendario')renderCal();};SUBS.calstate=SUBS.calfeed;
SUBS.note=docs=>{S.notes=docs.map(d=>({...clone(d.data),id:d.id}));renderNotes();renderOggi();};

const gate=$('#gate');
function gateShow(mode,msg){gate.hidden=false;$('#g-login').hidden=mode!=='login';$('#g-mfa').hidden=mode!=='mfa';if(mode==='mfa')setTimeout(()=>$('#g-code').focus(),50);$('#g-setup').hidden=mode!=='setup';$('#g-msg').textContent=msg||'';$('#g-msg').hidden=!msg;}
function getCfg(){
  const c=window.CAPRI_CONFIG||{};
  if(c.local||(c.url&&c.key))return c;
  try{const j=JSON.parse(localStorage.getItem('capri-config')||'null');if(j&&j.url&&j.key)return j;}catch(e){}
  return null;
}
$('#g-setup').addEventListener('submit',e=>{e.preventDefault();const url=$('#g-url').value.trim().replace(/\/+$/,''),key=$('#g-key').value.trim();
  if(!/^https:\/\/[\w.-]+\.supabase\.(co|in)$/.test(url)){$('#g-err2').textContent='L’URL deve essere tipo https://xxxx.supabase.co';return;}
  try{localStorage.setItem('capri-config',JSON.stringify({url,key}));}catch(err){}location.reload();});
$('#g-login').addEventListener('submit',async e=>{
  e.preventDefault();const b=$('#g-go');b.disabled=true;b.textContent='Accesso…';$('#g-err').textContent='';
  const{data,error}=await SB.auth.signInWithPassword({email:$('#g-email').value.trim(),password:$('#g-pass').value});
  b.disabled=false;b.textContent='Entra';
  if(error){$('#g-err').textContent=/invalid/i.test(error.message)?'Email o password non corrette.':'Accesso non riuscito: '+error.message;return;}
  await authStorage.setItem('capri-login-at',String(Date.now()));
  proceed(data.session);
});
/* Verifica in due passaggi (TOTP): se l'account ha un'app di autenticazione collegata, serve anche il codice */
async function mfaState(){try{const{data,error}=await SB.auth.mfa.getAuthenticatorAssuranceLevel();if(error)throw error;return data||{};}catch(e){return{};}}
async function proceed(session){const a=await mfaState();if(a.nextLevel==='aal2'&&a.currentLevel!=='aal2'){gateShow('mfa','');return;}start(session);}
async function totpFactor(){const{data,error}=await SB.auth.mfa.listFactors();if(error)throw error;return((data&&data.totp)||[]).find(f=>f.status==='verified')||null;}
$('#g-mfa').addEventListener('submit',async e=>{
  e.preventDefault();const b=$('#g-go3');b.disabled=true;b.textContent='Verifico…';$('#g-err3').textContent='';
  try{const f=await totpFactor();if(!f)throw new Error('nessuna app collegata');
    const{error}=await SB.auth.mfa.challengeAndVerify({factorId:f.id,code:$('#g-code').value.replace(/\s/g,'')});if(error)throw error;
    const{data}=await SB.auth.getSession();$('#g-code').value='';start(data.session);}
  catch(err){$('#g-err3').textContent=/invalid|expired|code/i.test(errMsg(err))?'Codice non valido o scaduto: riprova con quello nuovo.':'Verifica non riuscita: '+errMsg(err);}
  b.disabled=false;b.textContent='Verifica';
});
/* Face ID / impronta: passkey di Supabase (le chiavi restano nel portachiavi del telefono) */
const pkSupported=()=>!LOCAL&&!!(window.PublicKeyCredential&&navigator.credentials&&navigator.credentials.get);
const pkHere=()=>{try{return localStorage.getItem('capri-passkey')==='1';}catch(e){return false;}};
const pkName=()=>isIOS?(/ipad/i.test(navigator.userAgent)||navigator.maxTouchPoints>1&&!/iphone/i.test(navigator.userAgent)?'iPad':'iPhone'):/mac/i.test(navigator.platform||'')?'Mac':/android/i.test(navigator.userAgent)?'Android':/win/i.test(navigator.platform||'')?'PC Windows':'Browser';
const pkErr=e=>{const m=errMsg(e);return/NotAllowed|abort|cancel/i.test((e&&e.name)||'')||/NotAllowed|aborted|cancel/i.test(m)?'':/disabled|not enabled|passkey.*(off|not)|404|not found/i.test(m)?'L\'accesso con Face ID non è ancora attivo su Supabase (Authentication → Passkeys).':m;};
if(pkSupported()){const b=$('#g-pk');b.hidden=false;if(pkHere()){b.classList.add('lead','pri');b.classList.remove('ghost');$('#g-go').classList.replace('pri','ghost');}
  b.onclick=async()=>{b.disabled=true;$('#g-err').textContent='';
    try{const{data,error}=await SB.auth.signInWithPasskey();if(error)throw error;const ses=(data&&data.session)||(await SB.auth.getSession()).data.session;if(!ses)throw new Error('accesso non riuscito');
      try{localStorage.setItem('capri-passkey','1');}catch(e){}await authStorage.setItem('capri-login-at',String(Date.now()));proceed(ses);}
    catch(e){const m=pkErr(e);if(m)$('#g-err').textContent=m;}b.disabled=false;};}
$('#g-mfa-out').onclick=async()=>{try{await SB.auth.signOut();}catch(e){}await authStorage.removeItem('capri-login-at');location.reload();};
async function start(session){
  UID=session.user.id;EMAIL=session.user.email||'';gate.hidden=true;setSync('Caricamento…','warn');
  try{await loadAll();syncState();}
  catch(e){setSync('Archivio non raggiungibile','err');showErr(e);S.loaded={t:1,w:1,s:1};S.ready=true;renderTickets();renderWish();renderOggi();renderNotes();renderDiary();if(S.view==='finanze')renderFin();return;}
  $('#errbar').hidden=true;
  S.loaded={t:1,w:1,s:1};S.ready=true;renderOggi();renderNotes();renderDiary();if(S.view==='finanze')renderFin();
  addWeekly().catch(()=>{});
  mUI();if(S.view==='musica'){muLoadLib();renderMusic();}else if(muHost())muLoadLib();
  if(!LOCAL){const h=lastBeat();if(!h||Date.now()-h.at>6*3600e3)beat().catch(()=>{});}
  movedBanner();
  try{SB.channel('docs-'+UID).on('postgres_changes',{event:'*',schema:'public',table:'docs',filter:'user_id=eq.'+UID},onRealtime).subscribe();}catch(e){}
  let lastLoad=Date.now();
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&Date.now()-lastLoad>20000&&!pendN&&!dirty.size&&!S.ed){lastLoad=Date.now();loadAll().catch(()=>{});}});
  setTimeout(()=>{if(!autoRan){autoRan=true;autoPrices(false);}},1200);
}
/* Dopo il trasloco sul tablet il vecchio sito avvisa dove si trova Capri adesso */
function movedBanner(){const m=!LOCAL&&(S.cfg||{}).migratedLocal;if(!m||$('#moved'))return;
  const d=document.createElement('div');d.id='moved';d.className='note-box';
  d.style.cssText='position:fixed;left:50%;bottom:calc(16px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:90;max-width:min(560px,calc(100vw - 24px));border-color:#3dff9a;box-shadow:0 0 24px rgba(61,255,154,.25)';
  d.innerHTML=`<b>Capri ora vive sul tuo tablet</b><br><span class="mini">Questa è la vecchia copia nel cloud e non si aggiorna più. ${m.url?`Apri <a href="${esc(m.url)}">${esc(m.url.replace(/^https:\/\//,''))}</a> (con Tailscale acceso).`:'Apri il nuovo indirizzo con Tailscale acceso.'}</span>`;
  document.body.appendChild(d);}
function showErr(e){
  const code=(e&&e.code)||'',msg=errMsg(e);let hint='';
  if(code==='42P01'||code==='PGRST205'||/does not exist|schema cache/i.test(msg))hint='La tabella dei dati non esiste: esegui il file setup.sql nel SQL Editor di Supabase.';
  else if(code==='42501'||/permission denied/i.test(msg))hint='Mancano i permessi sulla tabella: esegui di nuovo il file setup.sql aggiornato nel SQL Editor di Supabase.';
  else if(/fetch|network|load failed/i.test(msg))hint='Connessione assente, oppure il progetto Supabase è in pausa: riattivalo dalla sua dashboard.';
  else hint='Controlla che il progetto Supabase sia attivo e che setup.sql sia stato eseguito.';
  const b=$('#errbar');b.hidden=false;b.querySelector('.t').innerHTML=`<b>Non riesco a leggere i tuoi dati.</b> ${esc(hint)}<br><span class="mut small">Dettaglio tecnico: ${esc(msg)}${code?' ('+esc(code)+')':''}</span>`;
}
$('#errbar-retry').onclick=async()=>{const b=$('#errbar-retry');b.disabled=true;b.textContent='Riprovo…';try{await loadAll();$('#errbar').hidden=true;syncState();toast('Dati caricati','ok');}catch(e){showErr(e);}b.disabled=false;b.textContent='Riprova';};
$('#sync').addEventListener('click',()=>{const s=$('#sync');if(s.classList.contains('err')&&$('#errbar').hidden===false){$('#errbar').scrollIntoView({block:'center'});}else toast(s.title||'');});
const IDB={p:null,open(){return this.p=this.p||new Promise(res=>{try{const r=indexedDB.open('capri',1);r.onupgradeneeded=()=>r.result.createObjectStore('kv');r.onsuccess=()=>res(r.result);r.onerror=()=>res(null);}catch(e){res(null);}});},
  async run(mode,fn){const db=await this.open();if(!db)return null;return new Promise(res=>{try{const tx=db.transaction('kv',mode);const q=fn(tx.objectStore('kv'));tx.oncomplete=()=>res(q&&q.result!==undefined?q.result:null);tx.onerror=()=>res(null);}catch(e){res(null);}});},
  get(k){return this.run('readonly',s=>s.get(k));},set(k,v){return this.run('readwrite',s=>s.put(v,k));},del(k){return this.run('readwrite',s=>s.delete(k));}};
const authStorage={
  async getItem(k){let v=null;try{v=localStorage.getItem(k);}catch(e){}if(v==null){v=await IDB.get(k);if(v!=null)try{localStorage.setItem(k,v);}catch(e){}}return v;},
  async setItem(k,v){try{localStorage.setItem(k,v);}catch(e){}await IDB.set(k,v);},
  async removeItem(k){try{localStorage.removeItem(k);}catch(e){}await IDB.del(k);}
};
const LOGIN_TTL=48*3600e3;
async function loginAt(){const v=await authStorage.getItem('capri-login-at');return v?+v:0;}
async function boot(){
  const C=getCfg();
  if(!C){gateShow('setup','');return;}
  if(LOCAL)SB=window.CapriLocal.createClient();
  else{if(!window.supabase||!window.supabase.createClient){gateShow('',"Non riesco a caricare i componenti di Capri: controlla la connessione e ricarica la pagina.");return;}
  SB=window.supabase.createClient(C.url,C.key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,storageKey:'capri-auth',storage:authStorage,experimental:{passkey:true}}});}
  let session=null;
  for(let i=0;i<3&&!session;i++){try{const{data,error}=await SB.auth.getSession();session=data&&data.session;if(!session&&!error)break;}catch(e){}if(!session)await sleep(1200);}
  if(session){
    const at=await loginAt();
    if(at&&Date.now()-at>LOGIN_TTL){try{await SB.auth.signOut();}catch(e){}gateShow('login','Sono passate 48 ore dall’ultimo accesso: entra di nuovo.');return;}
    if(!at)await authStorage.setItem('capri-login-at',String(Date.now()));
    proceed(session);
  }else gateShow('login','');
}
boot();
}
