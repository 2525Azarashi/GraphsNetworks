// Labs for Lecture 5 : local connectivity, x-y vertex cuts, internally disjoint paths, contraction, Menger's theorem
import { h, sleep, toast } from '../lib/ui.js'
import { GraphView, PAL, circle, toNodes, adjOf, ek } from '../lib/graph.js'
import { labFrame, readout, verdict, seg, editModes } from '../lib/lab.js'

const W = 600, H = 380
const PCOL = ['hi', 'hi2', 'hi3', 'hi4']
const PNODE = ['pink', 'mint', 'sky', 'lav', 'peach', 'lemon']
const PHEX = [PAL.pink, PAL.mint, PAL.sky, PAL.lav, PAL.peach, PAL.lemon]

// ---------- algorithms ----------
function* combos(arr, k, start = 0, cur = []) {
  if (cur.length === k) { yield cur.slice(); return }
  for (let i = start; i < arr.length; i++) { cur.push(arr[i]); yield* combos(arr, k, i + 1, cur); cur.pop() }
}
// set of vertices reachable from src avoiding `removed`
export function reach(adj, src, removed = new Set()) {
  const seen = new Set([src]), st = [src]
  while (st.length) { const u = st.pop(); for (const w of adj.get(u)) if (!removed.has(w) && !seen.has(w)) { seen.add(w); st.push(w) } }
  return seen
}
export const separates = (adj, x, y, S) => !reach(adj, x, S).has(y)
// κ_G(x,y) by brute force (x,y non-adjacent)
export function localKappa(adj, x, y) {
  const others = [...adj.keys()].filter((v) => v !== x && v !== y)
  for (let k = 0; k <= others.length; k++) for (const S of combos(others, k)) if (separates(adj, x, y, new Set(S))) return { k, cut: S }
  return { k: Infinity, cut: null }
}
// maximum set of internally disjoint x-y paths (vertex-split max-flow) + a minimum x-y separator
const SEP = '\u0001'
export function menger(adj, x, y) {
  const C = new Map(), O = new Map()
  const g = (m, u) => { if (!m.has(u)) m.set(u, new Map()); return m.get(u) }
  const add = (u, v, c) => { g(C, u).set(v, (g(C, u).get(v) || 0) + c); g(O, u).set(v, (g(O, u).get(v) || 0) + c); if (!g(C, v).has(u)) g(C, v).set(u, 0) }
  const I = (v) => v + SEP + 'i', Ou = (v) => v + SEP + 'o'
  for (const v of adj.keys()) add(I(v), Ou(v), v === x || v === y ? 99 : 1)
  for (const v of adj.keys()) for (const w of adj.get(v)) add(Ou(v), I(w), 99)
  const s = Ou(x), t = I(y)
  let flow = 0
  for (;;) {
    const par = new Map([[s, null]]), q = [s]
    while (q.length && !par.has(t)) { const u = q.shift(); for (const [v, c] of C.get(u)) if (c > 0 && !par.has(v)) { par.set(v, u); q.push(v) } }
    if (!par.has(t)) break
    for (let v = t; par.get(v) != null; v = par.get(v)) { const u = par.get(v); C.get(u).set(v, C.get(u).get(v) - 1); C.get(v).set(u, C.get(v).get(u) + 1) }
    flow++
    if (flow > 50) break
  }
  // flow on original arcs u_o -> w_i
  const F = new Map()
  for (const v of adj.keys()) for (const w of adj.get(v)) { const f = (O.get(Ou(v)).get(I(w)) || 0) - C.get(Ou(v)).get(I(w)); if (f > 0) F.set(v + SEP + w, f) }
  for (const k of [...F.keys()]) { const [a, b] = k.split(SEP); if (F.get(k) && F.get(b + SEP + a)) { F.delete(k); F.delete(b + SEP + a) } }
  const paths = []
  for (let r = 0; r < flow; r++) {
    const p = [x]; let u = x, guard = 0
    while (u !== y && guard++ < 200) {
      let nx = null
      for (const w of adj.get(u)) if (F.get(u + SEP + w)) { nx = w; break }
      if (!nx) break
      F.set(u + SEP + nx, F.get(u + SEP + nx) - 1); p.push(nx); u = nx
    }
    if (u === y) paths.push(p)
  }
  // min separator from residual reachability
  const R = new Set([s]), q = [s]
  while (q.length) { const u = q.shift(); for (const [v, c] of C.get(u)) if (c > 0 && !R.has(v)) { R.add(v); q.push(v) } }
  const cut = [...adj.keys()].filter((v) => v !== x && v !== y && R.has(I(v)) && !R.has(Ou(v)))
  return { k: flow, paths, cut }
}
// greedy: repeatedly take a shortest x-y path through unused vertices (may get stuck!)
export function greedyPaths(adj, x, y) {
  const used = new Set(), paths = []
  for (;;) {
    const par = new Map([[x, null]]), q = [x]
    while (q.length && !par.has(y)) { const u = q.shift(); for (const w of adj.get(u)) if (!par.has(w) && !used.has(w) && !(u === x && w === y)) { par.set(w, u); q.push(w) } }
    if (!par.has(y)) break
    const p = []; for (let v = y; v != null; v = par.get(v)) p.unshift(v)
    p.slice(1, -1).forEach((v) => used.add(v)); paths.push(p)
    if (paths.length > 20) break
  }
  return paths
}
// contract vertex set X into a single vertex `nid`
export function contract(ids, edges, X, nid) {
  const inX = new Set(X), nids = ids.filter((v) => !inX.has(v)).concat([nid]), seen = new Set(), E = []
  for (const [a, b] of edges) {
    const A = inX.has(a) ? nid : a, B = inX.has(b) ? nid : b
    if (A === B) continue
    const k = ek(A, B); if (seen.has(k)) continue
    seen.add(k); E.push([A, B])
  }
  return { ids: nids, edges: E }
}

const showPath = async (g, p, i, dur = 200) => {
  p.forEach((v, j) => { if (j && j < p.length - 1) g.color(v, PNODE[i % PNODE.length]) })
  for (let j = 0; j + 1 < p.length; j++) { g.edgeClass(p[j], p[j + 1], PCOL[i % 4]); await g.travel(p[j], p[j + 1], PHEX[i % PHEX.length], dur) }
}
const pstr = (p, nm = (v) => v) => p.map(nm).join('-')

// =========================================================
// LAB 5-1 : x-y 頂点切断と局所連結度 κ_G(x,y)
// =========================================================
export function labLocal() {
  const f = labFrame({ title: 'x と y を引き離すには、何個抜けばいい？', hint: '頂点をタップして “抜く” 集合 $S$ を選ぼう（$x, y$ は抜けません）。$x$ と $y$ が別の島になれば $S$ は <b>$x$-$y$ 頂点切断</b>。その最小の大きさが <b>局所連結度 $\\kappa_G(x,y)$</b>。上のボタンで $x, y$ の場所も変えられます。', color: 'lemon', no: '5-1' })
  const pos = { x: [60, 190], a: [170, 80], b: [170, 190], c: [170, 300], d: [300, 130], e: [300, 250], u: [420, 70], f: [420, 190], g: [420, 310], y: [540, 190] }
  const E = [['x', 'a'], ['x', 'b'], ['x', 'c'], ['a', 'b'], ['b', 'c'], ['a', 'd'], ['b', 'd'], ['b', 'e'], ['c', 'e'], ['d', 'e'], ['d', 'u'], ['d', 'f'], ['e', 'f'], ['e', 'g'], ['u', 'y'], ['f', 'y'], ['g', 'y'], ['u', 'f'], ['f', 'g']]
  const g = new GraphView(f.canvas, { w: W, h: H, draggable: true, nodes: toNodes(pos), edges: E })
  let X = 'x', Y = 'y', mode = 0
  const S = new Set()
  const rs = readout('選んだ S'), vd = verdict('', 'mid'), rk = readout('κ_G(x, y)（総当たり）'), rg = readout('くらべてみよう：κ(G)')
  f.side.append(rs, vd, rk, rg)
  const name = (v) => (v === X ? 'x' : v === Y ? 'y' : v)
  function paint() {
    g.reset()
    const adj = g.adj()
    g.ids().forEach((v) => { g.color(v, 'white'); g.label(v, v === X ? 'x' : v === Y ? 'y' : v); g.nodeClass(v, 'dim', S.has(v)) })
    for (const e of g.edges.values()) if (S.has(e.a) || S.has(e.b)) e.line.classList.add('ghost')
    g.color(X, 'pink'); g.color(Y, 'mint'); g.tag(X, 'x', 'pink'); g.tag(Y, 'y', 'mint')
    rs.set(S.size ? `{${[...S].join(', ')}}（大きさ ${S.size}）` : '∅')
    const rx = reach(adj, X, S)
    if (adj.get(X).has(Y)) { vd.set('x と y が隣接しているので、どんな S でも引き離せない（κ_G(x,y) は隣接しない 2 頂点で考える）', 'ng'); rk.set('—'); }
    else {
      const ry = reach(adj, Y, S)
      if (!rx.has(Y)) { g.blob([...rx], 'rgba(255,143,177,.3)', 26); g.blob([...ry], 'rgba(111,214,188,.32)', 26); vd.set(`x と y が分離！ S は x-y 頂点切断（大きさ ${S.size}）`, 'ok') }
      else vd.set('まだ x から y へ行ける…', 'mid')
      const { k } = localKappa(adj, X, Y)
      rk.set(`κ_G(x, y) = ${k}`)
    }
    rg.set(`κ(G) = ${globalKappa(adj)}　（全ペアの最小。κ(G) ≤ κ_G(x,y)）`)
  }
  function globalKappa(adj) {
    const ids = [...adj.keys()]
    let best = ids.length - 1
    for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) if (!adj.get(ids[i]).has(ids[j])) best = Math.min(best, localKappa(adj, ids[i], ids[j]).k)
    return best
  }
  g.on('nodeclick', (v) => {
    if (mode === 1 && v !== Y) { X = v; S.delete(v) } else if (mode === 2 && v !== X) { Y = v; S.delete(v) }
    else if (mode === 0 && v !== X && v !== Y) { S.has(v) ? S.delete(v) : S.add(v) }
    g.pulse(v); paint()
  })
  const best = h('button.btn.sm.lm', { onclick: async () => {
    const adj = g.adj(); if (adj.get(X).has(Y)) return
    const { k, cut } = localKappa(adj, X, Y)
    S.clear(); paint()
    for (const v of cut) { await sleep(380); S.add(v); paint(); g.pulse(v) }
    toast(`最小の x-y 頂点切断：大きさ ${k}`)
  } }, '🔍 最小の x-y 頂点切断')
  const sg = seg(['✂️ S を選ぶ', '📍 x を置く', '📍 y を置く'], (i) => { mode = i })
  f.ctrl.append(sg, best, h('button.btn.sm', { onclick: () => { S.clear(); X = 'x'; Y = 'y'; paint() } }, 'リセット'))
  paint()
  return f.el
}

// =========================================================
// LAB 5-2 : 内素な x-y 道（貪欲 vs 最大）＝ メンガーの等式
// =========================================================
export const PRESETS5 = {
  trap: { name: 'わな', pos: { x: [60, 190], p: [180, 100], a: [300, 60], b: [420, 100], c: [180, 280], d: [300, 320], s: [420, 280], y: [540, 190] }, E: [['x', 'p'], ['p', 'a'], ['a', 'b'], ['b', 'y'], ['x', 'c'], ['c', 'd'], ['d', 's'], ['s', 'y'], ['p', 's']], x: 'x', y: 'y' },
  cube: { name: '立方体 Q₃', pos: { x: [150, 300], b: [330, 300], c: [150, 120], d: [330, 120], e: [270, 250], f: [450, 250], g: [270, 70], y: [450, 70] }, E: [['x', 'b'], ['x', 'c'], ['b', 'd'], ['c', 'd'], ['e', 'f'], ['e', 'g'], ['f', 'y'], ['g', 'y'], ['x', 'e'], ['b', 'f'], ['c', 'g'], ['d', 'y']], x: 'x', y: 'y' },
  ladder: { name: 'はしご＋', pos: { x: [50, 190], a1: [160, 80], a2: [280, 80], a3: [400, 80], b1: [160, 190], b2: [280, 190], b3: [400, 190], c1: [160, 300], c2: [280, 300], c3: [400, 300], y: [550, 190] }, E: [['x', 'a1'], ['x', 'b1'], ['x', 'c1'], ['a1', 'a2'], ['a2', 'a3'], ['a3', 'y'], ['b1', 'b2'], ['b2', 'b3'], ['b3', 'y'], ['c1', 'c2'], ['c2', 'c3'], ['c3', 'y'], ['a1', 'b2'], ['b2', 'c3'], ['c1', 'b2'], ['b2', 'a3']], x: 'x', y: 'y' },
}
export function labPaths() {
  const f = labFrame({ title: '内素な道を何本とれる？ ── 貪欲 vs. 最大', hint: '<b>内素</b>＝端点 $x, y$ 以外に共通の頂点をもたないこと。「貪欲」は最短の道を 1 本ずつ確保していく方法。「最大」は道を<b>迂回させ直しながら</b>本数を最大化します。最大本数と、最小の $x$-$y$ 頂点切断の大きさが<b>必ず一致</b>する ── それがメンガーの定理！', color: 'pink', no: '5-2' })
  const g = new GraphView(f.canvas, { w: W, h: H, editable: true, mode: 'move', maxNodes: 14 })
  let cur = 'trap', X = 'x', Y = 'y', pick = 0
  const rg = readout('貪欲にとった本数'), rm = readout('最大本数（内素な道）'), rc = readout('最小の x-y 頂点切断'), vd = verdict('', 'mid'), rl = readout('道の一覧')
  f.side.append(rg, rm, rc, vd, rl)
  const base = () => { g.reset(); g.ids().forEach((v) => { g.color(v, 'white'); g.label(v, v === X ? 'x' : v === Y ? 'y' : v) }); g.color(X, 'pink'); g.color(Y, 'mint'); g.tag(X, 'x', 'pink'); g.tag(Y, 'y', 'mint') }
  const ok = () => { const adj = g.adj(); if (!adj.has(X) || !adj.has(Y)) { vd.set('x と y を選んでね', 'mid'); return null } if (adj.get(X).has(Y)) { vd.set('x と y が隣接しています。隣接しない 2 頂点を選んでね', 'ng'); return null } return adj }
  function info() {
    base(); rg.set('—'); rl.set('—')
    const adj = ok(); if (!adj) { rm.set('—'); rc.set('—'); return }
    const { k, cut } = menger(adj, X, Y)
    rm.set(`${k} 本`); rc.set(`{${cut.join(', ')}}（大きさ ${cut.length}）`)
    vd.set('ボタンで道を探してみよう', 'mid')
  }
  let busy = false
  async function runGreedy() {
    if (busy) return; const adj = ok(); if (!adj) return; busy = true
    base(); const P = greedyPaths(adj, X, Y), M = menger(adj, X, Y)
    for (let i = 0; i < P.length; i++) await showPath(g, P[i], i)
    rg.set(`${P.length} 本`); rl.set(P.map((p, i) => `P${i + 1}: ${pstr(p)}`).join('<br>'))
    if (P.length < M.k) vd.set(`貪欲は ${P.length} 本で行き止まり…。でも本当は ${M.k} 本とれる！ 「最大」で迂回の仕方を見よう`, 'ng')
    else vd.set(`貪欲でも最大の ${M.k} 本がとれた（いつもうまくいくとは限らない）`, 'ok')
    busy = false
  }
  async function runMax() {
    if (busy) return; const adj = ok(); if (!adj) return; busy = true
    base(); const { k, paths, cut } = menger(adj, X, Y)
    for (let i = 0; i < paths.length; i++) await showPath(g, paths[i], i)
    await sleep(300)
    cut.forEach((v) => { g.nodeClass(v, 'sel'); g.tag(v, 'S', 'lemon'); g.pulse(v, PAL.ink) })
    rl.set(paths.map((p, i) => `P${i + 1}: ${pstr(p)}`).join('<br>'))
    vd.set(`内素な道 ${k} 本 ＝ 最小頂点切断 ${cut.length} 個。各道が S の頂点をちょうど 1 つずつ通っている！`, 'ok')
    busy = false
  }
  function load(k) { cur = k; X = PRESETS5[k].x; Y = PRESETS5[k].y; g.load({ nodes: toNodes(PRESETS5[k].pos), edges: PRESETS5[k].E }); info() }
  g.on('nodeclick', (v) => { if (pick === 1 && v !== Y) X = v; else if (pick === 2 && v !== X) Y = v; else return; g.pulse(v); info() })
  g.on('change', () => { if (!busy) info() })
  const pk = seg(['✋', '📍 x', '📍 y'], (i) => { pick = i; g.setMode('move') })
  f.ctrl.append(seg(['わな', '立方体 Q₃', 'はしご＋'], (i) => load(['trap', 'cube', 'ladder'][i])), pk,
    h('button.btn.sm.lm', { onclick: runGreedy }, '🐾 貪欲に探す'), h('button.btn.sm.pk', { onclick: runMax }, '✨ 最大にする'), editModes(g))
  load('trap')
  return f.el
}

// =========================================================
// LAB 5-3 : 縮約 G/X
// =========================================================
export function labContract() {
  const f = labFrame({ title: '縮約 G/X：頂点の集まりを 1 点にぎゅっ', hint: '頂点をタップして集合 $X$ を選び、「縮約」を押すと $X$ が 1 つの頂点 $v_X$ にまとまります。$X$ の中の辺は消え、外とつながっていた辺は $v_X$ への辺に（重複は 1 本に）。', color: 'mint', no: '5-3' })
  const pos = { a: [90, 90], b: [70, 240], c: [200, 170], d: [210, 320], e: [330, 90], f: [340, 250], g: [460, 160], hh: [470, 310], i: [550, 70] }
  const E = [['a', 'b'], ['a', 'c'], ['b', 'c'], ['b', 'd'], ['c', 'd'], ['c', 'e'], ['c', 'f'], ['d', 'f'], ['e', 'f'], ['e', 'g'], ['f', 'g'], ['f', 'hh'], ['g', 'hh'], ['g', 'i'], ['e', 'i']]
  const lbl = (v) => (v === 'hh' ? 'h' : v)
  const g = new GraphView(f.canvas, { w: W, h: H, draggable: false })
  const X = new Set(['c', 'd', 'f'])
  let state = 'G'
  const rx = readout('X'), rb = readout('位数・サイズ（G）'), ra = readout('位数・サイズ（G/X）'), vd = verdict('', 'mid')
  f.side.append(rx, rb, ra, vd)
  function load() {
    state = 'G'; g.load({ nodes: toNodes(pos, Object.fromEntries(Object.keys(pos).map((k) => [k, { label: lbl(k) }]))), edges: E }); paint()
  }
  function paint() {
    g.reset()
    g.ids().forEach((v) => g.color(v, X.has(v) ? 'mint' : 'white'))
    for (const e of g.edges.values()) if (X.has(e.a) && X.has(e.b)) e.line.classList.add('ghost'); else if (X.has(e.a) || X.has(e.b)) e.line.classList.add('hi2')
    if (X.size) g.blob([...X], 'rgba(111,214,188,.3)', 28)
    rx.set(X.size ? `{${[...X].map(lbl).join(', ')}}` : '∅')
    rb.set(`|V| = ${g.nodes.size}、|E| = ${g.edges.size}`)
    const ct = contract(g.ids(), g.edgeList(), [...X], 'vX')
    ra.set(X.size ? `|V| = ${ct.ids.length}、|E| = ${ct.edges.length}` : '—')
    vd.set('「縮約」を押してね', 'mid')
  }
  g.on('nodeclick', (v) => { if (state !== 'G') return; X.has(v) ? X.delete(v) : X.add(v); g.pulse(v, PAL.mint); paint() })
  async function doContract() {
    if (state !== 'G') { load(); return }
    if (X.size < 1) { toast('X を選んでね'); return }
    const xs = [...X].map((v) => g.nodes.get(v)), cx = xs.reduce((s, n) => s + n.x, 0) / xs.length, cy = xs.reduce((s, n) => s + n.y, 0) / xs.length
    const inside = [...g.edges.values()].filter((e) => X.has(e.a) && X.has(e.b))
    inside.forEach((e) => e.el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400, fill: 'forwards' }))
    await g.morph(Object.fromEntries([...X].map((v) => [v, [cx, cy]])), 900)
    const ct = contract(g.ids(), g.edgeList(), [...X], 'vX')
    const P = {}; for (const n of g.nodes.values()) if (!X.has(n.id)) P[n.id] = [n.x, n.y]
    P.vX = [cx, cy]
    const before = g.edges.size
    g.load({ nodes: toNodes(P, { ...Object.fromEntries(Object.keys(P).map((k) => [k, { label: lbl(k) }])), vX: { label: 'v_X', color: 'mint' } }), edges: ct.edges }, false)
    g.pulse('vX', PAL.mint); g.bounce('vX'); g.tag('vX', 'X', 'mint')
    ct.edges.forEach(([a, b]) => { if (a === 'vX' || b === 'vX') g.edgeClass(a, b, 'hi2') })
    state = 'C'
    ra.set(`|V| = ${ct.ids.length}、|E| = ${ct.edges.length}`)
    vd.set(`縮約完了！ 辺は ${before} → ${ct.edges.length} 本（中の辺は消え、重なった辺は 1 本に）`, 'ok')
  }
  f.ctrl.append(h('button.btn.sm.mt', { onclick: doContract }, '🫧 縮約 ⇄ もどす'), h('button.btn.sm', { onclick: () => { X.clear(); load() } }, 'X を空に'))
  load()
  return f.el
}

// =========================================================
// LAB 5-4 : メンガーの定理の証明 ── 両側を縮約して “縫い合わせる”
// =========================================================
export function labStitch() {
  const f = labFrame({ title: '証明のキモ：S の両側を別々に解いて、S で縫い合わせる', hint: '最小の $x$-$y$ 頂点切断 $S$（大きさ $k$）が $x$ 側・$y$ 側の両方に “中身” をもつとき：①$y$ 側を 1 点 $y\'$ に縮約したグラフで $x\to S$ の $k$ 本、②$x$ 側を $x\'$ に縮約したグラフで $S\to y$ の $k$ 本（帰納法の仮定）、③ $S$ の各点でつなげば $k$ 本の内素な $x$-$y$ 道！', color: 'peach', no: '5-4' })
  const pos = { x: [50, 190], a: [140, 90], b: [150, 290], c: [220, 190], s1: [300, 70], s2: [300, 190], s3: [300, 310], d: [390, 110], e: [400, 260], f: [470, 190], y: [550, 190] }
  const E = [['x', 'a'], ['x', 'b'], ['x', 'c'], ['a', 'c'], ['b', 'c'], ['a', 's1'], ['c', 's1'], ['c', 's2'], ['b', 's3'], ['c', 's3'], ['s1', 's2'], ['s1', 'd'], ['s2', 'd'], ['s2', 'f'], ['s2', 'e'], ['s3', 'e'], ['d', 'f'], ['e', 'f'], ['d', 'y'], ['f', 'y'], ['e', 'y']]
  const SX = ['a', 'b', 'c'], SY = ['d', 'e', 'f'], S = ['s1', 's2', 's3']
  const lbl = { s1: 's₁', s2: 's₂', s3: 's₃' }
  const g = new GraphView(f.canvas, { w: W, h: H, draggable: false })
  const rs = readout('段階'), rp = readout('道'), vd = verdict('', 'mid')
  f.side.append(rs, vd, rp)
  let step = 0, busy = false, Px = [], Py = []
  const loadG = (anim = true) => { g.load({ nodes: toNodes(pos, Object.fromEntries(Object.keys(pos).map((k) => [k, { label: lbl[k] || k }]))), edges: E }, anim) }
  const markS = () => S.forEach((v) => { g.color(v, 'lemon'); g.tag(v, 'S', 'lemon') })
  async function squash(side, nid, label) {
    const P = side === 'Y' ? [...SY, 'y'] : [...SX, 'x']
    const tgt = side === 'Y' ? [470, 190] : [130, 190]
    g.blob(P, side === 'Y' ? 'rgba(111,214,188,.3)' : 'rgba(255,143,177,.3)', 26)
    await sleep(400)
    await g.morph(Object.fromEntries(P.map((v) => [v, tgt])), 800)
    const ct = contract(Object.keys(pos), E, P, nid)
    const NP = {}; for (const v of ct.ids) NP[v] = v === nid ? tgt : pos[v]
    g.load({ nodes: toNodes(NP, { ...Object.fromEntries(Object.keys(NP).map((k) => [k, { label: lbl[k] || k }])), [nid]: { label, color: side === 'Y' ? 'mint' : 'pink' } }), edges: ct.edges }, false)
    g.pulse(nid); markS()
    return ct
  }
  async function next() {
    if (busy) return; busy = true
    try {
      if (step === 0) {
        loadG(false); g.reset(); markS()
        g.blob([...SX, 'x'], 'rgba(255,143,177,.28)', 26); g.blob([...SY, 'y'], 'rgba(111,214,188,.3)', 26)
        g.color('x', 'pink'); g.color('y', 'mint')
        rs.set('① 最小の x-y 頂点切断 S = {s₁, s₂, s₃}（k = 3）'); vd.set('S を抜くと x 側（ピンク）と y 側（ミント）に分かれる。両側とも x, y 以外の頂点をもつ', 'mid'); rp.set('—')
        step = 1
      } else if (step === 1) {
        rs.set("② y 側を y' に縮約 → G_x で x から S への 3 本")
        const ct = await squash('Y', "y'", "y'")
        g.color('x', 'pink')
        const r = menger(adjOf(ct.ids, ct.edges), 'x', "y'")
        Px = r.paths.map((p) => p.slice(0, -1))
        for (let i = 0; i < r.paths.length; i++) await showPath(g, r.paths[i], i, 170)
        rp.set(Px.map((p, i) => `x→S ${i + 1}: ${p.map((v) => lbl[v] || v).join('-')}`).join('<br>'))
        vd.set("G_x は G より辺が少ない → 帰納法の仮定で 3 本の内素な x-y' 道がある", 'ok')
        step = 2
      } else if (step === 2) {
        loadG(false); g.reset(); markS()
        rs.set("③ x 側を x' に縮約 → G_y で S から y への 3 本")
        const ct = await squash('X', "x'", "x'")
        g.color('y', 'mint')
        const r = menger(adjOf(ct.ids, ct.edges), "x'", 'y')
        Py = r.paths.map((p) => p.slice(1))
        for (let i = 0; i < r.paths.length; i++) await showPath(g, r.paths[i], i, 170)
        rp.set(Py.map((p, i) => `S→y ${i + 1}: ${p.map((v) => lbl[v] || v).join('-')}`).join('<br>'))
        vd.set("G_y でも同様に 3 本の内素な x'-y 道", 'ok')
        step = 3
      } else if (step === 3) {
        loadG(false); g.reset(); markS(); g.color('x', 'pink'); g.color('y', 'mint')
        rs.set('④ S の各点で縫い合わせる')
        const full = S.map((s) => { const a = Px.find((p) => p[p.length - 1] === s), b = Py.find((p) => p[0] === s); return a && b ? a.concat(b.slice(1)) : null }).filter(Boolean)
        for (let i = 0; i < full.length; i++) { await showPath(g, full[i], i, 150); g.pulse(full[i].find((v) => S.includes(v)), PAL.ink) }
        rp.set(full.map((p, i) => `P${i + 1}: ${p.map((v) => lbl[v] || v).join('-')}`).join('<br>'))
        vd.set(`完成！ ${full.length} 本の内素な x-y 道。x 側・y 側の部分は互いに交わらないので、つないでも内素のまま`, 'ok')
        step = 4
      } else { loadG(); g.reset(); rs.set('もう一度「つぎへ」'); rp.set('—'); vd.set('', 'mid'); step = 0 }
    } finally { busy = false }
  }
  f.ctrl.append(h('button.btn.sm.pk', { onclick: next }, '▶ つぎへ'), h('button.btn.sm', { onclick: () => { if (busy) return; step = 0; loadG(); g.reset(); rs.set('「つぎへ」で開始'); rp.set('—'); vd.set('', 'mid') } }, 'リセット'))
  loadG(); rs.set('「つぎへ」で開始'); rp.set('—'); vd.set('', 'mid')
  return f.el
}

// =========================================================
// 解答 LAB : p.10 やってみよう（κ_G(x,y) = 3）
// =========================================================
export const EX10 = {
  pos: { x: [180, 70], b: [300, 70], c: [420, 70], d: [180, 200], e: [300, 200], f: [420, 200], g: [180, 330], hh: [300, 330], y: [420, 330] },
  E: [['x', 'b'], ['b', 'c'], ['x', 'c'], ['x', 'd'], ['x', 'g'], ['c', 'f'], ['c', 'y'], ['b', 'd'], ['b', 'f'], ['d', 'f'], ['d', 'g'], ['e', 'f'], ['e', 'g'], ['e', 'hh'], ['e', 'y'], ['f', 'hh'], ['f', 'y'], ['g', 'hh'], ['hh', 'y']],
  bends: [['x', 'c', 0, -34], ['x', 'g', -40, 0], ['c', 'y', 40, 0], ['d', 'f', 0, -36]],
}
export function labMengerAnswer() {
  const f = labFrame({ title: '解答：内素な道 3 本 ＋ 頂点切断 3 個 ＝ 局所連結度 3', hint: '① 内素な道を 3 本見せて「κ ≥ 3」、② 3 頂点 $\{c, f, g\}$ を抜くと $x$ と $y$ が分かれることを見せて「κ ≤ 3」。頂点をタップすると、自分で選んだ $S$ で分離できるかも試せます。', color: 'sky', no: 'A5' })
  const lbl = (v) => (v === 'hh' ? 'h' : v)
  const g = new GraphView(f.canvas, { w: W, h: H, draggable: false, bends: EX10.bends, nodes: toNodes(EX10.pos, Object.fromEntries(Object.keys(EX10.pos).map((k) => [k, { label: lbl(k) }]))), edges: EX10.E })
  const rd = readout('次数による見積もり'), rp = readout('内素な x-y 道'), rs = readout('x-y 頂点切断 S'), vd = verdict('', 'mid')
  f.side.append(rd, rp, rs, vd)
  const S = new Set()
  let busy = false
  const PATHS = [['x', 'b', 'f', 'y'], ['x', 'c', 'y'], ['x', 'g', 'e', 'y']]
  function base() { g.reset(); g.ids().forEach((v) => { g.color(v, 'white'); g.nodeClass(v, 'dim', S.has(v)) }); g.color('x', 'pink'); g.color('y', 'mint'); g.tag('x', 'x', 'pink'); g.tag('y', 'y', 'mint'); for (const e of g.edges.values()) if (S.has(e.a) || S.has(e.b)) e.line.classList.add('ghost') }
  function judge() {
    const adj = g.adj(), rx = reach(adj, 'x', S)
    rs.set(S.size ? `{${[...S].map(lbl).join(', ')}}（大きさ ${S.size}）` : '∅')
    if (!rx.has('y')) { g.blob([...rx], 'rgba(255,143,177,.3)', 26); g.blob([...reach(adj, 'y', S)], 'rgba(111,214,188,.32)', 26); vd.set(`x と y が分離 → κ_G(x,y) ≤ ${S.size}`, 'ok') }
    else if (S.size) vd.set('まだ x から y へ行ける', 'mid')
  }
  g.on('nodeclick', (v) => { if (busy || v === 'x' || v === 'y') return; S.has(v) ? S.delete(v) : S.add(v); base(); judge(); g.pulse(v) })
  const b1 = h('button.btn.sm.lm', { onclick: () => { if (busy) return; S.clear(); base(); g.tag('x', '4', 'pink'); g.tag('y', '4', 'mint'); ['b', 'c', 'd', 'g'].forEach((v) => { g.edgeClass('x', v, 'hi'); g.pulse(v) }); rd.set('deg x = deg y = 4 → κ_G(x,y) ≤ 4'); vd.set('x の近傍 4 個を抜けば分離できるので 4 以下。でも本当に 4？', 'mid') } }, '① 次数で見積もる')
  const b2 = h('button.btn.sm.pk', { onclick: async () => {
    if (busy) return; busy = true; S.clear(); base()
    for (let i = 0; i < PATHS.length; i++) await showPath(g, PATHS[i], i, 260)
    rp.set(PATHS.map((p, i) => `P${i + 1}: ${pstr(p, lbl)}`).join('<br>'))
    vd.set('内点 {b,f}・{c}・{g,e} が互いに素 → 内素な道 3 本 → κ_G(x,y) ≥ 3（命題 5.1）', 'ok'); busy = false
  } }, '② 内素な道 3 本')
  const b3 = h('button.btn.sm.sk', { onclick: async () => {
    if (busy) return; busy = true; S.clear(); base()
    for (const v of ['c', 'f', 'g']) { await sleep(380); S.add(v); base(); g.pulse(v, PAL.ink) }
    judge(); vd.set('S = {c, f, g} で x 側 {x, b, d} と y 側 {e, h, y} に分離 → κ_G(x,y) ≤ 3', 'ok'); busy = false
  } }, '③ 頂点切断 {c, f, g}')
  const b4 = h('button.btn.sm.mt', { onclick: async () => {
    if (busy) return; busy = true; S.clear(); base()
    for (let i = 0; i < PATHS.length; i++) PATHS[i].forEach((v, j) => { if (j && j < PATHS[i].length - 1) g.color(v, PNODE[i]) })
    ;['c', 'f', 'g'].forEach((v) => { g.nodeClass(v, 'sel'); g.tag(v, 'S', 'lemon') })
    await sleep(300)
    rp.set('どの x-y 道も c, f, g のどれかを必ず通る → 内素な道は高々 3 本')
    vd.set('3 ≤ κ_G(x,y) ≤ 3 より <b>κ_G(x,y) = 3</b>（メンガーの定理どおり、本数＝切断の大きさ）', 'ok')
    toast('κ_G(x, y) = 3 🎉'); busy = false
  } }, '④ 結論')
  f.ctrl.append(b1, b2, b3, b4, h('button.btn.sm', { onclick: () => { if (busy) return; S.clear(); base(); rd.set('—'); rp.set('—'); rs.set('∅'); vd.set('①〜④を順に押してね', 'mid') } }, 'リセット'))
  base(); rd.set('—'); rp.set('—'); rs.set('∅'); vd.set('①〜④を順に押してね', 'mid')
  return f.el
}
