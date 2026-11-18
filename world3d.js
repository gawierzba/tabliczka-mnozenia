/**
 * Leśna Przygoda — proceduralny teatr lalkowy 3D (Three.js r187).
 * Moduł wczytywany dopiero po wejściu do świata 3D. Bez modeli, wielkich
 * tekstur i bez dodatkowych żądań sieciowych poza biblioteką Three.js.
 */
const THREE_URL = "https://cdn.jsdelivr.net/npm/three@0.187.0/build/three.module.js";

export async function createPuppetWorld(host, options = {}) {
  if (!host || !document.createElement("canvas").getContext) {
    throw new Error("Brak obsługi grafiki 3D w tej przeglądarce.");
  }
  const probe = document.createElement("canvas");
  const gl = probe.getContext("webgl2", { failIfMajorPerformanceCaveat: true }) ||
             probe.getContext("webgl", { failIfMajorPerformanceCaveat: true });
  if (!gl) throw new Error("Urządzenie nie obsługuje WebGL lub ma wyłączone przyspieszenie.");
  gl.getExtension("WEBGL_lose_context")?.loseContext();
  const THREE = await import(THREE_URL);
  const palette = [
    { sky:0xb6dbd3,ground:0x90b37a,tree:0x4b8265,flower:0xe9a47f,accent:0xf3c475 },
    { sky:0xc5d9bf,ground:0x8caa6c,tree:0x4d7758,flower:0xd88763,accent:0xe7ab67 },
    { sky:0xb8d4b9,ground:0xa6b778,tree:0x547b5a,flower:0xf0c56e,accent:0x9e7355 },
    { sky:0xd4dcb9,ground:0xb6bc85,tree:0x628963,flower:0xf3ae79,accent:0xe2a569 },
    { sky:0xb9d9d9,ground:0x95b48a,tree:0x4d7b74,flower:0xead18a,accent:0x85b6b6 },
    { sky:0xd3d8b7,ground:0x92ab7e,tree:0x5b7963,flower:0xe9af7c,accent:0xc18465 },
    { sky:0x647d9a,ground:0x607966,tree:0x406453,flower:0xffd68d,accent:0xf3c476 },
    { sky:0xb2cbd8,ground:0x789d79,tree:0x467567,flower:0xb6cad8,accent:0xd2b0a1 },
    { sky:0xc9c0d0,ground:0x88a18a,tree:0x56736a,flower:0xe3c8ba,accent:0xb77d70 },
    { sky:0x394966,ground:0x647a7e,tree:0x435c62,flower:0xf2d2a0,accent:0xf1ce80 }
  ];
  let quality = options.quality === "eco" ? "eco" : "standard";
  let reducedMotion = !!options.reducedMotion;
  let currentZone = 0;
  let active = false;
  let disposed = false;
  let raf = 0;
  let lastFrame = 0;
  let lastTime = performance.now();
  let azimuth = 0.58;
  let altitude = 0.55;
  let distance = 19;
  let angularVelocity = 0;
  let revealStarted = -1;
  let waveUntil = 0;
  let doorOpenUntil = 0;
  let bearWavingArm = null;
  let drag = null;
  const cleanup = [];

  const renderer = new THREE.WebGLRenderer({
    alpha:false,antialias:quality !== "eco",powerPreference:"low-power"
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.13;
  renderer.setClearColor(palette[0].sky);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality==="eco"?1:1.5));
  renderer.domElement.className = "puppet-canvas";
  renderer.domElement.setAttribute("aria-label","Obrotowa, przestrzenna makieta leśnego świata. Przeciągnij palcem, aby obrócić widok.");
  renderer.domElement.setAttribute("role","img");
  renderer.domElement.style.touchAction = "none";
  host.append(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(palette[0].sky);
  scene.fog = new THREE.Fog(palette[0].sky,17,44);
  const camera = new THREE.PerspectiveCamera(37,1,.1,120);
  const target = new THREE.Vector3(0,1.0,0);
  const hemi = new THREE.HemisphereLight(0xfef1d2,0x467a62,3.0);
  scene.add(hemi);
  const sunlight = new THREE.DirectionalLight(0xffe4ae,3.0);
  sunlight.position.set(-6,13,9);
  sunlight.castShadow = quality!=="eco";
  sunlight.shadow.mapSize.set(512,512);
  sunlight.shadow.camera.near = .5;
  sunlight.shadow.camera.far = 34;
  sunlight.shadow.camera.left = -12;
  sunlight.shadow.camera.right = 12;
  sunlight.shadow.camera.top = 12;
  sunlight.shadow.camera.bottom = -12;
  sunlight.shadow.bias = -.0003;
  scene.add(sunlight);
  renderer.shadowMap.enabled = quality!=="eco";
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // Drobne włókna na materiale powstają lokalnie, bez pobieranych obrazków.
  const fabricCanvas = document.createElement("canvas");
  fabricCanvas.width=64;fabricCanvas.height=64;
  const ctx=fabricCanvas.getContext("2d");
  const pixels=ctx.createImageData(64,64);
  let seed=842176;
  function random(){ seed=(seed*1664525+1013904223)>>>0; return seed/4294967296; }
  for(let i=0;i<pixels.data.length;i+=4) {
    const grey=115+Math.floor(random()*110);
    pixels.data[i]=grey;pixels.data[i+1]=grey;pixels.data[i+2]=grey;pixels.data[i+3]=255;
  }
  ctx.putImageData(pixels,0,0);
  const fabric = new THREE.CanvasTexture(fabricCanvas);
  fabric.wrapS = fabric.wrapT = THREE.RepeatWrapping;
  fabric.repeat.set(3,3);
  const felt = (color)=>new THREE.MeshStandardMaterial({
    color,roughness:1,metalness:0,bumpMap:fabric,bumpScale:.032
  });
  const mat = (color,roughness=.92)=>new THREE.MeshStandardMaterial({color,roughness,metalness:0});
  const materials={
    grass:felt(palette[0].ground),
    cliff:mat(0x8b7862),
    soil:mat(0x654f40),
    wood:felt(0x967050),
    darkwood:felt(0x684938),
    plaster:felt(0xf2dcb4),
    roof:felt(0xbe755c),
    window:mat(0xffd6a1),
    cream:felt(0xeed1a9),
    bear:felt(0xb88865),
    bearDark:felt(0x966b52),
    black:mat(0x302923),
    rose:felt(0xd99083),
    scarf:felt(0x4c8581),
    bunny:felt(0xe2dfc6),
    bunnyPink:felt(0xd2a7a2),
    leaves:felt(palette[0].tree),
    leavesLight:felt(0x85a786),
    flower:felt(palette[0].flower),
    accent:felt(palette[0].accent),
    gold:mat(0xf5d391),
    stone:mat(0xc6b89c),
    water:mat(0x76a7a1,.35)
  };
  const ownedMaterials = Object.values(materials);
  const root = new THREE.Group();
  scene.add(root);
  const animated = [];
  const clickable = [];

  function mesh(parent,geometry,material,x=0,y=0,z=0) {
    const m=new THREE.Mesh(geometry,material);
    m.position.set(x,y,z);
    m.castShadow=true;
    m.receiveShadow=true;
    parent.add(m);
    return m;
  }
  function sphere(parent,m,x,y,z,rx,ry=rx,rz=rx,segments=12) {
    const item=mesh(parent,new THREE.SphereGeometry(1,segments,10),m,x,y,z);
    item.scale.set(rx,ry,rz);
    return item;
  }
  function box(parent,m,w,h,d,x,y,z) {
    return mesh(parent,new THREE.BoxGeometry(w,h,d),m,x,y,z);
  }
  function cylinder(parent,m,top,bottom,height,x,y,z,sides=12) {
    return mesh(parent,new THREE.CylinderGeometry(top,bottom,height,sides),m,x,y,z);
  }
  function flower(parent,x,z,material=materials.flower,size=1) {
    const g=new THREE.Group();g.position.set(x,.13,z);parent.add(g);
    cylinder(g,materials.leaves,.018,.024,.28,0,.16,0,5);
    for(let i=0;i<5;i++) {
      const a=i*Math.PI*2/5;
      sphere(g,material,Math.cos(a)*.11*size,.33,Math.sin(a)*.11*size,.095*size,.06*size,.095*size,8);
    }
    sphere(g,materials.gold,0,.33,0,.065*size,.05*size,.065*size,8);
    return g;
  }
  function mushroom(parent,x,z,size=1) {
    const g=new THREE.Group();g.position.set(x,.12,z);g.scale.setScalar(size);parent.add(g);
    cylinder(g,materials.cream,.13,.16,.42,0,.22,0,9);
    const cap=sphere(g,materials.roof,0,.47,0,.42,.24,.42,12);
    for(const [dx,dz] of [[-.16,.2],[.11,.23],[.14,-.09]]) {
      sphere(g,materials.cream,dx,.60+Math.abs(dz)*.05,dz,.09,.035,.09,8);
    }
    return g;
  }
  function tree(parent,x,z,scale=1,style=0) {
    const g=new THREE.Group();g.position.set(x,.12,z);g.scale.setScalar(scale);parent.add(g);
    cylinder(g,materials.wood,.16,.23,1.45,0,.76,0,9);
    if(style===0) {
      sphere(g,materials.leaves,0,2.10,0,1.04,.9,.94);
      sphere(g,materials.leavesLight,-.51,1.8,.14,.51,.58,.51);
      sphere(g,materials.leaves,.53,1.82,-.12,.63,.61,.63);
    }else{
      for(let i=0;i<3;i++){
        const c=mesh(g,new THREE.ConeGeometry(1.02-i*.12,1.75-i*.16,8),i===1?materials.leavesLight:materials.leaves,0,1.45+i*.56,0);
        c.castShadow=true;
      }
    }
    return g;
  }
  // Miniaturowa wyspa na drewnianym cokole.
  const island=cylinder(root,materials.cliff,7.15,6.7,1.32,0,-.62,0,48);
  island.receiveShadow=true;
  cylinder(root,materials.soil,7.25,7.25,.17,0,-1.31,0,48);
  const grass=cylinder(root,materials.grass,7.17,7.17,.21,0,.12,0,48);
  grass.receiveShadow=true;
  const islandEdge=mesh(root,new THREE.TorusGeometry(7.10,.07,7,64),materials.wood,0,.2,0);
  islandEdge.rotation.x=Math.PI/2;

  const path=mesh(root,new THREE.TorusGeometry(3.45,.37,7,72,Math.PI*1.45),materials.stone,0,.227,0);
  path.rotation.x=Math.PI/2;
  path.rotation.z=.25;

  // Mebelki i domek są prawdziwymi bryłami trójwymiarowymi.
  const house=new THREE.Group();house.position.set(2.35,.19,-1.95);house.rotation.y=-.18;root.add(house);
  house.userData.message="W drewnianym domku czekają nowe matematyczne zagadki. 🏡";
  box(house,materials.plaster,2.65,2.08,2.18,0,1.07,0);
  const roof=mesh(house,new THREE.ConeGeometry(2.20,1.47,4),materials.roof,0,2.79,0);
  roof.rotation.y=Math.PI/4;
  const houseDoor=box(house,materials.darkwood,.69,1.38,.07,.12,.69,1.13);
  sphere(house,materials.gold,.4,.76,1.2,.06);
  for(const x of [-.84,.9]){
    box(house,materials.darkwood,.66,.65,.10,x,1.44,1.14);
    box(house,materials.window,.51,.51,.12,x,1.44,1.22);
    box(house,materials.darkwood,.07,.56,.13,x,1.44,1.31);
    box(house,materials.darkwood,.53,.07,.13,x,1.44,1.31);
  }
  box(house,materials.wood,.33,.71,.35,.76,3.30,-.44);
  box(house,materials.darkwood,.50,.12,.5,.76,3.66,-.44);
  for(let n=-2;n<=2;n++){box(house,materials.wood,.12,.45,.1,-1.6+n*.34,.24,1.8);}
  box(house,materials.wood,1.55,.1,.12,-.88,.42,1.8);

  // Autorski niedźwiadek z "filcowym" futerkiem.
  const bear=new THREE.Group();bear.position.set(-2.35,.22,1.12);root.add(bear);
  bear.userData.message="Miś zaprasza do liczenia! Czy znasz wynik 7 × 8? 🧸";
  sphere(bear,materials.bear,0,.9,0,.63,.77,.53);
  sphere(bear,materials.cream,0,.86,.46,.35,.47,.11);
  for(const x of [-.42,.42]){
    sphere(bear,materials.bear,x,.30,.20,.29,.26,.4);
    const arm=sphere(bear,materials.bearDark,x*1.4,1.06,0,.23,.45,.28);
    arm.rotation.z=x<0?-.5:.5;
    if(x>0)bearWavingArm=arm;
    sphere(bear,materials.bear,x*1.08,2.18,.04,.26,.28,.20);
    sphere(bear,materials.rose,x*1.08,2.20,.20,.13,.15,.045);
    sphere(bear,materials.black,x*.63,1.87,.51,.062,.075,.075,10);
  }
  sphere(bear,materials.bear,0,1.83,0,.77,.67,.66);
  sphere(bear,materials.cream,0,1.62,.54,.37,.28,.20);
  sphere(bear,materials.black,0,1.76,.715,.115,.085,.08);
  sphere(bear,materials.rose,-.46,1.65,.44,.16,.07,.055);
  sphere(bear,materials.rose,.46,1.65,.44,.16,.07,.055);
  const scarf=mesh(bear,new THREE.TorusGeometry(.45,.13,8,22),materials.scarf,0,1.35,0);
  scarf.rotation.x=Math.PI/2;
  const scarfTail=box(bear,materials.scarf,.23,.57,.12,.20,1.06,.53);
  scarfTail.rotation.z=.14;
  clickable.push(house,bear);
  animated.push({object:bear,baseY:bear.position.y,phase:0});
  // Mały zajączek na scenie.
  const bunny=new THREE.Group();bunny.position.set(.05,.19,2.9);root.add(bunny);
  bunny.userData.message="Zajączek uwielbia skoki i zadania na czas. 🐇";
  sphere(bunny,materials.bunny,0,.59,0,.39,.53,.33);
  sphere(bunny,materials.bunny,0,1.28,0,.43,.42,.40);
  for(const x of [-.22,.22]) {
    const ear=sphere(bunny,materials.bunny,x,1.93,0,.17,.56,.16);ear.rotation.z=x<0?.1:-.1;
    sphere(bunny,materials.bunnyPink,x,1.94,.14,.10,.42,.035);
    sphere(bunny,materials.black,x*.70,1.33,.35,.035,.055,.04,8);
    sphere(bunny,materials.bunny,x,.22,.19,.23,.20,.29);
  }
  sphere(bunny,materials.rose,0,1.13,.4,.07,.055,.06);
  sphere(bunny,materials.bunny,0,.43,-.33,.20);
  clickable.push(bunny);
  animated.push({object:bunny,baseY:bunny.position.y,phase:1.4});

  const forest=new THREE.Group();root.add(forest);
  const treeSites=[
    [-5.3,-2.7,.96,0],[-5.9,1.9,.88,1],[-4.6,4.4,.72,0],
    [-2.9,-5.6,.8,1],[.4,-5.7,1,0],[5.1,-4.3,.95,0],
    [6.0,-.7,.8,1],[5.5,3.2,.68,1],[-2.0,5.5,.66,0]
  ];
  for(const [x,z,s,t] of treeSites.slice(0,quality==="eco"?6:treeSites.length))tree(forest,x,z,s,t);
  // Grzybki wśród drobnych kwiatów.
  for(const [x,z,s] of [[-3.7,3.5,.62],[-3.9,-3.0,.55],[4.3,2.6,.63],[1.0,-4.8,.4]])mushroom(forest,x,z,s);
  for(let i=0;i<(quality==="eco"?15:44);i++) {
    const angle=random()*Math.PI*2,r=3.3+random()*3.35;
    const x=Math.cos(angle)*r,z=Math.sin(angle)*r;
    if((x>1.1&&x<4&&z>-3.3&&z<-.5)||(x<-1.0&&x>-3.5&&z>0&&z<2.4))continue;
    flower(forest,x,z,i%3===0?materials.accent:materials.flower,.45+random()*.35);
  }
  const accents=new THREE.Group();root.add(accents);
  const fireflies=[];
  const glowMaterial=new THREE.MeshBasicMaterial({color:0xffe6ab});
  for(let i=0;i<(quality==="eco"?7:14);i++){
    const a=random()*Math.PI*2,r=2.1+random()*4.7;
    const m=mesh(root,new THREE.SphereGeometry(.035+random()*.035,6,6),glowMaterial,
      Math.cos(a)*r,.8+random()*2.9,Math.sin(a)*r);
    m.castShadow=false;
    fireflies.push({mesh:m,phase:random()*Math.PI*2,base:m.position.y});
  }

  function disposeChildren(group) {
    while(group.children.length) {
      const child=group.children[0];group.remove(child);
      child.traverse(node=>{
        if(node.geometry)node.geometry.dispose();
        // Materiały są współdzielone, zwalniamy je przy dispose całej sceny.
      });
    }
  }
  function placeStar(parent,x,y,z,size=1) {
    const obj=new THREE.Group();obj.position.set(x,y,z);obj.scale.setScalar(size);parent.add(obj);
    for(let i=0;i<5;i++){
      const ray=mesh(obj,new THREE.ConeGeometry(.11,.46,5),materials.gold,0,.2,0);
      ray.rotation.z=(i*Math.PI*2/5);
    }
    sphere(obj,materials.gold,0,0,0,.18,.18,.08,8);
    return obj;
  }
  function selectZone(index) {
    const nextZone=Math.max(0,Math.min(9,Math.round(index)));
    if(currentZone!==nextZone && active && !reducedMotion){revealStarted=performance.now();angularVelocity=.18;}
    currentZone=nextZone;
    const p=palette[currentZone];
    scene.background.setHex(p.sky);
    scene.fog.color.setHex(p.sky);
    renderer.setClearColor(p.sky);
    materials.grass.color.setHex(p.ground);
    materials.leaves.color.setHex(p.tree);
    materials.flower.color.setHex(p.flower);
    materials.accent.color.setHex(p.accent);
    disposeChildren(accents);
    // Symboliczne scenografie; w każdym rozdziale makieta zmienia swój charakter.
    if(currentZone===0) {
      for(const [x,z] of [[-1.1,-3.2],[3.6,3.0],[-3.9,.6]])flower(accents,x,z,materials.gold,1.9);
    }else if(currentZone===1) {
      for(let n=0;n<8;n++){const a=n*Math.PI/4;mushroom(accents,Math.cos(a)*4.05,Math.sin(a)*4.05,.5+(n%3)*.21);}
    }else if(currentZone===2) {
      for(const [x,z] of [[-1,-2.2],[-3,-1.5],[4,3.1]]){
        cylinder(accents,materials.wood,.38,.48,.27,x,.36,z,7);
        sphere(accents,materials.accent,x,.6,z,.19,.24,.19,8);
      }
    }else if(currentZone===3) {
      for(let n=0,nmax=quality==="eco"?7:15;n<nmax;n++){const a=n*Math.PI*2/nmax;flower(accents,Math.cos(a)*4.45,Math.sin(a)*4.45,materials.accent,1.2);}
    }else if(currentZone===4) {
      const group=new THREE.Group();group.position.set(-.3,.27,-2.6);group.rotation.y=.18;accents.add(group);
      for(let i=0;i<7;i++)box(group,materials.wood,.37,.15,1.65,i*.42-1.3,.22,0);
      for(const x of [-1.55,1.42]){
        box(group,materials.darkwood,.13,.85,.13,x,.52,-.74);
        box(group,materials.darkwood,.13,.85,.13,x,.52,.74);
      }
    }else if(currentZone===5) {
      const book=box(accents,materials.roof,.85,.23,.60,-.8,.3,-2.5);
      book.rotation.y=.22;box(accents,materials.plaster,.74,.1,.53,-.8,.43,-2.5).rotation.y=.22;
      for(let n=0;n<4;n++)box(accents,materials.wood,.18,.8,.18,-1.45+n*.2,.6,-3.0);
    }else if(currentZone===6) {
      for(const [x,z] of [[-4,1],[3.5,3],[-2,-3],[5,-1]]){
        cylinder(accents,materials.wood,.07,.1,1.35,x,.8,z);
        sphere(accents,materials.gold,x,1.56,z,.18,.24,.18,10);
      }
    }else if(currentZone===7) {
      for(const [x,z,h] of [[-3.5,-2.5,1.2],[.7,-3.6,.95],[4.8,.5,1.4]]){
        mesh(accents,new THREE.ConeGeometry(h*.66,h,5),materials.stone,x,h/2+.25,z);
      }
    }else if(currentZone===8) {
      const g=new THREE.Group();g.position.set(-1.0,.25,-3.2);accents.add(g);
      cylinder(g,materials.stone,.62,.75,2,0,1,0,8);
      cylinder(g,materials.roof,.88,.66,.42,0,2.22,0,8);
      sphere(g,materials.gold,0,2.56,0,.16);
    }else{
      for(let i=0;i<10;i++) {
        const a=i*Math.PI*2/10,r=3.4+(i%3)*.55;
        placeStar(accents,Math.cos(a)*r,1.0+i%3*.45,Math.sin(a)*r,.5);
      }
    }
    if(!active)render(performance.now());
    if(typeof options.onZoneChange==="function")options.onZoneChange(currentZone);
  }

  function updateCamera(time=performance.now()) {
    const h=Math.max(.3,Math.min(1.25,altitude));
    // Filmowe otwarcie: powolny lot kamery do ręcznie wykonanej makiety.
    const portion=reducedMotion||revealStarted<0?0:Math.max(0,1-(time-revealStarted)/2500);
    const ease=portion*portion*(3-2*portion);
    const z=Math.max(11,Math.min(29,distance))+8*ease;
    const hor=Math.cos(h)*z;
    const orbit=azimuth-.31*ease;
    camera.position.set(Math.sin(orbit)*hor,Math.sin(h)*z+target.y+1.2*ease,Math.cos(orbit)*hor);
    camera.lookAt(target);
  }
  function resize() {
    if(disposed)return;
    const w=Math.round(host.clientWidth);
    const h=Math.round(host.clientHeight);
    if(w<2 || h<2)return;
    renderer.setSize(w,h,false);
    camera.aspect=w/h;
    camera.fov=w<600?46:37;
    camera.updateProjectionMatrix();
    updateCamera();
    render(performance.now());
  }
  function render(time) {
    if(disposed)return;
    try{renderer.render(scene,camera);}
    catch(error){
      stop();
      if(typeof options.onError==="function") options.onError(error);
    }
  }
  function frame(time) {
    if(!active||disposed)return;
    raf=requestAnimationFrame(frame);
    const threshold=reducedMotion?180:quality==="eco"?46:31;
    if(time-lastFrame<threshold)return;
    const delta=Math.min((time-lastTime)/1000,.1);
    lastTime=time;lastFrame=time;
    if(!reducedMotion) {
      if(!drag)azimuth+=angularVelocity*delta;
      angularVelocity*=Math.pow(.025,delta);
      for(const item of animated)item.object.position.y=item.baseY+Math.sin(time*.0017+item.phase)*.038;
      for(const f of fireflies){
        f.mesh.position.y=f.base+Math.sin(time*.0013+f.phase)*.11;
        f.mesh.scale.setScalar(.65+.35*(1+Math.sin(time*.002+f.phase)));
      }
      if(bearWavingArm)bearWavingArm.rotation.z=time<waveUntil?.5+Math.sin(time*.014)*.7:.5;
      houseDoor.rotation.y=time<doorOpenUntil?-.46*(.5+.5*Math.sin(time*.006)) : 0;
    }
    updateCamera(time);
    render(time);
  }
  function start() {
    if(disposed||active)return;
    active=true;lastTime=performance.now();lastFrame=0;
    if(revealStarted<0)revealStarted=lastTime;
    resize();
    raf=requestAnimationFrame(frame);
  }
  function stop() {
    active=false;
    cancelAnimationFrame(raf);
    raf=0;
  }
  function setReducedMotion(value) {
    reducedMotion=!!value;
    if(reducedMotion) {
      angularVelocity=0;
      animated.forEach(item=>item.object.position.y=item.baseY);
      fireflies.forEach(f=>{f.mesh.position.y=f.base;f.mesh.scale.setScalar(1);});
      if(bearWavingArm)bearWavingArm.rotation.z=.5;
      houseDoor.rotation.y=0;
    }
    render(performance.now());
  }
  function setQuality(value) {
    quality=value==="eco"?"eco":"standard";
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,quality==="eco"?1:1.5));
    renderer.shadowMap.enabled=quality!=="eco";
    sunlight.castShadow=quality!=="eco";
    resize();
  }
  function onPointerDown(event) {
    if(event.pointerType==="mouse"&&event.button!==0)return;
    drag={x:event.clientX,y:event.clientY,startX:event.clientX,startY:event.clientY,
      azimuth,altitude};
    renderer.domElement.setPointerCapture?.(event.pointerId);
    renderer.domElement.style.cursor="grabbing";
    angularVelocity=0;
  }
  function onPointerMove(event) {
    if(!drag)return;
    const dx=event.clientX-drag.x,dy=event.clientY-drag.y;
    azimuth=drag.azimuth-dx*.007;
    altitude=Math.max(.27,Math.min(1.15,drag.altitude+dy*.006));
    render(performance.now());
  }
  function onPointerUp(event) {
    if(!drag)return;
    const d=drag;drag=null;
    renderer.domElement.style.cursor="grab";
    if(Math.hypot(event.clientX-d.startX,event.clientY-d.startY)<8) {
      const rect=renderer.domElement.getBoundingClientRect();
      const pointer=new THREE.Vector2(
        ((event.clientX-rect.left)/rect.width)*2-1,
        -((event.clientY-rect.top)/rect.height)*2+1
      );
      const ray=new THREE.Raycaster();ray.setFromCamera(pointer,camera);
      const found=ray.intersectObjects(clickable,true);
      if(found.length) {
        let obj=found[0].object;
        while(obj && !obj.userData.message)obj=obj.parent;
        if(obj===bear)waveUntil=performance.now()+2200;
        if(obj===house)doorOpenUntil=performance.now()+2100;
        if(obj && typeof options.onSurprise==="function") options.onSurprise(obj.userData.message);
      }
    }
  }
  function onWheel(event) {
    if(!active)return;
    event.preventDefault();
    distance=Math.max(11,Math.min(29,distance+Math.sign(event.deltaY)*1.0));
    updateCamera();render(performance.now());
  }
  function onContextLost(event) {
    event.preventDefault();stop();
    if(typeof options.onError==="function")options.onError(new Error("Połączenie z układem graficznym zostało przerwane."));
  }
  function listen(target,name,handler,extra) {
    target.addEventListener(name,handler,extra);
    cleanup.push(()=>target.removeEventListener(name,handler,extra));
  }
  listen(renderer.domElement,"pointerdown",onPointerDown);
  listen(renderer.domElement,"pointermove",onPointerMove);
  listen(renderer.domElement,"pointerup",onPointerUp);
  listen(renderer.domElement,"pointercancel",()=>{drag=null;renderer.domElement.style.cursor="grab";});
  listen(renderer.domElement,"wheel",onWheel,{passive:false});
  listen(renderer.domElement,"webglcontextlost",onContextLost);
  renderer.domElement.style.cursor="grab";
  const observer=typeof ResizeObserver==="function" ? new ResizeObserver(resize):null;
  if(observer){observer.observe(host);cleanup.push(()=>observer.disconnect());}
  else listen(window,"resize",resize);
  function dispose() {
    if(disposed)return;
    stop();disposed=true;
    cleanup.forEach(fn=>fn());
    scene.traverse(node=>{
      if(node.geometry)node.geometry.dispose();
    });
    const allMaterials=[...ownedMaterials,glowMaterial];
    allMaterials.forEach(m=>m.dispose());
    fabric.dispose();
    renderer.dispose();
    renderer.forceContextLoss?.();
    renderer.domElement.remove();
  }
  selectZone(0);
  resize();
  return {selectZone,start,stop,dispose,setReducedMotion,setQuality,
    rotateLeft(){azimuth-=Math.PI/7;updateCamera();render(performance.now());},
    rotateRight(){azimuth+=Math.PI/7;updateCamera();render(performance.now());},
    resetCamera(){azimuth=.58;altitude=.55;distance=19;updateCamera();render(performance.now());}
  };
}
