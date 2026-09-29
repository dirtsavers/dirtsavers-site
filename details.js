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
    fabric: mat(0xece6da, { transparent: true, opacity: 0.7, side: T.DoubleSide }),
    fill: mat(0x9b7652, { transparent: true, opacity: 0.32, depthWrite: false }),
    soil: mat(0x8c6c4c, { transparent: true, opacity: 0.28, depthWrite: false }),
    pipe: mat(0x2f3134, { roughness: 0.5 }), cap: mat(0xd9d0c0), capDk: mat(0xcbbfa9),
    mortar: mat(0xd8d2c6), panel: mat(0x39322c, { roughness: 0.5, metalness: 0.2 }),
    tie: mat(0x9aa2a8, { metalness: 0.6, roughness: 0.4 })
  };
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

  /* ---------- 1. Stone gravity retaining wall ---------- */
  function buildWall() {
    seed = 11; const d = new Detail(); const L = 10, courses = 10, ch = 0.8, set = 0.1;
    const pad = d.part('Reinforced concrete footing', 'Cast on undisturbed or compacted subgrade, below the frost and moisture zone.', [0, -1.8, 0]);
    pad.add(box(L + 0.6, 1, 4.2, M.concrete, 0, -0.5, -1.4));
    const steel = d.part('Footing reinforcement', 'Continuous bars with cross bars, held up on chairs for cover.', [0, -3.6, 1.2]);
    [-2.9, -1.4, 0.1].forEach(z => steel.add(bar(L + 0.3, 0.035, M.rebar, 'x', 0, -0.72, z)));
    for (let x = -L / 2 + 0.3; x <= L / 2 - 0.2; x += 0.9) steel.add(bar(3.6, 0.03, M.rebar, 'z', x, -0.8, -1.4));
    let backs = [];
    for (let i = 0; i < courses; i++) {
      const g = d.part(i === 0 ? 'Stone units, bottom course buried' : i === 1 ? 'Stone units, battered face' : null, i === 0 ? 'The first course sits below finished grade for embedment.' : 'Each course steps back from the one below, leaning the wall into the hill.', [0, 0.42 * (i + 1), 0.1 * (i + 1)], i);
      const depth = 3.2 - (1.3 * i) / (courses - 1), zf = -i * set, y = i * ch + ch / 2;
      backs.push(zf - depth);
      let x = -L / 2 + (i % 2 ? 0.8 : 0) - (i % 2 ? 1.6 : 0);
      while (x < L / 2) {
        const w = Math.min(1.5 + rnd() * 0.7, L / 2 - x); const x0 = Math.max(x, -L / 2); const ww = Math.min(x + w, L / 2) - x0;
        if (ww > 0.2) { const b = box(ww - 0.03, ch - 0.03, depth, M.block[(rnd() * 4) | 0], x0 + ww / 2, y, zf - depth / 2); b.userData.spread = (x0 + ww / 2) * 0.06; g.add(b); }
        x += w;
      }
    }
    const cap = d.part('Cap stone', 'Set on adhesive or mortar to lock the top course.', [0, 7.2, 0.9]);
    cap.add(box(L + 0.2, 0.45, 2.2, M.cap, 0, courses * ch + 0.22, -courses * set - 0.95));
    const agg = d.part('Drainage aggregate zone', 'Clean washed stone behind the wall so water drains down instead of pushing on it.', [0, 0.4, -3.2]);
    for (let i = 0; i < courses; i++) agg.add(box(L, ch, 1.1, M.gravel, 0, i * ch + ch / 2, backs[i] - 0.55, false));
    pebbles(420, -L / 2, L / 2, 0, courses * ch, Math.min(...backs) - 1.1, backs[courses - 1], agg);
    const pipe = d.part('Perforated drain pipe', 'Runs along the base behind the wall and outlets to daylight.', [0, -0.9, -4.4]);
    const pz = backs[0] - 0.5; pipe.add(bar(L + 0.8, 0.2, M.pipe, 'x', 0, 0.28, pz));
    for (let x = -L / 2; x <= L / 2; x += 0.35) { const r = new T.Mesh(new T.TorusGeometry(0.2, 0.025, 5, 16), M.pipe); r.rotation.y = Math.PI / 2; r.position.set(x, 0.28, pz); pipe.add(r); }
    const fab = d.part('Filter fabric', 'Separates the drainage stone from the retained soil so fines do not clog it.', [0, 0.3, -5.8]);
    const zfab = Math.min(...backs) - 1.15;
    fab.add(box(L, courses * ch, 0.04, M.fabric, 0, (courses * ch) / 2, zfab, false));
    const fill = d.part('Compacted retained fill', 'Placed and compacted in lifts behind the fabric.', [0, 0.2, -8.6]);
    fill.add(box(L, courses * ch, 5, M.fill, 0, (courses * ch) / 2, zfab - 2.55, false));
    const front = d.part('Finished grade at the toe', 'Ground in front of the wall covers the buried course.', [0, -0.6, 3]);
    front.add(box(L, 0.8, 3, M.soil, 0, 0.4, 1.5, false));
    d.center = new T.Vector3(0, 3.8, -3); d.far = 36; d.near = 31; d.yaw0 = -0.75; d.pitch = 0.3;
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
    const ft = d.part('Spread footing', 'Wide footing spreads the column load and resists overturning from wind.', [0, -3, 0]);
    ft.add(box(7, 1.5, 7, M.concrete, 0, -0.75, 0));
    const mat_ = d.part('Footing mat and dowels', 'Two-way bar mat with dowels that lap into the column cells.', [0, -1.6, 3.4]);
    for (let s = -3.1; s <= 3.1; s += 0.62) { mat_.add(bar(6.6, 0.035, M.rebar, 'x', 0, -1.2, s)); mat_.add(bar(6.6, 0.035, M.rebar, 'z', s, -1.12, 0)); }
    const bars = [[-1.2, -1.2], [1.2, -1.2], [-1.2, 1.2], [1.2, 1.2], [0, -1.2], [0, 1.2], [-1.2, 0], [1.2, 0]];
    const vert = d.part('Vertical bars in grouted cells', 'Bars run from the footing to the top and are grouted solid in the block cells.', [0, 1.2, 0]);
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
    d.center = new T.Vector3(0, 5.2, 0); d.far = 40; d.near = 37; d.yaw0 = -0.7; d.pitch = 0.2;
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
    cur.parts.forEach(p => { if (!p.cloned) { p.cloned = 1; p.g.traverse(o => { if (o.isMesh && o.material && o.material.emissive) o.material = o.material.clone(); }); } p.g.traverse(o => { if (o.isMesh && o.userData.spread === undefined) o.userData.spread = 0; if (o.isMesh || o.isInstancedMesh) o.userData.base = o.userData.base || o.position.clone(); }); });
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
    yaw = cur.yaw0 + userYaw + (reduced ? 0 : e * 1.35);
    const dist = cur.far + (cur.near - cur.far) * e, pitch = cur.pitch + userPitch + e * 0.12;
    camera.position.set(cur.center.x + Math.sin(yaw) * Math.cos(pitch) * dist, cur.center.y + Math.sin(pitch) * dist + e * 0.8, cur.center.z + Math.cos(yaw) * Math.cos(pitch) * dist);
    camera.lookAt(cur.center.x, cur.center.y + e * 1.2, cur.center.z);
    cur.parts.forEach(p => {
      const k = Math.max(0, Math.min(1, e * 1.25 - p.stagger * 0.03));
      p.g.position.copy(p.dir).multiplyScalar(k * 0.95);
      p.g.traverse(o => { if (o.userData.spread) o.position.x = o.userData.base.x + o.userData.spread * k * 1.6; });
      const hi = hovered > 0 && p.n === hovered;
      p.g.traverse(o => { if (o.material && o.material.emissive) o.material.emissive.setHex(0); });
      if (hi) p.g.traverse(o => { if (o.material && o.material.emissive) o.material.emissive.setHex(0x3a2a18); });
    });
    const W = stage.clientWidth, H = stage.clientHeight, show = e > 0.2;
    labelsEl.style.opacity = show ? Math.min(1, (e - 0.2) * 3) : 0;
    if (show) cur.parts.forEach(p => {
      if (!p.name) return; const el = labelsEl.querySelector(`[data-n="${p.n}"]`);
      bb.setFromObject(p.g); bb.getCenter(v); v.project(camera);
      el.style.transform = `translate(${(v.x * 0.5 + 0.5) * W}px,${(-v.y * 0.5 + 0.5) * H}px)`;
      el.classList.toggle('on', hovered === p.n);
    });
    renderer.render(scene, camera);
  }
  load('wall'); resize(); setT(0.35); frame();
})();
