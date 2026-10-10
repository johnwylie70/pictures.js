// Textured Cube: a picture from a file, wrapped round a turning crate.
// Use: drag to turn it.
// Try changing: "textures/crate.png" to a picture of your own, beside the file; 0.008, how fast it turns.
//
// Run it:   pictures run textured_cube.js
// Share it: pictures build textured_cube.js -o site/

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
renderer.setPixelRatio(pixelRatio)
renderer.setSize(width, height, false)
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x1b2430)
const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100)
camera.position.set(0, 1.2, 4)
const controls = new addons.OrbitControls(camera, canvas)

const texture = new THREE.TextureLoader().load("textures/crate.png")
texture.colorSpace = THREE.SRGBColorSpace
const crate = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.6, 1.6), new THREE.MeshStandardMaterial({ map: texture }))
scene.add(crate)

const light = new THREE.DirectionalLight(0xffffff, 2.5)
light.position.set(3, 4, 5)
scene.add(light)
scene.add(new THREE.AmbientLight(0xffffff, 0.6))

function draw() {
  crate.rotation.y += 0.008
  crate.rotation.x = 0.35
  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setSize(width, height, false)
  controls.update()
  renderer.render(scene, camera)
}
