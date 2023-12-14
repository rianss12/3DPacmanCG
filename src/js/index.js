import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { Colors } from './colors.js'
import * as CANNON from 'cannon-es'

let scene
let camera
let renderer
let sphereShape
let sphereBody
let mixer
let gltfAnimations
let keysPressed = []
let speed = 0.0035
let clock = new THREE.Clock()
let oldElapsedTime = 0
let world
let worldMap
let pacman
let wallsBody = []
const squareSize = 2/11

const WALLS = [
  {
    height: 1,
    width: 1,
    length: 1,
    x: 0,
    z: 2,
    y: -4
  },
  {
    height: 2,
    width: 1,
    length: 1,
    x: -1,
    z: 2,
    y: 6
  },
  {
    height: 1,
    width: 1,
    length: 2,
    x: 2,
    z: 2,
    y: 5
  },
  {
    height: 1,
    width: 1,
    length: 4,
    x: -2,
    z: 2,
    y: -1
  },
  {
    height: 4,
    width: 1,
    length: 1,
    x: -9,
    z: 2,
    y: 4
  },
  {
    height: 4,
    width: 1,
    length: 1,
    x: -9,
    z: 2,
    y: 0
  },
  {
    height: 2,
    width: 1,
    length: 1,
    x: -11,
    z: 2,
    y: 2
  },
  {
    height: 4,
    width: 1,
    length: 1,
    x: -9,
    z: 2,
    y: -4
  },
  {
    height: 5,
    width: 1,
    length: 1,
    x: 8,
    z: 2,
    y: -2
  },
  {
    height: 2,
    width: 1,
    length: 1,
    x: 3,
    z: 2,
    y: 0
  },
  {
    height: 2,
    width: 1,
    length: 1,
    x: 7,
    z: 2,
    y: 4
  },
  {
    height: 1,
    width: 1,
    length: 1,
    x: 8,
    z: 2,
    y: 2
  },
]
const spotLights = []
const allActions = []

createScene()
createAmbientLigth()
createSpotLight(0, 0, 20)
loadWorld()
loadWalls()
loadCharacter()
animate()
checkInputs()

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function createScene() {
  scene = new THREE.Scene()
  world = new CANNON.World()
  world.gravity.set(0, 0, -9.82)
  const canvas = document.querySelector('.webgl')
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.shadowMap.enabled = true
  // renderer.outputEncoding = true
  document.body.appendChild(renderer.domElement)

  const axesHelper = new THREE.AxesHelper(20)
  scene.add(axesHelper)

  camera = new THREE.PerspectiveCamera(
    40,
    window.innerWidth / window.innerHeight,
    0.01,
    2000
  )
  camera.position.set(0, 0, 10)
  camera.lookAt(0, 0, 0)
  // controls = new OrbitControls( camera, renderer.domElement )
  // controls.minPolarAngle = Math.PI / 3
  // controls.maxPolarAngle = 0
  // controls.enablePan = false
  // controls.update()
}

function createAmbientLigth() {
  const ambientLight = new THREE.AmbientLight(0xffffff, 1.0)
  scene.add(ambientLight)
}

function createSpotLight(x, y, z, color = 0xffffff) {
  const spotLight = new THREE.SpotLight(color, 0.5)
  spotLight.position.set(x, y, z)
  spotLight.angle = Math.PI / 6
  spotLight.penumbra = 0.5
  spotLight.decay = 1
  spotLight.distance = 0
  spotLight.castShadow = true
  spotLight.shadow.mapSize.width = 1024
  spotLight.shadow.mapSize.height = 1024
  spotLight.shadow.camera.near = 1
  spotLight.shadow.camera.far = 60
  scene.add(spotLight)
  spotLights.push(spotLight)
}

function loadWorld() {
  const loader = new GLTFLoader()
  loader.load('../../assets/onlyWorld/Sketchfab_Scene.gltf', (gltf) => {
    //gltfAnimations = gltf.animations
    worldMap = gltf.scene
    worldMap.scale.set(1, 1, 1)
    worldMap.traverse((child) => {
      child.frustumCulled = false
      if (child.isMesh) {
        child.castShadow = true
      }
    })
    scene.add(worldMap)

    const planeShape = new CANNON.Box(new CANNON.Vec3(2, 2, 2))
    const planeBody = new CANNON.Body({
      mass: 0,
    })
    
    planeBody.quaternion.setFromAxisAngle(new CANNON.Vec3(-1, 0, 0), Math.PI * 0.5)
    planeBody.position.x = 0
    planeBody.position.z = 0
    planeBody.position.y = 0

    planeBody.addShape(planeShape)
    world.addBody(planeBody)
    spotLights[0].target = worldMap
  })
}

function loadWalls () {
  for(const wall of WALLS) {
    const planeGeometry = new THREE.BoxGeometry(wall.height*squareSize*2, wall.width*squareSize*2, wall.length*squareSize*2)
    const planeMaterial = new THREE.MeshStandardMaterial({ color: 0xcccccc, side: THREE.DoubleSide })
    
    const plane = new THREE.Mesh( planeGeometry, planeMaterial )
    plane.rotation.x = -Math.PI / 2
    plane.receiveShadow = true
    plane.position.x = wall.x * squareSize
    plane.position.y = wall.y * squareSize
    plane.position.z = wall.z + 0.2
    scene.add( plane )

    const planeShape = new CANNON.Box(new CANNON.Vec3(wall.height*squareSize, wall.width*squareSize, wall.length*squareSize))
    const planeBody = new CANNON.Body({
      mass: 0,
    })
    
    planeBody.quaternion.setFromAxisAngle(new CANNON.Vec3(-1, 0, 0), Math.PI * 0.5)
    planeBody.position.x = wall.x * squareSize
    planeBody.position.z = 2
    planeBody.position.y = wall.y * squareSize
    
    planeBody.addShape(planeShape)
    world.addBody(planeBody)
    wallsBody.push(planeBody)
  }
}

function startAnimation() {
  mixer = new THREE.AnimationMixer(pacman)
  gltfAnimations.forEach(a => {
    allActions.push(mixer.clipAction(a))
  })

  allActions[0].play()
}

function loadCharacter () {
  const loader = new GLTFLoader()
  loader.load('../../assets/pacman/scene.gltf', (gltf) => {
    gltfAnimations = gltf.animations
    pacman = gltf.scene
    pacman.scale.set(0.0015, 0.0015, 0.0015)
    pacman.traverse((child) => {
      child.frustumCulled = false
      if (child.isMesh) {
        child.castShadow = true
      }
    })
    pacman.position.z = 2
    pacman.rotation.x = Math.PI /2
    startAnimation()
    scene.add(pacman)

    sphereShape = new CANNON.Sphere(0.15)
    sphereBody = new CANNON.Body({
      mass: 1,
      position: new CANNON.Vec3(0, 0, 2),
      shape: sphereShape,
    })

    world.addBody(sphereBody)


    spotLights[0].target = pacman
  })
}

function checkInputs() {
  setInterval(() => {
    for (const key of keysPressed) {
      switch (key.toLowerCase()) {
        case 'w':
          pacman.rotation.y = Math.PI
          break
        case 's':
          pacman.rotation.y = 2*Math.PI
          break
        case 'a':
          pacman.rotation.y = -Math.PI / 2
          break
        case 'd':
          pacman.rotation.y = Math.PI /2
          break
      }
    }
  }, 1)
}
window.addEventListener('keydown', (event) => {
  if (!keysPressed.includes(event.key.toLowerCase())) {
    keysPressed.push(event.key.toLowerCase())
  }
})

window.addEventListener('keyup', (event) => {
  keysPressed = keysPressed.filter((key) => key != event.key.toLowerCase())
})

function animate() {
  requestAnimationFrame(animate)
  if (mixer) mixer.update(0.006)
  
  let ElapsedTime = clock.getElapsedTime();
  let deltaTime = ElapsedTime - oldElapsedTime;
  oldElapsedTime = deltaTime;

  if (world) world.step(1 / 60, deltaTime, 3);

  if (pacman && worldMap && sphereBody) {
    sphereBody.position.x += speed * Math.sin(pacman.rotation.y)
    sphereBody.position.y -= speed * Math.cos(pacman.rotation.y)
    if (sphereBody) pacman.position.copy({ x: sphereBody.position.x, y: sphereBody.position.y, z: sphereBody.position.z })

    if(pacman.position.x >= 2) {
      sphereBody.position.x = -1.8;
      worldMap.rotation.y -= Math.PI /2
    } else if(pacman.position.x <=  -2) {
      sphereBody.position.x = 1.8;
      worldMap.rotation.y += Math.PI /2
    } else if (pacman.position.y >= 2) {
      sphereBody.position.y = -1.8;
      worldMap.rotation.x += Math.PI /2
    } else if(pacman.position.y <=  -2) {
      sphereBody.position.y = 1.8;
      worldMap.rotation.x -= Math.PI /2
    }
  }
  
  renderer.render(scene, camera)
}
