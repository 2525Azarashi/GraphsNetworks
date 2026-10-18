// Interactive answer labs for the 演習「やってみよう」problems
import { h, s, sleep, toast } from '../lib/ui.js'
import { GraphView, PAL, circle, toNodes, PCYCLE } from '../lib/graph.js'
import { labFrame, readout, verdict } from '../lib/lab.js'

// ---------- 第1回 演習：ペテルセングラフの同型写像 ----------
// 左：外側 1..5（五角形）、内側 6..10（星）。i と i+5 が結ばれ、内側は i+5 と (i+2)+5。
// 右（スライドの六角形の図）：外周の六角形 u1..u6（上から時計回り）、内部 u7(左上) u8(右上) u9(中央) u10(下)。
export const PET_L = (() => { const E = []; for (let k = 1; k <= 5; k++) E.push([`${k}`, `${(k % 5) + 1}`], [`${k}`, `${k + 5}`], [`${k + 5}`, `${((k + 1) % 5) + 6}`]); return E })()
export const PET_R = [['u1', 'u2'], ['u2', 'u3'], ['u3', 'u4'], ['u4', 'u5'], ['u5', 'u6'], ['u6', 'u1'], ['u6', 'u7'], ['u2', 'u8'], ['u9', 'u7'], ['u9', 'u8'], ['u9', 'u10'], ['u10', 'u4'], ['u1', 'u10'], ['u5', 'u8'], ['u7', 'u3']]
export const PHI = { 1: 'u1', 2: 'u10', 3: 'u4', 4: 'u3', 5: 'u2', 6: 'u6', 7: 'u9', 8: 'u5', 9: 'u7', 10: 'u8' }

export function labPetersenAnswer() {
  const f = labFrame({ title: '解答：同型写像 φ を 1 頂点ずつ当てはめる', hint: '「φ を適用」で、左の頂点 1〜10 が φ で指定された右の位置へ飛んでいきます。移動後の辺が、右の図（六角形の描き方）の辺と <b>15 本すべて一致</b> すれば同型。', color: 'lav', no: 'A1' })
  const W = 600, H = 380
  const posL = { ...circle(['1', '2', '3', '4', '5'], 300, 195, 150), ...circle(['6', '7', '8', '9', '10'], 300, 195, 68) }
  // right drawing (slide layout)
  const RP = { u1: [300, 45], u2: [440, 125], u3: [440, 265], u4: [300, 345], u5: [160, 265], u6: [160, 125], u7: [205, 160], u8: [395, 160], u9: [300, 205], u10: [300, 290] }
  const cols = Object.fromEntries(Object.keys(posL).map((id, i) => [id, { color: PCYCLE[i % 6] }]))
  const g = new GraphView(f.canvas, { w: W, h: H, r: 15, draggable: false })
  const load = () => { g.load({ nodes: toNodes(posL, cols), edges: PET_L }); g.ghost?.remove() }
  load()
  const tbl = h('div.maptbl', Object.entries(PHI).map(([a, b]) => h('span', { 'data-k': a }, `φ(${a})=${b}`)))
  const rc = readout('一致した辺', '0 / 15'), vd = verdict('まだ適用していません', 'mid')
  f.side.append(h('div.ro-k', '同型写像 φ'), tbl, rc, vd)
  let busy = false
  async function apply() {
    if (busy) return; busy = true
    load(); g.reset(); await sleep(300)
    // ghost of right graph
    const gh = s('g', { opacity: .9 })
    PET_R.forEach(([a, b]) => gh.append(s('line', { x1: RP[a][0], y1: RP[a][1], x2: RP[b][0], y2: RP[b][1], stroke: PAL.mint, 'stroke-width': 12, 'stroke-linecap': 'round', opacity: .35 })))
    Object.entries(RP).forEach(([k, [x, y]]) => gh.append(s('text', { x: x + 20, y: y - 14, 'font-family': 'JetBrains Mono', 'font-weight': 700, 'font-size': 12, fill: PAL.ink, opacity: .6 }, k)))
    g.gBack.append(gh); g.ghost = gh
    gh.animate([{ opacity: 0 }, { opacity: .9 }], { duration: 500 })
    const cur = Object.fromEntries(Object.entries(posL).map(([k, v]) => [k, v.slice()]))
    for (const [a, b] of Object.entries(PHI)) {
      tbl.querySelectorAll('span').forEach((sp) => sp.classList.toggle('on', sp.dataset.k === a))
      g.label(a, `${a}→${b}`)
      cur[a] = RP[b]
      await g.morph({ [a]: RP[b] }, 520)
      g.bounce(a)
      // count matched
      let ok = 0
      const inv = Object.fromEntries(Object.entries(PHI).map(([x, y]) => [y, x]))
      const placed = new Set(Object.keys(PHI).slice(0, Object.keys(PHI).indexOf(a) + 1))
      PET_L.forEach(([x, y]) => { if (placed.has(x) && placed.has(y)) { ok++; g.edgeClass(x, y, 'hi2') } })
      rc.set(`${ok} / 15`)
      await sleep(120)
    }
    tbl.querySelectorAll('span').forEach((sp) => sp.classList.add('on'))
    vd.set('15 本すべて一致 ⇒ φ は同型写像、2 つのグラフは同型！', 'ok')
    busy = false
  }
  f.ctrl.append(h('button.btn.sm.lv', { onclick: apply }, '✨ φ を適用'), h('button.btn.sm', { onclick: () => { if (!busy) { load(); g.reset(); tbl.querySelectorAll('span').forEach((x) => x.classList.remove('on')); rc.set('0 / 15'); vd.set('まだ適用していません', 'mid') } } }, 'リセット'))
  return f.el
}

// ---------- 第2回 演習：δ(H) ≥ d(G)/2 の部分グラフ ----------
// スライドの図を番号付け：1(左上) 2(右上) … 時計回り外周 1..10 ＋ 中央 11
export const EX2_POS = { 1: [230, 50], 2: [370, 50], 3: [480, 115], 4: [520, 210], 5: [480, 305], 6: [370, 360], 7: [230, 360], 8: [120, 305], 9: [80, 210], 10: [120, 115], 11: [300, 210] }
// 対応：T1=1, T2=2, UR=3, R=4, LR=5, BR=6, BL=7, LL=8, L=9, UL=10, C=11
export const EX2_E = [[1, 10], [1, 3], [1, 8], [10, 3], [10, 7], [2, 9], [2, 3], [2, 11], [2, 7], [2, 5], [3, 9], [3, 4], [9, 11], [11, 4], [9, 7], [9, 6], [11, 7], [11, 6], [11, 5], [4, 8], [5, 7], [5, 6], [7, 6]].map(([a, b]) => [String(a), String(b)])

export function labPeelAnswer() {
  const f = labFrame({ title: '解答：スライドのグラフ G を実際にむいてみる', hint: '頂点番号は左上を 1 として時計回りに 1〜10、中央を 11 としています。「1 手ずつ」で、次数が $d(G)/2 \\approx 2.09$ 未満（＝次数 2 以下）の頂点を順に除去します。', color: 'peach', no: 'A2' })
  const W = 600, H = 400
  const g = new GraphView(f.canvas, { w: W, h: H, r: 16 })
  const rd = readout('平均次数 d(G)', '2·23 / 11 = 46/11 ≈ 4.18'), rt = readout('しきい値 d(G)/2', '23/11 ≈ 2.09 → 次数 2 以下を除去')
  const log = readout('除去の記録', '—'), vd = verdict('', 'mid')
  f.side.append(rd, rt, log, vd)
  const thr = 23 / 11
  let steps = []
  const load = () => {
    g.load({ nodes: toNodes(Object.fromEntries(Object.entries(EX2_POS).map(([k, v]) => [k, v])), Object.fromEntries(Object.keys(EX2_POS).map((k) => [k, { color: 'white', label: k }]))), edges: EX2_E })
    steps = []; tags(); log.set('—'); vd.set('むく準備OK', 'mid')
  }
  function tags() {
    const adj = g.adj()
    g.ids().forEach((id) => { const d = adj.get(id).size; g.tag(id, d, d < thr ? 'pink' : 'mint') })
    return g.ids().find((id) => adj.get(id).size < thr)
  }
  let busy = false
  async function step(all) {
    if (busy) return; busy = true
    let v
    while ((v = tags())) {
      const d = g.adj().get(v).size
      g.nodeClass(v, 'sel'); g.pulse(v); await sleep(420)
      g.removeNode(v); steps.push(`${v}(次数${d})`); log.set(steps.join(' → '))
      await sleep(300)
      if (!all) break
    }
    if (!tags()) {
      const ids = g.ids(); ids.forEach((id) => g.color(id, 'mint'))
      g.blob(ids, 'rgba(111,214,188,.28)', 34)
      const adj = g.adj(); const dm = Math.min(...ids.map((i) => adj.get(i).size))
      vd.set(`H = G[{${ids.sort((a, b) => a - b).join(',')}}]：δ(H) = ${dm} ≥ 23/11 ✓`, 'ok')
    }
    busy = false
  }
  f.ctrl.append(h('button.btn.sm.pk', { onclick: () => step(false) }, '🔪 1 手ずつ'), h('button.btn.sm.lm', { onclick: () => step(true) }, '⏩ 最後まで'), h('button.btn.sm', { onclick: () => !busy && load() }, 'リセット'))
  load()
  return f.el
}

// ---------- 第3回 演習：定理 3.2 の証明の図解 ----------
export function labThm32Answer() {
  const f = labFrame({ title: '解答の図解：G が非連結なら Ḡ はつながる', hint: '左の島 $A$（ピンク）と、それ以外 $B$（ミント）。$\\overline G$ では <b>A と B の間の辺がすべて</b> 現れます。「経路を見る」で、同じ島の 2 頂点も B（または A）の頂点を経由して長さ 2 でつながる様子を確認できます。', color: 'sky', no: 'A3' })
  const W = 600, H = 360
  const A = ['a1', 'a2', 'a3'], B = ['b1', 'b2', 'b3', 'b4']
  const pos = { a1: [130, 90], a2: [90, 230], a3: [200, 280], b1: [420, 70], b2: [520, 160], b3: [470, 290], b4: [360, 230] }
  const Gedges = [['a1', 'a2'], ['a2', 'a3'], ['b1', 'b2'], ['b2', 'b3'], ['b3', 'b4']]
  const key = (a, b) => [a, b].sort().join('|')
  const gset = new Set(Gedges.map(([a, b]) => key(a, b)))
  const all = []; const ids = [...A, ...B]
  ids.forEach((a, i) => ids.slice(i + 1).forEach((b) => all.push([a, b])))
  const comp = all.filter(([a, b]) => !gset.has(key(a, b)))
  const g = new GraphView(f.canvas, { w: W, h: H, r: 16, nodes: toNodes(pos, Object.fromEntries(ids.map((id) => [id, { color: id[0] === 'a' ? 'pink' : 'mint' }]))), edges: Gedges })
  const vd = verdict('いま表示：G（非連結）', 'ng'), rc = readout('説明', 'G は島 A と島 B に分かれている。')
  f.side.append(vd, rc)
  let mode = 'G'
  async function toComp() {
    if (mode !== 'G') return; mode = 'C'
    for (const [a, b] of Gedges) g.removeEdge(a, b, true)
    g.blob(A, 'rgba(255,143,177,.2)', 30); g.blob(B, 'rgba(111,214,188,.22)', 30)
    for (const [a, b] of comp) { g.addEdge(a, b, true); const cross = a[0] !== b[0]; g.edgeClass(a, b, cross ? 'hi3' : 'hi4'); }
    g.intro()
    vd.set('いま表示：Ḡ（青＝A–B 間の辺はすべて存在、紫＝島の中の辺）', 'ok')
    rc.set('x∈A, y∈B なら xy∉E(G) なので xy∈E(Ḡ)。')
  }
  async function paths() {
    if (mode === 'G') await toComp()
    const demo = [['a1', 'a3', 'b1'], ['b1', 'b3', 'a2'], ['a2', 'b4', 'a1']]
    for (const [x, y, z] of demo.map(([x, y, w]) => [x, w, y])) {
      g.reset(); g.gBack.innerHTML = ''
      ;[x, y, z].forEach((id) => g.nodeClass(id, 'sel'))
      g.edgeClass(x, y, 'hi'); g.edgeClass(y, z, 'hi')
      await g.travel(x, y, PAL.pink, 400); await g.travel(y, z, PAL.pink, 400)
      rc.set(`${x} と ${z} は同じ島 → ${x} - ${y} - ${z}（${y} は反対の島）で長さ 2 の道`)
      await sleep(900)
    }
    g.reset()
    for (const [a, b] of comp) g.edgeClass(a, b, a[0] !== b[0] ? 'hi3' : 'hi4')
    vd.set('どの 2 頂点も Ḡ でつながる ⇒ Ḡ は連結 ∎', 'ok')
  }
  f.ctrl.append(h('button.btn.sm.sk', { onclick: toComp }, '🔄 補グラフへ'), h('button.btn.sm.pk', { onclick: paths }, '👣 経路を見る'),
    h('button.btn.sm', { onclick: () => { mode = 'G'; g.load({ nodes: toNodes(pos, Object.fromEntries(ids.map((id) => [id, { color: id[0] === 'a' ? 'pink' : 'mint' }]))), edges: Gedges }); g.reset(); vd.set('いま表示：G（非連結）', 'ng'); rc.set('G は島 A と島 B に分かれている。') } }, 'リセット'))
  return f.el
}
