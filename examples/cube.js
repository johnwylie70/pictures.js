// Cube: a blue cube in 3D, lit and turning.
// Use: drag to look round it.
// Try changing: 0x44aaff, its colour; 0.008, how fast it turns.
//
// Run it:   pictures run cube.js

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
renderer.setPixelRatio(pixelRatio)
renderer.setSize(width, height, false)
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x1b2430)
const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100)
camera.position.set(0, 1.2, 4)
const controls = new addons.OrbitControls(camera, canvas)

const cube = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.6, 1.6), new THREE.MeshStandardMaterial({ color: 0x44aaff }))
scene.add(cube)
const light = new THREE.DirectionalLight(0xffffff, 2.5)
light.position.set(3, 4, 5)
scene.add(light, new THREE.AmbientLight(0xffffff, 0.6))

function draw() {
  cube.rotation.y += 0.008
  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setSize(width, height, false)
  controls.update()
  renderer.render(scene, camera)
}
