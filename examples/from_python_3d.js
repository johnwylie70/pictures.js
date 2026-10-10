// From Python, 3D: the Pyctures scene from_javascript_3d.py written in JavaScript. A blue cube spins.
// Try changing: 0.01 and 0.015, how fast it turns each way; 0x44aaff, its colour.
//
// Run it:   pictures run from_python_3d.js
// Share it: pictures build from_python_3d.js -o site/

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
renderer.setSize(width, height, false)
const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100)
camera.position.z = 4

const cube = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0x44aaff }))
scene.add(cube)
const light = new THREE.DirectionalLight(0xffffff, 3)
light.position.set(2, 3, 4)
scene.add(light)
scene.add(new THREE.AmbientLight(0xffffff, 0.3))

function draw() {
  cube.rotation.x += 0.01
  cube.rotation.y += 0.015
  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setSize(width, height, false)
  renderer.render(scene, camera)
}
