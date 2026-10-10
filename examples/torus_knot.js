// Torus Knot: one knotted shape, lit and turning.
// Use: drag to look around it.
// Try changing: 3, 5, how the knot winds (try 2, 3); 0.004, how fast it turns.
//
// Run it:   pictures run torus_knot.js

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
renderer.setPixelRatio(pixelRatio)
renderer.setSize(width, height, false)
const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100)
camera.position.z = 8
const controls = new addons.OrbitControls(camera, canvas)

const knot = new THREE.Mesh(new THREE.TorusKnotGeometry(1.6, 0.5, 200, 32, 3, 5),
  new THREE.MeshNormalMaterial())
scene.add(knot)

function draw() {
  knot.rotation.x += 0.004
  knot.rotation.y += 0.007
  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setSize(width, height, false)
  renderer.render(scene, camera)
}
