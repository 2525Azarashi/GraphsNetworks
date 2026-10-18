// Labs for Lecture 3 : walks, connectivity, distance, BFS layers, trees, spanning trees
import { h, s, sleep, toast } from '../lib/ui.js'
import { GraphView, PAL, circle, toNodes, adjOf, bfs, components, eccentricities, hasCycle, PCYCLE, ek } from '../lib/graph.js'
import { labFrame, readout, verdict, seg, range, editModes, bars, sub } from '../lib/lab.js'

const W = 600, H = 380
const lbl = (pos) => Object.fromEntries(Object.keys(pos).map((k) => [k, { label: sub(k) }]))
const BLOBS = ['rgba(255,143,177,.26)', 'rgba(111,214,188,.28)', 'rgba(255,214,107,.34)', 'rgba(185,166,255,.3)', 'rgba(142,201,255,.32)']

// ---------- LAB: 歩道 → 道（ループを切る） ----------
export function labWalk() {
  const f = labFrame({ title: '歩道と道：同じ頂点に戻ったら “ループを切る”', hint: '頂点を順にタップして <b>歩道</b> を作ろう（隣接する頂点だけ進めます）。「最短化」を押すと、同じ頂点が 2 回出てくる部分（ループ）を切り取って <b>道</b> にします（命題 3.1）。', color: 'sky', no: '3-1' })
  const pos = { x1: [90, 90], x2: [300, 90], x3: [510, 90], x4: [90, 290], x5: [300, 290], x6: [510, 290] }
  const E = [['x1', 'x2'], ['x2', 'x3'], ['x1', 'x4'], ['x2', 'x5'], ['x3', 'x5'], ['x3', 'x6'], ['x4', 'x5'], ['x5', 'x6']]
  const g = new GraphView(f.canvas, { w: W, h: H, draggable: false, nodes: toNodes(pos, lbl(pos)), edges: E })
  let walk = ['x1']
  const rw = readout('歩道 W'), rl = readout('長さ ℓ（辺の延べ本数）'), vd = verdict('', 'mid')
  f.side.append(rw, rl, vd)
  const overlay = s('g'); g.gOver.append(overlay)
  function paint() {
    g.reset(); overlay.innerHTML = ''
    // tags show all indices
    const idx = new Map(); walk.forEach((v, i) => idx.set(v, [...(idx.get(v) || []), i]))
    for (const [v, is] of idx) g.tag(v, is.join(','), is.length > 1 ? 'pink' : 'lemon')
    for (let i = 1; i < walk.length; i++) g.edgeClass(walk[i - 1], walk[i], 'hi')
    g.nodeClass(walk[walk.length - 1], 'sel')
    rw.set(walk.map(sub).join(' → '))
    rl.set(walk.length - 1)
    const rep = [...idx.values()].some((a) => a.length > 1)
    vd.set(rep ? '同じ頂点が 2 回以上 → これは道ではない（ただの歩道）' : `${sub(walk[0])}-${sub(walk[walk.length - 1])} 道 ✓`, rep ? 'mid' : 'ok')
  }
  g.on('nodeclick', (id) => {
    const last = walk[walk.length - 1]
    if (!g.hasEdge(last, id)) { toast(`${sub(last)} と ${sub(id)} は隣接していません`); return }
    walk.push(id); g.travel(last, id, PAL.pink, 260).then(paint)
  })
  async function shorten() {
    let changed = true
    while (changed) {
      changed = false
      for (let i = 0; i < walk.length && !changed; i++) for (let j = walk.length - 1; j > i; j--) if (walk[i] === walk[j]) {
        const loop = walk.slice(i, j + 1)
        for (let k = 1; k < loop.length; k++) g.edgeClass(loop[k - 1], loop[k], 'hi2')
        g.pulse(walk[i], PAL.mint)
        toast(`${sub(walk[i])} から ${sub(walk[i])} への寄り道をカット！ 長さ −${j - i}`)
        await sleep(900)
        walk = walk.slice(0, i).concat(walk.slice(j))
        paint(); changed = true; await sleep(400); break
      }
    }
  }
  f.ctrl.append(h('button.btn.sm.mt', { onclick: shorten }, '✂️ 最短化'), h('button.btn.sm', { onclick: () => { walk.pop(); if (!walk.length) walk = ['x1']; paint() } }, '1 歩もどる'),
    h('button.btn.sm', { onclick: () => { walk = ['x1', 'x2', 'x5', 'x3', 'x2', 'x5']; paint() } }, '例 3.1 の歩道'),
    h('button.btn.sm', { onclick: () => { walk = ['x1']; paint() } }, 'リセット'))
  paint()
  return f.el
}

// ---------- LAB: 連結成分 ----------
export function labComponents() {
  const f = labFrame({ title: '連結成分：ひとつながりの “島” を数える', hint: '辺をつないだり消したりすると、島（連結成分）がリアルタイムに色分けされます。島が 1 つなら <b>連結</b>。', color: 'mint', no: '3-2' })
  const pos = { a: [90, 110], b: [200, 70], c: [170, 220], d: [80, 300], e: [330, 120], f: [330, 270], g: [470, 80], h: [530, 200], i: [450, 310] }
  const E = [['a', 'b'], ['b', 'c'], ['a', 'c'], ['c', 'd'], ['e', 'f'], ['g', 'h'], ['h', 'i'], ['g', 'i']]
  const g = new GraphView(f.canvas, { w: W, h: H, editable: true, mode: 'connect', maxNodes: 12, nodes: toNodes(pos), edges: E })
  const big = h('div.bigval', '3'), vd = verdict('', 'mid'), rc = readout('連結成分')
  f.side.append(h('div', h('div.ro-k', '連結成分の数'), big), vd, rc)
  function upd() {
    g.gBack.innerHTML = ''
    const comps = components(g.adj())
    comps.forEach((c, i) => { g.blob(c, BLOBS[i % 5], 30); c.forEach((id) => g.color(id, PCYCLE[i % 6])) })
    if (big.textContent !== String(comps.length)) { big.textContent = comps.length; big.animate([{ transform: 'scale(1.5)' }, { transform: 'scale(1)' }], { duration: 450, easing: 'cubic-bezier(.34,1.56,.64,1)' }) }
    rc.set(comps.map((c) => '{' + c.join(',') + '}').join('  '))
    vd.set(comps.length === 1 ? '連結グラフ！' : '非連結グラフ', comps.length === 1 ? 'ok' : 'ng')
  }
  g.on('change', upd); g.on('move', () => { clearTimeout(upd.t); upd.t = setTimeout(upd, 30) })
  upd()
  f.ctrl.append(editModes(g), h('button.btn.sm', { onclick: () => g.load({ nodes: toNodes(pos), edges: E }) } , 'リセット'))
  return f.el
}

// ---------- LAB: G か Ḡ は連結 ----------
export function labCompConnected() {
  const f = labFrame({ title: '定理 3.2：G と Ḡ、少なくとも一方は連結', hint: '左が $G$、右が $\\overline G$。$G$ の辺をタップでオン／オフ。どんなに頑張っても <b>両方とも非連結</b> にはできません。挑戦してみて！', color: 'lav', no: '3-3', one: true })
  const ids = ['1', '2', '3', '4', '5', '6']
  const host = h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' } })
  const hA = h('div', { style: { position: 'relative' } }), hB = h('div', { style: { position: 'relative' } })
  host.append(hA, hB); f.canvas.append(host)
  const pos = circle(ids, 200, 170, 120)
  const all = []; for (let i = 0; i < 6; i++) for (let j = i + 1; j < 6; j++) all.push([ids[i], ids[j]])
  const A = new GraphView(hA, { w: 400, h: 350, r: 15, draggable: false, nodes: toNodes(pos), edges: all, aria: 'G' })
  const B = new GraphView(hB, { w: 400, h: 350, r: 15, draggable: false, nodes: toNodes(pos), edges: all, aria: '補グラフ' })
  const tA = s('text', { x: 18, y: 30, 'font-family': 'Fredoka', 'font-weight': 700, 'font-size': 24, fill: PAL.ink }, 'G'); A.gTop.append(tA)
  const tB = s('text', { x: 18, y: 30, 'font-family': 'Fredoka', 'font-weight': 700, 'font-size': 24, fill: PAL.ink }, 'Ḡ'); B.gTop.append(tB)
  let on = new Set(['1|2', '2|3', '1|3', '4|5', '5|6'])
  const vd = verdict('', 'mid')
  f.canvas.append(h('div', { style: { padding: '6px 10px' } }, vd))
  function paint() {
    const eA = all.filter(([a, b]) => on.has(ek(a, b))), eB = all.filter(([a, b]) => !on.has(ek(a, b)))
    for (const e of A.edges.values()) e.line.classList.toggle('ghost', !on.has(e.key))
    for (const e of B.edges.values()) { e.line.classList.toggle('ghost', on.has(e.key)); e.line.classList.toggle('hi3', !on.has(e.key)) }
    const cA = components(adjOf(ids, eA)), cB = components(adjOf(ids, eB))
    A.gBack.innerHTML = ''; B.gBack.innerHTML = ''
    cA.forEach((c, i) => { A.blob(c, BLOBS[i % 5], 26); c.forEach((id) => A.color(id, PCYCLE[i % 6])) })
    cB.forEach((c, i) => { B.blob(c, BLOBS[(i + 2) % 5], 26); c.forEach((id) => B.color(id, PCYCLE[(i + 2) % 6])) })
    tA.textContent = `G：成分 ${cA.length}`; tB.textContent = `Ḡ：成分 ${cB.length}`
    vd.set(cA.length === 1 && cB.length === 1 ? 'どちらも連結！' : cA.length === 1 ? 'G が連結' : `G は非連結 → Ḡ は必ず連結！（違う島の頂点どうしは Ḡ で直結）`, 'ok')
  }
  A.on('edgeclick', (e) => { on.has(e.key) ? on.delete(e.key) : on.add(e.key); paint() })
  B.on('edgeclick', (e) => { on.has(e.key) ? on.delete(e.key) : on.add(e.key); paint() })
  f.ctrl.append(h('button.btn.sm.lv', { onclick: () => { on = new Set(all.filter(() => Math.random() < .35).map(([a, b]) => ek(a, b))); paint() } }, '🎲 ランダム'), h('button.btn.sm', { onclick: () => { on = new Set(); paint() } }, 'G を空に'))
  paint()
  return f.el
}

// ---------- LAB: 距離の波紋（BFS） ----------
export function labDistance() {
  const f = labFrame({ title: '距離・離心数・半径・直径：波紋で測る', hint: '頂点をタップすると、そこから <b>波紋</b> が広がって各頂点までの距離が分かります。いちばん遠い距離がその頂点の <b>離心数</b>。全頂点の離心数の最小が半径、最大が直径。', color: 'sky', no: '3-4' })
  const pos = { x1: [60, 190], x2: [160, 100], x3: [160, 280], x4: [260, 190], x5: [360, 110], x6: [360, 270], x7: [460, 110], x8: [460, 270], x9: [550, 190] }
  const E = [['x1', 'x2'], ['x1', 'x3'], ['x2', 'x3'], ['x2', 'x4'], ['x3', 'x4'], ['x4', 'x5'], ['x4', 'x6'], ['x5', 'x7'], ['x6', 'x8'], ['x7', 'x9'], ['x8', 'x9']]
  const g = new GraphView(f.canvas, { w: W, h: H, editable: true, mode: 'move', maxNodes: 12, nodes: toNodes(pos, lbl(pos)), edges: E })
  const re = readout('離心数 ecc(x)'), rr = readout('半径 rad(G) ／ 中心'), rd = readout('直径 diam(G)'), vd = verdict('', 'mid')
  const b = bars(f.side)
  f.side.prepend(re, rr, rd, vd)
  let busy = false
  const lab = (id) => g.nodes.get(id)?.label ?? id
  function stats() {
    const { ecc } = eccentricities(g.adj())
    const ids = g.ids(), es = ids.map((i) => ecc.get(i))
    const rad = Math.min(...es), diam = Math.max(...es)
    const centers = ids.filter((i) => ecc.get(i) === rad)
    rr.set(`rad = ${rad === Infinity ? '∞' : rad} ／ 中心 {${centers.map(lab).join(', ')}}`)
    rd.set(`diam = ${diam === Infinity ? '∞（非連結）' : diam}`)
    b.set(ids.map((id, k) => ({ label: lab(id), v: es[k], cls: es[k] === rad ? 'lead' : es[k] === diam ? 'odd' : '' })))
    vd.set(rad === Infinity ? '非連結 → 距離 ∞ がある' : `rad ≤ diam ≤ 2·rad：${rad} ≤ ${diam} ≤ ${2 * rad} ✓（定理 3.3）`, rad === Infinity ? 'ng' : 'ok')
    return { ecc, centers }
  }
  async function wave(src) {
    if (busy) return; busy = true
    g.reset(); g.colorAll('white')
    const adj = g.adj(), { dist, par } = bfs(adj, src)
    const maxd = Math.max(...dist.values())
    const cols = ['pink', 'peach', 'lemon', 'mint', 'sky', 'lav', 'lav', 'lav']
    g.nodeClass(src, 'sel')
    for (let d = 0; d <= maxd; d++) {
      const layer = [...dist].filter(([, x]) => x === d).map(([v]) => v)
      const S = g.nodes.get(src)
      // ripple ring
      const ring = s('circle', { cx: S.x, cy: S.y, r: 10, class: 'wave' }); g.gBack.append(ring)
      ring.animate([{ r: 10, opacity: .9 }, { r: 110 + d * 60, opacity: 0 }], { duration: 900, easing: 'cubic-bezier(.22,1,.36,1)' }).onfinish = () => ring.remove()
      await Promise.all(layer.map(async (v) => { if (par.has(v)) { g.edgeClass(par.get(v), v, 'hi3'); await g.travel(par.get(v), v, PAL.sky, 300) } g.color(v, cols[d]); g.tag(v, d, cols[d]); g.bounce(v) }))
      await sleep(250)
    }
    g.ids().filter((i) => !dist.has(i)).forEach((i) => { g.tag(i, '∞', 'gray'); g.nodeClass(i, 'dim') })
    const { ecc } = stats()
    re.set(`ecc(${lab(src)}) = ${ecc.get(src) === Infinity ? '∞' : ecc.get(src)}`)
    busy = false
  }
  g.on('nodeclick', wave)
  g.on('change', () => !busy && stats())
  f.ctrl.append(h('button.btn.sm.sk', { onclick: () => { const { centers } = stats(); g.reset(); centers.forEach((c) => { g.color(c, 'pink'); g.pulse(c); g.nodeClass(c, 'sel') }) } }, '⭐ 中心を光らせる'),
    h('button.btn.sm', { onclick: () => wave('x1') }, 'x₁ から'), editModes(g), h('button.btn.sm', { onclick: () => { g.load({ nodes: toNodes(pos, lbl(pos)), edges: E }); g.reset() } }, 'リセット'))
  stats()
  return f.el
}

// ---------- LAB: BFS 層で 2 部分け（定理 2.4 (2)⇒(1)） ----------
export function labLayers() {
  const f = labFrame({ title: '定理 2.4 の証明：距離の “偶奇” で 2 つに分ける', hint: '頂点 $x$ から距離 $i$ の層 $X_i$ に並べ替えます。偶数層を $X$、奇数層を $Y$ にすると…<b>同じ層の中に辺</b>があれば奇閉路が見つかる！', color: 'pink', no: '3-5' })
  const presets = [
    { pos: { x: [0, 0], a: [0, 0], b: [0, 0], c: [0, 0], d: [0, 0], e: [0, 0], f: [0, 0], g: [0, 0] }, E: [['x', 'a'], ['x', 'b'], ['a', 'c'], ['b', 'c'], ['b', 'd'], ['c', 'e'], ['d', 'e'], ['d', 'f'], ['e', 'g'], ['f', 'g']] },
    { pos: { x: [0, 0], a: [0, 0], b: [0, 0], c: [0, 0], d: [0, 0], e: [0, 0], f: [0, 0] }, E: [['x', 'a'], ['x', 'b'], ['a', 'c'], ['b', 'd'], ['c', 'e'], ['d', 'f'], ['e', 'f'], ['c', 'd']] },
  ]
  presets.forEach((P) => { const ks = Object.keys(P.pos); P.pos = circle(ks, 300, 190, 140) })
  let cur = 0
  const g = new GraphView(f.canvas, { w: W, h: H, editable: true, mode: 'move', maxNodes: 12 })
  const vd = verdict('', 'mid'), rl = readout('層 X₀, X₁, X₂, …'), rxy = readout('X（偶数層）／ Y（奇数層）')
  f.side.append(vd, rl, rxy)
  function load(i) { cur = i; const P = presets[i]; g.load({ nodes: toNodes(P.pos), edges: P.E }); g.reset(); g.colorAll('white'); vd.set('「層に並べる」を押してね', 'mid'); rl.set(''); rxy.set('') }
  async function run() {
    g.reset()
    const adj = g.adj(), src = g.ids()[0]
    const { dist } = bfs(adj, src)
    const maxd = Math.max(...dist.values())
    const layers = Array.from({ length: maxd + 1 }, (_, d) => [...dist].filter(([, x]) => x === d).map(([v]) => v))
    const pos = {}
    const colW = (W - 100) / Math.max(1, maxd)
    layers.forEach((L, d) => L.forEach((v, k) => (pos[v] = [50 + d * colW, 60 + (k + .5) * (260 / L.length)])))
    g.ids().filter((i) => !dist.has(i)).forEach((i, k) => (pos[i] = [W - 30, 40 + k * 40]))
    await g.morph(pos, 1000)
    g.gBack.innerHTML = ''
    layers.forEach((L, d) => {
      const x = 50 + d * colW
      const r = s('rect', { x: x - 26, y: 30, width: 52, height: 300, rx: 26, fill: d % 2 ? 'rgba(111,214,188,.22)' : 'rgba(255,143,177,.22)', stroke: PAL.ink, 'stroke-width': 2, 'stroke-dasharray': '5 5' })
      const t = s('text', { x, y: 356, 'text-anchor': 'middle', 'font-family': 'JetBrains Mono', 'font-weight': 700, 'font-size': 13, fill: PAL.ink }, `X${sub(String(d))}`)
      g.gBack.append(r, t)
      r.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 400, delay: d * 90, fill: 'backwards' })
      L.forEach((v) => { g.color(v, d % 2 ? 'mint' : 'pink'); g.tag(v, d, d % 2 ? 'mint' : 'pink') })
    })
    rl.set(layers.map((L, d) => `X${sub(String(d))}={${L.join(',')}}`).join(' '))
    const X = layers.filter((_, d) => d % 2 === 0).flat(), Y = layers.filter((_, d) => d % 2).flat()
    rxy.set(`X = {${X.join(',')}} ／ Y = {${Y.join(',')}}`)
    const bad = [...g.edges.values()].filter((e) => dist.has(e.a) && dist.get(e.a) === dist.get(e.b))
    await sleep(500)
    if (bad.length) {
      bad.forEach((e) => e.line.classList.add('hi'))
      // find odd cycle via the two shortest paths
      const e = bad[0]; const { par } = bfs(adj, src)
      const path = (v) => { const p = [v]; while (par.has(v)) { v = par.get(v); p.push(v) } return p }
      const pa = path(e.a), pb = path(e.b); const sb = new Set(pb)
      const l = pa.find((v) => sb.has(v))
      const C = pa.slice(0, pa.indexOf(l) + 1).concat(pb.slice(0, pb.indexOf(l)).reverse())
      for (let k = 0; k < C.length; k++) g.edgeClass(C[k], C[(k + 1) % C.length], 'hi')
      g.blob(C, 'rgba(255,214,107,.35)', 24)
      vd.set(`同じ層 X${sub(String(dist.get(e.a)))} の中に辺 ${e.a}${e.b}！ → 長さ ${C.length} の奇閉路`, 'ng')
    } else {
      const cross = [...g.edges.values()].filter((e) => Math.abs(dist.get(e.a) - dist.get(e.b)) > 1)
      vd.set('辺はすべて “となりの層” の間だけ → X と Y で 2 部グラフ！', 'ok')
    }
  }
  f.ctrl.append(h('button.btn.sm.pk', { onclick: run }, '📚 層に並べる'), seg(['奇閉路なし', '奇閉路あり'], load), editModes(g))
  load(0)
  return f.el
}

// ---------- LAB: 木と葉（はっぱをちぎる帰納法） ----------
export function labTree() {
  const f = labFrame({ title: '木：葉は 2 枚以上、そして |E| = |V| − 1', hint: '「葉をちぎる」で葉（次数 1）を 1 枚ずつ取ると、頂点と辺が <b>1 つずつ</b> 減っていきます（定理 3.6 の帰納法）。「つなぐ」モードで辺を足して閉路を作ると、木ではなくなります。', color: 'mint', no: '3-6' })
  const pos = { r: [300, 70], a: [170, 160], b: [430, 160], c: [90, 270], d: [220, 280], e: [370, 280], f: [500, 270], g: [300, 200], h: [560, 170] }
  const E = [['r', 'a'], ['r', 'b'], ['a', 'c'], ['a', 'd'], ['b', 'e'], ['b', 'f'], ['r', 'g'], ['b', 'h']]
  const g = new GraphView(f.canvas, { w: W, h: H, editable: true, mode: 'move', maxNodes: 12, nodes: toNodes(pos), edges: E })
  const vV = h('div.bigval', '9'), vE = h('div.bigval', '8'), vd = verdict('', 'mid'), rl = readout('葉（次数 1 の頂点）')
  f.side.append(h('div', { style: { display: 'flex', gap: '18px', alignItems: 'end' } }, h('div', h('div.ro-k', '|V|'), vV), h('div', h('div.ro-k', '|E|'), vE), h('div', h('div.ro-k', '|V| − |E|'), h('div.bigval#vdiff', '1'))), vd, rl)
  let busy = false
  const bump = (el, v) => { if (el.textContent !== String(v)) { el.textContent = v; el.animate([{ transform: 'scale(1.4)', color: '#F2668F' }, { transform: 'scale(1)' }], { duration: 500, easing: 'cubic-bezier(.34,1.56,.64,1)' }) } }
  function upd() {
    const adj = g.adj(), ids = g.ids()
    const leaves = ids.filter((i) => adj.get(i).size === 1)
    ids.forEach((i) => g.color(i, adj.get(i).size === 1 ? 'mint' : adj.get(i).size === 0 ? 'gray' : 'lemon'))
    bump(vV, ids.length); bump(vE, g.edges.size); bump(f.side.querySelector('#vdiff'), ids.length - g.edges.size)
    rl.set(leaves.length ? `{${leaves.join(', ')}} … ${leaves.length} 枚` : 'なし')
    const conn = components(adj).length === 1, cyc = hasCycle(adj)
    vd.set(conn && !cyc ? '木（連結 & 閉路なし）🌳' : !cyc ? `林（閉路なし・成分 ${components(adj).length}）` : '閉路がある → 木でも林でもない', conn && !cyc ? 'ok' : !cyc ? 'mid' : 'ng')
    return leaves
  }
  g.on('change', () => !busy && upd())
  async function pluck() {
    if (busy) return
    const leaves = upd(); if (!leaves.length || g.nodes.size <= 1) { toast('もう葉がないよ'); return }
    busy = true
    const v = leaves[leaves.length - 1]
    const n = g.nodes.get(v)
    g.pulse(v, PAL.mint)
    // leaf flutter
    await n.el.animate([{ transform: `translate(${n.x}px,${n.y}px) rotate(0)` }, { transform: `translate(${n.x + 20}px,${n.y + 60}px) rotate(40deg)`, opacity: .2 }], { duration: 600, easing: 'cubic-bezier(.5,0,.75,0)' }).finished
    g.removeNode(v)
    busy = false; upd()
  }
  f.ctrl.append(h('button.btn.sm.mt', { onclick: pluck }, '🍃 葉をちぎる'), editModes(g), h('button.btn.sm', { onclick: () => { g.load({ nodes: toNodes(pos), edges: E }) } }, 'リセット'))
  upd()
  return f.el
}

// ---------- LAB: 全域木（閉路の辺を 1 本ずつ外す） ----------
export function labSpanning() {
  const f = labFrame({ title: '全域木：連結を保ったまま、辺を限界まで減らす', hint: '辺をタップして外そう。外すと <b>非連結になってしまう辺（橋）</b> は外せません。もう外せる辺がなくなったら、それが全域木（定理 3.8）。「自動」は閉路を見つけて 1 本ずつ外します。', color: 'lemon', no: '3-7' })
  const pos = { a: [300, 50], b: [130, 120], c: [470, 120], d: [210, 210], e: [390, 210], f: [80, 300], g: [300, 320], h: [520, 300] }
  const E = [['a', 'b'], ['a', 'c'], ['a', 'd'], ['a', 'e'], ['b', 'd'], ['c', 'e'], ['d', 'e'], ['b', 'f'], ['d', 'f'], ['d', 'g'], ['e', 'g'], ['e', 'h'], ['c', 'h'], ['f', 'g'], ['g', 'h']]
  const g = new GraphView(f.canvas, { w: W, h: H, draggable: true, nodes: toNodes(pos), edges: E })
  g.colorAll('sky')
  const off = new Set()
  const rs = readout('残っている辺 ／ 目標 |V| − 1'), vd = verdict('', 'mid')
  const prog = h('div', { style: { height: '14px', border: '2.5px solid var(--ink)', borderRadius: '999px', overflow: 'hidden', background: 'var(--paper)' } }, h('i', { style: { display: 'block', height: '100%', width: '0', background: 'var(--mint)', transition: 'width .6s cubic-bezier(.34,1.56,.64,1)' } }))
  f.side.append(rs, prog, vd, h('div', { style: { fontSize: '13px', color: 'var(--ink-2)' }, html: '電力網や通信網を、<b>最小本数のケーブル</b>でつなぐイメージ。コスト付きなら「最小全域木」になります。' }))
  const live = () => [...g.edges.values()].filter((e) => !off.has(e.key)).map((e) => [e.a, e.b])
  const connectedWithout = (k) => components(adjOf(g.ids(), live().filter(([a, b]) => ek(a, b) !== k))).length === 1
  function paint() {
    for (const e of g.edges.values()) { e.line.classList.toggle('ghost', off.has(e.key)); e.line.classList.remove('hi', 'hi2') }
    const L = live(), n = g.nodes.size
    for (const [a, b] of L) if (!connectedWithout(ek(a, b))) g.edgeClass(a, b, 'hi2')
    rs.set(`${L.length} ／ ${n - 1}`)
    prog.firstChild.style.width = ((E.length - L.length) / (E.length - (n - 1))) * 100 + '%'
    const done = L.length === n - 1
    vd.set(done ? '全域木 完成！🌳 緑の辺はぜんぶ “橋”' : `あと ${L.length - (n - 1)} 本外せる（緑は橋＝外せない）`, done ? 'ok' : 'mid')
    if (done) g.ids().forEach((i, k) => setTimeout(() => { g.color(i, 'mint'); g.bounce(i) }, k * 60))
  }
  g.on('edgeclick', (e) => {
    if (off.has(e.key)) { off.delete(e.key); g.colorAll('sky'); paint(); return }
    if (!connectedWithout(e.key)) { toast('それは橋！ 外すと非連結になっちゃう'); g.bounce(e.a); g.bounce(e.b); return }
    off.add(e.key); paint()
  })
  async function auto() {
    while (live().length > g.nodes.size - 1) {
      const k = live().map(([a, b]) => ek(a, b)).find((k) => connectedWithout(k))
      const [a, b] = k.split('|')
      g.edgeClass(a, b, 'hi'); await sleep(380)
      off.add(k); paint(); await sleep(150)
    }
  }
  f.ctrl.append(h('button.btn.sm.lm', { onclick: auto }, '⚡ 自動で全域木'), h('button.btn.sm', { onclick: () => { off.clear(); g.colorAll('sky'); paint() } }, 'リセット'))
  paint()
  return f.el
}
