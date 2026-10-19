// Labs for Lecture 4 : cut vertices / bridges, vertex cuts & connectivity, blocks & block tree, ear decomposition
import { h, s, sleep, toast } from '../lib/ui.js'
import { GraphView, PAL, circle, toNodes, adjOf, components, PCYCLE, ek } from '../lib/graph.js'
import { labFrame, readout, verdict, seg, range, editModes, bars, sub } from '../lib/lab.js'

const W = 600, H = 380
const BLOBS = ['rgba(185,166,255,.32)', 'rgba(255,179,138,.38)', 'rgba(255,143,177,.3)', 'rgba(111,214,188,.32)', 'rgba(255,214,107,.42)', 'rgba(142,201,255,.34)', 'rgba(181,232,106,.36)', 'rgba(160,160,170,.3)']
const BCOL = ['lav', 'peach', 'pink', 'mint', 'lemon', 'sky', '#B5E86A', 'gray']

// ---------- algorithms ----------
export function compCount(adj, removed = new Set()) {
  const seen = new Set(); let c = 0
  for (const v of adj.keys()) {
    if (removed.has(v) || seen.has(v)) continue
    c++; const st = [v]; seen.add(v)
    while (st.length) { const u = st.pop(); for (const w of adj.get(u)) if (!removed.has(w) && !seen.has(w)) { seen.add(w); st.push(w) } }
  }
  return c
}
function compsWithout(adj, removed) {
  const seen = new Set(), out = []
  for (const v of adj.keys()) {
    if (removed.has(v) || seen.has(v)) continue
    const c = [v]; const st = [v]; seen.add(v)
    while (st.length) { const u = st.pop(); for (const w of adj.get(u)) if (!removed.has(w) && !seen.has(w)) { seen.add(w); st.push(w); c.push(w) } }
    out.push(c)
  }
  return out
}
function* combos(arr, k, start = 0, cur = []) {
  if (cur.length === k) { yield cur.slice(); return }
  for (let i = start; i < arr.length; i++) { cur.push(arr[i]); yield* combos(arr, k, i + 1, cur); cur.pop() }
}
// connectivity κ(G) + a minimum vertex cut (brute force, small graphs)
export function kappa(adj) {
  const ids = [...adj.keys()], n = ids.length
  for (let k = 0; k <= n - 2; k++) for (const S of combos(ids, k)) if (compCount(adj, new Set(S)) >= 2) return { k, cut: S }
  return { k: Math.max(0, n - 1), cut: null }
}
export function cutVertices(adj) {
  const base = compCount(adj)
  return [...adj.keys()].filter((v) => compCount(adj, new Set([v])) > base)
}
export function bridges(adj, edges) {
  const base = compCount(adj)
  return edges.filter(([a, b]) => {
    adj.get(a).delete(b); adj.get(b).delete(a)
    const c = compCount(adj)
    adj.get(a).add(b); adj.get(b).add(a)
    return c > base
  })
}
// blocks (Tarjan biconnected components) — isolated vertices become K1 blocks
export function blocks(adj) {
  let t = 0; const disc = new Map(), low = new Map(), st = [], out = []
  const dfs = (u, p) => {
    disc.set(u, ++t); low.set(u, t)
    for (const v of adj.get(u)) {
      if (!disc.has(v)) {
        st.push([u, v]); dfs(v, u); low.set(u, Math.min(low.get(u), low.get(v)))
        if (low.get(v) >= disc.get(u)) {
          const vs = new Set(); let e
          do { e = st.pop(); vs.add(e[0]); vs.add(e[1]) } while (!(e[0] === u && e[1] === v))
          out.push([...vs])
        }
      } else if (v !== p && disc.get(v) < disc.get(u)) { st.push([u, v]); low.set(u, Math.min(low.get(u), disc.get(v))) }
    }
  }
  for (const v of adj.keys()) if (!disc.has(v)) { if (adj.get(v).size === 0) { disc.set(v, ++t); out.push([v]) } else dfs(v, null) }
  return out
}
// ear decomposition of a 2-connected graph
export function earDecomp(ids, edges) {
  const adj = adjOf(ids, edges)
  // G0: shortest cycle through the first edge
  const [u0, v0] = edges[0]
  const par = new Map([[u0, null]]), q = [u0]
  while (q.length) { const x = q.shift(); for (const y of adj.get(x)) { if (x === u0 && y === v0) continue; if (!par.has(y)) { par.set(y, x); q.push(y) } } }
  if (!par.has(v0)) return null
  const cyc = []; let c = v0; while (c != null) { cyc.push(c); c = par.get(c) }
  const ears = [{ path: cyc.concat([cyc[0]]), cycle: true }]
  const inV = new Set(cyc), used = new Set()
  for (let i = 0; i < cyc.length; i++) used.add(ek(cyc[i], cyc[(i + 1) % cyc.length]))
  while (used.size < edges.length) {
    // pick an unused edge with an endpoint in current graph (prefer edges inside → short ears later)
    let pick = null
    for (const [a, b] of edges) { if (used.has(ek(a, b))) continue; if (inV.has(a) && inV.has(b)) { pick = [a, b]; break } }
    let path
    if (pick) path = pick
    else {
      for (const [a, b] of edges) { if (used.has(ek(a, b))) continue; if (inV.has(a)) { pick = [a, b]; break } if (inV.has(b)) { pick = [b, a]; break } }
      if (!pick) return null
      const [x, y] = pick
      // BFS from y through vertices outside current graph until hitting inV \ {x}
      const pr = new Map([[y, null]]), qq = [y]; let end = null
      while (qq.length && !end) {
        const a = qq.shift()
        for (const b of adj.get(a)) {
          if (pr.has(b) || b === x || used.has(ek(a, b))) continue
          pr.set(b, a)
          if (inV.has(b)) { end = b; break }
          qq.push(b)
        }
      }
      if (!end) return null
      const tail = []; let z = end; while (z != null) { tail.push(z); z = pr.get(z) }
      path = [x, ...tail.reverse()]
    }
    for (let i = 0; i + 1 < path.length; i++) used.add(ek(path[i], path[i + 1]))
    path.forEach((v) => inV.add(v))
    ears.push({ path })
  }
  return ears
}

// ---------- LAB 4-1: 切断点と橋 ----------
export function labCut() {
  const f = labFrame({ title: '切断点と橋：抜くと “島” が増える頂点・辺', hint: '頂点をタップすると、その頂点を抜いたときの連結成分の数 $c(G-x)$ を表示。<b>ピンクの頂点＝切断点</b>、<b>青い太線＝橋</b>は自動で判定されます。「つなぐ」で辺を足すと、切断点が消えていく様子も見えます。', color: 'lemon', no: '4-1' })
  const pos = { a: [60, 120], b: [60, 260], c: [150, 190], x: [250, 190], d: [330, 110], e: [330, 270], y: [430, 190], f: [520, 110], g: [520, 270], h: [560, 190] }
  const E = [['a', 'b'], ['a', 'c'], ['b', 'c'], ['c', 'x'], ['x', 'd'], ['x', 'e'], ['d', 'e'], ['d', 'y'], ['y', 'f'], ['y', 'g'], ['y', 'h'], ['f', 'h']]
  const g = new GraphView(f.canvas, { w: W, h: H, editable: true, mode: 'move', maxNodes: 12, nodes: toNodes(pos), edges: E })
  const rc = readout('c(G)：連結成分の個数'), rx = readout('タップした頂点 x'), rcv = readout('切断点'), rbr = readout('橋（切断辺）'), vd = verdict('', 'mid')
  f.side.append(rc, rx, vd, rcv, rbr)
  let sel = null
  function upd() {
    g.reset()
    const adj = g.adj(), base = compCount(adj)
    const cv = cutVertices(adj), br = bridges(adj, g.edgeList())
    g.ids().forEach((id) => g.color(id, cv.includes(id) ? 'pink' : 'white'))
    br.forEach(([a, b]) => g.edgeClass(a, b, 'hi3'))
    rc.set(base)
    rcv.set(cv.length ? `{${cv.join(', ')}}` : 'なし')
    rbr.set(br.length ? br.map(([a, b]) => a + b).join(', ') : 'なし')
    if (sel && g.nodes.has(sel)) {
      const c = compCount(adj, new Set([sel]))
      g.nodeClass(sel, 'sel')
      const parts = compsWithout(adj, new Set([sel]))
      parts.forEach((p, i) => g.blob(p, BLOBS[i % BLOBS.length], 26))
      rx.set(`c(G − ${sel}) = ${c}`)
      vd.set(c > base ? `${sel} は切断点！（${base} → ${c}）${c - base >= 2 ? ' 一気に 2 個以上増えることも' : ''}` : `${sel} は切断点ではない（${base} → ${c}）`, c > base ? 'ng' : 'ok')
    } else { rx.set('—'); vd.set('頂点をタップしてね', 'mid') }
  }
  g.on('nodeclick', (id) => { sel = id; upd(); g.pulse(id) })
  g.on('change', upd)
  f.ctrl.append(editModes(g), h('button.btn.sm', { onclick: () => { g.load({ nodes: toNodes(pos), edges: E }); sel = null; upd() } }, 'リセット'))
  upd()
  return f.el
}

// ---------- LAB 4-2: 頂点切断と連結度 ----------
export function labKappa() {
  const f = labFrame({ title: '頂点切断と連結度 κ(G)：何個抜けばバラバラ？', hint: '頂点をタップして “抜く” 頂点集合 $S$ を選ぼう。$G-S$ が非連結になれば $S$ は頂点切断。いちばん小さい頂点切断の大きさが連結度 $\\kappa(G)$（ただし完全グラフは $n-1$）。', color: 'sky', no: '4-2' })
  const P = {
    prism: { name: '例 4.5 風（3-連結）', pos: { ...circle(['a', 'b', 'c'], 300, 190, 150, -Math.PI / 2), ...circle(['d', 'e', 'f'], 300, 190, 62, -Math.PI / 2) }, E: [['a', 'b'], ['b', 'c'], ['c', 'a'], ['d', 'e'], ['e', 'f'], ['f', 'd'], ['a', 'd'], ['b', 'e'], ['c', 'f']] },
    ex43: { name: '例 4.3', pos: { x1: [190, 60], x2: [90, 150], x3: [300, 110], x4: [210, 180], x5: [120, 300], x6: [410, 200], x7: [290, 310], x8: [530, 150], x9: [520, 290] }, E: [['x1', 'x2'], ['x1', 'x3'], ['x1', 'x4'], ['x2', 'x5'], ['x3', 'x4'], ['x3', 'x6'], ['x4', 'x7'], ['x5', 'x7'], ['x6', 'x7'], ['x6', 'x8'], ['x6', 'x9'], ['x8', 'x9']] },
    k6: { name: 'K₆', pos: circle(['1', '2', '3', '4', '5', '6'], 300, 190, 140), E: null },
    tree: { name: '木', pos: { r: [300, 70], a: [190, 170], b: [410, 170], c: [120, 290], d: [260, 290], e: [470, 290] }, E: [['r', 'a'], ['r', 'b'], ['a', 'c'], ['a', 'd'], ['b', 'e']] },
  }
  P.k6.E = []; Object.keys(P.k6.pos).forEach((a, i, arr) => arr.slice(i + 1).forEach((b) => P.k6.E.push([a, b])))
  let cur = 'prism'
  const g = new GraphView(f.canvas, { w: W, h: H, draggable: false })
  const rs = readout('選んだ S'), vd = verdict('', 'mid'), rk = readout('連結度 κ(G) ／ 最小次数 δ(G)'), rl = readout('k-連結の判定')
  f.side.append(rs, vd, rk, rl)
  const S = new Set()
  function info() {
    const adj = g.adj(), { k } = kappa(adj)
    const dl = Math.min(...g.ids().map((i) => adj.get(i).size))
    rk.set(`κ = ${k} ／ δ = ${dl}　→ κ ≤ δ ✓（定理 4.1）`)
    const n = g.nodes.size
    rl.set(Array.from({ length: Math.min(n + 1, 6) }, (_, j) => `${j}-連結${j <= k ? '○' : '×'}`).join('  '))
  }
  function paint() {
    g.reset()
    const adj = g.adj()
    g.ids().forEach((id) => { g.nodeClass(id, 'dim', S.has(id)); g.color(id, 'white') })
    for (const e of g.edges.values()) if (S.has(e.a) || S.has(e.b)) e.line.classList.add('ghost')
    rs.set(S.size ? `{${[...S].join(', ')}}（大きさ ${S.size}）` : '∅')
    const parts = compsWithout(adj, S)
    if (parts.length >= 2) {
      parts.forEach((p, i) => { g.blob(p, BLOBS[i % BLOBS.length], 26); p.forEach((id) => g.color(id, BCOL[i % BCOL.length])) })
      vd.set(`G − S は非連結（${parts.length} 成分）→ S は頂点切断！`, 'ok')
    } else vd.set(parts.length ? 'G − S はまだ連結' : '全部抜いてしまった', 'mid')
  }
  function load(k) { cur = k; S.clear(); g.load({ nodes: toNodes(P[k].pos), edges: P[k].E }); paint(); info() }
  g.on('nodeclick', (id) => { S.has(id) ? S.delete(id) : S.add(id); paint(); g.pulse(id) })
  const best = h('button.btn.sm.sk', { onclick: async () => {
    const { k, cut } = kappa(g.adj())
    S.clear(); paint()
    if (!cut) { toast(`${P[cur].name} には頂点切断がない（完全グラフ）`); vd.set('頂点切断なし → κ = n − 1', 'mid'); return }
    for (const v of cut) { await sleep(350); S.add(v); paint(); g.pulse(v) }
    toast(`最小の頂点切断：大きさ ${k}`)
  } }, '🔍 最小の頂点切断')
  f.ctrl.append(seg(['3-連結', '例 4.3', 'K₆', '木'], (i) => load(['prism', 'ex43', 'k6', 'tree'][i])), best, h('button.btn.sm', { onclick: () => { S.clear(); paint() } }, 'S を空に'))
  load('prism')
  return f.el
}

// ---------- LAB 4-3: ブロック分解とブロック木 ----------
export const EX48 = {
  pos: { a: [140, 70], b: [80, 140], c: [150, 175], d: [215, 120], e: [50, 250], f: [100, 320], g: [190, 300], hh: [235, 250], i: [290, 120], j: [360, 120], k: [420, 60], l: [430, 180], m: [470, 300], n: [530, 70], o: [490, 160], p: [570, 160] },
  E: [['a', 'b'], ['a', 'd'], ['b', 'c'], ['c', 'd'], ['a', 'c'], ['c', 'e'], ['e', 'f'], ['f', 'g'], ['g', 'c'], ['e', 'g'], ['c', 'hh'], ['d', 'i'], ['i', 'j'], ['j', 'k'], ['k', 'l'], ['l', 'j'], ['n', 'o'], ['o', 'p'], ['p', 'n']],
}
export function labBlocks() {
  const f = labFrame({ title: 'ブロック分解 → ブロック木：グラフの “骨格” を取り出す', hint: '「ブロック分解」で、2-連結な部分（または $K_2$, $K_1$）を<b>極大に</b>切り分けて色分けします。「ブロック木へ」で、ブロックを 1 つの点、切断点をつなぎ目にした $B(G)$ に変形！', color: 'lemon', no: '4-3' })
  const g = new GraphView(f.canvas, { w: W, h: H, r: 14, editable: true, mode: 'move', maxNodes: 18 })
  const rb = readout('ブロックの数'), rs = readout('切断点 S'), rl = readout('ブロック一覧'), vd = verdict('', 'mid')
  f.side.append(rb, rs, vd, rl)
  let state = 'G', saved = null
  const load = () => { state = 'G'; g.load({ nodes: toNodes(EX48.pos, Object.fromEntries(Object.keys(EX48.pos).map((k) => [k, { label: k === 'hh' ? 'h' : k }]))), edges: EX48.E }); g.reset(); g.colorAll('white'); vd.set('分解してみよう', 'mid'); rb.set('—'); rs.set('—'); rl.set('—') }
  function decompose() {
    if (state !== 'G') return
    g.reset()
    const adj = g.adj(), B = blocks(adj), cv = cutVertices(adj)
    B.forEach((bk, i) => g.blob(bk, BLOBS[i % BLOBS.length], bk.length === 1 ? 22 : 24))
    g.ids().forEach((id) => g.color(id, cv.includes(id) ? 'ink' : 'white'))
    cv.forEach((v) => { g.nodes.get(v).body.setAttribute('fill', PAL.ink); g.pulse(v) })
    rb.set(`${B.length} 個`); rs.set(`{${cv.map((v) => (v === 'hh' ? 'h' : v)).join(', ')}}`)
    const nm = (v) => (v === 'hh' ? 'h' : v)
    rl.set(B.map((b) => `{${b.map(nm).join(',')}}`).join(' '))
    const kinds = B.map((b) => (b.length === 1 ? 'K₁' : b.length === 2 ? 'K₂' : '2-連結'))
    vd.set(`K₁×${kinds.filter((k) => k === 'K₁').length}・K₂×${kinds.filter((k) => k === 'K₂').length}・2-連結×${kinds.filter((k) => k === '2-連結').length}　各辺はちょうど 1 つのブロックへ`, 'ok')
    return { B, cv }
  }
  async function toTree() {
    if (state === 'T') { load(); return }
    const r = decompose(); if (!r) return
    const { B, cv } = r
    await sleep(700)
    saved = g.data()
    const cen = (bk) => { const ps = bk.map((v) => g.nodes.get(v)); return [ps.reduce((a, p) => a + p.x, 0) / ps.length, ps.reduce((a, p) => a + p.y, 0) / ps.length] }
    const nodes = [], edges = []
    B.forEach((bk, i) => { const [x, y] = cen(bk); nodes.push({ id: 'B' + i, x, y, color: BCOL[i % BCOL.length], label: 'B' + sub(String(i + 1)) }) })
    cv.forEach((v) => { const n = g.nodes.get(v); nodes.push({ id: 'c_' + v, x: n.x, y: n.y, color: 'white', label: v === 'hh' ? 'h' : v }) })
    B.forEach((bk, i) => bk.forEach((v) => { if (cv.includes(v)) edges.push(['B' + i, 'c_' + v]) }))
    // tidy layout: each component laid out left→right from one end of its diameter
    const nid = nodes.map((n) => n.id), tadj = adjOf(nid, edges)
    const seen = new Set(), comps = []
    for (const v of nid) if (!seen.has(v)) { const c = [v]; seen.add(v); for (let i = 0; i < c.length; i++) for (const w of tadj.get(c[i])) if (!seen.has(w)) { seen.add(w); c.push(w) } comps.push(c) }
    comps.sort((x, y) => y.length - x.length)
    const far = (src) => { const d = new Map([[src, 0]]), q = [src]; while (q.length) { const u = q.shift(); for (const w of tadj.get(u)) if (!d.has(w)) { d.set(w, d.get(u) + 1); q.push(w) } } let best = src; for (const [k, v] of d) if (v > d.get(best)) best = k; return { best, d } }
    const big = comps[0], smalls = comps.slice(1)
    const place = (comp, x0, x1, y0, y1) => {
      const root = far(far(comp[0]).best).best
      const par = new Map([[root, null]]), order = [root], depth = new Map([[root, 0]])
      for (let i = 0; i < order.length; i++) for (const w of tadj.get(order[i])) if (!par.has(w)) { par.set(w, order[i]); depth.set(w, depth.get(order[i]) + 1); order.push(w) }
      const kids = new Map(comp.map((v) => [v, []])); order.slice(1).forEach((v) => kids.get(par.get(v)).push(v))
      const leaves = new Map(); [...order].reverse().forEach((v) => leaves.set(v, Math.max(1, kids.get(v).reduce((a, k) => a + leaves.get(k), 0))))
      const D = Math.max(1, ...depth.values()), tot = leaves.get(root)
      const lay = (v, top) => { const pn = nodes.find((n) => n.id === v); pn.x = comp.length === 1 ? (x0 + x1) / 2 : x0 + (depth.get(v) / D) * (x1 - x0); pn.y = y0 + ((top + leaves.get(v) / 2) / tot) * (y1 - y0); let t = top; kids.get(v).forEach((k) => { lay(k, t); t += leaves.get(k) }) }
      lay(root, 0)
    }
    place(big, 40, W - 40, 40, smalls.length ? H - 120 : H - 40)
    smalls.forEach((c, i) => place(c, 60 + (i * (W - 120)) / Math.max(1, smalls.length), 60 + ((i + 1) * (W - 120)) / Math.max(1, smalls.length) - 40, H - 90, H - 40))
    g.load({ nodes, edges })
    cv.forEach((v) => g.tag('c_' + v, 'S', 'lemon'))
    state = 'T'
    const isTree = components(g.adj()).length + 0
    vd.set(`B(G)：ブロック ${B.length} 個＋切断点 ${cv.length} 個。閉路なし＝林（定理 4.4）。葉はすべてブロック（端ブロック）`, 'ok')
  }
  f.ctrl.append(h('button.btn.sm.lm', { onclick: decompose }, '🧩 ブロック分解'), h('button.btn.sm.pk', { onclick: toTree }, '🌳 ブロック木へ ⇄'), editModes(g), h('button.btn.sm', { onclick: load }, 'リセット'))
  load()
  return f.el
}

// ---------- LAB 4-4: 耳分解 ----------
export function labEar() {
  const f = labFrame({ title: '耳分解：閉路から始めて、“耳” を 1 つずつ足していく', hint: '「つぎの耳」を押すと、閉路 $G_0$ に耳 $Q_1, Q_2, \\dots$ を順に追加して $G$ を組み立てます。どの段階の $G_i$ も <b>2-連結</b> のまま（命題 4.5）。逆に 2-連結グラフは必ずこう作れる（定理 4.6）。', color: 'mint', no: '4-4' })
  const pos = { a: [200, 90], b: [330, 60], c: [440, 120], d: [430, 250], e: [300, 300], f: [180, 240], g: [300, 180], p1: [90, 60], p2: [60, 180], q1: [540, 200], q2: [560, 320], r1: [170, 340] }
  const E = [['a', 'b'], ['b', 'c'], ['c', 'd'], ['d', 'e'], ['e', 'f'], ['f', 'a'], ['a', 'g'], ['g', 'd'], ['b', 'g'], ['a', 'p1'], ['p1', 'p2'], ['p2', 'f'], ['c', 'q1'], ['q1', 'q2'], ['q2', 'e'], ['f', 'r1'], ['r1', 'e'], ['g', 'e']]
  const ids = Object.keys(pos)
  const ears = earDecomp(ids, E)
  const g = new GraphView(f.canvas, { w: W, h: H, r: 15, draggable: false, nodes: toNodes(pos), edges: E })
  const rl = readout('いまの段階'), re = readout('耳の列'), rk = readout('G_i の連結度'), vd = verdict('', 'mid')
  f.side.append(rl, rk, vd, re)
  const ECLS = ['hi', 'hi2', 'hi3', 'hi4']
  let step = -1
  function shown() { const vs = new Set(); for (let i = 0; i <= step; i++) ears[i].path.forEach((v) => vs.add(v)); return vs }
  function paint() {
    g.reset()
    const vs = shown()
    g.ids().forEach((id) => { g.nodeClass(id, 'dim', !vs.has(id)); g.color(id, 'white') })
    for (const e of g.edges.values()) e.line.classList.add('ghost')
    const curE = []
    for (let i = 0; i <= step; i++) {
      const p = ears[i].path
      for (let j = 0; j + 1 < p.length; j++) { const e = g.edges.get(ek(p[j], p[j + 1])); e.line.classList.remove('ghost'); e.line.classList.add(i === 0 ? 'hi' : ECLS[(i % 3) + 1]); curE.push([p[j], p[j + 1]]) }
      if (i === step && i > 0) { p.slice(1, -1).forEach((v) => g.color(v, PCYCLE[i % 6])); g.tag(p[0], '端', 'lemon'); g.tag(p[p.length - 1], '端', 'lemon') }
    }
    if (step === 0) ears[0].path.forEach((v) => g.color(v, 'pink'))
    rl.set(step < 0 ? 'まだ何もない' : step === 0 ? `G₀ = 閉路 ${ears[0].path.join('')}（長さ ${ears[0].path.length - 1}）` : `G${sub(String(step))} = G${sub(String(step - 1))} ＋ 耳 Q${sub(String(step))} = ${ears[step].path.join('-')}`)
    re.set(ears.slice(0, step + 1).map((e, i) => (i ? `Q${sub(String(i))}:${e.path.join('')}` : `G₀:${e.path.join('')}`)).join('  ') || '—')
    if (step >= 0) {
      const sub2 = new Map([...vs].map((v) => [v, new Set()]))
      curE.forEach(([a, b]) => { sub2.get(a).add(b); sub2.get(b).add(a) })
      const k = kappa(sub2).k
      rk.set(`κ(G${sub(String(step))}) = ${k} ≥ 2 ✓`)
      vd.set(step === ears.length - 1 ? `完成！ G = G${sub(String(step))}。耳分解：G₀ と ${ears.length - 1} 個の耳` : '2-連結のまま成長中…', step === ears.length - 1 ? 'ok' : 'mid')
    } else { rk.set('—'); vd.set('「つぎの耳」を押してね', 'mid') }
  }
  async function next() {
    if (step >= ears.length - 1) { toast('もう全部の辺を使ったよ'); return }
    step++
    const p = ears[step].path
    paint()
    for (let j = 0; j + 1 < p.length; j++) await g.travel(p[j], p[j + 1], step ? PAL.mint : PAL.pink, 220)
  }
  f.ctrl.append(h('button.btn.sm.mt', { onclick: next }, '👂 つぎの耳'), h('button.btn.sm', { onclick: () => { if (step >= 0) { step--; paint() } } }, '1 つもどる'),
    h('button.btn.sm.lm', { onclick: async () => { while (step < ears.length - 1) { await next(); await sleep(250) } } }, '⏩ 最後まで'), h('button.btn.sm', { onclick: () => { step = -1; paint() } }, 'リセット'))
  paint()
  return f.el
}

// ---------- 演習解答 LAB：Cₙ・Wₙ・K_{m,n} の連結度 ----------
export function labKappaAnswer() {
  const f = labFrame({ title: '解答：Cₙ・Wₙ・K_{m,n} の最小の頂点切断を見る', hint: '種類とサイズを変えて「最小の頂点切断」を押すと、総当たりで見つけた最小の頂点切断を抜いて、グラフが 2 つ以上に分かれる様子を見せます。数値は公式と一致するかチェック！', color: 'sky', no: 'A4' })
  const g = new GraphView(f.canvas, { w: W, h: H, r: 15, draggable: false, labels: false })
  const rf = readout('公式'), rk = readout('総当たりで求めた κ ／ δ'), rc = readout('最小の頂点切断'), vd = verdict('', 'mid')
  f.side.append(rf, rk, rc, vd)
  let kind = 0, n = 6, m = 3
  function build() {
    let pos = {}, E = [], cols = {}
    if (kind === 0) { if (n < 4) n = 4; const ids = Array.from({ length: n }, (_, i) => 'v' + i); pos = circle(ids, 300, 190, 140); ids.forEach((v, i) => { E.push([v, ids[(i + 1) % n]]); cols[v] = { color: 'white' } }) }
    else if (kind === 1) { if (n < 5) n = 5; const rim = Array.from({ length: n - 1 }, (_, i) => 'v' + i); pos = { ...circle(rim, 300, 190, 145), hub: [300, 190] }; rim.forEach((v, i) => { E.push([v, rim[(i + 1) % rim.length]], [v, 'hub']); cols[v] = { color: 'white' } }); cols.hub = { color: 'white' } }
    else { const A = Array.from({ length: m }, (_, i) => 'a' + i), B = Array.from({ length: n }, (_, i) => 'b' + i); A.forEach((x, i) => { pos[x] = [170, m === 1 ? 190 : 50 + (i * 280) / (m - 1)]; cols[x] = { color: 'white' } }); B.forEach((y, i) => { pos[y] = [430, n === 1 ? 190 : 50 + (i * 280) / (n - 1)]; cols[y] = { color: 'white' } }); A.forEach((x) => B.forEach((y) => E.push([x, y]))) }
    g.load({ nodes: toNodes(pos, cols), edges: E })
    const adj = g.adj(), { k } = kappa(adj), dl = Math.min(...g.ids().map((i) => adj.get(i).size))
    const fm = [`κ(C${sub(String(n))}) = 2`, `κ(W${sub(String(n))}) = 3`, `κ(K${sub(m + ',' + n)}) = min(${m}, ${n}) = ${Math.min(m, n)}`][kind]
    const expect = [2, 3, Math.min(m, n)][kind]
    rf.set(fm); rk.set(`κ = ${k} ／ δ = ${dl}`); rc.set('—')
    vd.set(k === expect ? '公式と一致 ✓' : '不一致…', k === expect ? 'ok' : 'ng')
    nR.inp.min = kind === 0 ? 4 : kind === 1 ? 5 : 1; nR.inp.value = n; nR.querySelector('output').textContent = n
  }
  async function showCut() {
    g.reset(); g.colorAll('white')
    const adj = g.adj(), { k, cut } = kappa(adj)
    if (!cut) { rc.set('頂点切断なし（K₁,₁ = K₂）→ κ = n − 1 = 1'); return }
    for (const v of cut) { g.nodeClass(v, 'dim'); g.pulse(v); for (const e of g.edges.values()) if (e.a === v || e.b === v) e.line.classList.add('ghost'); await sleep(320) }
    const parts = compsWithout(adj, new Set(cut))
    parts.forEach((p, i) => { g.blob(p, BLOBS[(i + 2) % BLOBS.length], 26); p.forEach((id) => g.color(id, BCOL[(i + 2) % BCOL.length])) })
    rc.set(`大きさ ${k} の頂点切断を抜くと ${parts.length} 成分に分かれる`)
  }
  const sel = h('select.inp', { style: { flex: '0 0 auto' }, 'aria-label': '種類', onchange: (e) => { kind = +e.target.value; mR.style.display = kind === 2 ? '' : 'none'; if (kind === 2) n = Math.min(n, 5); build() } }, ['閉路 Cₙ', '車輪 Wₙ', '完全2部 K_{m,n}'].map((t, i) => h('option', { value: i }, t)))
  const nR = range('n', 4, 9, n, (v) => { n = v; build() })
  const mR = range('m', 1, 5, m, (v) => { m = v; build() })
  mR.style.display = 'none'
  f.ctrl.append(sel, nR, mR, h('button.btn.sm.sk', { onclick: showCut }, '✂️ 最小の頂点切断'))
  build()
  return f.el
}
