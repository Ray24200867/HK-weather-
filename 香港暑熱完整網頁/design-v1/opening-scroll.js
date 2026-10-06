(() => {
  const scene = document.querySelector(".opening-scene")
  const stage = scene?.querySelector(".opening-scene__stage")
  const visual = scene?.querySelector(".lead-visuals")
  const text = scene?.querySelector(".lead-text")
  if (!scene || !stage || !visual || !text || !window.gsap || !window.ScrollTrigger) return

  gsap.registerPlugin(ScrollTrigger)
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    gsap.set(text, { opacity: 1, y: 0 })
    return
  }

  gsap.set(stage, { opacity: 1 })
  gsap.set(text, { opacity: 0, y: 24 })
  gsap.timeline({
    scrollTrigger: {
      trigger: scene,
      start: "top top+=52",
      end: "bottom bottom",
      scrub: true,
      invalidateOnRefresh: true,
    },
  })
    .to(visual, { y: () => window.innerHeight <= 700 ? -135 : window.innerWidth <= 640 ? -110 : -160, duration: 0.3, ease: "none" }, 0.10)
    .to(text, { opacity: 1, y: 0, duration: 0.15, ease: "none" }, 0.44)
    .to(text, { opacity: 1, duration: 0.40, ease: "none" }, 0.59)

  document.fonts?.ready.then(() => ScrollTrigger.refresh())
})()
