const DECK = window.DECK ?? {}
const PARTS = DECK.parts ?? {}
const SPEAKERS = DECK.speakers ?? {}
const L = {
  step: 'step', onThisSlide: 'on this slide', next: 'Next', end: 'end', beforeStart: 'before start',
  partEnds: 'Part ends at', until: 'until', handoff: 'Hand over to',
  ...DECK.labels,
}
const LOCALE = document.documentElement.lang || 'en'
const TOTAL_MS = Object.values(PARTS).reduce((a, p) => a + p.min, 0) * 60000

const query = new URLSearchParams(location.search)
const presenter = query.has('presenter')
const preview = query.has('preview')
const stage = document.getElementById('stage')
const slides = [...document.querySelectorAll('.slide')]
const steps = slides.map((s) => Math.max(+(s.dataset.steps ?? 0), ...[...s.querySelectorAll('[data-s]')].map((e) => +e.dataset.s)))
let cur = { i: 0, s: 0 }
let t0 = null
let peer = null
const canMorph = !presenter && !preview && document.startViewTransition
const still = () => document.body.classList.contains('still')

function fit() {
  const scale = presenter
    ? document.getElementById('wrap').clientWidth / 1920
    : Math.min(innerWidth / 1920, innerHeight / 1080)
  stage.style.transform = `scale(${scale})`
}

function render(prev) {
  const slide = slides[cur.i]
  if (!prev || prev.i !== cur.i) {
    slides.forEach((s, n) => s.classList.toggle('on', n === cur.i))
    if (prev) leave(slides[prev.i])
    enter(slide)
  }
  for (let k = 1; k <= steps[cur.i]; k++) slide.classList.toggle('s' + k, k <= cur.s)
  for (const el of slide.querySelectorAll('[data-s]')) {
    const on = +el.dataset.s <= cur.s
    if (on && !el.classList.contains('in')) shown(el)
    el.classList.toggle('in', on)
  }
  for (const el of slide.querySelectorAll('[data-hide]')) el.classList.toggle('gone', +el.dataset.hide <= cur.s)
  stage.dataset.part = slide.dataset.part
  document.getElementById('progress').style.width = (100 * cur.i) / Math.max(1, slides.length - 1) + '%'
  if (presenter) { panel(); showNext() }
  else if (!preview) {
    send({ state: cur, t0 })
    history.replaceState(null, '', `#${cur.i + 1}${cur.s ? '.' + cur.s : ''}`)
  }
}

function enter(slide) {
  for (const v of slide.querySelectorAll('video')) {
    v.muted = presenter || preview || v.hasAttribute('muted')
    v.currentTime = 0
    v.play().catch(() => {})
  }
  if (slide.dataset.enter) window[slide.dataset.enter]?.(slide)
}

function leave(slide) {
  for (const v of slide.querySelectorAll('video')) v.pause()
  for (const el of slide.querySelectorAll('.in')) el.classList.remove('in')
}

function shown(el) {
  for (const c of [el, ...el.querySelectorAll('[data-count]')]) if (c.dataset.count) countUp(c)
  if (el.dataset.type !== undefined) typeText(el)
}

const STRIP = Array.from({ length: 30 }, (_, n) => n % 10).join('<br>')
function countUp(el) {
  const chars = [...(+el.dataset.count).toLocaleString(LOCALE)]
  const total = chars.filter((c) => /\d/.test(c)).length
  let k = 0
  el.classList.remove('roll')
  el.innerHTML = chars.map((c) => (/\d/.test(c) ? `<i class="odo"><i style="--to:${+c + (++k === total ? 20 : 10)};--k:${k}">${STRIP}</i></i>` : c)).join('')
  void el.offsetWidth
  el.classList.add('roll')
}

function typeText(el) {
  const full = el._full ?? (el._full = el.innerHTML)
  clearInterval(el._typing)
  el.innerHTML = full
  if (still()) return
  const nodes = []
  const walk = (n) => (n.nodeType === 3 ? nodes.push(n) : n.childNodes.forEach(walk))
  walk(el)
  const texts = nodes.map((n) => n.nodeValue)
  nodes.forEach((n) => (n.nodeValue = ''))
  let ni = 0, ci = 0
  el._typing = setInterval(() => {
    if (ni >= nodes.length) return clearInterval(el._typing)
    nodes[ni].nodeValue = texts[ni].slice(0, ++ci)
    if (ci >= texts[ni].length) { ni++; ci = 0 }
  }, +(el.dataset.type || 22))
}

function splitWords(el, counter = { n: 0 }) {
  for (const node of [...el.childNodes]) {
    if (node.nodeType === 1 && !node.matches('[data-s],[data-count],br')) splitWords(node, counter)
    if (node.nodeType !== 3) continue
    const frag = document.createDocumentFragment()
    for (const part of node.nodeValue.split(/(\s+)/)) {
      if (!part.trim()) { frag.append(part); continue }
      const w = document.createElement('span')
      w.className = 'w'
      w.innerHTML = `<span style="--i:${counter.n++}"></span>`
      w.firstChild.textContent = part
      frag.append(w)
    }
    node.replaceWith(frag)
  }
}

function go(i, s) {
  const prev = { ...cur }
  cur = { i: Math.max(0, Math.min(slides.length - 1, i)), s }
  const back = cur.i < prev.i || (cur.i === prev.i && cur.s < prev.s)
  document.body.classList.toggle('still', back || presenter || preview)
  if (!canMorph || back || prev.i === cur.i) return render(prev)
  document.startViewTransition(() => render(prev))
}
function next() {
  if (t0 === null) t0 = Date.now()
  if (cur.s < steps[cur.i]) go(cur.i, cur.s + 1)
  else if (cur.i < slides.length - 1) go(cur.i + 1, 0)
}
function prev() {
  if (cur.s > 0) go(cur.i, cur.s - 1)
  else if (cur.i > 0) go(cur.i - 1, steps[cur.i - 1])
}

function command(cmd) {
  if (cmd === 'next') next()
  if (cmd === 'prev') prev()
  if (cmd === 'home') go(0, 0)
  if (cmd === 'black') document.body.classList.toggle('black')
  if (cmd === 'replay') enter(slides[cur.i])
  if (cmd === 'timer') { t0 = null; render(cur) }
}

const KEYS = {
  ArrowRight: 'next', ArrowDown: 'next', PageDown: 'next', ' ': 'next', Enter: 'next',
  ArrowLeft: 'prev', ArrowUp: 'prev', PageUp: 'prev', Home: 'home',
  b: 'black', '.': 'black', r: 'replay', t: 'timer',
}
addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return
  const key = e.key.length === 1 ? e.key.toLowerCase() : e.key
  const cmd = KEYS[key]
  if (key === 'f') document.documentElement.requestFullscreen?.()
  if (key === 'p' && !presenter) peer = open(location.pathname + '?presenter', 'presenter', 'width=1400,height=820')
  if (!cmd) return
  e.preventDefault()
  presenter ? opener?.postMessage({ cmd }, '*') : command(cmd)
})
addEventListener('click', () => (presenter ? opener?.postMessage({ cmd: 'next' }, '*') : next()))
addEventListener('message', (e) => {
  const d = e.data
  if (d?.cmd === 'hello') { peer = e.source; send({ state: cur, t0 }) }
  else if (d?.cmd) command(d.cmd)
  if (d?.state && (presenter || preview)) { t0 = d.t0; go(d.state.i, d.state.s) }
})
function send(msg) {
  if (peer && !peer.closed) peer.postMessage(msg, '*')
}

function showNext() {
  const f = document.getElementById('next')
  f.style.visibility = cur.i === slides.length - 1 && cur.s === steps[cur.i] ? 'hidden' : ''
  const after = slides[cur.i + 1]
  const handoff = cur.s === steps[cur.i] && after && SPEAKERS[after.dataset.who] && after.dataset.who !== slides[cur.i].dataset.who
  document.getElementById('handoff').textContent = handoff ? `${L.handoff} → ${SPEAKERS[after.dataset.who]}` : ''
  f.contentWindow?.postMessage({ state: cur.s < steps[cur.i] ? { i: cur.i, s: cur.s + 1 } : { i: cur.i + 1, s: 0 } }, '*')
}

const mmss = (ms) => `${ms < 0 ? '-' : ''}${Math.floor(Math.abs(ms) / 60000)}:${String(Math.floor((Math.abs(ms) / 1000) % 60)).padStart(2, '0')}`
function panel() {
  const slide = slides[cur.i]
  const part = PARTS[slide.dataset.part]
  const keys = Object.keys(PARTS)
  const planEnd = part ? keys.slice(0, keys.indexOf(slide.dataset.part) + 1).reduce((a, k) => a + PARTS[k].min, 0) * 60000 : 0
  const el = t0 ? Date.now() - t0 : 0
  const nxt = cur.s < steps[cur.i] ? `${L.step} ${cur.s + 1}/${steps[cur.i]} ${L.onThisSlide}` : slides[cur.i + 1]?.dataset.title ?? L.end
  const who = SPEAKERS[slide.dataset.who]
  document.getElementById('pp').innerHTML = `
    <div class="meta"><span>${cur.i + 1}/${slides.length} · ${L.step} ${cur.s}/${steps[cur.i]}</span><span>${part ? `${part.name} · ${L.until} ${mmss(planEnd)}` : L.beforeStart}</span></div>
    <div class="clock">${mmss(el)}${TOTAL_MS ? ` <small>/ ${mmss(TOTAL_MS)}</small>` : ''}</div>
    ${part ? `<div class="meta"><span>${L.partEnds} ${mmss(planEnd)}</span><span class="${el > planEnd ? 'late' : 'ok'}">${mmss(planEnd - el)}</span></div>` : ''}
    ${who ? `<div class="who">${who}</div>` : ''}
    <div class="nt">${slide.querySelector('.notes')?.innerHTML ?? ''}</div>
    <div class="nx">${L.next}: ${nxt}</div>`
}

if (presenter) {
  document.body.classList.add('presenter')
  const f = Object.assign(document.createElement('iframe'), { id: 'next', src: location.pathname + '?preview' })
  f.onload = showNext
  document.body.append(f, Object.assign(document.createElement('div'), { id: 'handoff' }))
  setInterval(panel, 500)
  // re-handshake so a reloaded main window finds this window again
  const hello = () => opener?.postMessage({ cmd: 'hello' }, '*')
  hello()
  setInterval(hello, 2000)
}
document.body.classList.toggle('still', presenter || preview)
document.querySelectorAll('.slide h1, .slide h2').forEach((h) => {
  h.setAttribute('aria-label', h.textContent.replace(/\s+/g, ' ').trim())
  splitWords(h)
})
addEventListener('resize', fit)
fit()
const [hi, hs] = location.hash.slice(1).split('.').map(Number)
if (hi && !presenter) {
  const i = Math.min(slides.length, hi) - 1
  cur = { i, s: Math.min(steps[i], hs || 0) }
}
render(null)
