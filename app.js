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
function clearAll(){st.status="";st.ver="";st.q="";st.place="";st.nat=true;$("q").value="";$("fStatus").value="";$("fVer").value="";st.sector="";setType("all");setSector("",false)}

/* map */
const SVGNS="http://www.w3.org/2000/svg";
let mapPaths={},mapGeo=null;
function setPlace(code,scroll){st.place=code;renderSectors();renderResults();if(scroll)$("directory").scrollIntoView({block:"start"})}
function placeCounts(){const local={},L=(st.listings||[]).filter(kindOk);let nat=0;
  for(const l of L){if(l._nat)nat++;for(const c of l._places)local[c]=(local[c]||0)+1}return{local,nat}}
function buildMap(geo){mapGeo=geo;const box=$("mapSvg");
  const svg=document.createElementNS(SVGNS,"svg");svg.setAttribute("viewBox",geo.viewBox);svg.setAttribute("aria-hidden","false");
  const tip=$("mapTip"),wrap=box.parentElement;
  const showTip=(r,x,y)=>{const {local,nat}=placeCounts();const n=local[r.code]||0;
    tip.replaceChildren(r.name,el("span",{},fmtNum.format(n)+(n===1?" local listing":" local listings")+" · "+fmtNum.format(nat)+" nationwide"));
    tip.style.left=x+"px";tip.style.top=y+"px";tip.hidden=false};
  for(const r of geo.regions){
    if(!RNAME[r.code])continue;
    const p=document.createElementNS(SVGNS,"path");p.setAttribute("d",r.d);p.setAttribute("tabindex","0");p.setAttribute("role","button");
    p.addEventListener("click",()=>setPlace(st.place===r.code?"":r.code));
    p.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();setPlace(st.place===r.code?"":r.code)}});
    p.addEventListener("pointermove",e=>{const b=wrap.getBoundingClientRect();showTip(r,e.clientX-b.left,e.clientY-b.top)});
    p.addEventListener("pointerleave",()=>{tip.hidden=true});
    p.addEventListener("focus",()=>{const b=wrap.getBoundingClientRect(),s=svg.getBoundingClientRect(),[,,vw,vh]=geo.viewBox.split(" ").map(Number);
      showTip(r,s.left-b.left+r.cx*s.width/vw,s.top-b.top+r.cy*s.height/vh)});
    p.addEventListener("blur",()=>{tip.hidden=true});
    svg.append(p);mapPaths[r.code]=p}
  box.replaceChildren(svg);renderPlaces()}
function renderPlaces(){
  const {local,nat}=placeCounts(),ready=!!st.listings;
  for(const [code,p] of Object.entries(mapPaths)){const n=local[code]||0;p.setAttribute("data-l",String(placeLevel(n)));p.setAttribute("aria-pressed",String(st.place===code));
    p.setAttribute("aria-label",RNAME[code]+", "+n+(n===1?" local listing":" local listings"))}
  const svg=$("mapSvg").querySelector("svg");if(svg)svg.classList.toggle("has-sel",!!st.place);
  // region list (works without the map, and on small screens)
  $("regionList").replaceChildren(...GROUPS.map(g=>el("div",{class:"rgroup"},el("h4",{},g),el("div",{class:"rlist"},
    REGIONS.filter(r=>r[2]===g).map(([c,n])=>el("button",{type:"button",class:"rbtn","aria-pressed":String(st.place===c),onclick:()=>setPlace(st.place===c?"":c)},n,el("span",{class:"ct num"},ready?fmtNum.format(local[c]||0):"…")))))));
  // place card
  const card=$("placeCard"),totalLocal=(st.listings||[]).filter(l=>kindOk(l)&&l._places.length).length;
  if(!st.place){card.replaceChildren(el("h3",{},"Pick a Region"),
    el("p",{class:"sub"},ready?fmtNum.format(totalLocal)+" listings are tied to a specific region so far, and "+fmtNum.format(nat)+" serve the whole country. Local groups are what this map needs most.":"Loading listings…"),
    el("div",{class:"pactions"},el("a",{class:"btn btn-line",href:"#submit"},icon("map-pin-plus"),"Add a Local Listing")));paintIcons();return}
  const n=local[st.place]||0,shown=filtered().length;
  card.replaceChildren(...[el("h3",{},RNAME[st.place]),el("p",{class:"sub"},RGROUP[st.place]),
    el("div",{class:"pstats"},el("div",{class:"pstat"},el("b",{class:"num"},fmtNum.format(n)),el("span",{},n===1?"Local listing":"Local listings")),
      el("div",{class:"pstat"},el("b",{class:"num"},fmtNum.format(nat)),el("span",{},"Nationwide, also serve here"))),
    n?null:el("p",{class:"sub"},"No local listings here yet. Know a group or project in "+RNAME[st.place]+"? Add it so others can find it."),
    el("label",{class:"toggle",for:"natToggle"},el("input",{type:"checkbox",id:"natToggle",checked:st.nat,onchange:e=>{st.nat=e.target.checked;renderResults()}}),"Include nationwide listings"),
    el("div",{class:"pactions"},el("button",{type:"button",class:"btn",onclick:()=>$("directory").scrollIntoView({block:"start"})},icon("list"),"See "+fmtNum.format(shown)+(shown===1?" Listing":" Listings")),
      el("a",{class:"btn btn-line",href:"#submit",onclick:()=>{$("f-region").value=st.place}},icon("map-pin-plus"),"Add One Here"),
      el("button",{type:"button",class:"btn btn-line",onclick:()=>setPlace("")},icon("x"),"Clear"))].filter(Boolean));
  paintIcons()}
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
  try{const res=await fetch("data/ph-regions.json");if(!res.ok)throw new Error("HTTP "+res.status);buildMap(await res.json())}
  catch{$("mapSvg").replaceChildren(el("p",{class:"mapnote"},"The map couldn’t load. Use the region list instead."))}
})();
