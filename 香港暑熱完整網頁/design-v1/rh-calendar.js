/* 日曆熱圖：一年每天一格，顏色深淺 = 天文台總部當天的平均相對濕度
   滑到時由 1 月 1 日開始逐日填色；可切換年份；滑鼠移到格子顯示日期和數值 */
(() => {
  const fig = document.querySelector("#rh-calendar")
  const data = window.RH_DAILY
  if (!fig || !data) return
  const svg = fig.querySelector("svg")
  const tip = fig.querySelector(".rh-tip")
  const count = fig.querySelector("#rh-count")
  const yearBtns = fig.querySelector(".rh-years")
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
  const NS = "http://www.w3.org/2000/svg"

  // 規範第 6 節：單一數量用一種顏色由淺到深
  const STEPS = [
    { max: 70, color: "#DCE8F5" },
    { max: 80, color: "#8DB4DE" },
    { max: 90, color: "#2B6CB0" },
    { max: 101, color: "#173C66" },
  ]
  const colorOf = (v) => (v == null ? "#FFFFFF" : STEPS.find((s) => v < s.max).color)

  const CELL = 17, GAP = 2, LEFT = 40, TOP = 22
  const MONTHS = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"]
  const W = LEFT + 31 * (CELL + GAP), H = TOP + 12 * (CELL + GAP)
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`)

  // 日期刻度
  for (const d of [1, 10, 20, 31]) {
    const t = document.createElementNS(NS, "text")
    t.setAttribute("x", LEFT + (d - 1) * (CELL + GAP) + CELL / 2)
    t.setAttribute("y", 14)
    t.setAttribute("text-anchor", "middle")
    t.setAttribute("class", "rh-axis")
    t.textContent = `${d}日`
    svg.appendChild(t)
  }
  const cells = []
  MONTHS.forEach((name, m) => {
    const t = document.createElementNS(NS, "text")
    t.setAttribute("x", LEFT - 8)
    t.setAttribute("y", TOP + m * (CELL + GAP) + CELL - 4)
    t.setAttribute("text-anchor", "end")
    t.setAttribute("class", "rh-axis")
    t.textContent = name
    svg.appendChild(t)
    const days = new Date(2024, m + 1, 0).getDate()   // 用閏年建格，2 月有 29 格
    for (let d = 1; d <= days; d++) {
      const r = document.createElementNS(NS, "rect")
      r.setAttribute("x", LEFT + (d - 1) * (CELL + GAP))
      r.setAttribute("y", TOP + m * (CELL + GAP))
      r.setAttribute("width", CELL)
      r.setAttribute("height", CELL)
      r.setAttribute("rx", 2)
      r.setAttribute("fill", "#EEF2F6")
      r.dataset.m = m + 1
      r.dataset.d = d
      svg.appendChild(r)
      cells.push(r)
    }
  })

  let year = 2024, shown = false
  const valueOf = (cell) => data[year]?.[cell.dataset.m]?.[cell.dataset.d - 1] ?? null

  function paint(animate) {
    let humid = 0
    cells.forEach((c, i) => {
      const v = valueOf(c)
      if (v != null && v >= 80) humid++
      c.style.transitionDelay = animate && !reduced ? `${(i * 4)}ms` : "0ms"
      const leap = new Date(year, 1, 29).getMonth() === 1
      const exists = !(c.dataset.m === "2" && c.dataset.d === "29" && !leap)
      c.setAttribute("fill", exists ? colorOf(v) : "transparent")
    })
    // 計數器由 0 數上去
    if (!animate || reduced) { count.textContent = humid; return }
    const start = performance.now(), dur = 1500
    const step = (now) => {
      const t = Math.min(1, (now - start) / dur)
      count.textContent = Math.round(humid * t)
      if (t < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }

  // 年份按鈕
  Object.keys(data).forEach((y) => {
    const b = document.createElement("button")
    b.type = "button"
    b.textContent = y
    b.setAttribute("aria-pressed", String(Number(y) === year))
    b.addEventListener("click", () => {
      year = Number(y)
      yearBtns.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)))
      fig.querySelector("#rh-year").textContent = year
      paint(true)
    })
    yearBtns.appendChild(b)
  })

  // 滑鼠移到格子：顯示日期與數值
  svg.addEventListener("pointermove", (e) => {
    const c = e.target.closest("rect")
    if (!c || !c.dataset.m) { tip.hidden = true; return }
    const v = valueOf(c)
    tip.textContent = `${year}年${c.dataset.m}月${c.dataset.d}日 · ${v == null ? "沒有數據" : v + "%"}`
    const box = fig.getBoundingClientRect(), r = c.getBoundingClientRect()
    tip.style.left = `${r.left - box.left + r.width / 2}px`
    tip.style.top = `${r.top - box.top - 8}px`
    tip.hidden = false
  })
  svg.addEventListener("pointerleave", () => { tip.hidden = true })

  new IntersectionObserver((entries, obs) => {
    if (entries.some((e) => e.isIntersecting) && !shown) { shown = true; paint(true); obs.disconnect() }
  }, { threshold: 0.3 }).observe(fig)
})()
