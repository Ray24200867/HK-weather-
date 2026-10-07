/* 頁尾：捲到這裡時風線開始流動、小風扇開始轉；按下風扇回到頁首 */
(() => {
  const end = document.querySelector(".page-end")
  if (!end) return
  new IntersectionObserver(([e]) => end.classList.toggle("is-on", e.isIntersecting)).observe(end)
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
  end.querySelector(".pe-top")?.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" })
  })
})()
