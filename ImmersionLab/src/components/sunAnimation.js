import * as THREE from "three";

// This function initializes the sun animation
export function initSunAnimation(viewerContainer) {
  // Check if the viewerContainer or its scene property is not null
  if (!viewerContainer || !viewerContainer.scene) {
    console.error("Viewer container or scene is not available");
    return;
  }

  const scene = viewerContainer.scene; // Get the scene from the viewerContainer
  const clock = new THREE.Clock();

  // Set up sun sphere (visible representation)
  const sunRadius = 18;
  const sunSphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 32, 32),
    new THREE.MeshBasicMaterial({ color: 0xeeeeee, emissive: 0xeeeeee })
  );
  scene.add(sunSphere);

  // Set up sun light to cast shadows
  const sunLight = new THREE.PointLight(0xffffff, 100, 100); // Increase intensity
  sunLight.castShadow = true;
  scene.add(sunLight);

  // Parameters for sun movement
  const params = {
    hour: new Date().getHours(),
    minute: new Date().getMinutes(),
    radius: sunRadius,
  };

  // Function to animate the sun's position based on the time
  const animateSun = () => {
    const dayDuration = 24 * 60 * 60; // 24 hours in seconds
    const currentHourInSeconds = params.hour * 60 * 60 + params.minute * 60;

    // Adjusting to have 12 o'clock directly above
    const angle =
      (((currentHourInSeconds % dayDuration) + 6 * 60 * 60) * -(Math.PI * 2)) /
      dayDuration;

    sunSphere.position.set(
      Math.cos(angle) * params.radius,
      Math.sin(angle) * params.radius,
      0
    );

    // Update sun light position to match the sun sphere
    sunLight.position.copy(sunSphere.position);
  };

  // Function to animate the scene continuously
  const animate = () => {
    const deltaTime = clock.getDelta();
    animateSun(deltaTime);

    // Render the scene with the camera (you should have these set up in your viewer)
    viewerContainer.renderer.render(
      viewerContainer.scene,
      viewerContainer.camera
    );

    // Request the next frame for animation
    requestAnimationFrame(animate);
  };

  // Start the animation
  animate();
}
