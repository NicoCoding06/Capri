{
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8);
const clone=o=>JSON.parse(JSON.stringify(o??null));
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
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
const cfg=()=>({tcats:(S.cfg&&S.cfg.tcats)||DEF.tcats,wcats:(S.cfg&&S.cfg.wcats)||DEF.wcats,scats:(S.cfg&&S.cfg.scats)||DEF.scats,sbudget:(S.cfg&&S.cfg.sbudget)||null,name:(S.cfg&&S.cfg.name)||''});
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
const CACHE={tickets:new Map(),wishlist:new Map(),sheets:new Map(),config:new Map(),spese:new Map(),abbonamenti:new Map(),note:new Map(),watch:new Map(),push:new Map(),pushkeys:new Map(),pushstate:new Map()};
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
  const title=key==='tcats'?'Macrocategorie dei ticket':key==='wcats'?'Categorie della wishlist':'Categorie e budget delle spese';const sc=key==='scats';
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
    const next={...cfg(),[key]:list};if(sc){const t=numIn($('#cm-tot').value);next.sbudget=t?Math.abs(t):null;}closeModal();
    await put('config/main',next);
    const targets=key==='tcats'?[['tickets',S.tickets]]:key==='wcats'?[['wishlist',S.wish]]:[['spese',S.spese],['abbonamenti',S.abb]];
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
    <div class="tk-h"><div class="tk-tags"><span class="pill">${um(ul)}${u.n}</span>${t.cat?`<span class="chip" style="--c:${esc(c?c.c:'#9a9aa3')}">${esc(t.cat)}</span>`:''}<span class="st ${esc(t.status)}">${STAT[t.status]||'Aperto'}</span></div>${countdown(t)}</div>
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
async function toggleDone(t){
  const b=body(t);const done=t.status!=='fatto';
  b.status=done?'fatto':'aperto';b.upd=Date.now();if(done)b.doneAt=Date.now();else delete b.doneAt;
  b.notes=(b.notes||[]).concat({t:Date.now(),x:done?'Ticket completato.':'Ticket riaperto.'});
  if(await put('tickets/'+t.id,b))toast(done?`#${t.num} completato`:`#${t.num} riaperto`,'ok');
}
function persistTicketPart(id,part){
  const base=S.tickets.find(t=>t.id===id);if(!base)return Promise.resolve(false);
  return put('tickets/'+id,{...body(base),...clone(part),upd:Date.now()});
}
function ticketModal(t){
  const isNew=!t;
  const d=t?clone(t):{id:uid(),title:'',cat:S.tf.cat||(cfg().tcats[0]?cfg().tcats[0].n:''),urg:2,status:'aperto',due:'',desc:'',att:[],notes:[],created:Date.now()};
  d.att=d.att||[];d.notes=d.notes||[];
  const ed={busy:0};
  const cats=cfg().tcats.slice();if(d.cat&&!cats.some(c=>c.n===d.cat))cats.push({n:d.cat,c:'#9a9aa3'});
  openModal(`<div class="mh">${isNew?'':`<span class="mut">#${esc(d.num)}</span>`}<h2>${isNew?'Nuovo ticket':'Ticket'}</h2><button class="x" data-close aria-label="Chiudi">×</button></div>
  <form class="form" id="tf" autocomplete="off">
    <label class="f full"><span>Titolo</span><input name="title" maxlength="200" value="${esc(d.title)}" autofocus required></label>
    <div class="f full"><span>Urgenza</span><div class="pick">${[1,2,3,4].map(u=>`<label style="--u:${URG[u].c}"><input type="radio" name="urg" value="${u}" ${(d.urg||2)===u?'checked':''}><b>${um(u)}${URG[u].n}</b></label>`).join('')}</div></div>
    <label class="f"><span>Macrocategoria</span><select name="cat"><option value="">Nessuna</option>${cats.map(c=>`<option ${c.n===d.cat?'selected':''}>${esc(c.n)}</option>`).join('')}</select></label>
    <label class="f"><span>Stato</span><select name="status">${Object.entries(STAT).map(([k,v])=>`<option value="${k}" ${d.status===k?'selected':''}>${v}</option>`).join('')}</select></label>
    <label class="f"><span>Scadenza</span><input type="date" name="due" value="${esc(d.due||'')}"></label>
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
  const read=()=>{const fd=new FormData($('#tf'));d.title=String(fd.get('title')||'').trim();d.urg=+fd.get('urg')||2;d.cat=String(fd.get('cat')||'');d.status=String(fd.get('status')||'aperto');d.due=String(fd.get('due')||'');d.desc=String(fd.get('desc')||'');};
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
    if(ed.busy){toast('Attendi la fine del caricamento degli allegati','err');return;}
    const b=body(d);
    if(isNew)b.num=Math.max(0,...S.tickets.map(x=>+x.num||0))+1;
    const prev=S.tickets.find(x=>x.id===d.id);
    if(b.status==='fatto'&&!b.doneAt)b.doneAt=Date.now();
    if(b.status!=='fatto')delete b.doneAt;
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
      ${(w.links||[]).length?`<div class="files">${w.links.map(u=>`<a class="file" href="${esc(u)}" target="_blank" rel="noopener">${esc(host(u))}</a>`).join('')}</div>`:''}
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
  ${(w.links||[]).length?`<div class="files" style="margin-bottom:12px">${w.links.map(u=>`<a class="file" href="${esc(u)}" target="_blank" rel="noopener">Controlla su ${esc(host(u))}</a>`).join('')}</div>`:''}
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
  $('#o-dash').innerHTML=cTodo+cMoney+cNext+cWish+cNotes;
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
  </div>`);
  DLG.querySelector('.quick').addEventListener('click',e=>{const b=e.target.closest('[data-q]');if(!b)return;const k=b.dataset.q;closeModal();if(k==='wish')wishModal(null);else quickAdd(k);});
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
const notifData=()=>({tickets:S.tickets,abb:S.abb,spese:S.spese,cfg:{name:cfg().name,scats:cfg().scats,sbudget:cfg().sbudget}});
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
    await put('config/main',{...(S.cfg||{}),notify:{on:true,slots:list.map(x=>({id:x.id,h:x.h,kind:x.kind,days:x.days,...(x.kind==='custom'?{title:x.title.trim(),text:x.text.trim()}:{})}))}});
    return true;
  };
  $('#nt-on').onclick=async()=>{const b=$('#nt-on');b.disabled=true;if(!await saveCfg()){b.disabled=false;return;}
    if(!on){b.textContent='Attivazione…';const ok=await enableNotif();if(ok){toast('Notifiche attive ✨','ok');closeModal();setTimeout(()=>testNotif(list[0]),400);renderOggi();return;}b.disabled=false;b.textContent='Salva e attiva';return;}
    closeModal();toast('Notifiche salvate','ok');};
  const t=$('#nt-test');if(t)t.onclick=()=>testNotif(list[sel]||list[0]);
  const off=$('#nt-off');if(off)off.onclick=async()=>{if(!armed(off))return;await disableNotif();closeModal();toast('Notifiche disattivate su questo dispositivo','ok');renderOggi();};
}

/* ================= MENU: backup, install, logout ================= */
function backupData(){
  const out={app:'capri',version:1,exported:new Date().toISOString()};
  for(const k in CACHE){if(/^push/.test(k))continue;out[k]=[...CACHE[k].entries()].map(([id,data])=>({id,data}));}
  return out;
}
$('#menu-btn').onclick=()=>{
  const ios=/iphone|ipad|ipod/i.test(navigator.userAgent);
  openModal(`<div class="mh"><h2>Capri</h2><button class="x" data-close aria-label="Chiudi">×</button></div>
  <p class="mut small" style="margin-top:0">Collegato come <b style="color:#fff">${esc(EMAIL)}</b></p>
  <div class="menu">
    <div style="display:flex;gap:8px"><input id="m-name" placeholder="Come ti chiamo?" value="${esc(cfg().name)}" maxlength="30" aria-label="Il tuo nome"><button class="btn" id="m-name-ok" type="button">Salva nome</button></div>
    <button class="btn" id="m-notif" type="button">${ico('bell')}Notifiche giornaliere</button>
    <button class="btn" id="m-exp" type="button">Scarica backup completo (file .json)</button>
    <label class="btn" style="cursor:pointer"><input type="file" accept=".json,application/json" hidden id="m-imp">Ripristina da un backup</label>
    <div class="note-box"><b>Installa come app</b><br>${ios?'In Safari tocca Condividi, poi “Aggiungi alla schermata Home”.':'Nel menu del browser (⋮) scegli “Installa app” o “Aggiungi a schermata Home”.'} Capri si aprirà a schermo intero con la sua icona.</div>
    <div class="note-box">Gli allegati restano nel tuo archivio Supabase: il backup contiene ticket, wishlist, spese, abbonamenti, note, fogli e impostazioni.</div>
    <button class="btn danger" id="m-out" type="button">Esci</button>
  </div>`);
  $('#m-name-ok').onclick=async()=>{const n=$('#m-name').value.trim();await put('config/main',{...cfg(),name:n});toast('Nome salvato','ok');renderOggi();};
  $('#m-notif').onclick=()=>{closeModal();notifModal();};
  $('#m-exp').onclick=()=>{saveBlob(`capri-backup-${isoDay()}.json`,new Blob([JSON.stringify(backupData(),null,1)],{type:'application/json'}));toast('Backup scaricato','ok');};
  $('#m-imp').onchange=async e=>{
    const f=e.target.files[0];e.target.value='';if(!f)return;
    let j;try{j=JSON.parse(await f.text());}catch(err){toast('File di backup non valido','err');return;}
    if(!j||j.app!=='capri'){toast('Questo non è un backup di Capri','err');return;}
    closeModal();let n=0;
    for(const coll of ['config','tickets','wishlist','sheets','spese','abbonamenti','note'])for(const d of j[coll]||[]){if(d&&d.id&&d.data){await put(coll+'/'+d.id,d.data);n++;}}
    toast(`Ripristinati ${n} elementi`,'ok');
  };
  $('#m-out').onclick=async()=>{await SB.auth.signOut();await authStorage.removeItem('capri-login-at');location.reload();};
};

/* ================= ROUTER + BOOT ================= */
const VIEWS=['oggi','ticket','wishlist','finanze','note'];
const HALIAS={spese:['finanze','spese'],abbonamenti:['finanze','abb'],fogli:['finanze','fogli']};
function route(){
  const hh=location.hash.slice(1);let v=hh;if(HALIAS[hh]){v=HALIAS[hh][0];S.fsub=HALIAS[hh][1];}
  if(!VIEWS.includes(v))v='oggi';
  if(S.ed&&!(v==='finanze'&&S.fsub==='fogli'))commitEdit(0,0,true);
  S.view=v;document.body.dataset.v=v;
  VIEWS.forEach(x=>{$('#v-'+x).hidden=x!==v;});
  $$('[data-nav]').forEach(a=>{a.classList.toggle('on',a.dataset.nav===v);if(a.dataset.nav===v)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
  if(v==='finanze')renderFin();else if(v==='oggi')renderOggi();else if(v==='note')renderNotes();
  try{if(navigator.clearAppBadge)navigator.clearAppBadge().catch(()=>{});}catch(e){}
  scrollTo(0,0);
}
addEventListener('hashchange',route);
route();

const finRefresh=()=>{if(S.view==='finanze'&&S.fsub!=='fogli')renderFin();};
SUBS.tickets=docs=>{S.tickets=docs.map(d=>({...clone(d.data),id:d.id}));S.loaded.t=1;renderTickets();renderOggi();};
SUBS.wishlist=docs=>{S.wish=docs.map(d=>({...clone(d.data),id:d.id}));S.loaded.w=1;renderWish();renderOggi();};
SUBS.sheets=onSheets;
SUBS.config=docs=>{const m=docs.find(d=>d.id==='main');S.cfg=m?clone(m.data):null;renderTickets();renderWish();renderOggi();finRefresh();};
SUBS.spese=docs=>{S.spese=docs.map(d=>({...clone(d.data),id:d.id}));renderOggi();finRefresh();};
SUBS.abbonamenti=docs=>{S.abb=docs.map(d=>({...clone(d.data),id:d.id}));renderOggi();finRefresh();};
SUBS.push=()=>{renderOggi();};
SUBS.note=docs=>{S.notes=docs.map(d=>({...clone(d.data),id:d.id}));renderNotes();renderOggi();};

const gate=$('#gate');
function gateShow(mode,msg){gate.hidden=false;$('#g-login').hidden=mode!=='login';$('#g-setup').hidden=mode!=='setup';$('#g-msg').textContent=msg||'';$('#g-msg').hidden=!msg;}
function getCfg(){
  const c=window.CAPRI_CONFIG||{};
  if(c.url&&c.key)return c;
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
  start(data.session);
});
async function start(session){
  UID=session.user.id;EMAIL=session.user.email||'';gate.hidden=true;setSync('Caricamento…','warn');
  try{await loadAll();syncState();}
  catch(e){setSync('Archivio non raggiungibile','err');showErr(e);S.loaded={t:1,w:1,s:1};S.ready=true;renderTickets();renderWish();renderOggi();renderNotes();if(S.view==='finanze')renderFin();return;}
  $('#errbar').hidden=true;
  S.loaded={t:1,w:1,s:1};S.ready=true;renderOggi();renderNotes();if(S.view==='finanze')renderFin();
  try{SB.channel('docs-'+UID).on('postgres_changes',{event:'*',schema:'public',table:'docs',filter:'user_id=eq.'+UID},onRealtime).subscribe();}catch(e){}
  let lastLoad=Date.now();
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&Date.now()-lastLoad>20000&&!pendN&&!dirty.size&&!S.ed){lastLoad=Date.now();loadAll().catch(()=>{});}});
  setTimeout(()=>{if(!autoRan){autoRan=true;autoPrices(false);}},1200);
}
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
  if(!window.supabase||!window.supabase.createClient){gateShow('',"Non riesco a caricare i componenti di Capri: controlla la connessione e ricarica la pagina.");return;}
  SB=window.supabase.createClient(C.url,C.key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,storageKey:'capri-auth',storage:authStorage}});
  let session=null;
  for(let i=0;i<3&&!session;i++){try{const{data,error}=await SB.auth.getSession();session=data&&data.session;if(!session&&!error)break;}catch(e){}if(!session)await sleep(1200);}
  if(session){
    const at=await loginAt();
    if(at&&Date.now()-at>LOGIN_TTL){try{await SB.auth.signOut();}catch(e){}gateShow('login','Sono passate 48 ore dall’ultimo accesso: entra di nuovo.');return;}
    if(!at)await authStorage.setItem('capri-login-at',String(Date.now()));
    start(session);
  }else gateShow('login','');
}
boot();
}
