// Labs for Lecture 6 : multigraphs, Königsberg, Euler tours / trails, Hierholzer's algorithm
import { h, s, sleep, toast, tween, confetti } from '../lib/ui.js'
import { PAL } from '../lib/graph.js'
import { labFrame, readout, verdict, seg, sub } from '../lib/lab.js'

const W = 600, H = 380
const ECLS = ['hi', 'hi2', 'hi3', 'hi4', 'ghost', 'dim']

// =========================================================
//  MultiView — cute SVG renderer that supports multi-edges and loops
//  edges: [{ id, a, b, bend?, name? }]  bend = apex offset (px) / loop direction (deg)
// =========================================================
export class MultiView {
  constructor(host, opt = {}) {
    this.o = Object.assign({ w: W, h: H, r: 16, elabels: false }, opt)
    const { w, h: hh } = this.o
    this.svg = s('svg', { class: 'gv mv', viewBox: `0 0 ${w} ${hh}`, preserveAspectRatio: 'xMidYMid meet', role: 'img', 'aria-label': opt.aria || '多重グラフ' })
    this.gBack = s('g'); this.gEdge = s('g'); this.gLbl = s('g'); this.gNum = s('g'); this.gNode = s('g'); this.gTop = s('g')
    this.svg.append(this.gBack, this.gEdge, this.gLbl, this.gNum, this.gNode, this.gTop)
    host.append(this.svg)
    this.hd = {}; this.N = new Map(); this.E = new Map()
    this.svg.addEventListener('click', (ev) => {
      const v = ev.target.closest('.v'); if (v) { this.bounce(v.dataset.id); this.emit('node', v.dataset.id); return }
      const e = ev.target.closest('.eg'); if (e) { this.emit('edge', e.dataset.id); return }
      this.emit('bg')
    })
    if (opt.nodes) this.load(opt)
  }
  on(k, f) { (this.hd[k] ||= []).push(f); return this }
  emit(k, ...a) { (this.hd[k] || []).forEach((f) => f(...a)) }
  load({ nodes, edges, labels = {}, colors = {} }, anim = true) {
    this.gNode.innerHTML = ''; this.N.clear(); this.gTop.innerHTML = ''
    for (const [id, [x, y]] of Object.entries(nodes)) this._node(id, x, y, labels[id] ?? id, colors[id] || 'white')
    this.setEdges(edges, anim)
    if (anim) { let i = 0; for (const n of this.N.values()) n.el.animate([{ transform: `translate(${n.x}px,${n.y}px) scale(0)` }, { transform: `translate(${n.x}px,${n.y}px) scale(1)` }], { duration: 550, delay: i++ * 50, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'backwards' }) }
  }
  _node(id, x, y, label, color) {
    const r = this.o.r
    const g = s('g', { class: 'v', 'data-id': id, transform: `translate(${x},${y})`, tabindex: 0 })
    g.style.setProperty('--bd', (Math.random() * 4).toFixed(2) + 's')
    const ring = s('circle', { class: 'ring', r: r + 2 }), sq = s('g', { class: 'sq' })
    const body = s('circle', { class: 'body', r, fill: PAL[color] || color })
    const face = s('g', { class: 'face' })
    face.append(s('g', { class: 'eyes' }, s('circle', { class: 'eye', cx: -5, cy: -2, r: 2.2 }), s('circle', { class: 'eye', cx: 5, cy: -2, r: 2.2 })),
      s('ellipse', { class: 'cheek', cx: -9, cy: 4, rx: 3, ry: 2 }), s('ellipse', { class: 'cheek', cx: 9, cy: 4, rx: 3, ry: 2 }),
      s('path', { class: 'mouth', d: 'M-3 3.5 Q0 6.5 3 3.5', stroke: PAL.ink, 'stroke-width': 2, fill: 'none', 'stroke-linecap': 'round' }))
    sq.append(body, face)
    const lbl = s('text', { class: 'lbl', x: 0, y: r + 17, 'text-anchor': 'middle' }, label)
    const tagG = s('g', { class: 'tagg', transform: `translate(${r * 0.9},${-r * 0.9}) scale(0)`, style: 'transition:transform .45s cubic-bezier(.34,1.56,.64,1)' })
    const tagBg = s('rect', { class: 'tagbg', x: -11, y: -11, width: 22, height: 22, rx: 11 }), tag = s('text', { class: 'tag', x: 0, y: 4.5, 'text-anchor': 'middle' })
    tagG.append(tagBg, tag); g.append(ring, sq, lbl, tagG); this.gNode.append(g)
    this.N.set(id, { id, x, y, el: g, body, lbl, tagG, tagBg, tag, label })
  }
  setEdges(list, anim = false) {
    this.gEdge.innerHTML = ''; this.gLbl.innerHTML = ''; this.gNum.innerHTML = ''; this.E.clear()
    const grp = {}
    list.forEach((e) => { const k = [e.a, e.b].sort().join('|'); (grp[k] ||= []).push(e) })
    for (const g of Object.values(grp)) {
      const auto = g.filter((e) => e.bend == null && e.a !== e.b)
      auto.forEach((e, i) => { e._b = auto.length > 1 ? (i - (auto.length - 1) / 2) * 44 : 0 })
      g.forEach((e) => { if (e.bend != null) e._b = e.bend; else if (e.a === e.b) e._b = -90 })
    }
    for (const e of list) {
      const g = s('g', { class: 'eg', 'data-id': e.id })
      const line = s('path', { class: 'e', fill: 'none' }), hit = s('path', { class: 'e-hit', fill: 'none' })
      g.append(line, hit); this.gEdge.append(g)
      const lbl = this.o.elabels && e.name ? s('text', { class: 'etag', 'text-anchor': 'middle' }, e.name) : null
      if (lbl) this.gLbl.append(lbl)
      this.E.set(e.id, Object.assign(e, { el: g, line, hit, lbl, numEl: null }))
    }
    this.refresh()
    if (anim) { let j = 0; for (const e of this.E.values()) { const L = e.line.getTotalLength ? e.line.getTotalLength() || 100 : 100; e.line.animate([{ strokeDasharray: L, strokeDashoffset: L }, { strokeDasharray: L, strokeDashoffset: 0 }], { duration: 600, delay: 200 + j++ * 35, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards' }) } }
  }
  _geo(e) {
    const A = this.N.get(e.a), B = this.N.get(e.b)
    if (e.a === e.b) {
      const ang = (e._b * Math.PI) / 180, L = 82, sp = 0.55
      const c1 = [A.x + L * Math.cos(ang - sp), A.y + L * Math.sin(ang - sp)], c2 = [A.x + L * Math.cos(ang + sp), A.y + L * Math.sin(ang + sp)]
      return { d: `M${A.x},${A.y} C${c1} ${c2} ${A.x},${A.y}`, mid: [A.x + 0.75 * L * Math.cos(ang) * Math.cos(sp), A.y + 0.75 * L * Math.sin(ang) * Math.cos(sp)] }
    }
    const [P, Q] = e.a < e.b ? [A, B] : [B, A]
    const dx = Q.x - P.x, dy = Q.y - P.y, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len
    const mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2
    if (!e._b) return { d: `M${A.x},${A.y} L${B.x},${B.y}`, mid: [mx, my] }
    return { d: `M${A.x},${A.y} Q${mx + nx * e._b * 2},${my + ny * e._b * 2} ${B.x},${B.y}`, mid: [mx + nx * e._b, my + ny * e._b] }
  }
  refresh() {
    for (const n of this.N.values()) n.el.setAttribute('transform', `translate(${n.x},${n.y})`)
    for (const e of this.E.values()) {
      const { d, mid } = this._geo(e)
      e.line.setAttribute('d', d); e.hit.setAttribute('d', d); e.mid = mid
      if (e.lbl) { e.lbl.setAttribute('x', mid[0]); e.lbl.setAttribute('y', mid[1] - 7) }
      if (e.numEl) e.numEl.setAttribute('transform', `translate(${mid[0]},${mid[1]})`)
    }
  }
  morph(pos, dur = 900) {
    const from = new Map([...this.N.values()].map((n) => [n.id, [n.x, n.y]]))
    return tween(dur, (t) => { for (const [id, [x, y]] of Object.entries(pos)) { const n = this.N.get(id); if (!n) continue; const [fx, fy] = from.get(id); n.x = fx + (x - fx) * t; n.y = fy + (y - fy) * t } this.refresh() })
  }
  ids() { return [...this.N.keys()] }
  edgeIds() { return [...this.E.keys()] }
  specs() { return [...this.E.values()].map(({ id, a, b, bend, name }) => ({ id, a, b, bend, name })) }
  other(id, v) { const e = this.E.get(id); return e.a === v ? e.b : e.a }
  inc(v) { return [...this.E.values()].filter((e) => e.a === v || e.b === v).map((e) => e.id) }
  deg(v) { let d = 0; for (const e of this.E.values()) { if (e.a === v) d++; if (e.b === v) d++ } return d }
  color(id, c) { const n = this.N.get(id); if (n) n.body.setAttribute('fill', PAL[c] || c) }
  colorAll(c) { for (const id of this.N.keys()) this.color(id, c) }
  label(id, t) { const n = this.N.get(id); if (n) n.lbl.textContent = t }
  tag(id, text, bg) {
    const n = this.N.get(id); if (!n) return
    const r = this.o.r
    if (text == null || text === '') { n.tagG.setAttribute('transform', `translate(${r * 0.9},${-r * 0.9}) scale(0)`); return }
    n.tag.textContent = text
    const w = Math.max(22, String(text).length * 8.5 + 10)
    n.tagBg.setAttribute('width', w); n.tagBg.setAttribute('x', -w / 2); n.tagBg.style.fill = bg ? PAL[bg] || bg : ''
    n.tagG.setAttribute('transform', `translate(${r * 0.9},${-r * 0.9}) scale(1)`)
  }
  ecls(id, cls, on = true) { const e = this.E.get(id); if (e) e.line.classList.toggle(cls, on) }
  num(id, n, bg = PAL.lemon) {
    const e = this.E.get(id); if (!e) return
    if (e.numEl) e.numEl.remove()
    const g = s('g', { class: 'enum', transform: `translate(${e.mid[0]},${e.mid[1]})` }, s('circle', { r: 10, style: `fill:${bg}` }), s('text', { y: 4, 'text-anchor': 'middle' }, String(n)))
    this.gNum.append(g); e.numEl = g
    g.animate([{ opacity: 0, transform: `translate(${e.mid[0]}px,${e.mid[1]}px) scale(0)` }, { opacity: 1, transform: `translate(${e.mid[0]}px,${e.mid[1]}px) scale(1)` }], { duration: 380, easing: 'cubic-bezier(.34,1.56,.64,1)' })
  }
  reset() {
    for (const e of this.E.values()) { e.line.classList.remove(...ECLS); e.numEl = null }
    this.gNum.innerHTML = ''; this.gTop.innerHTML = ''
    for (const id of this.N.keys()) { this.tag(id, null); this.N.get(id).el.classList.remove('sel', 'dim') }
  }
  nodeClass(id, cls, on = true) { const n = this.N.get(id); if (n) n.el.classList.toggle(cls, on) }
  bounce(id) { const n = this.N.get(id); if (!n) return; n.el.classList.remove('bounce'); requestAnimationFrame(() => { n.el.classList.add('bounce'); setTimeout(() => n.el.classList.remove('bounce'), 600) }) }
  pulse(id, color = PAL.pink) {
    const n = this.N.get(id); if (!n) return
    const c = s('circle', { cx: n.x, cy: n.y, r: this.o.r, fill: 'none', stroke: color, 'stroke-width': 4 })
    this.gTop.append(c)
    c.animate([{ r: this.o.r, opacity: 1 }, { r: this.o.r * 2.8, opacity: 0 }], { duration: 700, easing: 'cubic-bezier(.22,1,.36,1)' }).onfinish = () => c.remove()
  }
  travel(id, from, color = PAL.pink, dur = 380) {
    const e = this.E.get(id), L = e.line.getTotalLength(), rev = e.a !== e.b && from !== e.a
    const c = s('circle', { r: 7, fill: color, stroke: PAL.ink, 'stroke-width': 2.5 }); this.gTop.append(c)
    return tween(dur, (t) => { const p = e.line.getPointAtLength((rev ? 1 - t : t) * L); c.setAttribute('cx', p.x); c.setAttribute('cy', p.y) }).then(() => c.remove())
  }
}

// ---------- algorithms on multigraphs ({id,a,b} edges) ----------
export const mkE = (list, names = false) => list.map(([a, b, bend], i) => ({ id: 'e' + (i + 1), a, b, bend, name: names ? sub('e' + (i + 1)) : undefined }))
export function incMap(V, E) { const m = new Map(V.map((v) => [v, []])); E.forEach((e) => { m.get(e.a).push(e.id); if (e.b !== e.a) m.get(e.b).push(e.id) }); return m }
export function degrees(V, E) { const d = Object.fromEntries(V.map((v) => [v, 0])); E.forEach((e) => { d[e.a]++; d[e.b]++ }); return d }
export function connected(V, E) {
  if (!V.length) return true
  const inc = incMap(V, E), em = new Map(E.map((e) => [e.id, e])), seen = new Set([V[0]]), st = [V[0]]
  while (st.length) { const u = st.pop(); for (const id of inc.get(u)) { const e = em.get(id), w = e.a === u ? e.b : e.a; if (!seen.has(w)) { seen.add(w); st.push(w) } } }
  return seen.size === V.length
}
// Hierholzer (stack version, O(|E|)) — returns {V:[...], E:[...]} or null
export function eulerTrail(V, E, start, firstEdge) {
  const inc = incMap(V, E), em = new Map(E.map((e) => [e.id, e])), used = new Set(), ptr = new Map(V.map((v) => [v, 0]))
  if (firstEdge) { const l = inc.get(start); l.splice(l.indexOf(firstEdge), 1); l.unshift(firstEdge) }
  const st = [[start, null]], out = []
  while (st.length) {
    const [v] = st[st.length - 1], l = inc.get(v)
    let p = ptr.get(v); while (p < l.length && used.has(l[p])) p++; ptr.set(v, p)
    if (p < l.length) { const id = l[p]; used.add(id); const e = em.get(id); st.push([e.a === v ? e.b : e.a, id]) } else out.push(st.pop())
  }
  out.reverse()
  if (out.length - 1 !== E.length) return null
  return { V: out.map((x) => x[0]), E: out.slice(1).map((x) => x[1]) }
}
// extend a trail greedily from u through unused edges (theorem 6.2)
export function trailFrom(u, inc, em, used, rnd = false) {
  const V = [u], Es = []; let cur = u
  for (;;) {
    const cand = inc.get(cur).filter((id) => !used.has(id)); if (!cand.length) break
    const id = rnd ? cand[Math.floor(Math.random() * cand.length)] : cand[0]
    used.add(id); Es.push(id); const e = em.get(id); cur = e.a === cur ? e.b : e.a; V.push(cur)
  }
  return { V, E: Es }
}
function judge(V, E) {
  const d = degrees(V, E), odd = V.filter((v) => d[v] % 2), con = connected(V.filter((v) => d[v] > 0 || V.length === 1), E)
  const kind = !con ? 'disc' : odd.length === 0 ? 'euler' : odd.length === 2 ? 'semi' : 'none'
  return { d, odd, kind }
}
const KIND_TXT = {
  euler: ['奇点 0 個 → オイラー周遊あり（定理 6.1）。どこから出発しても、元の頂点に戻る一筆書きができる', 'ok'],
  semi: ['奇点ちょうど 2 個 → 準オイラー周遊あり（系 6.1.1）。片方の奇点から出発し、もう片方で終わる', 'ok'],
  none: ['奇点が 4 個以上 → 一筆書きは不可能', 'ng'],
  disc: ['非連結 → 一筆書きは不可能', 'ng'],
}

// =========================================================
// LAB 6-1 : 多重グラフ (V, E, φ)
// =========================================================
export function labMulti() {
  const f = labFrame({ title: '多重グラフ G = (V, E, φ)：辺それぞれに “名前” がある世界', hint: '辺をタップすると接続関数 $\\varphi$ の値が光ります。頂点を 2 つ順にタップすると<b>辺を追加</b>（同じ 2 点でも OK → 多重辺）。「ループ」は選んだ頂点から出て同じ頂点に戻る辺。次数ではループを <b>2</b> と数えるのがルールです。', color: 'lemon', no: '6-1' })
  const pos = { 1: [210, 75], 2: [210, 305], 3: [410, 190] }
  const INIT = () => [{ id: 'a', a: '1', b: '2', name: 'a' }, { id: 'b', a: '1', b: '2', name: 'b' }, { id: 'c', a: '1', b: '3', name: 'c' }, { id: 'd', a: '2', b: '3', name: 'd' }, { id: 'e', a: '3', b: '3', name: 'e', bend: 0 }]
  let E = INIT(), sel = null, pick = null
  const mv = new MultiView(f.canvas, { elabels: true })
  const tbl = h('div.maptbl.phi-tbl'), rd = readout('次数（ループは 2 と数える）'), rs = readout('握手補題'), vd = verdict('', 'mid')
  f.side.append(h('div.readout', h('div.ro-k', '接続関数 φ'), tbl), rd, rs, vd)
  const NAMES = 'abcdefghijklmnopqrstuvwxyz'
  const nextName = () => NAMES.split('').find((c) => !E.some((e) => e.id === c)) || 'z' + E.length
  function paint() {
    mv.reset()
    mv.ids().forEach((v) => { mv.color(v, v === sel ? 'lemon' : 'white'); mv.nodeClass(v, 'sel', v === sel) })
    if (pick) mv.ecls(pick, 'hi')
    tbl.innerHTML = ''
    E.forEach((e) => tbl.append(h('span' + (e.id === pick ? '.on' : ''), { onclick: () => { pick = e.id; paint() } }, `φ(${e.name}) = {${e.a === e.b ? e.a : [e.a, e.b].sort().join(',')}}`)))
    const ds = mv.ids().map((v) => [v, mv.deg(v)])
    rd.set(ds.map(([v, d]) => `deg(${v}) = ${d}`).join('　'))
    const sum = ds.reduce((t, [, d]) => t + d, 0)
    rs.set(`Σ deg = ${sum} = 2 × |E| = 2 × ${E.length} ✓`)
    const loops = E.filter((e) => e.a === e.b).length
    const cnt = {}; E.filter((e) => e.a !== e.b).forEach((e) => { const k = [e.a, e.b].sort().join(); cnt[k] = (cnt[k] || 0) + 1 })
    const multi = Object.values(cnt).filter((c) => c > 1).length
    if (pick) { const e = E.find((x) => x.id === pick); vd.set(e.a === e.b ? `${e.name} はループ：端点は ${e.a} だけ。deg(${e.a}) に 2 を足す` : `${e.name} の端点は ${e.a} と ${e.b}${cnt[[e.a, e.b].sort().join()] > 1 ? '（同じ端点の辺が他にもある → 多重辺）' : ''}`, 'mid') }
    else vd.set(!loops && !multi ? '多重辺もループもない → <b>単純グラフ</b>（これまでの “グラフ”）' : `多重辺の組 ${multi}・ループ ${loops} 本 → 単純グラフではない`, !loops && !multi ? 'ok' : 'mid')
  }
  function rebuild() { mv.setEdges(E); paint() }
  mv.on('edge', (id) => { pick = pick === id ? null : id; paint() })
  mv.on('node', (v) => {
    if (sel && sel !== v) { const id = nextName(); E.push({ id, a: sel, b: v, name: id }); toast(`辺 ${id} を追加：φ(${id}) = {${[sel, v].sort().join(',')}}`); sel = null; pick = id; rebuild(); return }
    sel = sel === v ? null : v; paint(); mv.pulse(v, PAL.lemon)
  })
  mv.on('bg', () => { sel = null; pick = null; paint() })
  const addLoop = () => {
    if (!sel) { toast('まず頂点をタップして選んでね'); return }
    const k = E.filter((e) => e.a === sel && e.b === sel).length, id = nextName()
    const base = { 1: -90, 2: 90, 3: 0 }[sel] ?? -90
    E.push({ id, a: sel, b: sel, name: id, bend: base + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 70 }); pick = id; sel = null; rebuild()
  }
  const del = () => { if (!pick) { toast('消す辺をタップしてね'); return } E = E.filter((e) => e.id !== pick); pick = null; rebuild() }
  const simp = () => { const seen = new Set(); E = E.filter((e) => { if (e.a === e.b) return false; const k = [e.a, e.b].sort().join(); if (seen.has(k)) return false; seen.add(k); return true }); pick = null; rebuild(); toast('多重辺を 1 本にまとめ、ループを消した → 単純グラフ') }
  f.ctrl.append(h('button.btn.sm.lm', { onclick: addLoop }, '➰ ループを足す'), h('button.btn.sm', { onclick: del }, '🧽 選んだ辺を消す'), h('button.btn.sm.mt', { onclick: simp }, '✨ 単純グラフにする'),
    h('button.btn.sm', { onclick: () => { E = INIT(); sel = null; pick = null; rebuild() } }, 'リセット（例 6.1）'))
  mv.load({ nodes: pos, edges: E })
  paint()
  return f.el
}

// =========================================================
// LAB 6-2 : ケーニヒスベルクの橋
// =========================================================
export function labKonig() {
  const f = labFrame({ title: 'ケーニヒスベルクの 7 つの橋：地図 → 多重グラフ', hint: '陸地を頂点、橋を辺と見なすと、同じ 2 つの陸地を結ぶ橋が 2 本ある → <b>多重辺</b>が必要。「グラフに変身」で地図が多重グラフになります。「渡ってみる」は、まだ渡っていない橋をランダムに選んで歩き続けるシミュレーション。', color: 'sky', no: '6-2' })
  const LBL = { N: '北岸', S: '南岸', A: '島', D: '東' }
  const mapPos = { N: [300, 40], A: [195, 190], D: [478, 190], S: [300, 340] }
  const grPos = { N: [300, 60], A: [190, 190], D: [430, 190], S: [300, 320] }
  const E = [{ id: 'b1', a: 'A', b: 'N', bend: 34 }, { id: 'b2', a: 'A', b: 'N', bend: -34 }, { id: 'b3', a: 'A', b: 'S', bend: 34 }, { id: 'b4', a: 'A', b: 'S', bend: -34 }, { id: 'b5', a: 'A', b: 'D' }, { id: 'b6', a: 'D', b: 'N' }, { id: 'b7', a: 'D', b: 'S' }]
  const mv = new MultiView(f.canvas, {})
  const rd = readout('各陸地の次数（橋の本数）'), ro = readout('奇点'), vd = verdict('', 'mid'), rw = readout('歩いた記録')
  f.side.append(rd, ro, vd, rw)
  const river = s('g', { class: 'river' })
  const band = (d) => s('path', { d, fill: 'none', stroke: '#BFE3FF', 'stroke-width': 34, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })
  river.append(band('M-30,112 L630,112'), band('M-30,268 L630,268'), band('M40,112 L40,268'), band('M350,112 L350,268'))
  let mode = 'map', busy = false
  function base() {
    mv.reset()
    const V = mv.ids(), sp = mv.specs(), { d, odd } = judge(V, sp)
    V.forEach((v) => { mv.color(v, d[v] % 2 ? 'pink' : 'mint'); mv.tag(v, d[v], d[v] % 2 ? 'pink' : 'mint') })
    rd.set(V.map((v) => `${LBL[v]}：${d[v]}`).join('　'))
    ro.set(`${odd.map((v) => LBL[v]).join('・')}（${odd.length} 個）`)
    vd.set(`奇点が ${odd.length} 個 → オイラー周遊も準オイラー周遊も存在しない。<b>すべての橋を 1 回ずつ渡ることは不可能</b>`, 'ng')
  }
  async function morph() {
    if (busy) return; busy = true
    if (mode === 'map') { river.animate([{ opacity: 1 }, { opacity: 0.12 }], { duration: 700, fill: 'forwards' }); await mv.morph(grPos, 900); mode = 'graph' }
    else { river.animate([{ opacity: 0.12 }, { opacity: 1 }], { duration: 700, fill: 'forwards' }); await mv.morph(mapPos, 900); mode = 'map' }
    busy = false
  }
  async function walk() {
    if (busy) return; busy = true; base()
    const V = mv.ids(), sp = mv.specs(), inc = incMap(V, sp), em = new Map(sp.map((e) => [e.id, e]))
    const start = V[Math.floor(Math.random() * V.length)]
    const T = trailFrom(start, inc, em, new Set(), true)
    mv.tag(start, 'S', 'lemon')
    for (let i = 0; i < T.E.length; i++) { await mv.travel(T.E[i], T.V[i], PAL.lemon, 330); mv.ecls(T.E[i], 'hi'); mv.num(T.E[i], i + 1) }
    const rest = sp.length - T.E.length
    rw.set(`${T.V.map((v) => LBL[v]).join(' → ')}<br>渡った橋 ${T.E.length} 本 ／ 残り <b>${rest}</b> 本`)
    sp.filter((e) => !T.E.includes(e.id)).forEach((e) => mv.ecls(e.id, 'ghost'))
    mv.pulse(T.V[T.V.length - 1], PAL.ink)
    vd.set(`${LBL[T.V[T.V.length - 1]]} で行き止まり！ 何度やっても全部は渡れない（奇点が 4 つあるから）`, 'ng')
    busy = false
  }
  f.ctrl.append(h('button.btn.sm.sk', { onclick: morph }, '🗺️ グラフに変身 ⇄ 地図'), h('button.btn.sm.lm', { onclick: walk }, '🚶 渡ってみる'), h('button.btn.sm', { onclick: () => { if (!busy) { base(); rw.set('—') } } }, 'リセット'))
  mv.load({ nodes: mapPos, edges: E, labels: LBL })
  mv.gBack.append(river)
  base(); rw.set('—')
  return f.el
}

// =========================================================
// LAB 6-3 : 一筆書きプレイグラウンド
// =========================================================
const P63 = {
  a: { pos: { tl: [170, 60], tr: [430, 60], bl: [170, 320], br: [430, 320], o: [300, 190] }, E: [['tl', 'tr'], ['bl', 'br'], ['tl', 'o'], ['o', 'br'], ['tr', 'o'], ['o', 'bl'], ['tl', 'bl', 40], ['tl', 'bl', -40], ['tr', 'br', 40], ['tr', 'br', -40]] },
  b: { pos: { tl: [170, 60], tr: [430, 60], bl: [170, 320], br: [430, 320], o: [300, 190] }, E: [['tl', 'tr'], ['bl', 'br'], ['tl', 'o'], ['o', 'br'], ['tr', 'o'], ['o', 'bl'], ['tl', 'bl', 40], ['tl', 'bl', -40], ['tr', 'br']] },
  c: { pos: { tl: [170, 60], tr: [430, 60], bl: [170, 320], br: [430, 320], o: [300, 190] }, E: [['tl', 'tr'], ['bl', 'br'], ['tl', 'o'], ['o', 'br'], ['tr', 'o'], ['o', 'bl'], ['tl', 'bl'], ['tr', 'br']] },
  kon: { pos: { N: [300, 55], A: [190, 190], D: [440, 190], S: [300, 325] }, E: [['A', 'N', 34], ['A', 'N', -34], ['A', 'S', 34], ['A', 'S', -34], ['A', 'D'], ['D', 'N'], ['D', 'S']] },
  house: { pos: { a: [300, 40], b: [190, 140], c: [410, 140], d: [190, 320], e: [410, 320] }, E: [['a', 'b'], ['a', 'c'], ['b', 'c'], ['b', 'd'], ['c', 'e'], ['d', 'e'], ['b', 'e'], ['c', 'd']] },
}
export function labDraw() {
  const f = labFrame({ title: '一筆書きチャレンジ：まず奇点を数えよ', hint: '頂点をタップして出発点を決め、<b>いまいる頂点につながる辺</b>を順にタップして一筆書き。どの図が描けるかは、描く前に<b>奇点の個数</b>でわかります（定理 6.1・系 6.1.1）。「おまかせ」は Hierholzer のアルゴリズムで自動で描きます。', color: 'pink', no: '6-3' })
  const mv = new MultiView(f.canvas, {})
  const rj = readout('判定（描く前にわかる！）'), rp = readout('進み具合'), vd = verdict('', 'mid')
  f.side.append(rj, vd, rp)
  let key = 'a', cur = null, start = null, used = [], busy = false
  function load(k) { key = k; mv.load({ nodes: P63[k].pos, edges: mkE(P63[k].E), labels: Object.fromEntries(Object.keys(P63[k].pos).map((v) => [v, ''])) }); restart() }
  function info() {
    const { d, odd, kind } = judge(mv.ids(), mv.specs())
    mv.ids().forEach((v) => { if (!used.length && v !== start) mv.color(v, d[v] % 2 ? 'pink' : 'white'); mv.tag(v, d[v], d[v] % 2 ? 'pink' : null) })
    rj.set(`奇点 ${odd.length} 個：${KIND_TXT[kind][0]}`)
    return { odd, kind }
  }
  function restart() { mv.reset(); cur = null; start = null; used = []; info(); rp.set(`0 / ${mv.E.size} 本`); vd.set('出発点の頂点をタップしてね（ピンク＝奇点）', 'mid') }
  async function step(id) {
    const from = cur
    used.push(id); cur = mv.other(id, cur)
    mv.ecls(id, 'hi'); mv.num(id, used.length)
    await mv.travel(id, from, PAL.pink, 300)
    mv.colorAll('white'); mv.color(start, 'lemon'); mv.color(cur, 'pink'); mv.nodeClass(cur, 'sel'); mv.ids().forEach((v) => v !== cur && mv.nodeClass(v, 'sel', false))
    rp.set(`${used.length} / ${mv.E.size} 本`)
    if (used.length === mv.E.size) { vd.set(cur === start ? '🎉 完成！ 出発点に戻った → <b>オイラー周遊</b>' : `🎉 完成！ 出発点と終点が違う → <b>準オイラー周遊</b>`, 'ok'); confetti(); return }
    if (!mv.inc(cur).some((x) => !used.includes(x))) vd.set(`行き止まり… 残り ${mv.E.size - used.length} 本。${judge(mv.ids(), mv.specs()).kind === 'none' ? 'この図はそもそも描けない！' : '出発点や順番を変えてみよう'}`, 'ng')
    else vd.set('いいね、その調子', 'mid')
  }
  mv.on('node', (v) => { if (busy || used.length) return; start = cur = v; mv.colorAll('white'); mv.color(v, 'lemon'); mv.nodeClass(v, 'sel'); mv.tag(v, 'S', 'lemon'); vd.set('つながっている辺をタップして進もう', 'mid') })
  mv.on('edge', async (id) => {
    if (busy) return
    if (!cur) { toast('まず出発点の頂点をタップ'); return }
    if (used.includes(id)) { toast('その辺はもう通ったよ'); return }
    if (!mv.inc(cur).includes(id)) { toast('いまいる頂点につながる辺を選んでね'); return }
    busy = true; await step(id); busy = false
  })
  async function auto() {
    if (busy) return
    const V = mv.ids(), sp = mv.specs(), { odd, kind } = judge(V, sp)
    if (kind === 'none' || kind === 'disc') { odd.forEach((v) => mv.pulse(v, PAL.pink)); toast('この図は一筆書きできません（奇点が多すぎる）'); vd.set(KIND_TXT[kind][0], 'ng'); return }
    busy = true; restart()
    start = cur = odd[0] || V[0]
    const T = eulerTrail(V, sp, start)
    mv.color(start, 'lemon'); mv.tag(start, 'S', 'lemon')
    for (const id of T.E) await step(id)
    busy = false
  }
  f.ctrl.append(seg(['例6.4 上', '例6.4 左下', '例6.4 右下', '橋', '家'], (i) => { if (!busy) load(['a', 'b', 'c', 'kon', 'house'][i]) }),
    h('button.btn.sm.pk', { onclick: auto }, '🪄 おまかせ'), h('button.btn.sm', { onclick: () => { if (!busy) { mv.reset(); restart() } } }, '↺ やり直し'))
  load('a')
  return f.el
}

// =========================================================
// LAB 6-4 : Hierholzer のアルゴリズム（例 6.5）
// =========================================================
export function labHier() {
  const f = labFrame({ title: 'Hierholzer のアルゴリズム：閉小径を “差し込んで” 育てる', hint: '「つぎへ」を押すたびに 1 ステップ進みます。① $x$ から延ばせるだけ延ばす（定理 6.2 により必ず $x$ で止まる）→ ② $W$ 上で未使用の辺に触れている頂点 $u$ をとり、残りの辺で閉小径 $W\'$ を作る（青）→ ③ $W$ の $u$ のところに $W\'$ を差し込む。全部の辺を使ったら完成！', color: 'mint', no: '6-4' })
  const X = 112, Y = 98
  const pos = { x: [190 + X, 40], t: [190 + 2 * X, 40], l1: [190, 40 + Y], m1: [190 + X, 40 + Y], m2: [190 + 2 * X, 40 + Y], r1: [190 + 3 * X, 40 + Y], l2: [190, 40 + 2 * Y], n1: [190 + X, 40 + 2 * Y], n2: [190 + 2 * X, 40 + 2 * Y], r2: [190 + 3 * X, 40 + 2 * Y], b1: [190 + X, 40 + 3 * Y], b2: [190 + 2 * X, 40 + 3 * Y] }
  for (const k in pos) pos[k][0] -= 58
  const LB = { x: 'x', t: 'a', m2: 'b', m1: 'c', l1: 'd', l2: 'e', n1: 'f', r1: 'g', r2: 'h', n2: 'i', b1: 'j', b2: 'k' }
  const EL = [['x', 't'], ['x', 'm1'], ['t', 'm2'], ['m2', 'm1'], ['m2', 'r1'], ['m2', 'n2'], ['m1', 'l1'], ['m1', 'n1'], ['l1', 'l2'], ['l2', 'n1'], ['n1', 'b1'], ['n1', 'n2'], ['r1', 'r2'], ['r2', 'n2'], ['b1', 'b2'], ['b2', 'n2']]
  const E = mkE(EL), V = Object.keys(pos), inc = incMap(V, E), em = new Map(E.map((e) => [e.id, e]))
  const mv = new MultiView(f.canvas, { r: 15 })
  const rs = readout('いまのステップ'), rw = readout('W（閉小径）'), rc = readout('使った辺'), vd = verdict('', 'mid')
  f.side.append(rs, vd, rw, rc)
  let used, Wc, Wp, it, busy = false, rnd = false
  const fmt = (Vs) => Vs.map((v) => LB[v]).join('→')
  function paint() {
    mv.reset(); mv.colorAll('white'); mv.color('x', 'pink'); mv.tag('x', 'x', 'pink')
    if (Wc) Wc.E.forEach((id, i) => { mv.ecls(id, 'hi'); mv.num(id, i + 1) })
    if (Wp) Wp.E.forEach((id) => mv.ecls(id, 'hi3'))
    rc.set(`${used.size} / ${E.length} 本`)
  }
  function init() { used = new Set(); Wc = null; Wp = null; it = 0; paint(); rs.set('「つぎへ」で開始'); rw.set('—'); vd.set('すべての頂点が偶点の連結グラフ → オイラー周遊があるはず。作ってみよう', 'mid') }
  async function anim(T, col, cls) { for (let i = 0; i < T.E.length; i++) { await mv.travel(T.E[i], T.V[i], col, 260); mv.ecls(T.E[i], cls) } }
  async function next() {
    if (busy) return; busy = true
    try {
      if (!Wc) {
        const T = trailFrom('x', inc, em, used, rnd)
        paint(); rs.set('① x から未使用の辺を選んで、延ばせるだけ延ばす')
        await anim(T, PAL.pink, 'hi'); Wc = T; paint()
        rw.set(fmt(Wc.V)); vd.set(`止まったのは ${LB[T.V[T.V.length - 1]]}！ 定理 6.2 のとおり x に戻ってきた（閉小径）`, 'ok')
      } else if (Wp) {
        const i = Wp.i
        Wc = { V: [...Wc.V.slice(0, i), ...Wp.V, ...Wc.V.slice(i + 1)], E: [...Wc.E.slice(0, i), ...Wp.E, ...Wc.E.slice(i)] }
        Wp = null; it++; paint()
        rs.set(`③ W の ${LB[Wc.V[i]]} のところに W′ を差し込む（${it} 回目）`)
        rw.set(fmt(Wc.V))
        if (used.size === E.length) { vd.set(`完成！ 全 ${E.length} 本を通る閉小径 → オイラー周遊。番号順にたどってみよう`, 'ok'); confetti(); for (let k = 0; k < Wc.E.length; k++) await mv.travel(Wc.E[k], Wc.V[k], PAL.pink, 140) }
        else vd.set('まだ使っていない辺がある → while ループを続ける', 'mid')
      } else {
        if (used.size === E.length) { toast('もう完成しているよ（リセットでもう一度）'); return }
        const i = Wc.V.findIndex((v) => inc.get(v).some((id) => !used.has(id))), u = Wc.V[i]
        paint(); mv.tag(u, 'u', 'sky'); mv.pulse(u, PAL.sky)
        rs.set(`② W 上で未使用の辺に触れる頂点 u = ${LB[u]} から、G − E(W) の閉小径 W′ を作る`)
        await sleep(400)
        const T = trailFrom(u, inc, em, used, rnd); T.i = i
        await anim(T, PAL.sky, 'hi3'); Wp = T; paint(); mv.tag(u, 'u', 'sky')
        rw.set(`${fmt(Wc.V)}<br><b style="color:var(--sky-d)">W′ = ${fmt(T.V)}</b>`)
        vd.set(`G − E(W) でも全頂点が偶点なので、W′ も ${LB[u]} に戻ってくる`, 'ok')
      }
    } finally { busy = false }
  }
  f.ctrl.append(h('button.btn.sm.mt', { onclick: next }, '▶ つぎへ'), h('button.btn.sm.lm', { onclick: async () => { if (busy) return; while (used.size < E.length || Wp) { await next(); await sleep(350) } } }, '⏩ 最後まで'),
    seg(['決まった順に選ぶ', 'ランダムに選ぶ'], (i) => { rnd = !!i; if (!busy) init() }), h('button.btn.sm', { onclick: () => { if (!busy) init() } }, 'リセット'))
  mv.load({ nodes: pos, edges: E, labels: LB })
  init()
  return f.el
}

// =========================================================
// 解答 LAB : p.21 やってみよう（一筆書き）
// =========================================================
export const EX21 = {
  pos: { a: [130, 55], b: [310, 55], c: [490, 55], d: [130, 245], e: [310, 245], f: [490, 245], p: [223, 150] },
  E: [['a', 'b'], ['b', 'c'], ['a', 'd'], ['d', 'e', -34], ['d', 'e', 34], ['e', 'f'], ['a', 'p'], ['p', 'd'], ['p', 'b', 24], ['p', 'b', -24], ['a', 'e', -52], ['b', 'f'], ['e', 'c'], ['c', 'f', 32], ['c', 'f', -32]],
  SOL: ['e1', 'e3', 'e4', 'e11', 'e7', 'e9', 'e2', 'e13', 'e5', 'e8', 'e10', 'e12', 'e14', 'e15', 'e6'],
}
export function labEulerAnswer() {
  const f = labFrame({ title: '解答：奇点 b と e をつなぐ一筆書き（準オイラー周遊）', hint: '① 次数を数えて奇点を見つける → ② 奇点 $b$ から出発して描く → ③ 系 6.1.1 の証明どおり、仮の辺 $be$ を足してオイラー周遊を作り、最後にその辺を取り除く方法でも作れます。', color: 'sky', no: 'A6' })
  const mv = new MultiView(f.canvas, { h: 330 })
  const rd = readout('次数'), rp = readout('一筆書きの順序'), vd = verdict('', 'mid')
  f.side.append(rd, vd, rp)
  const E0 = mkE(EX21.E, true)
  let busy = false
  function load(extra = false) { mv.load({ nodes: EX21.pos, edges: extra ? [...mkE(EX21.E, true), { id: 'z', a: 'b', b: 'e', bend: 70, name: '仮' }] : mkE(EX21.E, true) }, false) }
  async function degs() {
    if (busy) return; load(); mv.reset()
    const d = degrees(mv.ids(), mv.specs())
    for (const v of mv.ids()) { mv.tag(v, d[v], d[v] % 2 ? 'pink' : 'mint'); mv.color(v, d[v] % 2 ? 'pink' : 'white'); if (d[v] % 2) mv.pulse(v); await sleep(120) }
    rd.set(mv.ids().map((v) => `${v}:${d[v]}`).join('　'))
    vd.set('奇点は b, e のちょうど 2 個（連結）→ 系 6.1.1 より準オイラー周遊がある。<b>b か e から出発</b>しないと描けない', 'ok')
  }
  async function draw(T, col = PAL.pink) {
    for (let i = 0; i < T.E.length; i++) { await mv.travel(T.E[i], T.V[i], col, 300); mv.ecls(T.E[i], T.E[i] === 'z' ? 'ghost' : 'hi'); mv.num(T.E[i], T.E[i] === 'z' ? '仮' : i + (T.off || 0) + 1) }
  }
  async function sol() {
    if (busy) return; busy = true; load(); mv.reset(); mv.color('b', 'lemon'); mv.color('e', 'pink'); mv.tag('b', 'S', 'lemon'); mv.tag('e', 'G', 'pink')
    const Vs = ['b']; EX21.SOL.forEach((id) => Vs.push(mv.other(id, Vs[Vs.length - 1])))
    await draw({ V: Vs, E: EX21.SOL })
    rp.set(Vs.join(' → '))
    vd.set('15 本すべてをちょうど 1 回ずつ通って、b から e へ。準オイラー周遊の完成！', 'ok'); confetti(); busy = false
  }
  async function viaProof() {
    if (busy) return; busy = true; load(true); mv.reset()
    mv.ecls('z', 'ghost'); mv.color('b', 'pink'); mv.color('e', 'pink')
    vd.set('仮の辺（点線）を足すと、b も e も偶点に → すべて偶点の連結多重グラフ G′', 'mid'); await sleep(1100)
    const sp = mv.specs(), T = eulerTrail(mv.ids(), sp, 'e', 'z')
    await draw(T, PAL.sky)
    vd.set('G′ のオイラー周遊（e → 仮の辺 → b → … → e）ができた。最初の仮の辺を取り除くと…', 'mid'); await sleep(1300)
    const Tb = { V: T.V.slice(1), E: T.E.slice(1) }
    load(); mv.reset(); mv.tag('b', 'S', 'lemon'); mv.tag('e', 'G', 'pink'); mv.color('b', 'lemon'); mv.color('e', 'pink')
    await draw(Tb)
    rp.set(Tb.V.join(' → '))
    vd.set('b から e への準オイラー周遊！（系 6.1.1 の (2)⇒(1) の証明そのもの）', 'ok'); busy = false
  }
  f.ctrl.append(h('button.btn.sm.lm', { onclick: degs }, '① 次数を数える'), h('button.btn.sm.pk', { onclick: sol }, '② b から一筆書き'), h('button.btn.sm.sk', { onclick: viaProof }, '③ 系 6.1.1 の方法で'),
    h('button.btn.sm', { onclick: () => { if (!busy) { load(); mv.reset(); rd.set('—'); rp.set('—'); vd.set('①〜③を押してね', 'mid') } } }, 'リセット'))
  mv.load({ nodes: EX21.pos, edges: E0 })
  rd.set('—'); rp.set('—'); vd.set('①〜③を押してね', 'mid')
  return f.el
}
