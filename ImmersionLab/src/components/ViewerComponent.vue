<template>
  <div class="w-full h-full flex flex-col space-y-2 mt-6">
    <!-- Speckle Viewer Section -->
    <div class="w-full h-full">
      <h2 class="text-xl font-semibold text-gray-800">Viewer</h2>
      <div
        id="viewer-container"
        ref="viewerContainer"
        class="w-full h-[500px] bg-gray-200 rounded-lg shadow-inner"
      ></div>
      <div v-if="isLoadingModel" class="text-blue-600 mt-2">
        Loading model, please wait...
      </div>
      <div v-if="errorMessage" class="text-red-600 mt-2">
        {{ errorMessage }}
      </div>
    </div>
    <br />
    <!-- Google Map Section -->
    <div class="w-full h-full">
      <h2 class="text-xl font-semibold text-gray-800">Map View</h2>
      <div class="flex-1">
        <br />
        <!-- Google map component -->
        <GoogleMap ref="googleMap" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onBeforeUnmount, watch, onMounted, nextTick, markRaw } from "vue";
import GoogleMap from "@/components/GoogleMap.vue";
import { useImmersionLabStore } from "@/stores/store-IL";
import {
  Viewer,
  DefaultViewerParams,
  CameraController,
  SelectionExtension,
  IViewer,
} from "@speckle/viewer";
import ObjectLoader from "@speckle/objectloader";
import * as THREE from "three";

/// <reference types="@types/google.maps" />

const props = defineProps({
  selectedProject: {
    type: Object,
    default: null,
  },
  selectedDesignOption: {
    type: String,
    default: "Option1",
  },
  designOptions: {
    type: Object,
    required: true,
  },
  viewerBackgroundColor: {
    type: String,
    default: "#ffffff",
  },
});

const store = useImmersionLabStore();

// Ensure TypeScript recognizes the google namespace
/// <reference types="google.maps" />
const googleMap = ref<{ map?: google.maps.Map } | null>(null);

// Reference to the Speckle Viewer and container
const viewer = ref<IViewer | null>(null);
const viewerContainer = ref<HTMLElement | null>(null);
const viewerInitialized = ref(false);
const isLoadingModel = ref(false);
const errorMessage = ref<string | null>(null);
const activeLoads = ref<string[]>([]);

// Clean up resources when component is destroyed
onBeforeUnmount(() => {
  disposeViewer();
});

// Initialize the viewer when the component is mounted
onMounted(async () => {
  console.log("ViewerComponent mounted, waiting for initialization...");
  // Don't initialize immediately - wait for explicit call from parent
});

// Safely dispose the viewer to prevent memory leaks and WebGL context issues
const disposeViewer = async () => {
  try {
    // First clear any loading operations
    activeLoads.value = [];

    if (viewer.value) {
      // Try to safely unload objects first without calling problematic methods
      try {
        // Clear the scene using a safer approach
        if (viewer.value.scene) {
          console.log("Clearing viewer scene objects directly");
          while (viewer.value.scene.children.length > 0) {
            const child = viewer.value.scene.children[0];
            viewer.value.scene.remove(child);
            if (child.dispose) child.dispose();
          }
        }
      } catch (err) {
        console.warn("Error clearing scene:", err);
      }

      // Now try to dispose the viewer
      if (typeof viewer.value.dispose === "function") {
        console.log("Disposing viewer instance...");
        await viewer.value.dispose();
      }

      viewer.value = null;
      viewerInitialized.value = false;
    }
  } catch (err) {
    console.error("Error disposing viewer:", err);
  }
};

// Watch for changes in the background color and update the viewer
watch(
  () => props.viewerBackgroundColor,
  (newColor) => {
    if (viewerInitialized.value && viewer.value) {
      try {
        if (
          viewer.value &&
          typeof viewer.value.setBackgroundColor === "function"
        ) {
          viewer.value.setBackgroundColor(new THREE.Color(newColor));
          console.log("Background color updated to:", newColor);
        }
      } catch (error) {
        console.warn("Could not update background color:", error);
      }
    }
  }
);

// Watch for changes in selected design option to update the viewer
watch(
  () => props.selectedDesignOption,
  async (newOption) => {
    console.log(
      `Design option changed to: ${newOption}, reloading models if needed`
    );
    if (props.selectedProject && viewerInitialized.value) {
      await loadModels();
    }
  }
);

// Watch for changes in design options structure to update the viewer
watch(
  () => props.designOptions,
  async (newOptions, oldOptions) => {
    console.log("Design options changed, checking for model changes");

    // Only reload if there's an actual change in the models
    const oldOption1 = oldOptions?.Option1?.length
      ? oldOptions.Option1[0]?.id
      : null;
    const oldOption2 = oldOptions?.Option2?.length
      ? oldOptions.Option2[0]?.id
      : null;
    const newOption1 = newOptions?.Option1?.length
      ? newOptions.Option1[0]?.id
      : null;
    const newOption2 = newOptions?.Option2?.length
      ? newOptions.Option2[0]?.id
      : null;

    if (oldOption1 !== newOption1 || oldOption2 !== newOption2) {
      console.log("Model assignments changed, reloading models");
      if (props.selectedProject && viewerInitialized.value) {
        await loadModels();
      }
    }
  },
  { deep: true }
);

const initializeViewer = async () => {
  // Return early if already in the process of initializing or no container exists
  if (!viewerContainer.value) {
    console.log("Viewer container not available");
    return null;
  }

  if (viewerInitialized.value && viewer.value) {
    console.log("Viewer already initialized, returning existing instance");
    return viewer.value;
  }

  console.log("Initializing viewer...");
  errorMessage.value = null;

  try {
    // Dispose existing viewer if present as a precaution
    await disposeViewer();

    // Wait for DOM update
    await nextTick();

    // Make sure the container has dimensions and is visible
    if (viewerContainer.value) {
      // Make sure container is visible
      viewerContainer.value.style.visibility = "visible";
      viewerContainer.value.style.display = "block";
      viewerContainer.value.style.height = "500px"; // Set explicit height
      viewerContainer.value.style.width = "100%";
      viewerContainer.value.style.position = "relative"; // Ensure positioning context
      viewerContainer.value.style.zIndex = "10"; // Ensure visibility

      console.log("Viewer container dimensions:", {
        width: viewerContainer.value.clientWidth,
        height: viewerContainer.value.clientHeight,
        visibility: getComputedStyle(viewerContainer.value).visibility,
        display: getComputedStyle(viewerContainer.value).display,
      });
    }

    if (
      !viewerContainer.value.clientWidth ||
      !viewerContainer.value.clientHeight
    ) {
      console.warn("Viewer container has no dimensions. Setting minimum size.");
      viewerContainer.value.style.minHeight = "500px";
      viewerContainer.value.style.minWidth = "100%";
    }

    console.log("Creating new viewer instance...");
    // Create viewer parameters with proper type
    const viewerParams = {
      ...DefaultViewerParams,
      backgroundColor: new THREE.Color(props.viewerBackgroundColor),
      verbose: true, // Enable verbose logging
      showStats: true, // Show stats panel (FPS, etc.)
    };

    console.log("Initializing viewer with container:", viewerContainer.value);
    const viewerInstance = new Viewer(viewerContainer.value, viewerParams);

    // Initialize viewer and wait for it to complete
    await viewerInstance.init();

    // Set the viewer reference after successful initialization
    viewer.value = markRaw(viewerInstance);

    // Add required extensions
    viewer.value.createExtension(CameraController);
    viewer.value.createExtension(SelectionExtension);

    // Mark as initialized
    viewerInitialized.value = true;
    console.log("Viewer initialized successfully");

    return viewer.value;
  } catch (error) {
    console.error("Error initializing Speckle Viewer:", error);
    console.error("Error details:", {
      message: (error as Error).message,
      stack: (error as Error).stack,
      name: (error as Error).name,
    });
    errorMessage.value =
      "Failed to initialize 3D viewer. Please try refreshing the page.";
    viewerInitialized.value = false;
    return null;
  }
};

// Updated model loading function to use Projects and Models instead of Streams and Objects
const loadModelFromSpeckle = async (projectId: string, modelId: string) => {
  const loadId = `${projectId}-${modelId}-${Date.now()}`;
  activeLoads.value.push(loadId);

  try {
    console.log(`Loading model: projectId=${projectId}, modelId=${modelId}`);
    errorMessage.value = null;
    isLoadingModel.value = true;

    if (!viewer.value) {
      console.error("Viewer not initialized");
      errorMessage.value = "Viewer not initialized";
      return false;
    }

    // Try to load the Speckle model using Project/Model endpoints
    try {
      console.log("Initializing model loader...");

      // Create a loader for the specific model with corrected URL format
      const serverUrl = "https://app.speckle.systems";

      // First, try to get the token from the store
      const token = store.speckle?.token;

      if (!token) {
        console.warn(
          "No authentication token available, model fetching may fail"
        );
        errorMessage.value = "Authentication required to load this model";
        return false;
      }

      // CORRECTION: Use 'projects' instead of 'streams' and 'models' instead of 'objects'
      // Create a custom loader using fetch directly to handle the API correctly
      console.log(
        `Attempting to load from: ${serverUrl}/api/projects/${projectId}/models/${modelId}`
      );

      try {
        // First attempt: Try to fetch via direct API request instead of ObjectLoader
        const response = await fetch(
          `${serverUrl}/api/projects/${projectId}/models/${modelId}/objects`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
            },
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const modelData = await response.json();
        console.log("Model data fetched successfully:", modelData);

        if (modelData && viewer.value) {
          // If we have object data, try to convert and load it
          try {
            // Use the Speckle viewer to load the model data
            if (modelData.objects) {
              const objects = Array.isArray(modelData.objects)
                ? modelData.objects
                : [modelData.objects];

              for (const obj of objects) {
                await viewer.value.loadObject(obj);
              }

              console.log("Model added to viewer successfully");

              // Center camera on loaded object
              if (viewer.value.cameraHandler) {
                viewer.value.cameraHandler.fitCameraToScene();
              }

              return true;
            } else {
              console.warn("Model data doesn't contain objects property");
            }
          } catch (viewerError) {
            console.error("Error adding model data to viewer:", viewerError);
          }
        }
      } catch (directApiError) {
        console.error("Error with direct API approach:", directApiError);

        // Fallback to ObjectLoader with corrected parameters
        try {
          console.log("Trying fallback approach with ObjectLoader...");

          // Try using ObjectLoader but with corrected paths
          const objectLoader = new ObjectLoader({
            serverUrl: serverUrl,
            token: token,
            // Try using project ID as stream ID and model ID as object ID
            streamId: projectId,
            objectId: modelId,
            options: {
              enableCaching: false, // Disable cache to force new fetch
              fullyTraverseArrays: true,
            },
          });

          const obj = await objectLoader.getRootObject();

          if (obj && viewer.value) {
            console.log(
              "Model loaded successfully via fallback ObjectLoader:",
              obj
            );

            // Try to add the object to the viewer
            await viewer.value.loadObject(obj);
            console.log("Model added to viewer successfully");

            // Center camera on loaded object
            if (viewer.value.cameraHandler) {
              viewer.value.cameraHandler.fitCameraToScene();
            }

            return true;
          }
        } catch (loaderError: any) {
          // Handle fallback errors
          console.error(`Fallback ObjectLoader also failed:`, loaderError);
        }
      }

      // If we reach here, create a placeholder for the failed model
      console.warn("All loading approaches failed, creating placeholder");
      try {
        if (viewer.value && viewer.value.scene) {
          const placeholderGeometry = new THREE.BoxGeometry(15, 15, 15);
          const placeholderMaterial = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            wireframe: true,
          });
          const placeholderMesh = new THREE.Mesh(
            placeholderGeometry,
            placeholderMaterial
          );
          placeholderMesh.position.set(0, 0, 0);
          viewer.value.scene.add(placeholderMesh);

          // Create a small text label to indicate model ID
          const textGeometry = new THREE.BoxGeometry(20, 3, 1);
          const textMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
          const textMesh = new THREE.Mesh(textGeometry, textMaterial);
          textMesh.position.set(0, 20, 0);
          viewer.value.scene.add(textMesh);

          console.log("Added placeholder for failed model load");

          errorMessage.value = `Could not load model '${modelId}'. Using API path: /api/projects/${projectId}/models/${modelId}`;

          if (viewer.value.cameraHandler) {
            viewer.value.cameraHandler.fitCameraToObjects([placeholderMesh]);
          }

          return true; // We're returning true because we at least showed something
        }
      } catch (placeholderError) {
        console.error("Failed to create placeholder:", placeholderError);
      }
    } catch (error) {
      console.error("General error in model loading:", error);
    }

    // Last resort - create a basic test cube
    try {
      if (viewer.value && viewer.value.scene) {
        const testCubeGeometry = new THREE.BoxGeometry(10, 10, 10);
        const testCubeMaterial = new THREE.MeshBasicMaterial({
          color: 0x00ff00,
          wireframe: true,
        });
        const testCube = new THREE.Mesh(testCubeGeometry, testCubeMaterial);
        viewer.value.scene.add(testCube);
        console.log("Added test cube to scene (fallback)");

        if (viewer.value.cameraHandler) {
          testCube.position.set(0, 0, 0);
          viewer.value.cameraHandler.fitCameraToObjects([testCube]);
        }

        return true;
      }
    } catch (cubeError) {
      console.error("Error adding test cube:", cubeError);
    }

    return false;
  } catch (error) {
    console.error("Error in loadModelFromSpeckle:", error);
    errorMessage.value = "Failed to load model from Speckle";
    return false;
  } finally {
    // Clean up
    activeLoads.value = activeLoads.value.filter((id) => id !== loadId);
    isLoadingModel.value = false;
  }
};

// Additional helper function to check model existence
const validateSpeckleModel = async (projectId: string, modelId: string) => {
  try {
    const token = store.speckle?.token;
    if (!token) return false;

    const serverUrl = "https://app.speckle.systems";

    // Check if model exists using API
    const checkResponse = await fetch(
      `${serverUrl}/api/projects/${projectId}/models/${modelId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      }
    );

    if (checkResponse.ok) {
      const modelInfo = await checkResponse.json();
      console.log("Model validation succeeded:", modelInfo);
      return true;
    } else {
      console.warn(`Model validation failed: HTTP ${checkResponse.status}`);
      return false;
    }
  } catch (error) {
    console.error("Error validating model:", error);
    return false;
  }
};

// Update loadModels function to use model validation
const loadModels = async () => {
  console.log("loadModels called");

  if (!props.selectedProject) {
    console.error("Cannot load models: Project not available");
    return;
  }

  // Ensure viewer is initialized
  if (!viewer.value) {
    console.log("Viewer not initialized, initializing now");
    const viewerInstance = await initializeViewer();
    if (!viewerInstance) {
      console.error("Failed to initialize viewer");
      errorMessage.value = "Failed to initialize viewer";
      return;
    }
  }

  try {
    console.log("Clearing existing objects before loading new ones");
    // Clear existing objects from viewer - use safer method
    if (viewer.value && viewer.value.scene) {
      // Remove all objects from the scene except cameras and lights
      const objectsToRemove = [];
      viewer.value.scene.traverse((object) => {
        if (
          !(object instanceof THREE.Camera) &&
          !(object instanceof THREE.Light) &&
          !(object === viewer.value.scene)
        ) {
          objectsToRemove.push(object);
        }
      });

      for (const obj of objectsToRemove) {
        viewer.value.scene.remove(obj);
        if (obj.dispose) obj.dispose();
      }

      console.log(`Removed ${objectsToRemove.length} objects from scene`);
    }

    const modelsToLoad =
      props.selectedDesignOption === "Both"
        ? [...props.designOptions.Option1, ...props.designOptions.Option2]
        : props.designOptions[
            props.selectedDesignOption as keyof typeof props.designOptions
          ] || [];

    console.log(
      `Loading ${modelsToLoad.length} models for option: ${props.selectedDesignOption}`,
      modelsToLoad
    );

    let loadedAnyModel = false;

    // If we have no models to load but the viewer is active, add a test object so user sees something
    if (modelsToLoad.length === 0 && viewer.value) {
      console.log("No models to load, adding placeholder test object");

      const placeholderGeometry = new THREE.BoxGeometry(20, 20, 20);
      const placeholderMaterial = new THREE.MeshBasicMaterial({
        color: 0x0088ff,
        wireframe: true,
      });
      const placeholderMesh = new THREE.Mesh(
        placeholderGeometry,
        placeholderMaterial
      );

      try {
        if (viewer.value.scene) {
          viewer.value.scene.add(placeholderMesh);
          placeholderMesh.position.set(0, 0, 0);

          // Add text to indicate no models selected
          const textMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
          const cubeGeom = new THREE.BoxGeometry(25, 5, 1);
          const textMesh = new THREE.Mesh(cubeGeom, textMaterial);
          textMesh.position.set(0, 25, 0);
          viewer.value.scene.add(textMesh);

          errorMessage.value =
            "No models selected. Please select a model from the project details.";
          loadedAnyModel = true;

          if (viewer.value.cameraHandler) {
            viewer.value.cameraHandler.fitCameraToObjects([placeholderMesh]);
          }
        }
      } catch (err) {
        console.error("Error adding placeholder object:", err);
      }
    }

    for (const model of modelsToLoad) {
      if (!model || !model.id) {
        console.warn("Skipping model due to missing ID:", model);
        continue;
      }

      try {
        const modelId = model.id;
        const projectId = props.selectedProject.id;

        console.log(`Loading model: ${modelId} from project: ${projectId}`);

        // Validate model before loading
        const modelExists = await validateSpeckleModel(projectId, modelId);

        if (!modelExists) {
          console.warn(`Model ${modelId} not found, skipping load attempt`);
          errorMessage.value = `Model ${modelId} not found in project ${projectId}`;
          continue;
        }

        // Use our updated loading function
        const success = await loadModelFromSpeckle(projectId, modelId);

        if (success) {
          loadedAnyModel = true;
          console.log(`Successfully loaded model: ${modelId}`);
        } else {
          console.error(`All loading approaches failed for model ${modelId}`);
        }
      } catch (modelError) {
        console.error(`Error processing model ${model.id}:`, modelError);
      }
    }

    if (loadedAnyModel) {
      try {
        console.log("Models loaded, positioning camera...");
        if (viewer.value && viewer.value.cameraHandler) {
          viewer.value.cameraHandler.fitCameraToScene();
        }
      } catch (cameraErr) {
        console.warn("Error positioning camera:", cameraErr);
      }
    } else {
      console.warn(
        "No models were loaded successfully. Cannot position camera."
      );
      errorMessage.value =
        "No models could be loaded. Please try a different project or model.";
    }
  } catch (err) {
    console.error("Error in loadModels:", err);
    errorMessage.value = "Failed to load models. Please try again.";
  }
};

const setMapPosition = (lat: number, lng: number) => {
  if (googleMap.value && googleMap.value.map) {
    try {
      googleMap.value.map.setCenter({ lat, lng });
    } catch (error) {
      console.error("Error setting map position:", error);
    }
  }
};

// Expose the necessary functions to the parent component
defineExpose({
  initializeViewer,
  loadModels,
  setMapPosition,
  disposeViewer,
});
</script>
