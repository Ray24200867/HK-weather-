/* ================================================================
   1. 氣溫條碼圖
   ================================================================ */
const DAY_COUNT = 122 // 6/1 – 9/30
const AUG9 = 69
const Y_MIN = 20
const Y_MAX = 38
const THRESHOLD = 33
const STATIONS = { HKO: { name: "香港天文台總部" } }
const PAIR_MQ = window.matchMedia("(min-width: 900px)")
const SANS = '"Source Sans 3", "Noto Sans TC", Arial, sans-serif'
const css = getComputedStyle(document.documentElement)
const COLOR = {
  text: css.getPropertyValue("--text").trim(),
  muted: css.getPropertyValue("--muted").trim(),
  faint: css.getPropertyValue("--faint").trim(),
  record: css.getPropertyValue("--series-2").trim(),
  now: css.getPropertyValue("--now").trim(),
  heat: css.getPropertyValue("--heat").trim(),
}
let data = null
const FLAGS = {}
for (const [key, list] of Object.entries(window.HEAT_FLAGS || {})) FLAGS[key] = new Set(list)

function dayLabel(i) {
  const d = new Date(2001, 5, 1 + i)
  return `${d.getMonth() + 1}月${d.getDate()}日`
}
function median(values) {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}
function prepare(raw) {
  const out = {}
  for (const key of ["HKO"]) {
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

function drawOn(canvas, state, hover, saveGeometry) {
  if (!data) return
  const ctx = canvas.getContext("2d")
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
  const barW = n < 3 ? colW : Math.max(1.2, colW * 0.6)
  const others = Math.min(1, Math.max(0, (n - 1.02) / 12)) // 單日畫面時隱藏其他日子
  // 單日畫面：把那一列往右移，讓左邊的標註有位置
  let cx = pad.l + plotW / 2
  if (state.focus != null) {
    ctx.font = `500 ${small ? 14 : 15}px ${SANS}`
    const labelW = ctx.measureText(`最高紀錄 · 2026 年 · 36.9°C`).width
    const needed = pad.l + labelW + 16 + barW / 2
    cx += Math.max(0, needed - cx) * (1 - others)
  }
  // 並排畫面：這一列移到右半邊，左半邊留給天文台地圖
  const pairOn = PAIR_MQ.matches ? state.pair : 0
  cx += (pad.l + plotW * 0.74 - cx) * pairOn
  const mid = (state.from + state.to) / 2
  const xOf = (i) => cx + (i - mid) * colW - barW / 2
  const barH = n < 3 ? 2 : 1.25
  saveGeometry?.({ xOf, y, barW, pad, plotH, W, H, others, focus: state.focus, station: state.station })

  // y 軸刻度
  ctx.font = `400 ${small ? 14 : 15}px ${SANS}`
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
  ctx.font = `700 ${small ? 14 : 15}px ${SANS}`
  ctx.textAlign = "right"
  ctx.textBaseline = "bottom"
  ctx.fillText("33°C 酷熱天氣參考", W - pad.r - 2, ty - 6)
  ctx.globalAlpha = state.alpha

  // 單日標註
  if (n < 3 && state.focus != null) {
    const day = station.days[state.focus]
    const x = xOf(state.focus)
    ctx.font = `500 ${small ? 14 : 15}px ${SANS}`
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
  ctx.font = `400 ${small ? 14 : 15}px ${SANS}`
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


const charts = [
  { canvas: document.querySelector("#barcode-end"), tip: document.querySelector("#bar-tip-end"), state: { station: "HKO", from: 0, to: DAY_COUNT - 1, focus: AUG9, pair: 0, alpha: 1, threshold: 1 }, geom: null, hover: null },
]
function renderChart(chart) {
  if (!data || !chart.canvas.width) return
  drawOn(chart.canvas, chart.state, chart.hover, (geometry) => { chart.geom = geometry })
}
function resizeChart(chart) {
  const width = chart.canvas.offsetWidth
  const height = chart.canvas.offsetHeight
  if (!width || !height) return
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  chart.canvas.width = Math.round(width * dpr)
  chart.canvas.height = Math.round(height * dpr)
  chart.canvas.getContext("2d").setTransform(dpr, 0, 0, dpr, 0, 0)
  renderChart(chart)
}
function hitTest(chart, px, py) {
  const geom = chart.geom
  if (!geom || !data) return null
  const station = data[geom.station]
  let best = null
  for (let d = 0; d < DAY_COUNT; d++) {
    if (d !== geom.focus && geom.others < 0.5) continue
    const x = geom.xOf(d)
    if (px < x - 2 || px > x + geom.barW + 2) continue
    const day = station.days[d]
    day.values.forEach((v, i) => {
      const dist = Math.abs(geom.y(v) - py)
      if (dist <= 6 && (!best || dist < best.dist)) best = { dist, day: d, v, year: day.years[i], station: geom.station }
    })
  }
  return best
}
function showTip(chart, hit, px, py) {
  const date = new Date(2001, 5, 1 + hit.day)
  const m = date.getMonth() + 1, dd = date.getDate()
  const key = `${hit.year}-${String(m).padStart(2, "0")}-${String(dd).padStart(2, "0")}`
  const incomplete = FLAGS[hit.station]?.has(key)
  const day = data[hit.station].days[hit.day]
  const rank = 1 + day.values.filter((v) => v > hit.v).length
  chart.tip.innerHTML = `
    <b>${hit.year}年${m}月${dd}日</b>
    <span>${STATIONS[hit.station].name} · 每日最高氣溫</span>
    <strong>${hit.v.toFixed(1)}°C</strong>
    <span>在 ${day.values.length} 年的${m}月${dd}日中排第 ${rank} 高</span>
    <span>天文台標示：${incomplete ? "數據不完整" : "數據完整"}</span>
    <small>來源：香港天文台（每日最高氣溫 CLMMAXT）</small>`
  chart.tip.hidden = false
  const box = chart.canvas.getBoundingClientRect()
  const figureEl = chart.canvas.closest("figure")
  const figure = figureEl.getBoundingClientRect()
  const scaleX = figureEl.offsetWidth / figure.width
  const scaleY = figureEl.offsetHeight / figure.height
  let left = (box.left - figure.left) * scaleX + px + 14
  let top = (box.top - figure.top) * scaleY + py - 20
  if (left + chart.tip.offsetWidth > figureEl.offsetWidth - 8) left = (box.left - figure.left) * scaleX + px - chart.tip.offsetWidth - 14
  top = Math.max(8, Math.min(top, figureEl.offsetHeight - chart.tip.offsetHeight - 8))
  chart.tip.style.left = `${left}px`
  chart.tip.style.top = `${top}px`
}
function hideTip(chart) {
  chart.tip.hidden = true
  if (chart.hover) { chart.hover = null; renderChart(chart) }
}
for (const chart of charts) {
  new ResizeObserver(() => resizeChart(chart)).observe(chart.canvas)
  const onPointer = (event) => {
    const rect = chart.canvas.getBoundingClientRect()
    const px = (event.clientX - rect.left) * chart.canvas.offsetWidth / rect.width
    const py = (event.clientY - rect.top) * chart.canvas.offsetHeight / rect.height
    const hit = hitTest(chart, px, py)
    chart.canvas.style.cursor = hit ? "pointer" : ""
    if (!hit) { hideTip(chart); return }
    chart.hover = hit
    renderChart(chart)
    showTip(chart, hit, px, py)
  }
  chart.canvas.addEventListener("pointermove", (event) => { if (event.pointerType === "mouse") onPointer(event) })
  chart.canvas.addEventListener("click", onPointer)
  chart.canvas.addEventListener("pointerleave", () => hideTip(chart))
  window.addEventListener("scroll", () => hideTip(chart), { passive: true })
}
fetch("design-v1/heat.json")
  .then((response) => response.json())
  .then((raw) => { data = prepare(raw); charts.forEach(resizeChart) })

/* ================================================================
   2. 嵌入的組件：統一成深色主題，並自動調整高度
   ================================================================ */
const THEMES = {
  compare: `:root{--bg:#FFFFFF;--ink:#16293F;--wet:#C4502A;--mid:#1F3A5F;--light:#B5BAC1;--muted:#5B6573;--faint:#5B6573;--grid:#E4E7EB;--accent:#C4502A}body{min-width:0!important;font-family:"Source Sans 3","Noto Sans TC",sans-serif!important}main{min-width:0!important;width:100%!important}.graphic{grid-template-columns:minmax(0,1.02fr) minmax(0,.98fr)!important;gap:24px!important}.chart-wrap svg{max-height:700px!important}.knowledge-card,.detail-cover,.detail-card{background:#FFFFFF!important;border-color:#E4E7EB!important;border-radius:0!important}.knowledge-card-bg,.detail-cover-bg,.detail-card-bg{background:transparent!important}footer{font-size:12px!important}.chart-section{height:auto!important;min-height:720px!important}@media(max-width:700px){body{min-width:0!important;padding:16px!important}main{width:100%!important;min-width:0!important}.chart-section{height:auto!important;min-height:0!important;display:block!important}.chart-header h1{font-size:21px!important;line-height:1.3!important}.graphic{display:flex!important;flex-direction:column!important;gap:0!important;padding:12px 0!important}.chart-wrap{width:100%!important}.chart-wrap svg{max-height:none!important}.connectors{display:none!important}.layers{width:100%!important;display:block!important}.layer{padding:12px 0 12px 36px!important}.layer-index{top:14px!important}.layer h2{font-size:18px!important}.component{font-size:13px!important;min-height:36px!important}.knowledge-grid{grid-template-columns:1fr!important}.knowledge-card{aspect-ratio:2/1!important}.knowledge-section{margin-bottom:20px!important}.knowledge-header h1{font-size:21px!important}}`,
  measure: `:root{--bg:#FFFFFF;--ink:#16293F;--grid:#E4E7EB}body{font-family:"Source Sans 3","Noto Sans TC",sans-serif!important}.knowledge-card{height:auto!important;min-height:560px!important;background:#FFFFFF!important;border:1px solid #E4E7EB!important;border-radius:0!important;box-shadow:none!important}.knowledge-card::before,.knowledge-card::after{display:none!important}.knowledge-card-media{position:relative!important;width:100%!important;background:#FFFFFF!important}.knowledge-card-media img{max-height:320px!important;object-fit:contain!important}.knowledge-copy{position:relative!important;height:auto!important;padding:14px!important;color:#16293F!important;text-shadow:none!important}.knowledge-copy h2,.knowledge-copy p{color:#16293F!important;text-shadow:none!important}.knowledge-badge,.knowledge-tag{color:#1F3A5F!important;background:#EEF2F6!important;border:0!important;backdrop-filter:none!important}.knowledge-copy h2{font-size:24px!important}.knowledge-tags{margin-top:15px!important}@media(max-width:900px){.knowledge-card{min-height:0!important}.knowledge-grid{gap:12px!important}h1{font-size:21px!important;line-height:1.3!important}}`,
  estimator: "html{zoom:.78}",   // 互動估算整體縮小約兩成
  map: `:root{color-scheme:light;--color-background:#FFFFFF;--color-surface:#FFFFFF;--color-surface-solid:#FFFFFF;--color-land:#EEF2F6;--color-border:#E4E7EB;--color-coast:#B5BAC1;--color-text:#16293F;--color-text-secondary:#5B6573;--color-station:#2B6CB0;--color-selected:#C4502A;--color-hot:#C4502A;--shadow-soft:none}html,body{background:#FFFFFF!important;color:#16293F!important;font-family:"Source Sans 3","Noto Sans TC",sans-serif!important}*{box-shadow:none!important}`,
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
