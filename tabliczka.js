/* Leśna księga · bez zewnętrznych bibliotek, kont i zapisu danych osobowych */
(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const MODES = [10, 20, 100];
  const BLOCK = 10;
  const state = {
    mode: 10,
    rowBlock: 0,
    colBlock: 0,
    hideResults: false,
    selectedA: 3,
    selectedB: 4,
    selectedRevealed: true
  };

  function validNumber(value) {
    const n = Number(value);
    return Number.isSafeInteger(n) && n >= 1 && n <= 100 ? n : null;
  }
  function blockStart(block) {
    return block * BLOCK + 1;
  }
  function shownNumbers(axis) {
    if (state.mode < 100) return Array.from({length:state.mode},(_,i)=>i+1);
    const block=axis==="row"?state.rowBlock:state.colBlock;
    return Array.from({length:BLOCK},(_,i)=>blockStart(block)+i);
  }
  function isOnBoard(a,b) {
    return shownNumbers("row").includes(a) && shownNumbers("col").includes(b);
  }
  function exampleExplanation(a,b) {
    if (a===1) return "Jeden raz "+b+" to po prostu "+b+".";
    if (b===1) return a+" razy jeden to po prostu "+a+".";
    if (a<=10 && b<=10) return a+" grup po "+b+" elementów daje razem "+(a*b)+".";
    const small=Math.min(a,b),large=Math.max(a,b);
    const tens=Math.floor(large/10)*10;
    const rest=large-tens;
    if(rest===0)return small+" × "+large+" = "+small+" × "+(large/10)+" × 10 = "+(small*(large/10))+" × 10 = "+(small*large)+".";
    return "Możemy rozbić "+large+" na "+tens+" i "+rest+": "+small+" × "+tens+" + "+small+" × "+rest+" = "+(small*tens)+" + "+(small*rest)+" = "+(small*large)+".";
  }
  function addDots(a,b) {
    const host=$("mt-dots");
    host.replaceChildren();
    if(a>10 || b>10 || state.hideResults && !state.selectedRevealed){
      host.hidden=true;
      return;
    }
    host.hidden=false;
    for(let i=0;i<a;i++){
      const group=document.createElement("span");
      group.className="mt-dot-group";
      group.setAttribute("aria-hidden","true");
      for(let j=0;j<b;j++) {
        const dot=document.createElement("span");
        dot.className="mt-dot";
        group.append(dot);
      }
      host.append(group);
    }
    host.setAttribute("aria-label",a+" grup po "+b+" kropek, razem "+(a*b));
  }
  function details() {
    const {selectedA:a,selectedB:b,hideResults,selectedRevealed}=state;
    const visible=!hideResults||selectedRevealed;
    $("mt-equation").textContent=a+" × "+b+" = "+(visible?a*b:"?");
    $("mt-explanation").textContent=visible?exampleExplanation(a,b):"Najpierw spróbuj obliczyć wynik w pamięci lub na kartce. Potem odkryj odpowiedź.";
    $("mt-show-answer").hidden=visible;
    addDots(a,b);
  }
  function highlight() {
    const a=state.selectedA,b=state.selectedB;
    for(const row of $("mt-tbody").rows) {
      const rv=Number(row.dataset.row);
      row.classList.toggle("mt-row-highlight",rv===a);
      for(const cell of row.cells) {
        const cv=Number(cell.dataset.col);
        const selected=rv===a && cv===b;
        cell.classList.toggle("mt-col-highlight",cv===b);
        cell.classList.toggle("mt-selected",selected);
        const btn=cell.querySelector("button");
        if(btn){
          btn.setAttribute("aria-pressed",String(selected));
          const covered=state.hideResults && !(selected && state.selectedRevealed);
          btn.setAttribute("aria-label",covered ? rv+" razy "+cv+". Odkryj wynik" : rv+" razy "+cv+" = "+rv*cv);
        }
      }
    }
    for(const header of $("mt-thead").querySelectorAll("th[data-col]")){
      header.classList.toggle("mt-col-highlight",Number(header.dataset.col)===b);
    }
  }
  function choose(a,b,focus=false) {
    if(validNumber(a)===null||validNumber(b)===null)return;
    state.selectedA=a;state.selectedB=b;state.selectedRevealed=!state.hideResults;
    highlight();details();
    if(focus) {
      const cell=$("mt-tbody").querySelector('button[data-row="'+a+'"][data-col="'+b+'"]');
      cell?.focus({preventScroll:true});
    }
  }
  function buildBoard() {
    const rows=shownNumbers("row"),cols=shownNumbers("col");
    const table=$("mt-table");
    const head=$("mt-thead"),body=$("mt-tbody");
    table.dataset.mode=String(state.mode);
    table.classList.toggle("mt-hide-results",state.hideResults);
    table.setAttribute("aria-label","Tabliczka mnożenia: wiersze "+rows[0]+"–"+rows.at(-1)+", kolumny "+cols[0]+"–"+cols.at(-1));
    const title=state.mode<100?
      "Tabliczka od 1 do "+state.mode :
      "Wiersze "+rows[0]+"–"+rows.at(-1)+" · kolumny "+cols[0]+"–"+cols.at(-1);
    $("mt-range-label").textContent=title;
    $("mt-large-controls").hidden=state.mode!==100;
    $("mt-row-block").value=String(state.rowBlock);
    $("mt-col-block").value=String(state.colBlock);
    $("mt-prev-row").disabled=state.rowBlock===0;
    $("mt-next-row").disabled=state.rowBlock===9;
    $("mt-board-hint").textContent=state.mode===100?
      "To jedna ze 100 kart wielkiej tabliczki. Możesz przejrzeć wszystkie kombinacje — bez przeciążania telefonu.":
      "Pierwsza liczba jest po lewej, druga u góry. W ich przecięciu znajduje się wynik.";
    head.replaceChildren();body.replaceChildren();
    const rowHead=document.createElement("tr");
    const corner=document.createElement("th");
    corner.scope="col";corner.className="mt-corner";corner.textContent="×";
    rowHead.append(corner);
    for(const n of cols){
      const th=document.createElement("th");
      th.scope="col";th.dataset.col=String(n);th.textContent=String(n);
      rowHead.append(th);
    }
    head.append(rowHead);
    const fragment=document.createDocumentFragment();
    for(const a of rows){
      const tr=document.createElement("tr");tr.dataset.row=String(a);
      const label=document.createElement("th");
      label.scope="row";label.textContent=String(a);
      tr.append(label);
      for(const b of cols) {
        const td=document.createElement("td");td.dataset.col=String(b);
        if(a===b)td.classList.add("mt-diagonal");
        if(a===10||b===10||a%10===0||b%10===0)td.classList.add("mt-ten");
        const btn=document.createElement("button");
        btn.type="button";btn.className="mt-cell";btn.dataset.row=String(a);btn.dataset.col=String(b);
        btn.setAttribute("aria-pressed","false");
        const value=document.createElement("span");
        value.className="mt-cell-value";value.textContent=String(a*b);
        const cover=document.createElement("span");
        cover.className="mt-cell-cover";cover.textContent="?";cover.setAttribute("aria-hidden","true");
        btn.append(value,cover);
        td.append(btn);tr.append(td);
      }
      fragment.append(tr);
    }
    body.append(fragment);
    if(!isOnBoard(state.selectedA,state.selectedB)){
      state.selectedA=rows[0];state.selectedB=cols[0];
    }
    state.selectedRevealed=!state.hideResults;
    highlight();details();
    const frame=document.querySelector(".mt-table-frame");
    frame.scrollLeft=0;
    if(state.mode===100) {
      $("mt-table-help").textContent="Oglądasz 100 wyników naraz. Zmień zakres wierszy i kolumn, aby obejrzeć pozostałe części tabliczki 1–100.";
    }else{
      $("mt-table-help").textContent="Na telefonie przesuń tabliczkę w bok, aby zobaczyć wszystkie kolumny.";
    }
  }
  function setMode(mode) {
    if(!MODES.includes(mode))return;
    state.mode=mode;
    for(const button of document.querySelectorAll(".mt-mode")){
      const selected=Number(button.dataset.mode)===mode;
      button.classList.toggle("is-active",selected);
      button.setAttribute("aria-pressed",String(selected));
    }
    buildBoard();
  }
  function reveal() {
    state.selectedRevealed=true;
    highlight();details();
    const cell=$("mt-tbody").querySelector('td[data-col="'+state.selectedB+'"] button[data-row="'+state.selectedA+'"]');
    if(cell)cell.focus({preventScroll:true});
  }
  function openCell(a,b) {
    if(!isOnBoard(a,b)) {
      if(a<=10 && b<=10) setMode(10);
      else if(a<=20 && b<=20) setMode(20);
      else {
        state.rowBlock=Math.floor((a-1)/10);
        state.colBlock=Math.floor((b-1)/10);
        setMode(100);
      }
    }
    choose(a,b);
    const selected=$("mt-tbody").querySelector('button[data-row="'+a+'"][data-col="'+b+'"]');
    if(selected){
      selected.scrollIntoView({block:"nearest",inline:"nearest",behavior:"instant"});
      selected.focus({preventScroll:true});
    }
  }
  function csvCell(s) {
    let v=String(s);
    if(/^[=+\-@\t\r]/.test(v))v="'"+v;
    return '"'+v.replace(/"/g,'""')+'"';
  }
  function createFullCsv() {
    const lines=[];
    lines.push([ "×",...Array.from({length:100},(_,i)=>i+1)].map(csvCell).join(";"));
    for(let a=1;a<=100;a++){
      lines.push([a,...Array.from({length:100},(_,i)=>a*(i+1))].map(csvCell).join(";"));
    }
    return "\uFEFF"+lines.join("\r\n");
  }
  function downloadCsv() {
    const file=new Blob([createFullCsv()],{type:"text/csv;charset=utf-8"});
    const href=URL.createObjectURL(file);
    const anchor=document.createElement("a");
    anchor.href=href;
    anchor.download="pelna-tabliczka-mnozenia-1-100.csv";
    document.body.append(anchor);
    anchor.click();anchor.remove();
    setTimeout(()=>URL.revokeObjectURL(href),5000);
    $("mt-lookup-feedback").textContent="Pobrano kompletną tabliczkę 100 × 100 (10 000 wyników) w pliku CSV.";
  }
  function init() {
    for(let block=0;block<10;block++){
      const first=blockStart(block),last=first+BLOCK-1;
      for(const id of ["mt-row-block","mt-col-block"]){
        const opt=document.createElement("option");
        opt.value=String(block);
        opt.textContent=first+"–"+last;
        $(id).append(opt);
      }
    }
    for(const button of document.querySelectorAll(".mt-mode")){
      button.addEventListener("click",()=>setMode(Number(button.dataset.mode)));
    }
    $("mt-hide-results").addEventListener("change",event=>{
      state.hideResults=event.target.checked;
      buildBoard();
    });
    $("mt-row-block").addEventListener("change",event=>{
      state.rowBlock=Number(event.target.value);
      buildBoard();
    });
    $("mt-col-block").addEventListener("change",event=>{
      state.colBlock=Number(event.target.value);
      buildBoard();
    });
    $("mt-prev-row").addEventListener("click",()=>{
      if(state.rowBlock>0){state.rowBlock--;buildBoard();}
    });
    $("mt-next-row").addEventListener("click",()=>{
      if(state.rowBlock<9){state.rowBlock++;buildBoard();}
    });
    $("mt-tbody").addEventListener("click",event=>{
      const cell=event.target.closest("button[data-row][data-col]");
      if(!cell)return;
      const a=Number(cell.dataset.row),b=Number(cell.dataset.col);
      if(state.hideResults && state.selectedA===a && state.selectedB===b && !state.selectedRevealed) {
        reveal();
      } else {
        choose(a,b);
      }
    });
    $("mt-show-answer").addEventListener("click",reveal);
    $("mt-lookup-form").addEventListener("submit",event=>{
      event.preventDefault();
      const a=validNumber($("mt-number-a").value),b=validNumber($("mt-number-b").value);
      if(a===null||b===null){
        $("mt-lookup-feedback").textContent="Wybierz dwie całkowite liczby od 1 do 100.";
        return;
      }
      openCell(a,b);
      $("mt-lookup-feedback").textContent="Znaleziono "+a+" × "+b+". Zaznaczona kratka znajduje się w tabliczce powyżej.";
      $("table-section").scrollIntoView({block:"start",behavior:"smooth"});
    });
    $("mt-download-csv").addEventListener("click",downloadCsv);
    $("mt-print").addEventListener("click",()=>window.print());
    setMode(10);
    choose(3,4);
  }
  init();
})();