import { Mesh, MeshBasicMaterial, SphereGeometry } from "three";

function createSunSphere() {
  const sunSphere = new Mesh(
    new SphereGeometry(1, 32, 32), // Adjust the radius and segments if needed
    new MeshBasicMaterial({ color: "yellow" })
  );
  return sunSphere;
}

export { createSunSphere };
