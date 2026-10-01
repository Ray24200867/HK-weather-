/* 導語：很多陣蠟筆小風從電風扇吹向右邊，風經過的那一行字會波浪式抖動 */
(() => {
  const section = document.querySelector(".lead-center")
  const text = document.querySelector(".lead-text")
  const fan = document.querySelector(".lead-center .fan")
  const layer = document.querySelector(".lead-center .winds")
  if (!section || !text || !fan || !layer) return
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

  const GUST_COUNT = 10
  const GUST_IMAGES = ["images/wind-small.svg"]   // 同一個風形狀，縮小成很多個
  const WAVE_WIDTH = 110   // 小風後方多寬的範圍會抖
  const AMPLITUDE = 6      // 抖動幅度（px）

  // 把每個字包成 <span class="ch">，保留原本的 <span class="record"> 等標記
  const chars = []
  const walker = document.createTreeWalker(text, NodeFilter.SHOW_TEXT)
  const nodes = []
  while (walker.nextNode()) nodes.push(walker.currentNode)
  for (const node of nodes) {
    const frag = document.createDocumentFragment()
    for (const c of node.textContent) {
      if (/\s/.test(c)) { frag.appendChild(document.createTextNode(c)); continue }
      const span = document.createElement("span")
      span.className = "ch"
      span.textContent = c
      frag.appendChild(span)
      chars.push({ el: span, x: 0, y: 0 })
    }
    node.replaceWith(frag)
  }

  // 生成小風，每陣的高低、大小、速度、出發時間都不同
  const gusts = []
  for (let i = 0; i < GUST_COUNT; i++) {
    const img = document.createElement("img")
    img.className = "gust"
    img.src = GUST_IMAGES[i % GUST_IMAGES.length]
    img.alt = ""
    layer.appendChild(img)
    gusts.push({ el: img, seed: Math.random() })
  }

  const rand = (a, b, t) => a + (b - a) * t

  // 按版面決定小風的起點、終點和高度（都相對 .lead-center）
  function layout() {
    for (const ch of chars) ch.el.style.top = ""
    const box = section.getBoundingClientRect()
    const f = fan.getBoundingClientRect()
    const t = text.getBoundingClientRect()
    const stacked = f.bottom <= t.top + 4   // 手機：風扇在文字上方

    const startX = stacked ? t.left - box.left - 40 : f.left - box.left + f.width * 0.8
    const endX = t.right - box.left - 20
    const yTop = (stacked ? f.top + f.height * 0.7 : f.top + f.height * 0.1) - box.top
    const yBottom = t.bottom - box.top - 10

    gusts.forEach((g, i) => {
      const r = (i + g.seed) / GUST_COUNT
      const w = rand(48, 84, (g.seed * 7) % 1)
      const s = g.el.style
      s.setProperty("--w", `${w.toFixed(0)}px`)
      s.setProperty("--x0", `${startX.toFixed(0)}px`)
      s.setProperty("--x1", `${(endX - w * 0.4).toFixed(0)}px`)
      s.setProperty("--y", `${rand(yTop, yBottom, r).toFixed(0)}px`)
      s.setProperty("--drift", `${rand(-14, 14, (g.seed * 13) % 1).toFixed(0)}px`)
      s.setProperty("--dur", `${rand(5, 7.5, (g.seed * 5) % 1).toFixed(2)}s`)   // 風速：越大越慢
      s.setProperty("--delay", `${(-i * 0.7 - g.seed * 2).toFixed(2)}s`)
    })

    for (const ch of chars) {
      const r = ch.el.getBoundingClientRect()
      ch.x = r.left + r.width / 2 - box.left
      ch.y = r.top + r.height / 2 - box.top
    }
  }

  let visible = true
  new IntersectionObserver(([e]) => { visible = e.isIntersecting }).observe(section)

  function frame(time) {
    if (visible) {
      const box = section.getBoundingClientRect()
      const fronts = []
      for (const g of gusts) {
        const strength = parseFloat(getComputedStyle(g.el).opacity) || 0
        if (strength < 0.05) continue
        const r = g.el.getBoundingClientRect()
        fronts.push({ x: r.right - box.left - r.width * 0.12, y: r.top + r.height / 2 - box.top, strength })
      }
      for (const ch of chars) {
        let y = 0
        for (const f of fronts) {
          const behind = f.x - ch.x
          if (behind < -12 || behind > WAVE_WIDTH) continue
          const dy = Math.abs(ch.y - f.y)
          if (dy > 34) continue                        // 只抖小風經過的那一行附近
          const along = Math.sin(Math.PI * (behind + 12) / (WAVE_WIDTH + 12))
          const near = 1 - dy / 34
          y += AMPLITUDE * f.strength * along * near * Math.sin(time / 220 - ch.x / 16)   // 抖動速度：分母越大越慢
        }
        if (y !== 0 || ch.on) {
          ch.el.style.top = y ? `${y.toFixed(2)}px` : ""
          ch.on = y !== 0
        }
      }
    }
    requestAnimationFrame(frame)
  }

  layout()
  window.addEventListener("resize", layout)
  document.fonts?.ready.then(layout)
  requestAnimationFrame(frame)
})()
