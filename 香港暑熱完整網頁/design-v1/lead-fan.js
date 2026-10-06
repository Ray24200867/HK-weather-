/* 全文末尾的電風扇與風線；不再改動開場句子的文字。 */
(() => {
  const section = document.querySelector(".closing-fan")
  const fan = section?.querySelector(".fan")
  const layer = section?.querySelector(".winds")
  if (!section || !fan || !layer) return
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

  const gusts = Array.from({ length: 10 }, (_, i) => {
    const image = document.createElement("img")
    image.className = "gust"
    image.src = "images/wind-small.svg"
    image.alt = ""
    layer.appendChild(image)
    return { element: image, seed: (i * 0.61803398875) % 1 }
  })

  const lerp = (a, b, t) => a + (b - a) * t
  const layout = () => {
    const box = section.getBoundingClientRect()
    const rotor = fan.getBoundingClientRect()
    const startX = rotor.right - box.left - 14
    const endX = box.width + 75
    gusts.forEach(({ element, seed }, i) => {
      const style = element.style
      style.setProperty("--w", `${Math.round(lerp(48, 84, seed))}px`)
      style.setProperty("--x0", `${Math.round(startX)}px`)
      style.setProperty("--x1", `${Math.round(endX)}px`)
      style.setProperty("--y", `${Math.round(lerp(34, box.height - 54, (i + seed) / gusts.length))}px`)
      style.setProperty("--drift", `${Math.round(lerp(-12, 12, seed))}px`)
      style.setProperty("--dur", `${lerp(8, 12, seed).toFixed(2)}s`)
      style.setProperty("--delay", `${(-i * 1.1 - seed * 3.2).toFixed(2)}s`)
    })
  }

  new IntersectionObserver(([entry]) => {
    section.classList.toggle("is-visible", entry.isIntersecting)
  }).observe(section)
  layout()
  window.addEventListener("resize", layout)
})()
