// Solar System: planets going round a sun in 3D, a moon, and 2,000 stars.
// Use: drag to look around, scroll to zoom. Click, then the up and down arrows speed time up or slow it down.
// Try changing: the table of planets: a colour, a size, how far out, how fast; 2000, how many stars.
//
// Run it:   pictures run solar_system.js
// Share it: pictures build solar_system.js -o site/

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
renderer.setPixelRatio(pixelRatio)
renderer.setSize(width, height, false)

const scene = new THREE.Scene()
scene.background = new THREE.Color("black")
const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 500)
camera.position.set(0, 14, 24)
const controls = new addons.OrbitControls(camera, canvas)
controls.enableDamping = true

const between = (low, high) => low + Math.random() * (high - low)

// --- the sun: glows by itself, and lights everything ---------------------
const sun = new THREE.Mesh(new THREE.SphereGeometry(1.5, 48, 24), new THREE.MeshBasicMaterial({ color: "gold" }))
scene.add(sun)
scene.add(new THREE.PointLight("white", 400, 0))     // a bulb at the sun's centre
scene.add(new THREE.AmbientLight("white", 0.08))     // so night sides are not pure black

// --- planets ---------------------------------------------------------------
//  name       colour          size  distance  speed (turns a second)
const planetsData = [
  ["Mercury", "darkgray",      0.25,  3.0,  0.40],
  ["Venus",   "navajowhite",   0.45,  4.5,  0.25],
  ["Earth",   "royalblue",     0.5,   6.5,  0.16],
  ["Mars",    "orangered",     0.35,  8.5,  0.11],
  ["Jupiter", "sandybrown",    1.1,  12.0,  0.05],
]

const orbits = []     // { orbit, speed } pairs to turn each frame
let earth = null

for (const [name, colour, size, distance, speed] of planetsData) {
  const orbit = new THREE.Group()
  orbit.rotation.y = between(0, Math.PI * 2)      // start somewhere along the orbit
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
earth.add(moonOrbit)                  // the moon's group rides along with the Earth
const moon = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 8), new THREE.MeshStandardMaterial({ color: "lightgray" }))
moon.position.x = 0.9
moonOrbit.add(moon)

// --- stars: a few thousand points far away ---------------------------------
const positions = []
for (let i = 0; i < 2000; i++) {
  // a random direction, 80 to 150 units away
  const theta = between(0, Math.PI * 2)
  const phi = Math.acos(between(-1, 1))
  const r = between(80, 150)
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
  for (const { orbit, speed } of orbits) orbit.rotation.y += speed * Math.PI * 2 * dt * speedUp / 4
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
