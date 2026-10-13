# Function index

Every name a pictures.js scene can use, by area, one line each. The link on each row goes to the page that explains it, with examples.

| Area | pictures.js | Pyctures |
|---|---|---|
| 2D drawing: the plain functions | yes | yes |
| 2D drawing: the canvas, `ctx` | yes | yes |
| 3D: three.js | yes | yes |
| Sprites and hit-testing | yes | yes |
| Keyboard, mouse and touch | yes | yes |
| Frames and timing | yes | yes |
| Scenes | yes | yes |
| Saved values | yes | yes |
| Files | yes | yes |
| Databases (SQLite) | yes | yes |
| Sound and music | yes | not yet |
| Dials, sliders and a keyboard | yes | not yet |
| Image processing | Circuitry only | Circuitry only |

This page is pictures.js's own index, in its own spellings. Pyctures has the same areas in Python: [the Pyctures function index](https://www.circuitry.dev/docs/pyctures/functions).

Everything on this page works wherever pictures.js runs. Nothing here needs an app.

## The shape of a scene

Functions you write. They are called if the scene defines them.

Explained in [How a program is shaped](program-shape.md#2-draw-every-frame-draw-and-updatedt).

| Name | What it does |
|---|---|
| `setup()` | Called once, before the first frame. It can be an `async function` |
| `update(dt)` | Called every frame, with the seconds since the last one: move things here |
| `draw()` | Called every frame, after `update`: draw the picture here |
| `onStop()` | Called when the scene is stopped or run again: let go of what it made itself |

## Scenes

A program in several scenes, each with the functions above as its own. Only a file that uses one of these names is given them.

Explained in [Scenes](scenes.md).

| Name | What it does |
|---|---|
| `class Title extends Scene { … }` | A scene: `setup`, `update`, `draw` and the `on` functions as its methods, its variables on `this`. Every `Scene` class plays, in the order written |
| `scene(name, { draw, update, … })` | A scene from plain functions, with no class |
| `go(scene)` | Change to a scene, by its name or its class. `go("Game", { transition: "wipe", transitionTime: 0.5 })` says how; `{ keep: true }` goes back to a scene as it was left |
| `nextScene()` | Change to the next scene written; after the last comes the first |
| `restart()` | Begin this scene again, from empty |
| `length`, `beats`, `bars` | On a scene: it ends by itself after so many seconds, beats or bars |
| `transition`, `transitionTime`, `transitionColor` | On a scene: how it arrives. `"cut"`, `"crossfade"`, `"fade"`, `"wipe"`, `"wipe_left"`, `"wipe_up"`, `"wipe_down"`, `"slide_left"`, `"slide_right"`, `"slide_up"`, `"slide_down"` |
| `resume()` | A scene's own: called in place of `setup()` when it is come back to with `{ keep: true }` |
| `sceneTime` | Seconds since this scene began |
| `sceneProgress` | How far through its length the scene is, from 0 to 1 |
| `sceneName` | The name of the scene on show |
| `section(name)` | A tick on the scrubber at this moment |
| `config({ … })` | Settings for every scene: `loop`, `transition`, `transitionTime`, `transitionColor`, `beatsPerBar` |
| `onSeek(seconds)` | A function you write at the top level: called when the scrubber is moved |

## 2D drawing: the plain functions

One call each, with no `ctx.` in front.

Explained in [2D functions](2d-functions.md#plain-drawing).

| Name | What it does |
|---|---|
| `background(colour)` | Paints the whole canvas |
| `circle(x, y, radius, colour)` | A filled circle centred on `x, y` |
| `ellipse(x, y, width, height, colour)` | An oval centred on `x, y` |
| `rect(x, y, width, height, colour)` | A filled rectangle, top-left corner at `x, y` |
| `triangle(x1, y1, x2, y2, x3, y3, colour)` | A triangle, by its three corners |
| `polygon(x, y, radius, sides, colour)` | A shape with that many equal sides, centred on `x, y`, one corner straight up |
| `star(x, y, radius, points, colour)` | A star with that many points, one straight up |
| `line(x1, y1, x2, y2, colour, thickness)` | A straight line |
| `text(words, x, y, colour, size, align)` | Words, `size` points high |
| `picture(what, x, y, size)` | An emoji or a word, an image file beside the program, or a loaded image, centred on `x, y` and … |

### Chance and angles

Explained in [2D functions](2d-functions.md#plain-drawing).

| Name | What it does |
|---|---|
| `random(min, max)` | A whole number from `min` to `max`, either end included |
| `random(max)`, `random()` | From 0 to `max`; with nothing, a fraction from 0 up to 1 |
| `pick(list)` | One thing from a list, by chance |
| `degrees(n)` | An angle said in degrees, wherever an angle is wanted: `ctx.rotate(degrees(45))`, `ship.angle = …` |

## 2D drawing: the canvas, `ctx`

The web's own 2D drawing surface: everything the plain functions do, and much more.

### Size and pictures

Explained in [2D functions](2d-functions.md#size-and-helpers).

| Name | What it does |
|---|---|
| `width`, `height` | The size of the canvas, in points |
| `pixelRatio` | Real pixels per point (2 or 3 on most phones) |
| `canvas` | The canvas, for `canvas.addEventListener(...)` |
| `loadImage(address)` | Loads a picture to draw |

### Rectangles

Explained in [2D functions](2d-functions.md#rectangles).

| Name | What it does |
|---|---|
| `ctx.fillRect(x, y, w, h)` | A filled rectangle, top-left corner at `x, y` |
| `ctx.strokeRect(x, y, w, h)` | The outline of a rectangle |
| `ctx.clearRect(x, y, w, h)` | Rubs that area out, back to see-through |

### Paths

Explained in [2D functions](2d-functions.md#paths).

| Name | What it does |
|---|---|
| `ctx.beginPath()` | Starts a new, empty path |
| `ctx.moveTo(x, y)` | Lifts the pen and puts it down at `x, y` |
| `ctx.lineTo(x, y)` | A straight line to `x, y` |
| `ctx.closePath()` | A straight line back to where this piece started |
| `ctx.rect(x, y, w, h)` | A rectangle, as part of the path |
| `ctx.roundRect(x, y, w, h, r)` | A rounded rectangle |
| `ctx.arc(x, y, r, start, end)` | Part of a circle round `x, y`, from angle `start` to `end` in radians (`0` to `Math.PI * 2` is … |
| `ctx.arcTo(x1, y1, x2, y2, r)` | A rounded corner of radius `r`, turning at `x1, y1` towards `x2, y2` |
| `ctx.ellipse(x, y, rx, ry, turn, start, end)` | Part of an oval, `rx` wide and `ry` tall, turned by `turn` radians |
| `ctx.quadraticCurveTo(cx, cy, x, y)` | A curve to `x, y`, pulled towards one control point |
| `ctx.bezierCurveTo(c1x, c1y, c2x, c2y, x, y)` | A curve to `x, y` with two control points |
| `ctx.fill()` | Fills the path |
| `ctx.stroke()` | Draws the path's outline |

### Colours and styles

Explained in [2D functions](2d-functions.md#colours-and-styles).

| Name | What it does |
|---|---|
| `ctx.fillStyle = …` | The colour, gradient or pattern for fills and filled text |
| `ctx.strokeStyle = …` | The same, for outlines |
| `ctx.globalAlpha = 0.5` | How solid everything drawn next is, from 0 (invisible) to 1 |
| `ctx.createLinearGradient(x0, y0, x1, y1)` | A gradient along a line |
| `ctx.createRadialGradient(x0, y0, r0, x1, y1, r1)` | A gradient between two circles |
| `ctx.createConicGradient(angle, x, y)` | A gradient round a point, like a colour wheel |
| `gradient.addColorStop(position, colour)` | A colour at a point (0 to 1) along a gradient |
| `ctx.createPattern(picture, "repeat")` | A repeating fill from a picture or another canvas |

### Lines

Explained in [2D functions](2d-functions.md#lines).

| Name | What it does |
|---|---|
| `ctx.lineWidth = 4` | How thick outlines are, in points |
| `ctx.lineCap = "round"` | How line ends look: `"butt"` (flat, stops at the end), `"round"`, `"square"` (flat, sticks out … |
| `ctx.lineJoin = "round"` | How corners look: `"miter"` (sharp), `"round"`, `"bevel"` (cut off) |
| `ctx.miterLimit = 10` | How far a sharp corner may stick out before it is cut off like a bevel |
| `ctx.setLineDash([10, 5])` | Dashes: 10 drawn, 5 gap |
| `ctx.getLineDash()` | The current dash list |
| `ctx.lineDashOffset = 4` | Slides the dashes along |

### Text

Explained in [2D functions](2d-functions.md#text).

| Name | What it does |
|---|---|
| `ctx.fillText(text, x, y)` | Draws text |
| `ctx.strokeText(text, x, y)` | Draws the outline of the text |
| `ctx.measureText(text).width` | How wide the text will be, in points, in the font set now |
| `ctx.font = "bold 24px serif"` | Style, size and family |
| `ctx.textAlign = "center"` | Where `x` is: `"left"`, `"center"`, `"right"`, or `"start"`/`"end"` (which follow the writing … |
| `ctx.textBaseline = "middle"` | Where `y` is: `"alphabetic"` (the line letters sit on, the default), `"top"`, `"hanging"` … |
| `ctx.direction = "rtl"` | Writing direction: `"ltr"`, `"rtl"` or `"inherit"` |
| `ctx.letterSpacing = "4px"` | Extra space between letters (older devices ignore it) |
| `ctx.wordSpacing = "10px"` | Extra space between words (older devices ignore it) |
| `ctx.fontKerning = "none"` | Whether letter pairs are fitted closer: `"auto"`, `"normal"`, `"none"` |

### Images

Explained in [2D functions](2d-functions.md#images).

| Name | What it does |
|---|---|
| `const img = loadImage(address)` | Starts loading a picture from a path beside the scene (`"cat.png"`), a web address or a `data:` … |
| `ctx.drawImage(img, x, y)` | Draws it at its own size, top-left at `x, y` |
| `ctx.drawImage(img, x, y, w, h)` | Draws it stretched to `w` by `h` |
| `ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h)` | Cuts the part `sx, sy, sw, sh` out of the picture and draws it at `x, y, w, h` |
| `ctx.imageSmoothingEnabled = false` | Keeps pixel art crisp and blocky when scaled up |
| `ctx.imageSmoothingQuality = "high"` | How carefully pictures are smoothed: `"low"`, `"medium"`, `"high"` |

### Transforms

Explained in [2D functions](2d-functions.md#transforms).

| Name | What it does |
|---|---|
| `ctx.translate(x, y)` | Moves the grid's corner `(0, 0)` to `x, y` |
| `ctx.rotate(angle)` | Turns the grid round `(0, 0)` by `angle` radians, clockwise |
| `ctx.scale(sx, sy)` | Stretches the grid |
| `ctx.transform(a, b, c, d, e, f)` | Applies any stretch, slant and move at once |
| `ctx.save()` | Remembers the transform and every setting on this page |
| `ctx.restore()` | Goes back to what the last `save()` remembered |
| `ctx.setTransform(a, b, c, d, e, f)` | Replaces the transform completely |
| `ctx.resetTransform()` | Clears the transform |
| `ctx.getTransform()` | The current transform, with its numbers as `a` to `f` |

### Shadows

Explained in [2D functions](2d-functions.md#shadows).

| Name | What it does |
|---|---|
| `ctx.shadowColor = "rgba(0, 0, 0, 0.5)"` | The shadow's colour |
| `ctx.shadowBlur = 10` | How soft the shadow is |
| `ctx.shadowOffsetX = 5` | How far right the shadow falls |
| `ctx.shadowOffsetY = 5` | How far down the shadow falls |

### Blending and filters

Explained in [2D functions](2d-functions.md#blending-and-filters).

| Name | What it does |
|---|---|
| `ctx.globalCompositeOperation = "multiply"` | How new drawing mixes with what is already there |
| `ctx.filter = "blur(4px)"` | An effect on everything drawn next |

### Clipping and hit testing

Explained in [2D functions](2d-functions.md#clipping-and-hit-testing).

| Name | What it does |
|---|---|
| `ctx.clip()` | Makes the current path a window: everything drawn next shows only inside it |
| `ctx.isPointInPath(x, y)` | Whether a point is inside the current path: `true` or `false` |
| `ctx.isPointInStroke(x, y)` | Whether a point is on the path's outline |

### Paths you can keep: Path2D

Explained in [2D functions](2d-functions.md#paths-you-can-keep-path2d).

| Name | What it does |
|---|---|
| `ctx.fill(path)` | Fills that path |
| `ctx.stroke(path)` | Outlines it |
| `ctx.clip(path)` | Clips to it |
| `ctx.isPointInPath(path, x, y)` | Whether a point is inside it |
| `path.addPath(other)` | Adds another path's pieces to this one |

### Pixels

Explained in [2D functions](2d-functions.md#pixels).

| Name | What it does |
|---|---|
| `ctx.getImageData(x, y, w, h).data` | The colours of every pixel in that area, as one long list: red, green, blue, alpha (0 to 255) … |
| `ctx.createImageData(w, h)` | A blank block of pixels |
| `ctx.putImageData(pixels, x, y)` | Puts a block of pixels straight onto the canvas, ignoring transforms, alpha and blend modes |
| `new ImageData(new Uint8ClampedArray(numbers), w, h)` | Makes a block of pixels from a list of numbers |

### Saving and resetting

Explained in [2D functions](2d-functions.md#saving-and-resetting).

| Name | What it does |
|---|---|
| `ctx.save()` | Remembers every setting on this page, the transform and the clip |
| `ctx.restore()` | Goes back to the last `save()` |
| `ctx.reset()` | Clears the canvas and puts every setting back to the start, including the canvas's sharp-screen … |

## 3D: three.js

three.js is there as `THREE`, and its orbit controls as `addons.OrbitControls`.

### Renderer

Explained in [3D functions](3d-functions.md#renderer).

| Name | What it does |
|---|---|
| `const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })` | Makes a renderer that draws on the canvas, with smooth edges |
| `renderer.setPixelRatio(pixelRatio)` | Sharp on high-resolution screens |
| `renderer.setSize(width, height, false)` | Fits the canvas |
| `renderer.render(scene, camera)` | Draws one picture; call it in `draw()` |
| `renderer.setClearColor("navy", 1)` | The colour behind the scene when it has no background; the second number is how solid |
| `renderer.shadowMap.enabled = true` | Turns shadows on |
| `renderer.shadowMap.type = THREE.PCFSoftShadowMap` | Soft-edged shadows |
| `renderer.toneMapping = THREE.ACESFilmicToneMapping` | Softens very bright light the way a film camera does |
| `renderer.toneMappingExposure = 1.2` | Overall brightness when tone mapping is on |
| `renderer.outputColorSpace = THREE.SRGBColorSpace` | How colours are sent to the screen |

### Scene and fog

Explained in [3D functions](3d-functions.md#scene-and-fog).

| Name | What it does |
|---|---|
| `const scene = new THREE.Scene()` | The world everything goes in |
| `scene.add(thing)`, `scene.remove(thing)` | Puts something in the world, or takes it out |
| `scene.background = new THREE.Color("skyblue")` | The colour behind everything |
| `scene.fog = new THREE.Fog("white", near, far)` | Fog that starts at distance `near` and hides everything by `far` |
| `scene.fog = new THREE.FogExp2("white", 0.05)` | Fog that thickens steadily with distance; the number is how thick |

### Cameras

Explained in [3D functions](3d-functions.md#cameras).

| Name | What it does |
|---|---|
| `new THREE.PerspectiveCamera(fov, width / height, near, far)` | A camera that sees the way eyes do: far things look smaller |
| `new THREE.OrthographicCamera(left, right, top, bottom, near, far)` | A camera with no perspective: far things look the same size |
| `camera.position.set(x, y, z)` | Where the camera is |
| `camera.lookAt(x, y, z)` | Points it at a spot |
| `camera.aspect = width / height` | The shape of a perspective camera's picture; follow with `camera.updateProjectionMatrix()` |
| `camera.fov = 30`, `camera.near`, `camera.far`, `camera.zoom = 2` | Change its settings; follow with `camera.updateProjectionMatrix()` |
| `camera.updateProjectionMatrix()` | Applies changed camera settings |

### Geometries: shapes

Explained in [3D functions](3d-functions.md#geometries-shapes).

| Name | What it does |
|---|---|
| `new THREE.BoxGeometry(w, h, d)` | A box |
| `new THREE.SphereGeometry(radius, 32, 16)` | A ball |
| `new THREE.PlaneGeometry(w, h)` | A flat rectangle, facing you |
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
| `new THREE.LatheGeometry(points, 32)` | Spins a side outline (a list of `THREE.Vector2`) round the up axis, like a vase on a potter's … |
| `new THREE.ExtrudeGeometry(shape, { depth: 0.5, bevelEnabled: false })` | Pushes a flat `THREE.Shape` out into a solid, like a cookie cutter |
| `new THREE.TubeGeometry(curve, 64, radius, 8, false)` | A tube along a curve, such as `new THREE.CatmullRomCurve3([...points])` |
| `new THREE.EdgesGeometry(geometry)` | Just the edges of another shape, for `LineSegments` |
| `new THREE.WireframeGeometry(geometry)` | Every triangle's edges, for `LineSegments` |
| `new THREE.BufferGeometry()` | Your own shape from numbers: `geometry.setAttribute("position", new …` |

### Materials: how surfaces look

Explained in [3D functions](3d-functions.md#materials-how-surfaces-look).

| Name | What it does |
|---|---|
| `new THREE.MeshBasicMaterial({ color: … })` | Flat colour, ignores light, always visible |
| `new THREE.MeshLambertMaterial({ color: … })` | Matte, like chalk or paper |
| `new THREE.MeshPhongMaterial({ color: …, shininess: 80, specular: "white" })` | Shiny highlights, like plastic |
| `new THREE.MeshStandardMaterial({ color: …, roughness: 0.5, metalness: 0 })` | Realistic |
| `new THREE.MeshPhysicalMaterial({ color: …, clearcoat: 1, transmission: 0.9, thickness: 0.5 })` | Standard, plus extras: `clearcoat` (a varnish layer), `transmission` (glass that lets light … |
| `new THREE.MeshToonMaterial({ color: … })` | Cartoon shading in a few flat bands |
| `new THREE.MeshNormalMaterial()` | Rainbow colours by which way each face points; needs no light |
| `new THREE.MeshDepthMaterial()` | White near the camera, fading to black far away |
| `new THREE.LineBasicMaterial({ color: … })` | For lines (`Line`, `LineSegments`, `LineLoop`) |
| `new THREE.LineDashedMaterial({ color: …, dashSize: 0.2, gapSize: 0.1 })` | Dashed lines; call `line.computeLineDistances()` once |
| `new THREE.PointsMaterial({ color: …, size: 0.05 })` | For `Points` |
| `new THREE.SpriteMaterial({ map: texture })` | For `THREE.Sprite`, a picture that always faces the camera |
| `color: "tomato"` | The surface colour |
| `emissive: "orange"`, `emissiveIntensity: 1` | A glow the surface gives off by itself |
| `map: texture` | A picture wrapped round the surface |
| `roughness`, `metalness` | Standard and Physical only: rough or polished, metal or not |
| `wireframe: true` | Draws the edges of every triangle only |
| `flatShading: true` | Shows the flat faces rather than smoothing over them |
| `side: THREE.DoubleSide` | Shows both sides of flat shapes (`FrontSide` is the default, `BackSide` the inside) |
| `transparent: true, opacity: 0.5` | See-through; `opacity` does nothing without `transparent` |

### Lights

Explained in [3D functions](3d-functions.md#lights).

| Name | What it does |
|---|---|
| `new THREE.AmbientLight(colour, intensity)` | A little light everywhere, from no direction |
| `new THREE.HemisphereLight(sky, ground, intensity)` | Sky colour from above, ground colour from below |
| `new THREE.DirectionalLight(colour, intensity)` | The sun: parallel light from `position` towards `target` (the middle unless you move it) |
| `new THREE.PointLight(colour, intensity, distance, decay)` | A bulb: light in every direction from one spot |
| `new THREE.SpotLight(colour, intensity, distance, angle, penumbra, decay)` | A torch: a cone of light from `position` towards `target` |
| `new THREE.RectAreaLight(colour, intensity, w, h)` | A glowing panel, like a window or a softbox |
| `light.intensity = 2` | Brightness |
| `light.color.set("orange")` | Colour |
| `light.position.set(x, y, z)` | Where it is |
| `light.target.position.set(x, y, z)` | Where directional and spot lights point; also `scene.add(light.target)` |
| `light.visible = false` | Switches it off |
| `light.castShadow = true` | Directional, point and spot lights can cast shadows (turn on `renderer.shadowMap.enabled` and … |
| `light.shadow.mapSize.width = 2048` (and `.height`) | Sharper shadows, at a cost in speed |
| `light.shadow.bias = -0.0005` | Removes stripy marks on surfaces that shadow themselves |
| `light.shadow.radius = 4` | Blurs shadow edges (with `PCFSoftShadowMap` off, `PCFShadowMap` on) |
| `light.shadow.camera.left` / `right` / `top` / `bottom` | How big an area a directional light's shadows cover |

### Objects

Explained in [3D functions](3d-functions.md#objects).

| Name | What it does |
|---|---|
| `new THREE.Mesh(geometry, material)` | A solid object |
| `new THREE.Group()` | An empty holder: things added to it move, turn and scale with it |
| `new THREE.Points(geometry, new THREE.PointsMaterial({ size: 0.05 }))` | A dot at every position in the geometry |
| `new THREE.Line(geometry, material)` | A line through the positions, in order |
| `new THREE.LineLoop(geometry, material)` | The same, joined back to the start |
| `new THREE.LineSegments(geometry, material)` | Separate lines, one for each pair of positions |
| `new THREE.Sprite(new THREE.SpriteMaterial({ map: texture }))` | A flat picture that always faces the camera, for labels and particles |
| `new THREE.InstancedMesh(geometry, material, count)` | Many copies of one mesh drawn at once, much faster than many meshes |

### Moving and arranging

Explained in [3D functions](3d-functions.md#moving-and-arranging).

| Name | What it does |
|---|---|
| `thing.position.set(x, y, z)`, `thing.position.x = 2` | Where it is |
| `thing.rotation.set(x, y, z)`, `thing.rotation.y += 0.01` | How it is turned round each axis, in radians |
| `thing.scale.set(2, 1, 1)`, `thing.scale.setScalar(2)` | How big it is along each axis |
| `thing.lookAt(x, y, z)` | Turns it to face a spot |
| `thing.add(other)`, `thing.remove(other)` | Puts `other` inside `thing`, so it moves with it |
| `thing.visible = false` | Hides it |
| `thing.name = "door"` | A name, handy when picking |
| `thing.castShadow`, `thing.receiveShadow` | Whether it makes shadows and shows them |
| `thing.traverse((child) => { … })` | Calls your function for `thing` and for everything inside it |

### Textures

Explained in [3D functions](3d-functions.md#textures).

| Name | What it does |
|---|---|
| `new THREE.TextureLoader().load(address)` | Loads a picture from a path (`"textures/brick.png"`) or a web address, whose site must allow … |
| `new THREE.CanvasTexture(aCanvas)` | Uses a 2D canvas you drew on as the picture: text, patterns, anything from 2D functions |
| `texture.needsUpdate = true` | After you draw on that canvas again, shows the change |
| `texture.wrapS = texture.wrapT = THREE.RepeatWrapping` | Lets the picture repeat across and down |
| `texture.repeat.set(4, 4)` | How many times it repeats |
| `texture.colorSpace = THREE.SRGBColorSpace` | Shows a photo's colours correctly |
| `texture.magFilter = THREE.NearestFilter` | Keeps pixel-art textures blocky |

### Helpers

Explained in [3D functions](3d-functions.md#helpers).

| Name | What it does |
|---|---|
| `new THREE.GridHelper(size, divisions)` | A grid on the floor |
| `new THREE.AxesHelper(length)` | The three axes: x red, y green, z blue |
| `new THREE.DirectionalLightHelper(light, size)` | Where a directional light is and which way it points |
| `new THREE.PointLightHelper(light, size)` | Where a point light is |
| `new THREE.SpotLightHelper(light)` | A spot light's cone |
| `new THREE.HemisphereLightHelper(light, size)` | A hemisphere light |
| `new THREE.CameraHelper(light.shadow.camera)` | The box a light's shadows cover |
| `new THREE.BoxHelper(thing, "yellow")` | A box round an object |

### Maths

Explained in [3D functions](3d-functions.md#maths).

| Name | What it does |
|---|---|
| `new THREE.Vector3(x, y, z)` | A position or direction in 3D |
| `new THREE.Vector2(x, y)` | The same in 2D |
| `new THREE.Color(…)` | A colour |
| `new THREE.Euler(x, y, z)` | A turn round each axis, in radians: what `rotation` is |
| `new THREE.Quaternion()` | Another way to store a turn, which never gets stuck |
| `new THREE.Matrix4()` | Position, turn and size in one; used by `InstancedMesh` |
| `THREE.MathUtils.degToRad(90)` | Degrees to radians |

### Picking and controls

Explained in [3D functions](3d-functions.md#picking-and-controls).

| Name | What it does |
|---|---|
| `const ray = new THREE.Raycaster()` | Makes a picker |
| `ray.setFromCamera(new THREE.Vector2(x, y), camera)` | Aims it through a point, where `x` and `y` run from -1 to 1 across and up the canvas: `x = …` |
| `const hits = ray.intersectObjects(listOfThings)` | What it hits, nearest first |
| `const controls = new addons.OrbitControls(camera, canvas)` | Drag to orbit, pinch or scroll to zoom, two fingers or right-drag to pan |
| `controls.update()` | Call every frame in `draw()` |
| `controls.target.set(x, y, z)` | The point it orbits round |
| `controls.enableDamping = true` | Glides to a stop when you let go |
| `controls.autoRotate = true`, `controls.autoRotateSpeed = 2` | Turns slowly by itself |
| `controls.minDistance = 2`, `controls.maxDistance = 20` | How close and how far you can zoom |
| `controls.maxPolarAngle = Math.PI / 2` | Stops the camera going below the floor |
| `controls.enableZoom`, `controls.enablePan`, `controls.enableRotate` | Switch each gesture on or off |

## Sprites and hit-testing

Moving pictures that can tell when they touch.

| Name | What it does | More |
|---|---|---|
| `new Sprite(picture, x, y, size)` | A moving picture with `x`, `y`, `vx`, `vy`, `angle`, `spin`, `size`, `visible`, `update(dt)` … | [2D functions](2d-functions.md#size-and-helpers) |
| `remove(list, thing)` | Take a thing out of a list | [2D functions](2d-functions.md#size-and-helpers) |
| `sprite.picture` | An emoji or text, an image from `loadImage`, or a function that draws it | [Drawing in 2D](drawing-2d.md#sprites) |
| `sprite.x`, `sprite.y` | Where its centre is | [Drawing in 2D](drawing-2d.md#sprites) |
| `sprite.vx`, `sprite.vy` | Its speed in points per second, used by `update(dt)` | [Drawing in 2D](drawing-2d.md#sprites) |
| `sprite.angle` | How far it is turned | [Drawing in 2D](drawing-2d.md#sprites) |
| `sprite.spin` | How fast it turns each second, used by `update(dt)`: `degrees(180)` is half a turn a second | [Drawing in 2D](drawing-2d.md#sprites) |
| `sprite.size` | How big it is, in points (48 unless you say) | [Drawing in 2D](drawing-2d.md#sprites) |
| `sprite.visible` | `false` hides it | [Drawing in 2D](drawing-2d.md#sprites) |
| `sprite.update(dt)` | Moves it by its speed and turns it by its spin | [Drawing in 2D](drawing-2d.md#sprites) |
| `sprite.draw()` | Draws it (call this in your `draw()`) | [Drawing in 2D](drawing-2d.md#sprites) |
| `sprite.touches(other)` | `true` when the two overlap | [Drawing in 2D](drawing-2d.md#sprites-that-touch) |
| `sprite.hit(list)` | The first sprite in the list that it touches, or `null` when it touches none | [Drawing in 2D](drawing-2d.md#sprites-that-touch) |
| `sprite.contains(x, y)` | `true` when that point is on it | [Drawing in 2D](drawing-2d.md#sprites-that-touch) |
| `sprite.shape` | `"circle"` (as it starts) or `"box"` | [Drawing in 2D](drawing-2d.md#sprites-that-touch) |
| `sprite.radius` | The size of its circle | [Drawing in 2D](drawing-2d.md#sprites-that-touch) |
| `sprite.width`, `sprite.height` | The size of its box | [Drawing in 2D](drawing-2d.md#sprites-that-touch) |
| `sprite.wrap()` | When it has gone off one edge, it comes back on the opposite one | [Drawing in 2D](drawing-2d.md#leaving-the-picture-and-moving-the-way-it-faces) |
| `sprite.bounce()` | Bounces it off the edges | [Drawing in 2D](drawing-2d.md#leaving-the-picture-and-moving-the-way-it-faces) |
| `sprite.offscreen()` | `true` when all of it is outside the picture | [Drawing in 2D](drawing-2d.md#leaving-the-picture-and-moving-the-way-it-faces) |
| `sprite.push(amount)` | Speeds it up the way it faces: this is an engine | [Drawing in 2D](drawing-2d.md#leaving-the-picture-and-moving-the-way-it-faces) |
| `sprite.forward(distance)` | Steps it the way it faces, without changing its speed | [Drawing in 2D](drawing-2d.md#leaving-the-picture-and-moving-the-way-it-faces) |
| `sprite.limit(speed)` | Slows it to that speed if it is going faster | [Drawing in 2D](drawing-2d.md#leaving-the-picture-and-moving-the-way-it-faces) |
| `sprite.angleTo(other)` | The angle from it to another sprite, to `mouse`, or to a point: `angleTo(x, y)` | [Drawing in 2D](drawing-2d.md#leaving-the-picture-and-moving-the-way-it-faces) |
| `sprite.distanceTo(other)` | How far it is to another sprite, to `mouse`, or to a point: `distanceTo(x, y)` | [Drawing in 2D](drawing-2d.md#leaving-the-picture-and-moving-the-way-it-faces) |
| `Sprite.box(x, y, width, height, colour)` | A coloured box, tested as a box | [Drawing in 2D](drawing-2d.md#pictures-you-draw-yourself) |
| `Sprite.circle(x, y, size, colour)` | A coloured circle `size` across, tested as that circle | [Drawing in 2D](drawing-2d.md#pictures-you-draw-yourself) |

## Keyboard, mouse and touch

What is held now, what went down since the last frame, and functions called when something happens.

Explained in [2D functions](2d-functions.md#size-and-helpers).

| Name | What it does |
|---|---|
| `keys` | The set of keys held down: `keys.has("ArrowLeft")` |
| `pressed`, `released` | The keys that went down, and came up, since the last frame: `pressed.has(" ")` |
| `mouse.x`, `mouse.y`, `mouse.down` | Where the pointer or finger is, and whether it is pressed |
| `mouse.button`, `mouse.inside` | Which button is down (`"left"`, `"middle"`, `"right"` or `null`), and whether the pointer is … |
| `mouse.dx`, `mouse.dy`, `mouse.wheel` | How far the pointer moved, and the wheel turned, since the last frame |
| `touches` | Every finger (or pressed mouse button) that is down: each has `id`, `x`, `y`, `startX` … |
| `pinch.scale`, `pinch.change`, `pinch.x`, `pinch.y` | Two fingers as a zoom: the scale since the pinch began, its change since the last frame, and … |

### Functions you write

Explained in [How a program is shaped](program-shape.md#when-something-happens-the-on-functions).

| Name | What it does |
|---|---|
| `onKeyDown(key, code)` | A key is pressed |
| `onKeyUp(key, code)` | A key is let go |
| `onKeyRepeat(key, code)` | A key that is held down repeats, as it does when you type |
| `onMouseDown(x, y, button)` | The mouse button or a finger goes down |
| `onMouseMove(x, y)` | The pointer moves |
| `onMouseUp(x, y, button)` | The button or finger comes up |
| `onTouchStart(touch)` | A finger or a mouse button goes down |
| `onTouchMove(touch)` | A finger that is down moves |
| `onTouchEnd(touch, cancelled)` | A finger comes up |
| `onWheel(amount)` | The wheel turns |
| `onPinch(scale, change)` | Two fingers move together or apart |

## Frames and timing

Used with `await`, in a loop of your own.

| Name | What it does | More |
|---|---|---|
| `await frame()` | Waits for the next frame, so this one is shown | [2D functions](2d-functions.md#size-and-helpers) |
| `await flush()` | The same as `frame()`: shows what is drawn so far and carries on at the next frame | [2D functions](2d-functions.md#size-and-helpers) |
| `await sleep(seconds)` | Waits that long | [2D functions](2d-functions.md#size-and-helpers) |
| `await vsync()` | Another name for `frame()`: waits for the screen's next refresh | [How a program is shaped](program-shape.md#3-a-loop-with-await-frame) |

## Saved values

One value under a name, still there the next time.

Explained in [Saved values](saved-values.md#save-and-load).

| Name | What it does | In Pyctures |
|---|---|---|
| `save(name, value)` | Keeps the value under that name | `save` |
| `load(name, otherwise)` | Gives back the value saved under that name | `load` |

## Files

A text or JSON file the scene writes and reads back. Kept in the browser on a web page: [where they are kept](files-and-databases.md#where-files-and-databases-are-kept).

Explained in [Files and databases](files-and-databases.md#writing-and-reading-a-file).

| Name | What it does | In Pyctures |
|---|---|---|
| `await saveText(path, text)` | Writes the text as a file | `save_text` |
| `await saveJSON(path, value)` | Writes a value as a JSON file: a number, text, `true` or `false`, a list or an object | `save_json` |
| `await loadText(path)` | The text of the file | `load_text` |
| `await loadJSON(path)` | The value in a JSON file, ready to use | `load_json` |

## Databases

Rows in a SQLite database, asked for in SQL. Kept in the browser on a web page: [where they are kept](files-and-databases.md#where-files-and-databases-are-kept).

Explained in [Files and databases](files-and-databases.md#a-database).

| Name | What it does | In Pyctures |
|---|---|---|
| `await openDatabase(name)` | Opens the database of that name, making it the first time | `open_database` |
| `await db.query(sql, ...values)` | Asks a question (`select`) | `db.query` |
| `await db.run(sql, ...values)` | Changes the database: `create table`, `insert`, `update`, `delete` | `db.run` |
| `await db.close()` | Finishes with the database | `db.close` |

## Sound and music

Loaded only by a scene that uses one of these names.

Explained in [Sound and music](sound.md).

| Name | What it does | Python spelling |
|---|---|---|
| `playSound(name, volume)` | A ready-made game sound: `coin`, `jump`, `laser`, `explosion`, `hit`, `shoot`, `powerup`, `blip`, `click`, `zap`, `bounce`, `pop`, `win`, `lose` | `play_sound` |
| `playNote(note, length, volume)` | A note (`"C4"`, or 60), a list of notes, or a chord by name (`"Cm7"`) | `play_note` |
| `playNotes(notes, step, options)` | A tune, a step at a time: `"C4 E4 G4 - C5:2"`. `{ repeat: true }` goes round. Gives a tune with `stop()` | `play_notes` |
| `note(name, length)`, `chord(name, length)`, `rest(length)` | The next note, chord or gap of a tune written a line at a time. A length is `"quarter"`, `"half"`…, or beats | `note`, `chord`, `rest` |
| `loopNotes(lines)`, `startLines()` | A section of such lines that goes round, and every line begun again from now | `loop_notes`, `start_lines` |
| `makeSynth(name, settings)` | A synth of your own, from a ready-made one or from settings. It has `play`, `start`, `stop`, `playNotes`, `arp`, `startArp`, `set`, and every setting as a property | `make_synth` |
| `loadSample(path, options)` | A recorded sound from a file beside the scene, as a synth | `load_sample` |
| `loadSamples(files)` | Several recordings as one instrument: `loadSamples({ C2: "piano-C2.wav", C3: "piano-C3.wav" })`; `{ kit: true }` is a drum kit | `load_samples` |
| `playArp(chord, length, options)` | A chord as an arpeggio: fast on one voice, or with `{ step: "sixteenth" }` a note struck at each step in time with the tempo | `play_arp` |
| `startArp(chord, options)` | An arpeggio that stays: `change(chord)`, `stop()`, and `gate`, `octaves`, `swing`, `accent`, `pattern`, `order`, `step` and `speed` to set as it plays | `start_arp` |
| `mainSynth()` | The synth `playNote` and `playNotes` use | `main_synth` |
| `soundOutput()` | All the sound together, for a scope or a meter | `sound_output` |
| `setEffects(settings)` | The echo, reverb and chorus every synth shares | `set_effects` |
| `setVolume(amount)` | How loud everything is: 1 is normal | `set_volume` |
| `muteSound()`, `unmuteSound()` | Silence, and back | `mute_sound`, `unmute_sound` |
| `stopSound()` | Stops everything that is sounding or waiting to sound | `stop_sound` |
| `setTempo(bpm)` | Beats a minute. Beat 0 is now | `set_tempo` |
| `beats(n)` | How many seconds that many beats last | `beats` |
| `beat()` | Which beat it is now | `beat` |
| `soundTime()` | The sound clock, in seconds: what `{ at }` is read against | `sound_time` |
| `setSoundBuffer(size)`, `soundBuffer()` | How much sound is made at a time (`"small"`, `"medium"`, `"large"`, `"auto"`, or frames), for a page that clicks; and what it is now | `set_sound_buffer`, `sound_buffer` |
| `noteNumber(note)` | A note's number: `noteNumber("A4")` is 69 | `note_number` |
| `soundNames()`, `synthNames()`, `settingNames()` | Lists of the game sounds, the ready-made synths and a synth's settings | `sound_names`, `synth_names`, `setting_names` |
| `playSong(path, options)`, `stopSong()` | A song from a `.mod` or `.xm` file beside the scene. Gives a song with `pause()`, `resume()`, `seek(part)`, `stop()`, `volume` and `position`, and `mute(channel)`, `solo(channel)`, `loopPattern()` (`loop_pattern`) and `replace(song)` | `play_song`, `stop_song` |
| `lead.voice`, `lead.pitchShift`, `lead.ringMod`, `lead.comb`, `lead.flanger` | On any synth: a voice by name (`"robot"`), the pitch shifter in semitones, the ring modulator, the comb and its sweep | `voice`, `pitch_shift`, `ring_mod`, `comb`, `flanger` |
| `voiceNames()` | A list of the voices: robot, chipmunk, monster, cave, telephone, alien, whisper | `voice_names` |

### Your voice

The browser is asked for the microphone only by a scene that uses it. Explained in [Sound and music](sound.md#your-voice).

| Name | What it does | Python spelling |
|---|---|---|
| `useMicrophone(options)` | The microphone, as a synth whose sound comes in. `{ voice, listen, raw }`. It has `listen()`, `mute()`, `voice`, `pitch`, `ring`, `comb`, `gain`, `gate`, `record(length)`, `state`, `whenReady()` and every setting of a synth | `use_microphone` |
| `stopMicrophone()` | Lets the microphone go: the browser's recording light goes out. It happens by itself when the scene stops | `stop_microphone` |
| `recordSound(length, options)` | Records the microphone into a sample, given back at once: a take, with `done`, `seconds`, `onDone(fn)`, `whenDone()`, `soundLike(mic)`, and `play`, `reverse`, `loop` and `voice` as any sample. `{ effects, from, max }` | `record_sound` |
| `startRecording(options)`, `stopRecording()` | A recording with no set length, and its end. It stops by itself after 30 seconds, or `{ max }` up to 120 | `start_recording`, `stop_recording` |
| `recordOutput(length)` | Records everything that is played, in stereo | `record_output` |
| `lead.record(length)` | Records one synth alone | `record` |
| `saveSound(take, name, options)` | A take or a sample as a WAV file: downloaded, or written among the scene's files in an app that keeps them. Gives a promise of its bytes; `{ download: false }` gives the bytes alone | `save_sound` |

### MIDI

Fetched only by a scene that uses one of these names. Explained in [Sound and music](sound.md#midi).

| Name | What it does | Python spelling |
|---|---|---|
| `function onMidiNote(note, velocity, channel) { }` | Yours to write: called when a key of a MIDI keyboard goes down (and with velocity 0 when it comes up, unless you write `onMidiNoteOff`) | `on_midi_note` |
| `function onMidiNoteOff(note, channel) { }` | Yours to write: called when a key comes up | `on_midi_note_off` |
| `function onMidiControl(number, value, channel) { }` | Yours to write: called when a knob, slider or pedal moves. `value` is from 0 to 1 | `on_midi_control` |
| `function onMidi(message) { }` | Yours to write: called with everything that arrives, as `{ type, channel, note, velocity, control, value, … }` | `on_midi` |
| `function onMidiDevices(devices) { }` | Yours to write: called when the devices are known or change, with `{ inputs, outputs, available }` | `on_midi_devices` |
| `onMidiNote(fn)`, `onMidiNoteOff(fn)`, `onMidiControl(fn)`, `onMidi(fn)`, `onMidiDevices(fn)` | The same five, given a function to call instead | as above |
| `lead.playFromMidi(options)` | A MIDI keyboard plays this synth. `{ channel }`; `false` stops | `play_from_midi` |
| `lead.learn(setting, fn)` | The next knob that is moved turns this setting; `fn` is called with each new value | `learn` |
| `lead.mapMidi(control, setting, fn, options)` | Knob `control` turns this setting. `{ min, max, channel }` | `map_midi` |
| `lead.unmapMidi(setting)` | No knob turns it any more | `unmap_midi` |
| `lead.sendToMidi(options)` | What this synth plays also goes out as MIDI. `{ channel, output }` | `send_to_midi` |
| `sendMidiNote(note, velocity, options)` | A note out, let go after `length` (0.5 seconds unless you say). `{ length, channel, output, after, at, beat }` | `send_midi_note` |
| `sendMidiNoteOff(note, options)` | Lets go of a note sent with `length: null` | `send_midi_note_off` |
| `sendMidiControl(number, value, options)` | Turns a knob on the other device: value from 0 to 1 | `send_midi_control` |
| `sendMidiBend(amount, options)`, `sendMidiProgram(number, options)` | Bends the pitch (-1 to 1), and chooses a sound by its number | `send_midi_bend`, `send_midi_program` |
| `sendMidi(bytes, options)` | Any message, as its bytes | `send_midi` |
| `sendMidiClock(on)` | Sends the beat, so another device keeps time with `setTempo` | `send_midi_clock` |
| `midiDevices()` | `{ inputs, outputs, available }` as they are known now | `midi_devices` |
| `useMidiInput(name)`, `useMidiOutput(name)` | Listen to one input alone, and send to one output | `use_midi_input`, `use_midi_output` |
| `midiInput()`, `lead.midiInput()`, `midiOutput()` | The MIDI device and channel as something a control is tied to: `select("device", midiInput(), "device")`, and `"channel"` | `midi_input`, `midi_output` |
| `receiveMidi(message)` | Hands the scene a message as a keyboard would, for trying it with nothing plugged in | `receive_midi` |
| `stopMidi()` | Stops everything MIDI is doing | `stop_midi` |

## Dials, sliders and a keyboard

Loaded only by a scene that calls one of these names.

Explained in [Dials, sliders and a keyboard](dials.md).

| Name | What it does |
|---|---|
| `dial(label, min, max, start)` | A dial for a number: `speed.value` |
| `dial(label, target, "setting")` | A dial that is a setting of a synth, or a property of any object |
| `slider(…)` | The same, as a slider |
| `button(label, onPress)` | A button: `fire.pressed`, `fire.held` |
| `toggle(label, on)` | A switch: `mute.on` |
| `rotary(label, choices, start)` | A knob that clicks between a few choices: `mode.value` |
| `select(label, choices, start)` | One of a list: `wave.value` |
| `keyboard(target, options)` | A piano keyboard that plays a synth |
| `scope(source)` | A live line: the wave a synth is making, or any list of numbers |
| `meter(source)` | A level as a bar of lights |
| `number(label, min, max, start)`, `stepper(…)` | A number box with − and +, which can be typed: `lives.value` |
| `textBox(label, text)` | A line of text to type: `name.value` |
| `readout(label, fn)` | Shows a value or a message |
| `checkbox(label, on)` | A box that is ticked: `sound.on` |
| `choose(label, choices, start)`, `radio(…)` | One of a few, all in sight, side by side or one under another |
| `dropdown(label, choices, start)` | One of a long list, which opens |
| `xyPad(label, target, "across", "up")` | A square where one finger sets two numbers: `pad.x`, `pad.y` |
| `colourPicker(label, colour)`, `colorPicker(…)` | A colour to pick: `ink.value` |
| `progress(label, value)` | A bar that fills, from 0 to 1 |
| `light(label, on)`, `busy(label)` | A light, and a ring that goes round while something happens |
| `rangeSlider(label, min, max, [low, high])` | A slider with two handles: `price.low`, `price.high` |
| `fader(…)` | A slider that stands upright, as on a mixing desk |
| `joystick()` | A stick for a thumb: `stick.x`, `stick.y` |
| `dpad()` | A pad of arrows: `pad.left`, `pad.x`; `{ asKeys: true }` holds the arrow keys down for the scene |
| `actionButton(label)` | A round button for a game: `fire.pressed` |
| `envelope(label, target)` | A synth's attack, decay, sustain and release as a graph to drag |
| `stepGrid(label, steps, rows)` | A grid of steps, each on or off: `grid.get("kick", 0)` |
| `pads(label, names, target)` | Pads to hit, which play a synth |
| `pitchWheel(…)`, `modWheel(…)`, `wheel(…)` | A wheel that rolls back, and one that stays |
| `steps(label, 16)` | A lane of steps to tap and draw across: `lane.value`, `lane.text` |
| `gatePattern(label, target)`, `arpPattern(label, target)` | A gate's steps as bars, and an arpeggio as a grid of chord notes |
| `drumSeq(label, drums, target)` | A drum sequencer that plays by itself, with play, tempo, swing and starter patterns |
| `label(text)` | Words; made just before some controls, their heading |
| `group(title, fn)` | Controls kept together on one titled plate |
| `row()` | Starts a new line; `row(fn)` keeps what it makes in a line |
| `column(fn)` | Controls one under another |
| `grid(columns, fn)` | Controls in columns that line up |
| `spacer()` | The room left over, so what follows is pushed to the far end |
| `wrap()` | Where a line may be split, if it must be |
| `page(name)` | A page of controls with a tab |
| `layout(options)` | Where the plates go, how big, whether they wrap, and a panel of a set size |
| `room()` | The rectangle no control is on |
| `theme(colours)` | The colours |
| `over(x, y)` | Is a control at this point? |

## Other names

| Name | What it does | More |
|---|---|---|
| `await loadFont(name, path)` | Loads a font file beside the scene, ready to use by its name in `ctx.font` | [Tips and limits](tips.md) |
| `await use(path)` | Loads another `.js` file beside the scene and hands back what it exports | [Tips and limits](tips.md) |
| `measure(name, work)` | Times a part of a frame, shown with the frame rate | [Finding mistakes](finding-mistakes.md) |

## Image processing

There are none in the library. A scene loads and draws a picture (`loadImage`, `picture`, `ctx.drawImage`). Picture methods such as `await img.removeBackground()` are supplied by the app that runs the scene. Circuitry Studio supplies them, and they are not part of pictures.js used on its own or in a built page: [Images from Code](https://www.circuitry.dev/docs/pictures/images). An app of your own can supply its own: [Use it on your website](website.md#picture-methods).

## Related

- [2D functions](2d-functions.md): every 2D function, with pictures and examples
- [3D functions](3d-functions.md): every 3D function
- [How a program is shaped](program-shape.md): how a scene is put together
