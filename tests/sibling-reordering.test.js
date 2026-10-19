'use strict';
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const assert=require('assert').strict;
const src=fs.readFileSync(path.join(__dirname,'../pedigree.js'),'utf8');
const from=src.indexOf('function siblingGroupForVisualReordering(');
const to=src.indexOf('function updateSiblingReorderButton()',from);
assert(from>0 && to>from);
const source=src.slice(from,to);
function scenario(overrides={},relationships=[{type:'parentage',parents:['P1','P2'],children:['A','B','C']}]) {
  const family={people:['P1','P2','A','B','C'].map(uid=>({uid})),relationships,
    layout_overrides:{sibling_visual_order:overrides}};
  const pos=new Map([['P1',{x:250,generation:0}],['P2',{x:350,generation:0}],
    ['A',{x:100,generation:1}],['B',{x:260,generation:1}],['C',{x:420,generation:1}]]);
  const ctx={family,pos,Map,Set,Math,Number,Object,Array};
  ctx.visualSiblingOverrides=()=>family.layout_overrides.sibling_visual_order;
  const vmCtx=vm.createContext(ctx);
  vm.runInContext(source+`\nvar detected=siblingGroupForVisualReordering('A',pos);\nvar allowed=canVisuallyReorderSiblingGroup(detected,pos);\napplySiblingVisualPositions(null,pos);`,vmCtx);
  return {family,pos,detected:[...vmCtx.detected],allowed:vmCtx.allowed};
}
{
  const res=scenario({C:0,A:1,B:2});
  assert.deepEqual(res.detected,['A','B','C']);
  assert.equal(res.allowed,true);
  assert.equal(res.pos.get('C').x,100);
  assert.equal(res.pos.get('A').x,260);
  assert.equal(res.pos.get('B').x,420);
  assert.equal(res.pos.get('A').generation,1);
  assert.equal(res.pos.get('P1').x,250);
}
{
  const res=scenario();
  assert.deepEqual(['A','B','C'].map(uid=>res.pos.get(uid).x),[100,260,420]);
}
{
  const res=scenario({C:0,A:1,B:2},[
    {type:'parentage',parents:['P1','P2'],children:['A','B','C']},
    {type:'twin',members:['A','B'],zygosity:'unknown'}]);
  assert.equal(res.allowed,false);
  assert.equal(res.pos.get('A').x,100);
}
{
  const res=scenario({C:0,A:1,B:2},[
    {type:'parentage',parents:['P1','P2'],children:['A','B','C']},
    {type:'union',people:['C','P1']}]);
  assert.equal(res.allowed,false);
}
console.log('OK: orden visual de fratría, nacimiento separado, gemelos/uniones protegidos');
