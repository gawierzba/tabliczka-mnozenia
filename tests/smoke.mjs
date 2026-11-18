/**
 * Testy podstawowe Leśnej Przygody.
 * Uruchamianie: node --test tests/smoke.mjs
 * Bez bibliotek, przeglądarki ani połączenia z siecią.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const read = name => readFileSync(new URL(name,root),"utf8");
const app = read("app.js");
const html = read("index.html");

function engine() {
  const elements = new Map();
  const get = id => {
    if(!elements.has(id))elements.set(id,{
      id,hidden:false,value:"",textContent:"",dataset:{},style:{},children:[],
      focus(){},replaceChildren(){this.children=[]},append(...children){this.children.push(...children)},
      remove(){},setAttribute(){},removeAttribute(){},addEventListener(){},
      classList:{add(){},remove(){},toggle(){}}
    });
    return elements.get(id);
  };
  const document = {
    getElementById:get,
    querySelector:()=>get("query"),
    querySelectorAll:()=>[],
    createElement:()=>get("created")
  };
  const window = {scrollTo(){},matchMedia(){return {matches:false}}};
  const values=new Map();
  const storage={getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value)};
  const source=app.replace("  init();\n})();","  return {defaultState,validateData,caps,makeQuestions,startLevel,checkAnswer,advanceQuestion,getState:()=>data,getGame:()=>game};\n})();")
    .replace(/^\/\*[\s\S]*?\*\//,"").trim().replace(/;$/,"");
  assert.notEqual(source,app.replace(/^\/\*[\s\S]*?\*\//,"").trim().replace(/;$/,""),"Brak wyodrębnionego silnika testowego.");
  const create = new Function("document","window","localStorage","requestAnimationFrame","navigator","return ("+source+");");
  return {game:create(document,window,storage,()=>{}, {userAgent:"Android",hardwareConcurrency:4}),get,values};
}
function playRound(engine,number,shared=false) {
  engine.game.startLevel(number,shared);
  for(let i=0;i<8;i++) {
    const q=engine.game.getGame().questions[engine.game.getGame().index];
    engine.get("answer-field").value=String(q.a*q.b);
    engine.game.checkAnswer();
    engine.game.advanceQuestion();
  }
}
test("Składnia JavaScript jest prawidłowa",()=>{
  assert.doesNotThrow(()=>new Function(app));
});
test("Wszystkie identyfikatory elementów interfejsu istnieją w HTML",()=>{
  const ids=new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(match=>match[1]));
  const refs=new Set([...app.matchAll(/\$\("([^"]+)"\)/g)].map(match=>match[1]));
  for(const ref of refs)assert.ok(ids.has(ref),"Brak elementu #"+ref);
});
test("Losowanie 1000 rund nie wykracza poza zadany zakres i nie powtarza działań",()=>{
  const {game:g}=engine();
  for(let level=1;level<=100;level++) {
    for(let run=0;run<10;run++) {
      const questions=g.makeQuestions(level),bounds=g.caps(level);
      assert.equal(questions.length,8);
      assert.equal(new Set(questions.map(q=>q.a+"x"+q.b)).size,8);
      for(const q of questions) {
        assert.ok(q.a>=1&&q.a<=bounds.a&&q.b>=1&&q.b<=bounds.b);
        if(bounds.lockedA)assert.equal(q.a,level);
      }
    }
  }
});
test("Zwykła gra daje punkty, gwiazdki i odblokowuje następny etap",()=>{
  const e=engine();e.game.getState().lowMotion=true;
  playRound(e,1,false);
  assert.equal(e.game.getState().score,80);
  assert.equal(e.game.getState().correct,8);
  assert.equal(e.game.getState().unlocked,2);
  assert.equal(e.game.getState().completed[1],3);
  assert.ok(e.values.has("lesna-przygoda-progress-v1"));
});
test("Tryb klasowy nie narusza wyniku pojedynczego ucznia",()=>{
  const e=engine();e.game.getState().lowMotion=true;
  playRound(e,7,true);
  assert.equal(e.game.getState().score,0);
  assert.equal(e.game.getState().correct,0);
  assert.equal(e.game.getState().wrong,0);
  assert.equal(e.game.getState().unlocked,1);
  assert.deepEqual(e.game.getState().completed,{});
});
test("Import ogranicza wartości i odrzuca nieprawidłowy format",()=>{
  const {game:g}=engine();
  const value=g.validateData({...g.defaultState(),nickname:"<script>x</script>",unlocked:999,mistakes:{"7x8":3,"bad key":4}});
  assert.equal(value.unlocked,100);
  assert.equal(value.nickname.includes("<"),false);
  assert.equal(value.mistakes["7x8"],3);
  assert.equal(value.mistakes["bad key"],undefined);
  assert.throws(()=>g.validateData({version:7}),/Nieobsługiwany/);
});
