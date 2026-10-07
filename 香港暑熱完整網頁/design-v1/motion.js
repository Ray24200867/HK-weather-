/* 動效：不改任何文字，只控制出現的時機和方式
   1. 頁頂閱讀進度條
   2. 開頭：標題升起、前言及署名依次出現
   3. 開頭條碼圖：由 1884 年起逐年畫出，畫完後歷史紀錄（藍）和 2026 年（紅）才出現
   4. 導語中的「36.9」由 0 數上去
   5. 內文、圖表捲動進入畫面時輕輕升起；小標編號滑入；對比表方塊依次填上
   選擇「減少動態效果」的讀者看到的是完整靜態頁面 */
(() => {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
  const root = document.documentElement
  root.classList.add("motion")
  const ease = (t) => 1 - Math.pow(1 - t, 3)

  // ---------- 1. 閱讀進度 ----------
  const bar = document.createElement("div")
  bar.className = "m-progress"
  document.body.appendChild(bar)
  const progress = () => {
    const max = root.scrollHeight - innerHeight
    bar.style.transform = `scaleX(${max > 0 ? Math.min(1, scrollY / max) : 0})`
  }
  addEventListener("scroll", progress, { passive: true })
  addEventListener("resize", progress)
  progress()

  // ---------- 2. 開頭標題 ----------
  const hero = document.querySelector(".hero")
  const h1 = hero?.querySelector("h1")
  if (h1 && !h1.querySelector(".m-line")) {
    // 整個標題由下升起（文字內容不變；不按句拆開，避免手機上斷行不自然）
    const text = h1.textContent
    h1.setAttribute("aria-label", text)
    h1.innerHTML = `<span class="m-line" aria-hidden="true"><span>${text}</span></span>`
  }
  requestAnimationFrame(() => requestAnimationFrame(() => hero?.classList.add("m-start")))

  // ---------- 3. 開頭條碼圖逐年畫出 ----------
  const canvas = document.querySelector("#barcode-end")
  const anim = window.BarcodeAnim
  if (canvas && anim) {
    const state = anim.chart.state
    state.upto = 1883; state.mark = 0
    anim.render()
    let played = false
    const play = () => {
      if (played) return
      played = true
      const t0 = performance.now(), DRAW = 2600, MARK = 700
      const step = (now) => {
        const t = (now - t0) / DRAW
        state.upto = 1884 + (2026 - 1884) * ease(Math.min(1, t))
        state.mark = Math.max(0, Math.min(1, (now - t0 - DRAW) / MARK))
        if (t >= 1) state.upto = null   // 畫完：顯示全部，左上角年份消失
        anim.render()
        if (state.mark < 1) requestAnimationFrame(step)
      }
      requestAnimationFrame(step)
    }
    new IntersectionObserver((entries, obs) => {
      if (entries.some((e) => e.isIntersecting)) { play(); obs.disconnect() }
    }, { threshold: 0.12 }).observe(canvas)
  }

  // ---------- 4. 「36.9」由 0 數上去 ----------
  const record = document.querySelector(".lead-text .record")
  const leadText = document.querySelector(".lead-text")
  if (record && leadText) {
    const target = parseFloat(record.textContent)
    const digits = (record.textContent.split(".")[1] || "").length
    let counted = false
    const count = () => {
      counted = true
      const t0 = performance.now(), DUR = 1300
      const step = (now) => {
        const t = Math.min(1, (now - t0) / DUR)
        record.textContent = (target * ease(t)).toFixed(digits)
        if (t < 1) requestAnimationFrame(step)
        else { record.textContent = target.toFixed(digits); record.classList.add("m-pop") }
      }
      requestAnimationFrame(step)
    }
    // 導語由開頭的捲動動畫控制淡入，等它真正看得見才開始數
    const watch = () => {
      if (counted) return
      const r = record.getBoundingClientRect()
      const visible = r.top < innerHeight * 0.85 && r.bottom > 0 && parseFloat(getComputedStyle(leadText).opacity) > 0.6
      if (visible) count()
    }
    addEventListener("scroll", watch, { passive: true })
    watch()
  }


  // ---------- 5. 捲動進入畫面 ----------
  const SKIP = ".hero, .opening-scene, .topbar, .live-pop"
  const candidates = [...document.querySelectorAll(
    "article p, article h2, article h3, article figure, article table, article .source-card, article iframe, article ul, article ol, article .squares-legend, article .sq-legend"
  )].filter((el) => !el.closest(SKIP))
  // 只動最外層，避免圖表內的元素重複動
  const set = new Set(candidates)
  const targets = candidates.filter((el) => {
    for (let p = el.parentElement; p; p = p.parentElement) if (set.has(p)) return false
    return true
  })
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return
      e.target.classList.add("m-in")
      io.unobserve(e.target)
    })
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 })
  targets.forEach((el) => {
    if (!el.matches("h2.section-head")) el.classList.add("m-reveal")
    io.observe(el)
  })
  // 對比表：方塊由左至右、由上至下依次填上
  document.querySelectorAll(".index-table").forEach((table) => {
    table.querySelectorAll(".sq").forEach((sq, i) => { sq.style.transitionDelay = `${0.25 + i * 0.035}s` })
  })
})()
