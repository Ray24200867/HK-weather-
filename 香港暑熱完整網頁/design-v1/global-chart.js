/* ================================================================
   全球每月平均氣溫：1940–2026 年每年一條線，逐年畫出，
   最後標出並列最熱的 2023 年 7 月與 2026 年 8 月
   數據：C3S Climate Pulse（ERA5），見 data/c3s-era5-global-monthly-2t.csv
   ================================================================ */
window.GlobalChart = (() => {
  const data = window.GLOBAL_MONTHLY
  const canvas = document.querySelector("#global")
  if (!data || !canvas) return { play() {} }
  const ctx = canvas.getContext("2d")

  const css = getComputedStyle(document.documentElement)
  const C = {
    ink: css.getPropertyValue("--text").trim(),
    slate: css.getPropertyValue("--muted").trim(),
    grey: css.getPropertyValue("--context").trim(),
    grid: css.getPropertyValue("--rule").trim(),
    rust: css.getPropertyValue("--now").trim(),
    blue: css.getPropertyValue("--series-2").trim(),
  }
  const SANS = '"Source Sans 3", "Noto Sans TC", Arial, sans-serif'
  const Y_MIN = 11.5, Y_MAX = 17.4
  const DURATION = 5200
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches

  const years = data.years
  const series = (y) => data.series[String(y)]
  const others = years.filter((y) => y !== 2023 && y !== 2026)
  const peak2023 = { month: 6, v: series(2023)[6] }   // 7 月
  const peak2026 = { month: 7, v: series(2026)[7] }   // 8 月

  let start = 0, raf = 0

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const r = canvas.getBoundingClientRect()
    canvas.width = Math.round(r.width * dpr)
    canvas.height = Math.round(r.height * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    draw(start ? Math.min(1, (performance.now() - start) / DURATION) : 1)
  }

  const ease = (t) => (t < 0 ? 0 : t > 1 ? 1 : 1 - Math.pow(1 - t, 3))
  const seg = (p, a, b) => ease((p - a) / (b - a))

  function draw(p) {
    const W = canvas.clientWidth, H = canvas.clientHeight
    if (!W || !H) return
    const small = W < 560
    const pad = { l: small ? 30 : 40, r: small ? 12 : 24, t: 48, b: 30 }
    const pw = W - pad.l - pad.r, ph = H - pad.t - pad.b
    const x = (m) => pad.l + (m / 11) * pw
    const y = (v) => pad.t + (1 - (v - Y_MIN) / (Y_MAX - Y_MIN)) * ph
    // 清空整塊畫布（用實際像素尺寸，避免舊畫面殘留）
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.restore()

    // 橫向格線（3 條）與刻度；單位寫在說明行，不重複在刻度上
    ctx.font = `400 ${small ? 12 : 13}px ${SANS}`
    ctx.textBaseline = "middle"
    ctx.textAlign = "right"
    for (const t of [12, 14, 16]) {
      ctx.fillStyle = C.grid
      ctx.fillRect(pad.l, Math.round(y(t)), pw, 1)
      ctx.fillStyle = C.slate
      ctx.fillText(String(t), pad.l - 8, y(t))
    }
    ctx.textAlign = "center"
    ctx.textBaseline = "top"
    for (let m = 0; m < 12; m++) {
      if (small && m % 2) continue
      ctx.fillText(`${m + 1}月`, x(m), H - pad.b + 10)
    }

    const line = (vals, upto, color, width, alpha = 1) => {
      ctx.strokeStyle = color
      ctx.lineWidth = width
      ctx.globalAlpha = alpha
      ctx.beginPath()
      let started = false
      const last = Math.min(upto, vals.length - 1)
      for (let m = 0; m <= Math.floor(last); m++) {
        if (vals[m] == null) break
        started ? ctx.lineTo(x(m), y(vals[m])) : ctx.moveTo(x(m), y(vals[m]))
        started = true
      }
      // 畫到兩個月中間的一段
      const f = last - Math.floor(last), m0 = Math.floor(last)
      if (started && f > 0 && vals[m0 + 1] != null) {
        ctx.lineTo(x(m0 + f), y(vals[m0] + (vals[m0 + 1] - vals[m0]) * f))
      }
      ctx.stroke()
      ctx.globalAlpha = 1
    }

    // 第一段：1940 年起逐年出現，越近的年份灰線越深
    const pA = seg(p, 0, 0.5)
    const shown = Math.floor(pA * others.length)
    for (let i = 0; i < shown; i++) {
      const yr = others[i]
      line(series(yr), 11, C.grey, 1, 0.35 + 0.6 * (i / others.length))
    }
    if (shown > 0) {
      const yr = others[shown - 1]
      ctx.font = `700 ${small ? 12 : 13}px ${SANS}`
      ctx.fillStyle = C.slate
      ctx.textAlign = "left"
      ctx.textBaseline = "bottom"
      if (pA < 1) ctx.fillText(String(yr), pad.l + 4, pad.t + 2)
    }

    // 第二段：2023 年（Harbour blue）
    const pB = seg(p, 0.52, 0.7)
    if (pB > 0) line(series(2023), pB * 11, C.blue, 2.5)

    // 第三段：2026 年（Story rust），畫到最新的完整月份
    const v26 = series(2026)
    const last26 = v26.findIndex((v) => v == null)
    const upto26 = (last26 === -1 ? 11 : last26 - 1)
    const pC = seg(p, 0.72, 0.9)
    if (pC > 0) {
      line(v26, pC * upto26, C.rust, 3)
      const at = pC * upto26, m0 = Math.floor(at), f = at - m0
      const hv = v26[m0] + ((v26[m0 + 1] ?? v26[m0]) - v26[m0]) * f
      ctx.fillStyle = C.rust
      ctx.beginPath(); ctx.arc(x(at), y(hv), 4, 0, Math.PI * 2); ctx.fill()
    }

    // 第四段：標註兩個並列的最高點（文字用 ink，不用系列色）
    const pD = seg(p, 0.9, 1)
    if (pD > 0) {
      ctx.globalAlpha = pD
      for (const [pt, col] of [[peak2023, C.blue], [peak2026, C.rust]]) {
        ctx.fillStyle = "#FFFFFF"
        ctx.beginPath(); ctx.arc(x(pt.month), y(pt.v), 6, 0, Math.PI * 2); ctx.fill()
        ctx.strokeStyle = col; ctx.lineWidth = 2.5
        ctx.beginPath(); ctx.arc(x(pt.month), y(pt.v), 5, 0, Math.PI * 2); ctx.stroke()
      }
      ctx.fillStyle = C.ink
      ctx.font = `700 ${small ? 12 : 14}px ${SANS}`
      ctx.textBaseline = "bottom"
      ctx.textAlign = "left"
      ctx.fillText(`2026年8月 ${peak2026.v.toFixed(2)}°C`, x(peak2026.month) + 10, y(peak2026.v) - 8)
      ctx.textAlign = "right"
      ctx.fillText(`2023年7月 ${peak2023.v.toFixed(2)}°C`, x(peak2023.month) - 10, y(peak2023.v) - 8)
      ctx.font = `400 ${small ? 12 : 13}px ${SANS}`
      ctx.fillStyle = C.slate
      ctx.textAlign = "center"
      ctx.textBaseline = "bottom"
      const midX = (x(peak2023.month) + x(peak2026.month)) / 2
      ctx.fillText("兩者相差不到 0.01°C", midX, y(peak2026.v) - (small ? 26 : 28))

      // 年份直接標在線尾
      ctx.font = `700 ${small ? 12 : 13}px ${SANS}`
      ctx.textAlign = "left"
      ctx.textBaseline = "middle"
      ctx.fillStyle = C.ink
      ctx.fillText("2023", x(11) - (small ? 30 : 34), y(series(2023)[11]) + 12)
      ctx.fillStyle = C.slate
      ctx.fillText("1940", x(11) - (small ? 30 : 34), y(series(1940)[11]) + 12)
      ctx.globalAlpha = 1
    }
  }

  function frame(now) {
    const p = Math.min(1, (now - start) / DURATION)
    draw(p)
    if (p < 1) raf = requestAnimationFrame(frame)
  }

  function play() {
    cancelAnimationFrame(raf)
    if (reduced) { start = 0; draw(1); return }
    start = performance.now()
    raf = requestAnimationFrame(frame)
  }

  // 畫布高度會隨上方文字框改變，尺寸一變就重新設定
  new ResizeObserver(resize).observe(canvas)
  return { play }
})()
