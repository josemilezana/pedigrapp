'use strict';
const assert = require('node:assert/strict');
const qc = require('../pedigree-qc.js');
const family = {
  indication:'Prueba de etiquetado',
  people:[
    {uid:'P22',record_type:'person',label:'Carmen',proband:true,affected:true,
     condition_states:[{condition_id:'C1',status:'affected',zygosity:'heterozygous'}]},
    {uid:'P24',record_type:'person',label:'Luis'}
  ],
  relationships:[{type:'union',people:['P22','P24']},{type:'union',people:['P24','P22']}],
  conditions:[{id:'C1',name:'HCM',inheritance:'autosomal_dominant'}]
};
function find(result, code) {
  const issue=result.issues.find(i=>i.code===code);
  assert(issue, `Falta incidencia ${code}`);
  return issue.detail;
}
const labels = new Map([['P22','II-3 - Carmen'],['P24','II-4 - Luis']]);
let result=qc.analyze(family,{displayLabels:labels});
assert(find(result,'CLIN_ZYGOSITY_NO_VARIANT').startsWith('II-3 - Carmen'));
assert(!find(result,'CLIN_ZYGOSITY_NO_VARIANT').includes('P22'));
assert(find(result,'DUP_UNION').includes('II-3 - Carmen'));
assert(find(result,'DUP_UNION').includes('II-4 - Luis'));
labels.set('P22','III-1 - Carmen');
result=qc.analyze(family,{displayLabels:labels});
assert(find(result,'CLIN_ZYGOSITY_NO_VARIANT').startsWith('III-1 - Carmen'));
// La API sigue siendo utilizable fuera de la interfaz, sin un mapa de labels.
assert(find(qc.analyze(family),'CLIN_ZYGOSITY_NO_VARIANT').includes('P22'));
console.log('Etiquetas de QC dinámicas, multirregistro y modo sin layout: superados.');
