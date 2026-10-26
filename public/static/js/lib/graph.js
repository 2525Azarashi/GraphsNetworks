// =========================================================
//  GraphView — cute, animated, editable SVG graph renderer
// =========================================================
import { s, clamp, tween, ease, easeSpring } from './ui.js'

export const PAL = {
  pink: '#FF8FB1', mint: '#6FD6BC', lemon: '#FFD66B', lav: '#B9A6FF', sky: '#8EC9FF', peach: '#FFB38A',
  white: '#FFFDF8', gray: '#E4E1EE', ink: '#2B2A4C',
}
export const PCYCLE = ['pink', 'mint', 'lemon', 'lav', 'sky', 'peach']
export const ek = (a, b) => (String(a) < String(b) ? `${a}|${b}` : `${b}|${a}`)

let UID = 0

export class GraphView {
  constructor(host, opt = {}) {
    this.opt = Object.assign({ w: 600, h: 380, r: 17, editable: false, faces: true, labels: true, mode: 'move', color: 'white', pad: 26 }, opt)
    this.uid = ++UID
    this.nodes = new Map()   // id -> {id,x,y,label,color,el,...}
    this.edges = new Map()   // key -> {a,b,el,line}
    this.handlers = {}
    this.mode = this.opt.mode
    const { w, h } = this.opt
    this.svg = s('svg', { class: 'gv', viewBox: `0 0 ${w} ${h}`, preserveAspectRatio: 'xMidYMid meet', role: 'img', 'aria-label': opt.aria || 'グラフ' })
    this.gBack = s('g'); this.gEdge = s('g'); this.gOver = s('g'); this.gNode = s('g'); this.gTop = s('g')
    this.svg.append(this.gBack, this.gEdge, this.gOver, this.gNode, this.gTop)
    host.append(this.svg)
    this._bind()
    if (opt.nodes) opt.nodes.forEach((n) => this.addNode(n, true))
    if (opt.edges) opt.edges.forEach(([a, b]) => this.addEdge(a, b, true))
  }
  on(ev, fn) { (this.handlers[ev] ||= []).push(fn); return this }
  emit(ev, ...a) { (this.handlers[ev] || []).forEach((f) => f(...a)) }

  // ---------- model ----------
  addNode(n, silent) {
    const id = n.id ?? this._nextId()
    if (this.nodes.has(id)) return this.nodes.get(id)
    const node = { id, x: n.x ?? this.opt.w / 2, y: n.y ?? this.opt.h / 2, label: n.label ?? String(id), color: n.color || this.opt.color }
    const r = this.opt.r
    const g = s('g', { class: 'v', 'data-id': id, transform: `translate(${node.x},${node.y})`, tabindex: this.opt.editable || this.opt.clickable ? 0 : null })
    g.style.setProperty('--bd', (Math.random() * 4).toFixed(2) + 's')
    const ring = s('circle', { class: 'ring', r: r + 2 })
    const sq = s('g', { class: 'sq' })
    const body = s('circle', { class: 'body', r, fill: PAL[node.color] || node.color })
    sq.append(body)
    if (this.opt.faces) {
      const face = s('g', { class: 'face' })
      face.append(s('g', { class: 'eyes' }, s('circle', { class: 'eye', cx: -5.5, cy: -2, r: 2.3 }), s('circle', { class: 'eye', cx: 5.5, cy: -2, r: 2.3 })))
      face.append(s('ellipse', { class: 'cheek', cx: -9.5, cy: 4, rx: 3, ry: 2 }), s('ellipse', { class: 'cheek', cx: 9.5, cy: 4, rx: 3, ry: 2 }))
      face.append(s('path', { class: 'mouth', d: 'M-3 3.5 Q0 6.5 3 3.5', stroke: PAL.ink, 'stroke-width': 2, fill: 'none', 'stroke-linecap': 'round' }))
      sq.append(face)
    }
    const lbl = s('text', { class: 'lbl', x: 0, y: r + 17, 'text-anchor': 'middle' }, this.opt.labels ? node.label : '')
    const tagG = s('g', { class: 'tagg', transform: `translate(${r * 0.9},${-r * 0.9}) scale(0)`, style: 'transition:transform .45s cubic-bezier(.34,1.56,.64,1)' })
    const tagBg = s('rect', { class: 'tagbg', x: -11, y: -11, width: 22, height: 22, rx: 11 })
    const tag = s('text', { class: 'tag', x: 0, y: 4.5, 'text-anchor': 'middle' })
    tagG.append(tagBg, tag)
    g.append(ring, sq, lbl, tagG)
    Object.assign(node, { el: g, body, lbl, tagG, tag, tagBg, sq })
    this.nodes.set(id, node)
    this.gNode.append(g)
    if (!silent) {
      g.animate([{ transform: `translate(${node.x}px,${node.y}px) scale(0)` }, { transform: `translate(${node.x}px,${node.y}px) scale(1)` }], { duration: 500, easing: 'cubic-bezier(.34,1.56,.64,1)' })
      this.emit('change')
    }
    return node
  }
  _nextId() { let i = this.nodes.size + 1; while (this.nodes.has('v' + i)) i++; return 'v' + i }
  removeNode(id) {
    const n = this.nodes.get(id); if (!n) return
    ;[...this.edges.values()].filter((e) => e.a === id || e.b === id).forEach((e) => this.removeEdge(e.a, e.b, true))
    const el = n.el
    el.animate([{ opacity: 1 }, { opacity: 0, transform: `translate(${n.x}px,${n.y}px) scale(0)` }], { duration: 260, fill: 'forwards' }).onfinish = () => el.remove()
    this.nodes.delete(id)
    this.emit('change')
  }
  hasEdge(a, b) { return this.edges.has(ek(a, b)) }
  addEdge(a, b, silent) {
    if (a === b || !this.nodes.has(a) || !this.nodes.has(b)) return
    const key = ek(a, b)
    if (this.edges.has(key)) return
    const g = s('g', { class: 'eg', 'data-k': key })
    const bd = this._bend(a, b)
    const line = s(bd ? 'path' : 'line', { class: 'e', fill: 'none' })
    const hit = s(bd ? 'path' : 'line', { class: 'e-hit', fill: 'none' })
    g.append(line, hit)
    const e = { a, b, key, el: g, line, hit, bend: bd }
    this.edges.set(key, e)
    this.gEdge.append(g)
    this._placeEdge(e)
    if (!silent) {
      const len = this._len(e)
      line.style.setProperty('--len', len)
      line.classList.add('new')
      setTimeout(() => line.classList.remove('new'), 700)
      this.bounce(a); this.bounce(b)
      this.emit('change')
    }
    return e
  }
  removeEdge(a, b, silent) {
    const key = ek(a, b), e = this.edges.get(key); if (!e) return
    this.edges.delete(key)
    e.el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220, fill: 'forwards' }).onfinish = () => e.el.remove()
    if (!silent) { this.bounce(a); this.bounce(b); this.emit('change') }
  }
  toggleEdge(a, b) { this.hasEdge(a, b) ? this.removeEdge(a, b) : this.addEdge(a, b) }
  clear() { [...this.nodes.keys()].forEach((id) => { this.nodes.get(id).el.remove() }); [...this.edges.values()].forEach((e) => e.el.remove()); this.nodes.clear(); this.edges.clear(); this.gOver.innerHTML = ''; this.gBack.innerHTML = ''; this.gTop.innerHTML = '' }
  load({ nodes, edges }, animate = true) {
    this.clear()
    nodes.forEach((n) => this.addNode(n, true))
    edges.forEach(([a, b]) => this.addEdge(a, b, true))
    if (animate) this.intro()
    this.emit('change')
  }
  intro() {
    let i = 0
    for (const n of this.nodes.values()) {
      n.el.animate([{ transform: `translate(${n.x}px,${n.y}px) scale(0)` }, { transform: `translate(${n.x}px,${n.y}px) scale(1)` }], { duration: 600, delay: i++ * 45, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'backwards' })
    }
    let j = 0
    for (const e of this.edges.values()) {
      const len = this._len(e)
      e.line.animate([{ strokeDasharray: len, strokeDashoffset: len }, { strokeDasharray: len, strokeDashoffset: 0 }], { duration: 600, delay: 200 + j++ * 35, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards' })
    }
  }

  // ---------- queries ----------
  ids() { return [...this.nodes.keys()] }
  edgeList() { return [...this.edges.values()].map((e) => [e.a, e.b]) }
  adj() { const m = new Map(); for (const id of this.nodes.keys()) m.set(id, new Set()); for (const e of this.edges.values()) { m.get(e.a).add(e.b); m.get(e.b).add(e.a) } return m }
  deg(id) { let d = 0; for (const e of this.edges.values()) if (e.a === id || e.b === id) d++; return d }
  data() { return { nodes: [...this.nodes.values()].map(({ id, x, y, label, color }) => ({ id, x, y, label, color })), edges: this.edgeList() } }

  // ---------- visual state ----------
  // optional curved edges: opt.bends = [[a, b, dx, dy]] (control-point offset from the midpoint)
  _bend(a, b) { for (const [p, q, dx, dy] of this.opt.bends || []) if ((p === a && q === b) || (p === b && q === a)) return [dx, dy]; return null }
  _ctrl(e) { const A = this.nodes.get(e.a), B = this.nodes.get(e.b); return [(A.x + B.x) / 2 + e.bend[0] * 2, (A.y + B.y) / 2 + e.bend[1] * 2] }
  _len(e) { const A = this.nodes.get(e.a), B = this.nodes.get(e.b); if (e.bend && e.line.getTotalLength) { try { return e.line.getTotalLength() || 1 } catch (_) {} } return Math.hypot(A.x - B.x, A.y - B.y) }
  _placeEdge(e) {
    const A = this.nodes.get(e.a), B = this.nodes.get(e.b)
    if (e.bend) { const [cx, cy] = this._ctrl(e); const d = `M${A.x},${A.y} Q${cx},${cy} ${B.x},${B.y}`; e.line.setAttribute('d', d); e.hit.setAttribute('d', d); return }
    for (const l of [e.line, e.hit]) { l.setAttribute('x1', A.x); l.setAttribute('y1', A.y); l.setAttribute('x2', B.x); l.setAttribute('y2', B.y) }
  }
  _placeNode(n) { n.el.setAttribute('transform', `translate(${n.x},${n.y})`) }
  refresh() { for (const n of this.nodes.values()) this._placeNode(n); for (const e of this.edges.values()) this._placeEdge(e); this.emit('move') }
  move(id, x, y) { const n = this.nodes.get(id); n.x = x; n.y = y; this._placeNode(n); for (const e of this.edges.values()) if (e.a === id || e.b === id) this._placeEdge(e); this.emit('move') }
  morph(pos, dur = 800, ez = easeSpring) {
    const from = new Map([...this.nodes.values()].map((n) => [n.id, [n.x, n.y]]))
    return tween(dur, (t) => {
      for (const [id, [x, y]] of Object.entries(pos)) {
        const n = this.nodes.get(id); if (!n) continue
        const [fx, fy] = from.get(id); n.x = fx + (x - fx) * t; n.y = fy + (y - fy) * t
      }
      this.refresh()
    }, ez)
  }
  color(id, c) { const n = this.nodes.get(id); if (!n) return; n.color = c; n.body.setAttribute('fill', PAL[c] || c) }
  colorAll(c) { for (const id of this.nodes.keys()) this.color(id, c) }
  tag(id, text, bg) {
    const n = this.nodes.get(id); if (!n) return
    const r = this.opt.r
    if (text == null || text === '') { n.tagG.setAttribute('transform', `translate(${r * 0.9},${-r * 0.9}) scale(0)`); return }
    const old = n.tag.textContent
    n.tag.textContent = text
    const w = Math.max(22, String(text).length * 8.5 + 10)
    n.tagBg.setAttribute('width', w); n.tagBg.setAttribute('x', -w / 2)
    n.tagBg.style.fill = bg ? (PAL[bg] || bg) : ''
    n.tagG.setAttribute('transform', `translate(${r * 0.9},${-r * 0.9}) scale(1)`)
    if (old !== String(text)) n.tagG.animate([{ scale: 1.5 }, { scale: 1 }], { duration: 400, easing: 'cubic-bezier(.34,1.56,.64,1)' })
  }
  clearTags() { for (const id of this.nodes.keys()) this.tag(id, null) }
  label(id, t) { const n = this.nodes.get(id); n.label = t; n.lbl.textContent = t }
  edgeClass(a, b, cls, on = true) { const e = this.edges.get(ek(a, b)); if (e) e.line.classList.toggle(cls, on) }
  clearEdgeClasses() { for (const e of this.edges.values()) e.line.classList.remove('hi', 'hi2', 'hi3', 'hi4', 'dim', 'ghost') }
  nodeClass(id, cls, on = true) { const n = this.nodes.get(id); if (n) n.el.classList.toggle(cls, on) }
  clearNodeClasses() { for (const n of this.nodes.values()) n.el.classList.remove('sel', 'dim', 'happy') }
  reset() { this.clearEdgeClasses(); this.clearNodeClasses(); this.clearTags(); this.gOver.innerHTML = ''; this.gBack.innerHTML = '' }
  bounce(id) { const n = this.nodes.get(id); if (!n) return; n.el.classList.remove('bounce'); void n.el.getBBox; requestAnimationFrame(() => { n.el.classList.add('bounce'); setTimeout(() => n.el.classList.remove('bounce'), 600) }) }
  pulse(id, color = PAL.pink) {
    const n = this.nodes.get(id); if (!n) return
    const c = s('circle', { cx: n.x, cy: n.y, r: this.opt.r, fill: 'none', stroke: color, 'stroke-width': 4 })
    this.gOver.append(c)
    c.animate([{ r: this.opt.r, opacity: 1 }, { r: this.opt.r * 2.8, opacity: 0 }], { duration: 700, easing: 'cubic-bezier(.22,1,.36,1)' }).onfinish = () => c.remove()
  }
  // travelling dot along edge a->b
  travel(a, b, color = PAL.pink, dur = 450) {
    const A = this.nodes.get(a), B = this.nodes.get(b)
    const c = s('circle', { r: 7, fill: color, stroke: PAL.ink, 'stroke-width': 2.5 })
    this.gTop.append(c)
    const e = this.edges.get(ek(a, b))
    if (e && e.bend) {
      const [cx, cy] = this._ctrl(e)
      return tween(dur, (t) => { const u = 1 - t; c.setAttribute('cx', u * u * A.x + 2 * u * t * cx + t * t * B.x); c.setAttribute('cy', u * u * A.y + 2 * u * t * cy + t * t * B.y) }).then(() => c.remove())
    }
    return tween(dur, (t) => { c.setAttribute('cx', A.x + (B.x - A.x) * t); c.setAttribute('cy', A.y + (B.y - A.y) * t) }).then(() => c.remove())
  }
  // soft blob behind a set of vertices
  blob(ids, color, pad = 30) {
    const pts = ids.map((id) => this.nodes.get(id)).filter(Boolean)
    if (!pts.length) return
    const g = s('g', { class: 'blob' })
    // draw: thick round-capped lines + circles => soft hull
    const st = { stroke: color, 'stroke-width': pad * 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', fill: color }
    if (pts.length === 1) g.append(s('circle', { cx: pts[0].x, cy: pts[0].y, r: pad, fill: color }))
    else {
      const hull = convexHull(pts.map((p) => [p.x, p.y]))
      g.append(s('polygon', { points: hull.map((p) => p.join(',')).join(' '), ...st }))
    }
    g.style.opacity = 0
    this.gBack.append(g)
    g.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 500, fill: 'forwards' })
    return g
  }

  // ---------- interaction ----------
  setMode(m) { this.mode = m; this.svg.dataset.mode = m; this.cancelRubber() }
  _pt(ev) {
    const p = this.svg.createSVGPoint(); p.x = ev.clientX; p.y = ev.clientY
    const q = p.matrixTransform(this.svg.getScreenCTM().inverse())
    return { x: q.x, y: q.y }
  }
  cancelRubber() { if (this.rubber) { this.rubber.remove(); this.rubber = null } }
  _bind() {
    const svg = this.svg
    let drag = null
    svg.addEventListener('pointerdown', (ev) => {
      const vEl = ev.target.closest('.v'), eEl = ev.target.closest('.eg')
      const p = this._pt(ev)
      if (vEl) {
        const id = vEl.dataset.id
        const n = this.nodes.get(id)
        drag = { id, ox: p.x - n.x, oy: p.y - n.y, sx: p.x, sy: p.y, moved: false }
        svg.setPointerCapture(ev.pointerId)
        if (this.opt.editable && this.mode === 'connect') {
          this.rubber = s('line', { class: 'rubber', x1: n.x, y1: n.y, x2: p.x, y2: p.y })
          this.gOver.append(this.rubber)
        }
        ev.preventDefault()
      } else if (eEl) {
        const e = this.edges.get(eEl.dataset.k)
        if (this.opt.editable && this.mode === 'erase') this.removeEdge(e.a, e.b)
        this.emit('edgeclick', e)
      } else {
        if (this.opt.editable && this.mode === 'connect' && this.nodes.size < (this.opt.maxNodes || 14)) {
          const n = this.addNode({ x: clamp(p.x, 20, this.opt.w - 20), y: clamp(p.y, 20, this.opt.h - 30) })
          this.emit('nodeadd', n)
        }
        this.emit('bgclick', p)
      }
    })
    svg.addEventListener('pointermove', (ev) => {
      if (!drag) return
      const p = this._pt(ev)
      if (Math.hypot(p.x - drag.sx, p.y - drag.sy) > 4) drag.moved = true
      if (this.rubber) {
        this.rubber.setAttribute('x2', p.x); this.rubber.setAttribute('y2', p.y)
        return
      }
      if (this.opt.draggable === false) return
      if (drag.moved) this.move(drag.id, clamp(p.x - drag.ox, 18, this.opt.w - 18), clamp(p.y - drag.oy, 18, this.opt.h - 30))
    })
    const up = (ev) => {
      if (!drag) return
      const d = drag; drag = null
      if (this.rubber) {
        this.cancelRubber()
        const p = this._pt(ev)
        let target = null
        for (const n of this.nodes.values()) if (n.id !== d.id && Math.hypot(n.x - p.x, n.y - p.y) < this.opt.r + 10) target = n
        if (target) this.toggleEdge(d.id, target.id)
        else if (!d.moved) this.emit('nodeclick', d.id)
        return
      }
      if (this.opt.editable && this.mode === 'erase' && !d.moved) { this.removeNode(d.id); return }
      if (!d.moved) { this.bounce(d.id); this.emit('nodeclick', d.id) }
      else this.emit('dragend', d.id)
    }
    svg.addEventListener('pointerup', up)
    svg.addEventListener('pointercancel', () => { drag = null; this.cancelRubber() })
  }
}

// ---------- geometry ----------
export function convexHull(P) {
  const pts = P.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1])
  if (pts.length < 3) return pts
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
  const lo = [], up = []
  for (const p of pts) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p) }
  for (const p of pts.reverse()) { while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p) }
  return lo.slice(0, -1).concat(up.slice(0, -1))
}
export function circle(ids, cx, cy, r, start = -Math.PI / 2) {
  const o = {}; ids.forEach((id, i) => { const a = start + (2 * Math.PI * i) / ids.length; o[id] = [cx + r * Math.cos(a), cy + r * Math.sin(a)] }); return o
}
export const toNodes = (pos, extra = {}) => Object.entries(pos).map(([id, [x, y]]) => ({ id, x, y, ...(extra[id] || {}) }))

// ---------- algorithms ----------
export function adjOf(ids, edges) { const m = new Map(ids.map((i) => [i, new Set()])); edges.forEach(([a, b]) => { m.get(a).add(b); m.get(b).add(a) }); return m }
export function bfs(adj, src) {
  const dist = new Map([[src, 0]]), par = new Map(), order = [src], q = [src]
  while (q.length) { const u = q.shift(); for (const v of adj.get(u)) if (!dist.has(v)) { dist.set(v, dist.get(u) + 1); par.set(v, u); q.push(v); order.push(v) } }
  return { dist, par, order }
}
export function components(adj) {
  const seen = new Set(), comps = []
  for (const v of adj.keys()) if (!seen.has(v)) { const { order } = bfs(adj, v); order.forEach((x) => seen.add(x)); comps.push(order) }
  return comps
}
export function bipartition(adj) {
  const side = new Map()
  for (const s0 of adj.keys()) {
    if (side.has(s0)) continue
    side.set(s0, 0); const q = [s0], par = new Map()
    while (q.length) {
      const u = q.shift()
      for (const v of adj.get(u)) {
        if (!side.has(v)) { side.set(v, 1 - side.get(u)); par.set(v, u); q.push(v) }
        else if (side.get(v) === side.get(u)) {
          // reconstruct odd cycle via BFS tree paths
          const path = (x) => { const p = [x]; while (par.has(x)) { x = par.get(x); p.push(x) } return p }
          const pu = path(u), pv = path(v)
          const setV = new Set(pv)
          let lca = pu.find((x) => setV.has(x))
          const cyc = pu.slice(0, pu.indexOf(lca) + 1).concat(pv.slice(0, pv.indexOf(lca)).reverse())
          return { ok: false, cycle: cyc }
        }
      }
    }
  }
  return { ok: true, side }
}
export function havelHakimiSteps(seq) {
  const steps = []
  let d = seq.slice().sort((a, b) => b - a)
  steps.push({ seq: d.slice(), note: '大きい順に並べる' })
  while (d.length && d[0] > 0) {
    const D = d[0]
    if (D >= d.length) { steps.push({ seq: d.slice(), fail: `先頭 ${D} ≥ 残りの個数 ${d.length}…足りない！` }); return { ok: false, steps } }
    const rest = d.slice(1)
    for (let i = 0; i < D; i++) rest[i]--
    if (rest.some((x) => x < 0)) { steps.push({ seq: d.slice(), fail: '引いたら負の数が出た…' }); return { ok: false, steps } }
    steps.push({ seq: d.slice(), take: D, note: `先頭の ${D} を取り出し、続く ${D} 個から 1 ずつ引く` })
    d = rest.sort((a, b) => b - a)
    steps.push({ seq: d.slice(), note: '並べ直す' })
  }
  steps.push({ seq: d.slice(), done: true })
  return { ok: true, steps }
}
// realise degree sequence (Havel-Hakimi construction) -> edges on indices
export function hhRealize(seq) {
  let items = seq.map((d, i) => ({ i, d }))
  const edges = []
  while (true) {
    items.sort((a, b) => b.d - a.d)
    if (!items.length || items[0].d === 0) break
    const top = items.shift()
    if (top.d > items.length) return null
    for (let k = 0; k < top.d; k++) { items[k].d--; if (items[k].d < 0) return null; edges.push([top.i, items[k].i]) }
  }
  return edges
}
export function eccentricities(adj) {
  const ecc = new Map(), D = new Map()
  for (const v of adj.keys()) { const { dist } = bfs(adj, v); D.set(v, dist); ecc.set(v, dist.size < adj.size ? Infinity : Math.max(...dist.values())) }
  return { ecc, D }
}
export function hasCycle(adj) {
  const seen = new Set()
  for (const s0 of adj.keys()) {
    if (seen.has(s0)) continue
    const st = [[s0, null]]
    while (st.length) {
      const [u, p] = st.pop()
      if (seen.has(u)) return true
      seen.add(u)
      for (const v of adj.get(u)) if (v !== p) { if (seen.has(v)) return true; st.push([v, u]) }
    }
  }
  return false
}
// all permutations isomorphism check (small graphs)
export function isoMap(A, B) {
  const a = [...A.keys()], b = [...B.keys()]
  if (a.length !== b.length) return null
  const degA = a.map((x) => A.get(x).size), degB = new Map(b.map((x) => [x, B.get(x).size]))
  const used = new Set(), map = new Map()
  const rec = (i) => {
    if (i === a.length) return true
    const x = a[i]
    for (const y of b) {
      if (used.has(y) || degB.get(y) !== degA[i]) continue
      let ok = true
      for (let j = 0; j < i; j++) { if (A.get(x).has(a[j]) !== B.get(y).has(map.get(a[j]))) { ok = false; break } }
      if (!ok) continue
      used.add(y); map.set(x, y)
      if (rec(i + 1)) return true
      used.delete(y); map.delete(x)
    }
    return false
  }
  return rec(0) ? map : null
}
