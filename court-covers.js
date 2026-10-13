(function () {
if (!window.THREE || !THREE.OrbitControls) { window.ccFallback && window.ccFallback(); return; }
try {
const IN = 1 / 12;
const DATA = {
  A: { title: 'Tennis and basketball cover', note: 'One curved roof over the whole court, 4 frames',
    posts: [[-31, -34, 20, 'C'], [31, 34, 20, 'C']], raf: [{ p1: [-34, 20], p2: [34, 20], sag: 4, u0: -39, u1: 39, d: 23.7, bf: 8.97 }],
    col: { d: 23.7, bf: 8.97 }, colI: null, frames: [0, 128 / 3, 256 / 3, 128], roof: [-5, 133], purlinD: 10, braced: 1,
    pier: 4, pierL: 25, slab: { u: [-28.5, 28.5], v: [-1, 129], kind: 'tennis' },
    rows: [['Roof', '78 ft x 138 ft'], ['Clear span', '68 ft between post tops'], ['Height', '20 ft at the eaves, 24 ft at the crown'], ['Frames', '4 curved steel frames, rafters rolled to a radius'], ['Posts', 'Slanted outward for more shade, 5 ft overhang'], ['Bracing', 'Rod X-bracing in the middle bay'], ['Foundations', 'Drilled concrete piers into the shale']] },
  B: { title: 'Padel and pickleball cover', note: 'Two roof tiers that step at a middle post line',
    posts: [[8, 5, 16, 'C'], [47.5, 47.5, 21, 'I'], [87, 90, 15, 'C']],
    raf: [{ p1: [5, 16], p2: [47.5, 21], sag: 2, u0: 0, u1: 52.5, d: 17.7, bf: 6.0 }, { p1: [47.5, 17.5], p2: [90, 15], sag: 0.4, u0: 47.5, u1: 95, d: 17.7, bf: 6.0 }],
    col: { d: 13.8, bf: 6.73 }, colI: { d: 13.7, bf: 8.0 }, frames: [0, 1, 2, 3].map(i => i * 70 / 3), roof: [-5, 75], purlinD: 10, braced: 1,
    pier: 2.5, pierL: 27, slab: { u: [10.5, 84.5], v: [0, 70], kind: 'pickle' },
    rows: [['Roof', '95 ft x 80 ft'], ['Layout', 'High tier over padel, low tier over pickleball'], ['Height', '15 to 21 ft, stepping at the middle posts'], ['Frames', '4 curved steel frames'], ['Middle posts', 'In the walkway between the courts'], ['Bracing', 'Rod X-bracing in the middle bay'], ['Foundations', 'Drilled concrete piers into the shale']] },
};

function arc(p1, p2, sag) {
  const [x1, y1] = p1, [x2, y2] = p2, ch = Math.hypot(x2 - x1, y2 - y1);
  const R = (ch * ch / 4 + sag * sag) / (2 * sag);
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, nx = -(y2 - y1) / ch, ny = (x2 - x1) / ch;
  const cx = mx - nx * (R - sag), cy = my - ny * (R - sag);
  return x => cy + Math.sqrt(R * R - (x - cx) * (x - cx));
}

const stage = document.getElementById('stage');
const canvas = document.createElement('canvas'); canvas.setAttribute('aria-hidden', 'true'); stage.appendChild(canvas);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, 1, 0.5, 2000);
const controls = new THREE.OrbitControls(camera, canvas);
controls.enableDamping = true; controls.maxPolarAngle = Math.PI * 0.495;

scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8f86, 0.65));
const sun = new THREE.DirectionalLight(0xffffff, 0.85);
sun.position.set(-90, 140, 60); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -120, right: 120, top: 120, bottom: -120, near: 10, far: 400 });
scene.add(sun);

const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const M = {
  steel: new THREE.MeshStandardMaterial({ color: 0x3b4650, metalness: 0.55, roughness: 0.45 }),
  purlin: new THREE.MeshStandardMaterial({ color: 0x8c969e, metalness: 0.5, roughness: 0.5 }),
  roof: new THREE.MeshStandardMaterial({ color: 0x9aa7b0, metalness: 0.3, roughness: 0.5, transparent: true, opacity: 0.42, side: THREE.DoubleSide, depthWrite: false }),
  conc: new THREE.MeshStandardMaterial({ color: 0xbdb8ae, roughness: 0.95 }),
  rod: new THREE.LineBasicMaterial({ color: 0xb5532a }),
  ground: new THREE.MeshStandardMaterial({ color: 0xc9cfc4, roughness: 1, transparent: true, opacity: 1 }),
};

let group = null, groundMesh = null;

function box(len, h, w, mat) { const m = new THREE.Mesh(new THREE.BoxGeometry(len, h, w), mat); m.castShadow = true; m.receiveShadow = true; return m; }
// member between two points in the frame plane (x = u, y = height) at depth z
function member(a, b, d, w, z, mat) {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const m = box(L, d, w, mat);
  m.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, z);
  m.rotation.z = Math.atan2(b[1] - a[1], b[0] - a[0]);
  return m;
}

function courtTexture(kind, wFt, lFt) {
  const s = 8, cv = document.createElement('canvas');
  cv.width = Math.round(wFt * s); cv.height = Math.round(lFt * s);
  const g = cv.getContext('2d');
  g.fillStyle = kind === 'tennis' ? '#3d6b8c' : '#3f6f5a'; g.fillRect(0, 0, cv.width, cv.height);
  g.strokeStyle = '#f2f2f2'; g.lineWidth = 2;
  const rect = (x, y, w, h) => g.strokeRect(x * s, y * s, w * s, h * s);
  if (kind === 'tennis') {
    const x0 = (wFt - 36) / 2, y0 = (lFt - 78) / 2;
    g.fillStyle = '#5f8a3e'; g.fillRect(x0 * s, y0 * s, 36 * s, 78 * s);
    rect(x0, y0, 36, 78); rect(x0 + 4.5, y0, 27, 78);
    g.beginPath(); g.moveTo((x0 + 4.5) * s, (y0 + 18) * s); g.lineTo((x0 + 31.5) * s, (y0 + 18) * s);
    g.moveTo((x0 + 4.5) * s, (y0 + 60) * s); g.lineTo((x0 + 31.5) * s, (y0 + 60) * s);
    g.moveTo((x0 + 18) * s, (y0 + 18) * s); g.lineTo((x0 + 18) * s, (y0 + 60) * s);
    g.moveTo(x0 * s, (y0 + 39) * s); g.lineTo((x0 + 36) * s, (y0 + 39) * s); g.stroke();
  } else {
    const half = wFt / 2;
    // padel 10 x 20 m on the west, pickleball 20 x 44 ft on the east (slab starts 10.5 ft from the west roof edge)
    { const x0 = 0, y0 = (lFt - 65.6) / 2, w = 32.8, l = 65.6;
      g.fillStyle = '#4b7fa3'; g.fillRect(x0 * s, y0 * s, w * s, l * s); rect(x0, y0, w, l);
      g.beginPath(); g.moveTo(x0 * s, (y0 + l / 2) * s); g.lineTo((x0 + w) * s, (y0 + l / 2) * s);
      [l / 2 - 22.8, l / 2 + 22.8].forEach(y => { g.moveTo(x0 * s, (y0 + y) * s); g.lineTo((x0 + w) * s, (y0 + y) * s); });
      g.moveTo((x0 + w / 2) * s, (y0 + l / 2 - 22.8) * s); g.lineTo((x0 + w / 2) * s, (y0 + l / 2 + 22.8) * s); g.stroke(); }
    { const x0 = 41.5 + 6.25, y0 = (lFt - 44) / 2, w = 20, l = 44;
      g.fillStyle = '#5f8a3e'; g.fillRect((x0 - 5) * s, (y0 - 10) * s, (w + 10) * s, (l + 20) * s);
      g.fillStyle = '#4b7fa3'; g.fillRect(x0 * s, y0 * s, w * s, l * s); rect(x0, y0, w, l);
      g.beginPath(); g.moveTo(x0 * s, (y0 + 22) * s); g.lineTo((x0 + w) * s, (y0 + 22) * s);
      [15, 29].forEach(y => { g.moveTo(x0 * s, (y0 + y) * s); g.lineTo((x0 + w) * s, (y0 + y) * s); });
      g.moveTo((x0 + 10) * s, y0 * s); g.lineTo((x0 + 10) * s, (y0 + 15) * s); g.moveTo((x0 + 10) * s, (y0 + 29) * s); g.lineTo((x0 + 10) * s, (y0 + 44) * s); g.stroke(); }
  }
  const t = new THREE.CanvasTexture(cv); t.anisotropy = 4; return t;
}

function build(key) {
  if (group) scene.remove(group);
  const D = DATA[key]; group = new THREE.Group();
  const v0 = D.frames[0], v1 = D.frames[D.frames.length - 1];
  const uMin = Math.min(...D.raf.map(r => r.u0)), uMax = Math.max(...D.raf.map(r => r.u1));
  const cu = (uMin + uMax) / 2, cv = (D.roof[0] + D.roof[1]) / 2;
  const arcs = D.raf.map(r => arc(r.p1, r.p2, r.sag));
  const yTop = (u) => { let y = -1; D.raf.forEach((r, i) => { if (u >= r.u0 - 0.01 && u <= r.u1 + 0.01) y = Math.max(y, arcs[i](u)); }); return y; };

  // frames
  D.frames.forEach(z => {
    D.raf.forEach((r, i) => {
      const n = 40, f = arcs[i];
      for (let j = 0; j < n; j++) {
        const ua = r.u0 + (r.u1 - r.u0) * j / n, ub = r.u0 + (r.u1 - r.u0) * (j + 1) / n;
        const dd = r.d * IN;
        group.add(member([ua, f(ua) - dd / 2], [ub, f(ub) - dd / 2], dd, r.bf * IN, z, M.steel));
      }
    });
    D.posts.forEach(([ub, ut, yt, t]) => {
      const c = t === 'I' ? D.colI : D.col;
      let under = yt; D.raf.forEach((r, i) => { if (ut >= r.u0 - 0.01 && ut <= r.u1 + 0.01 && Math.abs(arcs[i](ut) - yt) < 0.6) under = yt - r.d * IN; });
      group.add(member([ub, 0.4], [ut, under], c.bf * IN, c.d * IN, z, M.steel));
      const bp = box(c.d * IN * 1.4, 0.15, c.bf * IN * 1.9, M.steel); bp.position.set(ub, 0.45, z); group.add(bp);
      const pc = new THREE.Mesh(new THREE.CylinderGeometry(D.pier / 2, D.pier / 2, D.pierL, 24), M.conc);
      pc.position.set(ub, 0.5 - D.pierL / 2, z); pc.castShadow = true; group.add(pc);
    });
  });
  // purlins along the cover on each roof tier
  D.raf.forEach((r, i) => {
    const f = arcs[i], n = Math.ceil((r.u1 - r.u0) / 5);
    for (let j = 0; j <= n; j++) {
      const u = r.u0 + (r.u1 - r.u0) * j / n;
      const p = box(0.35, D.purlinD * IN, D.roof[1] - D.roof[0], M.purlin);
      p.position.set(u, f(u) + D.purlinD * IN / 2, cv); group.add(p);
    }
    // roof panel
    const nu = 60, pos = [], idx = [];
    for (let j = 0; j <= nu; j++) {
      const u = r.u0 + (r.u1 - r.u0) * j / nu, y = f(u) + D.purlinD * IN + 0.05;
      pos.push(u, y, D.roof[0], u, y, D.roof[1]);
      if (j < nu) { const a = 2 * j; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    const roof = new THREE.Mesh(g, M.roof); roof.name = 'roof'; roof.castShadow = true; group.add(roof);
  });
  // eave struts at the post tops
  D.posts.forEach(([ub, ut, yt]) => {
    const s = box(0.6, 0.6, v1 - v0, M.steel); s.position.set(ut, yt - 1.1, (v0 + v1) / 2); group.add(s);
  });
  // rod bracing: wall X on the outer post lines, roof X in panels in the braced bay
  const za = D.frames[D.braced], zb = D.frames[D.braced + 1], rods = [];
  const outer = [D.posts[0], D.posts[D.posts.length - 1]];
  outer.forEach(([ub, ut, yt]) => { rods.push([ub, 0.6, za, ut, yt - 1.2, zb], [ub, 0.6, zb, ut, yt - 1.2, za]); });
  D.raf.forEach((r, i) => {
    const inner = D.posts.map(p => p[1]).filter(u => u >= r.u0 - 0.01 && u <= r.u1 + 0.01);
    if (inner.length < 2) return;
    const a = Math.min(...inner), b = Math.max(...inner), np = Math.max((b - a) > 1.3 * (zb - za) ? 2 : 1, Math.round((b - a) / ((zb - za) * 1.15)));
    for (let j = 0; j < np; j++) {
      const p = a + (b - a) * j / np, q = a + (b - a) * (j + 1) / np, f = arcs[i];
      rods.push([p, f(p) - 0.3, za, q, f(q) - 0.3, zb], [q, f(q) - 0.3, za, p, f(p) - 0.3, zb]);
    }
  });
  rods.forEach(r => { const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(r[0], r[1], r[2]), new THREE.Vector3(r[3], r[4], r[5])]); group.add(new THREE.Line(g, M.rod)); });
  // court slab
  const sw = D.slab.u[1] - D.slab.u[0], sl = D.slab.v[1] - D.slab.v[0];
  const slab = new THREE.Mesh(new THREE.BoxGeometry(sw, 0.5, sl), [M.conc, M.conc, new THREE.MeshStandardMaterial({ map: courtTexture(D.slab.kind, sw, sl), roughness: 0.9 }), M.conc, M.conc, M.conc]);
  slab.position.set((D.slab.u[0] + D.slab.u[1]) / 2, 0.2, (D.slab.v[0] + D.slab.v[1]) / 2); slab.receiveShadow = true; group.add(slab);

  group.position.set(-cu, 0, -cv);
  scene.add(group);
  setRoof();
  // camera
  const span = Math.max(uMax - uMin, D.roof[1] - D.roof[0]);
  camera.position.set(span * 0.95, span * 0.55, span * 1.05);
  controls.target.set(0, 9, 0); controls.update();
  // card
  document.getElementById('cc-facts').innerHTML = `<h3>${D.title}</h3><p>${D.note}</p><dl>${D.rows.map(r => `<dt>${r[0]}</dt><dd>${r[1]}</dd>`).join('')}</dl>`;
}

function setRoof() { if (group) group.traverse(o => { if (o.name === 'roof') o.visible = document.getElementById('t-roof').checked; }); }
function setFnd() { const on = document.getElementById('t-fnd').checked; M.ground.opacity = on ? 0.35 : 1; M.ground.depthWrite = !on; M.ground.needsUpdate = true; }

function theme() {
  scene.background = null;
  M.ground.color = new THREE.Color(css('--line') || '#DDD2C2');
  M.rod.color = new THREE.Color(css('--accent') || '#AB5F3A');
}
groundMesh = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), M.ground);
groundMesh.rotation.x = -Math.PI / 2; groundMesh.receiveShadow = true; scene.add(groundMesh);

function resize() {
  const r = stage.getBoundingClientRect();
  renderer.setSize(r.width, r.height, false); camera.aspect = r.width / Math.max(1, r.height); camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', theme);
new MutationObserver(theme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

document.querySelectorAll('.tabs button').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('.tabs button').forEach(x => { x.setAttribute('aria-selected', String(x === b)); x.tabIndex = x === b ? 0 : -1; });
  build(b.dataset.k);
}));
document.getElementById('t-roof').addEventListener('change', setRoof);
document.getElementById('t-fnd').addEventListener('change', setFnd);

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
function loop() {
  controls.autoRotate = document.getElementById('t-spin').checked && !reduce; controls.autoRotateSpeed = 0.6;
  controls.update(); renderer.render(scene, camera); requestAnimationFrame(loop);
}
theme(); resize(); build('A'); loop(); window.ccReady = true; const msg = document.getElementById('x3d-msg'); if (msg) msg.remove();

} catch (e) { window.ccFallback && window.ccFallback(); }
})();
