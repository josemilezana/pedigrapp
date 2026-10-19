'use strict';
const assert = require('node:assert/strict');
const qc = require('../pedigree-qc.js');
const model = () => ({schema_version:'4.13',family_id:'T30',conditions:[],relationships:[{type:'union',people:['P1','P2']}],people:[
 {uid:'P1',record_type:'person'},
 {uid:'P2',record_type:'person'},
 {uid:'P3',record_type:'ovum_donor',donation_target:'P6'},
 {uid:'P4',record_type:'sperm_donor',donation_targets:['P6']},
 {uid:'P5',record_type:'gestational_carrier',gestation_target:'P6'},
 {uid:'P6',record_type:'fetus',gestational_age_weeks:8,intended_parent_uids:['P1','P2']}
]});
const codes = d => qc.analyze(d).issues.map(i=>i.code);
let data=model();
assert(!codes(data).includes('ART_INTENDED_BIOLOGICAL_LINE'));
data.relationships.push({type:'parentage',parents:['P2'],children:['P6'],descent_type:'biological'});
const issue=qc.analyze(data).issues.find(i=>i.code==='ART_INTENDED_BIOLOGICAL_LINE');
assert(issue && issue.severity === 'warning');
assert(issue.uids.includes('P2'));
data.relationships[1].descent_type='adoptive';
assert(!codes(data).includes('ART_INTENDED_BIOLOGICAL_LINE'));
data.people.find(p=>p.uid==='P6').intended_parent_uids=['P1','MISSING'];
assert(codes(data).includes('ART_INTENDED_REF'));
console.log('QC T30: relación intencional sin errores, filiación biológica conflictiva detectada');
