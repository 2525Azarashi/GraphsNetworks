import { $, $$, h, html, s, sleep } from './lib/ui.js'
import { LECTURES } from './content/index.js'

// ---------------- header ----------------
function header() {
  const hd = $('#site-header')
  hd.innerHTML = ''
  const links = h('nav.nav-links', { id: 'nav-links' },
    h('a', { href: '/', 'data-link': '' }, 'ホーム'),
    h('a', { href: '/lec/' + LECTURES[0].no, 'data-link': '', 'data-match': '/lec' }, '講義'),
    h('a', { href: '/map', 'data-link': '' }, '定理マップ'),
    h('a', { href: '/words', 'data-link': '' }, 'ことば図鑑'))
  const prog = html(`<svg class="nav-prog" viewBox="0 0 40 40" aria-hidden="true"><circle class="bg" cx="20" cy="20" r="15"/><circle class="fg" cx="20" cy="20" r="15" stroke-dasharray="94.25" stroke-dashoffset="94.25"/><circle cx="20" cy="20" r="5" fill="#FFD66B" stroke="#2B2A4C" stroke-width="2.5"/></svg>`)
  const burger = h('button.nav-burger', { 'aria-label': 'メニュー', onclick: () => links.classList.toggle('open') }, html('<svg width="18" height="18" viewBox="0 0 18 18"><circle cx="4" cy="9" r="2.5" fill="#2B2A4C"/><circle cx="14" cy="4" r="2.5" fill="#2B2A4C"/><circle cx="14" cy="14" r="2.5" fill="#2B2A4C"/><path d="M4 9L14 4M4 9l10 5" stroke="#2B2A4C" stroke-width="2"/></svg>'))
  const nav = h('div.nav',
    h('a.logo', { href: '/', 'data-link': '', 'aria-label': 'てん と せん ホーム' },
      html(`<svg viewBox="0 0 40 40"><line class="lg-e" x1="9" y1="29" x2="31" y2="11"/><circle class="lg-a" cx="9" cy="29" r="7" fill="#FF8FB1" stroke="#2B2A4C" stroke-width="3"/><circle class="lg-b" cx="31" cy="11" r="7" fill="#6FD6BC" stroke="#2B2A4C" stroke-width="3"/></svg>`),
      h('span', 'てん と せん', h('small', 'GRAPH & NETWORK THEORY'))),
    links, prog, burger)
  hd.append(nav)
  let last = 0
  window.addEventListener('scroll', () => {
    const y = scrollY, max = document.documentElement.scrollHeight - innerHeight
    prog.querySelector('.fg').setAttribute('stroke-dashoffset', 94.25 * (1 - (max > 0 ? y / max : 0)))
    nav.classList.toggle('hide', y > last && y > 300 && !links.classList.contains('open'))
    last = y
  }, { passive: true })
}
function markNav() {
  $$('.nav-links a').forEach((a) => {
    const m = a.dataset.match, p = location.pathname
    a.classList.toggle('on', m ? p.startsWith(m) : p === a.getAttribute('href'))
  })
  $('#nav-links')?.classList.remove('open')
}

// ---------------- curtain transition ----------------
async function curtain(on) {
  const c = $('#curtain')
  if (on) {
    c.innerHTML = ''
    const cols = ['#FF8FB1', '#6FD6BC', '#FFD66B', '#B9A6FF', '#8EC9FF']
    const W = innerWidth, H = innerHeight, D = Math.hypot(W, H)
    const pts = [[.18, .3], [.78, .22], [.5, .7], [.12, .85], [.88, .8]]
    const svg = s('svg', { viewBox: `0 0 ${W} ${H}` })
    // edges connecting dots first
    for (let i = 0; i < pts.length - 1; i++) {
      const l = s('line', { x1: pts[i][0] * W, y1: pts[i][1] * H, x2: pts[i + 1][0] * W, y2: pts[i + 1][1] * H, stroke: '#2B2A4C', 'stroke-width': 6, 'stroke-linecap': 'round' })
      const len = Math.hypot((pts[i][0] - pts[i + 1][0]) * W, (pts[i][1] - pts[i + 1][1]) * H)
      l.style.strokeDasharray = len; l.style.strokeDashoffset = len
      svg.append(l)
      l.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }], { duration: 260, delay: i * 50, fill: 'forwards', easing: 'cubic-bezier(.22,1,.36,1)' })
    }
    c.append(svg)
    pts.forEach(([x, y], i) => {
      const d = h('i.cdot', { style: { left: x * W - D + 'px', top: y * H - D + 'px', width: D * 2 + 'px', height: D * 2 + 'px', background: cols[i] } })
      c.append(d)
      d.animate([{ transform: 'scale(0)' }, { transform: 'scale(1)' }], { duration: 560, delay: 80 + i * 55, fill: 'forwards', easing: 'cubic-bezier(.65,0,.35,1)' })
    })
    await sleep(700)
  } else {
    const ds = $$('.cdot', c)
    ds.reverse().forEach((d, i) => d.animate([{ transform: 'scale(1)' }, { transform: 'scale(0)' }], { duration: 500, delay: i * 45, fill: 'forwards', easing: 'cubic-bezier(.65,0,.35,1)' }))
    $$('line', c).forEach((l) => l.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: 'forwards' }))
    await sleep(760)
    c.innerHTML = ''
  }
}

// ---------------- reveal observers ----------------
let io
export function observe(root = document) {
  io ||= new IntersectionObserver((ents) => {
    for (const e of ents) if (e.isIntersecting) {
      const t = e.target
      if (t.classList.contains('talk')) {
        $$('.tl', t).forEach((l, i) => setTimeout(() => l.classList.add('in'), i * 260))
      } else t.classList.add('in')
      if (t._onin) t._onin()
      io.unobserve(t)
    }
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' })
  $$('.reveal,.kt,.talk,.pop,.flow-step,[data-onin]', root).forEach((el) => io.observe(el))
}

// ---------------- cursor (vertex + edge tail) ----------------
function cursor() {
  if (matchMedia('(hover:none)').matches || matchMedia('(prefers-reduced-motion:reduce)').matches) return
  document.body.classList.add('has-cursor')
  const head = $('#cursor-head'), tail = $('#cursor-tail'), line = $('#cursor-line')
  let mx = -100, my = -100, tx = -100, ty = -100
  addEventListener('pointermove', (e) => { mx = e.clientX; my = e.clientY
    const hot = e.target.closest('a,button,.v,.eg,input,label,.mn,[role=button]')
    document.body.classList.toggle('cursor-hot', !!hot)
  }, { passive: true })
  const loop = () => {
    tx += (mx - tx) * 0.16; ty += (my - ty) * 0.16
    head.setAttribute('cx', mx); head.setAttribute('cy', my)
    tail.setAttribute('cx', tx); tail.setAttribute('cy', ty)
    line.setAttribute('x1', mx); line.setAttribute('y1', my); line.setAttribute('x2', tx); line.setAttribute('y2', ty)
    requestAnimationFrame(loop)
  }
  loop()
  document.documentElement.style.cursor = 'none'
  const st = document.createElement('style'); st.textContent = '*{cursor:none!important}'; document.head.append(st)
}

// ---------------- router ----------------
let first = true, cleanup = null
async function route() {
  const p = location.pathname.replace(/\/+$/, '') || '/'
  if (!first) await curtain(true)
  if (cleanup) { try { cleanup() } catch {} cleanup = null }
  const app = $('#app')
  app.innerHTML = ''
  let mod
  if (p === '/') mod = await import('./pages/home.js')
  else if (p.startsWith('/lec/')) mod = await import('./pages/lecture.js')
  else if (p === '/map') mod = await import('./pages/map.js')
  else if (p === '/words') mod = await import('./pages/words.js')
  else mod = await import('./pages/home.js')
  cleanup = (await mod.render(app, p)) || null
  scrollTo({ top: 0, behavior: 'instant' })
  if (location.hash) setTimeout(() => document.getElementById(location.hash.slice(1))?.scrollIntoView({ behavior: 'smooth' }), 400)
  markNav()
  observe(app)
  if (!first) await curtain(false)
  first = false
}
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[data-link], a[href^="/"]')
  if (!a || a.target === '_blank' || e.metaKey || e.ctrlKey) return
  const url = new URL(a.href)
  if (url.origin !== location.origin) return
  e.preventDefault()
  if (url.pathname === location.pathname && url.hash) { document.getElementById(url.hash.slice(1))?.scrollIntoView({ behavior: 'smooth' }); history.replaceState(null, '', url.hash); return }
  if (url.pathname === location.pathname) return
  history.pushState(null, '', url.pathname + url.hash)
  route()
})
addEventListener('popstate', route)

header(); cursor(); route()
