import { h, kt, math } from '../lib/ui.js'
import { GraphView, circle, toNodes, PCYCLE } from '../lib/graph.js'
import { LECTURES } from '../content/index.js'

const C = (ids, r = 46) => circle(ids, 130, 60, r)
const ring = (n) => Array.from({ length: n }, (_, i) => 'v' + i)
// [term, en, lec, desc, art()]
const WORDS = [
  ['グラフ', 'Graph', 1, '頂点集合 $V$ と辺集合 $E\\subseteq\\binom V2$ の組 $(V,E)$。', () => ({ pos: C(['a', 'b', 'c', 'd']), E: [['a', 'b'], ['a', 'c'], ['b', 'c'], ['b', 'd']] })],
  ['位数・サイズ', 'Order / Size', 1, '位数＝頂点の個数 $|V|$、サイズ＝辺の本数 $|E|$。', () => ({ pos: C(ring(5)), E: [['v0', 'v1'], ['v1', 'v2'], ['v2', 'v3']] })],
  ['隣接・接続', 'Adjacent / Incident', 1, '頂点–頂点・辺–辺は「隣接」、頂点–辺は「接続」。', () => ({ pos: { a: [70, 60], b: [130, 60], c: [190, 60] }, E: [['a', 'b'], ['b', 'c']], hi: [['a', 'b']] })],
  ['同型', 'Isomorphic', 1, '隣接関係を両方向に保つ全単射が存在。$G_1\\simeq G_2$。', () => ({ pos: C(ring(6)), E: [['v0', 'v1'], ['v1', 'v2'], ['v2', 'v3'], ['v3', 'v4'], ['v4', 'v5'], ['v5', 'v0'], ['v0', 'v3'], ['v1', 'v4'], ['v2', 'v5']] })],
  ['近傍', 'Neighborhood', 1, '$N_G(x)$：$x$ に隣接する頂点全体。', () => ({ pos: { x: [130, 60], ...circle(['a', 'b', 'c'], 130, 60, 46) }, E: [['x', 'a'], ['x', 'b'], ['x', 'c']], hi: [['x', 'a'], ['x', 'b'], ['x', 'c']] })],
  ['次数', 'Degree', 1, '$\\deg_G(x)$：$x$ に接続する辺の本数。$\\delta$ 最小・$\\Delta$ 最大。', () => ({ pos: { x: [130, 60], ...circle(['a', 'b', 'c', 'd'], 130, 60, 46) }, E: [['x', 'a'], ['x', 'b'], ['x', 'c'], ['x', 'd']], tag: { x: 4 } })],
  ['孤立点', 'Isolated vertex', 1, '次数 0 の頂点。', () => ({ pos: { a: [80, 40], b: [80, 85], c: [190, 60] }, E: [['a', 'b']], tag: { c: 0 } })],
  ['偶点・奇点', 'Even / Odd vertex', 1, '次数が偶数／奇数の頂点。奇点は必ず偶数個。', () => ({ pos: C(['a', 'b', 'c', 'd']), E: [['a', 'b'], ['b', 'c'], ['c', 'd'], ['a', 'c']] })],
  ['正則グラフ', 'Regular graph', 1, '全頂点の次数が $k$：$k$-正則。3-正則はキュービック。', () => ({ pos: C(ring(6)), E: [['v0', 'v1'], ['v1', 'v2'], ['v2', 'v3'], ['v3', 'v4'], ['v4', 'v5'], ['v5', 'v0'], ['v0', 'v3'], ['v1', 'v4'], ['v2', 'v5']] })],
  ['次数列・グラフ的', 'Degree sequence', 1, '次数を並べた数列。実現するグラフがあれば「グラフ的」。', () => ({ pos: C(['a', 'b', 'c', 'd']), E: [['a', 'b'], ['b', 'c'], ['a', 'c'], ['c', 'd']] })],
  ['部分グラフ', 'Subgraph', 2, '$V(H)\\subseteq V(G)$ かつ $E(H)\\subseteq E(G)$。', () => ({ pos: C(ring(5)), E: [['v0', 'v1'], ['v1', 'v2'], ['v2', 'v3'], ['v3', 'v4'], ['v4', 'v0']], hi: [['v0', 'v1'], ['v1', 'v2']] })],
  ['全域部分グラフ', 'Spanning subgraph', 2, '頂点は全部残し、辺だけ選んだ部分グラフ。', () => ({ pos: C(ring(5)), E: [['v0', 'v1'], ['v2', 'v3']] })],
  ['誘導部分グラフ', 'Induced subgraph', 2, '$G[X]$：$X$ 内の 2 頂点を結ぶ辺をすべて持つ。', () => ({ pos: C(ring(5)), E: [['v0', 'v1'], ['v1', 'v2'], ['v0', 'v2'], ['v2', 'v3'], ['v3', 'v4']], hi: [['v0', 'v1'], ['v1', 'v2'], ['v0', 'v2']] })],
  ['補グラフ', 'Complement', 2, '$\\overline G$：あった辺を消し、なかった辺を引く。', () => ({ pos: C(ring(5)), E: [['v0', 'v2'], ['v0', 'v3'], ['v1', 'v3'], ['v1', 'v4'], ['v2', 'v4']] })],
  ['完全グラフ', 'Complete graph', 2, '$K_n$：任意の 2 頂点が隣接。$\\binom n2$ 本の辺。', () => { const ids = ring(6); const E = []; ids.forEach((a, i) => ids.slice(i + 1).forEach((b) => E.push([a, b]))); return { pos: C(ids), E } }],
  ['空グラフ', 'Empty graph', 2, '$E_n$：辺が 1 本もない。$\\overline{K_n}=E_n$。', () => ({ pos: C(ring(5)), E: [] })],
  ['道', 'Path', 2, '$P_n$：一本道。位数 $n$、長さ $n-1$。', () => ({ pos: Object.fromEntries(ring(5).map((v, i) => [v, [40 + i * 45, 60 + (i % 2 ? -18 : 18)]])), E: [['v0', 'v1'], ['v1', 'v2'], ['v2', 'v3'], ['v3', 'v4']] })],
  ['閉路', 'Cycle', 2, '$C_n$（$n\\ge3$）：輪っか。長さ＝位数。', () => ({ pos: C(ring(6)), E: ring(6).map((v, i, a) => [v, a[(i + 1) % 6]]) })],
  ['車輪', 'Wheel', 2, '$W_n$：閉路＋中心の頂点を全部とつなぐ。', () => ({ pos: { ...C(ring(6)), h: [130, 60] }, E: [...ring(6).map((v, i, a) => [v, a[(i + 1) % 6]]), ...ring(6).map((v) => [v, 'h'])] })],
  ['多部グラフ', 'Multipartite', 2, '部集合内に辺がない。$r$ 部グラフは $r+1$ 部でもある。', () => ({ pos: { a: [70, 30], b: [70, 90], x: [190, 20], y: [190, 60], z: [190, 100] }, E: [['a', 'x'], ['a', 'y'], ['a', 'z'], ['b', 'x'], ['b', 'y'], ['b', 'z']], col: { a: 'pink', b: 'pink', x: 'mint', y: 'mint', z: 'mint' } })],
  ['星', 'Star', 2, '$K_{1,n}$：中心 1 つと葉 $n$ 枚。', () => ({ pos: { h: [130, 60], ...C(ring(6)) }, E: ring(6).map((v) => ['h', v]) })],
  ['歩道', 'Walk', 3, '頂点と辺の交互列。同じ頂点・辺を何度通ってもよい。', () => ({ pos: C(['a', 'b', 'c', 'd']), E: [['a', 'b'], ['b', 'c'], ['c', 'd'], ['d', 'a'], ['a', 'c']], hi: [['a', 'b'], ['b', 'c'], ['c', 'a']] })],
  ['連結', 'Connected', 3, '任意の 2 頂点を結ぶ道がある。', () => ({ pos: C(ring(5)), E: [['v0', 'v1'], ['v1', 'v2'], ['v2', 'v3'], ['v3', 'v4']] })],
  ['連結成分', 'Component', 3, '極大な連結部分グラフ。', () => ({ pos: { a: [50, 40], b: [90, 90], c: [110, 30], x: [180, 40], y: [210, 90] }, E: [['a', 'b'], ['b', 'c'], ['a', 'c'], ['x', 'y']], col: { a: 'pink', b: 'pink', c: 'pink', x: 'mint', y: 'mint' } })],
  ['距離', 'Distance', 3, '$\\mathrm{dist}_G(x,y)$：最短の $x$-$y$ 道の長さ。', () => ({ pos: Object.fromEntries(ring(5).map((v, i) => [v, [40 + i * 45, 60]])), E: [['v0', 'v1'], ['v1', 'v2'], ['v2', 'v3'], ['v3', 'v4']], tag: { v0: 0, v1: 1, v2: 2, v3: 3, v4: 4 } })],
  ['離心数', 'Eccentricity', 3, '$\\mathrm{ecc}_G(x)$：$x$ から最も遠い頂点までの距離。', () => ({ pos: Object.fromEntries(ring(5).map((v, i) => [v, [40 + i * 45, 60]])), E: [['v0', 'v1'], ['v1', 'v2'], ['v2', 'v3'], ['v3', 'v4']], tag: { v0: 4, v1: 3, v2: 2, v3: 3, v4: 4 } })],
  ['半径・中心', 'Radius / Center', 3, '離心数の最小値が半径、それを達成する頂点が中心。', () => ({ pos: Object.fromEntries(ring(5).map((v, i) => [v, [40 + i * 45, 60]])), E: [['v0', 'v1'], ['v1', 'v2'], ['v2', 'v3'], ['v3', 'v4']], col: { v2: 'pink' } })],
  ['直径', 'Diameter', 3, '離心数の最大値。最も離れた 2 頂点の距離。', () => ({ pos: C(ring(6)), E: ring(6).map((v, i, a) => [v, a[(i + 1) % 6]]), col: { v0: 'pink', v3: 'pink' } })],
  ['林', 'Forest', 3, '閉路を持たないグラフ。', () => ({ pos: { a: [50, 30], b: [50, 90], c: [100, 60], x: [170, 30], y: [210, 90], z: [170, 90] }, E: [['a', 'c'], ['b', 'c'], ['x', 'z'], ['z', 'y']] })],
  ['木', 'Tree', 3, '連結な林。$|E|=|V|-1$。', () => ({ pos: { r: [130, 20], a: [80, 60], b: [180, 60], c: [50, 100], d: [110, 100], e: [180, 100] }, E: [['r', 'a'], ['r', 'b'], ['a', 'c'], ['a', 'd'], ['b', 'e']] })],
  ['葉', 'Leaf', 3, '次数 1 の頂点。位数 2 以上の木は 2 枚以上持つ。', () => ({ pos: { r: [130, 20], a: [80, 60], b: [180, 60], c: [50, 100], d: [110, 100], e: [180, 100] }, E: [['r', 'a'], ['r', 'b'], ['a', 'c'], ['a', 'd'], ['b', 'e']], col: { c: 'mint', d: 'mint', e: 'mint' } })],
  ['全域木', 'Spanning tree', 3, '木である全域部分グラフ。連結グラフには必ずある。', () => ({ pos: C(ring(6)), E: [['v0', 'v1'], ['v1', 'v2'], ['v2', 'v3'], ['v0', 'v4'], ['v4', 'v5']] })],
  ['切断点', 'Cut vertex', 4, '$c(G-x)>c(G)$ を満たす頂点。抜くと成分が増える。', () => ({ pos: { a: [60, 40], b: [60, 90], x: [130, 60], c: [200, 40], d: [200, 90] }, E: [['a', 'b'], ['a', 'x'], ['b', 'x'], ['x', 'c'], ['x', 'd'], ['c', 'd']], col: { x: 'pink' } })],
  ['橋', 'Bridge', 4, '$c(G-e)>c(G)$ を満たす辺（切断辺）。抜くと必ず +1。', () => ({ pos: { a: [50, 40], b: [50, 90], c: [100, 60], d: [170, 60], e: [220, 40], f: [220, 90] }, E: [['a', 'b'], ['a', 'c'], ['b', 'c'], ['c', 'd'], ['d', 'e'], ['d', 'f'], ['e', 'f']], hi: [['c', 'd']] })],
  ['頂点切断', 'Vertex cut', 4, '$G-S$ が非連結になる頂点集合 $S$。', () => ({ pos: C(ring(6)), E: ring(6).map((v, i, a) => [v, a[(i + 1) % 6]]), col: { v0: 'pink', v3: 'pink' } })],
  ['k-連結', 'k-connected', 4, '位数 $\\ge k+1$ で、どの $k-1$ 個以下の頂点を抜いても連結。', () => ({ pos: { ...circle(['a', 'b', 'c'], 130, 60, 50), ...circle(['d', 'e', 'f'], 130, 60, 22) }, E: [['a', 'b'], ['b', 'c'], ['c', 'a'], ['d', 'e'], ['e', 'f'], ['f', 'd'], ['a', 'd'], ['b', 'e'], ['c', 'f']] })],
  ['連結度', 'Connectivity', 4, '$\\kappa(G)$：$G$ が $k$-連結となる最大の $k$。$\\kappa\\le\\delta$。', () => { const ids = ring(5); const E = []; ids.forEach((a, i) => ids.slice(i + 1).forEach((b) => E.push([a, b]))); return { pos: C(ids), E, tag: { v0: 4 } } }],
  ['ブロック', 'Block', 4, '極大な $K_1$・$K_2$・2-連結の誘導部分グラフ。', () => ({ pos: { a: [50, 30], b: [50, 90], c: [100, 60], d: [160, 60], e: [210, 30], f: [210, 90] }, E: [['a', 'b'], ['a', 'c'], ['b', 'c'], ['c', 'd'], ['d', 'e'], ['d', 'f'], ['e', 'f']], col: { a: 'pink', b: 'pink', c: 'lemon', d: 'lemon', e: 'mint', f: 'mint' } })],
  ['ブロック木', 'Block tree', 4, 'ブロックと切断点を交互につないだ木 $B(G)$。葉は端ブロック。', () => ({ pos: { B1: [50, 60], c: [100, 60], B2: [150, 60], d: [200, 60], B3: [240, 60] }, E: [['B1', 'c'], ['c', 'B2'], ['B2', 'd'], ['d', 'B3']], col: { B1: 'pink', B2: 'lemon', B3: 'mint' } })],
  ['耳', 'Ear', 4, '内点の次数がすべて 2 の道。', () => ({ pos: { ...C(['a', 'b', 'c', 'd'], 34), p: [60, 20], q: [40, 70] }, E: [['a', 'b'], ['b', 'c'], ['c', 'd'], ['d', 'a'], ['a', 'p'], ['p', 'q'], ['q', 'c']], hi: [['a', 'p'], ['p', 'q'], ['q', 'c']] })],
  ['耳分解', 'Ear decomposition', 4, '閉路 $G_0$ と耳の列 $Q_1,\\dots,Q_m$。2-連結 ⟺ 耳分解をもつ。', () => ({ pos: C(ring(6)), E: [...ring(6).map((v, i, a) => [v, a[(i + 1) % 6]]), ['v0', 'v3']], hi: [['v0', 'v3']] })],
]

export async function render(app) {
  document.title = 'ことば図鑑 — てん と せん'
  let filt = 0, q = ''
  const grid = h('div.gl-grid')
  const cards = WORDS.map(([t, en, lec, d, art]) => {
    const ga = h('div.ga', { style: { background: `color-mix(in srgb, ${LECTURES[lec - 1].hex} 20%, #FFFDF8)` } })
    const c = h('article.gl-card.reveal', ga, h('div.gb', h('h4', t, h('small', en)), h('p', { html: d }), h('span.chip', { style: { marginTop: '8px', fontSize: '11px' } }, h('i', { style: { background: LECTURES[lec - 1].hex } }), `第${lec}回`)))
    c._lec = lec; c._txt = (t + en + d).toLowerCase()
    let built = false
    c._onin = () => {
      if (built) return; built = true
      const A = art(); const ids = Object.keys(A.pos)
      const g = new GraphView(ga, { w: 260, h: 120, r: 10, faces: false, labels: false })
      g.load({ nodes: toNodes(A.pos, Object.fromEntries(ids.map((id) => [id, { color: A.col?.[id] || 'white' }]))), edges: A.E })
      A.hi?.forEach(([a, b]) => g.edgeClass(a, b, 'hi'))
      if (A.tag) Object.entries(A.tag).forEach(([id, v]) => g.tag(id, v, 'lemon'))
      c.addEventListener('mouseenter', () => g.ids().forEach((id, k) => setTimeout(() => g.bounce(id), k * 40)))
    }
    c.setAttribute('data-onin', '')
    return c
  })
  grid.append(...cards)
  const apply = () => cards.forEach((c) => { const ok = (!filt || c._lec === filt) && (!q || c._txt.includes(q)); c.style.display = ok ? '' : 'none'; if (ok) { c.classList.add('in'); c._onin() } })
  const tabs = h('div.seg', ['すべて', '第1回', '第2回', '第3回', '第4回'].map((t, i) => { const b = h('button', { onclick: () => { filt = i; [...tabs.children].forEach((x, j) => x.classList.toggle('on', i === j)); apply() } }, t); if (!i) b.classList.add('on'); return b }))
  const search = h('input.inp', { placeholder: '🔍 ことばを検索（例：次数、tree）', 'aria-label': '検索', style: { maxWidth: '360px' }, oninput: (e) => { q = e.target.value.trim().toLowerCase(); apply() } })
  app.append(h('section.section.wrap', { style: { paddingTop: '140px' } },
    h('div.sec-head', h('h2', kt('Word Garden.', '', 0, 40), h('span.jp.reveal', 'ことば図鑑 ・ ' + WORDS.length + ' 語')), h('p.reveal', '定義は試験で一番の武器。ミニ図とセットで覚えよう。カードにカーソルを乗せると頂点がはねます。')),
    h('div.gl-tools.reveal', tabs, search), grid))
  app.append(h('footer.foot', h('div.wrap.foot-in', h('p', 'ことば図鑑'), h('p', '講義が進むごとに語が増えていきます。'))))
  math(app)
}
