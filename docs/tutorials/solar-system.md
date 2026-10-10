# Tutorial: A Solar System

Full reference: [www.circuitry.dev/docs/pictures/tutorials/solar-system](https://www.circuitry.dev/docs/pictures/tutorials/solar-system) (in Circuitry Studio's help)

A glowing sun, planets going round it at different speeds, a moon going round one of the planets, and a sky full of stars. The trick that makes orbits easy is the **group**: put a planet in a group at the sun, move the planet out along the group's arm, and turning the group swings the planet round the sun.

## How an orbit works

```text
sun (in the middle)
└── orbit group  ← turn this
    └── planet   ← placed 4 units out along x
```

The planet never moves by itself. Its group turns, and it is carried round, like a ball on the end of a stick. A moon is one more level: a group inside the planet's group, at the planet's position, with the moon out on its own arm.

## The program

```js
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
renderer.setPixelRatio(pixelRatio)
renderer.setSize(width, height, false)

const scene = new THREE.Scene()
scene.background = new THREE.Color("black")
const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 500)
camera.position.set(0, 14, 24)
const controls = new addons.OrbitControls(camera, canvas)
controls.enableDamping = true

// --- the sun: glows by itself, and lights everything ---------------------
const sun = new THREE.Mesh(new THREE.SphereGeometry(1.5, 48, 24), new THREE.MeshBasicMaterial({ color: "gold" }))
scene.add(sun)
scene.add(new THREE.PointLight("white", 400, 0))     // a bulb at the sun's centre
scene.add(new THREE.AmbientLight("white", 0.08))     // so night sides are not pure black

// --- planets ---------------------------------------------------------------
//  name       colour         size  distance  speed (turns a second)
const planetsData = [
  ["Mercury", "darkgray",     0.25,  3.0,  0.40],
  ["Venus",   "navajowhite",  0.45,  4.5,  0.25],
  ["Earth",   "royalblue",    0.5,   6.5,  0.16],
  ["Mars",    "orangered",    0.35,  8.5,  0.11],
  ["Jupiter", "sandybrown",   1.1,  12.0,  0.05],
]

const orbits = []     // each group with its speed, to turn every frame
let earth = null

for (const [name, colour, size, distance, speed] of planetsData) {
  const orbit = new THREE.Group()
  orbit.rotation.y = Math.random() * Math.PI * 2      // start somewhere along the orbit
  scene.add(orbit)

  const planet = new THREE.Mesh(new THREE.SphereGeometry(size, 32, 16), new THREE.MeshStandardMaterial({ color: colour, roughness: 0.8 }))
  planet.position.x = distance
  orbit.add(planet)
  orbits.push({ orbit, speed })

  // a faint ring to show the path
  const path = new THREE.Mesh(
    new THREE.RingGeometry(distance - 0.02, distance + 0.02, 128),
    new THREE.MeshBasicMaterial({ color: "#333", side: THREE.DoubleSide }),
  )
  path.rotation.x = -Math.PI / 2
  scene.add(path)

  if (name === "Earth") earth = planet
}

// --- a moon going round the Earth ---------------------------------------
const moonOrbit = new THREE.Group()
earth.add(moonOrbit)                   // the moon's group rides along with the Earth
const moon = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 8), new THREE.MeshStandardMaterial({ color: "lightgray" }))
moon.position.x = 0.9
moonOrbit.add(moon)

// --- stars: a few thousand points far away ---------------------------------
const positions = []
for (let i = 0; i < 2000; i++) {
  // a random direction, 80 to 150 units away
  const theta = Math.random() * Math.PI * 2
  const phi = Math.acos(Math.random() * 2 - 1)
  const r = 80 + Math.random() * 70
  positions.push(r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta))
}
const starsGeometry = new THREE.BufferGeometry()
starsGeometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3))
scene.add(new THREE.Points(starsGeometry, new THREE.PointsMaterial({ color: "white", size: 0.4 })))

// --- every frame ---------------------------------------------------------
let speedUp = 1

function onKeyDown(key) {
  if (key === "ArrowUp") speedUp *= 2
  else if (key === "ArrowDown") speedUp /= 2
}

function update(dt) {
  for (const { orbit, speed } of orbits) {
    orbit.rotation.y += speed * Math.PI * 2 * dt * speedUp / 4
  }
  moonOrbit.rotation.y += 2 * dt * speedUp
  earth.rotation.y += 3 * dt * speedUp          // the Earth spins on its own axis too
  sun.rotation.y += 0.1 * dt
}

function draw() {
  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setSize(width, height, false)

  controls.update()
  renderer.render(scene, camera)
}
```

Drag to look around, pinch or scroll to zoom in, and press the up and down arrows to speed time up or slow it down. If the arrows do nothing, click the canvas once so it has the keyboard.

## What each part does

- **The sun** uses `MeshBasicMaterial`, which ignores light, so it always looks lit. The `PointLight` at the centre is what lights the planets, so each planet's sun-facing side is bright and its far side is dark. See [lighting a scene](../tutorials/lighting.md).
- **Each planet** sits `distance` units out along its own group's x axis. Turning the group (`orbit.rotation.y`) carries it round. Different speeds give different years.
- **The moon's group is added to the Earth**, so it goes wherever the Earth goes, and turns on its own as well.
- **The paths** are very thin flat rings (`RingGeometry`), laid flat by turning them a quarter turn about x.
- **The stars** are one `Points` object with 2,000 positions, placed on a big shell around everything.

The sizes and distances are chosen to fit on screen, not to scale: at true scale the planets would be too small to see.

## Try this

- Add Saturn with a ring: a `RingGeometry(1.4, 2.2, 64)` added to the planet, tilted a little with `rotation.x`.
- Tilt an orbit: set `orbit.rotation.z = 0.1` so the planet goes slightly above and below the others.
- Give Mars two small moons, each in its own group with its own speed.

## Related

- [3D scenes: groups](../3d.md#groups)
- [Tutorial: lighting a scene](../tutorials/lighting.md)
- Next: [a live chart](../tutorials/live-chart.md)
