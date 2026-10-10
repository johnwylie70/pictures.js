// Cube Dodge: a 3D game. Blocks come towards you and you roll a ball out of their way.
// Use: the left and right arrow keys, or drag.
// Try changing: -4, -2, 0, 2, 4, the places a block can come; the colours, written like 0x22304a.
//
// Run it:   pictures run cube_dodge.js
// Share it: pictures build cube_dodge.js -o site/

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
renderer.setPixelRatio(pixelRatio)
renderer.setSize(width, height, false)
renderer.shadowMap.enabled = true

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x101828)
scene.fog = new THREE.Fog(0x101828, 20, 60)
const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100)
camera.position.set(0, 4, 9)
camera.lookAt(0, 0, -6)

scene.add(new THREE.HemisphereLight(0xffffff, 0x334455, 1.2))
const sun = new THREE.DirectionalLight(0xffffff, 2.5)
sun.position.set(4, 10, 6)
sun.castShadow = true
scene.add(sun)

const floor = new THREE.Mesh(new THREE.PlaneGeometry(12, 80), new THREE.MeshStandardMaterial({ color: 0x22304a }))
floor.rotation.x = -Math.PI / 2
floor.position.z = -30
floor.receiveShadow = true
scene.add(floor)

const player = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 16), new THREE.MeshStandardMaterial({ color: 0x44ddaa }))
player.position.y = 0.5
player.castShadow = true
scene.add(player)

const blockGeo = new THREE.BoxGeometry(1, 1, 1)
const blockMat = new THREE.MeshStandardMaterial({ color: 0xff5566 })
const lanes = [-4, -2, 0, 2, 4]
let blocks = []          // { mesh, x, z }
let x = 0
let score = 0
let alive = true
let spawn = 0

function newBlock() {
  const mesh = new THREE.Mesh(blockGeo, blockMat)
  mesh.castShadow = true
  const bx = lanes[Math.floor(Math.random() * lanes.length)]
  mesh.position.set(bx, 0.5, -60)
  scene.add(mesh)
  blocks.push({ mesh, x: bx, z: -60 })
}

function restart() {
  for (const b of blocks) scene.remove(b.mesh)
  blocks = []
  x = 0
  score = 0
  alive = true
}

function update(dt) {
  if (!alive) {
    if (keys.has(" ") || mouse.down) restart()
    return
  }
  if (keys.has("ArrowLeft")) x -= 8 * dt
  if (keys.has("ArrowRight")) x += 8 * dt
  if (mouse.down) x += ((mouse.x / width - 0.5) * 10 - x) * 0.2
  x = Math.max(-5, Math.min(5, x))
  score += dt
  const speed = 14 + score * 0.5
  spawn -= dt
  if (spawn <= 0) {
    spawn = Math.max(0.25, 0.8 - score * 0.01)
    newBlock()
  }
  blocks = blocks.filter((b) => {
    b.z += speed * dt
    if (b.z > 10) {
      scene.remove(b.mesh)
      return false
    }
    if (Math.abs(b.z) < 0.9 && Math.abs(b.x - x) < 0.9) alive = false
    return true
  })
}

function draw() {
  player.position.x = x
  player.rotation.x -= 0.15
  for (const b of blocks) b.mesh.position.z = b.z
  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setSize(width, height, false)
  renderer.render(scene, camera)
}

console.log("Dodge the red blocks. Your score is how long you last.")
