/* ================================================================
   1. 條碼圖：每一列是 6–9 月的一天，每條線是某一年那天的最高氣溫
   ================================================================ */
const DAY_COUNT = 122 // 6/1 – 9/30
const AUG8 = 68
const AUG9 = 69
const Y_MIN = 20
const Y_MAX = 38
const THRESHOLD = 33

const STATIONS = {
  HKO: { name: "香港天文台總部", note: "九龍尖沙咀 · 1884–2026" },
  NGP: { name: "昂坪", note: "大嶼山 · 海拔約 600 米 · 2003–2026" },
}

// 每一步的畫面：站點、顯示的日子範圍、焦點日
const VIEWS = [
  // 第 0 步：左邊天文台地圖、右邊 8 月 9 日這一列（桌面並排）
  { station: "HKO", from: AUG9, to: AUG9, focus: AUG9, pair: true,
    title: "36.9°C：天文台總部有記錄以來最熱的一天",
    note: "" },
  // 第 1 步：WMO／哥白尼那一句——背後先清空，只看文字
  { station: "HKO", from: AUG9, to: AUG9, focus: AUG9, blank: true,
    note: "" },
  // 第 2 步：文字捲走後，才出現全球每月平均氣溫圖（global-chart.js）
  { station: "HKO", from: AUG9, to: AUG9, focus: AUG9, global: true,
    note: "" },
  // 第 3 步：百年來最高氣溫折線圖；滑到後段，下方正中間出現「但氣溫紀錄能否完全回答」
  { station: "HKO", from: AUG9, to: AUG9, focus: AUG9, yearly: true,
    note: "", callout: "但氣溫紀錄能否完全回答：香港究竟有多熱？", calloutCenter: true },
  // 第 4 步：女童中暑那一段——昂坪單日圖已刪除，只顯示文字
  { station: "NGP", from: AUG8, to: AUG8, focus: AUG8, blank: true,
    note: "" },
  // 第 5 步：「對於戶外活動的人來說」——昂坪整個夏天的圖已刪除，只顯示文字
  { station: "NGP", from: AUG8, to: AUG8, focus: AUG8, blank: true,
    note: "" },
  // 第 6 個畫面（頁面上排在最前）：導語之後先看整個夏天
  { station: "HKO", from: 0, to: DAY_COUNT - 1, focus: AUG9, threshold: true,
    title: "1884–2026年夏季每日最高氣溫", titleLarge: true,
    note: "",
    // 滑到這一步的後段才在右下角出現，字號和正文一樣
    callout: "2026 年夏天，天文台總部有 27 天最高氣溫達 33°C 或以上（虛線），其中 4 天刷新該日紀錄" },
  // 第 7 個畫面：女童遠足中暑的示意插畫（第 4 步文字到頂部後出現）
  { station: "NGP", from: AUG8, to: AUG8, focus: AUG8, illus: true,
    note: "" },
  // 第 8 個畫面：圖和問題都滑走後，以正文格式出現小標題和專家的話
  { station: "NGP", from: AUG8, to: AUG8, focus: AUG8, blank: true,
    note: "" },
]

const css = getComputedStyle(document.documentElement)
const COLOR = {
  text: css.getPropertyValue("--text").trim(),
  muted: css.getPropertyValue("--muted").trim(),
  faint: css.getPropertyValue("--faint").trim(),
  record: css.getPropertyValue("--series-2").trim(),   // 圖表顏色 2：Harbour blue
  now: css.getPropertyValue("--now").trim(),
  heat: css.getPropertyValue("--heat").trim(),
}
// 桌面才並排；手機維持「地圖在上、條碼在下」
const PAIR_MQ = window.matchMedia("(min-width: 900px)")
PAIR_MQ.addEventListener?.("change", () => draw())
const SANS = '"Source Sans 3", "Noto Sans TC", Arial, sans-serif'

const canvas = document.querySelector("#barcode")
const ctx = canvas.getContext("2d")
const head = document.querySelector("#chart-head")
let data = null

const state = { station: "HKO", from: 0, to: DAY_COUNT - 1, focus: AUG9, alpha: 0, threshold: 1, pair: 0 }   // 開場先看整個夏天
let target = { ...VIEWS[6], alpha: 1, threshold: 1 }
let running = false

function dayLabel(i) {
  const d = new Date(2001, 5, 1 + i)
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

function prepare(raw) {
  const out = {}
  for (const key of Object.keys(STATIONS)) {
    const { years, values } = raw[key]
    const i2026 = years.indexOf(2026)
    const days = []
    for (let d = 0; d < DAY_COUNT; d++) {
      const col = [], colYears = []
      let max = -Infinity, maxYear = null
      values.forEach((row, yi) => {
        const v = row[d]
        if (v == null) return
        col.push(v / 10)
        colYears.push(years[yi])
        if (v / 10 > max) { max = v / 10; maxYear = years[yi] }
      })
      const now = i2026 >= 0 && values[i2026][d] != null ? values[i2026][d] / 10 : null
      days.push({ values: col, years: colYears, max, maxYear, now })
    }
    out[key] = { days, yearCount: years.length }
  }
  return out
}

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const rect = canvas.getBoundingClientRect()
  canvas.width = Math.round(rect.width * dpr)
  canvas.height = Math.round(rect.height * dpr)
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  draw()
}

function draw() {
  if (!data) return
  const W = canvas.clientWidth
  const H = canvas.clientHeight
  const small = W < 640
  const pad = { l: small ? 16 : 40, r: small ? 44 : 64, t: 16, b: 34 }
  const plotW = W - pad.l - pad.r
  const plotH = H - pad.t - pad.b
  const y = (t) => pad.t + (1 - (t - Y_MIN) / (Y_MAX - Y_MIN)) * plotH

  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.restore()

  const station = data[state.station]
  const n = state.to - state.from + 1
  const maxCol = small ? 72 : 110
  const colW = Math.min(maxCol, plotW / n)
  const barW = n < 3 ? colW : Math.max(1, colW * 0.78)
  const others = Math.min(1, Math.max(0, (n - 1.02) / 12)) // 單日畫面時隱藏其他日子
  // 單日畫面：把那一列往右移，讓左邊的標註有位置
  let cx = pad.l + plotW / 2
  if (state.focus != null) {
    ctx.font = `500 13px ${SANS}`
    const labelW = ctx.measureText(`最高紀錄 · 2026 年 · 36.9°C`).width
    const needed = pad.l + labelW + 16 + barW / 2
    cx += Math.max(0, needed - cx) * (1 - others)
  }
  // 並排畫面：這一列移到右半邊，左半邊留給天文台地圖
  const pairOn = PAIR_MQ.matches ? state.pair : 0
  cx += (pad.l + plotW * 0.74 - cx) * pairOn
  const mid = (state.from + state.to) / 2
  const xOf = (i) => cx + (i - mid) * colW - barW / 2
  const barH = n < 3 ? 2 : 1.6
  geom = { xOf, y, barW, pad, plotH, W, H, others, focus: state.focus, station: state.station }

  // y 軸刻度
  ctx.font = `400 12px ${SANS}`
  ctx.textBaseline = "middle"
  ctx.textAlign = "left"
  for (const t of [25, 30, 35]) {
    ctx.fillStyle = COLOR.faint
    ctx.fillRect(W - pad.r + 8, y(t), 6, 1)
    ctx.fillStyle = COLOR.muted
    ctx.fillText(`${t}°C`, W - pad.r + 18, y(t))
  }

  ctx.globalAlpha = state.alpha

  // 焦點日底色
  if (state.focus != null && n > 3) {
    ctx.fillStyle = "rgba(238,242,246,.75)"
    ctx.fillRect(xOf(state.focus) - colW * 0.6, pad.t, barW + colW * 1.2, plotH)
  }

  // 灰階：重疊越多越亮
  const perBar = station.yearCount > 60 ? 0.12 : 0.22
  const colAlpha = (d) => (d === state.focus ? 1 : others)
  ctx.globalCompositeOperation = "source-over"
  ctx.globalAlpha = 1
  for (let d = 0; d < DAY_COUNT; d++) {
    const x = xOf(d)
    if (x + barW < pad.l - 2 || x > W - pad.r || colAlpha(d) === 0) continue
    ctx.fillStyle = `rgba(181,186,193,${Math.min(0.55, perBar * 2.6) * state.alpha * colAlpha(d)})`
    for (const v of station.days[d].values) ctx.fillRect(x, y(v) - barH / 2, barW, barH)
  }
  ctx.globalCompositeOperation = "source-over"
  ctx.globalAlpha = state.alpha

  // 歷史紀錄（Harbour blue）與 2026（Story rust）
  for (let d = 0; d < DAY_COUNT; d++) {
    const x = xOf(d)
    if (x + barW < pad.l - 2 || x > W - pad.r || colAlpha(d) === 0) continue
    const day = station.days[d]
    ctx.globalAlpha = state.alpha * colAlpha(d)
    ctx.fillStyle = COLOR.record
    ctx.fillRect(x, y(day.max) - barH, barW, barH * 2)
    if (day.now != null && day.now !== day.max) {
      ctx.fillStyle = COLOR.now
      ctx.fillRect(x, y(day.now) - barH, barW, barH * 2)
    }
  }

  ctx.globalAlpha = state.alpha

  // 點選的那一條線（ink，加粗）
  if (hover && hover.station === state.station) {
    const x = xOf(hover.day)
    ctx.globalAlpha = 1
    ctx.fillStyle = COLOR.text
    ctx.fillRect(x - 2, y(hover.v) - 2, barW + 4, 4)
    ctx.globalAlpha = state.alpha
  }

  // 33°C 參考線
  const ty = y(THRESHOLD)
  ctx.globalAlpha = state.alpha * (0.45 + 0.55 * state.threshold)
  ctx.strokeStyle = COLOR.heat
  ctx.lineWidth = 1 + state.threshold
  ctx.setLineDash([4, 4])
  ctx.beginPath()
  ctx.moveTo(pad.l + plotW * 0.5 * pairOn, ty)
  ctx.lineTo(W - pad.r, ty)
  ctx.stroke()
  ctx.setLineDash([])
  ctx.fillStyle = COLOR.text
  ctx.font = `700 12px ${SANS}`
  ctx.textAlign = "right"
  ctx.textBaseline = "bottom"
  ctx.fillText("33°C 酷熱天氣參考", W - pad.r - 2, ty - 6)
  ctx.globalAlpha = state.alpha

  // 單日標註
  if (n < 3 && state.focus != null) {
    const day = station.days[state.focus]
    const x = xOf(state.focus)
    ctx.font = `500 13px ${SANS}`
    ctx.textBaseline = "middle"
    ctx.textAlign = "right"
    ctx.fillStyle = COLOR.text
    const recordText = day.maxYear === 2026
      ? `最高紀錄 · 2026 年 · ${day.max.toFixed(1)}°C`
      : `最高紀錄 · ${day.maxYear} 年 · ${day.max.toFixed(1)}°C`
    ctx.fillText(recordText, x - 14, y(day.max))
    ctx.fillStyle = COLOR.muted
    ctx.fillText(`其餘 ${day.values.length - 1} 年的同一天`, x - 14, y(median(day.values)))
  }

  // x 軸
  ctx.fillStyle = COLOR.muted
  ctx.font = `400 12px ${SANS}`
  ctx.textAlign = "center"
  ctx.textBaseline = "top"
  if (n < 3) {
    ctx.fillText(dayLabel(state.focus), xOf(state.focus) + barW / 2, H - pad.b + 12)
  } else {
    for (const [d, label] of [[0, "6月"], [30, "7月"], [61, "8月"], [92, "9月"]]) {
      ctx.fillText(label, xOf(d) + barW / 2, H - pad.b + 12)
    }
    if (state.focus != null) {
      ctx.fillStyle = COLOR.text
      ctx.fillText(dayLabel(state.focus), xOf(state.focus) + barW / 2, pad.t)
    }
  }
  ctx.globalAlpha = 1
}

/* ---------- 點擊或滑過某一條線：顯示那天的原始數據 ---------- */
let geom = null
let hover = null
const tip = document.querySelector("#bar-tip")
const FLAGS = {}
for (const [k, list] of Object.entries(window.HEAT_FLAGS || {})) FLAGS[k] = new Set(list)

function hitTest(px, py) {
  if (!geom || !data) return null
  const graphic = document.querySelector(".scrolly-graphic")
  if (graphic.classList.contains("is-global") || graphic.classList.contains("is-blank")) return null
  const station = data[geom.station]
  let best = null
  for (let d = 0; d < DAY_COUNT; d++) {
    if (d !== geom.focus && geom.others < 0.5) continue          // 單日畫面只看那一列
    const x = geom.xOf(d)
    if (px < x - 2 || px > x + geom.barW + 2) continue
    const day = station.days[d]
    day.values.forEach((v, i) => {
      const dist = Math.abs(geom.y(v) - py)
      if (dist <= 6 && (!best || dist < best.dist)) best = { dist, day: d, v, year: day.years[i] }
    })
  }
  return best && { ...best, station: geom.station }
}

function showTip(hit, px, py) {
  const date = new Date(2001, 5, 1 + hit.day)
  const m = date.getMonth() + 1, dd = date.getDate()
  const key = `${hit.year}-${String(m).padStart(2, "0")}-${String(dd).padStart(2, "0")}`
  const incomplete = FLAGS[hit.station]?.has(key)
  const day = data[hit.station].days[hit.day]
  const rank = 1 + day.values.filter((v) => v > hit.v).length
  tip.innerHTML = `
    <b>${hit.year}年${m}月${dd}日</b>
    <span>${STATIONS[hit.station].name} · 每日最高氣溫</span>
    <strong>${hit.v.toFixed(1)}°C</strong>
    <span>在 ${day.values.length} 年的${m}月${dd}日中排第 ${rank} 高</span>
    <span>天文台標示：${incomplete ? "數據不完整" : "數據完整"}</span>
    <small>來源：香港天文台（每日最高氣溫 CLMMAXT）</small>`
  tip.hidden = false
  const box = canvas.getBoundingClientRect()
  const g = document.querySelector(".scrolly-graphic").getBoundingClientRect()
  let left = box.left - g.left + px + 14
  let top = box.top - g.top + py - 20
  const w = tip.offsetWidth, h = tip.offsetHeight
  if (left + w > g.width - 8) left = box.left - g.left + px - w - 14
  top = Math.max(8, Math.min(top, g.height - h - 8))
  tip.style.left = `${left}px`
  tip.style.top = `${top}px`
}

function hideTip() {
  if (tip) tip.hidden = true
  if (hover) { hover = null; draw() }
}

function onPointer(e) {
  const r = canvas.getBoundingClientRect()
  const px = e.clientX - r.left, py = e.clientY - r.top
  const hit = hitTest(px, py)
  canvas.style.cursor = hit ? "pointer" : ""
  if (!hit) { if (e.type === "click" || hover) hideTip(); return }
  hover = hit
  draw()
  showTip(hit, px, py)
}
canvas.addEventListener("pointermove", (e) => { if (e.pointerType === "mouse") onPointer(e) })
canvas.addEventListener("click", onPointer)
canvas.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse") hideTip() })

function median(values) {
  const s = [...values].sort((a, b) => a - b)
  return s[Math.floor(s.length / 2)]
}

function setHead() {
  const s = STATIONS[state.station]
  const title = target.title ? `<span class="bar-title${target.titleLarge ? " lg" : ""}">${target.title}</span>` : ""
  const name = target.titleLarge ? "" : `<b>${s.name}</b>`   // 夏季總覽圖不另外寫站名
  head.innerHTML = `${title}${name}每日最高氣溫 · 6 至 9 月 · ${s.note}`
}

let lastTime = 0
function tick(time) {
  const dt = Math.min(100, lastTime ? time - lastTime : 16)
  lastTime = time
  const k = 1 - Math.exp(-dt / 220)     // 範圍與參考線
  const kFade = 1 - Math.exp(-dt / 90)  // 換站淡出淡入
  const stationChanging = target.station !== state.station
  const goalAlpha = stationChanging ? 0 : target.alpha

  state.alpha += (goalAlpha - state.alpha) * kFade
  state.threshold += ((target.threshold ? 1 : 0) - state.threshold) * k
  state.pair += ((target.pair ? 1 : 0) - state.pair) * k
  if (stationChanging && state.alpha < 0.03) {
    state.station = target.station
    state.from = target.from
    state.to = target.to
    setHead()
  }
  if (!stationChanging) {
    state.from += (target.from - state.from) * k
    state.to += (target.to - state.to) * k
  }
  state.focus = target.focus
  draw()

  const done = !stationChanging
    && Math.abs(state.from - target.from) < 0.01
    && Math.abs(state.to - target.to) < 0.01
    && Math.abs(state.alpha - target.alpha) < 0.01
    && Math.abs(state.threshold - (target.threshold ? 1 : 0)) < 0.01
    && Math.abs(state.pair - (target.pair ? 1 : 0)) < 0.01
  if (done) {
    Object.assign(state, { from: target.from, to: target.to, alpha: target.alpha, pair: target.pair ? 1 : 0 })
    draw()
    running = false
    lastTime = 0
  } else {
    requestAnimationFrame(tick)
  }
}

const note = document.querySelector("#chart-note")
const callout = document.querySelector("#chart-callout")
// 這一步滑過一半後，才顯示右下角的說明
function updateCallout() {
  if (!callout.textContent) return
  const step = document.querySelector(`[data-step="${activeStep}"]`)
  if (!step) return
  const r = step.getBoundingClientRect()
  const progress = (window.innerHeight * 0.55 - r.top) / r.height
  const hasMore = !!callout.querySelector(".c2")
  // 有第二段時：先在 35% 出現問題，65% 再出現專家的話
  callout.classList.toggle("show", progress > (hasMore ? 0.35 : 0.5))
  callout.classList.toggle("show-more", hasMore && progress > 0.65)
}
function goTo(index) {
  currentView = index
  target = { ...VIEWS[index], alpha: 1, threshold: !!VIEWS[index].threshold }
  note.textContent = VIEWS[index].note
  const v = VIEWS[index]
  callout.innerHTML = v.callout
    ? `<span class="c1"></span>${v.calloutMore ? `<span class="c2">${v.calloutMore}</span>` : ""}`
    : ""
  if (v.callout) callout.querySelector(".c1").textContent = v.callout
  callout.classList.remove("show", "show-more")
  if (data) setHead()
  hideTip()
  const isGlobal = !!VIEWS[index].global
  const graphic = document.querySelector(".scrolly-graphic")
  if (isGlobal && !graphic.classList.contains("is-global")) window.GlobalChart?.play()
  graphic.classList.toggle("is-global", isGlobal)
  graphic.classList.toggle("is-blank", !!VIEWS[index].blank)
  graphic.classList.toggle("is-pair", !!VIEWS[index].pair)
  graphic.classList.toggle("has-title", !!VIEWS[index].titleLarge)
  graphic.classList.toggle("is-illus", !!VIEWS[index].illus)
  graphic.classList.toggle("is-yearly", !!VIEWS[index].yearly)
  callout.classList.toggle("center", !!VIEWS[index].calloutCenter)
  if (!running) { running = true; requestAnimationFrame(tick) }
}

fetch("design-v1/heat.json")
  .then((r) => r.json())
  .then((raw) => {
    data = prepare(raw)
    setHead()
    resize()
    goTo(6)
  })

new ResizeObserver(() => resize()).observe(canvas)

// 文字滑到頂端後停住、圖在文字下方出現的步驟：
//   第 1 步（WMO）→ 全球氣溫圖（畫面 2）；第 4 步（女童）→ 示意插畫（畫面 7）
const PINNED = { 1: { before: 1, after: 2 } }
let activeStep = 0, currentView = -1
const pinText = (step) => document.querySelector(`[data-step="${step}"] p`)
function pinnedView(step) {
  const t = pinText(step)
  if (!t) return PINNED[step].before
  // WMO 那段：文字到畫面中間就出現圖；女童那段：文字到頂部才出現插畫
  const trigger = step === 1 ? window.innerHeight * 0.5 : 90
  return t.getBoundingClientRect().top <= trigger ? PINNED[step].after : PINNED[step].before
}
function setPinHeights() {
  const g = document.querySelector(".scrolly-graphic")
  const t1 = pinText(1), t4 = pinText(4)
  if (t1) g.style.setProperty("--intro-h", `${t1.offsetHeight + 20}px`)
  if (t4) g.style.setProperty("--illus-h", `${t4.offsetHeight + 20}px`)
}
// 插畫進度：文字停住後開始，到這一步結束前完成
function illusProgress() {
  const step = document.querySelector('[data-step="4"]')
  const r = step.getBoundingClientRect(), vh = window.innerHeight
  const start = 64 - vh * 0.6          // 文字剛停在頂部時 step 的 top
  const span = r.height - vh * 1.7
  return Math.min(1, Math.max(0, (start - r.top) / span))
}
setPinHeights()
window.addEventListener("resize", setPinHeights)
// 每次滑動也直接判斷目前在哪一步（快速拖動捲軸時，IntersectionObserver 可能漏掉）
const allSteps = [...document.querySelectorAll(".step")]
function syncStep() {
  const line = window.innerHeight * 0.55
  const hit = allSteps.find((el) => { const r = el.getBoundingClientRect(); return r.top <= line && r.bottom > line })
  if (!hit) return
  const n = Number(hit.dataset.step)
  if (n !== activeStep) {
    activeStep = n
    goTo(PINNED[n] ? pinnedView(n) : n)
    if (n === 4) window.IllustrationScene?.update(illusProgress())
  }
}

window.addEventListener("scroll", () => {
  syncStep()
  if (PINNED[activeStep]) {
    const v = pinnedView(activeStep)
    if (v !== currentView) goTo(v)
  }
  if (activeStep === 4) window.IllustrationScene?.update(illusProgress())
  // 全球氣溫圖跟在 WMO 文字下方，文字停在頂部後圖也停住
  if (activeStep === 1) {
    const t = pinText(1)
    // 圖一直貼在文字下方：文字停住時圖也停住，文字往上滑走時圖跟着一起滑走
    if (t) document.querySelector(".scrolly-graphic").style.setProperty("--intro-top", `${t.getBoundingClientRect().top}px`)
  }
  updateCallout()
}, { passive: true })

const stepObserver = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue
    activeStep = Number(entry.target.dataset.step)
    goTo(PINNED[activeStep] ? pinnedView(activeStep) : activeStep)
    if (activeStep === 4) window.IllustrationScene?.update(illusProgress())
  }
}, { rootMargin: "-55% 0px -45% 0px" })
document.querySelectorAll(".step").forEach((el) => stepObserver.observe(el))


/* ================================================================
   2. 嵌入的組件：統一成深色主題，並自動調整高度
   ================================================================ */
const THEMES = {
  maxline: `:root{--paper:#FFFFFF;--ink:#16293F;--muted:#5B6573;--faint:#5B6573;--grid:#E4E7EB;--track:#EEF2F6;--green:#C4502A;--olive:#B5BAC1;--sage:#B5BAC1;--amber:#1F3A5F;--halo:#FFFFFF}body{font-family:"Source Sans 3","Noto Sans TC",sans-serif!important}.card{border-radius:0!important}.y-tick,.meta-label,.hint{font-size:12px!important}`,
  compare: `:root{--bg:#FFFFFF;--ink:#16293F;--wet:#C4502A;--mid:#1F3A5F;--light:#B5BAC1;--muted:#5B6573;--faint:#5B6573;--grid:#E4E7EB;--accent:#C4502A}body{min-width:0!important;font-family:"Source Sans 3","Noto Sans TC",sans-serif!important}main{min-width:0!important;width:100%!important}.graphic{grid-template-columns:minmax(0,1.02fr) minmax(0,.98fr)!important;gap:24px!important}.chart-wrap svg{max-height:700px!important}.knowledge-card,.detail-cover,.detail-card{background:#FFFFFF!important;border-color:#E4E7EB!important;border-radius:0!important}.knowledge-card-bg,.detail-cover-bg,.detail-card-bg{background:transparent!important}footer{font-size:12px!important}.chart-section{height:auto!important;min-height:720px!important}@media(max-width:700px){body{min-width:0!important;padding:16px!important}main{width:100%!important;min-width:0!important}.chart-section{height:auto!important;min-height:0!important;display:block!important}.chart-header h1{font-size:21px!important;line-height:1.3!important}.graphic{display:flex!important;flex-direction:column!important;gap:0!important;padding:12px 0!important}.chart-wrap{width:100%!important}.chart-wrap svg{max-height:none!important}.connectors{display:none!important}.layers{width:100%!important;display:block!important}.layer{padding:12px 0 12px 36px!important}.layer-index{top:14px!important}.layer h2{font-size:18px!important}.component{font-size:13px!important;min-height:36px!important}.knowledge-grid{grid-template-columns:1fr!important}.knowledge-card{aspect-ratio:2/1!important}.knowledge-section{margin-bottom:20px!important}.knowledge-header h1{font-size:21px!important}}`,
  measure: `:root{--bg:#FFFFFF;--ink:#16293F;--grid:#E4E7EB}body{font-family:"Source Sans 3","Noto Sans TC",sans-serif!important}.knowledge-card{height:auto!important;min-height:560px!important;background:#FFFFFF!important;border:1px solid #E4E7EB!important;border-radius:0!important;box-shadow:none!important}.knowledge-card::before,.knowledge-card::after{display:none!important}.knowledge-card-media{position:relative!important;width:100%!important;background:#FFFFFF!important}.knowledge-card-media img{max-height:320px!important;object-fit:contain!important}.knowledge-copy{position:relative!important;height:auto!important;padding:14px!important;color:#16293F!important;text-shadow:none!important}.knowledge-copy h2,.knowledge-copy p{color:#16293F!important;text-shadow:none!important}.knowledge-badge,.knowledge-tag{color:#1F3A5F!important;background:#EEF2F6!important;border:0!important;backdrop-filter:none!important}.knowledge-copy h2{font-size:24px!important}.knowledge-tags{margin-top:15px!important}@media(max-width:900px){.knowledge-card{min-height:0!important}.knowledge-grid{gap:12px!important}h1{font-size:21px!important;line-height:1.3!important}}`,
  estimator: "html{zoom:.78}",   // 互動估算整體縮小約兩成
  map: `:root{color-scheme:light;--color-background:#FFFFFF;--color-surface:#FFFFFF;--color-surface-solid:#FFFFFF;--color-land:#EEF2F6;--color-border:#E4E7EB;--color-coast:#B5BAC1;--color-text:#16293F;--color-text-secondary:#5B6573;--color-station:#2B6CB0;--color-selected:#C4502A;--color-hot:#C4502A;--shadow-soft:none}html,body{background:#FFFFFF!important;color:#16293F!important;font-family:"Source Sans 3","Noto Sans TC",sans-serif!important}*{box-shadow:none!important}`,
}

// 固定畫面裡的折線圖：按畫面高度縮放，整張放得下
const yearlyFrame = document.querySelector("#yearly-frame")
function fitYearly() {
  let doc
  try { doc = yearlyFrame.contentDocument } catch { return }
  if (!doc || !doc.body) return
  doc.documentElement.style.zoom = 1
  const natural = doc.documentElement.scrollHeight
  const avail = yearlyFrame.clientHeight
  doc.documentElement.style.zoom = Math.min(1, avail / natural).toFixed(3)
}
if (yearlyFrame) {
  yearlyFrame.addEventListener("load", () => { fitYearly(); setTimeout(fitYearly, 600) })
  // iframe 可能在這段程式執行前已經載入完，所以也立即量一次
  if (yearlyFrame.contentDocument?.readyState === "complete") { fitYearly(); setTimeout(fitYearly, 600) }
  new ResizeObserver(fitYearly).observe(yearlyFrame)
}

// 頂部讀數彈出的地圖：同一套配色，整體縮小
THEMES.mappop = THEMES.map + "html{zoom:.62}" +
  // 讀數面板在左、地圖在右（彈出框較窄，組件原本會把地圖放左邊）
  ".content-layout{grid-template-columns:minmax(260px,2fr) minmax(0,3fr)!important}" +
  ".reading-panel{grid-column:1!important;grid-row:1!important;margin:20px 0 20px 18px!important}" +
  ".station-map{grid-column:2!important;grid-row:1!important}"

document.querySelectorAll("iframe[data-theme]").forEach((frame) => {
  const apply = () => {
    let doc
    try { doc = frame.contentDocument } catch { return }
    if (!doc || !doc.head) return
    const style = doc.createElement("style")
    style.textContent = THEMES[frame.dataset.theme] || ""
    doc.head.appendChild(style)

    if (frame.hasAttribute("data-autosize")) {
      const fit = () => {
        // 量度時會暫時改變 iframe 高度，頁面會變短、捲動位置被拉走；先記下，量完放回
        const keepX = window.scrollX, keepY = window.scrollY
        const zoom = parseFloat(doc.defaultView.getComputedStyle(doc.documentElement).zoom) || 1
        let height
        if (zoom !== 1) {
          // 組件用了 zoom 縮小：直接量實際顯示高度，不需要先壓扁 iframe
          height = doc.body.getBoundingClientRect().height
        } else {
          // Scroll height cannot shrink below the current iframe viewport. Measure
          // once with a short viewport so old heights do not become blank space.
          frame.style.height = "1px"
          height = Math.max(doc.body.scrollHeight, doc.documentElement.scrollHeight)
        }
        frame.style.height = Math.ceil(height + 2) + "px"
        if (window.scrollY !== keepY || window.scrollX !== keepX) window.scrollTo(keepX, keepY)
      }
      fit()
      new ResizeObserver(fit).observe(doc.body)
    }
  }
  frame.addEventListener("load", apply)
  if (frame.contentDocument?.readyState === "complete") apply()
})


/* ================================================================
   3. 頂部：此刻全港最高 HKHI
   ================================================================ */
const STATION_ZH = {
  "Beas River": "雙魚河", "Chek Lap Kok": "赤鱲角", "Happy Valley": "跑馬地",
  "Hong Kong Observatory": "香港天文台", "Kau Sai Chau": "滘西洲", "King's Park": "京士柏",
  "Kowloon Bay": "九龍灣", "Sha Tin": "沙田", "Wetland Park": "濕地公園", "Wong Chuk Hang": "黃竹坑",
}

fetch("data/hkhi-latest.csv", { cache: "no-store" })
  .then((r) => (r.ok ? r.text() : Promise.reject()))
  .then((csv) => {
    const rows = csv.trim().split("\n").slice(1).map((line) => line.split(","))
    const latestTime = rows.reduce((t, r) => (r[0] > t ? r[0] : t), "")
    const latest = rows.filter((r) => r[0] === latestTime && r[2] && !isNaN(parseFloat(r[2])))
    if (!latest.length) return
    const top = latest.reduce((a, b) => (parseFloat(b[2]) > parseFloat(a[2]) ? b : a))
    const live = document.querySelector("#live")
    live.querySelector("b").textContent = parseFloat(top[2]).toFixed(1)
    live.querySelector(".where").textContent = STATION_ZH[top[1]] || top[1]
    live.classList.add("ready")
  })
  .catch(() => {})

/* 頂部讀數：手機沒有滑鼠，點一下打開／收起實時地圖；電腦上滑鼠移上去就會顯示 */
document.querySelector("#live")?.addEventListener("click", (e) => {
  e.preventDefault()
  document.querySelector(".live-wrap").classList.toggle("open")
})
document.addEventListener("click", (e) => {
  if (!e.target.closest(".live-wrap")) document.querySelector(".live-wrap")?.classList.remove("open")
})
