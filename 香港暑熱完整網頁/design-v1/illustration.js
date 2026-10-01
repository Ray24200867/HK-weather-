/* ================================================================
   女童遠足中暑的示意插畫：漫畫人物在真實的香港地圖上，隨捲動分段變化
   1 一家人沿南大嶼郊遊徑前行 → 2 太陽越來越猛（昂坪 31.6℃）
   → 3 女童不適 → 4 直升機吊救 → 5 沿路線飛往灣仔律敦治醫院
   由 story.js 在第 4 步呼叫 IllustrationScene.update(進度 0–1)
   ================================================================ */
window.IllustrationScene = (() => {
  const svg = document.querySelector("#illus")
  if (!svg) return { update() {} }
  const $ = (id) => svg.querySelector(`#${id}`)

  const ease = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t))
  const seg = (p, a, b) => ease((p - a) / (b - a))
  const lerp = (a, b, t) => a + (b - a) * t
  const set = (el, attr, v) => el && el.setAttribute(attr, v)
  const op = (el, v) => el && (el.style.opacity = v)

  const trail = $("trail"), route = $("route")
  const family = $("family"), dad = $("dad"), mom = $("mom")
  const childStand = $("child-stand"), childSick = $("child-sick"), dizzy = $("dizzy")
  const legs = [...svg.querySelectorAll(".leg")]
  const sunGroup = $("sun-group"), rays = $("sun-rays"), heatGlow = $("heat")
  const heli = $("heli"), winch = $("winch"), basket = $("basket"), basketChild = $("basket-child")
  const hospital = $("hospital")
  const cap = { trail: $("cap-trail"), ngp: $("cap-ngp"), heli: $("cap-heli"), hosp: $("cap-hosp") }

  // 醫院天台位置（取自路線終點）
  const routeEnd = route.getPointAtLength(route.getTotalLength())
  const trailLen = trail.getTotalLength()

  // 已飛過的路線：虛線逐段出現
  const flown = document.createElementNS("http://www.w3.org/2000/svg", "polyline")
  flown.setAttribute("fill", "none")
  flown.setAttribute("stroke", "#16293F")
  flown.setAttribute("stroke-width", "3")
  flown.setAttribute("stroke-dasharray", "10 8")
  flown.setAttribute("stroke-linecap", "round")
  route.after(flown)
  route.style.display = "none"

  function update(p) {
    const walk = seg(p, 0, 0.26)       // 1 遠足
    const heat = seg(p, 0.12, 0.38)    // 2 烈日
    const sick = seg(p, 0.36, 0.48)    // 3 不適
    const fly = seg(p, 0.5, 0.62)      // 4 直升機飛到
    const lift = seg(p, 0.62, 0.72)    //   吊上機
    const go = seg(p, 0.74, 0.96)      // 5 送院

    // 一家人沿郊遊徑前行，腳步跟着捲動擺動
    const at = trail.getPointAtLength(trailLen * lerp(0.05, 1, walk))
    set(family, "transform", `translate(${at.x} ${at.y}) scale(1.35)`)   // 人物放大，在地圖上看得清楚
    const swing = walk > 0 && walk < 1 ? Math.sin(walk * 40) * 22 : 0
    legs.forEach((leg, i) => set(leg, "transform", `rotate(${i % 2 ? swing : -swing} 0 -24)`))
    set(dad, "transform", "translate(-48 0)")
    set(mom, "transform", `translate(-24 0) rotate(${18 * sick} 0 0)`)
    set(childStand, "transform", "translate(4 0)")
    set(childSick, "transform", "translate(4 0)")

    // 太陽變大，女童附近出現熱力光暈
    set(sunGroup, "transform", `translate(150 585) scale(${lerp(0.8, 1.35, heat)})`)
    set(rays, "transform", `rotate(${p * 120})`)
    op(heatGlow, heat * (1 - go))
    set(heatGlow, "cx", at.x - 20); set(heatGlow, "cy", at.y - 30)

    // 女童不適
    const picked = lift >= 0.5
    op(childStand, 1 - sick)
    op(childSick, picked ? 0 : sick)
    op(dizzy, picked ? 0 : sick)

    // 直升機由上方飛到女童上空，吊籃接走女童
    const hover = { x: at.x + 22, y: at.y - 190 }   // 對準彎腰的女童
    const ropeMax = 106
    const rope = fly >= 1 && go === 0 ? ropeMax * (lift < 0.5 ? lift * 2 : (1 - lift) * 2) : 0
    set(winch, "y2", 24 + rope)
    set(basket, "transform", `translate(0 ${24 + rope})`)
    op(basket, fly >= 1 && go === 0 && lift > 0 && lift < 1 ? 1 : 0)
    op(basketChild, picked ? 1 : 0)

    // 直升機路線：由吊救點飛越海面到醫院天台
    set(route, "d", `M${hover.x} ${hover.y} Q560 560 ${routeEnd.x} ${routeEnd.y}`)
    const len = route.getTotalLength()
    let hx, hy
    if (go > 0) {
      const pt = route.getPointAtLength(len * go)
      hx = pt.x; hy = pt.y
      const pts = []
      for (let i = 0; i <= 40; i++) {
        const q = route.getPointAtLength(len * go * (i / 40))
        pts.push(`${q.x.toFixed(1)},${q.y.toFixed(1)}`)
      }
      set(flown, "points", pts.join(" "))
    } else {
      hx = lerp(hover.x + 160, hover.x, fly)
      hy = lerp(420, hover.y, fly)
      set(flown, "points", "")
    }
    set(heli, "transform", `translate(${hx} ${hy}) scale(${lerp(1, 0.6, go)})`)   // 飛向醫院時縮小，停在天台上

    // 家人在直升機離開後留在原地；醫院在路線後段出現
    op(family, 1 - go * 0.6)
    op(hospital, seg(p, 0.8, 0.9))

    // 漫畫旁白框
    op(cap.trail, seg(p, 0.02, 0.08) * (1 - seg(p, 0.5, 0.56)))
    op(cap.ngp, seg(p, 0.2, 0.28) * (1 - seg(p, 0.6, 0.66)))
    op(cap.heli, seg(p, 0.55, 0.62) * (1 - seg(p, 0.92, 0.97)))
    op(cap.hosp, seg(p, 0.9, 0.96))
  }

  update(0)
  return { update }
})()
