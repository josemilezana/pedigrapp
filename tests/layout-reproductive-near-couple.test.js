// Regression tests for the 0.8.68 ART support placement phase.
// Pure layout harness: avoids DOM/browser dependencies and uses the functions
// extracted directly from the production source (no duplicated algorithm).
const fs=require('fs');
const vm=require('vm');
const assert=require('assert');
const src=fs.readFileSync(require('path').join(__dirname,'..','pedigree.js'),'utf8');
const start=src.indexOf('function reproductiveRecipientUidsForTarget(');
const end=src.indexOf('function normalizeLayoutBounds(pos) {',start);
assert(start>=0 && end>start);
const portion=src.slice(start,end);
const C={coupleGap:105};

function runTest(people,relationships,geometry) {
  const family={people, relationships};
  const pos=new Map(Object.entries(geometry).map(([uid,x])=>[
    uid,{x,generation:people.find(p=>p.uid===uid).generation||0,y:80+(people.find(p=>p.uid===uid).generation||0)*200}
  ]));
  const personByUid=uid=>family.people.find(p=>p.uid===uid)||null;
  const recordType=p=>p.record_type||'person';
  const isDonorRecord=p=>!!p&&['sperm_donor','ovum_donor'].includes(recordType(p));
  const isPregnancyCarrierRecord=p=>!!p&&(recordType(p)==='gestational_carrier'||(recordType(p)==='ovum_donor'&&p.surrogate===true));
  const intendedParentUids=p=>p.intended_parent_uids||[];
  const donationTargetUids=p=>[...(p.donation_targets||[]),...(p.donation_target?[p.donation_target]:[])];
  const pregnancyCarrierTargetUid=p=>recordType(p)==='gestational_carrier'?p.gestation_target:(p.surrogate?p.donation_target:null);
  const parentagesOf=uid=>family.relationships.filter(r=>r.type==='parentage'&&(r.children||[]).includes(uid));
  const alignGestationTargetsUnderCarriers=(pos)=>family.people.filter(isPregnancyCarrierRecord).forEach(carrier=>{
    const target=pregnancyCarrierTargetUid(carrier);
    if(pos.has(target))pos.get(target).x=pos.get(carrier.uid).x;
  });
  const context={Map,Set,Math,Array,C,family,pos,personByUid,recordType,isDonorRecord,isPregnancyCarrierRecord,intendedParentUids,donationTargetUids,pregnancyCarrierTargetUid,parentagesOf,alignGestationTargetsUnderCarriers};
  vm.runInNewContext(portion+'\nplaceReproductiveSupportNearRecipients(new Map(),pos);',context);
  return Object.fromEntries([...pos.entries()].map(([uid,p])=>[uid,p.x]));
}

// T-FAM001: sibling II-4 is the obstacle, not a reason to place D after it.
{
 const people=[
  {uid:'S1',record_type:'person',generation:1},{uid:'P',record_type:'person',generation:1},
  {uid:'M',record_type:'person',generation:1},{uid:'S2',record_type:'person',generation:1},
  {uid:'D',record_type:'sperm_donor',generation:1,donation_target:'F'},
  {uid:'F',record_type:'fetus',generation:2}
 ];
 const rel=[
  {type:'union',people:['P','M']},
  {type:'parentage',parents:['P','M'],children:['F']}
 ];
 const res=runTest(people,rel,{S1:184,P:345,M:450,S2:610,D:746,F:397.5});
 assert(Math.abs(res.D-555)<0.001,'Donor must be right beside M');
 assert(res.S2>res.D+85,'Sibling must be gently shifted to the right');
 assert(res.S1===184 && res.P===345 && res.M===450,'Recipient couple must not move');
}

// T30: double donation + gestational carrier + intended parents, no biological parentage.
{
 const people=[
  {uid:'P1',record_type:'person'}, {uid:'P2',record_type:'person'},
  {uid:'D1',record_type:'ovum_donor',donation_target:'F'},
  {uid:'D2',record_type:'sperm_donor',donation_target:'F'},
  {uid:'G',record_type:'gestational_carrier',gestation_target:'F'},
  {uid:'F',record_type:'fetus',generation:1,intended_parent_uids:['P1','P2']}
 ];
 const rel=[{type:'union',people:['P1','P2']}];
 const res=runTest(people,rel,{P1:200,P2:305,D1:810,D2:920,G:1030,F:900});
 const ordered=[res.D1,res.D2,res.G];
 assert(ordered.every((x,i)=>i===0||Math.abs(x-ordered[i-1])===105));
 assert(Math.min(...ordered)>res.P2 || Math.max(...ordered)<res.P1);
 assert(res.F===res.G,'Fetus must stay under G');
}

// Sibling obstacle vs free side: place D to the free left of the couple.
{
 const people=[
  {uid:'M',record_type:'person'}, {uid:'P',record_type:'person'},
  {uid:'S',record_type:'person'}, {uid:'D',record_type:'ovum_donor',donation_target:'F'},
  {uid:'F',record_type:'fetus',generation:1}
 ];
 const rel=[{type:'union',people:['M','P']},{type:'parentage',parents:['M','P'],children:['F']}];
 const res=runTest(people,rel,{M:300,P:405,S:490,D:900,F:350});
 assert(res.D===195 && res.S===490);
}

// Surrogate: egg donor who also carries the pregnancy is a single D, not G.
{
 const people=[
  {uid:'P1',record_type:'person'}, {uid:'P2',record_type:'person'},
  {uid:'S1',record_type:'person'},
  {uid:'S',record_type:'ovum_donor',surrogate:true,donation_target:'F'},
  {uid:'F',record_type:'fetus',generation:1,intended_parent_uids:['P1','P2']}
 ];
 const res=runTest(people,[{type:'union',people:['P1','P2']}],
   {P1:250,P2:355,S1:515,S:900,F:900});
 assert([145,460].includes(res.S),'Surrogate must be adjacent to recipients');
 assert(Math.abs(res.S1-res.S)>85,'Neighbor must have enough room');
 assert(res.F===res.S,'Pregnancy must remain under surrogate');
}

// No known recipient: never infer an unrelated parentage or relocate randomly.
{
 const people=[
  {uid:'D',record_type:'sperm_donor',donation_target:'F'},
  {uid:'F',record_type:'fetus',generation:1}
 ];
 const res=runTest(people,[],{D:700,F:300});
 assert(res.D===700);
}

console.log('OK: FAM001 / T30 double donation G / free side / surrogate / unknown recipients');
