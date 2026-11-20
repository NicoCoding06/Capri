const FX=(()=>{
const colName=i=>{let s='';i++;while(i>0){const m=(i-1)%26;s=String.fromCharCode(65+m)+s;i=Math.floor((i-1)/26);}return s;};
const colIdx=s=>{let n=0;for(const ch of s.toUpperCase())n=n*26+ch.charCodeAt(0)-64;return n-1;};
const ERR=e=>({err:e});
const isErr=v=>v!==null&&typeof v==='object'&&'err' in v;
const TOK=/\s+|"((?:[^"]|"")*)"|(?:'((?:[^']|'')+)'!|([A-Za-z_À-ÿ][\wÀ-ÿ.]*)!)?(\$?)([A-Za-z]{1,3})(\$?)(\d+)(?![\w(.])|(\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|\.\d+)|([A-Za-z_][\w.]*)\s*(?=\()|(TRUE|FALSE|VERO|FALSO)(?![\w(])|(<=|>=|<>|[-+*/^&%=<>(),;:])/iy;
function tokenize(s){
  const out=[];TOK.lastIndex=0;
  while(TOK.lastIndex<s.length){
    const m=TOK.exec(s);
    if(!m)throw ERR('#ERRORE');
    if(!m[0].trim())continue;
    if(m[1]!==undefined)out.push({t:'str',v:m[1].replace(/""/g,'"')});
    else if(m[5]!==undefined)out.push({t:'ref',sh:m[2]!==undefined?m[2].replace(/''/g,"'"):(m[3]||null),c:colIdx(m[5]),r:+m[7]-1});
    else if(m[8]!==undefined)out.push({t:'num',v:parseFloat(m[8])});
    else if(m[9]!==undefined)out.push({t:'fn',v:m[9].toUpperCase()});
    else if(m[10]!==undefined)out.push({t:'bool',v:/^(TRUE|VERO)$/i.test(m[10])});
    else out.push({t:'op',v:m[11]});
  }
  return out;
}
function parse(tokens){
  let p=0;
  const peek=()=>tokens[p],next=()=>tokens[p++];
  const isOp=v=>peek()&&peek().t==='op'&&peek().v===v;
  const CMP=['=','<>','<','>','<=','>='];
  function cmp(){let l=cat();while(peek()&&peek().t==='op'&&CMP.includes(peek().v)){const o=next().v;l={k:'bin',o,l,r:cat()};}return l;}
  function cat(){let l=add();while(isOp('&')){next();l={k:'bin',o:'&',l,r:add()};}return l;}
  function add(){let l=mul();while(isOp('+')||isOp('-')){const o=next().v;l={k:'bin',o,l,r:mul()};}return l;}
  function mul(){let l=pw();while(isOp('*')||isOp('/')){const o=next().v;l={k:'bin',o,l,r:pw()};}return l;}
  function pw(){let l=un();while(isOp('^')){next();l={k:'bin',o:'^',l,r:un()};}return l;}
  function un(){if(isOp('-')){next();return{k:'neg',e:un()};}if(isOp('+')){next();return un();}return post();}
  function post(){let e=prim();while(isOp('%')){next();e={k:'pct',e};}return e;}
  function prim(){
    const tk=next();if(!tk)throw ERR('#ERRORE');
    if(tk.t==='num'||tk.t==='str'||tk.t==='bool')return{k:'lit',v:tk.v};
    if(tk.t==='ref'){
      if(isOp(':')){next();const b=next();if(!b||b.t!=='ref')throw ERR('#RIF!');return{k:'rng',sh:tk.sh,a:tk,b};}
      return{k:'ref',sh:tk.sh,c:tk.c,r:tk.r};
    }
    if(tk.t==='fn'){
      if(!isOp('('))throw ERR('#NOME?');next();
      const args=[];
      if(!isOp(')')){
        for(;;){
          args.push(isOp(',')||isOp(';')||isOp(')')?{k:'lit',v:null}:cmp());
          if(isOp(',')||isOp(';')){next();continue;}
          break;
        }
      }
      if(!isOp(')'))throw ERR('#ERRORE');next();
      return{k:'fn',n:tk.v,args};
    }
    if(tk.t==='op'&&tk.v==='('){const e=cmp();if(!isOp(')'))throw ERR('#ERRORE');next();return e;}
    throw ERR('#ERRORE');
  }
  const e=cmp();
  if(p<tokens.length)throw ERR('#ERRORE');
  return e;
}
function prep(src){
  const parts=src.split(/("(?:[^"]|"")*")/);
  const code=parts.filter((p,i)=>!(i%2));
  const it=code.some(p=>p.includes(';'))||!code.some(p=>p.includes('('));
  return it?parts.map((p,i)=>i%2?p:p.replace(/(\d),(\d)/g,'$1.$2')).join(''):src;
}
const astCache=new Map();
function getAst(src){
  if(astCache.has(src))return astCache.get(src);
  let a;try{a=parse(tokenize(prep(src)));}catch(e){a={k:'err',e:isErr(e)?e:ERR('#ERRORE')};}
  if(astCache.size>5000)astCache.clear();
  astCache.set(src,a);return a;
}
function parseNum(s){
  let t=String(s).trim().replace(/[€\s]/g,'');let pct=false;
  if(t.endsWith('%')){pct=true;t=t.slice(0,-1);}
  if(/^[-+]?\d{1,3}(\.\d{3})+(,\d+)?$/.test(t))t=t.replace(/\./g,'').replace(',','.');
  else if(/^[-+]?\d+,\d+$/.test(t))t=t.replace(',','.');
  else if(/^[-+]?\d{1,3}(,\d{3})+(\.\d+)?$/.test(t))t=t.replace(/,/g,'');
  if(/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(t)){const n=parseFloat(t);return pct?n/100:n;}
  return null;
}
const lit=raw=>{const n=parseNum(raw);return n!==null?n:raw;};
const scalar=v=>v&&v.rng?(v.rng[0]&&v.rng[0][0]!==undefined?v.rng[0][0]:null):v;
function num(v){
  v=scalar(v);
  if(v===null||v===undefined||v==='')return 0;
  if(typeof v==='boolean')return v?1:0;
  if(typeof v==='number')return v;
  if(isErr(v))return v;
  const n=parseNum(v);return n===null?ERR('#VALORE!'):n;
}
function str(v){
  v=scalar(v);
  if(v===null||v===undefined)return'';
  if(typeof v==='boolean')return v?'VERO':'FALSO';
  if(typeof v==='number')return String(Math.round(v*1e10)/1e10).replace('.',',');
  return String(v);
}
function truthy(v){v=scalar(v);if(typeof v==='string'){if(/^(vero|true)$/i.test(v))return true;if(/^(falso|false|)$/i.test(v))return false;const n=parseNum(v);return n!==null&&n!==0;}return!!v;}
function compare(a,b,o){
  let x=a,y=b;
  const an=typeof a==='number'||typeof a==='boolean'||a===null,bn=typeof b==='number'||typeof b==='boolean'||b===null;
  if(an&&bn){x=num(a);y=num(b);}else{x=str(a).toLowerCase();y=str(b).toLowerCase();}
  switch(o){case'=':return x===y;case'<>':return x!==y;case'<':return x<y;case'>':return x>y;case'<=':return x<=y;case'>=':return x>=y;}
}
function flat(vals){const o=[];for(const v of vals){if(v&&v.rng)v.rng.forEach(r=>r.forEach(x=>o.push([x,1])));else o.push([v,0]);}return o;}
function numsOf(vals){
  const out=[];
  for(const[x,fr]of flat(vals)){
    if(isErr(x))return x;
    if(fr){if(typeof x==='number')out.push(x);}
    else if(x!==null){const n=num(x);if(isErr(n))return n;out.push(n);}
  }
  return out;
}
function crit(c){
  c=scalar(c);
  if(typeof c==='number')return x=>typeof x==='number'?x===c:parseNum(x??'')===c;
  const s=str(c);const m=s.match(/^(<=|>=|<>|<|>|=)?([\s\S]*)$/);const op=m[1]||'=';const rhs=m[2];const rn=parseNum(rhs);
  return x=>{
    if(rn!==null){const xn=typeof x==='number'?x:(x===null?null:parseNum(x));
      if(xn!==null&&xn!==undefined){switch(op){case'=':return xn===rn;case'<>':return xn!==rn;case'<':return xn<rn;case'>':return xn>rn;case'<=':return xn<=rn;case'>=':return xn>=rn;}}
      return op==='<>';
    }
    const xs=str(x).toLowerCase(),rs=rhs.toLowerCase();
    if(op!=='='&&op!=='<>'){switch(op){case'<':return xs<rs;case'>':return xs>rs;case'<=':return xs<=rs;case'>=':return xs>=rs;}}
    const wild=/[*?]/.test(rs);
    const eq=wild?new RegExp('^'+rs.replace(/[.+^${}()|[\]\\]/g,'\\$&').replace(/\*/g,'.*').replace(/\?/g,'.')+'$').test(xs):xs===rs;
    return op==='<>'?!eq:eq;
  };
}
const cells2=v=>v&&v.rng?v.rng:[[scalar(v)]];
const rnd=(x,d,mode)=>{const f=Math.pow(10,d);const y=x*f;const r=mode==='up'?Math.sign(y)*Math.ceil(Math.abs(y)-1e-9):mode==='down'?Math.sign(y)*Math.floor(Math.abs(y)+1e-9):Math.sign(y)*Math.round(Math.abs(y)+1e-9);return r/f;};
const todaySerial=()=>{const d=new Date();return Math.floor((Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())-Date.UTC(1899,11,30))/864e5);};
// functions: receive evaluated args (except lazy ones)
const FN={
  SUM:a=>{const n=numsOf(a);return isErr(n)?n:n.reduce((s,x)=>s+x,0);},
  AVERAGE:a=>{const n=numsOf(a);if(isErr(n))return n;return n.length?n.reduce((s,x)=>s+x,0)/n.length:ERR('#DIV/0!');},
  MIN:a=>{const n=numsOf(a);return isErr(n)?n:(n.length?Math.min(...n):0);},
  MAX:a=>{const n=numsOf(a);return isErr(n)?n:(n.length?Math.max(...n):0);},
  MEDIAN:a=>{const n=numsOf(a);if(isErr(n))return n;if(!n.length)return ERR('#NUM!');n.sort((x,y)=>x-y);const h=n.length>>1;return n.length%2?n[h]:(n[h-1]+n[h])/2;},
  PRODUCT:a=>{const n=numsOf(a);return isErr(n)?n:n.reduce((s,x)=>s*x,1);},
  COUNT:a=>flat(a).filter(([x,fr])=>typeof x==='number'||(!fr&&x!==null&&parseNum(str(x))!==null)).length,
  COUNTA:a=>flat(a).filter(([x])=>x!==null&&x!=='').length,
  COUNTBLANK:a=>flat(a).filter(([x])=>x===null||x==='').length,
  ROUND:a=>{const x=num(a[0]),d=num(a[1]??0);if(isErr(x))return x;if(isErr(d))return d;return rnd(x,d);},
  ROUNDUP:a=>{const x=num(a[0]),d=num(a[1]??0);if(isErr(x))return x;return rnd(x,d,'up');},
  ROUNDDOWN:a=>{const x=num(a[0]),d=num(a[1]??0);if(isErr(x))return x;return rnd(x,d,'down');},
  INT:a=>{const x=num(a[0]);return isErr(x)?x:Math.floor(x);},
  ABS:a=>{const x=num(a[0]);return isErr(x)?x:Math.abs(x);},
  SQRT:a=>{const x=num(a[0]);if(isErr(x))return x;return x<0?ERR('#NUM!'):Math.sqrt(x);},
  POWER:a=>{const x=num(a[0]),y=num(a[1]);if(isErr(x))return x;if(isErr(y))return y;return Math.pow(x,y);},
  MOD:a=>{const x=num(a[0]),y=num(a[1]);if(isErr(x))return x;if(isErr(y))return y;if(y===0)return ERR('#DIV/0!');return x-y*Math.floor(x/y);},
  AND:a=>{for(const[x]of flat(a)){if(isErr(x))return x;if(!truthy(x))return false;}return true;},
  OR:a=>{for(const[x]of flat(a)){if(isErr(x))return x;if(truthy(x))return true;}return false;},
  NOT:a=>!truthy(a[0]),
  SUMIF:a=>{const r=cells2(a[0]),f=crit(a[1]),s=a[2]!==undefined&&a[2]!==null?cells2(a[2]):r;let t=0;r.forEach((row,i)=>row.forEach((x,j)=>{if(f(x)){const v=s[i]&&s[i][j];if(typeof v==='number')t+=v;}}));return t;},
  COUNTIF:a=>{const r=cells2(a[0]),f=crit(a[1]);let t=0;r.forEach(row=>row.forEach(x=>{if(f(x))t++;}));return t;},
  AVERAGEIF:a=>{const r=cells2(a[0]),f=crit(a[1]),s=a[2]!==undefined&&a[2]!==null?cells2(a[2]):r;let t=0,n=0;r.forEach((row,i)=>row.forEach((x,j)=>{if(f(x)){const v=s[i]&&s[i][j];if(typeof v==='number'){t+=v;n++;}}}));return n?t/n:ERR('#DIV/0!');},
  SUMPRODUCT:a=>{const rs=a.map(cells2);const h=rs[0].length,w=rs[0][0].length;if(rs.some(r=>r.length!==h||r[0].length!==w))return ERR('#VALORE!');let t=0;for(let i=0;i<h;i++)for(let j=0;j<w;j++){let p=1;for(const r of rs){const v=r[i][j];p*=typeof v==='number'?v:0;}t+=p;}return t;},
  VLOOKUP:a=>{const key=scalar(a[0]),tbl=cells2(a[1]),col=num(a[2]);if(isErr(col))return col;const approx=a[3]===undefined||a[3]===null?true:truthy(a[3]);if(col<1||col>(tbl[0]||[]).length)return ERR('#RIF!');
    if(!approx){for(const row of tbl){if(compare(row[0],key,'='))return row[col-1]??null;}return ERR('#N/D');}
    let hit=null;for(const row of tbl){if(row[0]===null)continue;if(compare(row[0],key,'<='))hit=row;else break;}return hit?hit[col-1]??null:ERR('#N/D');},
  CONCAT:a=>flat(a).map(([x])=>str(x)).join(''),
  LEN:a=>str(a[0]).length,
  UPPER:a=>str(a[0]).toUpperCase(),
  LOWER:a=>str(a[0]).toLowerCase(),
  TODAY:()=>todaySerial(),
  PMT:a=>{const r=num(a[0]),n=num(a[1]),pv=num(a[2]),fv=a[3]==null?0:num(a[3]),ty=a[4]==null?0:num(a[4]);for(const v of[r,n,pv,fv,ty])if(isErr(v))return v;if(n===0)return ERR('#NUM!');if(r===0)return-(pv+fv)/n;const q=Math.pow(1+r,n);return-(r*(pv*q+fv))/((1+r*ty)*(q-1));},
  FV:a=>{const r=num(a[0]),n=num(a[1]),p=num(a[2]),pv=a[3]==null?0:num(a[3]),ty=a[4]==null?0:num(a[4]);for(const v of[r,n,p,pv,ty])if(isErr(v))return v;if(r===0)return-(pv+p*n);const q=Math.pow(1+r,n);return-(pv*q+p*(1+r*ty)*(q-1)/r);},
};
const ALIAS={SOMMA:'SUM',MEDIA:'AVERAGE',MEDIANA:'MEDIAN',PRODOTTO:'PRODUCT','CONTA.NUMERI':'COUNT','CONTA.VALORI':'COUNTA','CONTA.VUOTE':'COUNTBLANK',ARROTONDA:'ROUND','ARROTONDA.PER.ECC':'ROUNDUP','ARROTONDA.PER.DIF':'ROUNDDOWN',ASS:'ABS',RADQ:'SQRT',POTENZA:'POWER',RESTO:'MOD',E:'AND',O:'OR',NON:'NOT','SOMMA.SE':'SUMIF','CONTA.SE':'COUNTIF','MEDIA.SE':'AVERAGEIF','MATR.SOMMA.PRODOTTO':'SUMPRODUCT','CERCA.VERT':'VLOOKUP',CONCATENA:'CONCAT',CONCATENATE:'CONCAT',LUNGHEZZA:'LEN',MAIUSC:'UPPER',MINUSC:'LOWER',OGGI:'TODAY',RATA:'PMT','VAL.FUT':'FV',SE:'IF','SE.ERRORE':'IFERROR'};
function makeCtx(sheets){
  const byName={};sheets.forEach(s=>{byName[String(s.name).toLowerCase()]=s;});
  const cache=new Map(),visiting=new Set();
  const sheetOf=(cur,name)=>name?byName[String(name).toLowerCase()]||null:cur;
  function cellVal(sh,c,r){
    const key=sh.id+'!'+c+','+r;
    if(cache.has(key))return cache.get(key);
    if(visiting.has(key))return ERR('#CIRC!');
    const cell=sh.cells&&sh.cells[colName(c)+(r+1)];let v;
    if(!cell||cell.v===null||cell.v===undefined||cell.v==='')v=null;
    else{
      const raw=String(cell.v);
      if(raw[0]==='='&&raw.length>1){
        visiting.add(key);
        try{v=ev(getAst(raw.slice(1)),sh);v=scalar(v);if(v===undefined)v=null;}catch(e){v=isErr(e)?e:ERR('#ERRORE');}
        visiting.delete(key);
      }else v=lit(raw);
    }
    if(typeof v==='number'&&!isFinite(v))v=ERR('#NUM!');
    cache.set(key,v);return v;
  }
  function ev(n,sh){
    switch(n.k){
      case'err':return n.e;
      case'lit':return n.v;
      case'ref':{const s=sheetOf(sh,n.sh);if(!s)return ERR('#RIF!');return cellVal(s,n.c,n.r);}
      case'rng':{const s=sheetOf(sh,n.sh);if(!s)return ERR('#RIF!');
        const c1=Math.min(n.a.c,n.b.c),c2=Math.max(n.a.c,n.b.c),r1=Math.min(n.a.r,n.b.r),r2=Math.max(n.a.r,n.b.r);
        if((c2-c1+1)*(r2-r1+1)>200000)return ERR('#RIF!');
        const rows=[];for(let r=r1;r<=r2;r++){const row=[];for(let c=c1;c<=c2;c++)row.push(cellVal(s,c,r));rows.push(row);}return{rng:rows};}
      case'neg':{const v=num(ev(n.e,sh));return isErr(v)?v:-v;}
      case'pct':{const v=num(ev(n.e,sh));return isErr(v)?v:v/100;}
      case'bin':{
        const a=scalar(ev(n.l,sh)),b=scalar(ev(n.r,sh));
        if(isErr(a))return a;if(isErr(b))return b;
        if(n.o==='&')return str(a)+str(b);
        if(['=','<>','<','>','<=','>='].includes(n.o))return compare(a,b,n.o);
        const x=num(a),y=num(b);if(isErr(x))return x;if(isErr(y))return y;
        switch(n.o){case'+':return x+y;case'-':return x-y;case'*':return x*y;case'/':return y===0?ERR('#DIV/0!'):x/y;case'^':return Math.pow(x,y);}
        return ERR('#ERRORE');
      }
      case'fn':{
        const name=ALIAS[n.n]||n.n;
        if(name==='IF'){const c=scalar(ev(n.args[0]||{k:'lit',v:false},sh));if(isErr(c))return c;const b=truthy(c)?n.args[1]:n.args[2];return b?ev(b,sh):(truthy(c)?true:false);}
        if(name==='IFERROR'){const v=scalar(ev(n.args[0],sh));return isErr(v)?(n.args[1]?ev(n.args[1],sh):''):v;}
        const f=FN[name];if(!f)return ERR('#NOME?');
        const args=n.args.map(a=>ev(a,sh));
        if(!['IFERROR','COUNT','COUNTA','COUNTBLANK'].includes(name)){for(const a of args){const s=a&&a.rng?null:a;if(isErr(s))return s;}}
        return f(args);
      }
    }
    return ERR('#ERRORE');
  }
  return{value:(sh,c,r)=>cellVal(sh,c,r)};
}
// rewrite references in a formula. fn(ref) gets {sh,c,r,ac,ar,c2,r2,ac2,ar2,range} and returns new object or null (#RIF!)
const REFRE=/(?<![\w$.À-ÿ])((?:'(?:[^']|'')+'|[A-Za-z_À-ÿ][\wÀ-ÿ.]*)!)?(\$?)([A-Za-z]{1,3})(\$?)(\d+)(?::(\$?)([A-Za-z]{1,3})(\$?)(\d+))?(?![\w(.!])/g;
function mapRefs(raw,fn){
  if(typeof raw!=='string'||raw[0]!=='=')return raw;
  const parts=raw.slice(1).split(/("(?:[^"]|"")*")/);
  return'='+parts.map((p,i)=>i%2?p:p.replace(REFRE,(m,pre,ac,col,ar,row,ac2,col2,ar2,row2)=>{
    const sh=pre?pre.slice(0,-1).replace(/^'|'$/g,'').replace(/''/g,"'"):null;
    const o={sh,pre:pre||'',ac:!!ac,c:colIdx(col),ar:!!ar,r:+row-1,range:col2!==undefined};
    if(o.range){o.ac2=!!ac2;o.c2=colIdx(col2);o.ar2=!!ar2;o.r2=+row2-1;}
    const n=fn(o);
    if(!n)return(pre||'')+'#RIF!';
    const pr=n.pre!==undefined?n.pre:(pre||'');
    const one=(a,c,b,r)=>(a?'$':'')+colName(c)+(b?'$':'')+(r+1);
    return pr+one(n.ac,n.c,n.ar,n.r)+(n.range?':'+one(n.ac2,n.c2,n.ar2,n.r2):'');
  })).join('');
}
function shift(raw,dr,dc){
  return mapRefs(raw,o=>{
    const n={...o};
    if(!o.ac)n.c+=dc;if(!o.ar)n.r+=dr;
    if(o.range){if(!o.ac2)n.c2+=dc;if(!o.ar2)n.r2+=dr;}
    if(n.c<0||n.r<0||(o.range&&(n.c2<0||n.r2<0)))return null;
    return n;
  });
}
// structural: axis 'r' or 'c', at index k, delta +1 insert / -1 delete; applies when targetsSheet(o) true
function restructure(raw,axis,k,delta,targets){
  return mapRefs(raw,o=>{
    if(!targets(o.sh))return o;
    const n={...o};const A=axis;const A2=axis+'2';
    if(delta>0){
      if(n[A]>=k)n[A]++;
      if(o.range&&n[A2]>=k)n[A2]++;
      return n;
    }
    if(!o.range){if(n[A]===k)return null;if(n[A]>k)n[A]--;return n;}
    let a=n[A],b=n[A2];if(a>b){const t=a;a=b;b=t;}
    if(a===k&&b===k)return null;
    if(a>k)a--;if(b>=k)b--;
    n[A]=a;n[A2]=b;return n;
  });
}
function renameSheet(raw,oldName,newName){
  const q=/^[A-Za-z_À-ÿ][\wÀ-ÿ.]*$/.test(newName)&&!/^[A-Za-z]{1,3}\d+$/.test(newName)?newName+'!':"'"+newName.replace(/'/g,"''")+"'!";
  return mapRefs(raw,o=>o.sh&&o.sh.toLowerCase()===oldName.toLowerCase()?{...o,pre:q}:o);
}
const NAMES=Object.keys(FN).concat(Object.keys(ALIAS),['IF','IFERROR']).sort();
return{colName,colIdx,isErr,parseNum,makeCtx,shift,restructure,renameSheet,NAMES,todaySerial};
})();
if(typeof module!=='undefined')module.exports=FX;
