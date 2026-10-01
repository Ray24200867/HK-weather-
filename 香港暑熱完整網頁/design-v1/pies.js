/* HKHI 的構成：照片圓形上疊一塊半透明、比圓形大的扇形（仿攝影圓餅圖），
   百分比用深色字寫在扇形右邊；滑到時扇形長出來 */
(() => {
  const rows = document.querySelectorAll(".pie-row")
  if (!rows.length) return
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
  const NS = "http://www.w3.org/2000/svg"
  const R = 125          // 扇形半徑（照片圓形半徑是 100）

  // 座標：照片圓心在 (0,0)，SVG 顯示範圍 x -125–265、y -125–125（1 單位 = 0.8px）
  function build(row, i) {
    const svg = row.querySelector(".pie-wedge")
    svg.setAttribute("viewBox", "-125 -125 390 250")
    // 百分比放在扇形右邊的白底上，用深色文字（規範：數字用文字色，不用系列色）
    svg.innerHTML = `
      <path class="w"/>
      <text class="sub" x="139" y="-6" font-size="16" fill="#5B6573">佔比</text>
      <text class="num" x="136" y="44" font-size="54" fill="#16293F"></text>`
    return {
      shapes: [svg.querySelector(".w")],
      nums: [...svg.querySelectorAll(".num")],
      start: Number(row.dataset.start || 0),   // 80% 那個從 171° 開始，缺口朝左下
    }
  }

  // 由 start 角度（預設三點鐘方向，順時針量度）開始，順時針畫出佔比
  function wedgePath(fraction, startDeg = 0) {
    if (fraction <= 0) return ""
    const a0 = startDeg * Math.PI / 180
    const a1 = a0 + Math.min(fraction, 0.9999) * Math.PI * 2
    const p = (a) => `${(Math.cos(a) * R).toFixed(2)} ${(Math.sin(a) * R).toFixed(2)}`
    return `M0 0 L${p(a0)} A${R} ${R} 0 ${fraction > 0.5 ? 1 : 0} 1 ${p(a1)} Z`
  }

  function render(parts, fraction) {
    const d = wedgePath(fraction, parts.start)
    parts.shapes.forEach((el) => el.setAttribute("d", d))
    parts.nums.forEach((el) => { el.textContent = `${Math.round(fraction * 100)}%` })
  }

  function play(row, parts) {
    const target = Number(row.dataset.value) / 100
    if (reduced) { render(parts, target); return }
    const start = performance.now(), dur = 1400
    const step = (now) => {
      const t = Math.min(1, (now - start) / dur)
      render(parts, target * (1 - Math.pow(1 - t, 3)))
      if (t < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }

  const seen = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue
      play(e.target, e.target._pie)
      seen.unobserve(e.target)
    }
  }, { threshold: 0.5 })

  rows.forEach((row, i) => {
    row._pie = build(row, i)
    render(row._pie, reduced ? Number(row.dataset.value) / 100 : 0)
    seen.observe(row)
  })
})()
