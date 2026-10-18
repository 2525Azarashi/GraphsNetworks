// Labs for Lecture 2 : subgraphs, d(G)/2 peeling, complement, zoo, longest path, bipartite
import { h, s, sleep, toast } from '../lib/ui.js'
import { GraphView, PAL, circle, toNodes, adjOf, bipartition, PCYCLE, ek } from '../lib/graph.js'
import { labFrame, readout, verdict, seg, range, editModes, bars, sub } from '../lib/lab.js'

const W = 600, H = 380
const lbl = (pos) => Object.fromEntries(Object.keys(pos).map((k) => [k, { label: sub(k) }]))

// ---------- LAB: 部分グラフ 3 兄弟 ----------
export function labSubgraph() {
  const f = labFrame({ title: '部分グラフ・全域部分グラフ・誘導部分グラフ', hint: 'モードを選んで、頂点や辺をタップして <b>取り除いて</b> みよう。どのルールで消すかで、できる部分グラフの種類が変わります。', color: 'sky', no: '2-1' })
  const pos = { x1: [110, 190], x2: [260, 80], x3: [440, 80], x4: [260, 300], x5: [440, 300] }
  const E = [['x1', 'x2'], ['x1', 'x4'], ['x2', 'x3'], ['x2', 'x4'], ['x2', 'x5'], ['x3', 'x5'], ['x4', 'x5']]
  const g = new GraphView(f.canvas, { w: W, h: H, draggable: false, nodes: toNodes(pos, lbl(pos)), edges: E })
  let mode = 0
  const offV = new Set(), offE = new Set()
  const vd = verdict('', 'mid'), rV = readout('V(H)'), rE = readout('E(H)'), rx = readout('記号')
  const rule = h('div', { style: { fontSize: '13.5px', color: 'var(--ink-2)', lineHeight: 1.7 } })
  f.side.append(vd, rule, rV, rE, rx)
  const RULE = [
    '<b>G − X（頂点の除去）</b>：頂点をタップすると、その頂点と<b>接続する辺もいっしょに</b>消える。→ 誘導部分グラフ $G[V\\setminus X]$',
    '<b>G − F（辺の除去）</b>：辺をタップして消す。頂点はぜんぶ残る。→ <b>全域</b>部分グラフ',
    '<b>自由に</b>：頂点も辺も好きに消せる（ただし辺だけ残して端点を消すことはできない）。',
  ]
  function paint() {
    for (const id of g.ids()) { g.nodeClass(id, 'dim', offV.has(id)) }
    for (const e of g.edges.values()) {
      const off = offE.has(e.key) || offV.has(e.a) || offV.has(e.b)
      e.line.classList.toggle('ghost', off)
    }
    const Vh = g.ids().filter((i) => !offV.has(i))
    const Eh = [...g.edges.values()].filter((e) => !offE.has(e.key) && !offV.has(e.a) && !offV.has(e.b))
    rV.set('{' + Vh.map(sub).join(', ') + '}')
    rE.set('{' + Eh.map((e) => sub(e.a) + sub(e.b)).join(', ') + '}')
    // classify
    const spanning = Vh.length === 5
    const induced = Eh.length === E.filter(([a, b]) => !offV.has(a) && !offV.has(b)).length
    const tags = ['部分グラフ ✓']
    if (spanning) tags.push('全域 ✓')
    if (induced) tags.push('誘導 ✓')
    vd.set(tags.join('　'), spanning && induced ? 'ok' : spanning || induced ? 'mid' : 'mid')
    const X = [...offV].map(sub), F = [...offE].filter((k) => { const [a, b] = k.split('|'); return !offV.has(a) && !offV.has(b) }).map((k) => k.split('|').map(sub).join(''))
    rx.set(X.length || F.length ? 'H = G' + (X.length ? ` − {${X.join(',')}}` : '') + (F.length ? ` − {${F.join(',')}}` : '') : 'H = G（G 自身も部分グラフ）')
  }
  g.on('nodeclick', (id) => {
    if (mode === 1) { toast('このモードでは頂点は消せません'); return }
    offV.has(id) ? offV.delete(id) : offV.add(id); paint(); g.pulse(id)
  })
  g.on('edgeclick', (e) => {
    if (mode === 0) { toast('このモードでは頂点だけを消します'); return }
    if (offV.has(e.a) || offV.has(e.b)) return
    offE.has(e.key) ? offE.delete(e.key) : offE.add(e.key); paint()
  })
  const sg = seg(['G − X（頂点）', 'G − F（辺）', '自由'], (i) => { mode = i; offV.clear(); offE.clear(); rule.innerHTML = RULE[i]; window.renderMathInElement?.(rule, { delimiters: [{ left: '$', right: '$', display: false }] }); paint() })
  f.ctrl.append(sg, h('button.btn.sm', { onclick: () => { offV.clear(); offE.clear(); paint() } }, '元に戻す'))
  rule.innerHTML = RULE[0]
  setTimeout(() => window.renderMathInElement?.(rule, { delimiters: [{ left: '$', right: '$', display: false }] }), 600)
  paint()
  return f.el
}

// ---------- LAB: 平均次数 d(G)/2 の皮むき ----------
export function labPeel() {
  const f = labFrame({ title: '定理 2.1：次数が d(G)/2 未満の頂点をむいていく', hint: '「むく」を押すと、次数が $d(G)/2$ 未満の頂点を 1 つずつ取り除きます。残った部分グラフ $H$ は必ず $\\delta(H) \\ge d(G)/2$！', color: 'peach', no: '2-2' })
  const presets = {
    a: { pos: { a: [80, 90], b: [70, 250], c: [190, 330], d: [230, 190], e: [330, 110], f: [430, 70], g: [420, 220], h: [530, 150], i: [530, 300], j: [330, 320] },
      E: [['a', 'b'], ['a', 'd'], ['b', 'c'], ['d', 'e'], ['e', 'f'], ['e', 'g'], ['f', 'g'], ['f', 'h'], ['g', 'h'], ['g', 'i'], ['h', 'i'], ['e', 'h'], ['f', 'i'], ['g', 'j'], ['d', 'j']] },
    b: { pos: { ...circle(['p', 'q', 'r', 's', 't'], 360, 190, 110), u: [90, 80], v: [90, 300], w: [180, 190] },
      E: [['p', 'q'], ['q', 'r'], ['r', 's'], ['s', 't'], ['t', 'p'], ['p', 'r'], ['q', 's'], ['r', 't'], ['s', 'p'], ['t', 'q'], ['u', 'w'], ['v', 'w'], ['w', 't']] },
  }
  let cur = 'a'
  const g = new GraphView(f.canvas, { w: W, h: H, r: 16 })
  const rd = readout('平均次数 d(G) ＝ 2|E| / |V|'), rt = readout('しきい値 d(G)/2'), rh = readout('いまの δ(H)')
  const vd = verdict('', 'mid')
  const b = bars(f.side)
  f.side.prepend(rd, rt, rh, vd)
  let thr = 0, busy = false
  function load(k) {
    cur = k
    const P = presets[k]
    g.load({ nodes: toNodes(P.pos, Object.fromEntries(Object.keys(P.pos).map((id, i) => [id, { color: 'white' }]))), edges: P.E })
    const d = (2 * P.E.length) / Object.keys(P.pos).length
    thr = d / 2
    rd.set(`2×${P.E.length} / ${Object.keys(P.pos).length} = ${d.toFixed(2)}`)
    rt.set(thr.toFixed(2))
    upd(); vd.set('むく準備OK', 'mid')
  }
  function upd() {
    const adj = g.adj(), ids = g.ids()
    ids.forEach((id) => { const d = adj.get(id).size; g.tag(id, d, d < thr ? 'pink' : 'mint') })
    const ds = ids.map((i) => adj.get(i).size)
    rh.set(ids.length ? Math.min(...ds) : '—')
    b.set(ids.map((id, k) => ({ label: id, v: ds[k], cls: ds[k] < thr ? 'odd' : '' })), 5)
    return ids.find((id) => adj.get(id).size < thr)
  }
  async function peel(all) {
    if (busy) return; busy = true
    let v
    while ((v = upd())) {
      g.pulse(v, PAL.pink); g.nodeClass(v, 'sel')
      await sleep(450)
      g.removeNode(v)
      await sleep(320)
      if (!all) break
    }
    const rest = upd()
    if (!rest) {
      const ids = g.ids()
      ids.forEach((id) => g.color(id, 'mint'))
      g.blob(ids, 'rgba(111,214,188,.28)', 34)
      vd.set(`完成！ δ(H) = ${rh.querySelector('.ro-v').textContent} ≥ ${thr.toFixed(2)}`, 'ok')
    }
    busy = false
  }
  f.ctrl.append(h('button.btn.sm.pk', { onclick: () => peel(false) }, '🔪 1 つむく'), h('button.btn.sm.lm', { onclick: () => peel(true) }, '⏩ ぜんぶむく'),
    seg(['例 A', '例 B'], (i) => load(['a', 'b'][i])), h('button.btn.sm', { onclick: () => load(cur) }, 'リセット'))
  load('a')
  return f.el
}

// ---------- LAB: 補グラフ ----------
export function labComplement() {
  const f = labFrame({ title: '補グラフ：あった辺は消え、なかった辺が現れる', hint: '「反転！」で $G$ ⇄ $\\overline{G}$。頂点をタップするとその次数が $\\deg_G + \\deg_{\\overline G} = n-1$ になることを確認できます。', color: 'lav', no: '2-3' })
  const ids = ['x1', 'x2', 'x3', 'x4', 'x5']
  const pos = circle(ids, 300, 190, 135)
  const all = []; for (let i = 0; i < 5; i++) for (let j = i + 1; j < 5; j++) all.push([ids[i], ids[j]])
  let on = new Set(['x1|x2', 'x1|x3', 'x1|x5', 'x2|x3', 'x3|x4', 'x4|x5'].map((k) => k))
  const g = new GraphView(f.canvas, { w: W, h: H, editable: false, nodes: toNodes(pos, lbl(pos)), edges: all })
  let comp = false
  const rd = readout('いま見ているグラフ'), rs = readout('サイズ'), rn = readout('タップした頂点')
  const vd = verdict('', 'mid')
  f.side.append(rd, rs, vd, rn, h('div', { style: { fontSize: '13px', color: 'var(--ink-2)' }, html: '点線の辺をタップすると $G$ に辺を追加／削除できます。' }))
  function isOn(k) { return comp ? !on.has(k) : on.has(k) }
  function paint(anim) {
    for (const e of g.edges.values()) {
      const vis = isOn(e.key)
      e.line.classList.toggle('ghost', !vis)
      e.line.classList.toggle('hi3', vis && comp)
      if (anim && vis) { const len = 400; e.line.animate([{ strokeDasharray: `${len}`, strokeDashoffset: len }, { strokeDasharray: `${len}`, strokeDashoffset: 0 }], { duration: 650, easing: 'cubic-bezier(.22,1,.36,1)' }) }
    }
    const adj = new Map(ids.map((i) => [i, 0]))
    for (const e of g.edges.values()) if (isOn(e.key)) { adj.set(e.a, adj.get(e.a) + 1); adj.set(e.b, adj.get(e.b) + 1) }
    ids.forEach((i) => g.tag(i, adj.get(i), comp ? 'sky' : 'lemon'))
    rd.set(comp ? 'G の補グラフ  Ḡ' : 'もとのグラフ  G')
    const m = all.filter(([a, b]) => isOn(ek(a, b))).length
    rs.set(`|E| = ${m}   （|E(G)| + |E(Ḡ)| = ${on.size} + ${10 - on.size} = 10 = C(5,2)）`)
    vd.set(comp ? '補グラフの補グラフはもとに戻る' : 'これが G', comp ? 'mid' : 'ok')
  }
  g.on('edgeclick', (e) => { if (comp) { toast('G に戻ってから編集してね'); return } on.has(e.key) ? on.delete(e.key) : on.add(e.key); paint() })
  g.on('nodeclick', (id) => {
    let a = 0, b = 0
    for (const e of g.edges.values()) if (e.a === id || e.b === id) on.has(e.key) ? a++ : b++
    rn.set(`deg_G(${sub(id)}) + deg_Ḡ(${sub(id)}) = ${a} + ${b} = ${a + b} = n − 1`)
  })
  f.ctrl.append(h('button.btn.sm.lv', { onclick: () => { comp = !comp; paint(true); g.ids().forEach((i) => g.bounce(i)) } }, '🔄 反転！'), h('button.btn.sm', { onclick: () => { on = new Set(); paint() } }, '辺をぜんぶ消す'))
  paint()
  return f.el
}

// ---------- LAB: 特徴的なグラフ図鑑 ----------
export function labZoo() {
  const f = labFrame({ title: '特徴的なグラフ図鑑：Kₙ・Eₙ・Pₙ・Cₙ・Wₙ・K_{m,n}', hint: '種類とサイズを変えると、グラフがぬるっと組み変わります。辺の本数の公式もチェック。', color: 'mint', no: '2-4' })
  const g = new GraphView(f.canvas, { w: W, h: H, r: 15, labels: false })
  const name = h('div.bigval', 'K₆'), vd = verdict('', 'mid'), rf = readout('辺の本数'), rd = readout('次数')
  f.side.append(name, rf, rd, vd)
  let kind = 0, n = 6, m = 3
  const KINDS = ['完全 Kₙ', '空 Eₙ', '道 Pₙ', '閉路 Cₙ', '車輪 Wₙ', '完全2部 K_{m,n}', '星 K_{1,n}']
  function build() {
    let ids = [], pos = {}, E = [], cols = {}
    const N = n
    if (kind <= 1 || kind === 3) {
      if (kind === 3 && N < 3) n = 3
      ids = Array.from({ length: n }, (_, i) => 'v' + i); pos = circle(ids, 300, 185, 140)
      if (kind === 0) for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) E.push([ids[i], ids[j]])
      if (kind === 3) for (let i = 0; i < n; i++) E.push([ids[i], ids[(i + 1) % n]])
      ids.forEach((id, i) => (cols[id] = { color: kind === 1 ? 'white' : PCYCLE[i % 6] }))
    } else if (kind === 2) {
      ids = Array.from({ length: n }, (_, i) => 'v' + i)
      ids.forEach((id, i) => { const t = n === 1 ? .5 : i / (n - 1); pos[id] = [60 + t * 480, 190 + Math.sin(t * Math.PI * 2) * 60]; cols[id] = { color: i === 0 || i === n - 1 ? 'pink' : 'lemon' } })
      for (let i = 0; i + 1 < n; i++) E.push([ids[i], ids[i + 1]])
    } else if (kind === 4) {
      if (n < 4) n = 4
      const rim = Array.from({ length: n - 1 }, (_, i) => 'v' + i)
      ids = [...rim, 'hub']; pos = { ...circle(rim, 300, 185, 145), hub: [300, 185] }
      rim.forEach((id, i) => { E.push([id, rim[(i + 1) % rim.length]]); E.push([id, 'hub']); cols[id] = { color: 'sky' } })
      cols.hub = { color: 'pink' }
    } else {
      const a = kind === 6 ? 1 : m, b = n
      const A = Array.from({ length: a }, (_, i) => 'a' + i), B = Array.from({ length: b }, (_, i) => 'b' + i)
      ids = [...A, ...B]
      if (kind === 6) { pos = { a0: [300, 185], ...circle(B, 300, 185, 140) } }
      else { A.forEach((id, i) => (pos[id] = [180, a === 1 ? 190 : 60 + (i * 260) / (a - 1)])); B.forEach((id, i) => (pos[id] = [420, b === 1 ? 190 : 50 + (i * 280) / (b - 1)])) }
      A.forEach((x) => { cols[x] = { color: 'pink' }; B.forEach((y) => E.push([x, y])) })
      B.forEach((y) => (cols[y] = { color: 'mint' }))
    }
    // morph if same id set else load
    const same = ids.length === g.nodes.size && ids.every((i) => g.nodes.has(i))
    if (same) {
      for (const e of [...g.edges.values()]) if (!E.some(([a, b]) => ek(a, b) === e.key)) g.removeEdge(e.a, e.b, true)
      g.morph(pos, 700).then(() => { E.forEach(([a, b]) => g.addEdge(a, b, true)); g.intro() })
      ids.forEach((id) => g.color(id, cols[id].color))
    } else g.load({ nodes: toNodes(pos, cols), edges: E })
    const nn = ids.length
    const fm = [
      [`K${sub(String(n))}`, `C(${n},2) = ${n}(${n}−1)/2 = ${E.length}`, `すべて ${n - 1}（(n−1)-正則）`, '任意の2頂点が隣接'],
      [`E${sub(String(n))}`, '0', 'すべて 0', `K${sub(String(n))} の補グラフ`],
      [`P${sub(String(n))}`, `n − 1 = ${E.length}（＝道の長さ）`, '端点 1、内点 2', 'P₁≃K₁、P₂≃K₂'],
      [`C${sub(String(n))}`, `n = ${E.length}（＝閉路の長さ）`, 'すべて 2（2-正則）', 'n ≥ 3 で定義'],
      [`W${sub(String(n))}`, `2(n−1) = ${E.length}`, `中心 ${n - 1}、外周 3`, '閉路 + 中心の頂点'],
      [`K${sub(m + ',' + n)}`, `m × n = ${E.length}`, `左 ${n}、右 ${m}`, '2 部グラフ（部集合が 2 つ）'],
      [`K${sub('1,' + n)}`, `n = ${E.length}`, `中心 ${n}、葉 1`, '星：K_{1,n}'],
    ][kind]
    name.textContent = fm[0]; rf.set(fm[1]); rd.set(fm[2]); vd.set(fm[3], 'mid')
    nR.inp.value = n; nR.querySelector('output').textContent = n
  }
  const sel = h('select.inp', { style: { flex: '0 0 auto' }, 'aria-label': '種類', onchange: (e) => { kind = +e.target.value; mR.style.display = kind === 5 ? '' : 'none'; build() } }, KINDS.map((k, i) => h('option', { value: i }, k)))
  const nR = range('n', 1, 10, n, (v) => { n = v; build() })
  const mR = range('m', 1, 5, m, (v) => { m = v; build() })
  mR.style.display = 'none'
  f.ctrl.append(sel, nR, mR)
  build()
  return f.el
}

// ---------- LAB: 最長道 → 長い道・閉路 ----------
export function labLongestPath() {
  const f = labFrame({ title: '定理 2.2 / 2.3：最長の道の “はしっこ” を見る', hint: '「最長道を探す」で、いちばん長い道 $P$ を光らせます。端点 $x_m$ の隣人は <b>全員 P の上</b> にいる（いなければもっと伸ばせるから）。そこから長さ $\\ge\\delta$ の道と、長さ $\\ge\\delta+1$ の閉路が見つかります。', color: 'lemon', no: '2-5' })
  const pos = { a: [80, 200], b: [170, 90], c: [300, 60], d: [430, 90], e: [520, 200], f: [430, 310], g: [300, 330], h: [170, 310], i: [300, 195] }
  const E = [['a', 'b'], ['b', 'c'], ['c', 'd'], ['d', 'e'], ['e', 'f'], ['f', 'g'], ['g', 'h'], ['h', 'a'], ['a', 'i'], ['c', 'i'], ['e', 'i'], ['g', 'i'], ['b', 'h'], ['d', 'f']]
  const g = new GraphView(f.canvas, { w: W, h: H, editable: true, mode: 'move', maxNodes: 11, nodes: toNodes(pos), edges: E })
  const rd = readout('最小次数 δ(G)'), rp = readout('最長道 P'), rc = readout('見つかった閉路 C'), vd = verdict('', 'mid')
  f.side.append(rd, rp, rc, vd)
  let busy = false
  function longest() {
    const adj = g.adj(); let best = []
    const ids = g.ids()
    const dfs = (path, seen) => {
      if (path.length > best.length) best = path.slice()
      const u = path[path.length - 1]
      for (const v of adj.get(u)) if (!seen.has(v)) { seen.add(v); path.push(v); dfs(path, seen); path.pop(); seen.delete(v) }
    }
    ids.forEach((s0) => dfs([s0], new Set([s0])))
    return best
  }
  async function run() {
    if (busy) return; busy = true
    g.reset()
    const adj = g.adj()
    const ds = g.ids().map((i) => adj.get(i).size)
    const delta = Math.min(...ds)
    rd.set(delta)
    const P = longest()
    rp.set(P.join(' → ') + `（長さ ${P.length - 1}）`)
    g.ids().forEach((i) => g.nodeClass(i, 'dim', true))
    for (let k = 0; k < P.length; k++) {
      g.nodeClass(P[k], 'dim', false); g.color(P[k], 'lemon'); g.bounce(P[k])
      if (k) { g.edgeClass(P[k - 1], P[k], 'hi'); await g.travel(P[k - 1], P[k], PAL.pink, 260) }
      else await sleep(200)
    }
    const xm = P[P.length - 1]
    g.color(xm, 'pink'); g.nodeClass(xm, 'sel'); g.tag(xm, 'xₘ', 'pink')
    await sleep(400)
    const N = [...adj.get(xm)]
    for (const v of N) { g.edgeClass(xm, v, 'hi2'); g.pulse(v, PAL.mint); await sleep(200) }
    const idx = Math.min(...N.map((v) => P.indexOf(v)))
    const C = P.slice(idx)
    if (C.length >= 3) {
      g.tag(P[idx], 'xᵢ', 'mint')
      await sleep(300)
      g.blob(C, 'rgba(111,214,188,.25)', 30)
      rc.set(C.join(' → ') + ' → ' + C[0] + `（長さ ${C.length}）`)
      vd.set(`道の長さ ${P.length - 1} ≥ δ=${delta}　／　閉路の長さ ${C.length} ≥ δ+1=${delta + 1}`, 'ok')
    } else { rc.set('δ(G) ≥ 2 でないと閉路は保証されない'); vd.set(`道の長さ ${P.length - 1} ≥ δ = ${delta}`, 'ok') }
    busy = false
  }
  f.ctrl.append(h('button.btn.sm.lm', { onclick: run }, '🔦 最長道を探す'), editModes(g), h('button.btn.sm', { onclick: () => { g.load({ nodes: toNodes(pos), edges: E }); g.reset() } }, 'リセット'))
  return f.el
}

// ---------- LAB: 2 部グラフ判定 ----------
export function labBipartite() {
  const f = labFrame({ title: '2 部グラフ ⟺ 奇閉路がない（定理 2.4）', hint: '「2色でぬる」を押すと、となり同士が別の色になるように塗っていきます。失敗したら、そこに <b>奇数の長さの閉路</b> が必ず隠れている！ 辺をつないだり消したりして試そう。', color: 'pink', no: '2-6' })
  const presets = [
    { pos: circle(['a', 'b', 'c', 'd', 'e', 'f'], 300, 190, 140), E: [['a', 'b'], ['b', 'c'], ['c', 'd'], ['d', 'e'], ['e', 'f'], ['f', 'a'], ['a', 'd']] },
    { pos: circle(['a', 'b', 'c', 'd', 'e'], 300, 190, 140), E: [['a', 'b'], ['b', 'c'], ['c', 'd'], ['d', 'e'], ['e', 'a']] },
    { pos: { a: [120, 90], b: [120, 190], c: [120, 290], x: [450, 70], y: [450, 160], z: [450, 240], w: [450, 320] }, E: [['a', 'x'], ['a', 'y'], ['b', 'y'], ['b', 'z'], ['c', 'w'], ['c', 'x'], ['b', 'w']] },
  ]
  let cur = 0
  const g = new GraphView(f.canvas, { w: W, h: H, editable: true, mode: 'move', maxNodes: 12 })
  const vd = verdict('', 'mid'), rx = readout('部集合 X₁ / X₂'), rc = readout('奇閉路')
  f.side.append(vd, rx, rc)
  let busy = false
  function load(i) { cur = i; const P = presets[i]; g.load({ nodes: toNodes(P.pos), edges: P.E }); g.reset(); g.colorAll('white'); vd.set('ぬってみよう', 'mid'); rx.set(''); rc.set('') }
  async function paint() {
    if (busy) return; busy = true
    g.reset(); g.colorAll('white')
    const adj = g.adj()
    const res = bipartition(adj)
    // animate BFS colouring
    const side = new Map()
    for (const s0 of adj.keys()) {
      if (side.has(s0)) continue
      side.set(s0, 0); g.color(s0, 'pink'); g.bounce(s0)
      const q = [s0]
      while (q.length) {
        const u = q.shift()
        for (const v of adj.get(u)) {
          if (side.has(v)) {
            if (side.get(v) === side.get(u) && !res.ok) continue
            continue
          }
          side.set(v, 1 - side.get(u))
          await g.travel(u, v, side.get(v) ? PAL.mint : PAL.pink, 220)
          g.color(v, side.get(v) ? 'mint' : 'pink'); g.bounce(v)
          q.push(v)
        }
      }
    }
    if (res.ok) {
      const X1 = [...res.side].filter(([, s]) => s === 0).map(([k]) => k), X2 = [...res.side].filter(([, s]) => s === 1).map(([k]) => k)
      rx.set(`{${X1.join(',')}} ／ {${X2.join(',')}}`); rc.set('なし')
      vd.set('2 部グラフ！ 同じ色どうしは隣接しない', 'ok')
      // arrange into two columns
      const pos = {}; X1.forEach((id, i) => (pos[id] = [170, 40 + (i + .5) * (300 / X1.length)])); X2.forEach((id, i) => (pos[id] = [430, 40 + (i + .5) * (300 / X2.length)]))
      await sleep(300); await g.morph(pos, 900)
    } else {
      const C = res.cycle
      rc.set(C.join(' → ') + ' → ' + C[0] + `（長さ ${C.length}）`); rx.set('分けられない')
      for (let k = 0; k < C.length; k++) g.edgeClass(C[k], C[(k + 1) % C.length], 'hi')
      C.forEach((id) => g.pulse(id))
      g.blob(C, 'rgba(255,143,177,.25)', 26)
      vd.set(`長さ ${C.length}（奇数）の閉路がある → 2 部グラフではない`, 'ng')
    }
    busy = false
  }
  f.ctrl.append(h('button.btn.sm.pk', { onclick: paint }, '🎨 2色でぬる'), seg(['C₆+弦', 'C₅', '2部っぽい'], load), editModes(g))
  load(0)
  return f.el
}
