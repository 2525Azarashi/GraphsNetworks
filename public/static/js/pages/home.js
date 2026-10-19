import { h, html, s, kt, avatar, tween, sleep, clamp } from '../lib/ui.js'
import { LECTURES, UPCOMING } from '../content/index.js'
import { GraphView, circle, toNodes, PCYCLE, PAL } from '../lib/graph.js'

// ---------------- Hero: kinetic letters as vertices ----------------
function heroGraph(host) {
  const W = 1200, H = 520
  const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'GRAPH と NETWORK の文字が頂点になったグラフ' })
  host.append(svg)
  const gE = s('g'), gN = s('g'), gFx = s('g')
  svg.append(gE, gFx, gN)
  const cols = ['#FF8FB1', '#FFD66B', '#6FD6BC', '#B9A6FF', '#8EC9FF', '#FFB38A']
  const nodes = []
  const add = (ch, x, y, r, c, big) => nodes.push({ ch, hx: x, hy: y, x: x + (Math.random() - .5) * 600, y: y - 400 - Math.random() * 300, vx: 0, vy: 0, r, c, big })
  'GRAPH'.split('').forEach((ch, i) => add(ch, 190 + i * 205, 150 + (i % 2 ? 36 : -6), 70, cols[i % 6], true))
  'NETWORK'.split('').forEach((ch, i) => add(ch, 205 + i * 132, 382 + (i % 2 ? -22 : 14), 46, cols[(i + 2) % 6], false))
  // satellites
  ;[[70, 300], [1130, 300], [110, 470], [1090, 60], [610, 270], [60, 70]].forEach(([x, y], i) => add('', x, y, 13, cols[(i + 4) % 6], false))
  const E = []
  for (let i = 0; i < 4; i++) E.push([i, i + 1])
  for (let i = 5; i < 11; i++) E.push([i, i + 1])
  ;[[0, 5], [1, 6], [2, 8], [3, 9], [4, 11], [1, 7], [3, 10], [12, 5], [13, 11], [14, 5], [15, 4], [16, 2], [16, 8], [17, 0]].forEach((e) => E.push(e))
  const lines = E.map(([a, b]) => { const l = s('line', { stroke: PAL.ink, 'stroke-width': 4, 'stroke-linecap': 'round', opacity: 0 }); gE.append(l); return l })
  const els = nodes.map((n, i) => {
    const g = s('g', { class: 'hn', style: 'cursor:grab' })
    const sq = s('g', { class: 'hn-glyph' })
    sq.append(s('circle', { r: n.r, fill: n.c, stroke: PAL.ink, 'stroke-width': n.big ? 5 : 4 }))
    if (n.ch) {
      sq.append(s('text', { class: 'hn-label', 'text-anchor': 'middle', y: n.r * .36, 'font-size': n.r * 1.08, 'font-family': 'Fredoka', 'font-weight': 700 }, n.ch))
      // tiny face under letter for cuteness on big ones
      if (n.big) {
        sq.append(s('circle', { cx: -n.r * .5, cy: n.r * .5, r: 5, fill: '#F2668F', opacity: .5 }), s('circle', { cx: n.r * .5, cy: n.r * .5, r: 5, fill: '#F2668F', opacity: .5 }))
      }
    }
    g.append(sq); gN.append(g)
    n.g = g; n.sq = sq
    g.addEventListener('pointerdown', (ev) => { drag = n; svg.setPointerCapture(ev.pointerId); n.sq.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.15)' }], { duration: 200, fill: 'forwards' }) })
    return g
  })
  let drag = null, mx = -999, my = -999, alive = true, t0 = performance.now()
  const toLocal = (ev) => { const p = svg.createSVGPoint(); p.x = ev.clientX; p.y = ev.clientY; return p.matrixTransform(svg.getScreenCTM().inverse()) }
  svg.addEventListener('pointermove', (ev) => { const p = toLocal(ev); mx = p.x; my = p.y; if (drag) { drag.x = p.x; drag.y = p.y; drag.vx = drag.vy = 0 } })
  svg.addEventListener('pointerleave', () => { mx = my = -999 })
  const release = () => { if (drag) { drag.sq.animate([{ transform: 'scale(1.15)' }, { transform: 'scale(1)' }], { duration: 500, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'forwards' }); burst(drag) } drag = null }
  svg.addEventListener('pointerup', release); svg.addEventListener('pointercancel', release)
  function burst(n) {
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2
      const c = s('circle', { cx: n.x, cy: n.y, r: 6, fill: cols[k % 6], stroke: PAL.ink, 'stroke-width': 2 })
      gFx.append(c)
      c.animate([{ transform: 'translate(0,0) scale(1)' }, { transform: `translate(${Math.cos(a) * (n.r + 40)}px,${Math.sin(a) * (n.r + 40)}px) scale(0)` }], { duration: 650, easing: 'cubic-bezier(.22,1,.36,1)' }).onfinish = () => c.remove()
    }
  }
  // edges fade-in after landing
  setTimeout(() => lines.forEach((l, i) => { const len = 300; l.setAttribute('stroke-dasharray', 1000); l.setAttribute('stroke-dashoffset', 1000); l.setAttribute('opacity', 1); l.animate([{ strokeDashoffset: 1000 }, { strokeDashoffset: 0 }], { duration: 900, delay: i * 40, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'forwards' }) }), 900)
  const reduce = matchMedia('(prefers-reduced-motion:reduce)').matches
  if (reduce) nodes.forEach((n) => { n.x = n.hx; n.y = n.hy })
  function frame(now) {
    if (!alive) return
    const t = (now - t0) / 1000
    for (const n of nodes) {
      if (n === drag) continue
      const hy = n.hy + Math.sin(t * 1.4 + n.hx * 0.01) * (n.big ? 7 : 5)
      let fx = (n.hx - n.x) * 0.045, fy = (hy - n.y) * 0.045
      const dx = n.x - mx, dy = n.y - my, d = Math.hypot(dx, dy)
      if (d < 170 && d > 0.1) { const f = (170 - d) / 170; fx += (dx / d) * f * 6; fy += (dy / d) * f * 6 }
      n.vx = (n.vx + fx) * 0.82; n.vy = (n.vy + fy) * 0.82
      n.x += n.vx; n.y += n.vy
    }
    nodes.forEach((n, i) => {
      const sp = Math.hypot(n.vx, n.vy)
      const st = clamp(sp * 0.012, 0, 0.18)
      const ang = Math.atan2(n.vy, n.vx) * 180 / Math.PI
      els[i].setAttribute('transform', `translate(${n.x.toFixed(1)},${n.y.toFixed(1)}) rotate(${ang.toFixed(1)}) scale(${1 + st},${1 - st}) rotate(${(-ang).toFixed(1)})`)
    })
    E.forEach(([a, b], i) => { const A = nodes[a], B = nodes[b]; const l = lines[i]; l.setAttribute('x1', A.x); l.setAttribute('y1', A.y); l.setAttribute('x2', B.x); l.setAttribute('y2', B.y) })
    requestAnimationFrame(frame)
  }
  requestAnimationFrame(frame)
  return () => { alive = false }
}

// ---------------- mini art for lecture cards ----------------
function cardArt(L) {
  const host = h('div.lc-art', { style: { background: `color-mix(in srgb, ${L.hex} 26%, #FFFDF8)` } })
  const g = new GraphView(host, { w: 380, h: 210, r: 12, faces: true, labels: false, draggable: true })
  let data
  if (L.no === 1) { const ids = ['a', 'b', 'c', 'd', 'e']; data = { nodes: toNodes(circle(ids, 250, 110, 70), Object.fromEntries(ids.map((id, i) => [id, { color: PCYCLE[i] }]))), edges: [['a', 'b'], ['b', 'c'], ['c', 'd'], ['d', 'e'], ['e', 'a'], ['a', 'c'], ['a', 'd']] } }
  else if (L.no === 2) { const ids = ['a', 'b', 'c', 'd', 'e', 'f']; data = { nodes: toNodes(circle(ids, 250, 110, 74), Object.fromEntries(ids.map((id, i) => [id, { color: i % 2 ? 'mint' : 'pink' }]))), edges: [['a', 'b'], ['b', 'c'], ['c', 'd'], ['d', 'e'], ['e', 'f'], ['f', 'a'], ['a', 'd'], ['b', 'e'], ['c', 'f']] } }
  else if (L.no === 4) { const ids = ['a', 'b', 'c', 'd', 'e', 'f']; data = { nodes: toNodes({ a: [150, 60], b: [150, 160], c: [220, 110], d: [290, 110], e: [350, 50], f: [350, 170] }, { a: { color: 'lav' }, b: { color: 'lav' }, c: { color: 'pink' }, d: { color: 'pink' }, e: { color: 'mint' }, f: { color: 'mint' } }), edges: [['a', 'b'], ['a', 'c'], ['b', 'c'], ['c', 'd'], ['d', 'e'], ['d', 'f'], ['e', 'f']] } }
  else if (L.no === 3) { data = { nodes: toNodes({ r: [250, 40], a: [190, 95], b: [310, 95], c: [150, 160], d: [225, 165], e: [290, 165], f: [350, 160] }, { r: { color: 'lemon' }, c: { color: 'mint' }, d: { color: 'mint' }, e: { color: 'mint' }, f: { color: 'mint' }, a: { color: 'sky' }, b: { color: 'sky' } }), edges: [['r', 'a'], ['r', 'b'], ['a', 'c'], ['a', 'd'], ['b', 'e'], ['b', 'f']] } }
  else data = { nodes: [], edges: [] }
  g.load(data, false)
  host.append(h('span.lc-no', String(L.no).padStart(2, '0')))
  host._g = g
  return host
}

export async function render(app) {
  const kill = []
  // ---------- HERO ----------
  const stage = h('div.hero-stage')
  const hero = h('section.hero#hero-section', h('div.wrap',
    h('div.eyebrow.reveal', 'Kwansei Gakuin ・ Graph & Network Theory'),
    stage,
    h('div.hero-copy',
      h('div',
        h('h1.hero-sub', kt('点と線で、', 'kt-wave', 300, 55), h('br'), kt('“つながり” を考えよう。', 'kt-wave', 650, 55))),
      h('div',
        h('p.hero-lead.reveal', { html: 'グラフは<b>ちいさな頂点たち</b>が手をつないだ世界。<b>サカイ</b>先輩と<b>リョウガ</b>くんのおしゃべりを聞きながら、つないで・ちぎって・ぬって、グラフ理論の定理を<b>手でつかむ</b>学習サイトです。' }),
        h('div.hero-cta.reveal',
          h('a.btn.pk', { href: '/lec/1', 'data-link': '' }, '第 1 回からはじめる →'),
          h('a.btn', { href: '/map', 'data-link': '' }, '定理マップを見る'))))),
    h('div.hero-scroll', h('span'), 'SCROLL'))
  app.append(hero)
  kill.push(heroGraph(stage))

  // ---------- marquee ----------
  const words = ['頂点 Vertex', '辺 Edge', '次数 Degree', '同型 Isomorphism', '握手補題', '部分グラフ', '補グラフ', '完全グラフ Kₙ', '閉路 Cₙ', '2部グラフ', '連結 Connected', '距離 Distance', '木 Tree', '全域木', '連結度 κ(G)', 'ブロック Block', '耳分解 Ear']
  const mq = (alt) => h('div.marquee' + (alt ? '.alt' : ''), { 'aria-hidden': 'true' }, h('div.marquee-track', [...words, ...words].map((w) => h('span', w))))
  app.append(mq(false), mq(true))

  // ---------- STATS ----------
  const nLabs = 28, nThm = 29
  const stat = (v, label, art) => { const b = h('b', '0'); b.dataset.to = v; return h('div.stat.pop', html(art), b, h('span', label)) }
  const stats = h('section.section.wrap#stats-section', { style: { paddingBottom: '40px' } },
    h('div.sec-head', h('h2', kt('Learn by touching.', '', 0, 30), h('span.jp.reveal', '読む前に、さわって分かる')), h('p.reveal', 'すべての定義と定理に、ドラッグ・タップで動かせる「ラボ」がついています。手を動かして “なるほど” を作ろう。')),
    h('div.stats',
      stat(LECTURES.length, '収録済みの講義回', '<svg viewBox="0 0 90 90"><circle cx="58" cy="32" r="22" fill="#FFE0EA" stroke="#2B2A4C" stroke-width="3"/></svg>'),
      stat(nLabs, 'さわれるラボ', '<svg viewBox="0 0 90 90"><line x1="30" y1="60" x2="62" y2="26" stroke="#2B2A4C" stroke-width="3"/><circle cx="30" cy="60" r="10" fill="#D9F6EE" stroke="#2B2A4C" stroke-width="3"/><circle cx="62" cy="26" r="10" fill="#FFF3CC" stroke="#2B2A4C" stroke-width="3"/></svg>'),
      stat(nThm, '定理・命題・系', '<svg viewBox="0 0 90 90"><rect x="38" y="12" width="40" height="40" rx="10" fill="#ECE6FF" stroke="#2B2A4C" stroke-width="3"/></svg>'),
      stat(24, '類題クイズ', '<svg viewBox="0 0 90 90"><circle cx="58" cy="32" r="22" fill="#E1F0FF" stroke="#2B2A4C" stroke-width="3"/><text x="58" y="41" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="24" fill="#2B2A4C">?</text></svg>')))
  app.append(stats)
  stats.querySelectorAll('.stat').forEach((st) => { st._onin = () => { const b = st.querySelector('b'); const to = +b.dataset.to; tween(1200, (t) => (b.textContent = Math.round(to * t))) } ; st.setAttribute('data-onin', '') })

  // ---------- CAST ----------
  const card = (w, name, role, desc) => h(`div.cast-card.${w}.reveal`, h('div.av', avatar(w, 110)), h('div', h('h3', name, h('small', role)), h('p', desc)))
  app.append(h('section.section.wrap#cast-section',
    h('div.sec-head', h('h2', kt('Two vertices, one edge.', '', 0, 26), h('span.jp.reveal', 'ふたりの対話で進みます')), h('p.reveal', '各回は「対話 → ラボ → POINT」のくり返し。リョウガくんの疑問は、たぶんあなたの疑問。')),
    h('div.cast',
      card('s', 'サカイ', 'SENPAI ／ 解説役', 'グラフ理論が大好きな先輩。丸メガネとおだんごがトレードマーク。むずかしい定義も「手をつなぐ人」や「波紋」に言い換えて、図で見せてくれる。口ぐせは「まず、さわってみよう」。'),
      card('r', 'リョウガ', 'KOUHAI ／ 質問役', '情報系の 2 年生。好奇心のアンテナ（芽）がいつもピンと立っている。「それって何がうれしいの？」「逆は成り立つ？」と、核心を突く質問で議論を前に進める。'))))

  // ---------- FLOW infographic ----------
  const steps = [['1', '対話で入る', 'ふたりの会話で、定義の “気持ち” をつかむ。', 'pink'], ['2', 'ラボでさわる', '頂点をドラッグ、辺をつなぐ。数値がリアルタイムに変わる。', 'mint'], ['3', '証明をめくる', '証明は 1 ステップずつ。どこで何を使ったかが見える。', 'lemon'], ['4', 'クイズで確かめる', '類題 & 説明できるかチェックリストで仕上げ。', 'lav']]
  const flowLine = s('svg', { class: 'flow-line', viewBox: '0 0 100 2', preserveAspectRatio: 'none' }, s('line', { x1: 12.5, y1: 1, x2: 87.5, y2: 1, stroke: PAL.ink, 'stroke-width': .5, 'stroke-dasharray': '1.2 1.2', 'vector-effect': 'non-scaling-stroke', style: 'stroke-width:3px' }))
  const flow = h('div.flow', flowLine, steps.map(([n, t, d, c], i) => {
    const st = h('div.flow-step', h('div.flow-node', { style: { background: `var(--${c})`, transitionDelay: i * 150 + 'ms' } }, n), h('h4', t), h('p', d))
    return st
  }))
  app.append(h('section.section.wrap#flow-section', { style: { paddingTop: '30px' } },
    h('div.sec-head', h('h2', kt('How it flows.', '', 0, 30), h('span.jp.reveal', '1 回分の学び方')), h('p.reveal', '講義プリントの順番どおりに、4 つのステップを何度もくり返します。')), flow))

  // ---------- LECTURES ----------
  const grid = h('div.lec-grid')
  LECTURES.forEach((L, i) => {
    const done = JSON.parse(localStorage.getItem('gnt-check-' + L.no) || '{}')
    const pct = Math.round((Object.values(done).filter(Boolean).length / 5) * 100)
    const art = cardArt(L)
    const prog = h('i')
    const c = h('a.lec-card.reveal', { href: '/lec/' + L.slug, 'data-link': '', style: { transitionDelay: i * 90 + 'ms' } },
      art,
      h('div.lc-body', h('div.eyebrow', `Lecture ${String(L.no).padStart(2, '0')}`), h('h3', L.title), h('p', L.lead), h('div.lc-tags', L.keywords.map((k) => h('span', k)))),
      h('div.lc-prog', prog))
    c.addEventListener('mouseenter', () => { const g = art._g; g.ids().forEach((id, k) => setTimeout(() => g.bounce(id), k * 50)) })
    c._onin = () => { prog.style.width = pct + '%' }; c.setAttribute('data-onin', '')
    grid.append(c)
  })
  UPCOMING.forEach((U) => grid.append(h('div.lec-card.soon', h('div.lc-art', `Lecture ${String(U.no).padStart(2, '0')} ・ ${U.title}`), h('div.lc-body', h('h3', '次の講義プリントを待っています'), h('p', 'プリントが届くたびに、ここに新しい回が増えていきます。')))))
  app.append(h('section.section.wrap#lectures-section',
    h('div.sec-head', h('h2', kt('Lectures.', '', 0, 40), h('span.jp.reveal', '講義一覧')), h('p.reveal', 'カードの下のバーは、各回の「説明できるかチェック」の達成度です。')), grid))

  app.append(h('footer.foot', h('div.wrap.foot-in',
    h('div', h('div.logo', { style: { fontSize: '22px' } }, 'てん と せん'), h('p', 'グラフ・ネットワーク理論 学習サイト ／ 講義資料：古谷 倫貴 先生（関西学院大学）')),
    h('p', '頂点はドラッグできます。ぜひ遊んでみてね。'))))

  return () => kill.forEach((k) => k && k())
}
