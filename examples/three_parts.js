// Three Parts: three scenes on a timer, one after another, with a different change between each.
// Use: watch. Move the pointer over the picture for the scrubber: it has a tick where each part starts.
// Try changing: the three lengths; the transitions ("crossfade", "wipe", "slide_left", "fade", "cut").
//
// Run it:   pictures run three_parts.js

config({ transitionTime: 0.8 })   // for every scene

class Rings extends Scene {
  length = 4
  transition = "fade"             // how it arrives, when the last part has ended and this one comes round again

  draw() {
    background("#101830")
    for (let i = 0; i < 8; i++) {
      const size = ((sceneTime * 60 + i * 50) % 400)
      circle(width / 2, height / 2, size, { outline: `hsl(${200 + i * 12}, 80%, 60%)`, thickness: 4 })
    }
  }
}

class Bars extends Scene {
  length = 4
  transition = "wipe"

  draw() {
    background("#301020")
    const n = 16
    for (let i = 0; i < n; i++) {
      const tall = (Math.sin(sceneTime * 3 + i * 0.5) * 0.4 + 0.5) * height
      rect(i * width / n + 2, height - tall, width / n - 4, tall, `hsl(${330 + i * 6}, 80%, 60%)`)
    }
  }
}

class Stars extends Scene {
  length = 4
  transition = "slide_left"

  setup() {
    this.stars = []
    for (let i = 0; i < 80; i++) this.stars.push({ x: random(), y: random(), speed: random(0.05, 0.4) })
  }
  update(dt) {
    for (const star of this.stars) star.x = (star.x + star.speed * dt) % 1
  }
  draw() {
    background("black")
    for (const star of this.stars) circle(star.x * width, star.y * height, star.speed * 6, "white")
    if (sceneProgress > 0.5) section("Half way through the stars")   // a mark of your own on the scrubber
  }
}
