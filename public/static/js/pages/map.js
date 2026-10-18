import { h, s, math, kt } from '../lib/ui.js'
import { PAL } from '../lib/graph.js'

// Theorem dependency network (the course itself as a graph!)
const N = [
  // id, label, lec, kind, desc
  ['def-g', 'グラフの定義', 1, 'def', 'グラフ $G=(V,E)$：$V$ と、その 2 元部分集合の集合 $E$ の組。'],
  ['def-iso', '同型', 1, 'def', '隣接関係を両方向に保つ全単射 $\\varphi$ が存在すること。'],
  ['def-deg', '近傍・次数', 1, 'def', '$\\deg_G(x)=|N_G(x)|=|E_G(x)|$。'],
  ['t11', '握手補題 1.1', 1, 'thm', '$\\sum\\deg_G(x)=2|E(G)|$。'],
  ['c111', '奇点定理', 1, 'thm', '奇点は偶数個。'],
  ['c112', '系 1.1.2', 1, 'thm', '奇数 $k$ の $k$-正則グラフは位数が偶数。'],
  ['t12', '定理 1.2', 1, 'thm', '位数 $n$ の $k$-正則グラフが存在 ⟺ $n,k$ の一方が偶数。'],
  ['def-seq', '次数列', 1, 'def', '次数を並べた数列。同型 ⟹ 次数列一致（逆は偽）。'],
  ['t13', 'Havel–Hakimi 1.3', 1, 'thm', '先頭 $\\Delta$ を除き、続く $\\Delta$ 個から 1 引いてもグラフ的か。'],
  ['a11', 'アルゴリズム 1.1', 1, 'thm', 'グラフ的判定。$O(n^2\\log n)$。'],
  ['def-sub', '部分グラフ', 2, 'def', '$V(H)\\subseteq V(G),\\ E(H)\\subseteq E(G)$。全域・誘導も。'],
  ['t21', '定理 2.1', 2, 'thm', '$\\delta(H)\\ge d(G)/2$ の部分グラフ $H$ が存在。'],
  ['def-comp', '補グラフ', 2, 'def', '$\\deg_{\\overline G}(x)=n-1-\\deg_G(x)$。'],
  ['def-path', '道・閉路', 2, 'def', '$P_n$（長さ $n-1$）、$C_n$（長さ $n$）。'],
  ['t22', '定理 2.2', 2, 'thm', '長さ $\\ge\\delta(G)$ の道を含む（最長道の端点を見る）。'],
  ['t23', '定理 2.3', 2, 'thm', '$\\delta\\ge2$ なら長さ $\\ge\\delta+1$ の閉路を含む。'],
  ['def-bip', '多部グラフ', 2, 'def', '部集合内に辺がない。$K_{m,n}$、星 $K_{1,n}$。'],
  ['t24', '定理 2.4', 2, 'thm', '2 部グラフ ⟺ 奇閉路を含まない。'],
  ['def-walk', '歩道', 3, 'def', '頂点と辺の交互列。重複OK。'],
  ['p31', '命題 3.1', 3, 'thm', '最短の $x$-$y$ 歩道は $x$-$y$ 道。'],
  ['def-conn', '連結性', 3, 'def', '任意の 2 頂点を結ぶ歩道（道）がある。'],
  ['t32', '定理 3.2', 3, 'thm', '$G$ か $\\overline G$ の少なくとも一方は連結。'],
  ['def-dist', '距離・離心数', 3, 'def', '$\\mathrm{dist}$、$\\mathrm{ecc}$、$\\mathrm{rad}$、$\\mathrm{diam}$。'],
  ['t33', '定理 3.3', 3, 'thm', '$\\mathrm{rad}\\le\\mathrm{diam}\\le2\\,\\mathrm{rad}$。'],
  ['def-tree', '林・木・葉', 3, 'def', '閉路なし＝林、連結な林＝木、次数 1＝葉。'],
  ['t34', '定理 3.4', 3, 'thm', '位数 $\\ge2$ の木は葉を 2 つ以上持つ。'],
  ['p35', '命題 3.5', 3, 'thm', '木から葉を除いても木。'],
  ['t36', '定理 3.6', 3, 'thm', '$|E(T)|=|V(T)|-1$。'],
  ['t37', '定理 3.7', 3, 'thm', '木 ⟺ 道が一意 ⟺ 極小連結 ⟺ 極大無閉路。'],
  ['t38', '定理 3.8', 3, 'thm', '連結グラフは全域木を持つ。'],
]
const L = [
  ['def-g', 'def-iso'], ['def-g', 'def-deg'], ['def-deg', 't11'], ['t11', 'c111'], ['c111', 'c112'], ['c112', 't12'], ['def-deg', 'def-seq'], ['def-iso', 'def-seq'], ['t11', 't13'], ['def-seq', 't13'], ['t13', 'a11'],
  ['def-g', 'def-sub'], ['def-sub', 't21'], ['t11', 't21'], ['def-sub', 'def-comp'], ['def-deg', 'def-comp'], ['def-sub', 'def-path'], ['def-path', 't22'], ['def-deg', 't22'], ['t22', 't23'], ['def-path', 'def-bip'], ['def-bip', 't24'], ['def-path', 't24'],
  ['def-walk', 'p31'], ['def-path', 'p31'], ['p31', 'def-conn'], ['def-conn', 't32'], ['def-comp', 't32'], ['p31', 'def-dist'], ['def-dist', 't33'], ['def-dist', 't24'],
  ['def-conn', 'def-tree'], ['def-path', 'def-tree'], ['t22', 't34'], ['t23', 't34'], ['def-tree', 't34'], ['t34', 'p35'], ['t34', 't36'], ['p35', 't36'], ['def-tree', 't37'], ['t37', 't38'], ['def-sub', 't38'],
]
const COL = { 1: PAL.pink, 2: PAL.mint, 3: PAL.sky }

export async function render(app) {
  document.title = '定理マップ — てん と せん'
  const W = 1400, H = 820
  const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': '定理の依存関係マップ' })
  const gL = s('g'), gN = s('g'); svg.append(gL, gN)
  const panel = h('div.map-panel')
  const wrap = h('div.map-wrap', svg,
    h('div.map-legend', h('div.eyebrow', 'Theorem Map'), h('div.ttl', kt('授業そのものが、', '', 200, 50), h('br'), kt('ひとつのグラフ。', '', 600, 50)),
      h('p', '定義（点線）→ 定理（実線）の依存関係。ノードをタップすると内容と “つながり” が光ります。ドラッグもできます。'),
      h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } }, [1, 2, 3].map((n) => h('span.chip', h('i', { style: { background: COL[n] } }), `第${n}回`)))),
    panel)
  app.append(wrap)
  // positions: initial by lecture band
  const nodes = N.map(([id, label, lec, kind, desc], i) => ({ id, label, lec, kind, desc, x: 300 + (lec - 1) * 400 + (Math.random() - .5) * 200, y: 200 + Math.random() * 500, vx: 0, vy: 0 }))
  const idx = Object.fromEntries(nodes.map((n, i) => [n.id, i]))
  const links = L.map(([a, b]) => ({ a: idx[a], b: idx[b], el: s('line', { class: 'ml' }) }))
  links.forEach((l) => gL.append(l.el))
  nodes.forEach((n) => {
    const g = s('g', { class: 'mn ' + n.kind, tabindex: 0 })
    const c = s('circle', { r: n.kind === 'thm' ? 13 : 11, fill: n.kind === 'thm' ? COL[n.lec] : PAL.white })
    if (n.kind === 'def') c.setAttribute('stroke', PAL.ink)
    const t = s('text', { y: 30, 'text-anchor': 'middle' }, n.label)
    g.append(c, t); gN.append(g); n.el = g
    g.addEventListener('pointerdown', (ev) => { drag = n; n.moved = false; svg.setPointerCapture(ev.pointerId) })
    g.addEventListener('keydown', (e) => e.key === 'Enter' && select(n))
    // entrance
    g.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 600, delay: 300 + Math.random() * 700, fill: 'backwards' })
  })
  let drag = null, alive = true, sel = null, temp = 1
  const toLocal = (ev) => { const p = svg.createSVGPoint(); p.x = ev.clientX; p.y = ev.clientY; return p.matrixTransform(svg.getScreenCTM().inverse()) }
  svg.addEventListener('pointermove', (ev) => { if (!drag) return; const p = toLocal(ev); drag.x = p.x; drag.y = p.y; drag.moved = true; temp = Math.max(temp, .3) })
  svg.addEventListener('pointerup', () => { if (drag && !drag.moved) select(drag); drag = null })
  svg.addEventListener('pointerdown', (ev) => { if (!ev.target.closest('.mn')) select(null) })
  function select(n) {
    sel = n
    const nb = new Set()
    links.forEach((l) => { const on = n && (nodes[l.a] === n || nodes[l.b] === n); l.el.classList.toggle('hi', !!on); if (on) { nb.add(l.a); nb.add(l.b) } })
    nodes.forEach((m, i) => m.el.classList.toggle('dim', !!n && !nb.has(i)))
    if (!n) { panel.classList.remove('on'); return }
    const pre = links.filter((l) => nodes[l.b] === n).map((l) => nodes[l.a].label)
    const post = links.filter((l) => nodes[l.a] === n).map((l) => nodes[l.b].label)
    panel.innerHTML = ''
    panel.append(h('div.chip', h('i', { style: { background: COL[n.lec] } }), `第${n.lec}回 ・ ${n.kind === 'thm' ? '定理・命題' : '定義'}`),
      h('h3', { style: { fontSize: '22px', fontWeight: 900, margin: '10px 0 6px' } }, n.label),
      h('p', { html: n.desc, style: { fontSize: '15px' } }),
      pre.length ? h('p', { style: { fontSize: '13px', color: 'var(--ink-2)', marginTop: '10px' } }, h('b', 'つかうもの：'), pre.join('、')) : null,
      post.length ? h('p', { style: { fontSize: '13px', color: 'var(--ink-2)', marginTop: '4px' } }, h('b', 'つながる先：'), post.join('、')) : null,
      h('a.btn.sm.pk', { href: `/lec/${n.lec}`, 'data-link': '', style: { marginTop: '14px' } }, `第${n.lec}回で学ぶ →`))
    math(panel)
    panel.classList.add('on')
    n.el.querySelector('circle').animate([{ r: 13 }, { r: 22 }, { r: 13 }], { duration: 500, easing: 'cubic-bezier(.34,1.56,.64,1)' })
  }
  function tick() {
    if (!alive) return
    // forces
    for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
      const A = nodes[i], B = nodes[j]; let dx = A.x - B.x, dy = A.y - B.y; let d2 = dx * dx + dy * dy + .01; const f = 5200 / d2
      const d = Math.sqrt(d2); dx /= d; dy /= d
      A.vx += dx * f; A.vy += dy * f; B.vx -= dx * f; B.vy -= dy * f
    }
    links.forEach(({ a, b }) => { const A = nodes[a], B = nodes[b]; const dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy) + .01; const f = (d - 95) * 0.02; A.vx += dx / d * f; A.vy += dy / d * f; B.vx -= dx / d * f; B.vy -= dy / d * f })
    nodes.forEach((n) => { const tx = 330 + (n.lec - 1) * 380; n.vx += (tx - n.x) * 0.004; n.vy += (H / 2 + 20 - n.y) * 0.003 })
    nodes.forEach((n) => { if (n === drag) { n.vx = n.vy = 0; return } n.vx *= .78; n.vy *= .78; n.x += n.vx * temp; n.y += n.vy * temp; n.x = Math.max(40, Math.min(W - 40, n.x)); n.y = Math.max(50, Math.min(H - 50, n.y)) })
    temp = Math.max(.06, temp * .995)
    links.forEach((l) => { const A = nodes[l.a], B = nodes[l.b]; l.el.setAttribute('x1', A.x); l.el.setAttribute('y1', A.y); l.el.setAttribute('x2', B.x); l.el.setAttribute('y2', B.y) })
    nodes.forEach((n) => n.el.setAttribute('transform', `translate(${n.x.toFixed(1)},${n.y.toFixed(1)})`))
    requestAnimationFrame(tick)
  }
  tick()
  app.append(h('footer.foot', { style: { marginTop: 0 } }, h('div.wrap.foot-in', h('p', `定義 ${N.filter((n) => n[3] === 'def').length} ・ 定理/命題/系 ${N.filter((n) => n[3] === 'thm').length} ・ つながり ${L.length}`), h('p', '講義が進むたびに、このネットワークは成長します。'))))
  return () => { alive = false }
}
