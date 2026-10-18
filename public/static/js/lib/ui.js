// ---------- tiny DOM helpers ----------
export const $ = (s, r = document) => r.querySelector(s)
export const $$ = (s, r = document) => [...r.querySelectorAll(s)]
export const R = String.raw

export function h(tag, attrs, ...kids) {
  const m = tag.match(/^([a-z0-9]+)?((?:[.#][\w-]+)*)$/i)
  const el = document.createElement(m[1] || 'div')
  ;(m[2].match(/[.#][\w-]+/g) || []).forEach((t) => (t[0] === '.' ? el.classList.add(t.slice(1)) : (el.id = t.slice(1))))
  if (attrs && (typeof attrs !== 'object' || attrs instanceof Node || Array.isArray(attrs))) { kids.unshift(attrs); attrs = null }
  if (attrs) for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue
    if (k === 'html') el.innerHTML = v
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v)
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v)
    else if (k.startsWith('--')) el.style.setProperty(k, v)
    else el.setAttribute(k, v === true ? '' : v)
  }
  add(el, kids)
  return el
}
function add(el, kids) {
  for (const k of kids.flat(9)) {
    if (k == null || k === false) continue
    el.append(k instanceof Node ? k : document.createTextNode(String(k)))
  }
}
export const html = (s) => { const t = document.createElement('template'); t.innerHTML = s.trim(); return t.content.firstElementChild }

const SVGNS = 'http://www.w3.org/2000/svg'
export function s(tag, attrs = {}, ...kids) {
  const el = document.createElementNS(SVGNS, tag)
  for (const [k, v] of Object.entries(attrs)) if (v != null) el.setAttribute(k, v)
  kids.flat(9).forEach((k) => k != null && el.append(k instanceof Node ? k : document.createTextNode(k)))
  return el
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
export const lerp = (a, b, t) => a + (b - a) * t
export const ease = (t) => 1 - Math.pow(1 - t, 3)
export const easeSpring = (t) => { const c4 = (2 * Math.PI) / 3; return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -9 * t) * Math.sin((t * 9 - 0.75) * c4) + 1 }

export function tween(dur, fn, ez = ease) {
  return new Promise((res) => {
    const t0 = performance.now()
    const step = (now) => {
      const t = clamp((now - t0) / dur, 0, 1)
      fn(ez(t), t)
      t < 1 ? requestAnimationFrame(step) : res()
    }
    requestAnimationFrame(step)
  })
}

export function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('on')
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('on'), 2200)
}

export function math(el) {
  if (window.renderMathInElement) {
    window.renderMathInElement(el, { delimiters: [{ left: '$$', right: '$$', display: true }, { left: '$', right: '$', display: false }], throwOnError: false })
  } else setTimeout(() => math(el), 120)
}
export function tex(src) {
  const sp = document.createElement('span')
  if (window.katex) window.katex.render(src, sp, { throwOnError: false })
  else sp.textContent = src
  return sp
}

// ---------- kinetic typography ----------
export function kt(text, cls = '', baseDelay = 0, step = 38) {
  const w = h('span.kt' + (cls ? '.' + cls.split(' ').join('.') : ''), { 'aria-label': text })
  ;[...text].forEach((c, i) => {
    const ch = h('span.ch' + (c === ' ' ? '.sp' : ''), { 'aria-hidden': 'true' }, c === ' ' ? '' : c)
    ch.style.transitionDelay = baseDelay + i * step + 'ms'
    ch.style.setProperty('--i', i)
    w.append(ch)
  })
  return w
}

// ---------- characters ----------
// Both characters are "vertices" — round nodes with faces.
export function avatar(who, size = 52) {
  const S = who === 's'
  const fill = S ? '#FF8FB1' : '#6FD6BC'
  const el = s('svg', { viewBox: '-32 -34 64 66', width: size, height: size, 'aria-hidden': 'true', style: 'overflow:visible' })
  // little edge stub (they are vertices!)
  el.append(s('line', { x1: S ? -30 : 30, y1: 26, x2: S ? -14 : 14, y2: 12, stroke: '#2B2A4C', 'stroke-width': 3.5, 'stroke-linecap': 'round' }))
  if (S) {
    // サカイ: hair bun + ribbon
    el.append(s('circle', { cx: 0, cy: -27, r: 7.5, fill: '#2B2A4C' }))
    el.append(s('path', { d: 'M-9 -30 l-7 -5 l1 9 z M9 -30 l7 -5 l-1 9 z', fill: '#FFD66B', stroke: '#2B2A4C', 'stroke-width': 2, 'stroke-linejoin': 'round' }))
  } else {
    // リョウガ: sprout
    el.append(s('path', { d: 'M0 -22 C0 -30 2 -33 4 -36', stroke: '#2B2A4C', 'stroke-width': 3, fill: 'none', 'stroke-linecap': 'round' }))
    el.append(s('path', { d: 'M3 -34 C10 -42 18 -36 14 -31 C10 -27 5 -30 3 -34 Z', fill: '#B5E86A', stroke: '#2B2A4C', 'stroke-width': 2 }))
    el.append(s('path', { d: 'M2 -32 C-6 -40 -13 -33 -9 -29 C-5 -26 0 -28 2 -32 Z', fill: '#B5E86A', stroke: '#2B2A4C', 'stroke-width': 2 }))
  }
  el.append(s('circle', { cx: 0, cy: 0, r: 23, fill, stroke: '#2B2A4C', 'stroke-width': 3.5 }))
  if (S) {
    // bangs
    el.append(s('path', { d: 'M-21 -8 C-18 -22 -4 -26 6 -22 C2 -16 -6 -12 -21 -8 Z M6 -22 C14 -20 20 -14 21 -6 C14 -10 9 -14 6 -22 Z', fill: '#2B2A4C' }))
    // round glasses
    el.append(s('circle', { cx: -8, cy: 2, r: 6.5, fill: 'rgba(255,255,255,.55)', stroke: '#2B2A4C', 'stroke-width': 2.4 }))
    el.append(s('circle', { cx: 8, cy: 2, r: 6.5, fill: 'rgba(255,255,255,.55)', stroke: '#2B2A4C', 'stroke-width': 2.4 }))
    el.append(s('line', { x1: -1.5, y1: 2, x2: 1.5, y2: 2, stroke: '#2B2A4C', 'stroke-width': 2.4 }))
    el.append(s('g', { class: 'eyes' }, s('circle', { cx: -8, cy: 2.5, r: 2.2, fill: '#2B2A4C' }), s('circle', { cx: 8, cy: 2.5, r: 2.2, fill: '#2B2A4C' })))
    el.append(s('path', { d: 'M-4 12 Q0 15.5 4 12', stroke: '#2B2A4C', 'stroke-width': 2.4, fill: 'none', 'stroke-linecap': 'round' }))
    el.append(s('ellipse', { cx: -15, cy: 11, rx: 3.6, ry: 2.3, fill: '#F2668F', opacity: .7 }))
    el.append(s('ellipse', { cx: 15, cy: 11, rx: 3.6, ry: 2.3, fill: '#F2668F', opacity: .7 }))
  } else {
    el.append(s('path', { d: 'M-20 -6 C-16 -18 -6 -22 0 -16 C4 -22 14 -20 20 -8 C12 -12 6 -10 0 -12 C-6 -9 -12 -10 -20 -6 Z', fill: '#2B2A4C' }))
    el.append(s('g', { class: 'eyes' }, s('ellipse', { cx: -8, cy: 2, rx: 2.6, ry: 3.4, fill: '#2B2A4C' }), s('ellipse', { cx: 8, cy: 2, rx: 2.6, ry: 3.4, fill: '#2B2A4C' }),
      s('circle', { cx: -7, cy: 0.6, r: 1, fill: '#fff' }), s('circle', { cx: 9, cy: 0.6, r: 1, fill: '#fff' })))
    el.append(s('path', { d: 'M-5 10 Q0 16 5 10 Z', fill: '#2B2A4C' }))
    el.append(s('ellipse', { cx: -14, cy: 10, rx: 3.6, ry: 2.3, fill: '#2FB894', opacity: .7 }))
    el.append(s('ellipse', { cx: 14, cy: 10, rx: 3.6, ry: 2.3, fill: '#2FB894', opacity: .7 }))
  }
  return el
}

export const CAST = { s: { name: 'サカイ', role: '先輩' }, r: { name: 'リョウガ', role: '後輩' } }

// lines: [['s', 'text'], ['r', 'text'], ['n', 'narration']]
export function talk(lines) {
  return h('div.talk', lines.map(([w, t]) => {
    if (w === 'n') return h('div.tl.n', h('div.bub', { html: t }))
    return h('div.tl.' + w, h('div.who', avatar(w), h('span', CAST[w].name)), h('div.bub', { html: t }))
  }))
}

export function box(kind, title, body) {
  const tag = { def: '定義', thm: '定理', ex: '演習', ans: '解答' }[kind] || kind
  return h('div.box.' + kind + '.reveal', h('div.bx-tag', title ? `${tag}｜${title}` : tag), h('div', { html: body }))
}
export function point(body) { return h('div.point.reveal', { html: body }) }

export function proof(title, steps, opt = {}) {
  let n = 0
  const label = opt.label || '証明'
  const ps = steps.map((t, i) => h('div.pstep', h('span.k', i + 1), h('div', { html: t })))
  const cnt = h('span.pc')
  const prev = h('button.btn.sm', { onclick: () => go(n - 1) }, '← もどる')
  const next = h('button.btn.sm.lv', { onclick: () => go(n + 1) }, 'つぎへ →')
  const all = h('button.btn.sm', { onclick: () => go(steps.length) }, 'ぜんぶ表示')
  function go(k) {
    n = clamp(k, 1, steps.length)
    ps.forEach((p, i) => p.classList.toggle('on', i < n))
    cnt.textContent = `${n} / ${steps.length}`
    prev.disabled = n <= 1; next.disabled = n >= steps.length
    ps[n - 1].scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }
  const el = h('div.proof.reveal',
    h('div.proof-head', { onclick: () => { el.classList.toggle('open'); if (!n) go(1) } },
      h('span', label + '｜' + title), h('span.pi', '+')),
    h('div.proof-body', h('div', h('div.proof-steps', ps), h('div.proof-ctrl', prev, next, all, cnt))))
  if (opt.open) { el.classList.add('open'); n = steps.length; ps.forEach((p) => p.classList.add('on')); cnt.textContent = `${n} / ${n}`; next.disabled = true }
  if (opt.cls) el.classList.add(opt.cls)
  return el
}

export function quiz(lecNo, qs) {
  const key = 'gnt-quiz-' + lecNo
  const st = JSON.parse(localStorage.getItem(key) || '{}')
  const scoreV = h('b.bigval', '0')
  const upd = () => { const c = Object.values(st).filter(Boolean).length; scoreV.textContent = `${c}/${qs.length}` }
  const wrap = h('div.quiz',
    qs.map((q, qi) => {
      const box = h('div.q.reveal')
      const opts = q.opts.map((o, oi) => h('button.q-opt', { html: o, onclick: () => {
        if (box.classList.contains('done')) return
        const ok = oi === q.a
        btns[oi].classList.add(ok ? 'ok' : 'ng')
        if (!ok) { btns[q.a].classList.add('ok') }
        box.classList.add('done')
        st[qi] = ok; localStorage.setItem(key, JSON.stringify(st)); upd()
        if (ok && Object.values(st).filter(Boolean).length === qs.length) confetti()
      } }))
      const btns = opts
      box.append(h('h5', h('span.qn', 'Q' + (qi + 1)), h('span', { html: q.q })), h('div.q-opts', opts), h('div.q-exp', { html: '💡 ' + q.exp }))
      return box
    }),
    h('div.score', scoreV, h('div', h('b', 'スコア'), h('div', { style: { fontSize: '13px', opacity: .8 } }, '正解すると記録されます。'), ),
      h('button.btn.sm', { style: { marginLeft: 'auto' }, onclick: () => { localStorage.removeItem(key); location.reload() } }, 'リセット')))
  upd()
  return wrap
}

export function checklist(lecNo, items) {
  const key = 'gnt-check-' + lecNo
  const st = JSON.parse(localStorage.getItem(key) || '{}')
  return h('div.check', items.map((t, i) => {
    const inp = h('input', { type: 'checkbox' }); inp.checked = !!st[i]
    inp.addEventListener('change', () => { st[i] = inp.checked; localStorage.setItem(key, JSON.stringify(st)); if (Object.values(st).filter(Boolean).length === items.length) confetti() })
    return h('label', inp, h('span.cb', html('<svg viewBox="0 0 16 16"><path d="M3 8.5l3.2 3L13 4.5"/></svg>')), h('span', { html: t }))
  }))
}

export function confetti() {
  const cols = ['#FF8FB1', '#6FD6BC', '#FFD66B', '#B9A6FF', '#8EC9FF']
  const layer = h('div', { style: { position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 99 } })
  document.body.append(layer)
  for (let i = 0; i < 46; i++) {
    const d = h('i', { style: { position: 'absolute', left: '50%', top: '55%', width: '14px', height: '14px', borderRadius: '50%', border: '2.5px solid #2B2A4C', background: cols[i % 5] } })
    layer.append(d)
    const a = Math.random() * Math.PI * 2, r = 160 + Math.random() * 320
    d.animate([{ transform: 'translate(-50%,-50%) scale(.2)' }, { transform: `translate(${Math.cos(a) * r}px, ${Math.sin(a) * r - 120}px) scale(1)`, offset: .55 }, { transform: `translate(${Math.cos(a) * r * 1.1}px, ${Math.sin(a) * r + 260}px) scale(.6)`, opacity: 0 }], { duration: 1500 + Math.random() * 700, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'forwards' })
  }
  setTimeout(() => layer.remove(), 2400)
  toast('🎉 コンプリート！')
}
