// Cube Spiral: 400 cubes in a rainbow spiral, turning.
// Try changing: count, how many cubes; 0.25, the size of a cube.
//
// Run it:   pictures run cube_spiral.js

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
renderer.setPixelRatio(pixelRatio)
renderer.setSize(width, height, false)
const scene = new THREE.Scene()
scene.background = new THREE.Color("#101018")
const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100)
camera.position.set(0, 5, 11)
camera.lookAt(0, 0, 0)
scene.add(new THREE.HemisphereLight("white", "#223", 2))

// 400 cubes in one InstancedMesh
const count = 400
const cubes = new THREE.InstancedMesh(new THREE.BoxGeometry(0.25, 0.25, 0.25), new THREE.MeshStandardMaterial(), count)
const place = new THREE.Matrix4()
for (let i = 0; i < count; i++) {
  const a = i * 0.25
  const r = 1 + i * 0.01
  place.setPosition(r * Math.cos(a), i * 0.008 - 1.6, r * Math.sin(a))
  cubes.setMatrixAt(i, place)
  cubes.setColorAt(i, new THREE.Color(`hsl(${i}, 80%, 60%)`))
}
cubes.instanceMatrix.needsUpdate = true
scene.add(cubes)

// a circle as a LineLoop, and a dashed line
const circle = []
for (let a = 0; a < 20; a++) {
  circle.push(new THREE.Vector3(4 * Math.cos(a / 20 * Math.PI * 2), -1.7, 4 * Math.sin(a / 20 * Math.PI * 2)))
}
scene.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(circle), new THREE.LineBasicMaterial({ color: "white" })))
const dashed = new THREE.Line(
  new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, -1.7, 0), new THREE.Vector3(0, 2.5, 0)]),
  new THREE.LineDashedMaterial({ color: "gold", dashSize: 0.2, gapSize: 0.1 }))
dashed.computeLineDistances()
scene.add(dashed)

// a label: a Sprite with a picture drawn on a 2D canvas
const label = document.createElement("canvas")
label.width = 256
label.height = 64
const pen = label.getContext("2d")
pen.fillStyle = "white"
pen.font = "bold 40px sans-serif"
pen.textAlign = "center"
pen.fillText("400 cubes", 128, 46)
const sign = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(label) }))
sign.scale.set(2, 0.5, 1)
sign.position.y = 2.8
scene.add(sign)

function draw() {
  cubes.rotation.y += 0.005
  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setSize(width, height, false)
  renderer.render(scene, camera)
}
