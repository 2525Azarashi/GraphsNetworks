// Labs for Lecture 1 : definition, isomorphism, degree, handshake, regular, Havel–Hakimi
import { h, html, s, sleep, tex, toast, confetti } from '../lib/ui.js'
import { GraphView, PAL, circle, toNodes, adjOf, isoMap, havelHakimiSteps, hhRealize, PCYCLE } from '../lib/graph.js'
import { labFrame, readout, verdict, seg, range, editModes, bars, sub } from '../lib/lab.js'

const W = 600, H = 380

// ---------- LAB: 集合 ⇄ 図 ----------
export function labSetDiagram() {
  const f = labFrame({ title: '集合の組 (V, E) と、図はおなじもの', hint: '「つなぐ」モードで頂点から頂点へドラッグすると辺が増えます。空白をタップすると頂点が増えます。右の集合がリアルタイムに変わるよ。', color: 'sky', no: '1-1' })
  const g = new GraphView(f.canvas, { w: W, h: H, editable: true, mode: 'connect', maxNodes: 9,
    nodes: [{ id: '1', x: 170, y: 110, label: '1' }, { id: '2', x: 400, y: 110, label: '2' }, { id: '3', x: 170, y: 280, label: '3' }, { id: '4', x: 400, y: 280, label: '4' }],
    edges: [['1', '2'], ['1', '3'], ['2', '3'], ['2', '4']] })
  // relabel new nodes numerically
  g.on('nodeadd', (n) => g.label(n.id, n.id.replace('v', '')))
  const rV = readout('頂点集合 V'), rE = readout('辺集合 E'), rN = readout('位数 |V| ・ サイズ |E|')
  f.side.append(rV, rE, rN, h('div', { style: { fontSize: '13px', color: 'var(--ink-2)' }, html: '辺 $\\{x,y\\}$ は <b>2元部分集合</b>。順番も向きもないので $\\{1,2\\}=\\{2,1\\}$。' }))
  const lab = (id) => g.nodes.get(id).label
  const upd = () => {
    const ids = g.ids()
    rV.set('{' + ids.map(lab).join(', ') + '}')
    rE.set('{' + g.edgeList().map(([a, b]) => { const [p, q] = [lab(a), lab(b)].sort((x, y) => (+x || 0) - (+y || 0)); return `{${p},${q}}` }).join(', ') + '}')
    rN.set(`位数 ${ids.length} ／ サイズ ${g.edges.size}`)
  }
  g.on('change', upd); upd()
  const shuffle = h('button.btn.sm.lm', { onclick: () => {
    const pos = {}; g.ids().forEach((id) => (pos[id] = [60 + Math.random() * (W - 120), 50 + Math.random() * (H - 110)])); g.morph(pos, 900)
    toast('描き方を変えても、集合は同じ＝同じグラフ')
  } }, '🎲 描き方をシャッフル')
  const line = h('button.btn.sm', { onclick: () => { const ids = g.ids(); const pos = {}; ids.forEach((id, i) => (pos[id] = [70 + (i * (W - 140)) / Math.max(1, ids.length - 1), H / 2 - 20])); g.morph(pos, 900) } }, '一列に並べる')
  const reset = h('button.btn.sm', { onclick: () => g.load({ nodes: [{ id: '1', x: 170, y: 110, label: '1' }, { id: '2', x: 400, y: 110, label: '2' }, { id: '3', x: 170, y: 280, label: '3' }, { id: '4', x: 400, y: 280, label: '4' }], edges: [['1', '2'], ['1', '3'], ['2', '3'], ['2', '4']] }) }, 'リセット')
  f.ctrl.append(editModes(g), shuffle, line, reset)
  return f.el
}

// ---------- LAB: 同型（ぐにゃっと変形） ----------
export function labIso() {
  const f = labFrame({ title: '同型：辺のつながり方が同じなら “同じ形”', hint: '「変形する」を押すと、六角形のグラフ G₂ が G₁ の形にぐにゃっと変わります。頂点の対応 φ が同型写像。', color: 'lav', no: '1-2' })
  const sets = {
    k33: {
      name: 'G₁ ≃ G₂（例 1.3）',
      A: { ...circle(['a', 'b', 'c', 'd', 'e', 'f'], 300, 190, 130) },
      B: { a: [190, 80], c: [190, 190], e: [190, 300], b: [410, 80], d: [410, 190], f: [410, 300] },
      edges: [['a', 'b'], ['b', 'c'], ['c', 'd'], ['d', 'e'], ['e', 'f'], ['f', 'a'], ['a', 'd'], ['b', 'e'], ['c', 'f']],
      map: { a: '1', c: '2', e: '3', b: '4', d: '5', f: '6' },
    },
    pet: {
      name: 'ペテルセングラフ',
      A: { ...circle(['o0', 'o1', 'o2', 'o3', 'o4'], 300, 195, 150), ...circle(['i0', 'i1', 'i2', 'i3', 'i4'], 300, 195, 68) },
      B: null,
      edges: [['o0', 'o1'], ['o1', 'o2'], ['o2', 'o3'], ['o3', 'o4'], ['o4', 'o0'], ['o0', 'i0'], ['o1', 'i1'], ['o2', 'i2'], ['o3', 'i3'], ['o4', 'i4'], ['i0', 'i2'], ['i2', 'i4'], ['i4', 'i1'], ['i1', 'i3'], ['i3', 'i0']],
    },
  }
  // second Petersen drawing: 8-cycle-ish layout via outer cycle o0 o1 i1 i3 o3 o2 i2 i0 ... we compute: hamiltonian 9-cycle + centre? Use known drawing: outer 9? keep simple: outer cycle o0-o1-i1-i4-o4-o3-i3-i0 (8-cycle) + inner o2,i2
  const cyc8 = ['o0', 'o1', 'i1', 'i3', 'o3', 'o2', 'i2', 'i0']
  sets.pet.B = { ...circle(cyc8, 300, 195, 150, -Math.PI / 2 - Math.PI / 8), o4: [250, 195], i4: [350, 195] }
  let cur = 'k33', state = 'A'
  const g = new GraphView(f.canvas, { w: W, h: H, labels: true })
  const rM = readout('同型写像 φ（G₂ → G₁）'), vd = verdict('ドラッグして形を崩しても、つながり方は変わらない', 'mid')
  const rD = readout('次数列（並べ替え）')
  f.side.append(vd, rM, rD)
  function load(k) {
    cur = k; state = 'A'
    const S = sets[k]
    const cols = {}
    Object.keys(S.A).forEach((id, i) => (cols[id] = { color: PCYCLE[i % 6], label: S.map ? id : '' }))
    g.load({ nodes: toNodes(S.A, cols), edges: S.edges })
    const adj = adjOf(Object.keys(S.A), S.edges)
    rD.set('(' + [...adj.values()].map((x) => x.size).sort((a, b) => b - a).join(', ') + ')')
    rM.set(S.map ? Object.entries(S.map).map(([a, b]) => `φ(${a})=${b}`).join('  ') : '外側の5角形と内側の星が、右の描き方では 8角形＋中の2点に対応')
    vd.set(S.name + '：これは同じグラフ？', 'mid')
  }
  const btn = h('button.btn.sm.pk', { onclick: async () => {
    const S = sets[cur]; state = state === 'A' ? 'B' : 'A'
    await g.morph(S[state], 1200)
    if (S.map) for (const [a, b] of Object.entries(S.map)) g.label(a, state === 'B' ? `${a}→${b}` : a)
    vd.set(state === 'B' ? (cur === 'k33' ? 'ほら！ G₁ と同じ形 ⇒ G₁ ≃ G₂' : '見た目は違うけど、同じペテルセングラフ') : 'もとの描き方', state === 'B' ? 'ok' : 'mid')
  } }, '✨ 変形する')
  f.ctrl.append(seg(['例 1.3', 'ペテルセン'], (i) => load(['k33', 'pet'][i])), btn)
  load('k33')
  return f.el
}

// ---------- LAB: 近傍と次数 ----------
export function labDegree() {
  const f = labFrame({ title: '近傍 N(x) と次数 deg(x)：頂点をタップ', hint: 'タップした頂点の <b>となり（近傍）</b> がピンクに。頂点の右上の数字が次数です。頂点を消したり辺を足したりして δ・Δ の変化を見よう。', color: 'pink', no: '1-3' })
  const pos = { x1: [300, 70], x2: [150, 150], x3: [190, 300], x4: [400, 300], x5: [450, 150], x6: [540, 300] }
  const base = { nodes: toNodes(pos, Object.fromEntries(Object.keys(pos).map((k) => [k, { label: sub(k) }]))), edges: [['x1', 'x2'], ['x1', 'x4'], ['x1', 'x5'], ['x2', 'x3'], ['x2', 'x5'], ['x3', 'x4'], ['x2', 'x4']] }
  const g = new GraphView(f.canvas, { w: W, h: H, editable: true, mode: 'move', maxNodes: 10, nodes: base.nodes, edges: base.edges })
  const rN = readout('近傍 N(x)'), rE = readout('接続する辺 E(x)'), rD = readout('最小次数 δ(G) ／ 最大次数 Δ(G)')
  const b = bars(f.side)
  f.side.prepend(rN, rE, rD)
  let sel = 'x1'
  const lab = (id) => g.nodes.get(id)?.label ?? id
  function upd() {
    g.reset()
    const ids = g.ids(), adj = g.adj()
    if (!g.nodes.has(sel)) sel = ids[0]
    ids.forEach((id) => { const d = adj.get(id).size; g.tag(id, d, d === 0 ? 'gray' : 'lemon') })
    if (sel) {
      g.nodeClass(sel, 'sel')
      const N = [...adj.get(sel)]
      ids.forEach((id) => { if (id !== sel && !adj.get(sel).has(id)) g.nodeClass(id, 'dim') })
      N.forEach((id) => g.edgeClass(sel, id, 'hi'))
      g.edges.forEach((e) => { if (e.a !== sel && e.b !== sel) e.line.classList.add('dim') })
      rN.set(`N(${lab(sel)}) = {${N.map(lab).join(', ')}}` + (N.length ? '' : ' = ∅ … 孤立点！'))
      rE.set(`{${N.map((n) => lab(sel) + lab(n)).join(', ')}}  → deg = ${N.length}`)
    }
    const ds = ids.map((id) => adj.get(id).size)
    const mn = Math.min(...ds), mx = Math.max(...ds)
    rD.set(`δ = ${mn} ／ Δ = ${mx}`)
    b.set(ids.map((id, i) => ({ label: lab(id), v: ds[i], cls: id === sel ? 'lead' : ds[i] === mn ? 'out' : '' })))
  }
  g.on('nodeclick', (id) => { sel = id; upd(); g.pulse(id) })
  g.on('change', upd)
  upd()
  f.ctrl.append(editModes(g), h('button.btn.sm', { onclick: () => { g.load(base); sel = 'x1'; upd() } }, 'リセット'))
  return f.el
}

// ---------- LAB: 握手補題 ----------
export function labHandshake() {
  const f = labFrame({ title: '握手補題：辺ごとに “手” は 2 つ', hint: '「握手！」を押すと、各辺の人が両端の頂点に手を 1 本ずつ伸ばします。頂点に集まった手の数＝次数。合計はいつも辺の 2 倍。', color: 'lemon', no: '1-4' })
  const pos = { a: [120, 110], b: [300, 70], c: [480, 120], d: [180, 290], e: [380, 300], f: [540, 290] }
  const base = { nodes: toNodes(pos), edges: [['a', 'b'], ['b', 'c'], ['a', 'd'], ['b', 'd'], ['b', 'e'], ['d', 'e'], ['c', 'e']] }
  const g = new GraphView(f.canvas, { w: W, h: H, editable: true, mode: 'move', maxNodes: 9, ...base })
  const sum = h('div.bigval', '0'), twice = h('div.bigval', '0')
  const eq = h('div', { style: { display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' } },
    h('div', h('div.ro-k', 'Σ deg(x)'), sum), h('div.bigval', '='), h('div', h('div.ro-k', '2 × |E|'), twice))
  const vd = verdict('', 'mid')
  const rO = readout('奇点（次数が奇数）')
  const b = bars(f.side)
  f.side.prepend(eq, vd, rO)
  let busy = false
  function upd() {
    const adj = g.adj(), ids = g.ids()
    const ds = ids.map((i) => adj.get(i).size)
    const S = ds.reduce((a, c) => a + c, 0)
    sum.textContent = S; twice.textContent = 2 * g.edges.size
    const odd = ids.filter((i, k) => ds[k] % 2)
    rO.set(odd.length ? `{${odd.join(', ')}} … ${odd.length} 個（偶数個！）` : 'なし（0 個も偶数）')
    vd.set(`奇点の数 ${odd.length} は偶数 ✓（奇点定理）`, 'ok')
    ids.forEach((id, k) => g.tag(id, ds[k], ds[k] % 2 ? 'pink' : 'mint'))
    b.set(ids.map((id, k) => ({ label: id, v: ds[k], cls: ds[k] % 2 ? 'odd' : '' })))
  }
  g.on('change', () => !busy && upd())
  upd()
  const go = h('button.btn.sm.lm', { onclick: async () => {
    if (busy) return; busy = true
    g.clearTags(); const cnt = new Map(g.ids().map((i) => [i, 0]))
    let total = 0
    sum.textContent = 0
    for (const e of g.edges.values()) {
      e.line.classList.add('hi')
      const A = g.nodes.get(e.a), B = g.nodes.get(e.b)
      const mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2
      const person = s('g', { transform: `translate(${mx},${my})` }, s('circle', { r: 9, fill: PAL.lemon, stroke: PAL.ink, 'stroke-width': 2.5 }), s('circle', { cx: -3, cy: -1, r: 1.4, fill: PAL.ink }), s('circle', { cx: 3, cy: -1, r: 1.4, fill: PAL.ink }))
      g.gTop.append(person)
      person.animate([{ transform: `translate(${mx}px,${my}px) scale(0)` }, { transform: `translate(${mx}px,${my}px) scale(1)` }], { duration: 250, easing: 'cubic-bezier(.34,1.56,.64,1)' })
      await Promise.all([[A, e.a], [B, e.b]].map(async ([N, id]) => {
        const hand = s('circle', { r: 5, fill: PAL.pink, stroke: PAL.ink, 'stroke-width': 2 })
        g.gTop.append(hand)
        await hand.animate([{ cx: mx, cy: my }, { cx: N.x, cy: N.y }].map((k) => ({ transform: `translate(${k.cx}px,${k.cy}px)` })), { duration: 380, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'forwards' }).finished
        hand.remove(); cnt.set(id, cnt.get(id) + 1); total++; g.tag(id, cnt.get(id), 'lemon'); g.bounce(id); sum.textContent = total
      }))
      person.remove(); e.line.classList.remove('hi')
      await sleep(60)
    }
    busy = false; upd(); toast(`手の総数 ${total} ＝ 2 × ${g.edges.size}`)
  } }, '🤝 握手！')
  f.ctrl.append(go, editModes(g), h('button.btn.sm', { onclick: () => { g.load(base) } }, 'リセット'))
  return f.el
}

// ---------- LAB: 正則グラフ工房 ----------
export function labRegular() {
  const f = labFrame({ title: 'k-正則グラフ工房：作れる？作れない？', hint: '位数 n と次数 k を選ぶと、すべての頂点の次数が k のグラフを組み立てます。n と k が <b>両方奇数</b> だと…？', color: 'mint', no: '1-5' })
  const g = new GraphView(f.canvas, { w: W, h: H, faces: true, labels: false, r: 15 })
  const vd = verdict('', 'mid'), rS = readout('Σ deg = n × k')
  f.side.append(vd, rS, h('div', { style: { fontSize: '13px', color: 'var(--ink-2)' }, html: '<b>定理 1.2</b>：位数 $n$ の $k$-正則グラフが存在 ⟺ $n,k$ の少なくとも一方が偶数。<br>（$0\\le k<n$）' }))
  let n = 8, k = 3
  async function build() {
    if (k >= n) k = n - 1
    kR.inp.max = n - 1; kR.inp.value = k; kR.querySelector('output').textContent = k
    const ids = Array.from({ length: n }, (_, i) => 'v' + i)
    const pos = circle(ids, 300, 190, 140)
    const edges = []
    const ok = n % 2 === 0 || k % 2 === 0
    if (ok) {
      // circulant: connect i to i±1..±floor(k/2), plus opposite if k odd
      for (let i = 0; i < n; i++) {
        for (let d = 1; d <= Math.floor(k / 2); d++) edges.push([ids[i], ids[(i + d) % n]])
        if (k % 2 && i < n / 2) edges.push([ids[i], ids[i + n / 2]])
      }
    } else {
      for (let i = 0; i < n; i++) for (let d = 1; d <= Math.floor(k / 2); d++) edges.push([ids[i], ids[(i + d) % n]])
      // add a near-perfect matching (one vertex left over)
      const hf = (n - 1) / 2
      for (let i = 0; i < hf; i++) edges.push([ids[i], ids[i + hf]])
    }
    const uniq = [...new Map(edges.filter(([a, b]) => a !== b).map((e) => [[e[0], e[1]].sort().join('|'), e])).values()]
    g.load({ nodes: toNodes(pos, Object.fromEntries(ids.map((id, i) => [id, { color: PCYCLE[i % 6] }]))), edges: uniq })
    const adj = g.adj()
    ids.forEach((id) => { const d = adj.get(id).size; g.tag(id, d, d === k ? 'mint' : 'pink') })
    rS.set(`${n} × ${k} = ${n * k} ${n * k % 2 ? '（奇数！ 2|E| にならない）' : '＝ 2 × ' + (n * k) / 2}`)
    if (ok) vd.set(`${k}-正則グラフ 完成！${k === 3 ? '（キュービック）' : ''}`, 'ok')
    else { vd.set(`n=${n}, k=${k} は両方奇数 → 作れない（ピンクの頂点が余る）`, 'ng'); ids.forEach((id) => { if (adj.get(id).size !== k) g.pulse(id) }) }
  }
  const nR = range('n', 2, 12, n, (v) => { n = v; build() })
  const kR = range('k', 0, 11, k, (v) => { k = v; build() })
  f.ctrl.append(nR, kR)
  build()
  return f.el
}

// ---------- LAB: Havel–Hakimi ----------
export function labHH() {
  const f = labFrame({ title: 'Havel–Hakimi：その数列、グラフ的？', hint: '数列を入力して「判定」。先頭（最大）を取り出し、続く数から 1 ずつ引く…をくり返します。最後に全部 0 になれば <b>グラフ的</b>。', color: 'sky', no: '1-6', one: true })
  f.canvas.style.padding = '18px 20px'
  const inp = h('input.inp', { value: '5,3,3,3,3,2,2,2,1,1,1', 'aria-label': '数列' })
  const stage = h('div', { style: { display: 'flex', flexDirection: 'column', gap: '10px', minHeight: '220px' } })
  const vd = verdict('数列を入れて判定してね', 'mid')
  const gHost = h('div', { style: { height: '300px', display: 'none', border: '2.5px dashed var(--ink-3)', borderRadius: '20px', marginTop: '10px' } })
  f.canvas.append(h('div', { style: { display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '14px' } }, inp, vd), stage, gHost)
  const g = new GraphView(gHost, { w: W, h: 300, r: 15 })
  let timer = null
  const chipRow = (seq, take, note, cls) => {
    const row = h('div', { style: { display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' } })
    seq.forEach((v, i) => {
      let bg = 'var(--card)'
      if (take != null && i === 0) bg = 'var(--pink)'
      else if (take != null && i <= take) bg = 'var(--lemon)'
      const c = h('span', { style: { width: '38px', height: '38px', borderRadius: '50%', border: '2.5px solid var(--ink)', display: 'grid', placeItems: 'center', fontFamily: 'var(--f-mono)', fontWeight: 700, background: bg } }, v)
      c.animate([{ transform: 'scale(0) translateY(10px)' }, { transform: 'none' }], { duration: 450, delay: i * 35, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'backwards' })
      row.append(c)
    })
    if (note) row.append(h('span', { style: { fontSize: '13px', fontWeight: 700, color: cls === 'ng' ? 'var(--pink-d)' : 'var(--ink-2)', marginLeft: '6px' } }, note))
    return row
  }
  async function run() {
    clearTimeout(timer)
    const seq = inp.value.split(/[^0-9]+/).filter(Boolean).map(Number)
    stage.innerHTML = ''; gHost.style.display = 'none'
    if (!seq.length) return
    if (seq.reduce((a, b) => a + b, 0) % 2) { stage.append(chipRow(seq.slice().sort((a, b) => b - a), null, `合計 ${seq.reduce((a, b) => a + b, 0)} は奇数 → 握手補題より ✗`, 'ng')); vd.set('グラフ的ではない（和が奇数）', 'ng'); return }
    const { ok, steps } = havelHakimiSteps(seq)
    vd.set('計算中…', 'mid')
    for (const st of steps) {
      if (st.note === '並べ直す' && st.seq.length === 0) continue
      stage.append(chipRow(st.seq, st.take, st.fail || (st.done ? '全部 0 → Yes!' : st.note), st.fail ? 'ng' : ''))
      await sleep(520)
    }
    if (ok) {
      vd.set('グラフ的！ ↓ 実際に作ったグラフ', 'ok')
      const E = hhRealize(seq)
      const ids = seq.map((_, i) => 'v' + i)
      gHost.style.display = 'block'
      g.load({ nodes: toNodes(circle(ids, 300, 145, 115), Object.fromEntries(ids.map((id, i) => [id, { color: PCYCLE[i % 6], label: '' }]))), edges: E.map(([a, b]) => [ids[a], ids[b]]) })
      const adj = g.adj(); ids.forEach((id) => g.tag(id, adj.get(id).size, 'lemon'))
    } else vd.set('グラフ的ではない', 'ng')
  }
  inp.addEventListener('keydown', (e) => e.key === 'Enter' && run())
  const ex = (t) => h('button.btn.sm', { onclick: () => { inp.value = t; run() } }, t)
  f.ctrl.append(h('button.btn.sm.sk', { onclick: run }, '▶ 判定'), ex('5,3,3,3,3,2,2,2,1,1,1'), ex('3,3,3,1'), ex('4,4,3,3,2'), ex('3,3,3,3,3,3'), ex('5,5,4,3,2,1'))
  setTimeout(run, 50)
  return f.el
}
