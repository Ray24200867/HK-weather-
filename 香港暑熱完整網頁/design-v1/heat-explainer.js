/* 解釋動畫：人體熱量收支
   滑到時依次出現：運動 → 氣溫 → 太陽輻射 → 濕度 → 風 → 熱壓力
   濕度滑桿：濕度愈高，汗水蒸發散熱愈少（濕度藍圓變深），熱壓力愈高
   所有數值只作示意 */
(() => {
  const fig = document.querySelector("#heat-explainer")
  if (!fig) return
  const items = [...fig.querySelectorAll(".hx-item")].sort((a, b) => a.dataset.order - b.dataset.order)
  const humDot = fig.querySelector("#hx-hum .hx-dot")
  const meter = fig.querySelector("#hx-meter")
  const meterText = fig.querySelector("#hx-meter-text")
  const slider = fig.querySelector("#hx-rh")
  const rhVal = fig.querySelector("#hx-rh-val")
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
  const svg = fig.querySelector("svg")
  const list = fig.querySelector(".hx-list")
  const meterNote = fig.querySelector(".hx-meter-note")

  // 文字按實際顯示大小設定：圖再縮小，標籤也不小於規範的 12px
  // 圖太窄時（手機），圖內只留標籤，說明改在圖下以文字清單顯示
  const PX = { "hx-label": 15, "hx-sub": 12 }
  function fitText() {
    const scale = svg.getBoundingClientRect().width / 940
    if (!scale) return
    const compact = scale < 0.66
    svg.querySelectorAll("text").forEach((t) => {
      const cls = Object.keys(PX).find((c) => t.classList.contains(c))
      if (!cls) return
      const px = compact && cls === "hx-label" ? 13 : PX[cls]
      t.style.fontSize = `${(px / scale).toFixed(1)}px`
      t.style.display = compact && cls !== "hx-label" ? "none" : ""
    })
    list.hidden = !compact
    meterNote.hidden = !compact
  }
  fitText()
  new ResizeObserver(fitText).observe(svg)

  // 示意的熱量收支：產熱（運動＋氣溫＋太陽）減去散熱（蒸發＋風）
  function update() {
    const rh = Number(slider.value)
    rhVal.textContent = `${rh}%`
    const evapLoss = 1.8 * (1 - (rh - 40) / 62)   // 濕度 40% 時蒸發最有效，接近飽和時幾乎停止
    const gain = 3, windLoss = 0.6
    const stress = Math.min(1, Math.max(0, (gain - evapLoss - windLoss) / 2.4))
    humDot.style.opacity = (0.3 + 0.7 * (rh - 40) / 55).toFixed(2)   // 濕度愈高，藍圓愈深
    meter.setAttribute("width", (400 * stress).toFixed(0))
    meterText.textContent = stress < 0.35 ? "較低：身體大致散得走熱量" : stress < 0.7 ? "中等：熱量開始積聚" : "高：散熱追不上產熱，熱量在體內積聚"
    meterNote.textContent = `熱壓力${meterText.textContent}`
  }
  slider.addEventListener("input", update)
  update()

  function play() {
    if (reduced) { items.forEach((el) => el.classList.add("on")); return }
    items.forEach((el, i) => setTimeout(() => el.classList.add("on"), i * 700))
  }
  new IntersectionObserver((entries, obs) => {
    if (entries.some((e) => e.isIntersecting)) { play(); obs.disconnect() }
  }, { threshold: 0.35 }).observe(fig)
})()
