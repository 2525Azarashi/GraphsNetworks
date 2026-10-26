import { h, html, s, kt, math, quiz, checklist, $$, talk } from '../lib/ui.js'
import { LECTURES } from '../content/index.js'
import { GraphView, circle, toNodes, PCYCLE } from '../lib/graph.js'

function heroArt(L, host) {
  const g = new GraphView(host, { w: 480, h: 400, r: 18, labels: false })
  let pos, E
  if (L.no === 1) { const ids = 'abcdefg'.split(''); pos = { ...circle(ids.slice(0, 6), 240, 200, 130), g: [240, 200] }; E = [['a', 'b'], ['b', 'c'], ['c', 'd'], ['d', 'e'], ['e', 'f'], ['f', 'a'], ['g', 'a'], ['g', 'c'], ['g', 'e'], ['b', 'g']] }
  else if (L.no === 2) { const o = ['o0', 'o1', 'o2', 'o3', 'o4'], i = ['i0', 'i1', 'i2', 'i3', 'i4']; pos = { ...circle(o, 240, 205, 150), ...circle(i, 240, 205, 66) }; E = [...o.map((x, k) => [x, o[(k + 1) % 5]]), ...o.map((x, k) => [x, i[k]]), ...i.map((x, k) => [x, i[(k + 2) % 5]])] }
  else if (L.no === 4) { pos = { a: [70, 120], b: [70, 280], c: [160, 200], d: [260, 200], e: [330, 100], f: [330, 300], g: [420, 200], hh: [410, 60], ii: [450, 340] }; E = [['a', 'b'], ['a', 'c'], ['b', 'c'], ['c', 'd'], ['d', 'e'], ['d', 'f'], ['e', 'g'], ['f', 'g'], ['e', 'f'], ['e', 'hh'], ['g', 'ii'], ['f', 'ii']] }
  else if (L.no === 5) { pos = { x: [50, 200], a: [150, 80], b: [150, 200], c: [150, 320], s1: [250, 100], s2: [250, 200], s3: [250, 300], d: [350, 80], e: [350, 200], f: [350, 320], y: [440, 200] }; E = [['x', 'a'], ['x', 'b'], ['x', 'c'], ['a', 's1'], ['b', 's2'], ['c', 's3'], ['s1', 'd'], ['s2', 'e'], ['s3', 'f'], ['d', 'y'], ['e', 'y'], ['f', 'y'], ['a', 'b'], ['s2', 's3'], ['d', 'e']] }
  else { pos = { r: [240, 60], a: [140, 150], b: [340, 150], c: [80, 260], d: [190, 270], e: [300, 270], f: [400, 260], g: [240, 350], h: [440, 350] }; E = [['r', 'a'], ['r', 'b'], ['a', 'c'], ['a', 'd'], ['b', 'e'], ['b', 'f'], ['e', 'g'], ['f', 'h']] }
  const ids = Object.keys(pos)
  g.load({ nodes: toNodes(pos, Object.fromEntries(ids.map((id, k) => [id, { color: PCYCLE[k % 6] }]))), edges: E })
  // gentle idle wobble
  let alive = true, t0 = performance.now()
  const base = Object.fromEntries(ids.map((id) => [id, pos[id].slice()]))
  const loop = (now) => { if (!alive) return; const t = (now - t0) / 1000; ids.forEach((id, k) => { const n = g.nodes.get(id); if (!n) return; n.x = base[id][0] + Math.sin(t * 1.2 + k) * 5; n.y = base[id][1] + Math.cos(t * 1.0 + k * 1.3) * 5 }); g.refresh(); requestAnimationFrame(loop) }
  let dragging = false
  g.on('dragend', (id) => { const n = g.nodes.get(id); base[id] = [n.x, n.y] })
  setTimeout(() => requestAnimationFrame(loop), 1400)
  return () => { alive = false }
}

export async function render(app, path) {
  const slug = path.split('/')[2]
  const L = LECTURES.find((l) => l.slug === slug) || LECTURES[0]
  const C = await L.load()
  document.title = `第${L.no}回 ${L.title} — てん と せん`
  app.style.setProperty('--c', `var(--${L.color})`)

  // ---------- hero ----------
  const no = String(L.no).padStart(2, '0')
  const bigNo = kt(no, 'big', 0, 120)
  bigNo.classList.add('big-no')
  setTimeout(() => $$('.ch', bigNo).forEach((c, i) => setTimeout(() => c.classList.add('fill'), 900 + i * 200)), 10)
  bigNo.style.setProperty('--c', `var(--${L.color})`)
  const art = h('div.lh-art.pop', { style: { background: `color-mix(in srgb, ${L.hex} 22%, #FFFDF8)` } })
  const goals = h('div.goals', L.goals.map((g, i) => h('div.goal.reveal', { style: { transitionDelay: 400 + i * 120 + 'ms' } }, h('span.gn', i + 1), h('p', g))))
  app.append(h('section.lec-hero#lecture-hero', h('div.wrap.lh-grid',
    h('div',
      h('div.eyebrow.reveal', `Lecture ${no} ・ ${L.short}`),
      h('div.lec-hero-no', { style: { marginTop: '10px' } }, bigNo),
      h('h1', kt(L.title, '', 300, 40)),
      goals,
      h('div.kw.reveal', L.keywords.map((k) => h('span.chip', h('i', { style: { background: `var(--${L.color})` } }), k)))),
    art)))
  const killArt = heroArt(L, art)

  // ---------- intro talk ----------
  // ---------- body with toc ----------
  const tocFill = h('i.toc-fill')
  const extra = [...(C.report ? [{ id: 'report', num: 'A', title: '演習の解答' }] : []), { id: 'quiz', num: 'Q', title: '類題クイズ' }, { id: 'check', num: '✓', title: '説明できるかチェック' }]
  const all = [...C.sections, ...extra]
  const tocItems = all.map((sec) => h('li', { 'data-id': sec.id }, h('a', { href: '#' + sec.id }, h('i'), h('span', `${sec.num}  ${sec.title.split('：')[0]}`))))
  const toc = h('aside.toc', h('div.toc-title', 'CONTENTS'), h('ol', tocFill, tocItems))
  const main = h('div.lec-main')
  for (const sec of C.sections) {
    const el = h('section.lsec', { id: sec.id },
      h('div.lsec-head', h('span.sn.reveal', sec.num), h('h2', kt(sec.title, '', 0, 22))),
      sec.blocks().map((b) => h('div.block', b)))
    main.append(el)
  }
  if (C.report) main.append(h('section.lsec#report', h('div.lsec-head', h('span.sn.reveal', { style: { background: 'var(--mint)' } }, 'ANSWER'), h('h2', kt(C.report.title, '', 0, 26))),
    C.report.blocks().map((b) => h('div.block', b))))
  main.append(h('section.lsec#quiz', h('div.lsec-head', h('span.sn.reveal', 'QUIZ'), h('h2', kt('類題クイズで確かめよう', '', 0, 30))),
    h('div.block', talk([['s', 'ここまでの内容から、試験にも出そうな類題を集めたよ。選んだらすぐ解説が出るからね。'], ['r', 'よーし、全問正解ねらいます！']])),
    h('div.block', quiz(L.no, C.quiz))))
  main.append(h('section.lsec#check', h('div.lsec-head', h('span.sn.reveal', 'CHECK'), h('h2', kt('次回までに、説明できるようにしておくこと', '', 0, 22))),
    h('div.block', checklist(L.no, C.checklist))))
  const i = LECTURES.indexOf(L)
  const prev = LECTURES[i - 1], next = LECTURES[i + 1]
  main.append(h('nav.lec-nav',
    prev ? h('a', { href: '/lec/' + prev.slug, 'data-link': '' }, h('small', '← PREV'), h('b', `第${prev.no}回 ${prev.title}`)) : h('a', { href: '/', 'data-link': '' }, h('small', '← HOME'), h('b', 'ホームへ')),
    next ? h('a.nx', { href: '/lec/' + next.slug, 'data-link': '' }, h('small', 'NEXT →'), h('b', `第${next.no}回 ${next.title}`)) : h('a.nx', { href: '/map', 'data-link': '' }, h('small', 'NEXT →'), h('b', '定理マップで全体を見る'))))
  app.append(h('div.wrap.lec-layout', { style: { paddingBottom: '60px' } }, toc, main))
  app.append(h('footer.foot', h('div.wrap.foot-in', h('p', `第${L.no}回：${L.title}`), h('p', '講義資料：古谷 倫貴 先生「グラフ・ネットワーク理論」'))))
  math(app)

  // ---------- toc spy ----------
  const secs = all.map((s) => document.getElementById(s.id))
  const spy = () => {
    let cur = 0
    secs.forEach((el, k) => { if (el && el.getBoundingClientRect().top < innerHeight * 0.4) cur = k })
    tocItems.forEach((li, k) => { li.classList.toggle('on', k === cur); li.classList.toggle('done', k < cur) })
    const a = tocItems[cur]?.querySelector('i'), first = tocItems[0].querySelector('i')
    if (a) tocFill.style.height = a.getBoundingClientRect().top - first.getBoundingClientRect().top + 'px'
  }
  addEventListener('scroll', spy, { passive: true }); setTimeout(spy, 300)
  return () => { removeEventListener('scroll', spy); killArt(); app.style.removeProperty('--c') }
}
