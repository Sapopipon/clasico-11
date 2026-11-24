/* =========================================================================
   Clásico 11 · capa 3D de jugadores
   - Usa el esqueleto (rig) de "Universal Base Characters" para los 22 jugadores.
   - La camiseta, el short y las medias salen de colores por zona + patrón (rayas,
     bastones, franja, banda...) según el club elegido (se pintan en un shader).
   - Todo el juego sigue siendo el mismo (2D); esta capa solo dibuja jugadores y
     pelota con la misma cámara que el campo. Si algo falla al cargar, el juego
     vuelve solo a los jugadores 2D de siempre.
   ========================================================================= */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

const BASE = new URL('../assets/', import.meta.url).href;
const PL3D = { ready: false, failed: false, error: null };
window.PL3D = PL3D;

const canvas = document.getElementById('c3d');
let renderer, scene, camP, camO, ballMesh, ballShadow, shadowTex;
let src = null, hairSrc = {}, bodyMap = null;
const rest = {};                 // nombre de hueso -> datos de la pose de reposo
let armQ = new THREE.Quaternion();
const rigs = [];
const kitMats = new Map();
const SKIN_HEX = ['#f1c9a5', '#d9a47a', '#a56b45', '#6b4226'];
const SKIN_TINT = [[1.06, 1.0, .95], [.96, .84, .76], [.70, .53, .43], [.50, .36, .29]];
const DRIVEN = ['pelvis', 'spine_01', 'spine_02', 'spine_03', 'neck_01', 'Head',
  'upperarm_l', 'upperarm_r', 'lowerarm_l', 'lowerarm_r',
  'thigh_l', 'thigh_r', 'calf_l', 'calf_r', 'foot_l', 'foot_r'];
const PATTERN = { solid: 0, stripes: 1, hoops: 2, sash: 3, band: 4, halves: 5, center: 6 };

/* ---------- utilidades ---------- */
const eul = new THREE.Euler(), qa = new THREE.Quaternion(), qb = new THREE.Quaternion(), qc = new THREE.Quaternion();
const m4 = new THREE.Matrix4(), m4b = new THREE.Matrix4();
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const wrap = a => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };
function setE(q, x, y, z) { eul.set(x, y, z, 'XYZ'); return q.setFromEuler(eul); }
function lum(hex) { const c = new THREE.Color(hex); return .2126 * c.r + .7152 * c.g + .0722 * c.b; }

/* ---------- material con colores por zona ---------- */
function kitMaterial(kit, skinIdx) {
  const key = [kit.shirt, kit.c2, kit.pat, kit.sleeve, kit.shorts, kit.socks, skinIdx].join('|');
  let m = kitMats.get(key); if (m) return m;
  m = new THREE.MeshStandardMaterial({ map: bodyMap, roughness: .88, metalness: 0 });
  const t = SKIN_TINT[skinIdx];
  const U = {
    uJ1: { value: new THREE.Color(kit.shirt) }, uJ2: { value: new THREE.Color(kit.c2 || kit.shirt) },
    uSl: { value: new THREE.Color(kit.sleeve || kit.shirt) }, uSh: { value: new THREE.Color(kit.shorts) },
    uSk: { value: new THREE.Color(kit.socks) }, uBoot: { value: new THREE.Color('#14161a') },
    uSkin: { value: new THREE.Color().setRGB(t[0], t[1], t[2], THREE.LinearSRGBColorSpace) },
    uPat: { value: PATTERN[kit.pat] || 0 }
  };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vRest;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvRest = position;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
varying vec3 vRest;
uniform vec3 uJ1,uJ2,uSl,uSh,uSk,uBoot,uSkin; uniform float uPat;`)
      .replace('#include <map_fragment>', `#include <map_fragment>
{
  vec3 col = diffuseColor.rgb * uSkin;
  float y = vRest.y, ax = abs(vRest.x);
  if (y > 0.93) {
    if (y > 1.505 && ax < 0.13) { /* cuello y cabeza: piel */ }
    else if (y > 1.56) { /* cabeza */ }
    else if (ax < 0.225) {
      vec3 j = uJ1;
      if (uPat < 1.5) { if (uPat > 0.5) j = (fract(vRest.x / 0.095 + 0.5) < 0.5) ? uJ1 : uJ2; }
      else if (uPat < 2.5) { j = (fract(vRest.y / 0.17) < 0.5) ? uJ1 : uJ2; }
      else if (uPat < 3.5) { if (abs(vRest.x + (vRest.y - 1.22) * 0.55) < 0.06) j = uJ2; }
      else if (uPat < 4.5) { if (y > 1.17 && y < 1.30) j = uJ2; }
      else if (uPat < 5.5) { if (vRest.x > 0.0) j = uJ2; }
      else { if (ax < 0.045) j = uJ2; }
      col = j;
    }
    else if (y > 1.30 && y < 1.62) { if (ax < 0.40) col = uSl; }
  }
  else if (y > 0.62) { col = uSh; }
  else if (y > 0.52) { /* muslo/rodilla: piel */ }
  else if (y > 0.11) { col = uSk; }
  else { col = uBoot; }
  diffuseColor.rgb = col;
}`);
  };
  m.customProgramCacheKey = () => 'kitmat';
  kitMats.set(key, m);
  return m;
}

/* ---------- carga ---------- */
async function load() {
  const loader = new GLTFLoader();
  const [body, hb, hp, hd] = await Promise.all([
    loader.loadAsync(BASE + 'player.gltf'),
    loader.loadAsync(BASE + 'Hair_Buzzed.gltf'),
    loader.loadAsync(BASE + 'Hair_SimpleParted.gltf'),
    loader.loadAsync(BASE + 'Hair_Beard.gltf')
  ]);
  src = body.scene; src.updateMatrixWorld(true);
  src.traverse(o => {
    if (o.isBone) {
      const wq = new THREE.Quaternion(); o.matrixWorld.decompose(new THREE.Vector3(), wq, new THREE.Vector3());
      rest[o.name] = { wQ: wq, lQ: o.quaternion.clone(), lP: o.position.clone(), wM: o.matrixWorld.clone() };
    }
    if (o.isSkinnedMesh && o.material && o.material.name === 'MI_Superhero_Male') bodyMap = o.material.map;
  });
  const root = src.getObjectByName('root');
  root.parent.matrixWorld.decompose(new THREE.Vector3(), armQ, new THREE.Vector3());
  for (const [k, g] of [['buzzed', hb], ['parted', hp], ['beard', hd]]) {
    let mesh = null; g.scene.traverse(o => { if (o.isMesh && !mesh) mesh = o; });
    hairSrc[k] = mesh;
  }
}

/* ---------- escena ---------- */
function radialTex() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 2, 32, 32, 31);
  gr.addColorStop(0, 'rgba(0,0,0,.85)'); gr.addColorStop(.6, 'rgba(0,0,0,.4)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function ballTexture() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 128;
  const g = c.getContext('2d'); g.fillStyle = '#f6f6f1'; g.fillRect(0, 0, 256, 128);
  g.fillStyle = '#23252a';
  for (let j = 0; j < 3; j++) for (let i = 0; i < 6; i++) {
    const x = i * 43 + (j % 2) * 21 + 12, y = 20 + j * 44;
    g.beginPath(); for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + k * 2 * Math.PI / 5; g.lineTo(x + Math.cos(a) * 13, y + Math.sin(a) * 13); } g.closePath(); g.fill();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
function initScene() {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x7d9a7d, 1.75));
  const dl = new THREE.DirectionalLight(0xffffff, 2.2); dl.position.set(-8, 18, 10); scene.add(dl);
  camP = new THREE.PerspectiveCamera(60, 1, .3, 400);
  camO = new THREE.OrthographicCamera(-10, 10, 10, -10, .1, 100);
  shadowTex = radialTex();
  const plane = new THREE.PlaneGeometry(1, 1); plane.rotateX(-Math.PI / 2);
  PL3D._shadowGeo = plane;
  ballMesh = new THREE.Mesh(new THREE.SphereGeometry(.28, 24, 16), new THREE.MeshStandardMaterial({ map: ballTexture(), roughness: .55 }));
  ballMesh.frustumCulled = false; scene.add(ballMesh);
  ballShadow = shadowMesh(); scene.add(ballShadow);
}
function shadowMesh() {
  const m = new THREE.Mesh(PL3D._shadowGeo, new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: .4 }));
  m.renderOrder = -1; m.frustumCulled = false; return m;
}

/* ---------- jugador ---------- */
function numTexture(num, ink) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'); g.font = '900 96px Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.lineJoin = 'round'; g.lineWidth = 8; g.strokeStyle = ink === '#fff' ? 'rgba(0,0,0,.55)' : 'rgba(255,255,255,.7)';
  g.strokeText(String(num), 64, 70); g.fillStyle = ink; g.fillText(String(num), 64, 70);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
function attachToBone(bone, obj, modelM) { // modelM: matriz en el espacio del modelo (pose de reposo)
  const r = rest[bone.name];
  m4.copy(r.wM).invert().multiply(modelM);
  obj.matrixAutoUpdate = false; obj.matrix.copy(m4); obj.matrixWorldNeedsUpdate = true;
  bone.add(obj);
}
function makeRig() {
  const clone = SkeletonUtils.clone(src);
  const inner = new THREE.Group(); inner.add(clone);
  const holder = new THREE.Group(); holder.add(inner);
  const bones = {}, list = [], cur = {};
  clone.traverse(o => { if (o.isBone) { bones[o.name] = o; list.push(o); cur[o.name] = new THREE.Quaternion(); } if (o.isMesh || o.isSkinnedMesh) o.frustumCulled = false; });
  const rig = { holder, inner, clone, bones, list, cur, dq: {}, key: '', shadow: shadowMesh(), hairObj: null, nums: [], bodyMesh: null, browMat: null, headBone: bones.Head };
  for (const n of DRIVEN) rig.dq[n] = new THREE.Quaternion();
  clone.traverse(o => {
    if (!o.isSkinnedMesh) return;
    const nm = o.material && o.material.name;
    if (nm === 'MI_Superhero_Male') rig.bodyMesh = o;
    else if (nm === 'MI_Hair_1') { rig.browMat = o.material = new THREE.MeshStandardMaterial({ color: '#2a2018', roughness: .9, side: THREE.DoubleSide }); }
  });
  scene.add(holder); scene.add(rig.shadow);
  return rig;
}
function syncKit(rig, p, kit) {
  const gk = p.role === 'GK';
  const k = gk ? { shirt: kit.gk, c2: kit.gk, pat: 'solid', sleeve: kit.gk, shorts: kit.gkShorts || '#20242a', socks: kit.gkShorts || '#20242a' } : kit;
  let sk = SKIN_HEX.indexOf(p.skin); if (sk < 0) sk = 1;
  const key = [k.shirt, k.c2, k.pat, k.sleeve, k.shorts, k.socks, sk, p.num, p.hair, p.i].join('|');
  if (rig.key === key) return; rig.key = key;
  rig.bodyMesh.material = kitMaterial(k, sk);
  rig.browMat.color.set(p.hair);
  // pelo (por jugador)
  if (rig.hairObj) { for (const h of rig.hairObj) h.parent && h.parent.remove(h); }
  rig.hairObj = [];
  const style = p.i % 4, parts = style === 0 ? ['buzzed'] : style === 2 ? ['buzzed', 'beard'] : ['parted'];
  for (const nme of parts) {
    const o = hairSrc[nme].clone(); o.material = new THREE.MeshStandardMaterial({ color: nme === 'beard' ? new THREE.Color(p.hair).multiplyScalar(.9) : p.hair, roughness: .9, side: THREE.DoubleSide });
    o.frustumCulled = false; attachToBone(rig.headBone, o, new THREE.Matrix4()); rig.hairObj.push(o);
  }
  // dorsal (espalda y pecho)
  for (const n of rig.nums) { n.parent && n.parent.remove(n); n.material.map.dispose(); n.material.dispose(); }
  rig.nums = [];
  const ink = lum(k.shirt) > .5 ? '#101418' : '#ffffff';
  const mk = (sz, y, z, flip) => {
    const mat = new THREE.MeshBasicMaterial({ map: numTexture(p.num, ink), transparent: true, alphaTest: .35, side: THREE.FrontSide, depthWrite: false });
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(sz, sz), mat); pl.frustumCulled = false; pl.renderOrder = 2;
    const mm = new THREE.Matrix4().makeTranslation(0, y, z); if (flip) mm.multiply(new THREE.Matrix4().makeRotationY(Math.PI));
    attachToBone(rig.bones.spine_03, pl, mm); rig.nums.push(pl);
  };
  if (!gk || true) { mk(.30, 1.25, -.168, true); mk(.13, 1.33, .137, false); }
}

function leg(phi, amp) { return { t: .85 * amp * Math.sin(phi) + .03, k: amp * (.12 + 1.05 * Math.max(0, Math.cos(phi))) + .06 }; }
const smooth = x => x * x * (3 - 2 * x);

function poseRig(rig, p, o, sc) {
  const ball = o.ball, S = o.S, time = o.time;
  const sp = Math.hypot(p.vx, p.vy), amp = Math.min(1, sp / 5.5), ph = p.phase, gk = p.role === 'GK';
  let heading = p.face, tilt = 0, lift = 0, jump = 0;
  const dq = rig.dq;
  // ---- estados especiales ----
  let slide = 0, dive = 0;
  if (p.lunge > 0) {
    heading = Math.atan2(p.ly, p.lx);
    const u = 1 - clamp(p.lunge / .5, 0, 1), k = smooth(Math.min(1, u * 5)) * smooth(Math.min(1, (1 - u) * 4));
    if (gk) dive = k; else slide = k;
  }
  const celeb = S.mode === 'goal' && p.t === S.scoreTeam;
  // ---- piernas ----
  let L = leg(ph, amp), R = leg(ph + Math.PI, amp);
  if (p.kickT > 0 && !slide && !dive) {
    const u = 1 - clamp(p.kickT / .25, 0, 1);
    R = u < .35 ? { t: -.7 * (u / .35), k: 1.2 } : u < .6 ? { t: -.7 + (u - .35) / .25 * 2.05, k: .2 } : { t: 1.35 - (u - .6) / .4 * 1.0, k: .6 };
  }
  if (slide) { L = { t: .15, k: .1 }; R = { t: .55, k: .05 }; }
  if (dive) { L = { t: -.25, k: .15 }; R = { t: -.1, k: .1 }; }
  const crouch = gk && sp < 1.2 && !dive ? .45 : 0;
  if (crouch) { L.t += crouch; R.t += crouch; L.k += crouch * 1.9; R.k += crouch * 1.9; }
  const legs = [['thigh_l', 'calf_l', 'foot_l', L], ['thigh_r', 'calf_r', 'foot_r', R]];
  for (const [th, ca, ft, g] of legs) {
    setE(dq[th], -g.t, 0, 0); setE(dq[ca], -g.t + g.k, 0, 0); setE(dq[ft], -.15 * g.t + .35 * g.k, 0, 0);
  }
  // ---- brazos ----
  let aL = -.75 * amp * Math.sin(ph), aR = .75 * amp * Math.sin(ph);
  let spread = 1.26 - .06 * amp, bend = .25 + .95 * amp;
  if (gk && sp < 1.2 && !dive) { spread = .8; bend = .5; aL = aR = .35; }
  if (slide) { spread = 1.0; bend = .3; aL = aR = -.2; }
  if (dive) { spread = -1.25; bend = 0; aL = aR = 0; }
  if (celeb) { spread = -.55 + .25 * Math.sin(time * 9); bend = .2; aL = aR = 0; }
  if (p.kickT > 0 && !slide && !dive) { aL = -.6; aR = .5; }
  setE(dq.upperarm_l, -aL, 0, -spread); setE(dq.upperarm_r, -aR, 0, spread);
  setE(dq.lowerarm_l, -(aL + bend), 0, -spread); setE(dq.lowerarm_r, -(aR + bend), 0, spread);
  // ---- torso y cabeza ----
  const lean = (.05 + .20 * amp) + (crouch ? .25 : 0) + (dive ? 0 : 0);
  const tw = .16 * amp * Math.sin(ph);
  setE(dq.pelvis, -.04 * amp, -tw * .6, 0);
  setE(dq.spine_01, -lean * .35, tw * .3, 0); setE(dq.spine_02, -lean * .7, tw * .7, 0); setE(dq.spine_03, -lean, tw, 0);
  let yaw = 0;
  if (ball) { const d = wrap(Math.atan2(ball.y - p.y, ball.x - p.x) - heading); yaw = -clamp(d, -1.1, 1.1) * .65; }
  setE(dq.neck_01, -lean * .3, yaw * .45, 0); setE(dq.Head, -lean * .2, yaw * .55, 0);
  // ---- transformaciones del cuerpo ----
  const bob = .035 * amp * Math.abs(Math.sin(ph)) - (crouch ? .07 : 0) + (celeb ? .09 * Math.abs(Math.sin(time * 9)) : 0);
  rig.bones.pelvis.position.copy(rest.pelvis.lP); rig.bones.pelvis.position.y += bob;
  rig.holder.position.set(p.y, 0, -p.x);
  rig.holder.rotation.y = Math.PI - heading;
  rig.inner.scale.setScalar(sc);
  rig.inner.rotation.x = slide ? -1.22 * slide : dive ? 1.25 * dive : 0;
  rig.inner.position.set(0, slide ? .24 * sc * slide : dive ? .45 * sc * dive : 0, 0);
  // sombra
  const sh = rig.shadow, big = (slide || dive) ? 1.5 : 1;
  sh.position.set(p.y, .02, -p.x); sh.scale.set(1.15 * sc * big, 1, 1.15 * sc * big);
}

function applyBones(rig) {
  for (const b of rig.list) {
    const n = b.name, pw = b.parent && b.parent.isBone ? rig.cur[b.parent.name] : armQ, d = rig.dq[n];
    if (d) { qa.copy(d).multiply(rest[n].wQ); rig.cur[n].copy(qa); b.quaternion.copy(qb.copy(pw).invert()).multiply(qa); }
    else { b.quaternion.copy(rest[n].lQ); rig.cur[n].copy(pw).multiply(rest[n].lQ); }
  }
}

/* ---------- API pública ---------- */
let lastBall = null, lastW = 0, lastH = 0, lastD = 0;
PL3D.frame = function (o) {
  if (!PL3D.ready) return false;
  const { VW, VH, DPR } = o;
  if (VW !== lastW || VH !== lastH || DPR !== lastD) { lastW = VW; lastH = VH; lastD = DPR; renderer.setPixelRatio(DPR); renderer.setSize(VW, VH, false); }
  canvas.style.display = 'block';
  let cam, sc;
  if (o.view === 0) { // aérea: ortográfica desde arriba, igual que el campo 2D
    const c = o.cam, s = c.s, cx = c.x - c.shx, cy = c.y - c.shy;
    camO.left = -VW / 2 / s; camO.right = VW / 2 / s; camO.top = VH / 2 / s; camO.bottom = -VH / 2 / s; camO.updateProjectionMatrix();
    camO.position.set(cy, 40, -cx); camO.up.set(c.portrait ? 0 : -1, 0, c.portrait ? -1 : 0); camO.lookAt(cy, 0, -cx);
    cam = camO; sc = 1.45;
  } else { // perspectiva: misma cámara (PJ) que dibuja el campo
    const J = o.PJ, a = Math.atan2(J.sa, J.ca), n = .3, f = 400;
    camP.position.set(J.y, J.h, -J.x); camP.rotation.set(-a, 0, 0);
    camP.projectionMatrix.set(2 * J.F / VW, 0, 1 - 2 * J.cx / VW, 0,
      0, 2 * J.F / VH, 2 * J.cy / VH - 1, 0,
      0, 0, -(f + n) / (f - n), -2 * f * n / (f - n),
      0, 0, -1, 0);
    camP.projectionMatrixInverse.copy(camP.projectionMatrix).invert();
    cam = camP; sc = 1.15;
  }
  const P = o.P;
  for (let i = 0; i < rigs.length; i++) if (i >= P.length) { rigs[i].holder.visible = false; rigs[i].shadow.visible = false; }
  for (let i = 0; i < P.length; i++) {
    const p = P[i]; let rig = rigs[i]; if (!rig) rig = rigs[i] = makeRig();
    rig.holder.visible = rig.shadow.visible = true;
    syncKit(rig, p, o.TEAMS[p.t]);
    poseRig(rig, p, o, sc);
    applyBones(rig);
  }
  // pelota
  const b = o.ball, r = .28;
  ballMesh.position.set(b.y, b.z + r, -b.x);
  if (lastBall) {
    const dx = ballMesh.position.x - lastBall.x, dz = ballMesh.position.z - lastBall.z, d = Math.hypot(dx, dz);
    if (d > 1e-5 && d < 3) { qc.setFromAxisAngle(new THREE.Vector3(dz, 0, -dx).normalize(), d / r); ballMesh.quaternion.premultiply(qc); }
  } else lastBall = new THREE.Vector3();
  lastBall.copy(ballMesh.position);
  ballShadow.position.set(b.y, .02, -b.x);
  const bs = r * 2.2 * (1 - Math.min(.4, b.z * .06)); ballShadow.scale.set(bs, 1, bs);
  ballShadow.material.opacity = .45 - Math.min(.25, b.z * .06);
  renderer.render(scene, cam);
  return true;
};
PL3D.hide = function () { canvas.style.display = 'none'; };

(async function boot() {
  try {
    initScene();
    await load();
    PL3D.ready = true;
  } catch (e) {
    PL3D.failed = true; PL3D.error = e; console.warn('Jugadores 3D no disponibles, se usan los 2D:', e);
    canvas.style.display = 'none';
  }
})();
