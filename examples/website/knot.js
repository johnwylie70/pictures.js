// A turning knot, for the example web page (index.html beside this file).
// Use: drag to turn it.
// Try changing: 0xffb347, its colour; 1.2, its size.

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
renderer.setPixelRatio(pixelRatio)
renderer.setSize(width, height, false)

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x101828)
const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100)
camera.position.set(0, 0, 6)
const controls = new addons.OrbitControls(camera, canvas)
controls.enableZoom = false      // so the page still scrolls over the scene

scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 1.5))
const light = new THREE.DirectionalLight(0xffffff, 2.5)
light.position.set(3, 4, 5)
scene.add(light)

const knot = new THREE.Mesh(new THREE.TorusKnotGeometry(1.2, 0.38, 200, 24),
  new THREE.MeshStandardMaterial({ color: 0xffb347, roughness: 0.3, metalness: 0.2 }))
scene.add(knot)

function update(dt) {
  knot.rotation.x += 0.4 * dt
  knot.rotation.y += 0.6 * dt
}

function draw() {
  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setSize(width, height, false)
  controls.update()
  renderer.render(scene, camera)
}
