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
const st={type:"all",sector:"",status:"",ver:"",q:"",listings:null,loadErr:""};
let formDirty=false;

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
function syncHash(){const h=st.sector||Object.keys(KIND_HASH).find(k=>KIND_HASH[k]===st.type)||"";try{history.replaceState(null,"",h?"#"+h:location.pathname+location.search)}catch{}}
function setSector(k,scroll){st.sector=k;syncHash();renderSectors();renderResults();if(scroll)$("directory").scrollIntoView({block:"start"})}

/* results */
function filtered(){const q=st.q.trim().toLowerCase();
  return (st.listings||[]).filter(l=>kindOk(l)&&(!st.sector||(l.sectors||[]).includes(st.sector))&&(!st.status||l.status===st.status)
    &&(!st.ver||(st.ver==="yes"?!!l.verifiedAt:!l.verifiedAt))
    &&(!q||[l.name,l.org,l.description,l.region,l.area,l.website,...(l.sectors||[]).map(s=>SNAME[s])].join(" ").toLowerCase().includes(q)))
   .sort((a,b)=>(isBG(b)-isBG(a))||((a.order??999)-(b.order??999))||String(a.name).localeCompare(String(b.name)))}
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
function renderResults(){const r=$("results");
  $("clearAll").hidden=!(st.sector||st.status||st.ver||st.q||st.type!=="all");
  $("activeSector").replaceChildren(st.sector?el("span",{class:"chip"},SNAME[st.sector],el("button",{type:"button","aria-label":"Clear sector filter",onclick:()=>setSector("",false)},icon("x"))):"");
  if(st.loadErr){r.setAttribute("aria-busy","false");r.replaceChildren(stateBox("cloud-off","The Directory Couldn’t Load",st.loadErr));$("count").textContent="";paintIcons();return}
  if(!st.listings)return;
  r.setAttribute("aria-busy","false");
  const list=filtered();
  $("count").textContent="Showing "+fmtNum.format(list.length)+(list.length===1?" entry":" entries");
  if(!st.listings.length){r.replaceChildren(stateBox("folder-open","No Listings Yet","Approved entries will appear here.",el("a",{class:"btn",href:"#submit"},icon("plus"),"Submit the First One")));paintIcons();return}
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
function setType(t){st.type=t;document.querySelectorAll(".kind").forEach(x=>x.setAttribute("aria-pressed",String(x.dataset.t===t)));if(!st.sector)syncHash();renderSectors();renderResults()}
function clearAll(){st.status="";st.ver="";st.q="";$("q").value="";$("fStatus").value="";$("fVer").value="";st.sector="";setType("all");setSector("",false)}

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
  const entry={name,type,org:$("f-org").value.trim()||undefined,description:desc,sectors:secs,website:url||undefined,region:$("f-region").value,status:$("f-status").value,verifiedAt:null};
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
function readHash(){const h=location.hash.slice(1);if(SNAME[h]){st.sector=h;renderSectors();renderResults()}else if(KIND_HASH[h]){setType(KIND_HASH[h])}}
window.addEventListener("hashchange",readHash);
buildChecks();renderSectors();readHash();paintIcons();
window.addEventListener("load",paintIcons);

/* data */
(async()=>{
  try{
    const res=await fetch("data/listings.json",{cache:"no-cache"});
    if(!res.ok)throw new Error("HTTP "+res.status);
    const rows=await res.json();
    st.listings=Array.isArray(rows)?rows:[];
  }catch(err){st.loadErr="The listings file couldn’t load ("+(err.message||err)+"). Check your connection and reload the page."}
  renderSectors();renderResults();renderStats();
})();
