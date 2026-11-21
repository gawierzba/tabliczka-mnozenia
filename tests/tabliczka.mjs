/**
 * Leśna księga tabliczki mnożenia — testy bez zależności.
 * Uruchom: node --test tests/tabliczka.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const root=new URL("../",import.meta.url);
const script=readFileSync(new URL("tabliczka.js",root),"utf8");
const html=readFileSync(new URL("tabliczka.html",root),"utf8");
const core=script.replace("  init();\n})();","  return {state,validNumber,blockStart,shownNumbers,createFullCsv,exampleExplanation};\n})();");
function engine(){
  return new Function("document","return ("+core.trim().replace(/;$/,"")+")")({getElementById:()=>null});
}
test("Poprawna składnia JavaScript i wszystkie elementy tabliczki obecne w HTML",()=>{
  assert.doesNotThrow(()=>new Function(script));
  const ids=new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]));
  const targets=new Set([...script.matchAll(/\$\("([^"]+)"\)/g)].map(x=>x[1]));
  for(const id of targets)assert.ok(ids.has(id),"Brak elementu #"+id);
});
test("Widoki 1–10 i 1–20 obejmują wszystkie wiersze i kolumny",()=>{
  const g=engine();
  for(const limit of [10,20]) {
    g.state.mode=limit;
    for(const axis of ["row","col"]) {
      const values=g.shownNumbers(axis);
      assert.equal(values.length,limit);
      assert.equal(values[0],1);
      assert.equal(values.at(-1),limit);
    }
  }
});
test("100 bloków 10×10 pokrywa wszystkie kombinacje 1..100 bez powtórzeń",()=>{
  const g=engine();g.state.mode=100;
  const pairs=new Set();
  for(let aBlock=0;aBlock<10;aBlock++){
    for(let bBlock=0;bBlock<10;bBlock++){
      g.state.rowBlock=aBlock;g.state.colBlock=bBlock;
      const rows=g.shownNumbers("row"),cols=g.shownNumbers("col");
      assert.equal(rows.length,10);assert.equal(cols.length,10);
      for(const a of rows)for(const b of cols){
        assert.ok(a>=1&&a<=100&&b>=1&&b<=100);
        pairs.add(a+"x"+b);
      }
    }
  }
  assert.equal(pairs.size,10000);
  assert.ok(pairs.has("1x1"));
  assert.ok(pairs.has("100x100"));
  assert.ok(pairs.has("58x93"));
});
test("Eksport CSV zawiera 101×101 komórek, poprawne krańce i 10000 wyników",()=>{
  const csv=engine().createFullCsv();
  assert.ok(csv.startsWith("\uFEFF"));
  const rows=csv.slice(1).split("\r\n");
  assert.equal(rows.length,101);
  for(const row of rows)assert.equal(row.split(";").length,101);
  const unquote=line=>line.split(";").map(cell=>cell.slice(1,-1));
  const header=unquote(rows[0]);
  assert.equal(header[0],"×");assert.equal(header[1],"1");assert.equal(header[100],"100");
  const first=unquote(rows[1]),last=unquote(rows[100]);
  assert.equal(first[0],"1");assert.equal(first[100],"100");
  assert.equal(last[0],"100");assert.equal(last[100],"10000");
  assert.equal(unquote(rows[7])[8],"56");
});
test("Wyszukiwarka akceptuje tylko całkowite liczby 1–100",()=>{
  const {validNumber}=engine();
  for(const n of [1,10,34,100])assert.equal(validNumber(String(n)),n);
  for(const bad of ["",0,-1,101,"5.5","abc",Infinity])assert.equal(validNumber(bad),null);
});
