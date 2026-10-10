// Lit Scene: shapes on a floor in 3D, with a spotlight and shadows.
// Use: drag to look around, pinch or scroll to zoom.
// Try changing: shapes, the list of what stands on the floor; 60, how bright the spotlight is.
//
// Run it:   pictures run lit_scene.js
// Share it: pictures build lit_scene.js -o site/

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
renderer.setPixelRatio(pixelRatio)
renderer.setSize(width, height, false)
renderer.shadowMap.enabled = true

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0e0e16)
const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100)
camera.position.set(4, 4, 7)
const controls = new addons.OrbitControls(camera, canvas)
controls.enableDamping = true

scene.add(new THREE.AmbientLight(0x404050))
const key = new THREE.SpotLight(0xffffff, 60, 30, 0.5, 0.4)
key.position.set(3, 8, 4)
key.castShadow = true
scene.add(key)

const floor = new THREE.Mesh(new THREE.CircleGeometry(6, 64), new THREE.MeshStandardMaterial({ color: 0x2a2a3a }))
floor.rotation.x = -Math.PI / 2
floor.receiveShadow = true
scene.add(floor)

const shapes = [
  [new THREE.BoxGeometry(1, 1, 1), 0xff6b6b],
  [new THREE.SphereGeometry(0.6, 48, 24), 0x4dabf7],
  [new THREE.TorusKnotGeometry(0.4, 0.15, 128, 16), 0xffd43b],
  [new THREE.ConeGeometry(0.6, 1.2, 32), 0x69db7c],
].map(([geo, colour], i) => {
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: colour, roughness: 0.35, metalness: 0.1 }))
  const a = i * Math.PI * 2 / 4
  mesh.position.set(Math.cos(a) * 2.2, 0.8, Math.sin(a) * 2.2)
  mesh.castShadow = true
  scene.add(mesh)
  return mesh
})

function draw() {
  shapes.forEach((m, i) => { m.rotation.y += 0.01 + i * 0.004 })
  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setSize(width, height, false)
  controls.update()
  renderer.render(scene, camera)
}
