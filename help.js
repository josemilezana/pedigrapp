(() => {
"use strict";
const data=window.PEDIGRAPP_HELP_DATA;
if(!data) throw new Error("No se ha podido cargar help-data.js");
const $=id=>document.getElementById(id);
const esc=v=>String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
const sw='stroke="#111" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"';
const sh='stroke="#111" stroke-width="2" fill="#fff"';
const tx='fill="#111" font-family="Arial,Helvetica,sans-serif" font-weight="700" text-anchor="middle"';
const wrap=(body,view="0 0 80 70")=>`<svg viewBox="${view}" aria-hidden="true">${body}</svg>`;

function visual(kind){
  switch(kind){
    case"male":return wrap(`<rect x="24" y="17" width="32" height="32" ${sh}/>`);
    case"female":return wrap(`<circle cx="40" cy="33" r="16" ${sh}/>`);
    case"diamond":return wrap(`<polygon points="40,14 59,33 40,52 21,33" ${sh}/>`);
    case"affected":return wrap(`<circle cx="40" cy="33" r="16" stroke="#111" stroke-width="2" fill="#111"/>`);
    case"deceased":return wrap(`<rect x="24" y="17" width="32" height="32" ${sh}/><line x1="19" y1="54" x2="61" y2="12" ${sw}/>`);
    case"consultand":return wrap(`<circle cx="48" cy="32" r="15" ${sh}/><line x1="13" y1="56" x2="31" y2="42" ${sw}/><polyline points="22,42 31,42 29,51" ${sw}/>`);
    case"proband":return wrap(`<circle cx="48" cy="32" r="15" ${sh}/><line x1="13" y1="56" x2="31" y2="42" ${sw}/><polyline points="22,42 31,42 29,51" ${sw}/><text x="19" y="23" font-size="11" ${tx}>P</text>`);
    case"family_unknown":return wrap(`<text x="22" y="39" font-size="25" ${tx}>?</text><line x1="44" y1="16" x2="44" y2="26" ${sw}/><line x1="32" y1="26" x2="56" y2="26" ${sw}/><rect x="28" y="31" width="8" height="8" ${sh}/><circle cx="44" cy="35" r="4" ${sh}/><rect x="52" y="31" width="8" height="8" ${sh}/>`);
    case"multiple3":return wrap(`<rect x="24" y="17" width="32" height="32" ${sh}/><text x="40" y="39" font-size="16" ${tx}>3</text>`);
    case"multiplen":return wrap(`<rect x="24" y="17" width="32" height="32" ${sh}/><text x="40" y="39" font-size="16" ${tx}>n</text>`);
    case"fetus":return wrap(`<polygon points="40,14 58,32 40,50 22,32" ${sh}/><text x="40" y="37" font-size="14" ${tx}>P</text>`);
    case"stillbirth":return wrap(`<rect x="25" y="17" width="30" height="30" ${sh}/><line x1="20" y1="52" x2="60" y2="12" ${sw}/><text x="40" y="64" font-size="10" ${tx}>SB</text>`);
    case"sab":return wrap(`<polygon points="40,14 58,48 22,48" ${sh}/><text x="40" y="62" font-size="10" ${tx}>SAB</text>`);
    case"top":return wrap(`<polygon points="40,14 58,48 22,48" ${sh}/><line x1="28" y1="47" x2="51" y2="21" ${sw}/><text x="40" y="62" font-size="10" ${tx}>TOP</text>`);
    case"ect":return wrap(`<polygon points="40,14 58,48 22,48" ${sh}/><line x1="29" y1="46" x2="51" y2="21" ${sw}/><text x="40" y="62" font-size="10" ${tx}>ECT</text>`);
    case"two_conditions":return wrap(`<circle cx="40" cy="33" r="16" ${sh}/><path d="M40 17 A16 16 0 0 0 40 49 Z" fill="#70777d"/><line x1="40" y1="17" x2="40" y2="49" stroke="#111" stroke-width="1.5"/>`);
    case"multi_conditions":return wrap(`<circle cx="40" cy="33" r="16" ${sh}/><path d="M40 33 L40 17 A16 16 0 0 1 53.9 41 Z" fill="#6d747a"/><path d="M40 33 L53.9 41 A16 16 0 0 1 26.1 41 Z" fill="#c4c8cb"/><line x1="40" y1="33" x2="40" y2="17" stroke="#111"/><line x1="40" y1="33" x2="53.9" y2="41" stroke="#111"/><line x1="40" y1="33" x2="26.1" y2="41" stroke="#111"/>`);
    case"carrier":return wrap(`<defs><pattern id="hh" width="5" height="5" patternUnits="userSpaceOnUse"><path d="M-1 5 5-1M2 8 8 2" stroke="#555" stroke-width="1"/></pattern></defs><circle cx="40" cy="33" r="16" stroke="#111" stroke-width="2" fill="url(#hh)"/>`);
    case"documented":return wrap(`<circle cx="40" cy="31" r="15" ${sh}/><text x="58" y="18" font-size="16" ${tx}>*</text>`);
    case"donor":return wrap(`<circle cx="40" cy="33" r="16" ${sh}/><text x="40" y="39" font-size="17" ${tx}>D</text>`);
    case"gestational":return wrap(`<circle cx="40" cy="33" r="16" ${sh}/><text x="40" y="39" font-size="17" ${tx}>G</text>`);
    case"surrogate":return wrap(`<circle cx="40" cy="20" r="12" ${sh}/><text x="40" y="25" font-size="13" ${tx}>D</text><line x1="40" y1="32" x2="40" y2="43" ${sw}/><polygon points="40,43 50,53 40,63 30,53" ${sh}/><text x="40" y="57" font-size="10" ${tx}>P</text>`);
    case"union":return wrap(`<rect x="8" y="25" width="18" height="18" ${sh}/><circle cx="62" cy="34" r="9" ${sh}/><line x1="26" y1="34" x2="53" y2="34" ${sw}/>`);
    case"ended_union":return wrap(`<rect x="8" y="25" width="18" height="18" ${sh}/><circle cx="62" cy="34" r="9" ${sh}/><line x1="26" y1="34" x2="53" y2="34" ${sw}/><line x1="36" y1="42" x2="42" y2="26" ${sw}/><line x1="42" y1="42" x2="48" y2="26" ${sw}/>`);
    case"consanguinity":return wrap(`<rect x="8" y="25" width="18" height="18" ${sh}/><circle cx="62" cy="34" r="9" ${sh}/><line x1="26" y1="31" x2="53" y2="31" ${sw}/><line x1="26" y1="37" x2="53" y2="37" ${sw}/>`);
    case"parentage":return wrap(`<rect x="9" y="9" width="16" height="16" ${sh}/><circle cx="55" cy="17" r="8" ${sh}/><line x1="25" y1="17" x2="47" y2="17" ${sw}/><line x1="36" y1="17" x2="36" y2="48" ${sw}/><rect x="29" y="48" width="14" height="14" ${sh}/>`);
    case"sibship":return wrap(`<line x1="40" y1="8" x2="40" y2="24" ${sw}/><line x1="18" y1="24" x2="62" y2="24" ${sw}/><line x1="18" y1="24" x2="18" y2="43" ${sw}/><line x1="40" y1="24" x2="40" y2="43" ${sw}/><line x1="62" y1="24" x2="62" y2="43" ${sw}/><rect x="11" y="43" width="14" height="14" ${sh}/><circle cx="40" cy="50" r="7" ${sh}/><rect x="55" y="43" width="14" height="14" ${sh}/>`);
    case"twins":return wrap(`<line x1="40" y1="8" x2="40" y2="23" ${sw}/><line x1="40" y1="23" x2="24" y2="44" ${sw}/><line x1="40" y1="23" x2="56" y2="44" ${sw}/><circle cx="22" cy="51" r="7" ${sh}/><circle cx="58" cy="51" r="7" ${sh}/><line x1="30" y1="38" x2="50" y2="38" ${sw}/>`);
    case"triplets":return wrap(`<line x1="40" y1="7" x2="40" y2="20" ${sw}/><line x1="40" y1="20" x2="18" y2="43" ${sw}/><line x1="40" y1="20" x2="40" y2="43" ${sw}/><line x1="40" y1="20" x2="62" y2="43" ${sw}/><rect x="12" y="43" width="12" height="12" ${sh}/><rect x="34" y="43" width="12" height="12" ${sh}/><rect x="56" y="43" width="12" height="12" ${sh}/>`);
    case"adoption_in":return wrap(`<path d="M26 17h-7v32h7M54 17h7v32h-7" ${sw}/><circle cx="40" cy="33" r="12" ${sh}/><line x1="40" y1="2" x2="40" y2="17" stroke="#111" stroke-width="2" stroke-dasharray="4 4"/>`);
    case"adoption_out":return wrap(`<path d="M26 17h-7v32h7M54 17h7v32h-7" ${sw}/><circle cx="40" cy="33" r="12" ${sh}/><line x1="40" y1="2" x2="40" y2="17" ${sw}/>`);
    case"intergenerational":return wrap(`<rect x="8" y="9" width="17" height="17" ${sh}/><circle cx="62" cy="51" r="9" ${sh}/><line x1="25" y1="24" x2="53" y2="46" ${sw}/>`);
    case"multiple_unions":return wrap(`<circle cx="40" cy="34" r="8" ${sh}/><rect x="5" y="26" width="16" height="16" ${sh}/><rect x="59" y="26" width="16" height="16" ${sh}/><line x1="21" y1="34" x2="32" y2="34" ${sw}/><line x1="48" y1="34" x2="59" y2="34" ${sw}/>`);
    case"no_children":return wrap(`<circle cx="40" cy="20" r="10" ${sh}/><line x1="40" y1="30" x2="40" y2="50" ${sw}/><line x1="30" y1="50" x2="50" y2="50" ${sw}/>`);
    case"infertility":return wrap(`<circle cx="40" cy="18" r="9" ${sh}/><line x1="40" y1="27" x2="40" y2="45" ${sw}/><line x1="29" y1="45" x2="51" y2="45" ${sw}/><line x1="29" y1="52" x2="51" y2="52" ${sw}/>`);
    default:return wrap(`<text x="40" y="38" font-size="18" ${tx}>?</text>`);
  }
}

function makeSection(id,title,lead=""){
  const section=document.createElement("section");
  section.id=id;
  section.className="help-section";
  const h=document.createElement("h2"); h.textContent=title; section.appendChild(h);
  if(lead){const p=document.createElement("p");p.className="help-section-lead";p.textContent=lead;section.appendChild(p)}
  return section;
}
function addNav(id,title){
  const a=document.createElement("a");a.href=`#${id}`;a.textContent=title;$("helpNavLinks").appendChild(a)
}
function searchable(node,text){node.classList.add("help-searchable");node.dataset.search=String(text).toLowerCase()}

function renderQuickStart(){
  const section=makeSection("primeros-pasos","Primeros pasos","Flujo recomendado para crear, revisar y documentar un pedigree.");
  const grid=document.createElement("div");grid.className="help-quick-grid";
  data.quickStart.forEach(item=>{
    const card=document.createElement("article");card.className="help-quick-card";
    searchable(card,`${item.title} ${item.text}`);
    card.innerHTML=`<h3>${esc(item.title)}</h3><p>${esc(item.text)}</p>`;
    grid.appendChild(card)
  });
  section.appendChild(grid);
  if(data.notes?.length){
    const ul=document.createElement("ul");ul.className="help-note-list";
    data.notes.forEach(note=>{const li=document.createElement("li");li.textContent=note;ul.appendChild(li)});
    section.appendChild(ul)
  }
  $("helpContent").appendChild(section);addNav(section.id,"Primeros pasos")
}
function renderSymbolGroups(){
  data.symbolGroups.forEach(group=>{
    const section=makeSection(`simbolos-${group.id}`,group.title,"Los ejemplos reproducen la convención utilizada actualmente por PedigrAPP.");
    const grid=document.createElement("div");grid.className="help-symbol-grid";
    group.items.forEach(item=>{
      const card=document.createElement("article");card.className="help-symbol-card";
      searchable(card,`${item.title} ${item.standard} ${item.text}`);
      card.innerHTML=`<div class="help-symbol-visual">${visual(item.visual)}</div><div class="help-symbol-body"><h4>${esc(item.title)}</h4><span class="help-standard-badge">${esc(item.standard)}</span><p>${esc(item.text)}</p></div>`;
      grid.appendChild(card)
    });
    section.appendChild(grid);$("helpContent").appendChild(section);addNav(section.id,group.title)
  })
}
function renderRelationships(){
  const section=makeSection("relaciones","Relaciones y líneas del pedigree","Significado de las líneas de pareja, filiación, fratría, adopción y otras relaciones.");
  const grid=document.createElement("div");grid.className="help-relations";
  data.relationships.forEach(item=>{
    const card=document.createElement("article");card.className="help-relation-card";
    searchable(card,`${item.title} ${item.standard} ${item.text}`);
    card.innerHTML=`<div class="help-symbol-visual">${visual(item.visual)}</div><div class="help-relation-body"><h4>${esc(item.title)}</h4><span class="help-standard-badge">${esc(item.standard)}</span><p>${esc(item.text)}</p></div>`;
    grid.appendChild(card)
  });
  section.appendChild(grid);$("helpContent").appendChild(section);addNav(section.id,"Relaciones")
}
function renderBulletSection(id,title,lead,items){
  const section=makeSection(id,title,lead),ul=document.createElement("ul");ul.className="help-bullet-list";
  items.forEach(item=>{const li=document.createElement("li");li.textContent=item;searchable(li,item);ul.appendChild(li)});
  section.appendChild(ul);$("helpContent").appendChild(section);addNav(id,title)
}
function renderBibliography(){
  const section=makeSection("bibliografia","Fuentes y referencias bibliográficas","Publicaciones utilizadas como base para la nomenclatura y las decisiones de representación de PedigrAPP.");
  const list=document.createElement("div");list.className="help-reference-list";
  data.bibliography.forEach(ref=>{
    const card=document.createElement("article");card.className="help-reference-card";
    searchable(card,`${ref.key} ${ref.citation} ${ref.role}`);
    const link=ref.doi?`<a class="help-reference-link" href="${esc(ref.doi)}" target="_blank" rel="noopener noreferrer">Abrir DOI ↗</a>`:"";
    card.innerHTML=`<p class="help-reference-role">${esc(ref.role)}</p><p class="help-reference-citation">${esc(ref.citation)}</p>${link}`;
    list.appendChild(card)
  });
  section.appendChild(list);$("helpContent").appendChild(section);addNav(section.id,"Bibliografía")
}
function renderAuthorship(){
  const section=makeSection("autoria","Autoría y equipo del proyecto","Se diferencia la autoría registrada de v1.0.0 del equipo de colaboradores.");
  const addText=value=>{const p=document.createElement("p");p.className="help-authorship-lead";p.textContent=value;searchable(p,value);section.appendChild(p)};
  const addNames=names=>{const grid=document.createElement("div");grid.className="help-author-grid";
    names.forEach(name=>{const d=document.createElement("div");d.className="help-author-card";d.textContent=name;searchable(d,name);grid.appendChild(d)});
    section.appendChild(grid)};
  addText("Autores registrados de PedigrAPP v1.0.0 (Safe Creative)");
  addNames(data.registeredAuthors);
  addText("Equipo y colaboradores clínicos y científicos del proyecto");
  addNames(data.projectTeam);
  addText(`Titular de todos los derechos de explotación: ${data.exploitationRightsHolder}. Registro: ${data.registry}.`);
  addText("La colaboración en el proyecto no atribuye automáticamente autoría de futuras versiones ni de publicaciones científicas; esta dependerá de las contribuciones realizadas.");
  const detail=document.createElement("p");detail.innerHTML='<a href="AUTHORS.md" target="_blank" rel="noopener noreferrer">Créditos y registro completos (AUTHORS.md)</a>';section.appendChild(detail);
  $("helpContent").appendChild(section);addNav(section.id,"Autoría")
}
function renderChangelog(){
  const section=makeSection("actualizaciones","Actualización de esta ayuda","Los cambios de PedigrAPP que afectan a procedimientos, símbolos o relaciones deben reflejarse en este registro.");
  const list=document.createElement("div");list.className="help-changelog";
  data.changelog.forEach(item=>{
    const row=document.createElement("div");row.className="help-changelog-row";searchable(row,`${item.version} ${item.text}`);
    row.innerHTML=`<div class="help-changelog-version">v${esc(item.version)}</div><div class="help-changelog-text">${esc(item.text)}</div>`;
    list.appendChild(row)
  });
  section.appendChild(list);$("helpContent").appendChild(section);addNav(section.id,"Actualizaciones")
}
function applySearch(){
  const q=$("helpSearch").value.trim().toLowerCase();
  const nodes=[...document.querySelectorAll(".help-searchable")];
  if(!q){nodes.forEach(n=>n.classList.remove("help-search-hidden"));document.querySelectorAll(".help-section").forEach(s=>s.classList.remove("help-search-hidden"));$("helpSearchCount").textContent="";return}
  let matches=0;
  nodes.forEach(n=>{const hit=(n.dataset.search||n.textContent.toLowerCase()).includes(q);n.classList.toggle("help-search-hidden",!hit);if(hit)matches++});
  document.querySelectorAll(".help-section").forEach(section=>{
    const visible=section.querySelectorAll(".help-searchable:not(.help-search-hidden)").length;
    section.classList.toggle("help-search-hidden",visible===0)
  });
  $("helpSearchCount").textContent=matches===1?"1 coincidencia":`${matches} coincidencias`
}
async function syncVersion(){
  $("helpVersionBadge").textContent=`Ayuda v${data.helpVersion}`;
  $("helpUpdatedBadge").textContent=`Actualizada ${data.updatedAt}`;
  const sync=$("helpSyncBadge"),warning=$("helpSyncWarning");
  try{
    const response=await fetch(`pedigree.js?help-sync=${Date.now()}`,{cache:"no-store"});
    if(!response.ok)throw new Error("No se pudo leer pedigree.js");
    const text=await response.text();
    const match=text.match(/const\s+APP_VERSION\s*=\s*"([^"]+)"/);
    if(!match)throw new Error("Versión no encontrada");
    const appVersion=match[1];
    $("helpVersionBadge").textContent=`PedigrAPP v${appVersion} · Ayuda v${data.helpVersion}`;
    if(appVersion===data.helpVersion){sync.hidden=false;sync.textContent="Ayuda sincronizada";warning.hidden=true}
    else{sync.hidden=true;warning.hidden=false;warning.textContent=`Aviso de mantenimiento: la aplicación es v${appVersion} y esta ayuda está documentada hasta v${data.helpVersion}. Revise si los cambios posteriores afectan a símbolos, relaciones o procedimientos.`}
  }catch(e){
    warning.hidden=false;
    warning.textContent="No ha sido posible comprobar automáticamente la versión de la aplicación. El contenido mostrado corresponde a la versión de ayuda indicada arriba."
  }
}
function init(){
  document.title=`${data.title} · PedigrAPP`;
  $("helpIntro").textContent=data.intro;
  renderQuickStart();renderSymbolGroups();renderRelationships();
  renderBulletSection("layout","Reglas de disposición y layout","Criterios generales que utiliza PedigrAPP para mantener el pedigree legible.",data.layoutRules);
  renderBulletSection("tooltip","Uso del tooltip y edición clínica","Interacción principal con los individuos en la versión actual.",data.tooltip);
  renderBibliography();renderAuthorship();renderChangelog();
  $("helpSearch").addEventListener("input",applySearch);
  syncVersion()
}
init();
})();