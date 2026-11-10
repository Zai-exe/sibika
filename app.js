"use strict";
const SECTORS=[
 ["disaster","Disaster & Recovery","cloud-lightning"],["social","Social & Welfare","hand-heart"],["govservices","Government Services","landmark"],
 ["travel","Travel","plane"],["health","Health","heart-pulse"],["education","Education","graduation-cap"],["business","Business & Economy","briefcase-business"],
 ["taxes","Taxes & Finance","receipt"],["labor","Labor & Employment","hard-hat"],["law","Law & Justice","scale"],
 ["elections","Elections & Governance","vote"],["transparency","Transparency & Procurement","file-search"],
 ["agri","Agriculture & Environment","sprout"],["infra","Infrastructure & Transport","construction"],["safety","Public Safety","shield-check"]];
const SNAME=Object.fromEntries(SECTORS.map(s=>[s[0],s[1]])),SICON=Object.fromEntries(SECTORS.map(s=>[s[0],s[2]]));
const STATUS={active:"Active",dormant:"Dormant",unknown:"Status unknown"};
const KIND_HASH={"civic-tech":"project","csos":"cso","bettergov-creations":"bettergov"};
const fmtDate=new Intl.DateTimeFormat("en-PH",{year:"numeric",month:"short",day:"numeric"});
const fmtNum=new Intl.NumberFormat("en-PH");
const $=id=>document.getElementById(id);
const REPO="https://github.com/Zai-exe/sibika";
const st={type:"all",sector:"",status:"",ver:"",q:"",place:"",nat:true,listings:null,loadErr:""};
let formDirty=false;

/* places: 17 regions (2020 boundaries). A listing serves the regions in its `areas` list, or what its `region` text says. */
const REGIONS=[["NCR","Metro Manila (NCR)","Luzon"],["CAR","Cordillera (CAR)","Luzon"],["R1","Ilocos Region","Luzon"],["R2","Cagayan Valley","Luzon"],
 ["R3","Central Luzon","Luzon"],["R4A","Calabarzon","Luzon"],["R4B","Mimaropa","Luzon"],["R5","Bicol Region","Luzon"],
 ["R6","Western Visayas","Visayas"],["R7","Central Visayas","Visayas"],["R8","Eastern Visayas","Visayas"],
 ["R9","Zamboanga Peninsula","Mindanao"],["R10","Northern Mindanao","Mindanao"],["R11","Davao Region","Mindanao"],["R12","Soccsksargen","Mindanao"],["R13","Caraga","Mindanao"],["BARMM","Bangsamoro (BARMM)","Mindanao"]];
const RNAME=Object.fromEntries(REGIONS.map(r=>[r[0],r[1]])),RGROUP=Object.fromEntries(REGIONS.map(r=>[r[0],r[2]]));
const GROUPS=["Luzon","Visayas","Mindanao"];
const low=s=>String(s||"").trim().toLowerCase();
const REGION_BY_TEXT=Object.fromEntries([...REGIONS.flatMap(([c,n])=>[[low(c),[c]],[low(n),[c]]]),["ncr",["NCR"]],["barmm",["BARMM"]],["metro manila",["NCR"]],
  ...GROUPS.map(g=>[low(g),REGIONS.filter(r=>r[2]===g).map(r=>r[0])])]);
function placesOf(l){if(Array.isArray(l.areas)&&l.areas.length)return{codes:l.areas.filter(c=>RNAME[c]),nat:false};
  const t=low(l.region||"Nationwide");if(t==="nationwide"||t==="")return{codes:[],nat:true};return{codes:REGION_BY_TEXT[t]||[],nat:false}}
const placeLevel=n=>n<=0?0:n===1?1:n<=3?2:n<=5?3:4;

function el(tag,attrs={},...kids){const e=document.createElement(tag);for(const[k,v]of Object.entries(attrs)){if(k==="class")e.className=v;else if(k.startsWith("on"))e.addEventListener(k.slice(2),v);else if(v!==false&&v!=null)e.setAttribute(k,v===true?"":v)}for(const k of kids.flat()){if(k==null||k==="")continue;e.append(k.nodeType?k:String(k))}return e}
const icon=(n,cls="ic")=>el("i",{"data-lucide":n,class:cls,"aria-hidden":"true"});
function paintIcons(){try{window.lucide&&window.lucide.createIcons({attrs:{"aria-hidden":"true"}})}catch{}}
function safeUrl(u){try{const x=new URL(u);return /^https?:$/.test(x.protocol)?x.href:null}catch{return null}}
function host(u){try{const x=new URL(u);return (x.host+x.pathname).replace(/^www\./,"").replace(/\/$/,"")}catch{return u}}
function fmtD(v){if(!v)return"";const d=new Date(String(v).length===10?v+"T00:00:00":v);return isNaN(d)?String(v):fmtDate.format(d)}
const isBG=l=>l.maker==="bettergov";
const kindOk=l=>st.type==="all"||(st.type==="bettergov"?isBG(l):l.type===st.type);

/* sectors */
function renderSectors(){
  const counts={};(st.listings||[]).filter(kindOk).forEach(l=>(l.sectors||[]).forEach(s=>counts[s]=(counts[s]||0)+1));
  const g=$("sectorGrid");g.replaceChildren();
  SECTORS.forEach(([k,n,ic])=>{const c=counts[k]||0;
    g.append(el("button",{type:"button",class:"sector"+(st.listings&&!c?" empty":""),"aria-pressed":String(st.sector===k),"aria-label":n+", "+c+(c===1?" entry":" entries"),onclick:()=>setSector(st.sector===k?"":k,true)},
      el("span",{class:"tile"},icon(ic)),el("span",{class:"nm"},n),el("span",{class:"ct num"},st.listings?fmtNum.format(c):"…")))});
  paintIcons();
}
function buildChecks(){const c=$("sectorChecks");SECTORS.forEach(([k,n,ic])=>c.append(el("label",{for:"sc-"+k},el("input",{type:"checkbox",id:"sc-"+k,name:"sectors",value:k}),icon(ic),n)))}
/* every filter lives in the link (?sector=health&type=cso&status=active&verified=yes&q=flood) so it can be shared */
const TYPES_OK=new Set(["all","project","cso","bettergov"]),STATUS_OK=new Set(["","active","dormant","unknown"]),VER_OK=new Set(["","yes","no"]);
function syncUrl(){try{const p=new URLSearchParams();
  if(st.sector)p.set("sector",st.sector);if(st.type!=="all")p.set("type",st.type);if(st.status)p.set("status",st.status);if(st.ver)p.set("verified",st.ver);if(st.q.trim())p.set("q",st.q.trim());if(st.place)p.set("place",st.place);if(st.place&&!st.nat)p.set("nationwide","0");
  const h=location.hash.slice(1),keepHash=h&&!SNAME[h]&&!KIND_HASH[h]?"#"+h:"";const qs=p.toString();
  const next=location.pathname+(qs?"?"+qs:"")+keepHash;if(next!==location.pathname+location.search+location.hash)history.replaceState(null,"",next)}catch{}}
function readUrl(){const p=new URLSearchParams(location.search),h=location.hash.slice(1);
  const sec=p.get("sector")||(SNAME[h]?h:"");st.sector=SNAME[sec]?sec:"";
  const t=p.get("type")||KIND_HASH[h]||"all";st.type=TYPES_OK.has(t)?t:"all";
  const s=p.get("status")||"";st.status=STATUS_OK.has(s)?s:"";const v=p.get("verified")||"";st.ver=VER_OK.has(v)?v:"";
  st.q=(p.get("q")||"").slice(0,100);
  const pl=p.get("place")||"";st.place=RNAME[pl]?pl:"";st.nat=p.get("nationwide")!=="0";
  $("q").value=st.q;$("fStatus").value=st.status;$("fVer").value=st.ver;
  document.querySelectorAll(".kind").forEach(x=>x.setAttribute("aria-pressed",String(x.dataset.t===st.type)));}
function setSector(k,scroll){st.sector=k;renderSectors();renderResults();if(scroll)$("directory").scrollIntoView({block:"start"})}

/* typo-tolerant search: every word you type must match a word in the listing, allowing small typos */
const norm=s=>String(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase();
function lev(a,b,max){if(Math.abs(a.length-b.length)>max)return max+1;let prev=Array.from({length:b.length+1},(_,i)=>i);
  for(let i=1;i<=a.length;i++){const cur=[i];let best=i;for(let j=1;j<=b.length;j++){cur[j]=Math.min(prev[j]+1,cur[j-1]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1));best=Math.min(best,cur[j])}if(best>max)return max+1;prev=cur}return prev[b.length]}
function indexListing(l){const hay=norm([l.name,l.org,l.description,l.region,l.area,l.website,...(l.sectors||[]).map(s=>SNAME[s])].join(" "));
  l._hay=hay;l._words=[...new Set(hay.split(/[^a-z0-9]+/).filter(Boolean))];const pl=placesOf(l);l._places=pl.codes;l._nat=pl.nat;return l}
function tokenHit(l,t){if(l._hay.includes(t))return true;const max=t.length>=8?2:t.length>=4?1:0;if(!max)return false;
  return l._words.some(w=>lev(t,w,max)<=max||(w.length>t.length&&lev(t,w.slice(0,t.length),max)<=max))}
function matches(l,q){const toks=norm(q).split(/[^a-z0-9]+/).filter(Boolean);return toks.every(t=>tokenHit(l,t))}

/* results */
function filtered(){const q=st.q.trim();
  return (st.listings||[]).filter(l=>kindOk(l)&&(!st.sector||(l.sectors||[]).includes(st.sector))&&(!st.status||l.status===st.status)
    &&(!st.ver||(st.ver==="yes"?!!l.verifiedAt:!l.verifiedAt))
    &&(!q||matches(l,q))
    &&(!st.place||l._places.includes(st.place)||(st.nat&&l._nat)))
   .sort((a,b)=>(st.place?(b._places.includes(st.place)-a._places.includes(st.place)):0)||(isBG(b)-isBG(a))||((a.order??999)-(b.order??999))||String(a.name).localeCompare(String(b.name)))}
function card(l){const url=safeUrl(l.website||"");const secs=(l.sectors||[]).filter(s=>SNAME[s]);
  const kind=isBG(l)?el("span",{class:"badge b-bg"},icon("hammer"),el("span",{translate:"no"},"BetterGov")):l.type==="cso"?el("span",{class:"badge b-cso"},icon("users"),"CSO"):el("span",{class:"badge b-proj"},icon("code-xml"),"Civic tech");
  return el("article",{class:"card"},
    el("div",{class:"ctop"},el("span",{class:"ctile"},icon(SICON[secs[0]]||"circle-dot")),
      el("div",{class:"t"},el("h3",{},l.name||"Untitled"),l.org&&l.org!==l.name?el("p",{class:"org"},l.org):null)),
    el("div",{class:"badges"},kind,el("span",{class:"badge s-"+(STATUS[l.status]?l.status:"unknown")},icon(l.status==="active"?"activity":l.status==="dormant"?"moon":"circle-help"),STATUS[l.status]||"Status unknown")),
    l.description?el("p",{class:"desc"},l.description):el("p",{class:"desc nolink"},"No description yet."),
    secs.length?el("div",{class:"tags"},secs.map(s=>el("button",{type:"button",class:"tag",onclick:()=>setSector(s,false)},icon(SICON[s]),SNAME[s]))):null,
    el("div",{class:"cfoot"},
      el("div",{class:"r"},el("span",{class:"loc"},icon("map-pin"),l.region||"Coverage not set"),
        l.verifiedAt?el("span",{class:"vf"},icon("badge-check"),"Verified "+fmtD(l.verifiedAt)):el("span",{class:"uv"},icon("clock"),"Needs verification")),
      el("div",{class:"r"},url?el("a",{class:"link",href:url,target:"_blank",rel:"noopener noreferrer",translate:"no","aria-label":"Visit "+(l.name||"site")+" (opens in a new tab)"},el("span",{},host(url)),icon("arrow-up-right")):el("span",{class:"nolink"},"No link yet"))))}
function stateBox(ic,title,text,action){return el("div",{class:"state"},icon(ic),el("strong",{},title),el("p",{},text),action||null)}
function renderResults(){const r=$("results");syncUrl();
  $("clearAll").hidden=!(st.sector||st.status||st.ver||st.q||st.place||st.type!=="all");
  $("activeSector").replaceChildren(st.sector?el("span",{class:"chip"},SNAME[st.sector],el("button",{type:"button","aria-label":"Clear sector filter",onclick:()=>setSector("",false)},icon("x"))):"",
    st.place?el("span",{class:"chip place"},icon("map-pin"),RNAME[st.place]+(st.nat?" + nationwide":""),el("button",{type:"button","aria-label":"Clear place filter",onclick:()=>setPlace("")},icon("x"))):"");
  renderPlaces();
  if(st.loadErr){r.setAttribute("aria-busy","false");r.replaceChildren(stateBox("cloud-off","The Directory Couldn’t Load",st.loadErr));$("count").textContent="";paintIcons();return}
  if(!st.listings)return;
  r.setAttribute("aria-busy","false");
  const list=filtered();
  $("count").textContent="Showing "+fmtNum.format(list.length)+(list.length===1?" entry":" entries");
  if(!st.listings.length){r.replaceChildren(stateBox("folder-open","No Listings Yet","Approved entries will appear here.",el("a",{class:"btn",href:"#submit"},icon("plus"),"Submit the First One")));paintIcons();return}
  if(!list.length&&st.place&&!st.nat&&!st.sector&&!st.q){r.replaceChildren(stateBox("map-pin","Nothing Local in "+RNAME[st.place]+" Yet",
      "Nationwide listings still serve this region. Include them, or add a local group or project you know.",
      el("div",{class:"pactions"},el("button",{class:"btn",type:"button",onclick:()=>{st.nat=true;renderResults()}},icon("globe"),"Include Nationwide"),
        el("a",{class:"btn btn-line",href:"#submit",onclick:()=>{$("f-region").value=st.place}},icon("map-pin-plus"),"Add One Here"))));paintIcons();return}
  if(!list.length){r.replaceChildren(st.sector?stateBox(SICON[st.sector],"Nothing in "+SNAME[st.sector]+" Yet","This sector still needs researchers. Know a project or CSO that belongs here?",
      el("a",{class:"btn",href:"#submit",onclick:()=>{const c=$("sc-"+st.sector);if(c)c.checked=true}},icon("plus"),"Add One for This Sector"))
    :stateBox("search-x","No Matches","Try a different search, or clear the filters.",el("button",{class:"btn btn-line",type:"button",onclick:clearAll},icon("x"),"Clear Filters")));paintIcons();return}
  r.replaceChildren(...list.map(card));paintIcons();
}
function renderStats(){const L=st.listings||[];const f=n=>fmtNum.format(n);
  $("st-proj").textContent=f(L.filter(l=>l.type==="project").length);$("st-cso").textContent=f(L.filter(l=>l.type==="cso").length);
  $("st-ver").textContent=f(L.filter(l=>l.verifiedAt).length);
  const cov=new Set(L.flatMap(l=>l.sectors||[]).filter(s=>SNAME[s]));$("st-cov").textContent=cov.size;$("st-gap").textContent=15-cov.size;
  $("covBar").replaceChildren(...SECTORS.map(s=>el("i",{class:cov.has(s[0])?"on":""})));
  const c={all:L.length,project:L.filter(l=>l.type==="project").length,cso:L.filter(l=>l.type==="cso").length,bettergov:L.filter(isBG).length};
  document.querySelectorAll("[data-c]").forEach(s=>s.textContent=st.listings?f(c[s.dataset.c]):"");
}
function setType(t){st.type=t;document.querySelectorAll(".kind").forEach(x=>x.setAttribute("aria-pressed",String(x.dataset.t===t)));renderSectors();renderResults()}
function clearAll(){st.status="";st.ver="";st.q="";st.place="";st.nat=true;pin=null;$("q").value="";$("fStatus").value="";$("fVer").value="";st.sector="";setType("all");setSector("",false)}

/* map: regions coloured by local listings, province lines, zoom and pan, labels, place search */
const SVGNS="http://www.w3.org/2000/svg",MAXZ=24;
const reduceMotion=matchMedia("(prefers-reduced-motion: reduce)").matches;
let mapPaths={},mapLines={},mapGeo=null,mapSvg=null,view=null,full=null,labels=null,pinG=null,pin=null,lastFit=null,anim=0,suppressClick=false,hintTimer=0;
const sv=(tag,attrs={})=>{const e=document.createElementNS(SVGNS,tag);for(const[k,v]of Object.entries(attrs))e.setAttribute(k,v);return e};
const provName=n=>String(n).replace(/^NCR,\s*/,"Metro Manila, ");
const SHORT={NCR:"NCR",CAR:"CAR",BARMM:"BARMM"};
function setPlace(code,scroll){st.place=code;if(!code)pin=null;renderSectors();renderResults();if(scroll)$("directory").scrollIntoView({block:"start"})}
function placeCounts(){const local={},L=(st.listings||[]).filter(kindOk);let nat=0;
  for(const l of L){if(l._nat)nat++;for(const c of l._places)local[c]=(local[c]||0)+1}return{local,nat}}

/* view box maths: the view keeps the map's aspect ratio; zoom is full width / view width */
const zoomOf=()=>full?full.w/view.w:1;
function unitsPerPx(){const r=mapSvg.getBoundingClientRect();return Math.max(view.w/(r.width||1),view.h/(r.height||1))}
function clampView(v){let w=Math.min(full.w,Math.max(full.w/MAXZ,v.w));const h=w*full.h/full.w;
  const cx=Math.min(full.w,Math.max(0,v.x+v.w/2)),cy=Math.min(full.h,Math.max(0,v.y+v.h/2));return{x:cx-w/2,y:cy-h/2,w,h}}
function applyView(v){view=clampView(v);mapSvg.setAttribute("viewBox",`${view.x} ${view.y} ${view.w} ${view.h}`);const z=zoomOf();
  mapSvg.classList.toggle("zoomed",z>1.02);$("zoomLevel").textContent=(z<10?Math.round(z*10)/10:Math.round(z))+"×";
  $("zoomOut").disabled=z<=1.02;$("zoomIn").disabled=z>=MAXZ-.01;$("zoomReset").disabled=z<=1.02;renderLabels()}
function animateTo(t){cancelAnimationFrame(anim);t=clampView(t);if(reduceMotion||!view){applyView(t);return}
  const f={...view},t0=performance.now(),dur=380,fcx=f.x+f.w/2,fcy=f.y+f.h/2,tcx=t.x+t.w/2,tcy=t.y+t.h/2;
  const step=now=>{const k=Math.min(1,(now-t0)/dur),e=1-Math.pow(1-k,3),w=f.w*Math.pow(t.w/f.w,e),h=w*full.h/full.w;
    applyView({x:fcx+(tcx-fcx)*e-w/2,y:fcy+(tcy-fcy)*e-h/2,w,h});if(k<1)anim=requestAnimationFrame(step)};
  anim=requestAnimationFrame(step)}
function zoomAt(f,cx,cy,smooth){const t={x:cx-(cx-view.x)/f,y:cy-(cy-view.y)/f,w:view.w/f,h:view.h/f};smooth?animateTo(t):(cancelAnimationFrame(anim),applyView(t))}
function zoomCenter(f){zoomAt(f,view.x+view.w/2,view.y+view.h/2,true)}
function fitBox([x0,y0,x1,y1],pad=.12,minW=30){let w=Math.max(x1-x0,(y1-y0)*full.w/full.h)*(1+pad*2);w=Math.max(w,minW);const h=w*full.h/full.w;
  animateTo({x:(x0+x1)/2-w/2,y:(y0+y1)/2-h/2,w,h})}
function svgPoint(x,y){const p=mapSvg.createSVGPoint();p.x=x;p.y=y;return p.matrixTransform(mapSvg.getScreenCTM().inverse())}

/* labels: region names from 1.6×, province names from 4×, sized to stay readable at any zoom */
function renderLabels(){if(!labels)return;const u=unitsPerPx(),z=zoomOf();
  labels.setAttribute("font-size",String(12.5*u));labels.setAttribute("stroke-width",String(3.2*u));
  labels.querySelector(".rlabel").style.display=z>=1.6&&z<5?"":"none";
  const pl=labels.querySelector(".plabel");pl.style.display=z>=4?"":"none";pl.setAttribute("font-size",String(11.5*u));
  if(pinG){pinG.replaceChildren();if(pin){pinG.append(sv("circle",{cx:pin.x,cy:pin.y,r:String(6*u)}));
    const t=sv("text",{x:pin.x,y:String(pin.y-15*u),"font-size":String(13*u),"stroke-width":String(3.4*u)});t.textContent=pin.name;pinG.append(t)}}}

function showHint(msg){const h=$("mapHint");h.textContent=msg;h.hidden=false;clearTimeout(hintTimer);hintTimer=setTimeout(()=>{h.hidden=true},1600)}
function selectRegion(code){pin=null;setPlace(st.place===code?"":code)}

function buildMap(geo){mapGeo=geo;const [,,W,H]=geo.viewBox.split(" ").map(Number);full={x:0,y:0,w:W,h:H};
  const svg=mapSvg=sv("svg",{viewBox:geo.viewBox,preserveAspectRatio:"xMidYMid meet"});
  const gFill=sv("g",{class:"rfill"}),gProv=sv("g",{class:"prov"}),gLine=sv("g",{class:"rline"});labels=sv("g",{class:"labels"});pinG=sv("g",{class:"pin"});
  const rl=sv("g",{class:"rlabel"}),pl=sv("g",{class:"plabel"});labels.append(rl,pl);
  const stage=$("mapStage"),tip=$("mapTip");
  const tipAt=(title,sub,x,y)=>{tip.replaceChildren(title,el("span",{},sub));tip.style.left=x+"px";tip.style.top=y+"px";tip.hidden=false};
  const subFor=code=>{const {local,nat}=placeCounts(),n=local[code]||0;return RNAME[code]+" · "+fmtNum.format(n)+(n===1?" local listing":" local listings")+", "+fmtNum.format(nat)+" nationwide"};
  for(const r of geo.regions){if(!RNAME[r.code])continue;
    const p=sv("path",{d:r.d,tabindex:"0",role:"button"});
    p.addEventListener("click",()=>{if(!suppressClick)selectRegion(r.code)});
    p.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();selectRegion(r.code)}});
    p.addEventListener("focus",()=>{const b=stage.getBoundingClientRect(),s=svgPointToClient(r.cx,r.cy);tipAt(r.name,subFor(r.code).replace(RNAME[r.code]+" · ",""),s.x-b.left,s.y-b.top)});
    p.addEventListener("blur",()=>{tip.hidden=true});
    gFill.append(p);mapPaths[r.code]=p;
    const ln=sv("path",{d:r.d});gLine.append(ln);mapLines[r.code]=ln;
    const t=sv("text",{x:r.cx,y:r.cy});t.textContent=SHORT[r.code]||r.name;rl.append(t)}
  geo.provinces.forEach(pv=>{
    const p=sv("path",{d:pv.d});
    p.addEventListener("click",()=>{if(suppressClick)return;pin=null;
      if(zoomOf()>=2.5){pin={name:provName(pv.name),sub:RNAME[pv.region],x:pv.cx,y:pv.cy,box:pv.bbox,kind:"province"};st.place=pv.region;renderSectors();renderResults()}
      else selectRegion(pv.region)});
    p.addEventListener("pointermove",e=>{if(e.pointerType==="touch")return;const b=stage.getBoundingClientRect();tipAt(provName(pv.name),subFor(pv.region),e.clientX-b.left,e.clientY-b.top)});
    p.addEventListener("pointerleave",()=>{tip.hidden=true});
    gProv.append(p);
    const t=sv("text",{x:pv.cx,y:pv.cy});t.textContent=provName(pv.name).replace(/^Metro Manila, /,"");pl.append(t)});
  svg.append(gFill,gProv,gLine,labels,pinG);
  $("mapSvg").replaceChildren(svg);view={...full};

  // drag to pan, two fingers to pinch, Ctrl/⌘ + wheel or double-click to zoom
  const pts=new Map();let start=null;
  svg.addEventListener("pointerdown",e=>{pts.set(e.pointerId,{x:e.clientX,y:e.clientY});
    start={view:{...view},pts:new Map([...pts].map(([k,v])=>[k,{...v}])),moved:false};tip.hidden=true});
  svg.addEventListener("pointermove",e=>{if(!pts.has(e.pointerId)||!start)return;pts.set(e.pointerId,{x:e.clientX,y:e.clientY});
    const u=unitsPerPx();
    if(pts.size===1&&start.pts.size===1){const s=start.pts.get(e.pointerId);if(!s)return;const dx=e.clientX-s.x,dy=e.clientY-s.y;
      if(!start.moved&&Math.hypot(dx,dy)<5)return;
      if(zoomOf()<=1.02&&e.pointerType==="touch")return; // let one finger scroll the page when not zoomed
      if(!start.moved){start.moved=true;svg.setPointerCapture(e.pointerId);svg.classList.add("dragging")}
      cancelAnimationFrame(anim);applyView({...start.view,x:start.view.x-dx*u,y:start.view.y-dy*u})}
    else if(pts.size===2){const [a,b]=[...pts.values()],[sa,sb]=[...start.pts.values()];if(!sa||!sb)return;
      const d0=Math.hypot(sa.x-sb.x,sa.y-sb.y)||1,d1=Math.hypot(a.x-b.x,a.y-b.y),f=d1/d0;start.moved=true;
      const m=svgPointFromView(start.view,(sa.x+sb.x)/2,(sa.y+sb.y)/2);cancelAnimationFrame(anim);
      const w=start.view.w/f,h=start.view.h/f;applyView({x:m.x-(m.x-start.view.x)/f,y:m.y-(m.y-start.view.y)/f,w,h})}});
  const end=e=>{pts.delete(e.pointerId);svg.classList.remove("dragging");
    if(start&&start.moved){suppressClick=true;setTimeout(()=>{suppressClick=false},0)}
    start=pts.size?{view:{...view},pts:new Map([...pts].map(([k,v])=>[k,{...v}])),moved:true}:null};
  svg.addEventListener("pointerup",end);svg.addEventListener("pointercancel",end);
  svg.addEventListener("wheel",e=>{if(!(e.ctrlKey||e.metaKey)){if(zoomOf()<=1.02)return;showHint("Hold Ctrl (or ⌘) and scroll to zoom");return}
    e.preventDefault();const p=svgPoint(e.clientX,e.clientY);zoomAt(Math.exp(-e.deltaY*.0025),p.x,p.y,false)},{passive:false});
  svg.addEventListener("dblclick",e=>{e.preventDefault();const p=svgPoint(e.clientX,e.clientY);zoomAt(2,p.x,p.y,true)});
  stage.addEventListener("keydown",e=>{if(e.target.closest(".mapctl"))return;const step=view.w*.12;
    const k={"+":()=>zoomCenter(1.6),"=":()=>zoomCenter(1.6),"-":()=>zoomCenter(1/1.6),"0":()=>animateTo(full),
      ArrowLeft:()=>animateTo({...view,x:view.x-step}),ArrowRight:()=>animateTo({...view,x:view.x+step}),ArrowUp:()=>animateTo({...view,y:view.y-step}),ArrowDown:()=>animateTo({...view,y:view.y+step})}[e.key];
    if(k&&!(e.key.startsWith("Arrow")&&zoomOf()<=1.02)){e.preventDefault();k()}});
  $("zoomIn").addEventListener("click",()=>zoomCenter(1.8));$("zoomOut").addEventListener("click",()=>zoomCenter(1/1.8));
  $("zoomReset").addEventListener("click",()=>animateTo(full));
  new ResizeObserver(()=>renderLabels()).observe(stage);
  applyView(full);renderPlaces()}
function svgPointToClient(x,y){const m=mapSvg.getScreenCTM();return{x:m.a*x+m.e,y:m.d*y+m.f}}
function svgPointFromView(v,cx,cy){const saved=mapSvg.getAttribute("viewBox");mapSvg.setAttribute("viewBox",`${v.x} ${v.y} ${v.w} ${v.h}`);const p=svgPoint(cx,cy);mapSvg.setAttribute("viewBox",saved);return p}

function renderPlaces(){
  const {local,nat}=placeCounts(),ready=!!st.listings;
  for(const [code,p] of Object.entries(mapPaths)){const n=local[code]||0;p.setAttribute("data-l",String(placeLevel(n)));p.setAttribute("aria-pressed",String(st.place===code));
    p.setAttribute("aria-label",RNAME[code]+", "+n+(n===1?" local listing":" local listings"))}
  for(const [code,ln] of Object.entries(mapLines)){ln.classList.toggle("sel",st.place===code);if(st.place===code)ln.parentNode.append(ln)}
  // move the view when the selection changes
  if(mapGeo){const key=st.place+"|"+(pin?pin.name:"");if(key!==lastFit){const first=lastFit===null;lastFit=key;
    if(pin)fitBox(pin.box||[pin.x-10,pin.y-10,pin.x+10,pin.y+10],.15,pin.kind==="province"?40:24);
    else if(st.place){const r=mapGeo.regions.find(x=>x.code===st.place);if(r)fitBox(r.bbox)}
    else if(!first)animateTo(full)}
    renderLabels()}
  // region list (works without the map, and on small screens)
  $("regionList").replaceChildren(...GROUPS.map(g=>el("div",{class:"rgroup"},el("h4",{},g),el("div",{class:"rlist"},
    REGIONS.filter(r=>r[2]===g).map(([c,n])=>el("button",{type:"button",class:"rbtn","aria-pressed":String(st.place===c),onclick:()=>selectRegion(c)},n,el("span",{class:"ct num"},ready?fmtNum.format(local[c]||0):"…")))))));
  // place card
  const card=$("placeCard"),totalLocal=(st.listings||[]).filter(l=>kindOk(l)&&l._places.length).length;
  if(!st.place){card.replaceChildren(el("h3",{},"Pick a Place"),
    el("p",{class:"sub"},ready?fmtNum.format(totalLocal)+" listings are tied to a specific region so far, and "+fmtNum.format(nat)+" serve the whole country. Local groups are what this map needs most.":"Loading listings…"),
    el("div",{class:"pactions"},el("a",{class:"btn btn-line",href:"#submit"},icon("map-pin-plus"),"Add a Local Listing")));paintIcons();return}
  const n=local[st.place]||0,shown=filtered().length;
  card.replaceChildren(...[pin?el("span",{class:"pinned"},icon("map-pin"),pin.name+(pin.sub?", "+pin.sub:"")):null,
    el("h3",{},RNAME[st.place]),el("p",{class:"sub"},RGROUP[st.place]+(pin?" · listings are grouped by region for now":"")),
    el("div",{class:"pstats"},el("div",{class:"pstat"},el("b",{class:"num"},fmtNum.format(n)),el("span",{},n===1?"Local listing":"Local listings")),
      el("div",{class:"pstat"},el("b",{class:"num"},fmtNum.format(nat)),el("span",{},"Nationwide, also serve here"))),
    n?null:el("p",{class:"sub"},"No local listings here yet. Know a group or project in "+RNAME[st.place]+"? Add it so others can find it."),
    el("label",{class:"toggle",for:"natToggle"},el("input",{type:"checkbox",id:"natToggle",checked:st.nat,onchange:e=>{st.nat=e.target.checked;renderResults()}}),"Include nationwide listings"),
    el("div",{class:"pactions"},el("button",{type:"button",class:"btn",onclick:()=>$("directory").scrollIntoView({block:"start"})},icon("list"),"See "+fmtNum.format(shown)+(shown===1?" Listing":" Listings")),
      el("a",{class:"btn btn-line",href:"#submit",onclick:()=>{$("f-region").value=st.place}},icon("map-pin-plus"),"Add One Here"),
      el("button",{type:"button",class:"btn btn-line",onclick:()=>{$("placeQ").value="";setPlace("")}},icon("x"),"Clear"))].filter(Boolean));
  paintIcons()}

/* place search: regions, provinces, cities and municipalities */
let placeIndex=null,placeIndexLoading=null,activeIdx=-1,results=[];
const nameKey=s=>norm(s).replace(/^city of\s+/,"").replace(/\s+city$/,"").replace(/[^a-z0-9]+/g," ").trim();
function loadPlaceIndex(){if(placeIndex||placeIndexLoading)return placeIndexLoading;
  placeIndexLoading=fetch("data/ph-places.json").then(r=>{if(!r.ok)throw new Error("HTTP "+r.status);return r.json()}).then(d=>{
    const items=[];
    for(const r of (mapGeo?mapGeo.regions:[])){items.push({kind:"region",name:r.name,sub:"Region · "+r.group,code:r.code,box:r.bbox,key:nameKey(r.name)+" "+norm(r.code)})}
    if(!mapGeo)for(const [c,n,g] of REGIONS)items.push({kind:"region",name:n,sub:"Region · "+g,code:c,key:nameKey(n)+" "+norm(c)});
    d.provinces.forEach(([n,code],i)=>{const g=mapGeo&&mapGeo.provinces[i];items.push({kind:"province",name:provName(n),sub:"Province · "+RNAME[code],code,box:g&&g.bbox,x:g&&g.cx,y:g&&g.cy,key:nameKey(provName(n))})});
    for(const [n,pi,x,y] of d.places){const [pn,code]=d.provinces[pi];items.push({kind:"town",name:n,sub:provName(pn)+" · "+RNAME[code],code,x,y,key:nameKey(n)})}
    placeIndex=items;return items}).catch(()=>{placeIndexLoading=null;placeIndex=null});
  return placeIndexLoading}
// Ranking: exact name, then same name ignoring "City", starts with, every word starts a word, contains, then small typos
function searchPlaces(q){const raw=norm(q).replace(/[^a-z0-9]+/g," ").trim(),k=nameKey(q);if(!k||!placeIndex)return[];
  const rank={region:0,province:1,town:2},toks=k.split(" "),out=[];
  const fuzzyTok=(t,words)=>{const max=t.length>=6?2:t.length>=3?1:0;return words.some(w=>w.startsWith(t)||(max&&(lev(t,w,max)<=max||lev(t,w.slice(0,t.length),max)<=max)))};
  for(const it of placeIndex){let s=-1;const full=norm(it.name).replace(/[^a-z0-9]+/g," ").trim(),words=[...new Set([...it.key.split(" "),...full.split(" ")])];
    if(full===raw)s=0;else if(it.key===k)s=1;else if(it.key.startsWith(k))s=2;else if(toks.every(t=>words.some(w=>w.startsWith(t))))s=3;else if(it.key.includes(k))s=4;
    else if(toks.every(t=>fuzzyTok(t,words)))s=5+toks.reduce((sum,t)=>sum+Math.min(...words.map(w=>Math.min(lev(t,w,3),lev(t,w.slice(0,t.length),3)))),0)/100;
    if(s>=0)out.push([s,rank[it.kind],it])}
  const strong=out.some(x=>x[0]<=4),list=strong?out.filter(x=>x[0]<=4):out;
  return list.sort((a,b)=>a[0]-b[0]||a[1]-b[1]||a[2].name.localeCompare(b[2].name)).slice(0,8).map(x=>x[2])}
const KIND_ICON={region:"layers",province:"map",town:"map-pin"};
function renderPlaceList(){const ul=$("placeList"),inp=$("placeQ"),q=inp.value.trim();
  if(!q){ul.hidden=true;inp.setAttribute("aria-expanded","false");inp.removeAttribute("aria-activedescendant");return}
  ul.replaceChildren(...(results.length?results.map((it,i)=>el("li",{id:"pl-"+i,role:"option","aria-selected":String(i===activeIdx),
      onmousedown:e=>e.preventDefault(),onclick:()=>choosePlace(it)},icon(KIND_ICON[it.kind]),el("span",{},el("b",{},it.name),el("small",{},it.sub))))
    :[el("li",{class:"none",role:"option","aria-disabled":"true"},placeIndex?"No place matches “"+q+"”. Check the spelling, or try the province name.":"Loading places…")]));
  ul.hidden=false;inp.setAttribute("aria-expanded","true");
  if(activeIdx>=0)inp.setAttribute("aria-activedescendant","pl-"+activeIdx);else inp.removeAttribute("aria-activedescendant");
  paintIcons()}
function choosePlace(it){const inp=$("placeQ");inp.value=it.name;results=[];activeIdx=-1;renderPlaceList();
  if(it.kind==="region"){pin=null;st.place=it.code}
  else{pin={name:it.name,sub:it.kind==="town"?it.sub.split(" · ")[0]:RNAME[it.code],x:it.x,y:it.y,box:it.kind==="province"?it.box:null,kind:it.kind};st.place=it.code}
  renderSectors();renderResults();$("mapStage").scrollIntoView({block:"nearest"})}
async function onPlaceInput(){await loadPlaceIndex();results=searchPlaces($("placeQ").value);activeIdx=results.length?0:-1;renderPlaceList()}
$("placeQ").addEventListener("focus",()=>{loadPlaceIndex()});
$("placeQ").addEventListener("input",onPlaceInput);
$("placeQ").addEventListener("keydown",e=>{
  if(e.key==="ArrowDown"&&results.length){e.preventDefault();activeIdx=(activeIdx+1)%results.length;renderPlaceList()}
  else if(e.key==="ArrowUp"&&results.length){e.preventDefault();activeIdx=(activeIdx-1+results.length)%results.length;renderPlaceList()}
  else if(e.key==="Enter"){e.preventDefault();if(results[activeIdx])choosePlace(results[activeIdx])}
  else if(e.key==="Escape"){if(!$("placeList").hidden){results=[];activeIdx=-1;$("placeList").hidden=true;$("placeQ").setAttribute("aria-expanded","false")}else{$("placeQ").value=""}}});
$("placeQ").addEventListener("blur",()=>{setTimeout(()=>{$("placeList").hidden=true;$("placeQ").setAttribute("aria-expanded","false")},120)});
function buildRegionOptions(){$("regionOpts").replaceChildren(...REGIONS.map(([c,n])=>el("option",{value:c},n)))}

/* submit: build a pre-filled GitHub issue */
function showErr(id,m,input){const e=$(id);e.replaceChildren(...(m?[icon("circle-alert"),el("span",{},m)]:[]));e.hidden=!m;if(input)input.setAttribute("aria-invalid",m?"true":"false")}
$("f-desc").addEventListener("input",e=>$("descCt").textContent=e.target.value.length);
$("subForm").addEventListener("input",()=>formDirty=true);
window.addEventListener("beforeunload",e=>{if(formDirty){e.preventDefault();e.returnValue=""}});
$("subForm").addEventListener("submit",e=>{e.preventDefault();const msg=$("formMsg");msg.replaceChildren();
  const nameI=$("f-name"),descI=$("f-desc"),urlI=$("f-url");
  const name=nameI.value.trim(),desc=descI.value.trim(),urlRaw=urlI.value.trim();
  const secs=[...document.querySelectorAll("#sectorChecks input:checked")].map(i=>i.value);
  const url=urlRaw?safeUrl(/^https?:\/\//.test(urlRaw)?urlRaw:"https://"+urlRaw):"";
  const errs=[];
  showErr("e-name",name?"":"Add the project or organization name.",nameI);if(!name)errs.push(nameI);
  showErr("e-desc",desc.length>=20?"":"Describe it in at least 20 characters so a moderator can check it.",descI);if(desc.length<20)errs.push(descI);
  showErr("e-sec",secs.length?"":"Pick at least one sector.");if(!secs.length)errs.push($("sc-disaster"));
  showErr("e-url",urlRaw&&!url?"That doesn’t look like a web address. Use a full link like https://example.org.":"",urlI);if(urlRaw&&!url)errs.push(urlI);
  paintIcons();
  if(errs.length){errs[0].focus();return}
  const type=document.querySelector("input[name=type]:checked").value;
  const rv=$("f-region").value,rcode=RNAME[rv]?rv:null;
  const entry={name,type,org:$("f-org").value.trim()||undefined,description:desc,sectors:secs,website:url||undefined,region:rcode?RNAME[rcode]:rv,areas:rcode?[rcode]:undefined,status:$("f-status").value,verifiedAt:null};
  const body=["### Name",name,"","### Type",type==="cso"?"Civil society organization":"Civic tech project","","### Run by",entry.org||"_Not given_","",
    "### What it does",desc,"","### Sectors",secs.map(s=>"- "+SNAME[s]).join("\n"),"","### Website",url||"_Not given_","","### Coverage",entry.region,"",
    "### Still active?",$("f-status").selectedOptions[0].textContent,"","### How the submitter knows",$("f-src").value.trim()||"_Not given_","",
    "<details><summary>Entry for data/listings.json</summary>","","```json",JSON.stringify(entry,null,2),"```","</details>"].join("\n");
  const href=REPO+"/issues/new?labels=listing&title="+encodeURIComponent("New listing: "+name)+"&body="+encodeURIComponent(body);
  formDirty=false;
  const win=window.open(href,"_blank");if(win)win.opener=null;
  msg.append(el("div",{class:"msg ok-msg"},icon("external-link"),el("span",{},win?"GitHub opened in a new tab. Review the issue there and select Submit new issue to send it.":"Your issue is ready. ",win?null:el("a",{href,target:"_blank",rel:"noopener noreferrer"},"Open it on GitHub"))));
  paintIcons();
});

/* wiring */
document.querySelectorAll(".kind").forEach(b=>b.addEventListener("click",()=>setType(b.dataset.t)));
$("fStatus").addEventListener("change",e=>{st.status=e.target.value;renderResults()});
$("fVer").addEventListener("change",e=>{st.ver=e.target.value;renderResults()});
$("q").addEventListener("input",e=>{st.q=e.target.value;renderResults()});
$("searchForm").addEventListener("submit",e=>{e.preventDefault();st.q=$("q").value;renderResults();$("directory").scrollIntoView({block:"start"})});
$("clearAll").addEventListener("click",clearAll);
window.addEventListener("hashchange",()=>{const h=location.hash.slice(1);if(SNAME[h]||KIND_HASH[h]){readUrl();renderSectors();renderResults()}});
window.addEventListener("popstate",()=>{readUrl();renderSectors();renderResults()});
buildChecks();buildRegionOptions();readUrl();renderSectors();renderPlaces();paintIcons();
window.addEventListener("load",paintIcons);

/* data */
(async()=>{
  try{
    const res=await fetch("data/listings.json",{cache:"no-cache"});
    if(!res.ok)throw new Error("HTTP "+res.status);
    const rows=await res.json();
    st.listings=(Array.isArray(rows)?rows:[]).map(indexListing);
  }catch(err){st.loadErr="The listings file couldn’t load ("+(err.message||err)+"). Check your connection and reload the page."}
  renderSectors();renderResults();renderStats();
})();
(async()=>{
  try{const res=await fetch("data/ph-map.json");if(!res.ok)throw new Error("HTTP "+res.status);buildMap(await res.json())}
  catch{$("mapSvg").replaceChildren(el("p",{class:"mapnote"},"The map couldn’t load. Use the region list instead."))}
})();
