import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { Colors } from './colors.js'
import * as CANNON from 'cannon-es'

let plane
let scene
let camera
let controls
let renderer
let sphereShape
let sphereBody
let planeBody
let planeShape
let background
let mixer
let previouslyAnimation = null
let selectedAnimation = 0
let gltfAnimations
let keysPressed = []
let speed = 0.0035
let offSet =  -5.0
let clock = new THREE.Clock()
let oldElapsedTime = 0
let colors = [...Colors]
let worldMap
let pacman

const spotLights = []
const allActions = []

createScene()
createAmbientLigth()
createSpotLight(0, 0, 20)
loadWorld()
animate()
checkInputs()
//game()

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function game() {
  await sleep(2000)
  paintTiles(colors, true)
  await sleep(2000)
  paintTiles([0xcccccc])
  await sleep(2000)
  let selectedColor = colors[Math.floor(Math.random()*colors.length)]
  paintTiles([selectedColor])
  await sleep(2000)
  removeWrongTiles(selectedColor)
  selectedTilesColor = []
  //game()
}

function changeAnimation() {
  if (isJumping === 1){
    if (allActions[selectedAnimation]) allActions[selectedAnimation].reset().fadeOut(0.2)
    if (allActions[jumpAnimation]) allActions[jumpAnimation].reset()
      .setEffectiveTimeScale(.6)
      .setEffectiveWeight(1)
      .fadeIn(0.5)
      .play()
    isJumping = 2
  } else if (isJumping === 2) return

  if (previouslyAnimation === selectedAnimation) return


  if (allActions[previouslyAnimation]) allActions[previouslyAnimation].reset().fadeOut(0.5)
  if (allActions[selectedAnimation]) allActions[selectedAnimation].reset()
    .setEffectiveTimeScale(1)
    .setEffectiveWeight(1)
    .fadeIn(0.5)
    .play()
}

function startAnimation() {
  mixer = new THREE.AnimationMixer(fallGuy)
  gltfAnimations.forEach(a => {
    allActions.push(mixer.clipAction(a))
  })

  
  jumpAnimation = findAnimation('FG_Jump_Start_A')
  lendingAnimation = findAnimation('FG_Landing_A')
  allActions[jumpAnimation].loop = THREE.LoopOnce
  allActions[lendingAnimation].loop = THREE.LoopOnce

  mixer.addEventListener('finished', (event) => {
    if (event.action._clip.name === 'FG_Jump_Start_A') {
      allActions[lendingAnimation].reset().setEffectiveTimeScale(0.7).play()
      isJumping = 0
    }

    if (event.action._clip.name === 'FG_Landing_A') {
      allActions[selectedAnimation].reset()
        .setEffectiveTimeScale(0.7)
        .play()
    }

  })

  allActions[0].play()
}

function createScene() {
  scene = new THREE.Scene()
  const canvas = document.querySelector('.webgl')
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.shadowMap.enabled = true
  renderer.gammaOutput = true
  document.body.appendChild( renderer.domElement )  

  const axesHelper = new THREE.AxesHelper(5)
  scene.add( axesHelper )

  camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.01, 2000)
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

function createSpotLight (x, y, z, color = 0xffffff) {
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

function findAnimation (name) {
  return AnimationsMap[name]
}

function loadCharacter () {
  const loader = new GLTFLoader()
  loader.load('../../assets/fall_guys_1/scene.gltf', (gltf) => {
    gltfAnimations = gltf.animations
    fallGuy = gltf.scene
    fallGuy.traverse((child) => {
      child.frustumCulled = false
      if (child.isMesh) {
        child.castShadow = true
      }
    })
    fallGuy.position.y = offSet
    fallGuy.rotation.y = Math.PI/2
    startAnimation()
    scene.add(fallGuy)

    sphereShape = new CANNON.Sphere(0)
    sphereBody = new CANNON.Body({
      mass: 1,
      position: new CANNON.Vec3(0, 5, 0),
      shape: sphereShape,
    })

    // spotLights[0].target = fallGuy
  })
}

function loadWorld () {
  const loader = new GLTFLoader()
  loader.load('../../assets/world/scene.gltf', (gltf) => {
    //gltfAnimations = gltf.animations
    worldMap = gltf.scene
    worldMap.scale.set(1, 1, 1)
    worldMap.traverse((child) => {
      child.frustumCulled = false
      if (child.isMesh) {
        child.castShadow = true
      }
    })
    pacman = worldMap.getObjectByName('Pac-Man_3')
    //centralizar o mundo
    const box = new THREE.Box3().setFromObject( worldMap )
    const center = box.getCenter( new THREE.Vector3() )
    worldMap.position.x += ( worldMap.position.x - center.x )
    worldMap.position.y += ( worldMap.position.y - center.y )
    worldMap.position.z += ( worldMap.position.z - center.z )
    scene.add(worldMap)

    // sphereShape = new CANNON.Sphere(0)
    // sphereBody = new CANNON.Body({
    //   mass: 1,
    //   position: new CANNON.Vec3(0, 5, 0),
    //   shape: sphereShape,
    // })

    // world.addBody(sphereBody)
    spotLights[0].target = worldMap
  })
}

function rotateWorld () {

}

function checkInputs() {
  setInterval(() => {
    for (const key of keysPressed) {
      switch (key.toLowerCase()) {
               case 'w':
              if (camera.position.z > 0) {
                  pacman.rotation.y = Math.PI / 2;
                  
                  checkCollision();
              }
          break
        case 's':
              if (camera.position.z > 0) {
                  pacman.rotation.y = -Math.PI / 2;
                  
                  checkCollision();
              }
          break
          case 'a':
              if (camera.position.z > 2) {
                  pacman.rotation.y = Math.PI;
                  
                  checkCollision();
              }
          
          break
          case 'd':
              if (camera.position.z > 2) {
                  pacman.rotation.y = 0;
                 
              }
          
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
  keysPressed = keysPressed.filter(key => key != event.key.toLowerCase())
  switch (event.key.toLowerCase()) {
    case 'w':
      break
    case 'shift':
      break
  }
})

window.addEventListener('change', (event) => {
  console.log(event)
})

function animate() {
  requestAnimationFrame( animate )
  if (mixer) mixer.update(0.02)
  
  if(pacman && camera) {
    if(camera.position.z > 0) {
      pacman.position.x += speed * Math.cos(pacman.rotation.y)
      pacman.position.y += speed * Math.sin(pacman.rotation.y)
      if(pacman.position.x > 2) {
        camera.position.set(10, 0, 0)
        camera.lookAt(0, 0, 0)
      }
    }
  }
  let ElapsedTime = clock.getElapsedTime();
  let deltaTime = ElapsedTime - oldElapsedTime;
  oldElapsedTime = deltaTime;  
  renderer.render( scene, camera )
}
