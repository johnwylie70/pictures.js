// Wave Grid: 225 cubes rising and falling like water.
// Try changing: n, the cubes along each side; 0.8, the height and the width of the waves.
//
// Run it:   pictures run wave_grid.js

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
renderer.setPixelRatio(pixelRatio)
renderer.setSize(width, height, false)
const scene = new THREE.Scene()
scene.background = new THREE.Color("#0b0b14")
const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100)
camera.position.set(0, 12, 18)
camera.lookAt(0, 0, 0)
scene.add(new THREE.HemisphereLight("white", "#334", 2.5))

const n = 15
const cubes = []
for (let row = 0; row < n; row++) {
  for (let col = 0; col < n; col++) {
    const cube = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.6),
      new THREE.MeshStandardMaterial({ color: `hsl(${(row + col) * 12}, 80%, 55%)` }))
    cube.position.set(col - n / 2 + 0.5, 0, row - n / 2 + 0.5)
    scene.add(cube)
    cubes.push({ cube, distance: Math.hypot(col - n / 2, row - n / 2) })
  }
}

let t = 0

function update(dt) {
  t += dt
}

function draw() {
  for (const { cube, distance } of cubes) cube.position.y = Math.sin(distance * 0.8 - t * 3) * 0.8
  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setSize(width, height, false)
  renderer.render(scene, camera)
}
