<template>
  <div>
    <h2>{{ project.name }}</h2>
    <p>{{ project.description }}</p>
    <div id="renderer" class="viewer-container" ref="container"></div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import type { StreamGridItemProps } from "@/types/StreamGridItemProps";
import { Viewer, CameraController, SpeckleLoader } from "@speckle/viewer";
import * as THREE from "three"; // Import Three.js for handling 3D objects
import { useStore } from "@/stores/store"; // Ensure correct import path

const props = defineProps<{ project: StreamGridItemProps }>();

const container = ref<HTMLElement | null>(null);
const store = useStore();

onMounted(async () => {
  if (!container.value) return;

  // Retrieve the authToken from the store
  const authToken = store.authToken;

  if (!authToken) {
    console.error("Authentication token is missing.");
    return;
  }

  // Step 3: Create Viewer instance
  const viewer = new Viewer(container.value);

  // Step 4: Initialize the viewer
  await viewer.init();

  // Step 5: Add the stock camera controller extension
  viewer.createExtension(CameraController);

  // Step 6: Fetch the resource URLs for the stream and load them
  try {
    const projectUrl = `https://app.speckle.systems/streams/${props.project.id}/objects`;
    const response = await fetch(projectUrl, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch stream resources");
    }

    const streamData = await response.json();
    console.log("Stream Data:", streamData); // Log the stream data for debugging

    const urls = streamData.objects.map((obj: any) => obj.url); // Assuming objects are in an 'objects' array
    console.log("Fetched URLs:", urls); // Log the URLs for debugging

    // Step 7: Load the speckle data (objects) from the URLs
    for (const url of urls) {
      const loader = new SpeckleLoader(viewer.getWorldTree(), url, authToken);
      await viewer.loadObject(loader, true);
      console.log(`Loaded object from URL: ${url}`); // Log each URL as it loads
    }

    // Check if the WorldTree was properly populated
    const worldTree = viewer.getWorldTree();
    console.log("WorldTree after loading:", worldTree); // Log the WorldTree for debugging

    // Step 8: Apply custom vertex colors to point cloud data
    const nodes = worldTree.findAll(() => true); // Find all nodes
    nodes.forEach((node: any, index: number) => {
      console.log(`Processing node #${index}:`, node); // Log each node

      // Check if node contains a renderView (this would typically contain the mesh)
      const renderView = node.renderView;
      if (renderView && renderView.mesh) {
        const threeMesh = renderView.mesh;
        console.log(`Found Three.js mesh for node #${index}:`, threeMesh); // Log the mesh

        // Apply random vertex colors to the mesh
        const geometry = threeMesh.geometry;
        const pointCount = geometry.getAttribute("position").count;

        // Create random colors for the point cloud
        const colors = new Float32Array(pointCount * 3);
        for (let i = 0; i < pointCount * 3; i++) {
          colors[i] = Math.random();
        }

        // Set the new color attribute for the point cloud geometry
        geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
        geometry.attributes.color.needsUpdate = true;

        // Enable vertex coloring for the material
        threeMesh.material.vertexColors = true;
        console.log(`Applied random vertex colors to node #${index}`); // Log when colors are applied
      } else {
        console.warn(`No mesh found for node #${index}`); // Log if no mesh is found
      }
    });
  } catch (error) {
    console.error("Error fetching URLs:", error);
  }
});
</script>

<style scoped>
.viewer-container {
  width: 100%;
  height: 600px; /* Adjust the height as needed */
  border: 1px solid #ccc;
}
</style>
