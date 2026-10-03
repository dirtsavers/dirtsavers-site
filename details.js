/* DirtSavers exploded details. Units are feet, y is up. Zoom in (wheel, pinch, slider) and the detail comes apart and turns. */
(function () {
  const stage = document.getElementById('stage');
  if (!stage || window.x3dFailed) return;
  const fail = why => { if (window.x3dFallback) window.x3dFallback(why); };
  if (!window.THREE) { fail('no-three'); return; }
  const T = THREE;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- renderer / scene ---------- */
  let renderer;
  try {
    renderer = new T.WebGLRenderer({ antialias: true, alpha: true });
    if (!renderer.getContext()) throw new Error('no context');
  } catch (err) { fail('no-webgl'); return; }
  renderer.domElement.addEventListener('webglcontextlost', e => { e.preventDefault(); fail('lost'); });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  stage.appendChild(renderer.domElement);
  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(35, 1, 0.1, 400);
  scene.add(new T.HemisphereLight(0xfff4e6, 0x6b5a48, 0.7));
  const sun = new T.DirectionalLight(0xffe7c7, 0.95);
  sun.position.set(14, 26, 18);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 90 });
  scene.add(sun);
  const fill = new T.DirectionalLight(0xc9d6e6, 0.35);
  fill.position.set(-18, 10, -10);
  scene.add(fill);
  const ground = new T.Mesh(new T.PlaneGeometry(200, 200), new T.ShadowMaterial({ opacity: 0.16 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  /* ---------- helpers ---------- */
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const mat = (c, o = {}) => new T.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.9, metalness: 0 }, o));
  const M = {
    concrete: mat(0xbdb7ac), concreteDk: mat(0xa9a397),
    rebar: mat(0x7b4a2e, { roughness: 0.6, metalness: 0.35 }),
    block: [mat(0xcdbb9c), mat(0xc4b193), mat(0xd6c6a8), mat(0xbfab8b)],
    stone: [mat(0xcbb28a), mat(0xb99d78), mat(0xd8c3a0), mat(0xa98d6b), mat(0xc7a57c)],
    brick: [mat(0xa65a3e), mat(0x9a4f36), mat(0xb3664a), mat(0x8f4a33)],
    gravel: mat(0x9d968a, { transparent: true, opacity: 0.55 }), pebble: mat(0x8e877c),
    fabric: null,
    fill: mat(0x9b7652, { transparent: true, opacity: 0.32, depthWrite: false }),
    soil: mat(0x8c6c4c, { transparent: true, opacity: 0.28, depthWrite: false }),
    pipe: mat(0x2f3134, { roughness: 0.5 }), cap: mat(0xd9d0c0), capDk: mat(0xcbbfa9),
    mortar: mat(0xd8d2c6), panel: mat(0x39322c, { roughness: 0.5, metalness: 0.2 }),
    tie: mat(0x9aa2a8, { metalness: 0.6, roughness: 0.4 })
  };
  M.fabric = new T.MeshStandardMaterial({ map: fabricTex(), roughness: 0.85, metalness: 0, transparent: true, opacity: 0.94, side: T.DoubleSide });
  const edgeMat = new T.LineBasicMaterial({ color: 0x3a322b, transparent: true, opacity: 0.22 });
  function box(w, h, d, m, x, y, z, edges = true) {
    const g = new T.BoxGeometry(w, h, d);
    const me = new T.Mesh(g, m);
    me.position.set(x, y, z);
    me.castShadow = !m.transparent; me.receiveShadow = true;
    if (edges && !m.transparent) me.add(new T.LineSegments(new T.EdgesGeometry(g), edgeMat));
    return me;
  }
  function cmuBox(w, h, d, m, x, y, z) { // hollow concrete block: two open cells through the unit
    const L = Math.max(w, d), S = Math.min(w, d), fs = Math.min(0.11, S * 0.18), web = 0.1;
    const sh = new T.Shape(); sh.moveTo(-L / 2, -S / 2); sh.lineTo(L / 2, -S / 2); sh.lineTo(L / 2, S / 2); sh.lineTo(-L / 2, S / 2); sh.lineTo(-L / 2, -S / 2);
    const cl = (L - 2 * fs - web) / 2, cs = S - 2 * fs;
    if (cl > 0.08 && cs > 0.08) [-1, 1].forEach(sg => {
      const cx = sg * (web / 2 + cl / 2), hole = new T.Path();
      hole.moveTo(cx - cl / 2, -cs / 2); hole.lineTo(cx - cl / 2, cs / 2); hole.lineTo(cx + cl / 2, cs / 2); hole.lineTo(cx + cl / 2, -cs / 2); hole.lineTo(cx - cl / 2, -cs / 2);
      sh.holes.push(hole);
    });
    const g = new T.ExtrudeGeometry(sh, { depth: h, bevelEnabled: false });
    g.rotateX(-Math.PI / 2); g.translate(0, -h / 2, 0); if (d > w) g.rotateY(Math.PI / 2);
    const me = new T.Mesh(g, m); me.position.set(x, y, z); me.castShadow = true; me.receiveShadow = true;
    me.add(new T.LineSegments(new T.EdgesGeometry(g, 30), edgeMat));
    return me;
  }
  function bar(len, r, m, axis, x, y, z) {
    const me = new T.Mesh(new T.CylinderGeometry(r, r, len, 8), m);
    if (axis === 'x') me.rotation.z = Math.PI / 2;
    if (axis === 'z') me.rotation.x = Math.PI / 2;
    me.position.set(x, y, z); me.castShadow = true;
    return me;
  }
  function ring(r, t, m, x, y, z) {
    const me = new T.Mesh(new T.TorusGeometry(r, t, 6, 28), m);
    me.rotation.x = Math.PI / 2; me.position.set(x, y, z); me.castShadow = true;
    return me;
  }
  function loop(w, h, r, m, x, y, z, axis) { // rectangular stirrup
    const g = new T.Group();
    g.add(bar(w, r, m, 'z', 0, h / 2, 0), bar(w, r, m, 'z', 0, -h / 2, 0), bar(h, r, m, 'y', 0, 0, w / 2), bar(h, r, m, 'y', 0, 0, -w / 2));
    if (axis === 'z') g.rotation.y = Math.PI / 2;
    g.position.set(x, y, z);
    return g;
  }
  function pebbles(n, x0, x1, y0, y1, z0, z1, parent) {
    const geo = new T.DodecahedronGeometry(0.09, 0);
    const im = new T.InstancedMesh(geo, M.pebble, n);
    const o = new T.Object3D();
    for (let i = 0; i < n; i++) {
      o.position.set(x0 + rnd() * (x1 - x0), y0 + rnd() * (y1 - y0), z0 + rnd() * (z1 - z0));
      o.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3);
      const s = 0.6 + rnd() * 0.9; o.scale.set(s, s * 0.8, s);
      o.updateMatrix(); im.setMatrixAt(i, o.matrix);
    }
    im.castShadow = true; parent.add(im);
  }

  /* A detail is a list of parts. Each part has a group, an explode vector and a legend entry. */
  function Detail() { this.root = new T.Group(); this.parts = []; }
  Detail.prototype.part = function (name, note, dir, stagger = 0) {
    const g = new T.Group();
    this.root.add(g);
    const p = { g, name, note, dir: new T.Vector3(...dir), stagger, n: 0 };
    this.parts.push(p);
    return g;
  };

  /* ---------- 1. Stone and mortar gravity retaining wall ---------- */
  function stoneTex(kind) {
    const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d');
    const bg = { face: '#8d877c', mortar: '#9b958a', dry: '#3f3832', base: '#948e83' }[kind];
    g.fillStyle = bg; g.fillRect(0, 0, 512, 512);
    const pal = kind === 'dry' ? ['#9d8d76', '#8c7d68', '#a8977e', '#7f7160'] : ['#bfb39c', '#a89b85', '#cfc4ae', '#9a8f7c', '#b5a58a', '#c9b99a', '#8f8472'];
    // random rubble: irregular 5-7 sided stones in loose courses, mortar showing between
    let y = -10;
    while (y < 522) {
      const rh = kind === 'dry' ? 34 + rnd() * 34 : 40 + rnd() * 50;
      let x = -rnd() * 70;
      while (x < 522) {
        const w = (kind === 'dry' ? 36 : 55) + rnd() * (kind === 'dry' ? 44 : 95);
        const h = rh * (0.7 + rnd() * 0.45), cy = y + rh / 2 + (rnd() - 0.5) * 10, cx = x + w / 2;
        const n = 5 + ((rnd() * 3) | 0), gap = kind === 'dry' ? 4 : 6;
        g.fillStyle = pal[(rnd() * pal.length) | 0];
        g.beginPath();
        for (let k = 0; k < n; k++) {
          const a = (k / n) * Math.PI * 2 + rnd() * 0.5;
          const rx = (w / 2 - gap) * (0.82 + rnd() * 0.18), ry = (h / 2 - gap) * (0.82 + rnd() * 0.18);
          const px = cx + Math.sign(Math.cos(a)) * Math.pow(Math.abs(Math.cos(a)), 0.55) * rx, py = cy + Math.sign(Math.sin(a)) * Math.pow(Math.abs(Math.sin(a)), 0.55) * ry;
          k ? g.lineTo(px, py) : g.moveTo(px, py);
        }
        g.closePath(); g.fill();
        g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 1.5; g.stroke();
        g.fillStyle = 'rgba(255,255,255,.08)'; g.beginPath(); g.ellipse(cx - w * 0.12, cy - h * 0.15, w * 0.22, h * 0.12, 0, 0, 7); g.fill();
        x += w;
      }
      y += rh;
    }
    for (let i = 0; i < 1400; i++) { g.fillStyle = `rgba(0,0,0,${rnd() * 0.08})`; g.fillRect(rnd() * 512, rnd() * 512, 2, 2); }
    // wrap the texture seam for the left/right edges by copying
    const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(1 / 6, 1 / 6); t.anisotropy = 4;
    return t;
  }
  function gravelTex() {
    const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
    g.fillStyle = '#6f685e'; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 900; i++) { g.fillStyle = ['#a39b8e', '#8f887c', '#b5ada0', '#7d766b'][(rnd() * 4) | 0]; g.beginPath(); g.ellipse(rnd() * 256, rnd() * 256, 2 + rnd() * 5, 2 + rnd() * 4, rnd() * 3, 0, 7); g.fill(); }
    const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(1 / 1.2, 1 / 1.2); return t;
  }
  function fabricTex() { // black nonwoven geotextile: fine weave, tiny perforations
    const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
    g.fillStyle = '#1b1c1e'; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 1800; i++) { g.strokeStyle = `rgba(255,255,255,${0.02 + rnd() * 0.05})`; g.lineWidth = 1; const x = rnd() * 256, y = rnd() * 256, a = rnd() * 6.28, l = 4 + rnd() * 10; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
    for (let y = 6; y < 256; y += 16) for (let x = (y / 16) % 2 ? 14 : 6; x < 256; x += 16) { g.fillStyle = 'rgba(150,150,150,0.55)'; g.beginPath(); g.arc(x + rnd() * 2, y + rnd() * 2, 1.1, 0, 7); g.fill(); }
    const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(1 / 1.5, 1 / 1.5); return t;
  }
  function soilTex(base) {
    const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
    g.fillStyle = base; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(${rnd() < 0.5 ? '0,0,0' : '255,255,255'},${rnd() * 0.08})`; g.fillRect(rnd() * 256, rnd() * 256, 2 + rnd() * 3, 2 + rnd() * 3); }
    const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(1 / 4, 1 / 4); return t;
  }
  // extrude a section polygon (s = distance into the hill from the toe, y = height above front grade) along the wall length
  function sect(pts, m, L, edges = true) {
    const sh = new T.Shape(pts.map(([s, y]) => new T.Vector2(s, y)));
    const geo = new T.ExtrudeGeometry(sh, { depth: L, bevelEnabled: false });
    let mm = m;
    if (m.map) { // side walls get the stone pattern turned so courses run along the wall
      const side = m.clone(); side.map = m.map.clone(); side.map.needsUpdate = true; side.map.rotation = Math.PI / 2; mm = [m, side];
    }
    const me = new T.Mesh(geo, mm);
    me.rotation.y = Math.PI / 2; me.position.x = -L / 2;
    me.castShadow = !m.transparent; me.receiveShadow = true;
    if (edges && !m.transparent) me.add(new T.LineSegments(new T.EdgesGeometry(geo, 30), edgeMat));
    return me;
  }
  function buildWall() {
    seed = 11; const d = new Detail(); const L = 12;
    const H = 8, B = 5 + 1 / 12, B1 = 1 + 1 / 12, C = 2.5, C1 = 11 / 12, T0 = 4, A = 16 / 12, Ez = 16 / 12, G = 1.6;
    const face = y => B1 + (A * y) / H;                      // 6V:1H battered face
    const topBack = face(H) + 2.0;                            // top of wall width
    const back = y => { const lin = B + ((topBack - B) * y) / H; return lin + (Math.floor(y / 1.34) % 2 ? 0.18 : -0.05); }; // irregular back face
    const tex = { face: stoneTex('face'), mortar: stoneTex('mortar'), dry: stoneTex('dry'), base: stoneTex('base') };
    const SM = k => new T.MeshStandardMaterial({ map: tex[k], roughness: 0.95 });
    const gravel = new T.MeshStandardMaterial({ map: gravelTex(), roughness: 1 });
    const clay = new T.MeshStandardMaterial({ map: soilTex('#86674a'), roughness: 1 });
    const fillM = new T.MeshStandardMaterial({ map: soilTex('#a88660'), roughness: 1, transparent: true, opacity: 0.55, depthWrite: false });
    const compM = new T.MeshStandardMaterial({ map: soilTex('#8f7355'), roughness: 1 });
    const gradeM = new T.MeshStandardMaterial({ map: soilTex('#7c7650'), roughness: 1 });
    const steps = n => Array.from({ length: n + 1 }, (_, i) => i / n);

    const base = d.part('Stone base with toe and heel', 'Solid stone set in mortar below grade. The toe sticks out in front of the face; the bottom slopes down toward the heel to lock into the soil.', [0, -3.4, 0.6]);
    base.add(sect([[0, 0], [B, 0], [B, -(C + C1)], [0, -C]], SM('base'), L));

    const faceS = d.part('Battered face stone', 'Face stone per contract, laid to a batter so the face leans back into the hill. All face joints pointed.', [0, 0.2, 3.0]);
    faceS.add(sect([[face(0), 0], [face(0) + 0.5, 0], [face(H) + 0.5, H], [face(H), H]], SM('face'), L));

    const E = d.part('Fully mortared zone', 'Stone fully mortared top, bottom, front and back: behind the face, the bottom course, the top course and the back stones.', [0, 0.6, 1.2]);
    E.add(sect([[face(0) + 0.5, 0], [face(0) + Ez, 0], [face(H) + Ez, H], [face(H) + 0.5, H]], SM('mortar'), L));
    E.add(sect([[face(0) + Ez, 0], [back(0.4) - 0.85, 0], [back(0.4) - 0.85, 0.85], [face(0.85) + Ez, 0.85]], SM('mortar'), L));
    E.add(sect([[face(H - 0.85) + Ez, H - 0.85], [back(H - 0.4) - 0.85, H - 0.85], [back(H - 0.4) - 0.85, H], [face(H) + Ez, H]], SM('mortar'), L));

    const core = d.part('Tightly fitted stone core', 'Interior stone packed tight. No mortar required in the core.', [0, 2.2, -0.6]);
    core.add(sect([[face(0.85) + Ez, 0.85], [back(0.85) - 0.85, 0.85], [back(H - 0.85) - 0.85, H - 0.85], [face(H - 0.85) + Ez, H - 0.85]], SM('dry'), L));

    const bk = d.part('Back stones, irregular back face', 'Mortared back course. The back face may be irregular, stepping in as the wall gets thinner toward the top.', [0, 0.4, -2.4]);
    const ys = steps(12).map(t => t * H);
    const bpts = [];
    ys.forEach((y, i) => { const s = back(Math.min(y + 0.01, H - 0.01)); bpts.push([s, y]); if (i < ys.length - 1) bpts.push([s, ys[i + 1]]); });
    bk.add(sect([[back(0.4) - 0.85, 0], ...bpts, [back(H - 0.4) - 0.85, H]], SM('mortar'), L));

    const cap = d.part('Cap stone', 'Cap stone along the top of the face. Openings for the PVC fence post sleeves are left in the top of the wall behind the cap.', [0, 3.4, 1.4]);
    cap.add(sect([[face(H) - 0.05, H], [face(H) + 1.0, H], [face(H) + 1.0, H + 0.55], [face(H) - 0.05, H + 0.55]], SM('face'), L));
    const pvc = new T.MeshStandardMaterial({ color: 0xf1f1ec, roughness: 0.45, side: T.DoubleSide });
    for (let x = -L / 2 + 0.6; x <= L / 2; x += 5.4) { // PVC sleeves set in the top of the wall at each post
      const rim = new T.Mesh(new T.TorusGeometry(0.22, 0.035, 8, 24), pvc); rim.rotation.x = Math.PI / 2; rim.position.set(x, H + 0.05, -(face(H) + 1.4)); cap.add(rim); // sleeve opening in the top of the wall
    }

    const weep = d.part('Weep pipes', 'Set just above final grade and spaced along the wall, running from the drainage stone out through the face. The back end is wrapped in filter fabric and banded.', [0, -0.4, 5.2]);
    const wy = 0.5;
    [-4, 4].forEach(x => {
      const len = back(0.5) + 0.6 - face(wy) + 0.4;
      const p = new T.Mesh(new T.CylinderGeometry(0.125, 0.125, len, 16, 1, true), M.pipe); p.material.side = T.DoubleSide;
      p.rotation.x = Math.PI / 2; p.position.set(x, wy, -(face(wy) - 0.2 + len / 2)); p.castShadow = true; weep.add(p);
      const sock = new T.Mesh(new T.CylinderGeometry(0.17, 0.17, 0.5, 16), M.fabric); sock.rotation.x = Math.PI / 2; sock.position.set(x, wy, -(face(wy) - 0.2 + len - 0.2)); weep.add(sock);
    });

    // drainage zone: inner side follows the stepped back of the wall; outer side starts at the schedule thickness at the weep and leans back 12V:1H going up
    const g0 = wy, g1 = H - 0.67, G0 = 1.0, dy = H / 12;
    const bStep = y => back(Math.min(Math.floor(y / dy), 11) * dy + 0.01);
    const innerStep = (y0, y1) => { // stepped back-of-wall profile from y0 up to y1, matching the back stones
      const pts = [[bStep(y0), y0]];
      for (let k = Math.floor(y0 / dy) + 1; k * dy < y1 - 1e-6; k++) { pts.push([bStep(k * dy - 0.001), k * dy]); pts.push([bStep(k * dy + 0.001), k * dy]); }
      pts.push([bStep(y1 - 0.001), y1]); return pts;
    };
    const lin = y => B + ((topBack - B) * y) / H;
    const sOut = y => lin(g0) + G0 + (y - g0) / 12;          // 12:1 away from the wall
    const outerLine = steps(24).map(t => g0 + t * (g1 - g0)).map(y => [sOut(y), y]);

    const dz = d.part('Drainage zone', 'Continuous gravel or clean free-draining rock behind the wall, sized for the wall. The back of the drainage zone leans away from the wall as it goes up, so the zone gets wider toward the top.', [0, 0.3, -5.2]);
    dz.add(sect([...innerStep(g0, g1), ...outerLine.slice().reverse()], gravel, L));

    const fab = d.part('Filter fabric around drainage zone', 'Black nonwoven geotextile, finely perforated so water passes through. Wraps the gravel so fines from the soil do not clog it, following the back of the drainage zone.', [0, 0.5, -7.0]);
    const fo = steps(48).map(t => g0 + t * (g1 - g0)).map(y => [sOut(y) + 0.03 + 0.03 * Math.sin(y * 5.2) + 0.015 * Math.sin(y * 13.1), y]);
    fab.add(sect([...fo, ...fo.slice().reverse().map(([s, y]) => [s + 0.045, y])], M.fabric, L, false));
    fab.add(sect([[bStep(g1 - 0.01), g1], [sOut(g1) + 0.1, g1], [sOut(g1) + 0.1, g1 + 0.05], [bStep(g1 - 0.01), g1 + 0.05]], M.fabric, L, false));
    fab.add(sect([[bStep(g0), g0 - 0.05], [sOut(g0) + 0.1, g0 - 0.05], [sOut(g0) + 0.1, g0], [bStep(g0), g0]], M.fabric, L, false));

    const cs = sOut(g0) + 0.6;
    const comp = d.part('Compacted soil below weep pipe', 'Compacted soil fills in under the drainage zone so water is pushed out the weeps.', [0, -1.2, -5.2]);
    comp.add(sect([[B, -(C + C1)], [cs, -(C + C1)], [cs, g0 - 0.05], [bStep(0.3), g0 - 0.05], [B, 0]], compM, L));

    const slope = s => H + Math.max(0, (s - face(H))) / 4;  // 1V:4H max above the wall
    const clayP = d.part('Clay cap from onsite soils', 'A layer of clay over the top of the wall and the drainage zone so runoff sheets over the top of the wall instead of soaking in.', [0, 3.6, -5.2]);
    const c0 = face(H) + 1.0, c1 = sOut(g1) + 0.9;
    const ctop = steps(10).map(t => c0 + t * (c1 - c0)).map(s => [s, slope(s)]);
    const wallBackTop = innerStep(g1 + 0.06, H).reverse();      // down the back of the wall from the top
    clayP.add(sect([[c0, H], [bStep(H - 0.01), H], ...wallBackTop.slice(1), [bStep(g1 + 0.01), g1 + 0.05], [c1, g1 + 0.05], ...ctop.slice().reverse()], clay, L));

    const ret = d.part('Retained soil', 'Natural or compacted fill behind the wall. Slope above the wall as shown on the plans.', [0, 0.4, -10]);
    const r1 = 14, bot = -(C + C1) - 0.4;
    const rtop = steps(8).map(t => c1 + t * (r1 - c1)).map(s => [s, slope(s)]);
    const rin = steps(12).map(t => g0 + t * (g1 - g0)).map(y => [sOut(y) + 0.08, y]);
    ret.add(sect([[cs, bot], [r1, bot], ...rtop.slice().reverse(), [c1, g1 + 0.05], ...rin.slice().reverse(), [cs, g0 - 0.05]], fillM, L, false));

    const fg = d.part('Final grade per civil', 'The soil in front of the wall provides passive pressure against the base and toe, helping hold the wall in place. Final grade per the civil plans.', [0, -1.0, 4.4]);
    fg.add(sect([[-5, -(C + C1) - 0.4], [0, -(C + C1) - 0.4], [0, -C], [0, 0], [-5, -1.25]], gradeM, L));

    const fence = d.part('Fence if required', 'Posts set in PVC sleeves cast into the top of the wall, behind the cap, when a fence goes on the wall. The sleeve is shown around each post.', [0, 5.6, 0.6]);
    const pvcF = new T.MeshStandardMaterial({ color: 0xf1f1ec, roughness: 0.45, side: T.DoubleSide });
    for (let x = -L / 2 + 0.6; x <= L / 2; x += 5.4) {
      fence.add(bar(6.2, 0.06, M.pipe, 'y', x, H + 1.6, -(face(H) + 1.4)));  // post runs down into the sleeve
      const col = new T.Mesh(new T.CylinderGeometry(0.2, 0.2, 2.2, 24, 1, true), pvcF); col.position.set(x, H - 1.05, -(face(H) + 1.4)); col.castShadow = true; fence.add(col);
      const cr = new T.Mesh(new T.TorusGeometry(0.2, 0.025, 8, 24), pvcF); cr.rotation.x = Math.PI / 2; cr.position.set(x, H + 0.05, -(face(H) + 1.4)); fence.add(cr);
    }
    [H + 1.6, H + 4.2].forEach(y => fence.add(bar(L - 0.6, 0.035, M.pipe, 'x', 0, y, -(face(H) + 1.4))));
    for (let x = -L / 2 + 0.6; x < L / 2 - 0.3; x += 0.33) fence.add(bar(2.8, 0.018, M.pipe, 'y', x, H + 2.9, -(face(H) + 1.4)));

    d.center = new T.Vector3(0, 3.0, -4.6); d.far = 38; d.near = 44; d.yaw0 = -0.75; d.pitch = 0.2; d.spin = 2.15;
    return d;
  }

  /* ---------- 2. Masonry screen wall on piers and grade beam ---------- */
  /* pier-to-footing hook bars: L bars whose long leg laps down into the pier cage and whose short leg turns into the cap or beam */
  function hookBars(g, x, z, r, yTop, n = 4, down = 3.0, leg = 0.67) {
    for (let k = 0; k < n; k++) {
      const a = Math.PI / 4 + (k / n) * Math.PI * 2, bx = x + Math.cos(a) * r, bz = z + Math.sin(a) * r, y = yTop - (k % 2) * 0.07;
      g.add(bar(down, 0.04, M.rebar, 'y', bx, y - down / 2, bz));
      const h = bar(leg, 0.04, M.rebar, 'x', 0, 0, 0); h.rotation.set(0, -(a + Math.PI), Math.PI / 2);
      h.position.set(bx - Math.cos(a) * leg / 2, y, bz - Math.sin(a) * leg / 2); g.add(h);
    }
  }

  function buildScreen() {
    // typical brick thinwall system: major columns at the ends, minor brick columns between, single wythe thin brick panels
    seed = 23; const d = new Detail();
    const S = 9, cols = [[-1.5 * S, 'M'], [-0.5 * S, 'm'], [0.5 * S, 'm'], [1.5 * S, 'M']];
    const MW = 2.0, mW = 1.08, mD = 1.0, PT = 0.25, BW = 1.0, BD = 0.5, CD = 1.5, H = 6.0, PR = 0.75, PL = 10;
    const L = 3 * S + MW, face = L / 2 - MW;
    const top = t => (t === 'M' ? -CD : -BD);
    const pr = d.part('Drilled concrete piers', 'Round drilled piers under every column carry the wall down to stable soil.', [0, -6.5, 0]);
    cols.forEach(([x, t]) => { const c = new T.Mesh(new T.CylinderGeometry(PR, PR, PL, 24), M.concreteDk); c.position.set(x, top(t) - PL / 2, 0); c.castShadow = true; c.receiveShadow = true; pr.add(c); });
    const cages = d.part('Pier cages', 'Four vertical bars inside round ties, with a double tie at the top of the pier.', [0, -4.2, 3.4], 1);
    cols.forEach(([x, t]) => {
      const yt = top(t), yb = yt - PL;
      for (let k = 0; k < 4; k++) { const a = (k / 4) * Math.PI * 2; cages.add(bar(PL - 0.5, 0.04, M.rebar, 'y', x + Math.cos(a) * 0.5, yb + 0.25 + (PL - 0.5) / 2, Math.sin(a) * 0.5)); }
      for (let y = yb + 0.4; y <= yt - 0.3; y += 1.5) cages.add(ring(0.52, 0.022, M.rebar, x, y, 0));
      cages.add(ring(0.52, 0.022, M.rebar, x, yt - 0.2, 0)); cages.add(ring(0.52, 0.022, M.rebar, x, yt - 0.32, 0));
    });
    const hooks = d.part('Pier hook bars', 'L-shaped bars at the top of each pier. The long leg laps down into the pier cage and the short leg turns into the pier cap or beam, tying the two together.', [0, -2.6, -3.2], 1);
    cols.forEach(([x]) => hookBars(hooks, x, 0, 0.44, -0.27));
    const conc = d.part('Pier caps and grade beam', 'A deeper pier cap under each major column. Under the panels and minor columns, a small concrete beam at grade ties the piers together.', [0, -3.0, 0]);
    cols.forEach(([x, t]) => { if (t === 'M') conc.add(box(MW, CD, MW, M.concrete, x, -CD / 2, 0)); });
    conc.add(box(2 * face, BD, BW, M.concrete, 0, -BD / 2, 0));
    const rf = d.part('Beam and pier cap reinforcing', 'The beam under the panels and minor columns has two continuous bars with ties. At the major columns the pier cap has three bars top and bottom with closed stirrups.', [0, -1.7, 2.8], 1);
    [-0.3, 0.3].forEach(z => rf.add(bar(L - 0.6, 0.035, M.rebar, 'x', 0, -0.25, z)));
    for (let x = -face + 0.4; x <= face - 0.39; x += 1.5) rf.add(loop(0.78, 0.3, 0.02, M.rebar, x, -0.25, 0));
    cols.forEach(([x, t]) => {
      if (t !== 'M') return;
      [-0.3, -1.2].forEach(y => [-0.7, 0, 0.7].forEach(z => rf.add(bar(MW - 0.5, 0.035, M.rebar, 'x', x, y, z))));
      [-0.6, 0, 0.6].forEach(dx => rf.add(loop(MW - 0.5, CD - 0.5, 0.022, M.rebar, x + dx, -CD / 2, 0)));
    });
    const vf = d.part('Carton void form', 'Trapezoidal cardboard carton form under the beam between piers, so swelling clay has room and does not lift the wall.', [0, -4.8, -3.0], 2);
    const voidM = new T.MeshStandardMaterial({ color: 0xa98f6b, roughness: 0.95 });
    const stops = [[-face, cols[1][0] - PR], [cols[1][0] + PR, cols[2][0] - PR], [cols[2][0] + PR, face]];
    stops.forEach(([a, b]) => { vf.add(box(b - a - 0.02, 0.5, BW - 0.02, voidM, (a + b) / 2, -BD - 0.25, 0)); for (let x = a + 1.5; x < b - 0.3; x += 1.5) vf.add(box(0.02, 0.51, BW + 0.01, M.capDk, x, -BD - 0.25, 0, false)); });
    // single wythe thin brick panels between column faces
    const edges = cols.map(([x, t]) => (t === 'M' ? [x - MW / 2, x + MW / 2] : [x - mW / 2, x + mW / 2]));
    const segs = []; for (let e = 0; e < edges.length - 1; e++) segs.push([edges[e][1], edges[e + 1][0]]);
    const bw = 0.8, bh = 0.22, lifts = 3, nC = Math.round(H / bh), perLift = Math.ceil(nC / lifts);
    for (let l = 0; l < lifts; l++) {
      const g = d.part(l === 0 ? 'Single wythe thin brick panel' : null, 'One wythe of thin brick in running bond, spanning column to column on the beam.', [0, 1.3 + l * 1.5, 0], l + 2);
      const geo = new T.BoxGeometry(bw - 0.03, bh - 0.025, PT);
      const cells = [];
      for (let c = l * perLift; c < Math.min(nC, (l + 1) * perLift); c++) segs.forEach(([a, b]) => {
        let x = a - (c % 2 ? bw / 2 : 0);
        while (x < b - 0.02) { const x0 = Math.max(x, a), x1 = Math.min(x + bw, b); if (x1 - x0 > 0.05) cells.push([(rnd() * 4) | 0, (x0 + x1) / 2, c * bh + bh / 2, x1 - x0]); x += bw; }
      });
      [0, 1, 2, 3].forEach(k => {
        const cs = cells.filter(c => c[0] === k); if (!cs.length) return;
        const im = new T.InstancedMesh(geo, M.brick[k], cs.length); const o = new T.Object3D(); const bp = [], sx = [];
        cs.forEach(([, x, y, w], i) => { const s = (w - 0.03) / (bw - 0.03); o.position.set(x, y, 0); o.scale.set(s, 1, 1); o.updateMatrix(); im.setMatrixAt(i, o.matrix); bp.push(x, y, 0); sx.push(s); });
        im.userData.bricks = { base: bp, sx, cy: (l + 0.5) * perLift * bh, last: -1 };
        im.castShadow = true; im.receiveShadow = true; g.add(im);
      });
    }
    const lad = d.part('Joint reinforcement', 'Galvanized wire laid in the mortar joints of the panel, running into the columns.', [0, 1.4, 3.2], 3);
    for (let c = 3; c < nC - 1; c += 3) segs.forEach(([a, b]) => lad.add(bar(b - a + 0.5, 0.02, M.tie, 'x', (a + b) / 2, c * bh, 0)));
    // major columns: CMU core with stone veneer
    const core = d.part('Major column CMU cores', 'Each major column is hollow concrete block on the pier cap. The cells with bars are filled with concrete.', [0, 1.6, -2.8], 2);
    cols.forEach(([x, t], s) => { if (t !== 'M') return; for (let c = 0; c < 9; c++) { const y = c * 0.667 + 0.333; if (c % 2) [-0.33, 0.33].forEach(dz => core.add(cmuBox(1.3, 0.64, 0.63, M.block[(c + s) % 4], x, y, dz))); else [-0.33, 0.33].forEach(dx => core.add(cmuBox(0.63, 0.64, 1.3, M.block[(c + s + 1) % 4], x + dx, y, 0))); } });
    const vb = d.part('Column vertical bars', 'Four bars in every column, two each side, from the cap or beam to the top of the column. The cells and cores with bars are filled with concrete.', [0, 2.6, 0.3], 3);
    const fillM = new T.MeshStandardMaterial({ color: 0xa7a49c, roughness: 0.95, transparent: true, opacity: 0.5, depthWrite: false });
    cols.forEach(([x, t]) => {
      if (t === 'M') { [[-0.33, -0.33], [0.33, -0.33], [-0.33, 0.33], [0.33, 0.33]].forEach(([dx, dz]) => { vb.add(bar(6.0 + 1.2, 0.045, M.rebar, 'y', x + dx, 3.0 - 0.6, dz)); const gm = new T.Mesh(new T.BoxGeometry(0.36, 5.95, 0.36), fillM); gm.position.set(x + dx, 3.0, dz); vb.add(gm); }); }
      else { [[-0.12, -0.1], [0.12, -0.1], [-0.12, 0.1], [0.12, 0.1]].forEach(([dx, dz]) => vb.add(bar(H + 0.3, 0.045, M.rebar, 'y', x + dx, H / 2 - 0.2, dz))); const gm = new T.Mesh(new T.BoxGeometry(mW - 0.62, H - 0.05, mD - 0.62), fillM); gm.position.set(x, H / 2, 0); vb.add(gm); }
    });
    const ven = d.part('Stone veneer on the major columns', 'Stone veneer wraps the CMU core of each major column.', [0, 1.8, 3.0], 4);
    cols.forEach(([x, t]) => {
      if (t !== 'M') return; let y = 0;
      while (y < 6.2) { const rh = Math.min(0.5 + rnd() * 0.3, 6.3 - y);
        [[0, MW / 2 - 0.165, MW, 0.33], [0, -(MW / 2 - 0.165), MW, 0.33], [MW / 2 - 0.165, 0, 0.33, MW - 0.66], [-(MW / 2 - 0.165), 0, 0.33, MW - 0.66]].forEach(([dx, dz, w, dd]) => ven.add(box(w - 0.03, rh - 0.03, dd - 0.03, M.stone[(rnd() * 5) | 0], x + dx, y + rh / 2, dz)));
        y += rh; }
    });
    const mb = d.part('Minor brick columns', 'Minor columns are brick, laid around a core that holds the bars and is filled with concrete.', [0, 1.6, 3.4], 4);
    cols.forEach(([x, t], s) => {
      if (t !== 'm') return;
      for (let c = 0; c < nC; c++) { const y = c * bh + bh / 2, m = M.brick[(c + s) % 4], w = 0.3;
        mb.add(box(mW - 0.03, bh - 0.025, w, m, x, y, mD / 2 - w / 2)); mb.add(box(mW - 0.03, bh - 0.025, w, m, x, y, -(mD / 2 - w / 2)));
        mb.add(box(w, bh - 0.025, mD - 2 * w - 0.03, m, x - mW / 2 + w / 2, y, 0)); mb.add(box(w, bh - 0.025, mD - 2 * w - 0.03, m, x + mW / 2 - w / 2, y, 0)); }
    });
    const caps = d.part('Caps', 'Brick cap along the panels, and caps on the minor and major columns to shed water.', [0, 6.6, 1.2], 5);
    segs.forEach(([a, b]) => caps.add(box(b - a, 0.14, PT + 0.12, M.capDk, (a + b) / 2, H + 0.07, 0)));
    cols.forEach(([x, t]) => { if (t === 'M') caps.add(box(MW + 0.35, 0.35, MW + 0.35, M.cap, x, 6.3 + 0.175, 0)); else caps.add(box(mW + 0.2, 0.2, mD + 0.2, M.cap, x, H + 0.1, 0)); });
    d.center = new T.Vector3(0, 0.6, 0); d.far = 62; d.near = 55; d.yaw0 = -0.55; d.pitch = 0.22; d.spin = 0.9;
    return d;
  }

  /* ---------- 3. Entry monument column with sign ---------- */
  function buildMonument() {
    seed = 41; const d = new Detail(); const W = 3.34, H = 10;
    const pier = d.part('Drilled concrete pier', 'A drilled pier under the column carries the load down to stable soil and resists overturning from wind.', [0, -6.0, 0]);
    const ps = new T.Mesh(new T.CylinderGeometry(1.0, 1.0, 11, 28), M.concreteDk); ps.position.set(0, -7.0, 0); ps.castShadow = true; ps.receiveShadow = true; pier.add(ps);
    const cage = d.part('Pier cage', 'Vertical bars tied inside hoops, running up out of the pier into the pier cap.', [0, -3.4, 3.6]);
    for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; cage.add(bar(10.6, 0.04, M.rebar, 'y', Math.cos(a) * 0.72, -6.95, Math.sin(a) * 0.72)); }
    for (let y = -12.0; y <= -2.0; y += 0.9) cage.add(ring(0.74, 0.024, M.rebar, 0, y, 0));
    [-1.7, -1.82].forEach(y => cage.add(ring(0.74, 0.024, M.rebar, 0, y, 0)));
    const mh = d.part('Pier hook bars', 'L-shaped bars at the top of the pier. The long leg laps down into the pier cage and the short leg turns into the pier cap, tying the two together.', [0, -2.6, -3.4]);
    hookBars(mh, 0, 0, 0.62, -0.32, 8, 3.2, 0.67);
    const mvd = d.part('Void boxes', 'Cardboard carton forms under the pier cap around the pier, so swelling clay cannot push up on the cap. The pier carries the load.', [0, -4.2, 3.0]);
    const mvM = new T.MeshStandardMaterial({ color: 0xa98f6b, roughness: 0.95 });
    [[0, 1.65, 4.58, 1.28], [0, -1.65, 4.58, 1.28], [1.65, 0, 1.28, 1.98], [-1.65, 0, 1.28, 1.98]].forEach(([x, z, w, dd]) => mvd.add(box(w, 0.5, dd, mvM, x, -1.75, z)));
    const ft = d.part('Pier cap', 'Concrete cap poured on top of the pier. The column bars start here.', [0, -2.4, 0]);
    ft.add(box(4.6, 1.5, 4.6, M.concrete, 0, -0.75, 0));
    const mat_ = d.part('Pier cap reinforcing', 'Top and bottom mats of bars each way, tied together with closed stirrups. The pier cage and the column bars tie into it.', [0, -1.4, -3.6]);
    for (let s = -1.9; s <= 1.9; s += 0.63) {
      mat_.add(bar(4.2, 0.035, M.rebar, 'x', 0, -1.2, s)); mat_.add(bar(4.2, 0.035, M.rebar, 'z', s, -1.12, 0));   // bottom mat
      mat_.add(bar(4.2, 0.035, M.rebar, 'x', 0, -0.3, s)); mat_.add(bar(4.2, 0.035, M.rebar, 'z', s, -0.38, 0));   // top mat
    }
    for (let x = -1.9; x <= 1.91; x += 0.63) mat_.add(loop(4.02, 1.02, 0.022, M.rebar, x, -0.75, 0));   // closed stirrups around both mats
    const bars = [[-1.2, -1.2], [1.2, -1.2], [-1.2, 1.2], [1.2, 1.2], [0, -1.2], [0, 1.2], [-1.2, 0], [1.2, 0]];
    const vert = d.part('Vertical bars in grouted cells', 'Bars hook into the pier cap with an L at the bottom and run to the top. Every cell with a bar is filled solid with grout.', [0, 1.2, 0]);
    bars.forEach(([x, z]) => {
      vert.add(bar(H + 1.35, 0.04, M.rebar, 'y', x, (H + 0.1 - 1.25) / 2, z));   // runs down into the pier cap
      const ox = Math.abs(x) >= Math.abs(z) ? Math.sign(x) || 1 : 0, oz = ox ? 0 : Math.sign(z) || 1;  // L hook turns out toward the edge of the cap
      vert.add(bar(0.9, 0.04, M.rebar, ox ? 'x' : 'z', x + ox * 0.45, -1.25, z + oz * 0.45));
    });
    const groutM = new T.MeshStandardMaterial({ color: 0xa7a49c, roughness: 0.95, transparent: true, opacity: 0.5, depthWrite: false });
    bars.forEach(([x, z]) => {  // grout fills every cell that has a bar
      const gx = Math.abs(x) > 1 ? Math.sign(x) * (W / 2 - 0.33) : x, gz = Math.abs(z) > 1 ? Math.sign(z) * (W / 2 - 0.33) : z;
      const gm = new T.Mesh(new T.BoxGeometry(0.4, H - 0.1, 0.4), groutM); gm.position.set(gx, H / 2, gz); vert.add(gm);
    });
    for (let l = 0; l < 3; l++) {
      const g = d.part(l === 0 ? 'CMU structural core' : null, 'Hollow concrete block in running bond. The bars run up through the cells, which are grouted solid. This is the structure behind the stone.', [0, 0.9 + l * 1.1, 0], l);
      for (let c = Math.round(l * 5); c < Math.round((l + 1) * 5); c++) {
        const y = c * 0.667 + 0.333, even = c % 2 === 0;
        [[0, -W / 2 + 0.33, 'x'], [0, W / 2 - 0.33, 'x'], [-W / 2 + 0.33, 0, 'z'], [W / 2 - 0.33, 0, 'z']].forEach(([x, z, ax], i) => {
          const along = (ax === 'x') === even;
          const len = along ? W : W - 1.33; const bx = ax === 'x' ? len : 0.66, bz = ax === 'x' ? 0.66 : len;
          const half = len / 2;
          for (let s = -half; s < half - 0.05; s += 1.33) { const w = Math.min(1.33, half - s); g.add(cmuBox(ax === 'x' ? w - 0.03 : bx - 0.03, 0.64, ax === 'x' ? bz - 0.03 : w - 0.03, M.block[(i + c) % 4], ax === 'x' ? s + w / 2 : x, y, ax === 'x' ? z : s + w / 2)); }
        });
      }
    }
    const ties = d.part('Veneer ties', 'Galvanized ties anchor the stone to the block every few courses.', [0, 0.4, 0]);
    for (let y = 1; y < H; y += 1.33) [[0, W / 2 + 0.1, 0], [0, -W / 2 - 0.1, 0], [W / 2 + 0.1, 0, 1], [-W / 2 - 0.1, 0, 1]].forEach(([x, z, r]) => { for (let s = -0.9; s <= 0.9; s += 1.8) { const t = box(r ? 0.35 : 0.08, 0.03, r ? 0.08 : 0.35, M.tie, r ? x : s, y, r ? s : z, false); ties.add(t); } });
    const faces = [[0, 1], [0, -1], [1, 0], [-1, 0]];
    faces.forEach(([fx, fz], i) => {
      const g = d.part(i === 0 ? 'Natural stone veneer' : null, 'Hand-set stone over the block, pulled away here on all four sides.', [fx * 3.2, 0.3, fz * 3.2]);
      const off = W / 2 + 0.36, span = W + 0.72;
      let y = 0;
      while (y < H - 0.05) {
        const rh = Math.min(0.45 + rnd() * 0.5, H - y); let s = -span / 2;
        while (s < span / 2 - 0.05) {
          const w = Math.min(0.8 + rnd() * 0.9, span / 2 - s); const t = 0.28 + rnd() * 0.08;
          const m = M.stone[(rnd() * 5) | 0];
          if (fz) g.add(box(w - 0.04, rh - 0.04, t, m, s + w / 2, y + rh / 2, fz * (off - t / 2 + 0.14)));
          else g.add(box(t, rh - 0.04, w - 0.04, m, fx * (off - t / 2 + 0.14), y + rh / 2, s + w / 2));
          s += w;
        }
        y += rh;
      }
    });
    const sign = d.part('Sign panel', 'Cast or metal lettering panel set into the front stone.', [0, 0.4, 6.4]);
    sign.add(box(2.6, 1.1, 0.14, M.panel, 0, 6.2, W / 2 + 0.62));
    for (let k = 0; k < 6; k++) sign.add(box(0.26, 0.42, 0.05, M.cap, -0.95 + k * 0.38, 6.2, W / 2 + 0.72, false));
    const cap = d.part('Cast stone cap', 'Overhanging cap with a drip edge keeps water out of the core.', [0, 3.2, 0]);
    cap.add(box(W + 1.6, 0.55, W + 1.6, M.cap, 0, H + 0.27, 0));
    const crown = new T.Mesh(new T.ConeGeometry((W + 1.2) * 0.72, 0.9, 4), M.capDk); crown.rotation.y = Math.PI / 4; crown.position.set(0, H + 1.0, 0); crown.castShadow = true; cap.add(crown);
    d.center = new T.Vector3(0, 1.5, 0); d.far = 50; d.near = 46; d.yaw0 = -0.7; d.pitch = 0.2;
    return d;
  }

  /* ---------- 4. Entry monument sign wall ---------- */
  function buildSignWall() {
    seed = 57; const d = new Detail();
    const L = 12, HW = 4.5, HC = 6.5, CW = 2.67, T0 = 1.33, xs = [-(L / 2 + CW / 2), L / 2 + CW / 2];
    const BW = 2.0, FT = 1.5, VB = 0.67, FL = L + 2 * CW;  // footing follows the plan: wall width under the wall, column width under the columns
    const ft = d.part('Grade beam footing', 'One reinforced footing runs under the wall and both columns, the same width as the wall and the columns above it.', [0, -3.4, 0]);
    ft.add(box(L, FT, BW, M.concrete, 0, -FT / 2, 0));
    xs.forEach(cx => ft.add(box(CW, FT, CW, M.concrete, cx, -FT / 2, 0)));
    const cardM = new T.MeshStandardMaterial({ color: 0xa98f6b, roughness: 0.95 });
    const vd = d.part('Void boxes', 'Cardboard carton forms under the footing between the piers. They carry the wet concrete during the pour, then break down and leave a gap, so swelling clay cannot push up on the footing. The piers carry the load.', [0, -5.4, -5.6], 1);
    const pr = 0.95, segs = [[-L / 2, -pr], [pr, L / 2]];
    segs.forEach(([x0, x1]) => { const w = x1 - x0; const vb = box(w - 0.02, VB, BW - 0.02, cardM, (x0 + x1) / 2, -FT - VB / 2, 0); vd.add(vb); for (let x = x0 + 1.2; x < x1 - 0.3; x += 1.2) vd.add(box(0.02, VB + 0.01, BW + 0.01, M.capDk, x, -FT - VB / 2, 0, false)); });
    xs.forEach(cx => { [[-CW / 2, -pr], [pr, CW / 2]].forEach(([z0, z1]) => vd.add(box(CW - 0.02, VB, z1 - z0 - 0.02, cardM, cx, -FT - VB / 2, (z0 + z1) / 2))); [[-CW / 2, -pr], [pr, CW / 2]].forEach(([x0, x1]) => vd.add(box(x1 - x0 - 0.02, VB, 2 * pr - 0.02, cardM, cx + (x0 + x1) / 2, -FT - VB / 2, 0))); });
    const pz = d.part('Drilled concrete piers', 'Piers under each column and one at the center carry the monument down to stable soil and resist overturning from wind.', [0, -6.2, 0], 0);
    const pxs = [xs[0], 0, xs[1]];
    pxs.forEach(x => { const c = new T.Mesh(new T.CylinderGeometry(0.9, 0.9, 10, 24), M.concreteDk); c.position.set(x, -6.5, 0); c.castShadow = true; c.receiveShadow = true; pz.add(c); });
    const pc = d.part('Pier cages', 'Vertical bars tied inside hoops, running up out of each pier into the footing.', [0, -4.6, 3.2], 1);
    pxs.forEach(x => {
      for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; pc.add(bar(9.6, 0.035, M.rebar, 'y', x + Math.cos(a) * 0.62, -6.55, Math.sin(a) * 0.62)); }
      for (let y = -11.0; y <= -2.0; y += 0.9) pc.add(ring(0.64, 0.022, M.rebar, x, y, 0));
      [-1.7, -1.82].forEach(y => pc.add(ring(0.64, 0.022, M.rebar, x, y, 0)));
    });
    const sh = d.part('Pier hook bars', 'L-shaped bars at the top of each pier. The long leg laps down into the pier cage and the short leg turns into the footing, tying the two together.', [0, -2.8, -3.8], 1);
    pxs.forEach(x => hookBars(sh, x, 0, 0.5, -0.3, 4, 3.0, 0.67));
    const fr = d.part('Footing reinforcing', 'Top and bottom mats of bars each way, tied together with stirrups. Extra bars run through the wider footing under each column.', [0, -2.1, 2.8], 1);
    [-1.25, -0.3].forEach(y => {
      for (let z = -0.7; z <= 0.71; z += 0.35) fr.add(bar(FL - 0.3, 0.035, M.rebar, 'x', 0, y, z));
      xs.forEach(cx => [-1.05, 1.05].forEach(z => fr.add(bar(CW - 0.3, 0.035, M.rebar, 'x', cx, y, z))));
    });
    for (let x = -L / 2 + 0.2; x <= L / 2 - 0.19; x += 0.8) { fr.add(bar(BW - 0.3, 0.035, M.rebar, 'z', x, -1.17, 0)); fr.add(bar(BW - 0.3, 0.035, M.rebar, 'z', x, -0.38, 0)); }
    xs.forEach(cx => { for (let x = cx - CW / 2 + 0.2; x <= cx + CW / 2 - 0.19; x += 0.45) { fr.add(bar(CW - 0.3, 0.035, M.rebar, 'z', x, -1.17, 0)); fr.add(bar(CW - 0.3, 0.035, M.rebar, 'z', x, -0.38, 0)); } });
    for (let x = -L / 2 + 0.6; x <= L / 2 - 0.5; x += 1.6) fr.add(loop(BW - 0.4, 1.02, 0.022, M.rebar, x, -0.78, 0));
    xs.forEach(cx => [-0.8, 0, 0.8].forEach(dx => fr.add(loop(CW - 0.4, 1.02, 0.022, M.rebar, cx + dx, -0.78, 0))));
    const vb = d.part('Vertical bars in grouted cells', 'Bars hook into the footing with an L at the bottom and run up through the block. Every cell with a bar is grouted solid.', [0, 1.1, 0], 2);
    const groutM = new T.MeshStandardMaterial({ color: 0xa7a49c, roughness: 0.95, transparent: true, opacity: 0.5, depthWrite: false });
    const vbar = (x, z, h) => { vb.add(bar(h + 1.2, 0.04, M.rebar, 'y', x, (h - 1.25) / 2, z)); vb.add(bar(0.8, 0.04, M.rebar, 'z', x, -1.25, z + (z > 0.01 ? -0.4 : 0.4))); const gm = new T.Mesh(new T.BoxGeometry(0.34, h - 0.1, 0.34), groutM); gm.position.set(x, h / 2, z); vb.add(gm); };
    for (let x = -L / 2 + 0.67; x < L / 2; x += 2.0) vbar(x, 0, HW);
    xs.forEach(cx => [[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6]].forEach(([dx, dz]) => vbar(cx + dx, dz, HC)));
    const core = d.part('CMU core', 'Hollow concrete block laid in running bond, with the cells over the bars grouted solid. This is the structure behind the stone.', [0, 0.5, -3.0], 1);
    for (let c = 0; c < Math.round(HW / 0.667); c++) {
      const y = c * 0.667 + 0.333, off = c % 2 ? 0.67 : 0;
      for (let x = -L / 2 + off; x < L / 2 - 0.05; x += 1.33) { const w = Math.min(1.33, L / 2 - x); if (w > 0.2) core.add(cmuBox(w - 0.03, 0.64, 0.64, M.block[(c + ((x * 3) | 0)) % 4], x + w / 2, y, 0)); }
    }
    xs.forEach((cx, s) => { for (let c = 0; c < Math.round(HC / 0.667); c++) core.add(cmuBox(1.97, 0.64, 1.97, M.block[(c + s) % 4], cx, c * 0.667 + 0.333, 0)); });
    const venFace = (g, zs) => {
      let y = 0;
      while (y < HW - 0.05) {
        const rh = Math.min(0.42 + rnd() * 0.4, HW - y); let x = -L / 2;
        while (x < L / 2 - 0.05) { const w = Math.min(0.7 + rnd() * 0.9, L / 2 - x); g.add(box(w - 0.04, rh - 0.04, 0.3, M.stone[(rnd() * 5) | 0], x + w / 2, y + rh / 2, zs * (T0 / 2 + 0.17))); x += w; }
        y += rh;
      }
    };
    const vf = d.part('Natural stone veneer', 'Hand-set stone over the block on both faces and around the columns.', [0, 0.3, 3.4], 3); venFace(vf, 1);
    const vk = d.part(null, 'Hand-set stone over the block on both faces and around the columns.', [0, 0.3, -3.6], 3); venFace(vk, -1);
    xs.forEach((cx, s) => {
      const g = d.part(null, 'Hand-set stone over the block on both faces and around the columns.', [s ? 3.2 : -3.2, 0.3, 0], 3);
      const half = CW / 2; let y = 0;
      while (y < HC - 0.05) {
        const rh = Math.min(0.45 + rnd() * 0.45, HC - y);
        [[0, 1], [0, -1], [1, 0], [-1, 0]].forEach(([fx, fz]) => {
          let t = -half;
          while (t < half - 0.05) { const w = Math.min(0.7 + rnd() * 0.8, half - t); const m = M.stone[(rnd() * 5) | 0];
            if (fz) g.add(box(w - 0.04, rh - 0.04, 0.3, m, cx + t + w / 2, y + rh / 2, fz * (half - 0.15)));
            else g.add(box(0.3, rh - 0.04, w - 0.04, m, cx + fx * (half - 0.15), y + rh / 2, t + w / 2));
            t += w; }
        });
        y += rh;
      }
    });
    const ties = d.part('Veneer ties', 'Galvanized ties anchor the stone to the block every few courses.', [0, 0.3, 1.9], 2);
    for (let y = 0.9; y < HW; y += 1.33) for (let x = -L / 2 + 1; x < L / 2; x += 1.6) [1, -1].forEach(s => ties.add(box(0.08, 0.03, 0.34, M.tie, x, y, s * (T0 / 2 + 0.02), false)));
    const sign = d.part('Sign panel and letters', 'A cast stone or metal panel set into the stone, with the community name in raised letters.', [0, 0.5, 5.6], 4);
    sign.add(box(6.2, 1.5, 0.16, M.panel, 0, 2.6, T0 / 2 + 0.4));
    for (let k = 0; k < 9; k++) sign.add(box(0.36, 0.6, 0.06, M.cap, -2.4 + k * 0.6, 2.6, T0 / 2 + 0.51, false));
    const caps = d.part('Cast stone caps', 'Caps on the wall and columns overhang the stone and shed water away from the core.', [0, 3.2, 0], 5);
    caps.add(box(L + 0.1, 0.35, T0 + 1.1, M.cap, 0, HW + 0.17, 0));
    xs.forEach(cx => { caps.add(box(CW + 0.6, 0.5, CW + 0.6, M.capDk, cx, HC + 0.25, 0)); const cr = new T.Mesh(new T.ConeGeometry((CW + 0.3) * 0.72, 0.7, 4), M.cap); cr.rotation.y = Math.PI / 4; cr.position.set(cx, HC + 0.85, 0); cr.castShadow = true; caps.add(cr); });
    d.center = new T.Vector3(0, -2.8, 0); d.far = 56; d.near = 50; d.yaw0 = -0.45; d.pitch = 0.2; d.spin = 0.9;
    return d;
  }

  /* ---------- 5. Overhead entry feature (curved steel truss ribbon) ---------- */
  function buildEntry() {
    const d = new Detail();
    const P = [
      ['Spread footings', 'Concrete footings sized for the uplift, sliding and bearing that wind puts on the long span.', [0, -2.8, 0], 0x9c968b],
      ['Concrete pedestals', 'Pedestals bring each support above grade and hold the anchor rods.', [0, -1.6, 0], 0xb5afa4],
      ['Steel posts', 'Steel posts at each support, set on base plates over the anchor rods.', [0, -0.5, 0], 0x4a5a75],
      ['Post-to-truss connections', 'Bolted connections where each post picks up the truss.', [0, 0.9, 0], 0x5b6e8c],
      ['Gusset and splice plates', 'Plates at the post stations and at the field splices, so the truss can ship in pieces and bolt together on site.', [0, 1.9, 0], 0xc8a24a],
      ['Top and bottom chords', 'Curved chords give the ribbon its shape and carry most of the bending.', [0, 3.0, 0], 0x3a3a3a],
      ['Side web diagonals', 'Diagonals on each face turn the chords into a truss.', [0, 3.0, 2.6], 0x2b5fd9],
      ['Plan bracing', 'Bracing in the top and bottom planes stiffens the ribbon sideways against wind.', [0, 4.4, 0], 0xe0a020],
      ['Verticals and struts', 'Members between the chords tie the truss faces together.', [0, 3.0, -2.6], 0x9a9a9a]];
    const groups = [], pr = []; let rg = null, rp = null;
    P.forEach(([n, note, dir], k) => {
      groups.push(d.part(n, note, dir, k * 0.6)); pr.push(d.parts[d.parts.length - 1]);
      if (k === 0) { rg = d.part('Footing and pedestal reinforcing', 'Top and bottom mats of bars each way in the footing. The pedestal verticals hook into the bottom mat and anchor the post, with closed ties at the top of the pedestal.', [0, -2.2, 2.6], 0.3); rp = d.parts[d.parts.length - 1]; }
    });
    const b64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0)).buffer;
    fetch('entry-model.json').then(r => r.json()).then(js => js.forEach((pt, k) => {
      const g = new T.BufferGeometry();
      g.setAttribute('position', new T.BufferAttribute(new Float32Array(b64(pt.p)), 3));
      g.setIndex(new T.BufferAttribute(new Uint16Array(b64(pt.i)), 1)); g.computeVertexNormals();
      const steel = k >= 2;
      const me = new T.Mesh(g, mat(P[k][3], { flatShading: true, roughness: steel ? 0.55 : 0.9, metalness: steel ? 0.25 : 0, side: T.DoubleSide }));
      me.castShadow = true; me.receiveShadow = true; me.userData.spread = 0; me.userData.base = me.position.clone();
      groups[k].add(me); groups[k].userData.ready = true;
      // spread the legend pins along the ribbon: anchor each part at one of its own vertices
      const pa = g.attributes.position.array, tx = -19 + k * 4.75; let bi = 0, bd = 1e9;
      for (let q = 0; q < pa.length; q += 3) { const dd = Math.abs(pa[q] - tx) + Math.abs(pa[q + 1] - 2) * 0.05; if (dd < bd) { bd = dd; bi = q; } }
      pr[k].anchor = new T.Vector3(pa[bi], pa[bi + 1], pa[bi + 2]);
    })).catch(() => {});
    fetch('entry-rebar.json').then(r => r.json()).then(sg => {
      const im = new T.InstancedMesh(new T.CylinderGeometry(1, 1, 1, 6), M.rebar, sg.length), m4 = new T.Matrix4(), q = new T.Quaternion(), up = new T.Vector3(0, 1, 0);
      sg.forEach(([x1, y1, z1, x2, y2, z2, r], i) => {
        const a = new T.Vector3(x1, y1, z1), b = new T.Vector3(x2, y2, z2), dv = b.clone().sub(a), len = dv.length();
        q.setFromUnitVectors(up, dv.normalize()); m4.compose(a.add(b).multiplyScalar(0.5), q, new T.Vector3(r, len, r)); im.setMatrixAt(i, m4);
      });
      im.castShadow = true; im.userData.spread = 0; im.userData.base = im.position.clone(); rg.add(im);
      const s0 = sg[sg.length - 30]; rp.anchor = new T.Vector3(s0[0], s0[1], s0[2]);
    }).catch(() => {});
    d.center = new T.Vector3(0, 1.8, 0); d.far = 82; d.near = 74; d.yaw0 = 0.12; d.pitch = 0.32; d.spin = 0.18;
    return d;
  }

  /* ---------- state, legend, interaction ---------- */
  const builders = { wall: buildWall, screen: buildScreen, monument: buildMonument, signwall: buildSignWall, entry: buildEntry };
  const legend = document.getElementById('legend');
  const slider = document.getElementById('explode');
  const labelsEl = document.getElementById('labels');
  let cur = null, target = 0, amt = 0, yaw = 0, userYaw = 0, userPitch = 0, hovered = -1;
  const cache = {};

  function load(key) {
    if (cur) scene.remove(cur.root);
    cur = cache[key] || (cache[key] = builders[key]());
    scene.add(cur.root);
    cur.parts.forEach(p => { if (!p.cloned) { p.cloned = 1; p.g.traverse(o => { if (o.isMesh && o.material && !Array.isArray(o.material) && o.material.emissive) o.material = o.material.clone(); }); } p.g.traverse(o => { if (o.isMesh && o.userData.spread === undefined) o.userData.spread = 0; if (o.isMesh || o.isInstancedMesh) o.userData.base = o.userData.base || o.position.clone(); }); });
    const named = cur.parts.filter(p => p.name);
    named.forEach((p, i) => (p.n = i + 1));
    cur.parts.forEach(p => { if (!p.name) p.n = cur.parts.filter(q => q.name && q.note === p.note)[0]?.n || 0; });
    legend.innerHTML = named.map(p => `<li data-n="${p.n}"><span class="num">${p.n}</span><div><b>${p.name}</b></div></li>`).join('');
    labelsEl.innerHTML = named.map(p => `<span class="pin" data-n="${p.n}">${p.n}</span>`).join('');
    document.querySelectorAll('.tabs button').forEach(b => b.setAttribute('aria-selected', b.dataset.k === key));
    userYaw = 0; userPitch = 0;
  }
  legend.addEventListener('pointerover', e => { const li = e.target.closest('li'); hovered = li ? +li.dataset.n : -1; });
  legend.addEventListener('pointerleave', () => (hovered = -1));

  const setT = v => { target = Math.max(0, Math.min(1, v)); slider.value = Math.round(target * 100); };
  slider.addEventListener('input', () => (target = slider.value / 100));
  stage.addEventListener('wheel', e => { e.preventDefault(); setT(target - e.deltaY * 0.0011); }, { passive: false });
  let drag = null, pinch = null; const pts = new Map();
  stage.addEventListener('pointerdown', e => { stage.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]); if (pts.size === 1) drag = [e.clientX, e.clientY, userYaw, userPitch]; });
  stage.addEventListener('pointermove', e => {
    if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, [e.clientX, e.clientY]);
    if (pts.size === 2) { const [a, b] = [...pts.values()]; const dd = Math.hypot(a[0] - b[0], a[1] - b[1]); if (pinch) setT(target + (dd - pinch) * 0.004); pinch = dd; drag = null; return; }
    if (drag) { userYaw = drag[2] + (e.clientX - drag[0]) * 0.008; userPitch = Math.max(-0.25, Math.min(0.9, drag[3] + (e.clientY - drag[1]) * 0.005)); }
  });
  const up = e => { pts.delete(e.pointerId); if (pts.size < 2) pinch = null; if (!pts.size) drag = null; };
  stage.addEventListener('pointerup', up); stage.addEventListener('pointercancel', up);
  document.querySelectorAll('.tabs button').forEach(b => b.addEventListener('click', () => { load(b.dataset.k); setT(0.55); }));
  document.getElementById('assemble').addEventListener('click', () => setT(0));
  document.getElementById('explodeAll').addEventListener('click', () => setT(1));
  stage.addEventListener('keydown', e => { if (e.key === '+' || e.key === '=' || e.key === 'ArrowUp') setT(target + 0.1); if (e.key === '-' || e.key === 'ArrowDown') setT(target - 0.1); if (e.key === 'ArrowLeft') userYaw -= 0.2; if (e.key === 'ArrowRight') userYaw += 0.2; });

  function resize() { const w = stage.clientWidth, h = stage.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  new ResizeObserver(resize).observe(stage);
  let visible = true; new IntersectionObserver(es => (visible = es[0].isIntersecting)).observe(stage);

  const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const v = new T.Vector3(), bb = new T.Box3();
  function frame() {
    requestAnimationFrame(frame);
    if (!visible || !cur) return;
    amt += (target - amt) * (reduced ? 1 : 0.09);
    const e = ease(amt);
    // zooming in turns the detail and pulls the camera closer
    yaw = cur.yaw0 + userYaw + (reduced ? 0 : e * (cur.spin || 1.35));
    const dist = cur.far + (cur.near - cur.far) * e, pitch = cur.pitch + userPitch + e * 0.12;
    camera.position.set(cur.center.x + Math.sin(yaw) * Math.cos(pitch) * dist, cur.center.y + Math.sin(pitch) * dist + e * 0.8, cur.center.z + Math.cos(yaw) * Math.cos(pitch) * dist);
    camera.lookAt(cur.center.x, cur.center.y + e * 1.2, cur.center.z);
    cur.parts.forEach(p => {
      const k = Math.max(0, Math.min(1, e * 1.25 - p.stagger * 0.03));
      p.g.position.copy(p.dir).multiplyScalar(k * 0.95);
      p.g.traverse(o => { if (o.userData.spread) o.position.x = o.userData.base.x + o.userData.spread * k * 1.6; });
      p.g.traverse(o => {
        const b = o.userData.bricks; if (!b || Math.abs(b.last - k) < 0.002) return; b.last = k;
        const m4 = new T.Matrix4(), s = 0.22 * k;
        for (let j = 0; j < b.base.length / 3; j++) {
          const x = b.base[3 * j], y = b.base[3 * j + 1], z = b.base[3 * j + 2];
          m4.makeScale(b.sx ? b.sx[j] : 1, 1, 1).setPosition(x * (1 + s * 0.6), b.cy + (y - b.cy) * (1 + s * 2.2), z * (1 + s * 3));
          o.setMatrixAt(j, m4);
        }
        o.instanceMatrix.needsUpdate = true;
      });
      const hi = hovered > 0 && p.n === hovered;
      p.g.traverse(o => { [].concat(o.material || []).forEach(m => m.emissive && m.emissive.setHex(0)); });
      if (hi) p.g.traverse(o => { [].concat(o.material || []).forEach(m => m.emissive && m.emissive.setHex(0x3a2a18)); });
    });
    const W = stage.clientWidth, H = stage.clientHeight, show = e > 0.2;
    labelsEl.style.opacity = show ? Math.min(1, (e - 0.2) * 3) : 0;
    if (show) cur.parts.forEach(p => {
      if (!p.name) return; const el = labelsEl.querySelector(`[data-n="${p.n}"]`);
      if (!p.g.children.length) { el.style.transform = 'translate(-999px,-999px)'; return; }
      if (!p.pin) { // pick the mesh closest to the part's middle, once
        bb.setFromObject(p.g); const c = bb.getCenter(new T.Vector3()); let best = null, bd = 1e9; const b2 = new T.Box3(), c2 = new T.Vector3();
        p.g.traverse(o => { if (!o.isMesh || o.isLineSegments) return; b2.setFromObject(o); b2.getCenter(c2); const dd = c2.distanceTo(c); if (dd < bd) { bd = dd; best = o; } });
        p.pin = best || p.g;
      }
      if (p.anchor) { v.copy(p.anchor); p.g.localToWorld(v); } else { bb.setFromObject(p.pin); bb.getCenter(v); } v.project(camera);
      el.style.transform = `translate(${(v.x * 0.5 + 0.5) * W}px,${(-v.y * 0.5 + 0.5) * H}px)`;
      el.classList.toggle('on', hovered === p.n);
    });
    renderer.render(scene, camera);
  }
  try { load('wall'); resize(); setT(0.35); frame(); } catch (err) { fail('init'); return; }
  window.x3dReady = true;
  const msg = document.getElementById('x3d-msg'); if (msg) msg.remove();
})();
