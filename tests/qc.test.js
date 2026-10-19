/* Test rápido de QC v1: ejecutar opcionalmente con «node tests/qc.test.js». */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const qc = require('../pedigree-qc.js');
const person = (uid, extra={}) => ({uid,record_type:'person',...extra});
const base = () => ({indication:'Test QC',people:[person('A'),person('B'),person('C')],conditions:[],relationships:[]});
const descent = (parents,children) => ({type:'parentage',parents,children,descent_type:'biological'});
function expectCode(data, code, severity) {
  const found = qc.analyze(data).issues.some(issue=>issue.code===code && issue.severity===severity);
  assert(found, `Esperada ${severity}: ${code}`);
}
let test=base();
test.people[0].proband=true;test.people[0].affected=true;test.people[0].age=42;
assert.deepEqual(qc.analyze(test).counts,{error:0,warning:0,info:0});
const pristine=JSON.stringify(test);qc.analyze(test);assert.equal(JSON.stringify(test),pristine);
test=base();test.relationships=[descent(['A'],['A'])];expectCode(test,'SELF_PARENT','error');
test=base();test.relationships=[descent(['A'],['B']),descent(['B'],['C']),descent(['C'],['A'])];expectCode(test,'BIO_CYCLE','error');
test=base();test.relationships=[{type:'union',people:['A','B']},{type:'union',people:['B','A']}];expectCode(test,'DUP_UNION','warning');
test=base();test.relationships=[{type:'union',people:['A','A']}];expectCode(test,'UNION_MEMBERS','error');
test=base();test.relationships=[descent(['A'],['NONEXISTENT'])];expectCode(test,'MISSING_REF','error');
test=base();test.relationships=[{type:'twin',members:['A','B','C'],zygosity:'unknown'}];expectCode(test,'TWIN_CARDINALITY','error');
test=base();test.relationships=[descent(['A','B'],['C']),descent(['A'],['C'])];expectCode(test,'MULTI_BIO_LINK','warning');
test=base();test.conditions=[{id:'X',name:'A'},{id:'X',name:'B'}];expectCode(test,'COND_DUP_ID','error');
test=base();test.people[0].condition_states=[{condition_id:'missing'}];expectCode(test,'COND_ORPHAN','error');
test=base();test.people[0].proband=true;expectCode(test,'PROBAND_STATUS','warning');
test=base();test.people.push(person('G',{record_type:'gestational_carrier',gestation_target:'C'}));expectCode(test,'G_TARGET_TYPE','error');
test=base();test.people.push(person('G',{record_type:'gestational_carrier',gestation_target:'F'}),person('F',{record_type:'fetus',gestational_age_weeks:16}));assert.equal(qc.analyze(test).counts.error,0);
test.people.push(person('D',{record_type:'ovum_donor',surrogate:true,donation_target:'F'}));expectCode(test,'MULTIPLE_CARRIERS','error');
test=base();test.people.push(person('D',{record_type:'ovum_donor',surrogate:true,donation_target:'F'}),person('F',{record_type:'fetus',gestational_age_weeks:16}));assert.equal(qc.analyze(test).counts.error,0);
test=base();test.relationships=[descent(['A'],['B'])];assert(qc.analyze(test,{positions:new Map([['A',{x:20,y:40}],['B',{x:20,y:40}]])}).issues.some(x=>x.code==='LAYOUT_GENERATION'));
test=base();test.relationships=[{type:'sibling',members:['A','B']}];test.people[0].birth_order=1;test.people[1].birth_order=2;assert(qc.analyze(test,{positions:new Map([['A',{x:100,y:20}],['B',{x:20,y:20}]])}).issues.some(x=>x.code==='SIBLING_BIRTH_ORDER'));
const fixtures = path.join(__dirname,'../examples');
const files=fs.readdirSync(fixtures).filter(f=>f.endsWith('.json'));
for(const file of files) {
  const data=JSON.parse(fs.readFileSync(path.join(fixtures,file),'utf8'));
  const report=qc.analyze(data);
  assert.equal(report.counts.error,0,`${file}: ${report.issues.map(x=>x.code).join(', ')}`);
}
console.log(`QC v2: pruebas de incidencias + ${files.length} ejemplos JSON superados.`);
