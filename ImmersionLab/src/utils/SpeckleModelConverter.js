/**
 * Utility functions for converting Speckle models to Three.js format
 */
import * as THREE from "three";

/**
 * Converts a Speckle object to a Three.js mesh
 * @param {Object} speckleObject - The Speckle object to convert
 * @returns {THREE.Group} - A Three.js group containing the converted geometry
 */
export function convertSpeckleObjectToThreeJS(speckleObject) {
  // Create a group to hold all meshes
  const group = new THREE.Group();

  // Process based on object type
  if (!speckleObject) return group;

  try {
    if (speckleObject.displayValue) {
      processDisplayValue(speckleObject.displayValue, group);
    } else if (speckleObject.elements) {
      // Handle collections of elements
      speckleObject.elements.forEach((element) => {
        const elementGroup = convertSpeckleObjectToThreeJS(element);
        group.add(elementGroup);
      });
    } else if (speckleObject.displayMesh) {
      processDisplayMesh(speckleObject.displayMesh, group);
    }

    // Add any metadata or properties to the group's userData
    if (speckleObject.properties) {
      group.userData = {
        ...group.userData,
        speckleProperties: speckleObject.properties,
      };
    }

    // Use name from Speckle if available
    if (speckleObject.name) {
      group.name = speckleObject.name;
    }
  } catch (error) {
    console.error("Error converting Speckle object to Three.js:", error);
  }

  return group;
}

/**
 * Process Speckle display value
 * @param {Object} displayValue - The Speckle display value
 * @param {THREE.Group} parentGroup - The parent group to add meshes to
 */
function processDisplayValue(displayValue, parentGroup) {
  if (!displayValue) return;

  if (Array.isArray(displayValue)) {
    // Handle array of display values
    displayValue.forEach((item) => {
      processDisplayValue(item, parentGroup);
    });
  } else if (typeof displayValue === "object") {
    if (displayValue.vertices && displayValue.faces) {
      // Create mesh from vertices and faces
      const mesh = createMeshFromGeometryData(displayValue);
      if (mesh) parentGroup.add(mesh);
    }
  }
}

/**
 * Process Speckle display mesh
 * @param {Object} displayMesh - The Speckle display mesh
 * @param {THREE.Group} parentGroup - The parent group to add meshes to
 */
function processDisplayMesh(displayMesh, parentGroup) {
  if (!displayMesh) return;

  const mesh = createMeshFromGeometryData(displayMesh);
  if (mesh) parentGroup.add(mesh);
}

/**
 * Create a Three.js mesh from Speckle geometry data
 * @param {Object} geometryData - The Speckle geometry data
 * @returns {THREE.Mesh} - A Three.js mesh
 */
function createMeshFromGeometryData(geometryData) {
  if (!geometryData.vertices || !geometryData.faces) return null;

  try {
    // Create geometry
    const geometry = new THREE.BufferGeometry();

    // Add vertices
    const vertices = new Float32Array(geometryData.vertices);
    geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));

    // Add faces
    if (geometryData.faces) {
      geometry.setIndex(Array.from(geometryData.faces));
    }

    // Add normals if available, otherwise compute them
    if (geometryData.normals) {
      const normals = new Float32Array(geometryData.normals);
      geometry.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
    } else {
      geometry.computeVertexNormals();
    }

    // Add colors if available
    if (geometryData.colors) {
      const colors = new Float32Array(geometryData.colors);
      geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    }

    // Create material
    let material = new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      metalness: 0.2,
      roughness: 0.7,
      side: THREE.DoubleSide,
    });

    // Apply color from geometryData if available
    if (geometryData.color) {
      material.color.setRGB(
        geometryData.color.r / 255,
        geometryData.color.g / 255,
        geometryData.color.b / 255
      );
    }

    // Create mesh
    const mesh = new THREE.Mesh(geometry, material);
    return mesh;
  } catch (error) {
    console.error("Error creating mesh from geometry data:", error);
    return null;
  }
}

/**
 * Updates material properties on a Three.js object
 * @param {THREE.Object3D} object - The Three.js object
 * @param {Object} materialProps - Material properties to apply
 */
export function updateMaterialProperties(object, materialProps) {
  if (!object) return;

  if (object.material) {
    Object.assign(object.material, materialProps);
  }

  // Recursively process children
  if (object.children && object.children.length > 0) {
    object.children.forEach((child) => {
      updateMaterialProperties(child, materialProps);
    });
  }
}
