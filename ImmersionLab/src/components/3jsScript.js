import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import GUI from "lil-gui";
import { SunPath } from "./SunPath";
import { createSunSphere } from "./sunSphere";

export default function initializeScene(canvas) {
  // Base setup
  const scene = new THREE.Scene();

  const params = {
    color2: "#808080", // Color for the second parent group
    color3: "#FFFDD0", // Default color for the rest
    animateTime: true,
    showSunSurface: true,
    showAnalemmas: true,
    showSunDayPath: true,
    minute: new Date().getMinutes(),
    hour: new Date().getHours(),
    day: new Date().getDate(),
    month: new Date().getMonth() + 1,
    latitude: -23.029396,
    longitude: -46.974293,
    northOffset: 303,
    radius: 18,
    baseY: 0,
    timeSpeed: 100,
    shadowBias: -0.00086,
  };

  const dracoLoader = new DRACOLoader();
  // Use CDN path for DRACO decoder for better compatibility
  dracoLoader.setDecoderPath(
    "https://www.gstatic.com/draco/versioned/decoders/1.5.6/"
  );

  const gltfLoader = new GLTFLoader();
  gltfLoader.setDRACOLoader(dracoLoader);

  let model;
  let collections = [];

  // Load the model from the public folder
  // Note: You need to place the Oxford Tile folder in your project's public directory
  console.log("Attempting to load model...");
  gltfLoader.load(
    "/Oxford Tile/glTF/Oxford Tile.glb", // Path relative to public folder
    (gltf) => {
      model = gltf.scene;
      console.log("Model loaded successfully!");
      scene.add(model);

      // Setup model materials and controls
      setupModelAfterLoading(model);
    },
    (progress) => {
      if (progress.total > 0) {
        console.log(
          `Loading model: ${(progress.loaded / progress.total) * 100}% loaded`
        );
      } else {
        console.log(`Loading model: ${progress.loaded} bytes loaded`);
      }
    },
    (error) => {
      console.error("Error loading model:", error);
      console.error("Error details:", error.message);

      // Try alternative paths if the first one fails
      const alternativePaths = [
        "/Oxford_Tile.glb",
        "/assets/Oxford_Tile.glb",
        "/models/Oxford_Tile.glb",
      ];

      console.log("Trying alternative paths...");
      tryLoadingFromAlternatives(alternativePaths, 0);
    }
  );

  // Function to try loading from alternative paths
  function tryLoadingFromAlternatives(paths, index) {
    if (index >= paths.length) {
      console.error("All alternative paths failed");
      return;
    }

    console.log(`Trying to load from: ${paths[index]}`);
    gltfLoader.load(
      paths[index],
      (gltf) => {
        model = gltf.scene;
        console.log(`Model loaded successfully from ${paths[index]}!`);
        scene.add(model);

        // Setup model materials and controls
        setupModelAfterLoading(model);
      },
      (progress) => {
        if (progress.total > 0) {
          console.log(
            `Alternative loading: ${
              (progress.loaded / progress.total) * 100
            }% loaded`
          );
        }
      },
      (error) => {
        console.error(`Failed to load from ${paths[index]}:`, error.message);
        // Try next path
        tryLoadingFromAlternatives(paths, index + 1);
      }
    );
  }

  // Function to set up model after loading
  function setupModelAfterLoading(loadedModel) {
    collections = [];
    loadedModel.traverse((child) => {
      if (child.type === "Group" && !collections.includes(child.name)) {
        collections.push(child.name);
      }
    });

    const gui = new GUI();
    const modelFolder = gui.addFolder("Model Controls");

    const updateMaterials = () => {
      loadedModel.traverse((child) => {
        if (child.isMesh) {
          if (child.parent && child.parent.name === collections[0]) {
            return;
          } else if (
            child.parent &&
            collections.slice(1).includes(child.parent.name)
          ) {
            child.material = new THREE.MeshStandardMaterial({
              color: params.color2,
            });
          } else {
            child.material = new THREE.MeshStandardMaterial({
              color: params.color3,
            });
          }
        }
      });
    };

    modelFolder
      .addColor(params, "color2")
      .name("Context")
      .onChange(updateMaterials);
    modelFolder
      .addColor(params, "color3")
      .name("Site")
      .onChange(updateMaterials);

    loadedModel.scale.set(0.05, 0.05, 0.05);

    updateMaterials();

    // Time controls folder under Model Materials
    const timeFolder = modelFolder.addFolder("Time Controls");
    timeFolder
      .add(params, "hour", 0, 23, 1)
      .name("Hour")
      .onChange(() => animateSun(clock.elapsedTime));
    timeFolder
      .add(params, "minute", 0, 59, 15)
      .name("Minute")
      .onChange(() => animateSun(clock.elapsedTime));
  }

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

  const ambientLight = new THREE.AmbientLight(0xffffff, 1);
  scene.add(ambientLight);

  const sunSphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 32, 32),
    new THREE.MeshBasicMaterial({ color: 0xeeeeee, emissive: 0xeeeeee }) // Lighter color for sun
  );
  scene.add(sunSphere);

  // Increase the intensity of the sunlight
  const sunLight = new THREE.PointLight(0xffffff, 100, 100); // Increased intensity
  sunLight.castShadow = true;
  scene.add(sunLight);

  const sizes = { width: 800, height: 600 };
  const camera = new THREE.PerspectiveCamera(
    75,
    sizes.width / sizes.height,
    0.1,
    100
  );
  camera.position.set(2, 2, 5);

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true });
  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(window.devicePixelRatio);

  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 0.75, 0);
  controls.enableDamping = true;
  controls.enablePan = true;
  controls.enableZoom = true;

  controls.mouseButtons = {
    LEFT: THREE.MOUSE.ROTATE,
    MIDDLE: THREE.MOUSE.DOLLY,
    RIGHT: THREE.MOUSE.PAN,
  };

  canvas.addEventListener("click", () => {
    console.log("Canvas clicked!");
  });

  const movement = {
    up: false,
    down: false,
    forward: false,
    backward: false,
    left: false,
    right: false,
  };
  const movementSpeed = 2.5;

  window.addEventListener("keydown", (event) => {
    switch (event.code) {
      case "KeyE":
        movement.up = true;
        break;
      case "KeyQ":
        movement.down = true;
        break;
      case "KeyW":
      case "ArrowUp":
        movement.forward = true;
        break;
      case "KeyS":
      case "ArrowDown":
        movement.backward = true;
        break;
      case "KeyD":
      case "ArrowRight":
        movement.left = true;
        break;
      case "KeyA":
      case "ArrowLeft":
        movement.right = true;
        break;
    }
  });

  window.addEventListener("keyup", (event) => {
    switch (event.code) {
      case "KeyE":
        movement.up = false;
        break;
      case "KeyQ":
        movement.down = false;
        break;
      case "KeyW":
      case "ArrowUp":
        movement.forward = false;
        break;
      case "KeyS":
      case "ArrowDown":
        movement.backward = false;
        break;
      case "KeyD":
      case "ArrowRight":
        movement.left = false;
        break;
      case "KeyA":
      case "ArrowLeft":
        movement.right = false;
        break;
    }
  });

  const handleCameraMovement = (deltaTime) => {
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);

    const right = new THREE.Vector3()
      .crossVectors(camera.up, direction)
      .normalize();

    if (movement.up) camera.position.y += movementSpeed * deltaTime;
    if (movement.down) camera.position.y -= movementSpeed * deltaTime;

    if (movement.left)
      camera.position.addScaledVector(right, -movementSpeed * deltaTime);
    if (movement.right)
      camera.position.addScaledVector(right, movementSpeed * deltaTime);
    if (movement.forward)
      camera.position.addScaledVector(direction, movementSpeed * deltaTime);
    if (movement.backward)
      camera.position.addScaledVector(direction, -movementSpeed * deltaTime);

    controls.update();
  };

  const clock = new THREE.Clock();

  const animateSun = (elapsedTime) => {
    const sunRadius = params.radius || 10;
    const dayDuration = 24 * 60 * 60; // 24 hours in seconds
    const currentHourInSeconds = params.hour * 60 * 60 + params.minute * 60;

    // Adjusting to have 12 o'clock directly above
    const angle =
      (((currentHourInSeconds % dayDuration) + 6 * 60 * 60) * -(Math.PI * 2)) /
      dayDuration;

    sunSphere.position.set(
      Math.cos(angle) * sunRadius,
      Math.sin(angle) * sunRadius,
      0
    );

    sunLight.position.copy(sunSphere.position);
  };

  const tick = () => {
    const deltaTime = clock.getDelta();
    const elapsedTime = clock.elapsedTime;

    handleCameraMovement(deltaTime);
    controls.update();
    animateSun(elapsedTime);

    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  };

  tick();
}
