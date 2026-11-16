// Labs for Lecture 9 : matchings, alternating / augmenting paths (Berge), bipartite matchings & Hall's marriage theorem
import { h, s, sleep, toast, confetti } from '../lib/ui.js'
import { GraphView, PAL, circle, toNodes, ek } from '../lib/graph.js'
import { labFrame, readout, verdict, seg, sub } from '../lib/lab.js'

const W = 600, H = 380

// ---------- matching algorithms ----------
function endsOf(k) { return k.split('|') }
function vOfM(M) { const s = new Set(); for (const k of M) { const [a, b] = endsOf(k); s.add(a); s.add(b) } return s }
function isMaximal(adj, M) {
  const vm = vOfM(M)
  for (const [u, nb] of adj) if (!vm.has(u)) for (const v of nb) if (!vm.has(v)) return false
  return true
}

// Find an M-augmenting path on a general graph (exact DFS on small graphs; Lecture 9 graphs have n <= 12)
export function findAugPath(adj, M) {
  const vm = vOfM(M)
  const free = [...adj.keys()].filter((v) => !vm.has(v))
  const partner = new Map()
  for (const k of M) { const [a, b] = endsOf(k); partner.set(a, b); partner.set(b, a) }
  for (let i = 0; i < free.length; i++) {
    const start = free[i]
    const stack = [[start, [start], new Set([start])]]
    while (stack.length) {
      const [u, path, vis] = stack.pop()
      for (const v of adj.get(u) || []) {
        if (vis.has(v)) continue
        const k = ek(u, v)
        if (M.has(k)) continue
        if (!vm.has(v) && v !== start) return [...path, v]
        const w = partner.get(v)
        if (w && !vis.has(w)) {
          const nv = new Set(vis); nv.add(v); nv.add(w)
          stack.push([w, [...path, v, w], nv])
        }
      }
    }
  }
  return null
}

export function maxMatching(ids, edges) {
  const adj = new Map(ids.map((id) => [id, new Set()]))
  edges.forEach(([a, b]) => { adj.get(a).add(b); adj.get(b).add(a) })
  const M = new Set()
  for (;;) {
    const P = findAugPath(adj, M)
    if (!P) break
    flipPath(M, P)
  }
  return M
}

export function flipPath(M, P) {
  for (let i = 0; i < P.length - 1; i++) {
    const k = ek(P[i], P[i + 1])
    M.has(k) ? M.delete(k) : M.add(k)
  }
}

function fmtEdge(k) {
  const [a, b] = endsOf(k)
  return sub(a) + sub(b)
}
function fmtM(M) {
  if (!M.size) return '∅（0 本）'
  return `{ ${[...M].map(fmtEdge).join(', ')} }（${M.size} 本）`
}

// =========================================================
// LAB 9-1 : マッチング・極大・最大・完全マッチング（例 9.2 / 例 9.3）
// =========================================================
const P91 = {
  G: {
    name: '例 9.2 / 9.3 の G',
    ids: ['x1', 'x2', 'x3', 'x4', 'x5', 'x6'],
    pos: { x1: [300, 52], x2: [435, 132], x3: [435, 255], x4: [300, 332], x5: [165, 255], x6: [165, 132] },
    E: [['x1', 'x2'], ['x1', 'x3'], ['x1', 'x4'], ['x1', 'x5'], ['x1', 'x6'], ['x2', 'x5'], ['x3', 'x5'], ['x4', 'x5'], ['x5', 'x6']],
    init: [['x1', 'x2'], ['x5', 'x6']],
  },
  H: {
    name: '例 9.3 の H（辺 x₃x₄ を追加）',
    ids: ['x1', 'x2', 'x3', 'x4', 'x5', 'x6'],
    pos: { x1: [300, 52], x2: [435, 132], x3: [435, 255], x4: [300, 332], x5: [165, 255], x6: [165, 132] },
    E: [['x1', 'x2'], ['x1', 'x3'], ['x1', 'x4'], ['x1', 'x5'], ['x1', 'x6'], ['x2', 'x5'], ['x3', 'x4'], ['x3', 'x5'], ['x4', 'x5'], ['x5', 'x6']],
    init: [['x1', 'x2'], ['x3', 'x4'], ['x5', 'x6']],
  },
}

export function labMatchBasic() {
  const f = labFrame({
    title: 'マッチングをつくろう：極大・最大・完全の違い',
    hint: '<b>辺をタップ</b>してマッチング $M$ に入れたり外したりできます（同じ頂点に触れる 2 辺は同時に入れられません）。例 9.3 の「極大だけど最大じゃない $\\{x_1x_5\\}$」もワンタップで試せます。',
    color: 'coral', no: '9-1',
  })
  const gv = new GraphView(f.canvas, { w: W, h: H, r: 18 })
  const rm = readout('いまのマッチング M'), rv = readout('被覆している頂点 V(M)'), ra = readout('マッチング数 α′ と状態'), vd = verdict('', 'mid')
  f.side.append(rm, rv, ra, vd)

  let key = 'G', M = new Set(), alpha = 2

  function load(k, preset) {
    key = k
    const D = P91[k]
    const nodes = toNodes(D.pos, Object.fromEntries(D.ids.map((id) => [id, { label: sub(id) }])))
    gv.load({ nodes, edges: D.E })
    alpha = maxMatching(D.ids, D.E).size
    M = new Set((preset || D.init).map(([a, b]) => ek(a, b)))
    paint()
  }

  function paint() {
    gv.reset()
    const vm = vOfM(M), adj = gv.adj(), n = gv.ids().length
    for (const [k] of gv.edges) if (M.has(k)) { const [a, b] = endsOf(k); gv.edgeClass(a, b, 'hi') }
    gv.ids().forEach((id) => {
      const sat = vm.has(id)
      gv.color(id, sat ? 'pink' : 'white')
      gv.tag(id, sat ? 'M' : null, 'pink')
    })
    rm.set(fmtM(M))
    const vlist = gv.ids().filter((id) => vm.has(id)).map(sub)
    rv.set(vlist.length ? `{ ${vlist.join(', ')} }（${vlist.length} / ${n} 頂点）` : '∅（0 頂点）')
    const maximal = isMaximal(adj, M), maximum = M.size === alpha, perfect = vm.size === n
    const badges = [
      maximal ? '✓ 極大' : '✗ 極大でない',
      maximum ? '✓ 最大' : '✗ 最大でない',
      perfect ? '✓ 完全' : '✗ 完全でない',
    ].join(' ／ ')
    ra.set(`α′(${key}) = ${alpha}　｜　${badges}`)
    if (perfect) vd.set(`🎉 全 ${n} 頂点を被覆 → <b>完全マッチング</b>（もちろん最大・極大でもある！）`, 'ok')
    else if (maximum) vd.set(`|M| = ${M.size} = α′(${key}) → <b>最大マッチング</b>（これ以上本数は増えない。${key === 'G' ? 'G には完全マッチングは存在しない' : ''}）`, 'ok')
    else if (maximal) vd.set(`|M| = ${M.size} ＜ α′(${key}) = ${alpha} だけど、もう 1 本も足せない → <b>極大マッチングだが最大ではない！</b>`, 'mid')
    else vd.set(`まだ余っている頂点同士を結ぶ辺をそのまま足せる → 極大マッチングでもない`, 'mid')
  }

  gv.on('edgeclick', (e) => {
    const k = e.key
    if (M.has(k)) { M.delete(k); paint(); return }
    const vm = vOfM(M)
    const clash = [e.a, e.b].filter((u) => vm.has(u))
    if (clash.length) {
      clash.forEach((u) => gv.pulse(u, PAL.pink))
      toast(`${clash.map(sub).join('・')} はすでに別のペアに入っています！（隣接する辺は選べない）`)
      return
    }
    M.add(k); gv.bounce(e.a); gv.bounce(e.b); paint()
  })

  const sg = seg(['グラフ G（例 9.2/9.3）', 'グラフ H（例 9.3）'], (i) => load(i ? 'H' : 'G'))
  f.ctrl.append(
    sg,
    h('button.btn.sm.lm', { onclick: () => { sg.pick(0); load('G', [['x1', 'x5']]) } }, 'わな：{x₁x₅}（極大≠最大）'),
    h('button.btn.sm.pk', { onclick: () => { M = maxMatching(gv.ids(), gv.edgeList()); paint() } }, '✨ 最大マッチング'),
    h('button.btn.sm', { onclick: () => { M.clear(); paint() } }, '空集合 ∅')
  )
  load('G')
  return f.el
}

// =========================================================
// LAB 9-2 : 交互道・増大道と対称差 M △ E(P)（例 9.4）
// =========================================================
const EX94 = {
  ids: ['x1', 'x2', 'x3', 'x4', 'x5', 'x6', 'x7', 'x8'],
  pos: {
    x1: [245, 48], x2: [355, 48],
    x3: [452, 132], x4: [452, 248],
    x5: [355, 332], x6: [245, 332],
    x7: [148, 248], x8: [148, 132],
  },
  E: [
    ['x1', 'x4'], ['x1', 'x7'],
    ['x2', 'x5'], ['x2', 'x6'],
    ['x3', 'x4'], ['x3', 'x8'],
    ['x4', 'x6'], ['x4', 'x7'],
    ['x5', 'x8'],
    ['x6', 'x8'],
  ],
  M0: [['x4', 'x6'], ['x5', 'x8']],
}

export function labAugment() {
  const f = labFrame({
    title: 'M-交互道と M-増大道：オセロみたいに反転して +1 本！（例 9.4）',
    hint: '頂点を順にタップして道をたどってみよう（赤＝$M$ の辺、黒＝$M$ 外の辺）。<b>未マッチの頂点から始まり、外・中・外…と交互に進んで別の未マッチ頂点で終わる道</b>が <b>$M$-増大道</b>。「対称差 $M\\triangle E(P)$ で増やす！」を押すとペアが反転して 1 組増えます。',
    color: 'lemon', no: '9-2',
  })
  const gv = new GraphView(f.canvas, { w: W, h: H, r: 17 })
  const rm = readout('いまのマッチング M'), rp = readout('選んだ道 P'), vd = verdict('', 'mid')
  f.side.append(rm, rp, vd)

  let M = new Set(), P = [], busy = false

  function init() {
    gv.load({ nodes: toNodes(EX94.pos, Object.fromEntries(EX94.ids.map((id) => [id, { label: sub(id) }]))), edges: EX94.E })
    M = new Set(EX94.M0.map(([a, b]) => ek(a, b)))
    P = []
    paint()
  }

  function checkPath(path) {
    if (path.length < 2) return { alt: true, aug: false }
    const p0 = M.has(ek(path[0], path[1]))
    for (let i = 1; i < path.length - 1; i++) {
      if (M.has(ek(path[i], path[i + 1])) === ((i % 2 === 0) ? p0 : !p0)) continue
      return { alt: false, aug: false }
    }
    const vm = vOfM(M)
    const aug = (path.length - 1) % 2 === 1 && !p0 && !vm.has(path[0]) && !vm.has(path[path.length - 1])
    return { alt: true, aug }
  }

  function paint() {
    gv.reset()
    const vm = vOfM(M)
    for (const [k] of gv.edges) if (M.has(k)) { const [a, b] = endsOf(k); gv.edgeClass(a, b, 'hi') }
    for (let i = 0; i < P.length - 1; i++) {
      const a = P[i], b = P[i + 1]
      if (!M.has(ek(a, b))) gv.edgeClass(a, b, 'hi3')
    }
    gv.ids().forEach((id) => {
      const sat = vm.has(id), inP = P.includes(id)
      gv.color(id, inP ? 'lemon' : sat ? 'pink' : 'mint')
      gv.nodeClass(id, 'sel', P[P.length - 1] === id)
      gv.tag(id, sat ? null : '空', 'mint')
    })
    if (P.length) {
      gv.tag(P[0], '始', 'lemon')
      if (P.length > 1) gv.tag(P[P.length - 1], '終', 'lemon')
    }
    rm.set(`${fmtM(M)}　（緑＝未マッチ頂点）`)
    rp.set(P.length ? P.map(sub).join(' → ') + `（長さ ${P.length - 1}）` : '—（頂点をタップして道を作ろう）')

    const { alt, aug } = checkPath(P)
    const anyAug = findAugPath(gv.adj(), M)
    if (!P.length) {
      vd.set(anyAug ? `未マッチ頂点（緑）が残っている。$M$-増大道を探してみよう！` : `🎉 $M$-増大道が 1 本も存在しない → 定理 9.1 より <b>最大マッチング</b>（|M| = ${M.size}）！`, anyAug ? 'mid' : 'ok')
    } else if (P.length === 1) {
      vd.set(`${sub(P[0])} から隣接する頂点をタップして道を延ばそう`, 'mid')
    } else if (!alt) {
      vd.set(`M の辺と M 外の辺が交互になっていない → M-交互道ではない`, 'ng')
    } else if (aug) {
      vd.set(`✨ <b>M-増大道を発見！</b> 両端 ${sub(P[0])}, ${sub(P[P.length - 1])} が未マッチで長さ ${P.length - 1}（奇数）。「対称差で +1」を押そう！`, 'ok')
    } else {
      const why = (vm.has(P[0]) || vm.has(P[P.length - 1])) ? '端点がすでに M で被覆されている' : '長さが偶数'
      vd.set(`<b>M-交互道</b>ではあるけれど、${why}ので M-増大道ではない`, 'mid')
    }
  }

  gv.on('nodeclick', (id) => {
    if (busy) return
    if (!P.length) { P = [id]; paint(); return }
    if (P[P.length - 1] === id) { P.pop(); paint(); return }
    if (P.includes(id)) { toast('道なので同じ頂点は 2 回通れないよ（最後の頂点をタップすると 1 歩戻れる）'); return }
    const last = P[P.length - 1]
    if (!gv.hasEdge(last, id)) { toast(`${sub(last)} と ${sub(id)} のあいだに辺がないよ`); return }
    const cand = [...P, id]
    if (!checkPath(cand).alt) {
      toast('M の辺と M 外の辺を交互に選んでね！')
      gv.pulse(id, PAL.pink)
      return
    }
    P = cand; paint()
  })

  async function augment() {
    if (busy) return
    const { aug } = checkPath(P)
    if (!aug) { toast('まず M-増大道を選んでね！（下の例ボタンでも選べるよ）'); return }
    busy = true
    for (let i = 0; i < P.length - 1; i++) await gv.travel(P[i], P[i + 1], PAL.lemon, 240)
    flipPath(M, P)
    const oldLen = P.length - 1
    P = []
    paint()
    toast(`M △ E(P) で ${(oldLen - 1) / 2} 本外して ${(oldLen + 1) / 2} 本追加 → |M| = ${M.size} に増えた！`)
    if (!findAugPath(gv.adj(), M)) confetti()
    busy = false
  }

  function setPreset(path) {
    if (busy) return
    M = new Set(EX94.M0.map(([a, b]) => ek(a, b)))
    P = path.slice()
    paint()
  }

  f.ctrl.append(
    h('button.btn.sm', { onclick: () => setPreset(['x4', 'x6', 'x8', 'x5']) }, '例：交互道 x₄x₆x₈x₅'),
    h('button.btn.sm.sk', { onclick: () => setPreset(['x1', 'x4', 'x6', 'x8', 'x5', 'x2']) }, '例：増大道 x₁x₄x₆x₈x₅x₂'),
    h('button.btn.sm.sk', { onclick: () => setPreset(['x1', 'x7']) }, '例：増大道 x₁x₇'),
    h('button.btn.sm.pk', { onclick: augment }, '⚡ 対称差 M △ E(P) で +1！'),
    h('button.btn.sm.mt', { onclick: () => { if (busy) return; const A = findAugPath(gv.adj(), M); if (A) { P = A; paint() } else toast('もう M-増大道はありません！（最大マッチング）') } }, '🔍 増大道を自動発見'),
    h('button.btn.sm', { onclick: () => { if (!busy) init() } }, 'リセット')
  )
  init()
  return f.el
}

// =========================================================
// LAB 9-3 : Berge の定理の証明ビジュアル — H = (V(M)∪V(M*), M △ M*)
// =========================================================
export function labBergeSymDiff() {
  const f = labFrame({
    title: 'Berge の定理の心臓：2 つのマッチングを重ねた H = M △ M*',
    hint: '赤が $M$（4 本）、青がより大きい $M^*$（5 本）。「対称差 $M\\triangle M^*$ を見る」を押すと、共通の辺は消え、<b>各頂点の次数が高々 2</b> なので<b>交互閉路</b>と<b>交互道</b>だけに分解されます。$|M^*|>|M|$ だから、青い辺が 1 本多い奇数長の道＝<b>$M$-増大道</b>が必ず見つかります！',
    color: 'lav', no: '9-3',
  })
  const ids = Array.from({ length: 10 }, (_, i) => 'v' + (i + 1))
  const pos = circle(ids, 300, 190, 145, -Math.PI / 2 - Math.PI / 10)
  const M_E = [['v9', 'v10'], ['v1', 'v5'], ['v2', 'v6'], ['v8', 'v4']]
  const MS_E = [['v10', 'v3'], ['v9', 'v7'], ['v8', 'v2'], ['v1', 'v5'], ['v6', 'v4']]
  const BG_E = [['v1', 'v2'], ['v2', 'v3'], ['v3', 'v4'], ['v4', 'v5'], ['v5', 'v6'], ['v6', 'v7'], ['v7', 'v8'], ['v8', 'v9'], ['v9', 'v10'], ['v10', 'v1'], ['v1', 'v5'], ['v2', 'v6'], ['v8', 'v4'], ['v10', 'v3'], ['v9', 'v7'], ['v8', 'v2'], ['v6', 'v4'], ['v1', 'v7'], ['v3', 'v9']]
  const uniqE = []
  const seenE = new Set()
  BG_E.forEach(([a, b]) => { const k = ek(a, b); if (!seenE.has(k)) { seenE.add(k); uniqE.push([a, b]) } })

  const gv = new GraphView(f.canvas, { w: W, h: H, r: 16 })
  const rs = readout('表示モード'), rc = readout('連結成分の内訳'), vd = verdict('', 'mid')
  f.side.append(rs, rc, vd)

  const mSet = new Set(M_E.map(([a, b]) => ek(a, b)))
  const msSet = new Set(MS_E.map(([a, b]) => ek(a, b)))

  function show(mode) {
    gv.reset()
    for (const [k, e] of gv.edges) {
      const inM = mSet.has(k), inMS = msSet.has(k)
      if (mode === 0) {
        if (inM) gv.edgeClass(e.a, e.b, 'hi')
        else gv.edgeClass(e.a, e.b, 'dim')
      } else if (mode === 1) {
        if (inMS) gv.edgeClass(e.a, e.b, 'hi3')
        else gv.edgeClass(e.a, e.b, 'dim')
      } else if (mode === 2) {
        if (inM && inMS) gv.edgeClass(e.a, e.b, 'ghost')
        else if (inM) gv.edgeClass(e.a, e.b, 'hi')
        else if (inMS) gv.edgeClass(e.a, e.b, 'hi3')
        else gv.edgeClass(e.a, e.b, 'dim')
      } else {
        const augKeys = new Set([ek('v3', 'v10'), ek('v10', 'v9'), ek('v9', 'v7')])
        if (augKeys.has(k)) gv.edgeClass(e.a, e.b, inM ? 'hi' : 'hi3')
        else gv.edgeClass(e.a, e.b, 'dim')
      }
    }
    ids.forEach((id) => gv.color(id, 'white'))
    if (mode === 0) {
      vOfM(mSet).forEach((id) => gv.color(id, 'pink'))
      rs.set('マッチング M（赤・4 本）')
      rc.set('未マッチ頂点：v₃, v₇（2 個）')
      vd.set('|M| = 4。これが最大かどうか、より大きい M*（5 本）と比べてみよう', 'mid')
    } else if (mode === 1) {
      vOfM(msSet).forEach((id) => gv.color(id, 'sky'))
      rs.set('より大きいマッチング M*（青・5 本）')
      rc.set('全 10 頂点を被覆（|M*| = 5 ＞ |M| = 4）')
      vd.set('つぎに「対称差 H = M △ M*」を押して 2 つを重ねてみよう！', 'mid')
    } else if (mode === 2) {
      ;['v2', 'v4', 'v6', 'v8'].forEach((id) => { gv.color(id, 'lav'); gv.tag(id, '閉', 'lav') })
      ;['v3', 'v10', 'v9', 'v7'].forEach((id) => { gv.color(id, 'lemon'); gv.tag(id, '道', 'lemon') })
      rs.set('H = (V(M)∪V(M*), M △ M*)')
      rc.set('① 偶数閉路 v₂-v₆-v₄-v₈（赤2・青2）<br>② 共通辺 v₁v₅（点線・H に入らない）<br>③ 奇数長の道 v₃-v₁₀-v₉-v₇（青2・赤1）')
      vd.set('各頂点は M から高々 1 本、M* から高々 1 本 → <b>次数は 0, 1, 2 のどれか</b>（道か偶数閉路のみ）！', 'ok')
    } else {
      ;['v3', 'v10', 'v9', 'v7'].forEach((id) => gv.color(id, 'lemon'))
      gv.tag('v3', '始(空)', 'mint'); gv.tag('v7', '終(空)', 'mint')
      rs.set('取り出した奇数長の道 P = v₃v₁₀v₉v₇')
      rc.set('v₃v₁₀ ∈ M*（青）, v₁₀v₉ ∈ M（赤）, v₉v₇ ∈ M*（青）')
      vd.set('✨ 両端 v₃, v₇ は M で未マッチ！ つまり P は <b>G の M-増大道</b>（定理 9.1 (2)⇒(1) 証明完了）', 'ok')
    }
  }

  f.ctrl.append(seg(['① M（4本）', '② M*（5本）', '③ 対称差 H = M △ M*', '④ M-増大道 P を抽出！'], (i) => show(i)))
  gv.load({ nodes: toNodes(pos, Object.fromEntries(ids.map((id) => [id, { label: sub(id) }]))), edges: uniqE })
  show(2)
  f.ctrl.querySelector('.seg').pick(2)
  return f.el
}

// =========================================================
// LAB 9-4 : 2 部グラフの結婚定理チェッカー $|N_G(U)| \ge |U|$ & 交互道到達集合 Z（例 9.5）
// =========================================================
const P94 = {
  ex95: {
    name: '例 9.5（結婚条件 NG）',
    X: ['x1', 'x2', 'x3', 'x4', 'x5'],
    Y: ['y1', 'y2', 'y3', 'y4', 'y5', 'y6'],
    E: [
      ['x1', 'y2'], ['x1', 'y4'],
      ['x2', 'y1'], ['x2', 'y2'], ['x2', 'y3'], ['x2', 'y4'], ['x2', 'y6'],
      ['x3', 'y2'], ['x3', 'y4'],
      ['x4', 'y2'], ['x4', 'y4'],
      ['x5', 'y3'], ['x5', 'y4'], ['x5', 'y5'], ['x5', 'y6'],
    ],
    initU: ['x1', 'x3', 'x4'],
  },
  ok: {
    name: '結婚条件 OK（辺 x₃y₅ を追加）',
    X: ['x1', 'x2', 'x3', 'x4', 'x5'],
    Y: ['y1', 'y2', 'y3', 'y4', 'y5', 'y6'],
    E: [
      ['x1', 'y2'], ['x1', 'y4'],
      ['x2', 'y1'], ['x2', 'y2'], ['x2', 'y3'], ['x2', 'y4'], ['x2', 'y6'],
      ['x3', 'y2'], ['x3', 'y4'], ['x3', 'y5'],
      ['x4', 'y2'], ['x4', 'y4'],
      ['x5', 'y3'], ['x5', 'y4'], ['x5', 'y5'], ['x5', 'y6'],
    ],
    initU: ['x1', 'x3', 'x4'],
  },
  cor: {
    name: '系 9.2.1（|X|=|Y|=4 完全マッチング）',
    X: ['x1', 'x2', 'x3', 'x4'],
    Y: ['y1', 'y2', 'y3', 'y4'],
    E: [
      ['x1', 'y1'], ['x1', 'y2'],
      ['x2', 'y2'], ['x2', 'y3'],
      ['x3', 'y1'], ['x3', 'y3'], ['x3', 'y4'],
      ['x4', 'y2'], ['x4', 'y4'],
    ],
    initU: ['x1', 'x2'],
  },
}

export function labHall() {
  const f = labFrame({
    title: '結婚定理（Hall）チェッカー：部分集合 U と隣人 N_G(U) をくらべよう',
    hint: '下段 $X$ の頂点をタップして部分集合 $U\\subseteq X$ を選ぶと、上段 $Y$ の近傍 $N_G(U)$ が青く光ります。<b>1 つでも $|N_G(U)| < |U|$ となる $U$ があれば</b>、$X$ を被覆するマッチングは絶対に作れません（例 9.5）。「証明の $Z$ を見る」では定理 9.2 の証明で作る到達集合 $Z$ も観察できます！',
    color: 'sky', no: '9-4',
  })
  const gv = new GraphView(f.canvas, { w: W, h: H, r: 17 })
  const ru = readout('選んだ U ⊆ X'), rn = readout('近傍 N_G(U) ⊆ Y'), rh = readout('Hall の条件 |N_G(U)| ≥ |U|'), vd = verdict('', 'mid')
  f.side.append(ru, rn, rh, vd)

  let cur = 'ex95', U = new Set(), showM = null, zMode = false

  function bipPos(X, Y) {
    const pos = {}
    Y.forEach((id, i) => { pos[id] = [90 + (420 * i) / Math.max(1, Y.length - 1), 86] })
    X.forEach((id, i) => { pos[id] = [115 + (370 * i) / Math.max(1, X.length - 1), 296] })
    return pos
  }

  function load(k) {
    cur = k; showM = null; zMode = false
    const D = P94[k]
    const pos = bipPos(D.X, D.Y)
    const ids = [...D.Y, ...D.X]
    gv.load({ nodes: toNodes(pos, Object.fromEntries(ids.map((id) => [id, { label: sub(id) }]))), edges: D.E })
    U = new Set(D.initU)
    paint()
  }

  function neighborsOf(setU) {
    const adj = gv.adj(), N = new Set()
    for (const x of setU) for (const y of adj.get(x) || []) N.add(y)
    return N
  }

  function findViolatingU() {
    const X = P94[cur].X, m = X.length
    for (let mask = 1; mask < (1 << m); mask++) {
      const subU = X.filter((_, i) => (mask >> i) & 1)
      const nu = neighborsOf(subU)
      if (nu.size < subU.length) return subU
    }
    return null
  }

  function computeZ(M) {
    const D = P94[cur], vm = vOfM(M), adj = gv.adj()
    const x0 = D.X.find((x) => !vm.has(x))
    if (!x0) return null
    const partner = new Map()
    for (const k of M) { const [a, b] = endsOf(k); partner.set(a, b); partner.set(b, a) }
    // Z = vertices reachable from x0 via M-alternating paths
    const Z = new Set([x0]), q = [x0]
    while (q.length) {
      const u = q.shift()
      if (D.X.includes(u)) {
        for (const y of adj.get(u) || []) {
          if (M.has(ek(u, y))) continue
          if (!Z.has(y)) { Z.add(y); q.push(y) }
        }
      } else {
        const w = partner.get(u)
        if (w && !Z.has(w)) { Z.add(w); q.push(w) }
      }
    }
    return { x0, Z }
  }

  function paint() {
    gv.reset()
    const D = P94[cur]
    // draw box labels for Y and X in gBack
    const mkBand = (y, lbl) => {
      const g = s('g')
      g.append(
        s('rect', { x: 48, y: y - 34, width: 504, height: 68, rx: 18, fill: 'none', stroke: PAL.ink, 'stroke-width': 2, 'stroke-dasharray': '6 5', opacity: 0.45 }),
        s('text', { x: 26, y: y + 6, 'font-family': 'Fredoka', 'font-weight': 700, 'font-size': 18, fill: PAL.ink }, lbl)
      )
      gv.gBack.append(g)
    }
    mkBand(86, 'Y'); mkBand(296, 'X')

    if (showM) {
      const vm = vOfM(showM)
      for (const [k, e] of gv.edges) {
        if (showM.has(k)) gv.edgeClass(e.a, e.b, 'hi')
        else gv.edgeClass(e.a, e.b, 'dim')
      }
      if (zMode) {
        const zInfo = computeZ(showM)
        if (zInfo) {
          const XZ = D.X.filter((x) => zInfo.Z.has(x)), YZ = D.Y.filter((y) => zInfo.Z.has(y))
          if (XZ.length) gv.blob(XZ, 'rgba(255,143,177,.28)', 24)
          if (YZ.length) gv.blob(YZ, 'rgba(142,201,255,.32)', 24)
          D.X.forEach((x) => { gv.color(x, zInfo.Z.has(x) ? 'pink' : 'white'); if (x === zInfo.x0) gv.tag(x, '未(x)', 'lemon') })
          D.Y.forEach((y) => gv.color(y, zInfo.Z.has(y) ? 'sky' : 'white'))
          ru.set(`X ∩ Z = { ${XZ.map(sub).join(', ')} }（${XZ.length} 個）`)
          rn.set(`Y ∩ Z = N_G(X∩Z) = { ${YZ.map(sub).join(', ')} }（${YZ.length} 個）`)
          rh.set(`|N_G(X∩Z)| = ${YZ.length} ＜ ${XZ.length} = |X∩Z|（Hall 条件破綻の証拠が自動出現！）`)
          vd.set(`最大マッチングが ${sub(zInfo.x0)} を被覆できないとき、交互道で届く集合 $X\\cap Z$ がそのまま $|N_G(U)|<|U|$ の証拠になる！`, 'ng')
          return
        }
      }
      D.X.forEach((x) => { gv.color(x, vm.has(x) ? 'pink' : 'white'); gv.tag(x, vm.has(x) ? 'M' : '余', vm.has(x) ? 'pink' : 'lemon') })
      D.Y.forEach((y) => { gv.color(y, vm.has(y) ? 'mint' : 'white'); if (vm.has(y)) gv.tag(y, 'M', 'mint') })
      const satX = D.X.filter((x) => vm.has(x)).length
      ru.set(`最大マッチング |M| = ${showM.size}`)
      rn.set(`X の被覆数：${satX} / ${D.X.length}　｜　Y の被覆数：${showM.size} / ${D.Y.length}`)
      const allSat = satX === D.X.length
      const perf = allSat && D.X.length === D.Y.length
      rh.set(perf ? '|X| = |Y| かつ X を被覆 → 完全マッチング！（系 9.2.1）' : allSat ? 'X の全頂点を被覆するマッチングが存在！（定理 9.2）' : `X を全員は被覆できない（最大 ${satX} 組）`)
      vd.set(allSat ? `🎉 <b>${perf ? '完全マッチング' : 'X を被覆するマッチング'}</b>が見つかりました！` : `最大でも ${showM.size} 組まで。どこかに $|N_G(U)|<|U|$ のボトルネックがあるはず！`, allSat ? 'ok' : 'ng')
      return
    }

    const NU = neighborsOf(U)
    for (const [, e] of gv.edges) {
      const hit = U.has(e.a) || U.has(e.b)
      gv.edgeClass(e.a, e.b, hit ? 'hi3' : 'dim')
    }
    D.X.forEach((x) => { gv.color(x, U.has(x) ? 'pink' : 'white'); gv.tag(x, U.has(x) ? 'U' : null, 'pink') })
    D.Y.forEach((y) => { gv.color(y, NU.has(y) ? 'sky' : 'white'); gv.tag(y, NU.has(y) ? 'N' : null, 'sky') })
    const uList = D.X.filter((x) => U.has(x)).map(sub)
    const nList = D.Y.filter((y) => NU.has(y)).map(sub)
    ru.set(uList.length ? `{ ${uList.join(', ')} }　（|U| = ${U.size}）` : '∅　（|U| = 0）')
    rn.set(nList.length ? `{ ${nList.join(', ')} }　（|N_G(U)| = ${NU.size}）` : '∅　（|N_G(U)| = 0）')
    const ok = NU.size >= U.size
    rh.set(`|N_G(U)| = ${NU.size} ${ok ? '≥' : '＜'} ${U.size} = |U|　→　この U は ${ok ? 'OK ✓' : '違反 ✗'}`)
    const bad = findViolatingU()
    if (!ok) {
      vd.set(`🚨 <b>ボトルネック発見！</b> ${U.size} 人の候補先が ${NU.size} 個しかないので、どう組んでも絶対に 1 人あぶれる（定理 9.2 より被覆マッチングなし）`, 'ng')
    } else if (bad) {
      vd.set(`この $U$ では $|N_G(U)|\\ge|U|$ だけど、<b>他の選び方で破綻する $U$ が隠れている</b>よ（「違反 U を探す」で発見）`, 'mid')
    } else {
      vd.set(`✨ <b>すべての $U\\subseteq X$（全 ${1 << D.X.length} 通り）で $|N_G(U)|\\ge|U|$ が成立！</b> 定理 9.2 より $X$ を被覆するマッチングが必ず存在する`, 'ok')
    }
  }

  gv.on('nodeclick', (id) => {
    if (!P94[cur].X.includes(id)) { toast('下段 X の頂点をタップして U に入れたり外したりしてね'); return }
    showM = null; zMode = false
    U.has(id) ? U.delete(id) : U.add(id)
    paint()
  })

  f.ctrl.append(
    seg(['例 9.5（NG）', '辺を1本追加（OK）', '系 9.2.1（完全）'], (i) => load(['ex95', 'ok', 'cor'][i])),
    h('button.btn.sm.lm', {
      onclick: () => {
        showM = null; zMode = false
        const bad = findViolatingU()
        if (bad) { U = new Set(bad); paint(); bad.forEach((x) => gv.pulse(x, PAL.pink)) }
        else { toast('どの U ⊆ X でも |N_G(U)| ≥ |U| が成り立っています！'); paint() }
      },
    }, '🔍 違反する U を探す'),
    h('button.btn.sm.pk', {
      onclick: () => {
        const D = P94[cur]
        showM = maxMatching([...D.Y, ...D.X], D.E); zMode = false; paint()
      },
    }, '💑 最大マッチングを表示'),
    h('button.btn.sm.sk', {
      onclick: () => {
        const D = P94[cur]
        const M = maxMatching([...D.Y, ...D.X], D.E)
        if (M.size === D.X.length) { toast('X が全員マッチ済みなので未マッチ頂点 x がありません（例 9.5 で試してね）'); showM = M; zMode = false; paint(); return }
        showM = M; zMode = true; paint()
      },
    }, '🧭 証明の到達集合 Z を見る')
  )
  load('ex95')
  return f.el
}

// =========================================================
// 解答 LAB : 9.1 やってみよう（10 名 A〜J のマッチング M と M-増大道）
// =========================================================
export const EX91 = {
  ids: ['A', 'J', 'I', 'H', 'G', 'F', 'E', 'D', 'C', 'B'],
  E: [
    ['A', 'B'], ['A', 'D'], ['A', 'E'], ['A', 'F'], ['A', 'G'], ['A', 'H'], ['A', 'J'],
    ['B', 'E'], ['B', 'H'],
    ['C', 'E'], ['C', 'H'], ['C', 'I'], ['C', 'J'],
    ['D', 'E'],
    ['E', 'F'], ['E', 'G'], ['E', 'H'], ['E', 'J'],
    ['F', 'H'],
    ['G', 'H'],
    ['H', 'I'],
    ['I', 'J'],
  ],
  M0: [['A', 'J'], ['D', 'E'], ['H', 'I']],
  AUGS: [
    ['B', 'A', 'J', 'C'],
    ['B', 'H', 'I', 'C'],
    ['C', 'J', 'A', 'F'],
    ['C', 'I', 'H', 'F'],
    ['C', 'J', 'A', 'G'],
    ['C', 'I', 'H', 'G'],
  ],
}

export function labMatchAnswer() {
  const f = labFrame({
    title: '解答ラボ：M = {AJ, DE, HI} の M-増大道と対称差による更新',
    hint: '① まずプリントのマッチング $M$（3 本）と未マッチ頂点 $\\{\\mathrm{B,C,F,G}\\}$ を確認 → ② 長さ 3 の $M$-増大道 $P$ を表示 → ③ $M\'=M\\triangle E(P)$ で 4 組に増やし、<b>もう $M\'$-増大道が存在しない（$\\alpha\'(G)=4$）</b>ことまで確かめられます。',
    color: 'mint', no: 'A9',
  })
  const pos = circle(EX91.ids, 300, 190, 145, -Math.PI / 2 - Math.PI / 10)
  const gv = new GraphView(f.canvas, { w: W, h: H, r: 17 })
  const rm = readout('マッチング'), rp = readout('注目している道 / 構造'), vd = verdict('', 'mid')
  f.side.append(rm, rp, vd)

  let M = new Set(), augIdx = 0, curP = null, busy = false

  function baseLoad() {
    gv.load({ nodes: toNodes(pos), edges: EX91.E }, false)
    M = new Set(EX91.M0.map(([a, b]) => ek(a, b)))
    curP = null
    paint()
  }

  function paint(barrier = false) {
    gv.reset()
    const vm = vOfM(M)
    for (const [k, e] of gv.edges) {
      if (M.has(k)) gv.edgeClass(e.a, e.b, 'hi')
      else if (curP) gv.edgeClass(e.a, e.b, 'dim')
    }
    if (curP) {
      for (let i = 0; i < curP.length - 1; i++) {
        const a = curP[i], b = curP[i + 1]
        gv.edgeClass(a, b, M.has(ek(a, b)) ? 'hi' : 'hi3', true)
        gv.edgeClass(a, b, 'dim', false)
      }
    }
    EX91.ids.forEach((id) => {
      const sat = vm.has(id)
      gv.color(id, sat ? 'pink' : 'mint')
      gv.tag(id, sat ? null : '余', 'mint')
    })
    if (curP) {
      curP.forEach((id) => gv.color(id, 'lemon'))
      gv.tag(curP[0], '始(余)', 'lemon')
      gv.tag(curP[curP.length - 1], '終(余)', 'lemon')
    }
    if (barrier) {
      ;['B', 'D', 'F', 'G'].forEach((id) => { gv.color(id, 'lemon'); gv.tag(id, '独立4', 'lemon') })
      ;['A', 'E', 'H'].forEach((id) => { gv.color(id, 'sky'); gv.tag(id, '隣人3', 'sky') })
    }
    rm.set(`${fmtM(M)}　（未マッチ：${EX91.ids.filter((x) => !vm.has(x)).join(', ')}）`)
  }

  function showInit() {
    if (busy) return
    M = new Set(EX91.M0.map(([a, b]) => ek(a, b)))
    curP = null
    paint()
    rp.set('余っている B, C, F, G 同士には直接の辺が 1 本もない（極大マッチング）')
    vd.set('余り同士では組めないけれど、<b>最大マッチングではない！</b> ② を押して M-増大道を見つけよう', 'mid')
  }

  function showAug() {
    if (busy) return
    M = new Set(EX91.M0.map(([a, b]) => ek(a, b)))
    curP = EX91.AUGS[augIdx % EX91.AUGS.length]
    augIdx++
    paint()
    rp.set(`M-増大道 P = ${curP.join(' → ')}（${curP[0]}${curP[1]} ∉ M, ${curP[1]}${curP[2]} ∈ M, ${curP[2]}${curP[3]} ∉ M）`)
    vd.set(`✨ 両端 ${curP[0]}, ${curP[3]} は V(M) に属さず交互にたどれる → <b>G は M-増大道を持つので、定理 9.1 より M は最大マッチングではない！</b>`, 'ok')
  }

  async function doFlip() {
    if (busy) return
    busy = true
    M = new Set(EX91.M0.map(([a, b]) => ek(a, b)))
    const P = curP || EX91.AUGS[0]
    curP = P; paint()
    for (let i = 0; i < P.length - 1; i++) await gv.travel(P[i], P[i + 1], PAL.lemon, 250)
    flipPath(M, P)
    curP = null; paint()
    rp.set(`M′ = M △ E(${P.join('')}) = ${fmtM(M)}`)
    vd.set(`🎉 4 組のマッチング M′ が完成！ さらに M′-増大道を探しても 1 本もない → <b>M′ が最大マッチング（α′(G) = 4）</b>`, 'ok')
    confetti()
    busy = false
  }

  function showWhy4() {
    if (busy) return
    curP = null
    paint(true)
    rp.set('U = {B, D, F, G}（互いに非隣接な 4 人）の相手候補 N_G(U) = {A, E, H}（3 人だけ！）')
    vd.set('💡 だから B, D, F, G のうち最大 3 人しかペアを組めず、10 人全員（5 組）は不可能！ α′(G) = 4 で確定', 'ok')
  }

  f.ctrl.append(
    h('button.btn.sm', { onclick: showInit }, '① 初期状態 M（3組）'),
    h('button.btn.sm.sk', { onclick: showAug }, '② M-増大道を表示（押すたび別解）'),
    h('button.btn.sm.pk', { onclick: doFlip }, '③ M′ = M △ E(P) で 4 組にする'),
    h('button.btn.sm.lm', { onclick: showWhy4 }, '④ なぜ 5 組は無理？（補足）')
  )
  baseLoad()
  showInit()
  return f.el
}
