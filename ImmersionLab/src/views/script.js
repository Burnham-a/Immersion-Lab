import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";

export default function initializeScene(canvas) {
  // Base setup
  const scene = new THREE.Scene();

  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath("/draco/");

  const gltfLoader = new GLTFLoader();
  gltfLoader.setDRACOLoader(dracoLoader);

  gltfLoader.load(
    "/src/assets/Oxford Tile/glTF/Oxford Tile.glb",
    (gltf) => {
      gltf.scene.scale.set(0.05, 0.05, 0.05);
      scene.add(gltf.scene);
    },
    undefined,
    (error) => console.error("Error loading model:", error)
  );

  // Floor
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 10),
    new THREE.MeshStandardMaterial({
      color: "#444444",
      metalness: 0,
      roughness: 0.5,
    })
  );
  floor.receiveShadow = true;
  floor.rotation.x = -Math.PI * 0.5;
  scene.add(floor);

  // Lights
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.castShadow = true;
  directionalLight.position.set(5, 5, 5);
  scene.add(ambientLight, directionalLight);

  // Camera
  const sizes = { width: 800, height: 600 }; // Updated width
  const camera = new THREE.PerspectiveCamera(
    75,
    sizes.width / sizes.height,
    0.1,
    100
  );
  camera.position.set(2, 2, 5);

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true });
  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(window.devicePixelRatio); // Set the pixel ratio to the device's pixel ratio

  // Controls
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 0.75, 0);
  controls.enableDamping = true; // Enable damping for smoothness
  controls.enablePan = true; // Enable panning
  controls.enableZoom = true; // Enable zooming

  controls.mouseButtons = {
    LEFT: THREE.MOUSE.ROTATE,
    MIDDLE: THREE.MOUSE.DOLLY,
    RIGHT: THREE.MOUSE.PAN,
  };

  // Handle click events on canvas
  canvas.addEventListener("click", (event) => {
    // Handle the click event if needed, e.g., picking objects or other interactions
    console.log("Canvas clicked!");
  });

  // Movement
  const movement = {
    forward: false,
    backward: false,
    left: false,
    right: false,
  };
  const movementSpeed = 2.5;

  window.addEventListener("keydown", (event) => {
    switch (event.code) {
      case "KeyW":
      case "ArrowUp":
        movement.forward = true;
        break;
      case "KeyS":
      case "ArrowDown":
        movement.backward = true;
        break;
      case "KeyD":
      case "ArrowLeft":
        movement.left = true;
        break;
      case "KeyA":
      case "ArrowRight":
        movement.right = true;
        break;
    }
  });

  window.addEventListener("keyup", (event) => {
    switch (event.code) {
      case "KeyW":
      case "ArrowUp":
        movement.forward = false;
        break;
      case "KeyS":
      case "ArrowDown":
        movement.backward = false;
        break;
      case "KeyD":
      case "ArrowLeft":
        movement.left = false;
        break;
      case "KeyA":
      case "ArrowRight":
        movement.right = false;
        break;
    }
  });

  const handleCameraMovement = (deltaTime) => {
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);

    const forward = new THREE.Vector3(direction.x, 0, direction.z).normalize();
    const right = new THREE.Vector3()
      .crossVectors(camera.up, forward)
      .normalize();

    if (movement.forward)
      camera.position.addScaledVector(forward, movementSpeed * deltaTime);
    if (movement.backward)
      camera.position.addScaledVector(forward, -movementSpeed * deltaTime);
    if (movement.left)
      camera.position.addScaledVector(right, -movementSpeed * deltaTime);
    if (movement.right)
      camera.position.addScaledVector(right, movementSpeed * deltaTime);

    controls.update(); // Ensure OrbitControls are updated
  };

  const clock = new THREE.Clock();
  const tick = () => {
    const deltaTime = clock.getDelta();
    handleCameraMovement(deltaTime);
    controls.update(); // Ensure OrbitControls are updated
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  };

  tick();
}
