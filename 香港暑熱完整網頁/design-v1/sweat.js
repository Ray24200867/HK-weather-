/* 人物插圖旁的汗水：淡藍水滴從頭部附近慢慢流下、拉長、淡出，不斷重複 */
(() => {
  const layer = document.querySelector(".people-strip .sweat")
  if (!layer) return
  // 每個人頭部附近的位置（佔插圖寬高的百分比），以及水滴放在人物前面或後面
  const SPOTS = [
    [8, 30, 1], [14, 22, 0], [21, 18, 1], [27, 12, 0], [33, 20, 1], [38, 10, 0],
    [45, 16, 1], [50, 26, 0], [56, 14, 1], [62, 8, 0], [70, 22, 1], [76, 12, 0],
    [82, 24, 1], [88, 10, 0], [94, 20, 1],
  ]
  const BLUES = ["#8DB4DE", "#B7D0EA", "#6F9FD1", "#DCE8F5"]
  SPOTS.forEach(([x, y, front], i) => {
    const size = 8 + (i * 7) % 10
    const drop = document.createElement("span")
    drop.className = "drop" + (front ? " front" : "")
    drop.style.left = `${x}%`
    drop.style.top = `${y}%`
    drop.style.setProperty("--s", `${size}px`)
    drop.style.setProperty("--c", BLUES[i % BLUES.length])
    drop.style.animationDuration = `${2.4 + (i % 5) * 0.35}s`
    drop.style.animationDelay = `${-(i * 0.47) % 3}s`
    layer.appendChild(drop)
    // 每隔幾滴加一顆小水珠
    if (i % 2 === 0) {
      const dot = document.createElement("span")
      dot.className = "drop dot" + (front ? " front" : "")
      dot.style.left = `${x + 2.2}%`
      dot.style.top = `${y + 4}%`
      dot.style.setProperty("--s", "5px")
      dot.style.setProperty("--c", BLUES[(i + 1) % BLUES.length])
      dot.style.animationDuration = `${2.8 + (i % 3) * 0.4}s`
      dot.style.animationDelay = `${-(i * 0.31) % 3}s`
      layer.appendChild(dot)
    }
  })
})()
