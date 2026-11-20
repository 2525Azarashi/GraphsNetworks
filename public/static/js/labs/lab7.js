// Labs for Lecture 7 : Hamilton cycles, necessary conditions, Dirac / Ore / closure, TSP
import { h, s, sleep, toast, tween, confetti } from '../lib/ui.js'
import { PAL, GraphView, circle, toNodes } from '../lib/graph.js'
import { labFrame, readout, verdict, seg } from '../lib/lab.js'

// =========================================================
//  small graph algorithms (simple graphs only)
// =========================================================
export const adjMap = (ids, edges) => {
  const m = new Map(ids.map((v) => [v, new Set()]))
  for (const [a, b] of edges) { m.get(a)?.add(b); m.get(b)?.add(a) }
  return m
}
export const degMap = (ids, edges) => { const a = adjMap(ids, edges); return Object.fromEntries(ids.map((v) => [v, a.get(v).size])) }
export const key = (a, b) => (String(a) < String(b) ? `${a}|${b}` : `${b}|${a}`)

// number of connected components of G - removed
export function ncomp(ids, edges, removed = []) {
  const rem = new Set(removed), adj = adjMap(ids, edges), seen = new Set()
  let c = 0
  for (const v of ids) {
    if (rem.has(v) || seen.has(v)) continue
    c++
    const st = [v]; seen.add(v)
    while (st.length) { const u = st.pop(); for (const w of adj.get(u)) if (!rem.has(w) && !seen.has(w)) { seen.add(w); st.push(w) } }
  }
  return c
}

// backtracking search for a Hamilton cycle -> [v0, v1, ..., v0] or null
export function hamiltonCycle(ids, edges) {
  const adj = adjMap(ids, edges), n = ids.length
  if (n < 3) return null
  const start = ids[0], order = [start], used = new Set([start])
  const rec = () => {
    const last = order[order.length - 1]
    if (order.length === n) return adj.get(last).has(start)
    for (const w of adj.get(last)) {
      if (used.has(w)) continue
      used.add(w); order.push(w)
      if (rec()) return true
      order.pop(); used.delete(w)
    }
    return false
  }
  return rec() ? order.concat([start]) : null
}
export function hamiltonPath(ids, edges) {
  const adj = adjMap(ids, edges), n = ids.length
  for (const start of ids) {
    const order = [start], used = new Set([start])
    const rec = () => {
      if (order.length === n) return true
      const last = order[order.length - 1]
      for (const w of adj.get(last)) {
        if (used.has(w)) continue
        used.add(w); order.push(w)
        if (rec()) return true
        order.pop(); used.delete(w)
      }
      return false
    }
    if (rec()) return order
  }
  return null
}

// Bondy-Chvatal closure: list of added edges [{edge:[a,b], before:[deg a, deg b]}]
export function closureSteps(ids, edges) {
  const n = ids.length, E = new Set(edges.map(([a, b]) => key(a, b))), steps = []
  const pairs = []
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) pairs.push([ids[i], ids[j]])
  for (;;) {
    const list = [...E].map((k) => k.split('|'))
    const deg = degMap(ids, list)
    const add = pairs.find(([a, b]) => !E.has(key(a, b)) && deg[a] + deg[b] >= n)
    if (!add) break
    E.add(key(add[0], add[1]))
    steps.push({ edge: add, before: [deg[add[0]], deg[add[1]]], size: E.size })
  }
  return steps
}

// =========================================================
//  graph zoo for lecture 7
// =========================================================
const grid = (rows, cols, ox, oy, dx, dy) => {
  const pos = {}, E = []
  for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) pos[`${i}${j}`] = [ox + j * dx, oy + i * dy]
  for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
    if (j + 1 < cols) E.push([`${i}${j}`, `${i}${j + 1}`])
    if (i + 1 < rows) E.push([`${i}${j}`, `${i + 1}${j}`])
  }
  const labels = Object.fromEntries(Object.keys(pos).map((id) => [id, `${+id[0] + 1}-${+id[1] + 1}`]))
  return { pos, E, labels }
}
const hexPos = () => {
  const ids = ['1', '2', '3', '4', '5', '6']
  return { pos: circle(ids, 300, 190, 132), ids }
}
function petersenG() {
  const outer = ['o1', 'o2', 'o3', 'o4', 'o5'], inner = ['i1', 'i2', 'i3', 'i4', 'i5']
  const pos = { ...circle(outer, 300, 188, 140), ...circle(inner, 300, 188, 62, -Math.PI / 2 - Math.PI / 5) }
  const E = []
  outer.forEach((v, k) => E.push([v, outer[(k + 1) % 5]]))
  inner.forEach((v, k) => E.push([v, inner[(k + 2) % 5]]))
  outer.forEach((v, k) => E.push([v, inner[k]]))
  const labels = Object.fromEntries([...outer, ...inner].map((v) => [v, v[0] === 'o' ? v[1] : v[1]]))
  return { pos, E, labels }
}
const k33 = () => {
  const A = ['a1', 'a2', 'a3'], B = ['b1', 'b2', 'b3']
  const pos = {}, E = []
  A.forEach((v, i) => (pos[v] = [180, 80 + i * 110]))
  B.forEach((v, i) => (pos[v] = [420, 80 + i * 110]))
  A.forEach((a) => B.forEach((b) => E.push([a, b])))
  return { pos, E }
}
const k24 = () => {
  const A = ['a1', 'a2'], B = ['b1', 'b2', 'b3', 'b4']
  const pos = {}, E = []
  A.forEach((v, i) => (pos[v] = [170, 135 + i * 110]))
  B.forEach((v, i) => (pos[v] = [430, 65 + i * 85]))
  A.forEach((a) => B.forEach((b) => E.push([a, b])))
  return { pos, E }
}
const house = () => ({
  pos: { a: [300, 50], b: [190, 150], c: [410, 150], d: [190, 320], e: [410, 320] },
  E: [['a', 'b'], ['a', 'c'], ['b', 'c'], ['b', 'd'], ['c', 'e'], ['d', 'e'], ['b', 'e'], ['c', 'd']],
})

const G7 = {
  grid34: { label: '3×4 格子', ...grid(3, 4, 112, 105, 113, 110) },
  grid33: { label: '3×3 格子', ...grid(3, 3, 170, 95, 130, 120) },
  petersen: { label: 'ペテルセン', ...petersenG() },
  k24: { label: 'K₂,₄', ...k24() },
  k33: { label: 'K₃,₃', ...k33() },
  house: { label: '家', ...house() },
}
{
  const H = hexPos()
  G7.hex = { label: 'C₆＋弦', pos: H.pos, E: [['1', '2'], ['2', '3'], ['3', '4'], ['4', '5'], ['5', '6'], ['6', '1'], ['1', '4'], ['2', '5']] }
}
const load = (g, G, labels = true) => g.load({ nodes: toNodes(G.pos, Object.fromEntries(Object.keys(G.pos).map((id) => [id, { label: labels ? (G.labels?.[id] ?? id) : '' }]))), edges: G.E })

// =========================================================
//  LAB 7-1 : Hamilton cycle playground
// =========================================================
export function labHam() {
  const f = labFrame({
    title: 'ハミルトン閉路チャレンジ：全頂点を 1 回ずつ、しかも 1 本につなぐ',
    hint: '頂点を<b>順にタップ</b>して巡回路を作ります。となりの頂点しか選べません。全部の頂点を通って出発点に戻れたら完成！ 「おまかせ」はバックトラックで探します（無ければ「無い」と言い切ります）。オイラー周遊（辺を 1 回ずつ）とのちがいに注目。',
    color: 'aqua', no: '7-1',
  })
  const g = new GraphView(f.canvas, { w: 600, h: 380, r: 16 })
  const rj = readout('このグラフは？'), rp = readout('いまの巡回路'), rd = readout('残りの頂点'), vd = verdict('', 'mid')
  f.side.append(rj, vd, rp, rd)
  let name = 'grid34', cyc = null, cur = null, used = [], busy = false
  const G = () => G7[name]
  const ids = () => g.ids()

  function judgeNow() {
    const H = hamiltonCycle(ids(), g.edgeList())
    const P = H ? null : hamiltonPath(ids(), g.edgeList())
    rj.set(H
      ? `<b style="color:var(--mint-d)">ハミルトングラフ</b><br>${G().label}：閉路あり`
      : P ? `<b style="color:var(--pink-d)">ハミルトングラフでない</b><br>${G().label}：道はあるが閉路はない`
        : `<b style="color:var(--pink-d)">ハミルトングラフでない</b><br>${G().label}：道もない`)
  }
  function paint() {
    g.reset()
    ids().forEach((v) => {
      const k = used.indexOf(v)
      if (k >= 0) { g.color(v, 'mint'); g.tag(v, k + 1, 'mint') }
      else { g.color(v, 'white'); g.tag(v, null) }
      g.nodeClass(v, 'sel', v === cur)
    })
    if (used.length) {
      for (let i = 0; i < used.length - 1; i++) g.edgeClass(used[i], used[i + 1], 'hi2')
      if (cur) g.color(cur, 'lemon')
      if (cur && used.length === ids().length) g.edgeClass(cur, used[0], 'hi2')
    }
    rp.set(used.length ? used.map((v) => G().labels?.[v] ?? v).join(' → ') + (cyc ? ' → ' + (G().labels?.[used[0]] ?? used[0]) : '') : '—')
    rd.set(`${ids().length - used.length} 個（いま ${cur ? (G().labels?.[cur] ?? cur) : '—'} にいる）`)
  }
  function restart(soft = false) {
    cyc = null; cur = null; used = []; paint()
    vd.set('出発点の頂点をタップしてね', 'mid')
    if (!soft) judgeNow()
  }
  async function stepTo(v) {
    const from = cur
    used.push(v); cur = v
    await g.travel(from, v, PAL.mint, 260)
    g.edgeClass(from, v, 'hi2')
    paint()
    if (used.length === ids().length) {
      if (g.adj().get(cur).has(used[0])) {
        vd.set('🎉 完成！ 全頂点を 1 回ずつ通って出発点に戻った → <b>ハミルトン閉路</b>', 'ok')
        cyc = used.slice(); confetti()
      } else {
        vd.set('全部の頂点は通れたけど、出発点に戻れない…。それはハミルトン<b>道</b>。始点を変えてみよう', 'ng')
      }
    } else vd.set('いいね、その調子。「戻れなくなる」頂点を残さないのがコツ', 'mid')
  }
  g.on('nodeclick', async (v) => {
    if (busy) return
    if (!used.length) { cur = v; used = [v]; paint(); vd.set('つながっている頂点をタップして進もう', 'mid'); return }
    if (used.length >= ids().length) { toast('もう全部まわったよ。やり直してね'); return }
    if (used.includes(v)) { toast('その頂点はもう通ったよ'); return }
    if (!g.adj().get(cur).has(v)) { toast('いまいる頂点と辺でつながっていないよ'); return }
    busy = true; await stepTo(v); busy = false
  })
  async function auto() {
    if (busy) return
    const H = hamiltonCycle(ids(), g.edgeList())
    if (!H) {
      const P = hamiltonPath(ids(), g.edgeList())
      vd.set(P ? 'このグラフにはハミルトン閉路が<b>存在しない</b>（ハミルトン道はある）' : 'このグラフにはハミルトン<b>道すら</b>存在しない', 'ng')
      toast('閉路はない、と確定しました（全探索）'); return
    }
    busy = true; restart(); used = []; cyc = null
    cur = H[0]; used = [H[0]]; paint()
    for (let i = 1; i < H.length; i++) {
      if (i === H.length - 1) { g.edgeClass(H[i - 1], H[0], 'hi2'); g.pulse(H[0], PAL.mint); break }
      await stepTo(H[i])
    }
    vd.set('おまかせで発見（バックトラック）。ハミルトン閉路が見つかった！', 'ok'); confetti()
    busy = false
  }
  const sg = seg(Object.values(G7).map((x) => x.label), (i) => {
    if (busy) return
    name = Object.keys(G7)[i]
    g.load({ nodes: toNodes(G().pos, Object.fromEntries(Object.keys(G().pos).map((id) => [id, { label: G().labels?.[id] ?? id }]))), edges: G().E })
    restart()
  })
  f.ctrl.append(sg,
    h('button.btn.sm.aq', { onclick: auto }, '🪄 おまかせ'),
    h('button.btn.sm', { onclick: () => { if (!busy) restart() } }, '↺ やり直し'))
  load(g, G())
  restart()
  return f.el
}

// =========================================================
//  LAB 7-2 : necessary condition  c(G - S) <= |S|
// =========================================================
export function labNecessary() {
  const f = labFrame({
    title: '必要条件チェッカー：S を抜いたら、何個に分かれる？',
    hint: 'ハミルトングラフなら<b>どんな $S$ を抜いても $c(G-S)\\le|S|$</b>（定理 7.2）。頂点をタップして $S$ を作り、$c(G-S)$ と $|S|$ を比べよう。「反例をさがす」で全 $S$ を調べます。<b>ペテルセンで反例が出ないのに閉路も無い</b>のが今日いちばん大事なポイント。',
    color: 'sky', no: '7-2',
  })
  const g = new GraphView(f.canvas, { w: 600, h: 380, r: 16 })
  const rs = readout('S（抜いた頂点）'), rc = readout('c(G − S) と |S|'), rr = readout('残った成分'), vd = verdict('', 'mid')
  f.side.append(rs, rc, rr, vd)
  let name = 'k24', S = new Set(), busy = false
  const G = () => G7[name]
  const ids = () => g.ids()
  const lab = (v) => G().labels?.[v] ?? v

  function compsOf(rem) {
    const rem2 = new Set(rem), adj = g.adj(), seen = new Set(), out = []
    for (const v of ids()) {
      if (rem2.has(v) || seen.has(v)) continue
      const comp = []; const st = [v]; seen.add(v)
      while (st.length) { const u = st.pop(); comp.push(u); for (const w of adj.get(u)) if (!rem2.has(w) && !seen.has(w)) { seen.add(w); st.push(w) } }
      out.push(comp)
    }
    return out
  }
  function paint() {
    g.reset()
    const comps = compsOf(S)
    const cols = ['mint', 'sky', 'lav', 'peach']
    ids().forEach((v) => { g.color(v, 'white'); g.tag(v, null) })
    ids().forEach((v) => { if (S.has(v)) { g.color(v, 'pink'); g.nodeClass(v, 'dim'); g.tag(v, '×', 'pink') } })
    comps.forEach((c, i) => { if (comps.length > 1) c.forEach((v) => g.color(v, cols[i % 4])) })
    rs.set(S.size ? [...S].map(lab).join('、') : '（なし）')
    const c = comps.length
    rc.set(`c(G−S) = ${c}　／　|S| = ${S.size}`)
    rr.set(c > 1 ? comps.map((x) => `{${x.map(lab).join(',')}}`).join('　') : '連結のまま（1 個）')
    if (c > S.size) vd.set(`$c(G-S)=${c}>|S|=${S.size}$ → 定理 7.2 より<b>ハミルトングラフでない</b>！`, 'ng')
    else if (!S.size) {
      const H = hamiltonCycle(ids(), g.edgeList())
      vd.set(H ? `${G().label} はハミルトングラフ。まず $S$ を作ってみよう` : `${G().label} はハミルトングラフで<b>ない</b>のに、$c(G-S)\\le|S|$ は満たされる。必要条件でしかない！`, H ? 'mid' : 'ng')
    } else vd.set(`$c(G-S)\\le|S|$ を満たしている（反例にはならない）`, 'mid')
  }
  function tgl(v) { if (busy) return; S.has(v) ? S.delete(v) : S.add(v); paint() }
  g.on('nodeclick', tgl)
  async function search() {
    if (busy) return; busy = true
    const V = ids(), n = V.length
    let best = { d: 0, S: [] }
    for (let mask = 1; mask < (1 << n); mask++) {
      const s = V.filter((_, i) => mask & (1 << i))
      const d = ncomp(V, g.edgeList(), s) - s.length
      if (d > best.d) best = { d, S: s }
    }
    if (best.d > 0) {
      S = new Set(best.S); paint()
      V.filter((v) => S.has(v)).forEach((v, i) => setTimeout(() => g.pulse(v, PAL.pink), i * 120))
      vd.set(`反例が見つかった：$S=\\{${[...S].map(lab).join(',')}\\}$ で $c(G-S)=${compsOf(S).length}>${S.size}$ → ハミルトングラフでない`, 'ng')
    } else {
      S = new Set(); paint()
      const H = hamiltonCycle(V, g.edgeList())
      vd.set(H ? `どの $S$ でも $c(G-S)\\le|S|$（必要条件はクリア）。そして実際に閉路がある` : `どの $S$ でも $c(G-S)\\le|S|$ なのに、<b>閉路は存在しない</b> → 必要条件は十分条件ではない`, H ? 'ok' : 'ng')
      toast(H ? '必要条件オールクリア（閉路あり）' : '反例なし。でも閉路もなし！')
    }
    busy = false
  }
  const sg = seg(['K₂,₄', '3×3 格子', 'ペテルセン', '3×4 格子'], (i) => {
    if (busy) return
    name = ['k24', 'grid33', 'petersen', 'grid34'][i]
    S = new Set()
    const GG = G()
    g.load({ nodes: toNodes(GG.pos, Object.fromEntries(Object.keys(GG.pos).map((id) => [id, { label: GG.labels?.[id] ?? id }]))), edges: GG.E })
    paint()
  })
  f.ctrl.append(sg,
    h('button.btn.sm.sk', { onclick: search }, '🔍 反例をさがす（全 S）'),
    h('button.btn.sm', { onclick: () => { if (!busy) { S = new Set(); paint() } } }, 'リセット'))
  load(g, { ...G(), pos: G().pos })
  paint()
  return f.el
}

// =========================================================
//  LAB 7-3 : Ore / Dirac and the Bondy-Chvatal closure
// =========================================================
export function labClosure() {
  const f = labFrame({
    title: '閉包ラボ：辺を足しまくると、ハミルトン性が見えてくる',
    hint: '$\\deg x+\\deg y\\ge n$ である非隣接の 2 頂点 $x,y$ に辺を足す、をくり返してできるグラフが<b>閉包</b> $\\mathrm{cl}(G)$。定理：$G$ がハミルトングラフ ⟺ $\\mathrm{cl}(G)$ がハミルトングラフ。$\\mathrm{cl}(G)=K_n$ なら一発で判定できます。',
    color: 'aqua', no: '7-3',
  })
  const D = {
    hex: () => ({ pos: G7.hex.pos, E: G7.hex.E.map((e) => e.slice()), labels: G7.hex.labels }),
    k24: () => ({ pos: G7.k24.pos, E: G7.k24.E.map((e) => e.slice()) }),
  }
  const g = new GraphView(f.canvas, { w: 600, h: 380, r: 16 })
  const rd = readout('いまの次数'), ro = readout('Ore・Dirac 判定'), rl = readout('足した辺'), vd = verdict('', 'mid')
  f.side.append(rd, ro, vd, rl)
  let name = 'hex', E = [], step = 0, busy = false
  const ids = () => g.ids()
  const lab = (v) => (name === 'hex' ? v : v)

  function base() {
    const { pos, E: E0, labels } = D[name]()
    E = E0.map((e) => e.slice())
    g.load({ nodes: toNodes(pos, Object.fromEntries(Object.keys(pos).map((id) => [id, { label: labels?.[id] ?? id }]))), edges: E })
    step = 0
    recompute()
  }
  function recompute() {
    const V = ids(), n = V.length, dg = degMap(V, E), adj = adjMap(V, E)
    g.reset(); ids().forEach((v) => { g.color(v, 'white'); g.tag(v, dg[v], dg[v] >= n / 2 ? 'mint' : null) })
    rd.set(V.map((v) => `${lab(v)}:${dg[v]}`).join('　'))
    let mn = 99, mp = null
    for (let i = 0; i < V.length; i++) for (let j = i + 1; j < V.length; j++) {
      const a = V[i], b = V[j]
      if (adj.get(a).has(b)) continue
      if (dg[a] + dg[b] < mn) { mn = dg[a] + dg[b]; mp = [a, b] }
    }
    const delta = Math.min(...V.map((v) => dg[v]))
    ro.set(`δ = ${delta}${delta >= n / 2 ? ' ≥' : ' <'} n/2 = ${n / 2}${delta >= n / 2 ? '（Dirac 適用！）' : '（Dirac は使えない）'}<br>` +
      (mp ? `非隣接の最小次数和 ${dg[mp[0]]}+${dg[mp[1]]} = ${mn}${mn >= n ? ' ≥' : ' <'} n = ${n}` : `隣接しない 2 頂点がない（= $K_n$）`))
    const complete = E.length === n * (n - 1) / 2
    if (complete) vd.set('$\\mathrm{cl}(G)=K_n$ → <b>ハミルトングラフ</b>（定理 7.6）', 'ok')
    else vd.set(`${E.length} / ${n * (n - 1) / 2} 本。まだ辺を足せるか調べよう`, 'mid')
    rl.set(step ? `${step} 本 足した` : '—')
    return { complete }
  }
  async function next() {
    if (busy) return; busy = true
    try {
      const V = ids(), n = V.length, dg = degMap(V, E), adj = adjMap(V, E)
      let pick = null, bestSum = -1
      for (let i = 0; i < V.length; i++) for (let j = i + 1; j < V.length; j++) {
        const a = V[i], b = V[j]
        if (adj.get(a).has(b)) continue
        if (dg[a] + dg[b] >= n && dg[a] + dg[b] > bestSum) { bestSum = dg[a] + dg[b]; pick = [a, b] }
      }
      if (!pick) {
        const complete = E.length === n * (n - 1) / 2
        vd.set(complete ? '$\\mathrm{cl}(G)=K_n$ → ハミルトングラフ' : 'これ以上辺を足せない（閉包が完成）。$\\mathrm{cl}(G)\\ne K_n$ なので、<b>この方法では判定できない</b>', complete ? 'ok' : 'ng')
        recompute(); return
      }
      const [a, b] = pick
      g.pulse(a, PAL.aqua); g.pulse(b, PAL.aqua)
      vd.set(`${lab(a)} と ${lab(b)} は非隣接で $\\deg=${dg[a]},\\ ${dg[b]}$。和 ${dg[a] + dg[b]} ≥ n = ${n} → <b>辺を足せる</b>`, 'mid')
      await sleep(420)
      E.push([a, b]); step++
      g.addEdge(a, b)
      g.edgeClass(a, b, 'hi')
      setTimeout(() => g.edgeClass(a, b, 'hi', false), 900)
      recompute()
      g.edgeClass(a, b, 'hi')
    } finally { busy = false }
  }
  async function all() { if (busy) return; for (let i = 0; i < 20; i++) { const before = E.length; await next(); await sleep(260); if (E.length === before) break } }
  const sg = seg(['C₆＋弦', 'K₂,₄'], (i) => { if (busy) return; name = ['hex', 'k24'][i]; base() })
  f.ctrl.append(sg,
    h('button.btn.sm.aq', { onclick: next }, '▶ つぎへ（辺を 1 本足す）'),
    h('button.btn.sm.lm', { onclick: all }, '⏩ 最後まで'),
    h('button.btn.sm', { onclick: () => { if (!busy) base() } }, 'リセット'))
  base()
  return f.el
}

// =========================================================
//  LAB 7-4 : TSP — nearest neighbour + 2-opt
// =========================================================
const CITIES = { A: [78, 82], B: [238, 52], C: [420, 66], D: [524, 178], E: [452, 306], F: [284, 342], G: [110, 296], H: [196, 186], I: [372, 196] }
const CIDS = Object.keys(CITIES)
const dist = (a, b) => Math.hypot(CITIES[a][0] - CITIES[b][0], CITIES[a][1] - CITIES[b][1])
const tourLen = (t) => t.reduce((s, v, i) => s + dist(v, t[(i + 1) % t.length]), 0)
function exactTsp(ids) {
  const n = ids.length, FULL = 1 << n, INF = 1e9
  const d = ids.map((a) => ids.map((b) => dist(a, b)))
  const dp = Array.from({ length: FULL }, () => new Array(n).fill(INF))
  dp[1][0] = 0
  for (let mask = 1; mask < FULL; mask++) for (let u = 0; u < n; u++) {
    if (!(mask & (1 << u)) || dp[mask][u] >= INF) continue
    for (let v = 0; v < n; v++) {
      if (mask & (1 << v)) continue
      const nm = mask | (1 << v), nd = dp[mask][u] + d[u][v]
      if (nd < dp[nm][v]) dp[nm][v] = nd
    }
  }
  let best = INF
  for (let u = 1; u < n; u++) best = Math.min(best, dp[FULL - 1][u] + d[u][0])
  return best
}
const EXACT = exactTsp(CIDS)

export function labTsp() {
  const f = labFrame({
    title: '巡回セールスマン問題：ハミルトン閉路のうち、いちばん短いもの',
    hint: '都市を全部 1 回ずつ訪れて戻る最短ツアー＝<b>最小のハミルトン閉路</b>。厳密に解くのは難しい（NP 困難）ので、実務では<b>最近傍法</b>で作り、<b>2-opt</b>（辺を交差させない）で削っていきます。最後に「本当の最短」と比べてみよう。',
    color: 'lemon', no: '7-4',
  })
  const g = new GraphView(f.canvas, { w: 600, h: 380, r: 15 })
  const rn = readout('最近傍法の長さ'), r2 = readout('2-opt の長さ'), rb = readout('理論値（全探索）'), vd = verdict('', 'mid')
  f.side.append(rn, r2, rb, vd)
  g.load({ nodes: toNodes(CITIES, Object.fromEntries(CIDS.map((id) => [id, { label: id }]))), edges: CIDS.flatMap((a, i) => CIDS.slice(i + 1).map((b) => [a, b])) })
  CIDS.flatMap((a, i) => CIDS.slice(i + 1).map((b) => [a, b])).forEach(([a, b]) => g.edgeClass(a, b, 'dim'))
  let tour = null, busy = false

  function show(t, col = 'hi4') {
    CIDS.flatMap((a, i) => CIDS.slice(i + 1).map((b) => [a, b])).forEach(([a, b]) => g.edgeClass(a, b, 'dim', true))
    g.clearTags(); g.colorAll('white')
    t.forEach((v, i) => { g.tag(v, i + 1, 'lemon'); g.color(v, 'lemon') })
    for (let i = 0; i < t.length; i++) { g.edgeClass(t[i], t[(i + 1) % t.length], 'dim', false); g.edgeClass(t[i], t[(i + 1) % t.length], col) }
  }
  async function trace(t, col) {
    show(t, col)
    for (let i = 0; i < t.length; i++) await g.travel(t[i], t[(i + 1) % t.length], PAL.pink, 150)
  }
  function nn() {
    const left = new Set(CIDS), t = [CIDS[0]]
    left.delete(CIDS[0])
    while (left.size) {
      const cur = t[t.length - 1]
      let best = null
      for (const v of left) if (!best || dist(cur, v) < dist(cur, best)) best = v
      t.push(best); left.delete(best)
    }
    return t
  }
  async function runNN() {
    if (busy) return; busy = true
    tour = nn(); await trace(tour, 'hi4')
    rn.set(`${tourLen(tour).toFixed(1)}`); rb.set(`${EXACT.toFixed(1)}`)
    vd.set(`最近傍法で ${tourLen(tour).toFixed(1)}。次に 2-opt で改善してみよう`, 'mid')
    busy = false
  }
  async function twoOpt() {
    if (busy) return
    if (!tour) { await runNN(); if (!tour) return }
    busy = true
    let improved = true, round = 0
    while (improved && round < 60) {
      improved = false
      for (let i = 0; i < tour.length - 1 && !improved; i++) {
        for (let j = i + 2; j < tour.length - (i === 0 ? 1 : 0); j++) {
          const a = tour[i], b = tour[i + 1], c = tour[j], d = tour[(j + 1) % tour.length]
          if (a === c || b === d) continue
          const gain = dist(a, b) + dist(c, d) - (dist(a, c) + dist(b, d))
          if (gain > 1e-6) {
            // reverse the segment between i+1 .. j
            const seg = tour.slice(i + 1, j + 1).reverse()
            tour = [...tour.slice(0, i + 1), ...seg, ...tour.slice(j + 1)]
            improved = true; round++
            g.edgeClass(a, b, 'hi4', false); g.edgeClass(c, d, 'hi4', false)
            show(tour, 'hi4')
            g.pulse(a, PAL.mint); g.pulse(c, PAL.mint)
            r2.set(`${tourLen(tour).toFixed(1)}（改善 ${round} 回）`)
            vd.set(`交差している 2 辺を組み替えて短くした（−${gain.toFixed(1)}）。2-opt はこれをくり返すだけ`, 'ok')
            await sleep(420)
            break
          }
        }
      }
    }
    show(tour, 'hi2')
    r2.set(`${tourLen(tour).toFixed(1)}（改善 ${round} 回）`)
    const gap = tourLen(tour) - EXACT
    vd.set(gap < 1e-6 ? '🎉 これが本当の最短ツアー！（全探索と一致）' : `2-opt の結果は ${tourLen(tour).toFixed(1)}。最適値 ${EXACT.toFixed(1)} まであと ${gap.toFixed(1)}`, gap < 1e-6 ? 'ok' : 'mid')
    if (gap < 1e-6) confetti()
    busy = false
  }
  async function optimum() {
    if (busy) return; busy = true
    // exact tour by DP reconstruction (small n)
    const n = CIDS.length, FULL = 1 << n, INF = 1e9
    const d = CIDS.map((a) => CIDS.map((b) => dist(a, b)))
    const dp = Array.from({ length: FULL }, () => new Array(n).fill(INF)), par = Array.from({ length: FULL }, () => new Array(n).fill(-1))
    dp[1][0] = 0
    for (let mask = 1; mask < FULL; mask++) for (let u = 0; u < n; u++) {
      if (!(mask & (1 << u)) || dp[mask][u] >= INF) continue
      for (let v = 0; v < n; v++) {
        if (mask & (1 << v)) continue
        const nm = mask | (1 << v), nd = dp[mask][u] + d[u][v]
        if (nd < dp[nm][v]) { dp[nm][v] = nd; par[nm][v] = u }
      }
    }
    let end = 1, best = INF
    for (let u = 1; u < n; u++) if (dp[FULL - 1][u] + d[u][0] < best) { best = dp[FULL - 1][u] + d[u][0]; end = u }
    const path = []
    let mask = FULL - 1, u = end
    while (u !== -1) { path.push(CIDS[u]); const p = par[mask][u]; mask ^= (1 << u); u = p }
    path.reverse()
    tour = path
    await trace(tour, 'hi2')
    rb.set(`${EXACT.toFixed(1)}`); r2.set(`${tourLen(tour).toFixed(1)}（最適）`)
    vd.set('全探索（Held-Karp）で出した真の最短ツアー。最近傍法がいかに “ほぼ正解” かを見てみよう', 'ok'); confetti()
    busy = false
  }
  f.ctrl.append(h('button.btn.sm.lm', { onclick: runNN }, '🚚 最近傍法で巡る'),
    h('button.btn.sm.mt', { onclick: twoOpt }, '🔧 2-opt で改善'),
    h('button.btn.sm.pk', { onclick: optimum }, '💡 真の最短を見る'),
    h('button.btn.sm', { onclick: () => { if (!busy) { tour = null; show(CIDS.map((v) => v), 'hi4'); CIDS.forEach((v) => g.edgeClass(v, CIDS[(CIDS.indexOf(v) + 1) % CIDS.length], 'hi4', false)); rn.set('—'); r2.set('—'); vd.set('ボタンを押してね', 'mid') } } }, 'リセット'))
  rb.set(`${EXACT.toFixed(1)}（全探索）`)
  show(CIDS, 'hi4')
  CIDS.forEach((v, i) => g.edgeClass(v, CIDS[(i + 1) % CIDS.length], 'hi4', false))
    vd.set('ボタンを押してね', 'mid')
  return f.el
}

// =========================================================
//  REPORT ① LABS : (1) degree seq, (2) K_{3,5}+2 edges, (3) 4 odd vertices
// =========================================================
export function labRep1DegSeq() {
  const f = labFrame({
    title: 'レポート① (1) ラボ：次数列 (3,3,2,2,2,2) の非同型な 2 グラフ',
    hint: '同じ次数列 $(3,3,2,2,2,2)$ をもつ 4 通りの単純グラフすべてを確認できます。レポートでは一番見分けやすい <b>$G_1$（三角形あり）</b> と <b>$G_2$（2 部グラフ＝奇閉路なし）</b> のペアがおすすめ！',
    color: 'aqua', no: 'R1-1',
  })
  const g1 = new GraphView(f.canvas, { w: 600, h: 350, r: 17 })
  const rDeg = readout('次数列'), rInv = readout('同型で保たれる性質（不変量）'), vd = verdict('', 'ok')
  f.side.append(rDeg, rInv, vd)
  const CASES = [
    {
      name: '推奨ペア G₁ vs G₂（三角形 vs 2部グラフ）',
      pos: {
        u1: [70, 85], u2: [185, 85], u3: [128, 175], u4: [70, 265], u5: [185, 265], u6: [128, 315],
        v1: [390, 75], v3: [390, 175], v5: [390, 275], v2: [520, 75], v4: [520, 175], v6: [520, 275],
      },
      E: [
        ['u1', 'u2'], ['u1', 'u3'], ['u2', 'u3'], ['u1', 'u4'], ['u2', 'u5'], ['u4', 'u6'], ['u5', 'u6'],
        ['v1', 'v2'], ['v1', 'v4'], ['v1', 'v6'], ['v2', 'v3'], ['v2', 'v5'], ['v3', 'v4'], ['v5', 'v6'],
      ],
      col: {
        u1: 'pink', u2: 'pink', u3: 'lemon', u4: 'white', u5: 'white', u6: 'white',
        v1: 'mint', v3: 'mint', v5: 'mint', v2: 'sky', v4: 'sky', v6: 'sky',
      },
      hi: [['u1', 'u2'], ['u2', 'u3'], ['u3', 'u1']],
      inv: '左 $G_1$：長さ 3 の閉路 $u_1u_2u_3u_1$ を含む（非 2 部）<br>右 $G_2$：2 部グラフ（部集合 $\{v_1,v_3,v_5\},\{v_2,v_4,v_6\}$）なので長さ 3 の閉路を含まない',
      msg: '同型なら長さ 3 の閉路の有無も一致するはずなので、<b>$G_1\\not\\simeq G_2$</b>！',
    },
    {
      name: '別解ペア G₁ vs G₄（次数 3 同士の隣接）',
      pos: {
        u1: [70, 85], u2: [185, 85], u3: [128, 175], u4: [70, 265], u5: [185, 265], u6: [128, 315],
        w1: [370, 175], w2: [455, 75], w3: [455, 145], w4: [455, 215], w6: [455, 285], w5: [540, 175],
      },
      E: [
        ['u1', 'u2'], ['u1', 'u3'], ['u2', 'u3'], ['u1', 'u4'], ['u2', 'u5'], ['u4', 'u6'], ['u5', 'u6'],
        ['w1', 'w2'], ['w1', 'w3'], ['w1', 'w4'], ['w5', 'w2'], ['w5', 'w3'], ['w5', 'w6'], ['w4', 'w6'],
      ],
      col: {
        u1: 'pink', u2: 'pink', u3: 'white', u4: 'white', u5: 'white', u6: 'white',
        w1: 'pink', w5: 'pink', w2: 'white', w3: 'white', w4: 'white', w6: 'white',
      },
      hi: [['u1', 'u2']],
      inv: '左 $G_1$：次数 3 の 2 頂点 $u_1,u_2$ が<b>隣接する</b>（$u_1u_2\\in E$）<br>右 $G_4$：次数 3 の 2 頂点 $w_1,w_5$ が<b>隣接しない</b>（$w_1w_5\\notin E$）',
      msg: '同型写像は次数を保つので、次数 3 の 2 頂点が隣接するかどうかも保たれる → <b>$G_1\\not\\simeq G_4$</b>！',
    },
  ]
  let idx = 0
  function show(i) {
    idx = i
    const C = CASES[i]
    const ids = Object.keys(C.pos)
    g1.load({ nodes: toNodes(C.pos, Object.fromEntries(ids.map((id) => [id, { label: id, color: C.col[id] || 'white' }]))), edges: C.E })
    const deg = degMap(ids, C.E)
    ids.forEach((id) => g1.tag(id, deg[id], deg[id] === 3 ? 'pink' : 'lemon'))
    C.hi.forEach(([a, b]) => g1.edgeClass(a, b, 'hi'))
    rDeg.set('左：(3, 3, 2, 2, 2, 2)　／　右：(3, 3, 2, 2, 2, 2)')
    rInv.set(C.inv)
    vd.set(C.msg, 'ok')
  }
  const sg = seg(['推奨：三角形 vs 2部', '別解：次数3の隣接'], (i) => show(i))
  f.ctrl.append(sg)
  show(0)
  return f.el
}

export function labRep1K35() {
  const f = labFrame({
    title: 'レポート① (2) ラボ：K₃,₅ に 2 辺を足して κ(H) < α(H) かつハミルトン',
    hint: '完全 2 部グラフ $K_{3,5}$（左 $X=\\{x_1,x_2,x_3\\}$、右 $Y=\\{y_1,\\dots,y_5\\}$）に 2 本の辺を足す全 4 パターンを比較！ 条件をすべて満たすのは <b>$Y$ 側で 1 頂点を共有する 2 辺（例：$y_1y_2, y_1y_3$）</b> だけです。',
    color: 'mint', no: 'R1-2',
  })
  const g = new GraphView(f.canvas, { w: 600, h: 370, r: 17 })
  const rKA = readout('連結度 κ(H) と 安定数 α(H)'), rHC = readout('ハミルトン閉路'), vd = verdict('', 'mid')
  f.side.append(rKA, rHC, vd)
  const X = ['x1', 'x2', 'x3'], Y = ['y1', 'y2', 'y3', 'y4', 'y5']
  const pos = {
    x1: [145, 95], x2: [145, 190], x3: [145, 285],
    y1: [430, 48], y2: [455, 118], y3: [430, 190], y4: [455, 260], y5: [430, 330],
  }
  const baseE = []
  X.forEach((x) => Y.forEach((y) => baseE.push([x, y])))
  const PATS = [
    { name: '正解：y₁y₂ + y₁y₃', add: [['y1', 'y2'], ['y1', 'y3']], kap: 3, alp: 4, indep: ['y2', 'y3', 'y4', 'y5'], cut: ['x1', 'x2', 'x3'], hc: ['x1', 'y2', 'y1', 'y3', 'x2', 'y4', 'x3', 'y5'] },
    { name: '失敗A：y₁y₂ + y₃y₄', add: [['y1', 'y2'], ['y3', 'y4']], kap: 3, alp: 3, indep: ['x1', 'x2', 'x3'], cut: ['x1', 'x2', 'x3'], hc: ['x1', 'y1', 'y2', 'x2', 'y3', 'y4', 'x3', 'y5'] },
    { name: '失敗B：x₁x₂ + y₁y₂', add: [['x1', 'x2'], ['y1', 'y2']], kap: 3, alp: 4, indep: ['y1', 'y3', 'y4', 'y5'], cut: ['x1', 'x2', 'x3'], hc: null },
    { name: '失敗C：x₁x₂ + x₁x₃', add: [['x1', 'x2'], ['x1', 'x3']], kap: 3, alp: 5, indep: ['y1', 'y2', 'y3', 'y4', 'y5'], cut: ['x1', 'x2', 'x3'], hc: null },
  ]
  let cur = 0, busy = false
  function draw(i, mode = 'base') {
    cur = i
    const P = PATS[i], E = [...baseE, ...P.add]
    g.load({
      nodes: toNodes(pos, Object.fromEntries([...X.map((x) => [x, { label: x, color: 'sky' }]), ...Y.map((y) => [y, { label: y, color: 'lemon' }])])),
      edges: E,
    })
    P.add.forEach(([a, b]) => g.edgeClass(a, b, 'hi'))
    if (mode === 'indep') {
      P.indep.forEach((v) => { g.color(v, 'mint'); g.tag(v, '独立', 'mint') })
    } else if (mode === 'cut') {
      P.cut.forEach((v) => { g.color(v, 'pink'); g.nodeClass(v, 'dim'); g.tag(v, '×', 'pink') })
    }
    const okKA = P.kap < P.alp, okHC = !!P.hc
    rKA.set(`κ(H) = <b>${P.kap}</b>　${okKA ? '<' : '='}　α(H) = <b>${P.alp}</b>`)
    rHC.set(okHC ? P.hc.concat([P.hc[0]]).join(' → ') : '存在しない（c(H−X) = 4 > 3 = |X|）')
    if (okKA && okHC) vd.set('<b>条件クリア！</b> $\\kappa(H)=3<4=\\alpha(H)$ かつハミルトン閉路をもつ唯一の同型類です', 'ok')
    else if (!okKA) vd.set('$\\alpha(H)=3$ に下がってしまい、$\\kappa(H)<\\alpha(H)$ を満たさない', 'ng')
    else vd.set('$X$ を抜くと $Y$ 側が 4 成分以上に分かれ、定理 7.1（$c(H-X)\\le|X|$）より非ハミルトン', 'ng')
  }
  async function traceHC() {
    if (busy) return
    const P = PATS[cur]
    if (!P.hc) { toast('このパターンにはハミルトン閉路がありません'); return }
    busy = true
    draw(cur)
    for (let k = 0; k < P.hc.length; k++) {
      const a = P.hc[k], b = P.hc[(k + 1) % P.hc.length]
      await g.travel(a, b, PAL.mint, 230)
      g.edgeClass(a, b, 'hi2'); g.tag(a, k + 1, 'mint')
    }
    confetti(); busy = false
  }
  const sg = seg(PATS.map((p) => p.name), (i) => { if (!busy) draw(i) })
  f.ctrl.append(sg,
    h('button.btn.sm.mt', { onclick: traceHC }, '▶ ハミルトン閉路をたどる'),
    h('button.btn.sm.lm', { onclick: () => { if (!busy) draw(cur, 'indep') } }, '最大安定集合 S（α=4）'),
    h('button.btn.sm.pk', { onclick: () => { if (!busy) draw(cur, 'cut') } }, '最小頂点切断 X（κ=3）'),
    h('button.btn.sm', { onclick: () => { if (!busy) draw(cur) } }, 'リセット'))
  draw(0)
  return f.el
}

export function labRep1EulerCounter() {
  const f = labFrame({
    title: 'レポート① (3) ラボ：奇点 4 個から道 P の辺を引いても準オイラーとは限らない！',
    hint: 'わな：「$x$-$y$ 道 $P$ の辺を引けば奇点が 4 個 → 2 個に減るから系 6.1.1 で準オイラー周遊がある！」と思いがちですが、<b>系 6.1.1 は「連結な」多重グラフの定理</b>です。橋 $xy$ を $P$ に選ぶと $G-E(P)$ が 2 つの辺つき成分に分断されます！',
    color: 'lemon', no: 'R1-3',
  })
  const g = new GraphView(f.canvas, { w: 600, h: 340, r: 18 })
  const rOdd = readout('奇点の集合'), rComp = readout('G − E(P) の連結成分'), vd = verdict('', 'mid')
  f.side.append(rOdd, rComp, vd)
  const pos = { u: [110, 95], v: [110, 245], x: [235, 170], y: [375, 170], z: [495, 95], w: [495, 245] }
  const allE = [['u', 'v'], ['u', 'x'], ['v', 'x'], ['x', 'y'], ['y', 'z'], ['y', 'w']]
  let removed = false
  function renderState() {
    const E = removed ? allE.filter(([a, b]) => !(a === 'x' && b === 'y')) : allE
    const deg = degMap(Object.keys(pos), E)
    const odds = Object.keys(pos).filter((k) => deg[k] % 2 === 1)
    g.load({
      nodes: toNodes(pos, Object.fromEntries(Object.keys(pos).map((k) => [k, {
        label: k,
        color: removed ? (['u', 'v', 'x'].includes(k) ? 'sky' : 'peach') : (deg[k] % 2 ? 'pink' : 'mint'),
      }]))),
      edges: E,
    })
    Object.keys(pos).forEach((k) => g.tag(k, `d=${deg[k]}`, deg[k] % 2 ? 'pink' : 'mint'))
    if (!removed) {
      g.edgeClass('x', 'y', 'hi')
      rOdd.set(`G の奇点：<b>{ ${odds.join(', ')} }</b>（4 個）`)
      rComp.set('連結（1 成分）。赤い辺 P = xy（奇点 x, y を結ぶ長さ 1 の道）に注目！')
      vd.set('「道 P = xy の辺を除去する」ボタンを押してみよう', 'mid')
    } else {
      rOdd.set(`G − E(P) の奇点：<b>{ ${odds.join(', ')} }</b>（たしかに 2 個に減った！）`)
      rComp.set('成分 C₁ = {u, v, x}（辺 3 本）と 成分 C₂ = {y, z, w}（辺 2 本）に<b>分断</b>！')
      vd.set('<b>結論：“言えない”！</b> C₁ の辺と C₂ の辺の間を行き来する歩道が存在しないため、すべての辺を用いる小径（準オイラー周遊）は存在しません', 'ng')
    }
  }
  f.ctrl.append(
    h('button.btn.sm.pk', { onclick: () => { removed = !removed; renderState() } }, '✂️ 道 P = xy の辺を除去 / 戻す'),
    h('button.btn.sm', { onclick: () => { removed = false; renderState() } }, 'リセット'))
  renderState()
  return f.el
}

// =========================================================
//  ANSWER LAB : the report exercise
// =========================================================
const GRID34_CYCLE = ['00', '10', '20', '21', '11', '12', '22', '23', '13', '03', '02', '01']
export function labHamAnswer() {
  const f = labFrame({
    title: '解答ラボ：3×4 格子には閉路がある／3×3 格子にはない',
    hint: '① まず 2 部彩色（市松模様）。$3\\times4$ は 6 対 6、$3\\times3$ は 5 対 4。② $3\\times4$ のハミルトン閉路を描く。③ $3\\times3$ では少ない側を $S$ とすると $c(G-S)>|S|$ になり、定理 7.2 に反する。',
    color: 'mint', no: 'A7',
  })
  const g = new GraphView(f.canvas, { w: 600, h: 380, r: 16 })
  const rb = readout('2 部彩色'), rc = readout('c(G − S) と |S|'), rp = readout('巡回路'), vd = verdict('', 'mid')
  f.side.append(rb, rc, vd, rp)
  let size = '34', busy = false
  const G = () => (size === '34' ? G7.grid34 : G7.grid33)
  function base() {
    const GG = G()
    g.load({ nodes: toNodes(GG.pos, Object.fromEntries(Object.keys(GG.pos).map((id) => [id, { label: GG.labels[id], color: ((+id[0] + +id[1]) % 2 ? 'sky' : 'lemon') }]))), edges: GG.E })
    const V = g.ids(), part = { 0: 0, 1: 0 }
    V.forEach((v) => { part[(+v[0] + +v[1]) % 2]++ })
    rb.set(`<span style="color:var(--sky-d)">□ ${part[1]} 個</span>　<span style="color:var(--lemon-d)">■ ${part[0]} 個</span>${part[1] === part[0] ? '（同数！）' : '（同数でない）'}`)
    rc.set('—'); rp.set('—')
    vd.set(size === '34' ? '2 部グラフで両側 6 個ずつ → 閉路の可能性あり' : '2 部グラフで 5 個と 4 個。同数でないのでハミルトングラフで<b>ない</b>（系 7.2.1）', size === '34' ? 'mid' : 'ng')
  }
  async function cycle() {
    if (busy) return; busy = true
    if (size !== '34') {
      vd.set('$3\\times3$ に閉路はない。③ の反例で確認しよう', 'ng'); busy = false; return
    }
    base(); g.reset()
    const t = GRID34_CYCLE
    for (let i = 0; i < t.length; i++) {
      const a = t[i], b = t[(i + 1) % t.length]
      await g.travel(a, b, PAL.mint, 240)
      g.edgeClass(a, b, 'hi2'); g.tag(a, i + 1, 'mint')
    }
    rp.set([...t, t[0]].map((v) => G().labels[v]).join(' → '))
    vd.set('全 12 頂点を 1 回ずつ通って出発点に戻った → <b>ハミルトン閉路</b>。3×4 はハミルトングラフ', 'ok')
    confetti(); busy = false
  }
  async function counter() {
    if (busy) return; busy = true
    size = '33'
    sg.pick(1)
    base()
    // 市松模様で「少ない方」の部集合（4 個）を S にすると、残り 5 個はすべて孤立する
    const Sset = new Set(g.ids().filter((v) => (+v[0] + +v[1]) % 2 === 1))
    g.reset()
    g.ids().forEach((v) => { if (Sset.has(v)) { g.color(v, 'pink'); g.nodeClass(v, 'dim'); g.tag(v, '×', 'pink') } })
    const adj = g.adj()
    const seen = new Set(), out = []
    for (const v of g.ids()) {
      if (Sset.has(v) || seen.has(v)) continue
      const c = []; const st = [v]; seen.add(v)
      while (st.length) { const u = st.pop(); c.push(u); for (const w of adj.get(u)) if (!Sset.has(w) && !seen.has(w)) { seen.add(w); st.push(w) } }
      out.push(c)
    }
    out.forEach((c, i) => c.forEach((v) => g.color(v, ['mint', 'sky', 'lav', 'peach'][i % 4])))
    rc.set(`c(G−S) = ${out.length}　／　|S| = ${Sset.size}`)
    vd.set(`$c(G-S)=${out.length}>${Sset.size}=|S|$ → 定理 7.2 に反するので <b>3×3 はハミルトングラフでない</b>`, 'ng')
    busy = false
  }
  const sg = seg(['3×4 格子', '3×3 格子'], (i) => { if (busy) return; size = i ? '33' : '34'; base() })
  f.ctrl.append(sg,
    h('button.btn.sm.mt', { onclick: cycle }, '② ハミルトン閉路を描く'),
    h('button.btn.sm.pk', { onclick: counter }, '③ 3×3 で反例を出す'),
    h('button.btn.sm', { onclick: () => { if (!busy) base() } }, 'リセット'))
  base()
  return f.el
}
