import { h, html, tex } from './ui.js'
import { GraphView } from './graph.js'

const CL = { pink: 'var(--pink-l)', mint: 'var(--mint-l)', lemon: 'var(--lemon-l)', lav: 'var(--lav-l)', sky: 'var(--sky-l)', peach: 'var(--peach-l)', aqua: 'var(--aqua-l)' }

export function labFrame({ title, hint, color = 'lav', one = false, no = '' }) {
  const canvas = h('div.lab-canvas')
  const side = h('div.lab-side')
  const ctrl = h('div.lab-ctrl')
  const el = h('div.lab.reveal', { '--c-l': CL[color] },
    h('div.lab-head', h('span.lb', 'LAB' + (no ? ' ' + no : '')), h('h4', title),
      h('span.dots', h('i', { style: { background: 'var(--pink)' } }), h('i', { style: { background: 'var(--lemon)' } }), h('i', { style: { background: 'var(--mint)' } }))),
    hint ? h('div.lab-hint', { html: hint }) : null,
    h('div.lab-body' + (one ? '.one' : ''), canvas, one ? null : side),
    ctrl)
  return { el, canvas, side, ctrl }
}

export function readout(k, v = '') {
  const vv = h('div.ro-v', { html: v })
  const el = h('div.readout', h('div.ro-k', k), vv)
  el.set = (x, flash = true) => { if (vv.innerHTML !== String(x)) { vv.innerHTML = x; if (flash) { vv.classList.remove('flash'); void vv.offsetWidth; vv.classList.add('flash') } } }
  el.tex = (src) => { vv.innerHTML = ''; vv.append(tex(src)) }
  return el
}
export function verdict(text = '', cls = 'mid') {
  const el = h('div.verdict.' + cls, { html: text })
  el.set = (t, c) => { if (el.innerHTML !== t || !el.classList.contains(c)) { el.innerHTML = t; el.className = 'verdict ' + c; el.classList.add('bump'); setTimeout(() => el.classList.remove('bump'), 500) } }
  return el
}
export function seg(opts, onPick, init = 0) {
  const el = h('div.seg', { role: 'tablist' })
  const bs = opts.map((o, i) => h('button', { role: 'tab', onclick: () => pick(i) }, o))
  function pick(i) { bs.forEach((b, j) => b.classList.toggle('on', i === j)); onPick(i) }
  el.append(...bs)
  el.pick = pick
  bs[init].classList.add('on')
  return el
}
export function range(label, min, max, val, onIn) {
  const out = h('output', String(val))
  const inp = h('input', { type: 'range', min, max, value: val, 'aria-label': label })
  inp.addEventListener('input', () => { out.textContent = inp.value; onIn(+inp.value) })
  const el = h('label.range', label, inp, out)
  el.inp = inp
  return el
}
export function editModes(gv, extra) {
  const sg = seg(['✋ 動かす', '🔗 つなぐ', '🧽 消す'], (i) => gv.setMode(['move', 'connect', 'erase'][i]), gv.mode === 'connect' ? 1 : 0)
  return sg
}
export function bars(host) {
  const b = h('div.bars'), l = h('div.bars-lbl')
  host.append(h('div', b, l))
  return {
    set(items, max) {
      // items: [{label, v, cls}]
      const M = Math.max(max || 0, ...items.map((i) => i.v), 1)
      while (b.children.length > items.length) { b.lastChild.remove(); l.lastChild.remove() }
      while (b.children.length < items.length) { b.append(h('div.bar', h('span'))); l.append(h('span')) }
      items.forEach((it, i) => {
        const bar = b.children[i]
        bar.style.height = Math.max(4, (it.v / M) * 100) + '%'
        bar.className = 'bar' + (it.cls ? ' ' + it.cls : '')
        bar.firstChild.textContent = it.v === Infinity ? '∞' : it.v
        l.children[i].textContent = it.label
      })
    },
  }
}
export function gview(canvas, opt) { return new GraphView(canvas, opt) }
export const sub = (s) => s.replace(/(\d+)/g, (m) => String.fromCharCode(...[...m].map((c) => 0x2080 + +c)))
