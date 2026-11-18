/* Leśna Przygoda · autorska gra edukacyjna, bez serwera */
(() => {
  "use strict";

  const STORAGE_KEY = "lesna-przygoda-progress-v1";
  const QUESTIONS_PER_ROUND = 8;
  const ZONES = [
    {icon:"🌱",name:"Polanka pierwszych kroków",desc:"Mnożenie przez 1–10, każda tabliczka osobno."},
    {icon:"🍄",name:"Grzybowa ścieżka",desc:"Mieszane działania od 1 × 1 do 10 × 10."},
    {icon:"🐿️",name:"Tajemnice wiewiórki",desc:"Utrwalamy małą tabliczkę mnożenia."},
    {icon:"🌻",name:"Łąka motyli",desc:"Pierwsze większe liczby — do 12 × 12."},
    {icon:"🌉",name:"Most nad strumykiem",desc:"Nowe wyzwania — do 15 × 15."},
    {icon:"🦊",name:"Leśna biblioteka",desc:"Ćwiczenia z liczbami do 20 × 20."},
    {icon:"🌙",name:"Świetliki nocą",desc:"Coraz większe wyniki — do 30 × 30."},
    {icon:"⛰️",name:"Góra stu ścieżek",desc:"Wkraczamy do świata liczb do 50 × 50."},
    {icon:"🏰",name:"Wieża mądrości",desc:"Wielka wyprawa — do 75 × 75."},
    {icon:"✨",name:"Kraina wielkich odkryć",desc:"Ostatnia przygoda — aż do 100 × 100."}
  ];
  const $ = (id) => document.getElementById(id);
  const defaultState = () => ({
    version: 1, nickname: "Leśny Odkrywca", score: 0,
    correct: 0, wrong: 0, unlocked: 1, completed: {},
    mistakes: {}, records: {}, history: [], lowMotion: false
  });
  let data = loadData();
  let game = null;
  let toastTimeout = null;
  let savingWarningShown = false;

  function integer(value, min = 0, max = 999999999) {
    const n = Number(value);
    return Number.isFinite(n) ? Math.max(min, Math.min(max, Math.floor(n))) : min;
  }
  function cleanNickname(s) {
    return typeof s === "string" ? s.replace(/[<>&"'\\\u0000-\u001f]/g, "").trim().slice(0,24) || "Leśny Odkrywca" : "Leśny Odkrywca";
  }
  function loadData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      return validateData(parsed);
    } catch (error) {
      console.warn("Nie udało się odczytać lokalnego zapisu.", error);
      return defaultState();
    }
  }
  function validateData(input) {
    if (!input || typeof input !== "object" || Array.isArray(input) || input.version !== 1) throw Error("Nieobsługiwany format zapisu.");
    const v = defaultState();
    v.nickname = cleanNickname(input.nickname);
    v.score = integer(input.score,0,100000000);
    v.correct = integer(input.correct,0,1000000);
    v.wrong = integer(input.wrong,0,1000000);
    v.unlocked = integer(input.unlocked,1,100);
    v.lowMotion = input.lowMotion === true;
    if (input.completed && typeof input.completed === "object" && !Array.isArray(input.completed)) {
      for (const [key, stars] of Object.entries(input.completed).slice(0,100)) {
        const level = Number(key);
        if (Number.isInteger(level) && level >= 1 && level <= 100) v.completed[level] = integer(stars,1,3);
      }
    }
    if (input.mistakes && typeof input.mistakes === "object" && !Array.isArray(input.mistakes)) {
      for (const [key, count] of Object.entries(input.mistakes).slice(0,400)) {
        if (/^(100|[1-9]\d?)x(100|[1-9]\d?)$/.test(key)) v.mistakes[key] = integer(count,0,999);
      }
    }
    if (input.records && typeof input.records === "object" && !Array.isArray(input.records)) {
      for (const [key, rec] of Object.entries(input.records).slice(0,100)) {
        const level = Number(key);
        if (!Number.isInteger(level) || level < 1 || level > 100 || !rec || typeof rec !== "object") continue;
        v.records[level] = {attempts:integer(rec.attempts,0,10000),bestCorrect:integer(rec.bestCorrect,0,QUESTIONS_PER_ROUND),lastDate:typeof rec.lastDate === "string" ? rec.lastDate.slice(0,24):""};
      }
    }
    if (Array.isArray(input.history)) v.history = input.history.slice(-100).filter(v => v && typeof v === "object").map(h => ({
      level:integer(h.level,1,100),correct:integer(h.correct,0,QUESTIONS_PER_ROUND),
      errors:integer(h.errors,0,100),hints:integer(h.hints,0,QUESTIONS_PER_ROUND),
      date:typeof h.date === "string" ? h.date.slice(0,24):""
    }));
    return v;
  }
  function saveData() {
    try { localStorage.setItem(STORAGE_KEY,JSON.stringify(data)); }
    catch(error) {
      if (!savingWarningShown) {
        savingWarningShown = true;
        notify("Przeglądarka nie pozwala zapisywać postępów. Pobierz plik przygody po zakończeniu.");
      }
    }
  }
  function notify(message) {
    const t = $("toast");
    t.textContent = message;
    t.classList.add("show");
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => t.classList.remove("show"), 3600);
  }
  function motion() {
    document.body.classList.toggle("low-motion",data.lowMotion);
    const button=$("motion-toggle");
    button.setAttribute("aria-pressed",String(data.lowMotion));
    button.textContent = data.lowMotion ? "▶ Włącz animacje" : "◌ Mniej animacji";
  }
  function currentZone(level) {return ZONES[Math.floor((level-1)/10)];}
  function titleFor(level) { return level <= 10 ? "Tabliczka mnożenia przez " + level : "Etap " + level + " — " + currentZone(level).name; }
  function caps(level) {
    if(level<=10) return {a:level,b:10,lockedA:true};
    if(level<=30) return {a:10,b:10,lockedA:false};
    if(level<=40) return {a:12,b:12,lockedA:false};
    if(level<=50) return {a:15,b:15,lockedA:false};
    if(level<=60) return {a:20,b:20,lockedA:false};
    if(level<=70) return {a:30,b:30,lockedA:false};
    if(level<=80) return {a:50,b:50,lockedA:false};
    if(level<=90) return {a:75,b:75,lockedA:false};
    return {a:100,b:100,lockedA:false};
  }
  function rint(a,b) {return a+Math.floor(Math.random()*(b-a+1));}
  function randomQuestion(level, used) {
    const cap=caps(level);
    const reviewed=Object.entries(data.mistakes)
      .map(([key,n]) => { const [a,b]=key.split("x").map(Number);return {a,b,n}; })
      .filter(q => q.n>0 && q.a<=cap.a && q.b<=cap.b && (!cap.lockedA || q.a===level) && !used.has(q.a+"x"+q.b));
    if(reviewed.length && Math.random()<.35) {
      const sampled=reviewed.sort((x,y)=>y.n-x.n).slice(0,10);
      const q=sampled[rint(0,sampled.length-1)];
      return {a:q.a,b:q.b};
    }
    return {a:cap.lockedA?level:rint(1,cap.a),b:rint(1,cap.b)};
  }
  function makeQuestions(level) {
    const list=[],used=new Set();
    let attempts=0;
    while(list.length<QUESTIONS_PER_ROUND && attempts++<1500) {
      const q=randomQuestion(level,used), key=q.a+"x"+q.b;
      if(used.has(key))continue;
      used.add(key);list.push(q);
    }
    return list;
  }
  function nav(view) {
    const valid=["home","map","play","teacher"];
    if(!valid.includes(view))return;
    for(const name of valid) {
      const el=$("view-"+name);
      if(el) {el.hidden=name!==view;el.classList.toggle("active",name===view);}
    }
    for(const btn of document.querySelectorAll("[data-nav]")) {
      const active=btn.dataset.nav===view || (view==="play"&&btn.dataset.nav===(game&&game.classMode?"teacher":"map"));
      btn.classList.toggle("active",active);
      if(active)btn.setAttribute("aria-current","page");else btn.removeAttribute("aria-current");
    }
    if(view==="home") updateHome();
    if(view==="map") drawMap();
    if(view==="teacher") updateTeacher();
    window.scrollTo({top:0,behavior:data.lowMotion?"instant":"smooth"});
    if(view==="play") setTimeout(()=>$("answer-field").focus({preventScroll:true}),90);
  }
  function updateHome() {
    $("player-name").value=data.nickname;
    $("header-points").textContent=data.score.toLocaleString("pl-PL");
    $("stat-level").textContent=data.unlocked;
    $("stat-stars").textContent=Object.values(data.completed).reduce((a,b)=>a+b,0);
    const all=data.correct+data.wrong;
    $("stat-accuracy").textContent=all?Math.round(data.correct/all*100)+"%":"—";
    $("next-level-name").textContent=titleFor(data.unlocked);
    $("next-level-desc").textContent=currentZone(data.unlocked).desc;
    $("home-track").style.width=(data.unlocked-1)+"%";
  }
  function drawMap() {
    const box=$("zones");
    box.replaceChildren();
    ZONES.forEach((zone,i) => {
      const section=document.createElement("section");section.className="zone";
      const heading=document.createElement("div");heading.className="zone-head";
      const icon=document.createElement("span");icon.className="zone-icon";icon.textContent=zone.icon;
      const copy=document.createElement("div");
      const title=document.createElement("h2");title.textContent=zone.name;
      const desc=document.createElement("p");desc.textContent=zone.desc;
      copy.append(title,desc);heading.append(icon,copy);
      const levels=document.createElement("div");levels.className="zone-grid";
      for(let j=1;j<=10;j++) {
        const level=i*10+j;
        const done=!!data.completed[level],allowed=level<=data.unlocked;
        const button=document.createElement("button");
        button.type="button";button.className="level-btn "+(done?"complete":allowed?"current":"locked");
        const num=document.createElement("strong");num.textContent=String(level);
        const small=document.createElement("small");small.textContent=done?"✦".repeat(data.completed[level]):allowed?"Graj":"🔒";
        button.append(num,small);
        button.disabled=!allowed;button.setAttribute("aria-label",titleFor(level)+(done?", ukończono":allowed?", dostępny":", zablokowany"));
        button.addEventListener("click",()=>startLevel(level));
        levels.append(button);
      }
      section.append(heading,levels);box.append(section);
    });
  }
  function startLevel(level,classMode=false) {
    if((!classMode && level>data.unlocked) || level<1 || level>100) return;
    game={level,classMode,questions:makeQuestions(level),index:0,roundCorrect:0,roundErrors:0,hints:0,wrongThisQuestion:false,hintedThisQuestion:false,awaitNext:false};
    $("round-end").hidden=true;
    $("answer-field").hidden=false;
    $("check-answer").hidden=false;
    $("hint-button").hidden=false;
    $("number-keyboard").hidden=false;
    $("game-zone").textContent=classMode?"WSPÓLNA LEKCJA":currentZone(level).name.toLocaleUpperCase("pl-PL");
    $("game-level").textContent=classMode?"Mnożenie przez "+level:"Etap "+level;
    $("back-to-map").textContent=classMode?"← Do nauczyciela":"← Wróć do mapy";
    $("game-score-value").textContent=classMode?"lekcja":data.score.toLocaleString("pl-PL");
    drawQuestion();nav("play");
  }
  function drawQuestion() {
    if(!game)return;
    const q=game.questions[game.index];
    game.wrongThisQuestion=false;game.hintedThisQuestion=false;game.awaitNext=false;
    $("factor-a").textContent=q.a;
    $("factor-b").textContent=q.b;
    $("answer-field").value="";
    $("answer-field").classList.remove("good","bad");
    $("hint-box").hidden=true;
    $("hint-box").textContent="";
    $("feedback").textContent="Możesz liczyć na palcach, kartce albo w pamięci.";
    $("feedback").className="feedback";
    $("exercise-count").textContent="Zadanie "+(game.index+1)+" z "+QUESTIONS_PER_ROUND;
    $("exercise-bar").style.width=(game.index/QUESTIONS_PER_ROUND*100)+"%";
    $("check-answer").textContent="Sprawdź ✓";
    $("hint-button").disabled=false;
    $("answer-field").focus({preventScroll:true});
  }
  function feedback(text,ok) {
    $("feedback").textContent=text;
    $("feedback").className="feedback "+(ok?"good":"bad");
  }
  function checkAnswer() {
    if(!game)return;
    if(game.awaitNext) {advanceQuestion();return;}
    const raw=$("answer-field").value.trim();
    if(!/^\d{1,5}$/.test(raw)){feedback("Wpisz wynik za pomocą cyfr.",false);return;}
    const q=game.questions[game.index],key=q.a+"x"+q.b;
    if(Number(raw)===q.a*q.b) {
      const points=game.wrongThisQuestion?5:game.hintedThisQuestion?7:10;
      game.roundCorrect++;
      if(!game.classMode){
        data.score+=points;data.correct++;
        data.mistakes[key]=Math.max(0,(data.mistakes[key]||0)-1);
        saveData();
        $("game-score-value").textContent=data.score.toLocaleString("pl-PL");
        $("header-points").textContent=data.score.toLocaleString("pl-PL");
      }
      game.awaitNext=true;
      $("check-answer").textContent=game.index===QUESTIONS_PER_ROUND-1?"Zakończ etap →":"Następne działanie →";
      $("hint-button").disabled=true;
      feedback(["Brawo! Kolejna iskierka w Twojej kolekcji! ✨","Świetnie! Leśni przyjaciele są dumni! 🌿","Wspaniale! Idzie Ci coraz lepiej! ⭐"][rint(0,2)],true);
      if(!data.lowMotion) sparkle(10);
    }else{
      game.wrongThisQuestion=true;game.roundErrors++;
      if(!game.classMode){
        data.wrong++;
        data.mistakes[key]=integer((data.mistakes[key]||0)+1,0,999);
        saveData();
      }
      $("answer-field").value="";
      feedback("Jeszcze nie tym razem. Spróbuj spokojnie raz jeszcze. 🌼",false);
      $("answer-field").focus({preventScroll:true});
    }
  }
  function advanceQuestion() {
    game.index++;
    if(game.index>=game.questions.length) finishRound();
    else drawQuestion();
  }
  function showHint() {
    if(!game||game.awaitNext)return;
    const q=game.questions[game.index];
    if(!game.hintedThisQuestion){game.hintedThisQuestion=true;game.hints++;}
    const m=Math.min(q.a,q.b),n=Math.max(q.a,q.b);
    let message;
    if(m<=5 && n<=10) {
      message="Wyobraź sobie "+m+" grup po "+n+" przedmiotów. Możesz dodać "+Array(m).fill(n).join(" + ")+".";
    }else if(m<=10) {
      message="Rozbij "+n+" na "+(n-1)+" i 1: "+m+" × "+n+" = "+m+" × "+(n-1)+" + "+m+".";
    }else{
      const tens=Math.floor(n/10)*10,ones=n-tens;
      message="Rozbij większą liczbę: "+m+" × "+n+" = "+m+" × "+tens+(ones?" + "+m+" × "+ones:"")+". Oblicz części i dodaj.";
    }
    $("hint-box").textContent=message;
    $("hint-box").hidden=false;
  }
  function finishRound() {
    if(!game)return;
    const level=game.level;
    let summary="";
    if(game.classMode){
      summary="Wspólnie rozwiązaliście "+QUESTIONS_PER_ROUND+" działań. Brawo, klaso! Możecie rozegrać kolejną rundę lub wrócić do panelu nauczyciela.";
      $("next-round").textContent="Jeszcze jedna runda ↻";
    }else{
      const stars=game.roundErrors===0&&game.hints===0?3:game.roundErrors<=2?2:1;
      data.completed[level]=Math.max(data.completed[level]||0,stars);
      if(level>=data.unlocked&&level<100)data.unlocked=level+1;
      if(!data.records[level])data.records[level]={attempts:0,bestCorrect:0,lastDate:""};
      const r=data.records[level];r.attempts++;r.bestCorrect=Math.max(r.bestCorrect,game.roundCorrect);r.lastDate=new Date().toISOString();
      data.history.push({level,correct:game.roundCorrect,errors:game.roundErrors,hints:game.hints,date:new Date().toISOString()});
      data.history=data.history.slice(-100);
      saveData();
      summary="Zdobywasz "+stars+" "+(stars===1?"gwiazdkę":"gwiazdki")+"! Ukończono "+QUESTIONS_PER_ROUND+" działań. "+(level<100?"Nowy etap czeka na mapie.":"Wspaniale! Odkryto wszystkie 100 etapów.");
      $("next-round").textContent=level<100?"Następny etap →":"Zagraj ponownie ↻";
      updateHome();
      notify("Etap "+level+" ukończony! "+stars+" ★");
    }
    $("exercise-bar").style.width="100%";
    $("round-summary").textContent=summary;
    $("round-end").hidden=false;
    $("answer-field").hidden=true;$("check-answer").hidden=true;$("hint-button").hidden=true;$("number-keyboard").hidden=true;
    if(!data.lowMotion)sparkle(45);
  }
  function sparkle(n=22) {
    const layer=$("confetti");layer.replaceChildren();
    const colors=["#e7b75f","#e78d71","#a5c797","#f6e9bd","#80c5b7"];
    for(let i=0;i<n;i++){
      const b=document.createElement("span");b.className="confetti-bit";
      b.style.left=rint(0,100)+"%";b.style.background=colors[i%colors.length];
      b.style.animationDelay=(Math.random()*.6)+"s";b.style.animationDuration=(2+Math.random()*1.8)+"s";
      layer.append(b);
    }
    setTimeout(()=>layer.replaceChildren(),4700);
  }
  function exportData() {
    saveData();
    const file={format:"lesna-przygoda-save",exportedAt:new Date().toISOString(),data};
    download("lesna-przygoda-zapis.json",JSON.stringify(file,null,2),"application/json;charset=utf-8");
    notify("Pobrano zapis przygody. Zachowaj plik w bezpiecznym miejscu.");
  }
  function download(filename,contents,mime) {
    const blob=new Blob([contents],{type:mime});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),3000);
  }
  function importClick() {$("import-file").value="";$("import-file").click();}
  async function importData(event) {
    const file=event.target.files&&event.target.files[0];
    if(!file)return;
    if(file.size>300000){notify("Plik jest zbyt duży. Wybierz zapis naszej gry.");return;}
    try{
      const parsed=JSON.parse(await file.text());
      if(parsed.format!=="lesna-przygoda-save")throw Error("To nie jest plik zapisu Leśnej Przygody.");
      const candidate=validateData(parsed.data);
      if(!window.confirm("Wczytać zapis gracza „"+candidate.nickname+"”? Zastąpi on obecne postępy zapisane w tej przeglądarce."))return;
      data=candidate;saveData();motion();updateHome();nav("home");
      notify("Przygoda wczytana! Możesz kontynuować od etapu "+data.unlocked+".");
    }catch(error){notify("Nie udało się wczytać pliku: "+String(error.message).slice(0,100));}
  }
  function csvCell(s) {
    let text=String(s??"");
    if(/^[\s]*[=+\-@\t\r]/.test(text))text="'"+text;
    return '"'+text.replace(/"/g,'""')+'"';
  }
  function exportReport() {
    const rows=[
      ["Raport Leśna Przygoda — Kraina Mnożenia"],
      ["Pseudonim",data.nickname],
      ["Data raportu",new Date().toLocaleString("pl-PL")],
      ["Najwyższy odblokowany etap",data.unlocked],
      ["Ukończone etapy",Object.keys(data.completed).length],
      ["Punkty",data.score],
      ["Poprawne odpowiedzi",data.correct],
      ["Niepoprawne próby",data.wrong],
      [],
      ["Etap","Liczba gwiazdek","Liczba ukończeń","Ostatnie ukończenie"]
    ];
    for(let i=1;i<=100;i++)if(data.records[i]){
      const r=data.records[i];rows.push([i,data.completed[i]||0,r.attempts,r.lastDate]);
    }
    rows.push([],["Działanie","Liczba pomyłek (po powtórkach)"]);
    Object.entries(data.mistakes).filter(([,n])=>n>0).sort((a,b)=>b[1]-a[1]).forEach(([key,n])=>rows.push([key.replace("x"," × "),n]));
    const csv="\uFEFF"+rows.map(row=>row.map(csvCell).join(";")).join("\r\n");
    download("raport-lesna-przygoda.csv",csv,"text/csv;charset=utf-8");
    notify("Pobrano raport CSV. Udostępniaj go tylko upoważnionym osobom.");
  }
  function updateTeacher() {
    const completed=Object.keys(data.completed).length, all=data.correct+data.wrong;
    const stats=[
      ["Ukończone etapy",completed],["Poprawne odpowiedzi",data.correct],["Skuteczność",all?Math.round(data.correct/all*100)+"%":"—"]
    ];
    $("teacher-stats").replaceChildren();
    stats.forEach(([label,value])=>{
      const el=document.createElement("div"),strong=document.createElement("strong"),small=document.createElement("small");
      strong.textContent=value;small.textContent=label;el.append(strong,small);$("teacher-stats").append(el);
    });
    $("weak-questions").replaceChildren();
    const weak=Object.entries(data.mistakes).filter(([,n])=>n>0).sort((a,b)=>b[1]-a[1]).slice(0,8);
    if(!weak.length){const span=document.createElement("span");span.textContent="Brak zarejestrowanych trudności — tak trzymaj!";$("weak-questions").append(span);}
    weak.forEach(([key,n])=>{
      const span=document.createElement("span");span.textContent=key.replace("x"," × ")+" · "+n+" pomyłek";$("weak-questions").append(span);
    });
  }
  function init() {
    // Nawigacja i start
    document.querySelectorAll("[data-nav]").forEach(b=>b.addEventListener("click",event=>{
      if(b.tagName==="A")event.preventDefault();
      nav(b.dataset.nav);
    }));
    $("start-button").addEventListener("click",()=>startLevel(data.unlocked));
    $("continue-button").addEventListener("click",()=>startLevel(data.unlocked));
    $("quick-play").addEventListener("click",()=>startLevel(data.unlocked));
    $("back-to-map").addEventListener("click",()=>nav(game&&game.classMode?"teacher":"map"));
    $("round-map").addEventListener("click",()=>nav(game&&game.classMode?"teacher":"map"));
    $("next-round").addEventListener("click",()=>startLevel(game.classMode?game.level:Math.min(100,game.level+1),game.classMode));
    $("class-start").addEventListener("click",()=>startLevel(integer($("class-table").value,1,10),true));
    $("save-name").addEventListener("click",()=>{
      data.nickname=cleanNickname($("player-name").value);saveData();updateHome();notify("Zapisano pseudonim: "+data.nickname);
    });
    $("player-name").addEventListener("keydown",e=>{if(e.key==="Enter")$("save-name").click();});
    $("check-answer").addEventListener("click",checkAnswer);
    $("hint-button").addEventListener("click",showHint);
    $("answer-field").addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();checkAnswer();}});
    $("answer-field").addEventListener("input",()=>{
      const el=$("answer-field");
      const safe=el.value.replace(/[^\d]/g,"").slice(0,5);
      if(el.value!==safe)el.value=safe;
    });
    // Duże klawisze wygodne na tabletach
    const keyboard=$("number-keyboard");
    ["1","2","3","4","5","6","7","8","9","⌫","0","✓"].forEach(d=>{
      const b=document.createElement("button");b.type="button";b.className="digit-key";b.textContent=d;
      b.setAttribute("aria-label",d==="⌫"?"Usuń ostatnią cyfrę":d==="✓"?"Sprawdź odpowiedź":"Cyfra "+d);
      b.addEventListener("click",()=>{
        if(d==="✓"){checkAnswer();return;}
        if(!game||game.awaitNext)return;
        const input=$("answer-field");
        input.value=d==="⌫"?input.value.slice(0,-1):(input.value+d).slice(0,5);
        input.focus({preventScroll:true});
      });
      keyboard.append(b);
    });
    for(const id of ["export-progress","export-teacher"])$(id).addEventListener("click",exportData);
    for(const id of ["import-progress","import-teacher"])$(id).addEventListener("click",importClick);
    $("import-file").addEventListener("change",importData);
    $("report-button").addEventListener("click",exportReport);
    $("motion-toggle").addEventListener("click",()=>{
      data.lowMotion=!data.lowMotion;saveData();motion();
      notify(data.lowMotion?"Animacje ograniczone.":"Animacje włączone.");
    });
    motion();updateHome();nav("home");
  }
  init();
})();