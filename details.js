/* DirtSavers exploded details. Units are feet, y is up. Zoom in (wheel, pinch, slider) and the detail comes apart and turns. */
(function () {
  const stage = document.getElementById('stage');
  if (!stage || !window.THREE) return;
  const T = THREE;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- renderer / scene ---------- */
  const renderer = new T.WebGLRenderer({ antialias: true, alpha: true });
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

    const E = d.part('Fully mortared zone "E"', 'Stone fully mortared top, bottom, front and back: behind the face, the bottom course, the top course and the back stones.', [0, 0.6, 1.2]);
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

    const dz = d.part('Drainage zone', 'Continuous gravel or clean free-draining rock behind the wall, sized for the wall, so water gets out through the weeps.', [0, 0.3, -5.2]);
    const gpts = [];
    ys.forEach((y, i) => { if (y < wy || y > H - 0.67) return; gpts.push([back(Math.min(y + 0.01, H - 0.7)), y]); });
    const g0 = wy, g1 = H - 0.67;
    const inner = steps(16).map(t => g0 + t * (g1 - g0)).map(y => [back(y), y]);
    dz.add(sect([...inner, ...inner.slice().reverse().map(([s, y]) => [s + G, y])], gravel, L));

    const fab = d.part('Filter fabric around drainage zone', 'Black nonwoven geotextile, finely perforated so water passes through. Wraps the gravel so fines from the soil do not clog it.', [0, 0.5, -7.0]);
    const outer = steps(48).map(t => g0 + t * (g1 - g0)).map(y => [back(y) + G + 0.06 + 0.045 * Math.sin(y * 5.2) + 0.02 * Math.sin(y * 13.1), y]);
    fab.add(sect([...outer, ...outer.slice().reverse().map(([s, y]) => [s + 0.045, y])], M.fabric, L, false));
    fab.add(sect([[back(g1), g1], [back(g1) + G + 0.1, g1], [back(g1) + G + 0.1, g1 + 0.05], [back(g1), g1 + 0.05]], M.fabric, L, false));
    fab.add(sect([[back(g0), g0 - 0.05], [back(g0) + G + 0.1, g0 - 0.05], [back(g0) + G + 0.1, g0], [back(g0), g0]], M.fabric, L, false));

    const comp = d.part('Compacted soil below weep pipe', 'Compacted soil fills in under the drainage zone so water is pushed out the weeps.', [0, -1.2, -5.2]);
    comp.add(sect([[B, -(C + C1)], [B + G + 0.6, -(C + C1)], [B + G + 0.6, wy - 0.05], [back(0.3), wy - 0.05], [B, 0]], compM, L));

    const slope = s => H + Math.max(0, (s - face(H))) / 4;  // 1V:4H max above the wall
    const clayP = d.part('Clay cap from onsite soils', 'A layer of clay over the drainage zone so runoff sheets over the top of the wall instead of soaking in.', [0, 3.6, -5.2]);
    const c0 = face(H) + 1.0, c1 = back(g1) + G + 0.8;
    const ctop = steps(8).map(t => c0 + t * (c1 - c0)).map(s => [s, slope(s)]);
    clayP.add(sect([[c0, H], [c1, g1 + 0.05], ...ctop.slice().reverse()], clay, L));

    const ret = d.part('Retained soil', 'Natural or compacted fill behind the wall. Slope above the wall as shown on the plans.', [0, 0.4, -10]);
    const r0 = B + G + 0.6, r1 = 14;
    const rtop = steps(8).map(t => r0 + t * (r1 - r0)).map(s => [s, s < c1 ? g1 : slope(s)]);
    ret.add(sect([[r0, -(C + C1) - 0.4], [r1, -(C + C1) - 0.4], ...rtop.slice().reverse().filter(([s]) => s <= r1)], fillM, L, false));

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
  function buildScreen() {
    seed = 23; const d = new Detail(); const L = 16, piers = [-7, 0, 7], H = 6;
    const pr = d.part('Drilled concrete piers', 'Straight-shaft piers carry the wall down to stable soil.', [0, -6.5, 0]);
    piers.forEach(x => { const c = new T.Mesh(new T.CylinderGeometry(0.6, 0.6, 9, 24), M.concreteDk); c.position.set(x, -5.8, 0); c.castShadow = true; c.receiveShadow = true; pr.add(c); });
    const cages = d.part('Pier reinforcing cages', 'Vertical bars tied inside hoops, extended up into the grade beam.', [0, -3.4, 3.2]);
    piers.forEach(x => {
      for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; cages.add(bar(10, 0.035, M.rebar, 'y', x + Math.cos(a) * 0.42, -5.2, Math.sin(a) * 0.42)); }
      for (let y = -9.6; y <= -0.4; y += 0.9) cages.add(ring(0.44, 0.022, M.rebar, x, y, 0));
    });
    const gb = d.part('Grade beam', 'Continuous concrete beam that spans between piers under the wall.', [0, -3.2, 0]);
    gb.add(box(L + 1.4, 1.5, 1.4, M.concrete, 0, -0.75, 0));
    const gbs = d.part('Grade beam reinforcing', 'Top and bottom bars with closed stirrups.', [0, -1.6, 2.6]);
    [[-0.3, -0.35], [-0.3, 0.35], [-1.25, -0.35], [-1.25, 0.35]].forEach(([y, z]) => gbs.add(bar(L + 1.2, 0.035, M.rebar, 'x', 0, y, z)));
    for (let x = -L / 2 - 0.5; x <= L / 2 + 0.5; x += 0.75) gbs.add(loop(0.8, 1.05, 0.022, M.rebar, x, -0.78, 0));
    const bw = 0.67, bh = 0.22, lifts = 3, perLift = Math.round(H / bh / lifts);
    for (let l = 0; l < lifts; l++) {
      const g = d.part(l === 0 ? 'Brick veneer panels' : null, 'Brick laid in running bond between the columns, tied to the structure behind it.', [0, 1.3 + l * 1.5, 0], l);
      const geo = new T.BoxGeometry(bw - 0.03, bh - 0.025, 0.33);
      const counts = [0, 0, 0, 0]; const cells = [];
      for (let c = l * perLift; c < (l + 1) * perLift; c++) {
        for (let x = -L / 2 + (c % 2 ? bw / 2 : 0); x < L / 2 - 0.01; x += bw) {
          const xc = x + bw / 2; if (piers.some(p => Math.abs(xc - p) < 1.25) || xc > L / 2 - 0.3 || xc < -L / 2 + 0.3) continue;
          const k = (rnd() * 4) | 0; counts[k]++; cells.push([k, xc, c * bh + bh / 2]);
        }
      }
      counts.forEach((n, k) => {
        if (!n) return; const im = new T.InstancedMesh(geo, M.brick[k], n * 2); const o = new T.Object3D(); let i = 0;
        cells.filter(c => c[0] === k).forEach(([, x, y]) => [-0.19, 0.19].forEach(z => { o.position.set(x, y, z); o.updateMatrix(); im.setMatrixAt(i++, o.matrix); }));
        im.castShadow = true; im.receiveShadow = true; g.add(im);
      });
    }
    const cols = d.part('Stone columns over each pier', 'Columns sit directly over the piers and brace the wall panels.', [0, 1.8, 2.8]);
    piers.forEach(x => { for (let s = 0; s < 7; s++) cols.add(box(2.2, 0.98, 2.2, M.stone[(rnd() * 5) | 0], x, s + 0.5, 0)); });
    const caps = d.part('Precast caps', 'Wall cap and column caps shed water off the top.', [0, 6.8, 1.2]);
    piers.forEach(x => caps.add(box(2.7, 0.45, 2.7, M.cap, x, 7.22, 0)));
    [[-3.5, 5.4], [3.5, 5.4]].forEach(([x, w]) => caps.add(box(w - 0.1, 0.3, 1.0, M.capDk, x, H + 0.15, 0)));
    d.center = new T.Vector3(0, 1.2, 0); d.far = 50; d.near = 46; d.yaw0 = -0.6; d.pitch = 0.22;
    return d;
  }

  /* ---------- 3. Entry monument column with sign ---------- */
  function buildMonument() {
    seed = 41; const d = new Detail(); const W = 3.34, H = 10;
    const pier = d.part('Drilled concrete pier', 'A drilled pier under the column carries the load down to stable soil and resists overturning from wind.', [0, -6.0, 0]);
    const ps = new T.Mesh(new T.CylinderGeometry(1.0, 1.0, 11, 28), M.concreteDk); ps.position.set(0, -7.0, 0); ps.castShadow = true; ps.receiveShadow = true; pier.add(ps);
    const cage = d.part('Pier cage', 'Vertical bars tied inside hoops, running up out of the pier into the pier cap.', [0, -3.4, 3.6]);
    for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; cage.add(bar(11.6, 0.04, M.rebar, 'y', Math.cos(a) * 0.72, -6.5, Math.sin(a) * 0.72)); }
    for (let y = -12.0; y <= -1.2; y += 0.9) cage.add(ring(0.74, 0.024, M.rebar, 0, y, 0));
    const ft = d.part('Pier cap', 'Concrete cap poured on top of the pier. The column bars start here.', [0, -2.4, 0]);
    ft.add(box(4.6, 1.5, 4.6, M.concrete, 0, -0.75, 0));
    const mat_ = d.part('Pier cap reinforcing', 'Bars in the pier cap tie the pier cage and the column bars together.', [0, -1.4, -3.6]);
    for (let s = -1.9; s <= 1.9; s += 0.63) { mat_.add(bar(4.2, 0.035, M.rebar, 'x', 0, -1.2, s)); mat_.add(bar(4.2, 0.035, M.rebar, 'z', s, -1.12, 0)); }
    const bars = [[-1.2, -1.2], [1.2, -1.2], [-1.2, 1.2], [1.2, 1.2], [0, -1.2], [0, 1.2], [-1.2, 0], [1.2, 0]];
    const vert = d.part('Vertical bars in grouted cells', 'Bars run from the pier cap to the top and are grouted solid in the block cells.', [0, 1.2, 0]);
    bars.forEach(([x, z]) => vert.add(bar(H + 1, 0.04, M.rebar, 'y', x, H / 2 - 0.4, z)));
    for (let l = 0; l < 3; l++) {
      const g = d.part(l === 0 ? 'CMU structural core' : null, 'Concrete block core in running bond, the structure behind the stone.', [0, 0.9 + l * 1.1, 0], l);
      for (let c = Math.round(l * 5); c < Math.round((l + 1) * 5); c++) {
        const y = c * 0.667 + 0.333, even = c % 2 === 0;
        [[0, -W / 2 + 0.33, 'x'], [0, W / 2 - 0.33, 'x'], [-W / 2 + 0.33, 0, 'z'], [W / 2 - 0.33, 0, 'z']].forEach(([x, z, ax], i) => {
          const along = (ax === 'x') === even;
          const len = along ? W : W - 1.33; const bx = ax === 'x' ? len : 0.66, bz = ax === 'x' ? 0.66 : len;
          const half = len / 2;
          for (let s = -half; s < half - 0.05; s += 1.33) { const w = Math.min(1.33, half - s); g.add(box(ax === 'x' ? w - 0.03 : bx - 0.03, 0.64, ax === 'x' ? bz - 0.03 : w - 0.03, M.block[(i + c) % 4], ax === 'x' ? s + w / 2 : x, y, ax === 'x' ? z : s + w / 2)); }
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

  /* ---------- state, legend, interaction ---------- */
  const builders = { wall: buildWall, screen: buildScreen, monument: buildMonument };
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
    legend.innerHTML = named.map(p => `<li data-n="${p.n}"><span class="num">${p.n}</span><div><b>${p.name}</b><small>${p.note}</small></div></li>`).join('');
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
      const hi = hovered > 0 && p.n === hovered;
      p.g.traverse(o => { [].concat(o.material || []).forEach(m => m.emissive && m.emissive.setHex(0)); });
      if (hi) p.g.traverse(o => { [].concat(o.material || []).forEach(m => m.emissive && m.emissive.setHex(0x3a2a18)); });
    });
    const W = stage.clientWidth, H = stage.clientHeight, show = e > 0.2;
    labelsEl.style.opacity = show ? Math.min(1, (e - 0.2) * 3) : 0;
    if (show) cur.parts.forEach(p => {
      if (!p.name) return; const el = labelsEl.querySelector(`[data-n="${p.n}"]`);
      if (!p.pin) { // pick the mesh closest to the part's middle, once
        bb.setFromObject(p.g); const c = bb.getCenter(new T.Vector3()); let best = null, bd = 1e9; const b2 = new T.Box3(), c2 = new T.Vector3();
        p.g.traverse(o => { if (!o.isMesh || o.isLineSegments) return; b2.setFromObject(o); b2.getCenter(c2); const dd = c2.distanceTo(c); if (dd < bd) { bd = dd; best = o; } });
        p.pin = best || p.g;
      }
      bb.setFromObject(p.pin); bb.getCenter(v); v.project(camera);
      el.style.transform = `translate(${(v.x * 0.5 + 0.5) * W}px,${(-v.y * 0.5 + 0.5) * H}px)`;
      el.classList.toggle('on', hovered === p.n);
    });
    renderer.render(scene, camera);
  }
  load('wall'); resize(); setT(0.35); frame();
})();
