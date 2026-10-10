# 3D Functions

Full reference: [www.circuitry.dev/docs/pictures/3d-functions](https://www.circuitry.dev/docs/pictures/3d-functions) (in Circuitry Studio's help)

The 3D parts you can use in a scene, grouped by job, one line each. `THREE` is the full three.js 3D toolkit, so everything in its documentation works; this page covers the parts used most. For the rest, see [threejs.org/docs](https://threejs.org/docs/).

New to 3D? Start with [3D scenes](3d.md) and the [spinning cube tutorial](tutorials/spinning-cube.md), and come back here to look things up.

**Writing three.js in a scene.** `new` makes something new: `new THREE.Mesh(...)`. Options are an object: `new THREE.MeshStandardMaterial({ color: "red", roughness: 0.4 })`. Values are ordinary values: `mesh.rotation.y += 0.01` changes one and `mesh.position.x` reads one, at once. There is nothing to import: `THREE` and `addons.OrbitControls` are ready.

## Renderer

The renderer draws the scene onto the canvas. Start every 3D program with the first three lines.

| Code | What it does |
|---|---|
| `const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })` | Makes a renderer that draws on the canvas, with smooth edges |
| `renderer.setPixelRatio(pixelRatio)` | Sharp on high-resolution screens |
| `renderer.setSize(width, height, false)` | Fits the canvas. Call it again in `draw()`, so the picture follows the canvas when it is resized. |
| `renderer.render(scene, camera)` | Draws one picture; call it in `draw()` |
| `renderer.setClearColor("navy", 1)` | The colour behind the scene when it has no background; the second number is how solid |
| `renderer.shadowMap.enabled = true` | Turns shadows on ([Lights](#lights)) |
| `renderer.shadowMap.type = THREE.PCFSoftShadowMap` | Soft-edged shadows. Also `BasicShadowMap` (hard, fastest), `PCFShadowMap` (the default), `VSMShadowMap`. |
| `renderer.toneMapping = THREE.ACESFilmicToneMapping` | Softens very bright light the way a film camera does. Also `NoToneMapping` (the default), `LinearToneMapping`, `ReinhardToneMapping`, `AgXToneMapping`, `NeutralToneMapping`. |
| `renderer.toneMappingExposure = 1.2` | Overall brightness when tone mapping is on |
| `renderer.outputColorSpace = THREE.SRGBColorSpace` | How colours are sent to the screen. This is already the default; leave it unless you know you need `LinearSRGBColorSpace`. |

## Scene and fog

| Code | What it does |
|---|---|
| `const scene = new THREE.Scene()` | The world everything goes in |
| `scene.add(thing)`, `scene.remove(thing)` | Puts something in the world, or takes it out |
| `scene.background = new THREE.Color("skyblue")` | The colour behind everything. A texture works too. |
| `scene.fog = new THREE.Fog("white", near, far)` | Fog that starts at distance `near` and hides everything by `far`. Use the background colour for the fog colour. |
| `scene.fog = new THREE.FogExp2("white", 0.05)` | Fog that thickens steadily with distance; the number is how thick |

## Cameras

| Code | What it does |
|---|---|
| `new THREE.PerspectiveCamera(fov, width / height, near, far)` | A camera that sees the way eyes do: far things look smaller. `fov` is how wide it sees, in degrees (50 to 75 is usual); it sees from `near` to `far`. |
| `new THREE.OrthographicCamera(left, right, top, bottom, near, far)` | A camera with no perspective: far things look the same size. Good for plans, maps and some games. Set its sides from `width` and `height`. |
| `camera.position.set(x, y, z)` | Where the camera is |
| `camera.lookAt(x, y, z)` | Points it at a spot |
| `camera.aspect = width / height` | The shape of a perspective camera's picture; follow with `camera.updateProjectionMatrix()` |
| `camera.fov = 30`, `camera.near`, `camera.far`, `camera.zoom = 2` | Change its settings; follow with `camera.updateProjectionMatrix()` |
| `camera.updateProjectionMatrix()` | Applies changed camera settings |

A camera is not refitted for you when the canvas is resized. Set `camera.aspect` from `width` and `height` in `draw()`, as every program on this page does.

## Geometries: shapes

A geometry is a shape. Put it in a `THREE.Mesh` with a material to see it. Sizes are in scene units; the optional numbers at the end (segments) say how smooth curved surfaces are.

| Code | Shape |
|---|---|
| `new THREE.BoxGeometry(w, h, d)` | A box |
| `new THREE.SphereGeometry(radius, 32, 16)` | A ball |
| `new THREE.PlaneGeometry(w, h)` | A flat rectangle, facing you. Turn it flat with `mesh.rotation.x = -Math.PI / 2` for a floor. |
| `new THREE.CircleGeometry(radius, 32)` | A flat disc |
| `new THREE.RingGeometry(inner, outer, 32)` | A flat ring, like a washer |
| `new THREE.CylinderGeometry(topRadius, bottomRadius, height, 32)` | A cylinder; different radii make a tapered tube |
| `new THREE.ConeGeometry(radius, height, 32)` | A cone |
| `new THREE.CapsuleGeometry(radius, length, 8, 16)` | A pill |
| `new THREE.TorusGeometry(radius, tube, 16, 64)` | A ring doughnut |
| `new THREE.TorusKnotGeometry(radius, tube, 128, 16)` | A knotted tube |
| `new THREE.TetrahedronGeometry(radius)` | 4 faces |
| `new THREE.OctahedronGeometry(radius)` | 8 faces |
| `new THREE.DodecahedronGeometry(radius)` | 12 faces |
| `new THREE.IcosahedronGeometry(radius, detail)` | 20 faces; raise `detail` to make it rounder |
| `new THREE.LatheGeometry(points, 32)` | Spins a side outline (a list of `THREE.Vector2`) round the up axis, like a vase on a potter's wheel |
| `new THREE.ExtrudeGeometry(shape, { depth: 0.5, bevelEnabled: false })` | Pushes a flat `THREE.Shape` out into a solid, like a cookie cutter |
| `new THREE.TubeGeometry(curve, 64, radius, 8, false)` | A tube along a curve, such as `new THREE.CatmullRomCurve3([...points])` |
| `new THREE.EdgesGeometry(geometry)` | Just the edges of another shape, for `LineSegments` |
| `new THREE.WireframeGeometry(geometry)` | Every triangle's edges, for `LineSegments` |
| `new THREE.BufferGeometry()` | Your own shape from numbers: `geometry.setAttribute("position", new THREE.Float32BufferAttribute(numbers, 3))`, three numbers per corner |

A `new THREE.Shape()` is drawn like a 2D path: `shape.moveTo(x, y)`, `shape.lineTo(x, y)`, `shape.quadraticCurveTo(...)`, `shape.bezierCurveTo(...)`, `shape.absarc(x, y, r, start, end)`, `shape.closePath()`.

```js
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
renderer.setPixelRatio(pixelRatio)
renderer.setSize(width, height, false)
const scene = new THREE.Scene()
scene.background = new THREE.Color("#15151c")
const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100)
camera.position.set(0, 0, 18)
scene.add(new THREE.HemisphereLight("white", "#334", 1.5))
const sun = new THREE.DirectionalLight("white", 2)
sun.position.set(3, 5, 6)
scene.add(sun)

// a star outline, for ExtrudeGeometry
const star = new THREE.Shape()
for (let i = 0; i < 10; i++) {
  const r = i % 2 === 0 ? 0.7 : 0.3
  const a = i * Math.PI / 5 + Math.PI / 2
  if (i === 0) star.moveTo(r * Math.cos(a), r * Math.sin(a))
  else star.lineTo(r * Math.cos(a), r * Math.sin(a))
}
star.closePath()

// a vase outline, for LatheGeometry
const vase = []
for (let i = 0; i < 11; i++) {
  vase.push(new THREE.Vector2(0.25 + 0.3 * Math.sin(i / 2.5), i * 0.14 - 0.7))
}

// a wiggly path, for TubeGeometry
const path = new THREE.CatmullRomCurve3([
  new THREE.Vector3(-0.7, -0.5, 0), new THREE.Vector3(-0.3, 0.6, 0.3),
  new THREE.Vector3(0.3, -0.6, -0.3), new THREE.Vector3(0.7, 0.5, 0),
])

const shapes = [
  new THREE.BoxGeometry(1.1, 1.1, 1.1),
  new THREE.SphereGeometry(0.7, 32, 16),
  new THREE.PlaneGeometry(1.3, 1.3),
  new THREE.CircleGeometry(0.7, 32),
  new THREE.RingGeometry(0.35, 0.7, 32),
  new THREE.CylinderGeometry(0.5, 0.5, 1.3, 32),
  new THREE.ConeGeometry(0.6, 1.3, 32),
  new THREE.CapsuleGeometry(0.4, 0.6, 8, 16),
  new THREE.TorusGeometry(0.5, 0.2, 16, 48),
  new THREE.TorusKnotGeometry(0.45, 0.14, 100, 16),
  new THREE.TetrahedronGeometry(0.8),
  new THREE.OctahedronGeometry(0.75),
  new THREE.DodecahedronGeometry(0.7),
  new THREE.IcosahedronGeometry(0.7),
  new THREE.LatheGeometry(vase, 32),
  new THREE.ExtrudeGeometry(star, { depth: 0.3, bevelEnabled: false }),
  new THREE.TubeGeometry(path, 64, 0.12, 8, false),
]
const meshes = []
for (let i = 0; i < shapes.length; i++) {
  const mesh = new THREE.Mesh(shapes[i], new THREE.MeshStandardMaterial({
    color: `hsl(${i * 21}, 70%, 60%)`, roughness: 0.5, side: THREE.DoubleSide,
  }))
  mesh.position.set((i % 6 - 2.5) * 2.1, 2.3 - Math.floor(i / 6) * 2.3, 0)
  scene.add(mesh)
  meshes.push(mesh)
}

// EdgesGeometry and WireframeGeometry draw lines, not surfaces
const box = new THREE.BoxGeometry(1.1, 1.1, 1.1)
const edges = new THREE.LineSegments(new THREE.EdgesGeometry(box), new THREE.LineBasicMaterial({ color: "white" }))
edges.position.set(2.5 * 2.1, -2.3, 0)
scene.add(edges)
meshes.push(edges)

let t = 0

function update(dt) {
  t += dt
}

function draw() {
  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setSize(width, height, false)

  for (const m of meshes) {
    m.rotation.x = 0.5
    m.rotation.y = 0.6 + 0.4 * Math.sin(t)     // rock gently, so flat shapes stay in view
  }
  renderer.render(scene, camera)
}
```

From the top left: box, sphere, plane, circle, ring, cylinder; cone, capsule, torus, torus knot, tetrahedron, octahedron; dodecahedron, icosahedron, lathe, extrude, tube and edges.

## Materials: how surfaces look

| Code | Looks |
|---|---|
| `new THREE.MeshBasicMaterial({ color: … })` | Flat colour, ignores light, always visible |
| `new THREE.MeshLambertMaterial({ color: … })` | Matte, like chalk or paper |
| `new THREE.MeshPhongMaterial({ color: …, shininess: 80, specular: "white" })` | Shiny highlights, like plastic |
| `new THREE.MeshStandardMaterial({ color: …, roughness: 0.5, metalness: 0 })` | Realistic. `roughness` 0 is polished, 1 is rough; `metalness` 1 is metal. |
| `new THREE.MeshPhysicalMaterial({ color: …, clearcoat: 1, transmission: 0.9, thickness: 0.5 })` | Standard, plus extras: `clearcoat` (a varnish layer), `transmission` (glass that lets light through), `sheen` (cloth), `iridescence` (soap-bubble colours) |
| `new THREE.MeshToonMaterial({ color: … })` | Cartoon shading in a few flat bands |
| `new THREE.MeshNormalMaterial()` | Rainbow colours by which way each face points; needs no light |
| `new THREE.MeshDepthMaterial()` | White near the camera, fading to black far away |
| `new THREE.LineBasicMaterial({ color: … })` | For lines (`Line`, `LineSegments`, `LineLoop`) |
| `new THREE.LineDashedMaterial({ color: …, dashSize: 0.2, gapSize: 0.1 })` | Dashed lines; call `line.computeLineDistances()` once |
| `new THREE.PointsMaterial({ color: …, size: 0.05 })` | For `Points` |
| `new THREE.SpriteMaterial({ map: texture })` | For `THREE.Sprite`, a picture that always faces the camera |

Options most materials take:

| Option | What it does |
|---|---|
| `color: "tomato"` | The surface colour ([Colours](colours.md#colours-in-3d)) |
| `emissive: "orange"`, `emissiveIntensity: 1` | A glow the surface gives off by itself |
| `map: texture` | A picture wrapped round the surface ([Textures](#textures)) |
| `roughness`, `metalness` | Standard and Physical only: rough or polished, metal or not |
| `wireframe: true` | Draws the edges of every triangle only |
| `flatShading: true` | Shows the flat faces rather than smoothing over them |
| `side: THREE.DoubleSide` | Shows both sides of flat shapes (`FrontSide` is the default, `BackSide` the inside) |
| `transparent: true, opacity: 0.5` | See-through; `opacity` does nothing without `transparent` |

```js
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
renderer.setPixelRatio(pixelRatio)
renderer.setSize(width, height, false)
const scene = new THREE.Scene()
scene.background = new THREE.Color("#20232b")
const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100)
camera.position.set(0, 0, 14)
scene.add(new THREE.AmbientLight("white", 0.3))
const sun = new THREE.DirectionalLight("white", 2.5)
sun.position.set(-3, 4, 5)
scene.add(sun)

const materials = [
  new THREE.MeshBasicMaterial({ color: "tomato" }),
  new THREE.MeshLambertMaterial({ color: "tomato" }),
  new THREE.MeshPhongMaterial({ color: "tomato", shininess: 100 }),
  new THREE.MeshStandardMaterial({ color: "tomato", roughness: 0.3 }),
  new THREE.MeshStandardMaterial({ color: "gold", roughness: 0.3, metalness: 0.6 }),
  new THREE.MeshPhysicalMaterial({ color: "tomato", roughness: 0.4, clearcoat: 1 }),
  new THREE.MeshToonMaterial({ color: "tomato" }),
  new THREE.MeshNormalMaterial(),
  new THREE.MeshStandardMaterial({ color: "tomato", wireframe: true }),
  new THREE.MeshStandardMaterial({ color: "tomato", flatShading: true }),
  new THREE.MeshStandardMaterial({ color: "#311", emissive: "orange", emissiveIntensity: 0.8 }),
  new THREE.MeshStandardMaterial({ color: "deepskyblue", transparent: true, opacity: 0.4 }),
]
const balls = []
for (let i = 0; i < materials.length; i++) {
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.8, 32, 16), materials[i])
  ball.position.set((i % 4 - 1.5) * 2.1, 2.3 - Math.floor(i / 4) * 2.3, 0)
  scene.add(ball)
  balls.push(ball)
}

function draw() {
  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setSize(width, height, false)

  for (const b of balls) b.rotation.y += 0.01
  renderer.render(scene, camera)
}
```

Top row: basic, Lambert, Phong, standard. Middle row: standard with some metalness, physical with clearcoat, toon, normal. Bottom row: wireframe, flat shading, emissive, see-through. Shiny metal reflects its surroundings, so in a scene with nothing round it, full metalness looks dark.

## Lights

| Code | What it is |
|---|---|
| `new THREE.AmbientLight(colour, intensity)` | A little light everywhere, from no direction |
| `new THREE.HemisphereLight(sky, ground, intensity)` | Sky colour from above, ground colour from below |
| `new THREE.DirectionalLight(colour, intensity)` | The sun: parallel light from `position` towards `target` (the middle unless you move it) |
| `new THREE.PointLight(colour, intensity, distance, decay)` | A bulb: light in every direction from one spot. `distance` 0 means no cut-off; `decay` 2 is natural fading. |
| `new THREE.SpotLight(colour, intensity, distance, angle, penumbra, decay)` | A torch: a cone of light from `position` towards `target`. `angle` is how wide in radians; `penumbra` 0 to 1 how soft the edge is. |
| `new THREE.RectAreaLight(colour, intensity, w, h)` | A glowing panel, like a window or a softbox. Lights only Standard and Physical materials, and casts no shadows. Point it with `light.lookAt(x, y, z)`. |

Settings lights share:

| Code | What it does |
|---|---|
| `light.intensity = 2` | Brightness |
| `light.color.set("orange")` | Colour |
| `light.position.set(x, y, z)` | Where it is |
| `light.target.position.set(x, y, z)` | Where directional and spot lights point; also `scene.add(light.target)` |
| `light.visible = false` | Switches it off |
| `light.castShadow = true` | Directional, point and spot lights can cast shadows (turn on `renderer.shadowMap.enabled` and set `castShadow`/`receiveShadow` on objects) |
| `light.shadow.mapSize.width = 2048` (and `.height`) | Sharper shadows, at a cost in speed |
| `light.shadow.bias = -0.0005` | Removes stripy marks on surfaces that shadow themselves |
| `light.shadow.radius = 4` | Blurs shadow edges (with `PCFSoftShadowMap` off, `PCFShadowMap` on) |
| `light.shadow.camera.left` / `right` / `top` / `bottom` | How big an area a directional light's shadows cover |

The [lighting tutorial](tutorials/lighting.md) explains each light and shadows step by step. This program shows each light on its own, in six small views of the same scene:

```js
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
renderer.setPixelRatio(pixelRatio)
renderer.setSize(width, height, false)
renderer.shadowMap.enabled = true
renderer.setScissorTest(true)       // lets us draw into one part of the canvas at a time
const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100)
camera.position.set(4, 4, 6)
camera.lookAt(0, 0.6, 0)

function makeScene(light) {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color("#0c0c10")
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), new THREE.MeshStandardMaterial({ color: "#999" }))
  floor.rotation.x = -Math.PI / 2
  floor.receiveShadow = true
  scene.add(floor)
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.8, 32, 16), new THREE.MeshStandardMaterial({ color: "tomato", roughness: 0.4 }))
  ball.position.set(-0.9, 0.8, 0)
  const box = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2), new THREE.MeshStandardMaterial({ color: "mediumseagreen" }))
  box.position.set(1, 0.6, 0.3)
  for (const thing of [ball, box]) {
    thing.castShadow = true
    scene.add(thing)
  }
  scene.add(light)
  return scene
}

const sun = new THREE.DirectionalLight("white", 3)
sun.position.set(4, 6, 3)
sun.castShadow = true
const bulb = new THREE.PointLight("orange", 30, 0)
bulb.position.set(0, 2.2, 1.5)
bulb.castShadow = true
const spot = new THREE.SpotLight("white", 60, 0, 0.45, 0.4)
spot.position.set(-3, 5, 2)
spot.castShadow = true
const panel = new THREE.RectAreaLight("white", 6, 3, 1.5)
panel.position.set(0, 3, 2.5)
panel.lookAt(0, 0, 0)

const views = [
  makeScene(new THREE.AmbientLight("white", 1)),
  makeScene(new THREE.HemisphereLight("skyblue", "saddlebrown", 2.5)),
  makeScene(sun),
  makeScene(bulb),
  makeScene(spot),
  makeScene(panel),
]

function draw() {
  renderer.setSize(width, height, false)
  const w = width / 3, h = height / 2
  camera.aspect = w / h
  camera.updateProjectionMatrix()
  for (let i = 0; i < views.length; i++) {
    const x = (i % 3) * w
    const y = (1 - Math.floor(i / 3)) * h      // y counts up from the bottom here
    renderer.setViewport(x, y, w, h)
    renderer.setScissor(x, y, w, h)
    renderer.render(views[i], camera)
  }
}
```

Top row: ambient, hemisphere, directional. Bottom row: point, spot, rectangle area.

## Objects

| Code | What it is |
|---|---|
| `new THREE.Mesh(geometry, material)` | A solid object |
| `new THREE.Group()` | An empty holder: things added to it move, turn and scale with it |
| `new THREE.Points(geometry, new THREE.PointsMaterial({ size: 0.05 }))` | A dot at every position in the geometry |
| `new THREE.Line(geometry, material)` | A line through the positions, in order |
| `new THREE.LineLoop(geometry, material)` | The same, joined back to the start |
| `new THREE.LineSegments(geometry, material)` | Separate lines, one for each pair of positions |
| `new THREE.Sprite(new THREE.SpriteMaterial({ map: texture }))` | A flat picture that always faces the camera, for labels and particles. Write `THREE.Sprite`: plain `Sprite` is the 2D one. |
| `new THREE.InstancedMesh(geometry, material, count)` | Many copies of one mesh drawn at once, much faster than many meshes. Place each with `mesh.setMatrixAt(i, matrix)`, then set `mesh.instanceMatrix.needsUpdate = true`. Colour each with `mesh.setColorAt(i, new THREE.Color(...))`. |

A geometry for lines and points is made from a list of positions: `new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 1, 0)])`.

```js
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
  cubes.setColorAt(i, new THREE.Color(`hsl(${i % 360}, 80%, 60%)`))
}
cubes.instanceMatrix.needsUpdate = true
scene.add(cubes)

// a circle as a LineLoop, and a dashed line
const circle = []
for (let i = 0; i < 20; i++) {
  const a = i / 20 * Math.PI * 2
  circle.push(new THREE.Vector3(4 * Math.cos(a), -1.7, 4 * Math.sin(a)))
}
scene.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(circle), new THREE.LineBasicMaterial({ color: "white" })))
const dashed = new THREE.Line(
  new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, -1.7, 0), new THREE.Vector3(0, 2.5, 0)]),
  new THREE.LineDashedMaterial({ color: "gold", dashSize: 0.2, gapSize: 0.1 }),
)
dashed.computeLineDistances()
scene.add(dashed)

// a label: a THREE.Sprite with a picture drawn on a 2D canvas
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
  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setSize(width, height, false)

  cubes.rotation.y += 0.005
  renderer.render(scene, camera)
}
```

## Moving and arranging

Every object has these:

| Code | What it does |
|---|---|
| `thing.position.set(x, y, z)`, `thing.position.x = 2` | Where it is. `y` is up. |
| `thing.rotation.set(x, y, z)`, `thing.rotation.y += 0.01` | How it is turned round each axis, in radians |
| `thing.scale.set(2, 1, 1)`, `thing.scale.setScalar(2)` | How big it is along each axis |
| `thing.lookAt(x, y, z)` | Turns it to face a spot |
| `thing.add(other)`, `thing.remove(other)` | Puts `other` inside `thing`, so it moves with it ([groups](3d.md#groups)) |
| `thing.visible = false` | Hides it |
| `thing.name = "door"` | A name, handy when [picking](#picking-and-controls) |
| `thing.castShadow`, `thing.receiveShadow` | Whether it makes shadows and shows them |
| `thing.traverse((child) => { … })` | Calls your function for `thing` and for everything inside it |

To change many objects, keep them in an array and loop over it, or `traverse` the group they are in.

## Textures

A texture is a picture wrapped round a surface. Give it to a material as `map: texture`.

| Code | What it does |
|---|---|
| `new THREE.TextureLoader().load(address)` | Loads a picture from a path (`"textures/brick.png"`) or a web address, whose site must allow other pages to use its pictures. The path is taken from the page, which with `run` and `build` is beside the scene. In Circuitry Studio's editor, a path written as a quoted string loads from the scene's folder, as `loadImage` does. |
| `new THREE.CanvasTexture(aCanvas)` | Uses a 2D canvas you drew on as the picture: text, patterns, anything from [2D functions](2d-functions.md) |
| `texture.needsUpdate = true` | After you draw on that canvas again, shows the change |
| `texture.wrapS = texture.wrapT = THREE.RepeatWrapping` | Lets the picture repeat across and down |
| `texture.repeat.set(4, 4)` | How many times it repeats |
| `texture.colorSpace = THREE.SRGBColorSpace` | Shows a photo's colours correctly |
| `texture.magFilter = THREE.NearestFilter` | Keeps pixel-art textures blocky |

```js
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
renderer.setPixelRatio(pixelRatio)
renderer.setSize(width, height, false)
const scene = new THREE.Scene()
scene.background = new THREE.Color("#1a1a22")
scene.fog = new THREE.Fog("#1a1a22", 6, 18)
const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100)
camera.position.set(0, 2.5, 5)
camera.lookAt(0, 0.5, 0)
scene.add(new THREE.HemisphereLight("white", "#334", 2.5))

// draw a checkerboard on a small 2D canvas...
const board = document.createElement("canvas")
board.width = 64
board.height = 64
const pen = board.getContext("2d")
for (let row = 0; row < 8; row++) {
  for (let col = 0; col < 8; col++) {
    pen.fillStyle = (row + col) % 2 === 0 ? "#eee" : "#447"
    pen.fillRect(col * 8, row * 8, 8, 8)
  }
}

// ...and use it as a repeating floor texture
const floorTexture = new THREE.CanvasTexture(board)
floorTexture.wrapS = floorTexture.wrapT = THREE.RepeatWrapping
floorTexture.repeat.set(6, 6)
floorTexture.magFilter = THREE.NearestFilter
const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshStandardMaterial({ map: floorTexture }))
floor.rotation.x = -Math.PI / 2
scene.add(floor)

// a die: one canvas per face
const faces = []
for (let n = 1; n <= 6; n++) {
  const face = document.createElement("canvas")
  face.width = 128
  face.height = 128
  const p = face.getContext("2d")
  p.fillStyle = "white"
  p.fillRect(0, 0, 128, 128)
  p.fillStyle = "crimson"
  p.font = "bold 90px sans-serif"
  p.textAlign = "center"
  p.textBaseline = "middle"
  p.fillText(String(n), 64, 70)
  faces.push(new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(face) }))
}
const die = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2), faces)
die.position.y = 0.9
scene.add(die)

function draw() {
  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setSize(width, height, false)

  die.rotation.x += 0.007
  die.rotation.y += 0.01
  renderer.render(scene, camera)
}
```

A mesh given a list of six materials uses one per face of a box, as the die does.

## Helpers

Lines that help you see what is going on while you build a scene. Remove them when you are done.

| Code | Shows |
|---|---|
| `new THREE.GridHelper(size, divisions)` | A grid on the floor |
| `new THREE.AxesHelper(length)` | The three axes: x red, y green, z blue |
| `new THREE.DirectionalLightHelper(light, size)` | Where a directional light is and which way it points |
| `new THREE.PointLightHelper(light, size)` | Where a point light is |
| `new THREE.SpotLightHelper(light)` | A spot light's cone |
| `new THREE.HemisphereLightHelper(light, size)` | A hemisphere light |
| `new THREE.CameraHelper(light.shadow.camera)` | The box a light's shadows cover |
| `new THREE.BoxHelper(thing, "yellow")` | A box round an object |

## Maths

| Code | What it is |
|---|---|
| `new THREE.Vector3(x, y, z)` | A position or direction in 3D. `.set`, `.add(v)`, `.multiplyScalar(n)`, `.normalize()`, `.lerp(v, t)` |
| `new THREE.Vector2(x, y)` | The same in 2D |
| `new THREE.Color(…)` | A colour ([Colours](colours.md#colours-in-3d)) |
| `new THREE.Euler(x, y, z)` | A turn round each axis, in radians: what `rotation` is |
| `new THREE.Quaternion()` | Another way to store a turn, which never gets stuck. `thing.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle)` |
| `new THREE.Matrix4()` | Position, turn and size in one; used by `InstancedMesh`. `.setPosition(x, y, z)`, `.makeRotationY(a)`, `.compose(position, quaternion, scale)` |
| `THREE.MathUtils.degToRad(90)` | Degrees to radians. `90 * Math.PI / 180` is the same sum. |

Time: use the `dt` that `update(dt)` is given, rather than a three.js clock.

## Picking and controls

**Picking** finds what is under a point on the screen:

| Code | What it does |
|---|---|
| `const ray = new THREE.Raycaster()` | Makes a picker |
| `ray.setFromCamera(new THREE.Vector2(x, y), camera)` | Aims it through a point, where `x` and `y` run from -1 to 1 across and up the canvas: `x = mouse.x / width * 2 - 1`, `y = -(mouse.y / height) * 2 + 1` |
| `const hits = ray.intersectObjects(listOfThings)` | What it hits, nearest first. `hits.length` says how many; `hits[0].object` is the nearest thing, `hits[0].point` where. |

A full example is in [3D scenes: picking](3d.md#picking-what-did-i-click).

**Orbit controls** let you turn the camera by dragging:

| Code | What it does |
|---|---|
| `const controls = new addons.OrbitControls(camera, canvas)` | Drag to orbit, pinch or scroll to zoom, two fingers or right-drag to pan |
| `controls.update()` | Call every frame in `draw()` |
| `controls.target.set(x, y, z)` | The point it orbits round |
| `controls.enableDamping = true` | Glides to a stop when you let go |
| `controls.autoRotate = true`, `controls.autoRotateSpeed = 2` | Turns slowly by itself |
| `controls.minDistance = 2`, `controls.maxDistance = 20` | How close and how far you can zoom |
| `controls.maxPolarAngle = Math.PI / 2` | Stops the camera going below the floor |
| `controls.enableZoom`, `controls.enablePan`, `controls.enableRotate` | Switch each gesture on or off |

## Related

- [3D scenes](3d.md): the ideas, with examples
- [Tutorial: lighting a scene](tutorials/lighting.md)
- [Colours](colours.md)
- [2D functions](2d-functions.md)
- [three.js documentation](https://threejs.org/docs/)
