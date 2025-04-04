<template>
  <div class="w-full h-full flex flex-col space-y-6">
    <!-- Speckle Viewer Section -->
    <div class="w-full relative" style="height: 60vh; min-height: 400px">
      <h2 class="text-xl font-semibold text-gray-800 mb-2">Viewer</h2>
      <div
        id="viewer-container"
        ref="viewerContainer"
        class="w-full h-full rounded-lg shadow-inner overflow-hidden"
        :style="{
          zIndex: '1',
          position: 'relative',
          background: containerBackgroundColor,
        }"
      >
        <!-- Empty fallback element for when canvas isn't rendered properly -->
        <div
          v-if="forceResetNeeded || !viewerInitialized"
          class="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-50"
        >
          <button
            @click="reinitializeViewer"
            class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Reload Viewer
          </button>
        </div>

        <!-- Canvas debugging info -->
        <div
          v-if="debugInfo"
          class="absolute bottom-2 left-2 bg-white/80 text-xs p-1 rounded z-50"
        >
          Canvas: {{ debugInfo }}
        </div>
      </div>
      <div
        v-if="isLoadingModel"
        class="text-blue-600 mt-2 absolute top-4 right-4 bg-white px-2 py-1 rounded shadow z-20"
      >
        <span class="inline-block animate-pulse mr-1">⏳</span> Loading model...
      </div>
      <div
        v-if="errorMessage"
        class="text-red-600 mt-2 bg-white/80 p-1 rounded"
      >
        {{ errorMessage }}
      </div>
    </div>

    <!-- Google Map Section -->
    <div class="w-full" style="height: 30vh; min-height: 250px">
      <h2 class="text-xl font-semibold text-gray-800 mb-2">Map View</h2>
      <div class="w-full h-full">
        <!-- Google map component -->
        <GoogleMap ref="googleMap" class="rounded-lg overflow-hidden shadow" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  ref,
  onBeforeUnmount,
  watch,
  onMounted,
  nextTick,
  markRaw,
  computed,
} from "vue";
import GoogleMap from "@/components/GoogleMap.vue";
import { useImmersionLabStore } from "@/stores/store-IL";
import {
  Viewer,
  DefaultViewerParams,
  SpeckleLoader,
  CameraController,
  SelectionExtension,
  UrlHelper,
  ViewerEvent,
} from "@speckle/viewer";
import * as THREE from "three";

// Props definition
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
  containerBackgroundColor: {
    type: String,
    default: "#f0f0f0",
  },
});

const store = useImmersionLabStore();

// Refs and state variables
const googleMap = ref<{ map?: google.maps.Map } | null>(null);
const viewer = ref<Viewer | null>(null);
const viewerContainer = ref<HTMLElement | null>(null);
const viewerInitialized = ref(false);
const isLoadingModel = ref(false);
const errorMessage = ref<string | null>(null);
const loadingModelIds = ref(new Set());
const forceResetNeeded = ref(false);
const canvasCheckTimer = ref<number | null>(null);
const debugInfo = ref<string | null>(null);

// Clean up resources when component is destroyed
onBeforeUnmount(() => {
  if (canvasCheckTimer.value) {
    clearInterval(canvasCheckTimer.value);
    canvasCheckTimer.value = null;
  }
  disposeViewer();
});

// Initialize the viewer when the component is mounted
onMounted(async () => {
  console.log("ViewerComponent mounted, initializing viewer...");

  // Wait for DOM to settle
  await new Promise((resolve) => setTimeout(resolve, 200));
  await initializeViewer();

  // Start checking if canvas is actually visible/rendered
  startCanvasChecks();

  if (props.selectedProject) {
    await loadModels();
  }
});

// Function to check if the canvas is properly displayed
const startCanvasChecks = () => {
  // Clear any existing timer
  if (canvasCheckTimer.value) {
    clearInterval(canvasCheckTimer.value);
  }

  // Set up interval to check if canvas is properly rendered
  canvasCheckTimer.value = setInterval(() => {
    if (!viewerContainer.value) return;

    const canvas = viewerContainer.value.querySelector("canvas");
    if (!canvas) {
      console.warn("Canvas element not found in viewer container");
      debugInfo.value = "Not found";
      forceResetNeeded.value = true;
      return;
    }

    // Check if canvas has proper dimensions and is visible
    const canvasStyle = window.getComputedStyle(canvas);
    debugInfo.value = `${canvas.width}x${canvas.height} | ${canvasStyle.position} | Z:${canvasStyle.zIndex}`;

    if (canvas.width === 0 || canvas.height === 0) {
      console.warn("Canvas has zero width/height, needs reset");
      forceResetNeeded.value = true;
    }

    if (canvasStyle.display === "none" || canvasStyle.visibility === "hidden") {
      console.warn("Canvas is hidden, needs reset");
      forceResetNeeded.value = true;
    }

    // Check if viewer is initialized but not showing content
    if (viewerInitialized.value && forceResetNeeded.value) {
      console.log("Forcing viewer reset due to detected issues");
      reinitializeViewer();
      forceResetNeeded.value = false;
    }
  }, 2000); // Check every 2 seconds
};

// Add a forced re-initialization method
const reinitializeViewer = async () => {
  console.log("Forcing viewer re-initialization...");
  await disposeViewer();
  await nextTick();

  // Ensure container is ready
  await new Promise((resolve) => setTimeout(resolve, 300));

  const success = await initializeViewer();

  if (success && props.selectedProject) {
    console.log("Reloading models after forced re-initialization");
    await loadModels();
  }
};

// Safely dispose the viewer to prevent memory leaks
const disposeViewer = async () => {
  try {
    if (viewer.value) {
      console.log("Disposing viewer instance...");

      // Clean up resize observer if it exists
      if ((viewer.value as any).userData?.resizeObserver) {
        (viewer.value as any).userData.resizeObserver.disconnect();
      }

      await viewer.value.dispose();
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
        // Use type assertion to access setBackgroundColor method
        (viewer.value as any).setBackgroundColor(new THREE.Color(newColor));
        console.log("Background color updated to:", newColor);
      } catch (error) {
        console.warn("Could not update background color:", error);
      }
    }
  }
);

// Watch for changes in the container background color
watch(
  () => props.containerBackgroundColor,
  (newColor) => {
    console.log("Container background color updated to:", newColor);
  }
);

// Watch for changes in selected design option to update the viewer
watch(
  () => props.selectedDesignOption,
  async (newOption) => {
    console.log(`Design option changed to: ${newOption}, reloading models`);
    if (props.selectedProject && viewerInitialized.value) {
      await loadModels();
    }
  }
);

// Watch for changes in design options to update the viewer
watch(
  () => props.designOptions,
  async () => {
    console.log("Design options changed, reloading models");
    if (props.selectedProject && viewerInitialized.value) {
      await loadModels();
    }
  },
  { deep: true }
);

const initializeViewer = async () => {
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
    await disposeViewer();
    await nextTick();

    // Clear container of any leftover elements
    while (viewerContainer.value.firstChild) {
      viewerContainer.value.removeChild(viewerContainer.value.firstChild);
    }

    // Configure viewer parameters
    const viewerParams = {
      ...DefaultViewerParams,
      backgroundColor: new THREE.Color(props.viewerBackgroundColor),
      verbose: true,
      showStats: true,
      renderer: {
        antialias: true,
        alpha: true,
      },
    };

    // Create and initialize viewer
    console.log("Creating new viewer instance...");
    const viewerInstance = new Viewer(viewerContainer.value, viewerParams);
    await viewerInstance.init();
    viewer.value = markRaw(viewerInstance);

    // Check if canvas was created
    const canvas = viewerContainer.value.querySelector("canvas");
    if (!canvas) {
      console.error("Canvas was not created during initialization");
      throw new Error("Canvas element not found after viewer init");
    }

    // Ensure canvas has correct style and z-index
    canvas.style.position = "absolute";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.zIndex = "2";
    canvas.style.display = "block";

    debugInfo.value = `Created: ${canvas.width}x${canvas.height}`;

    // Add essential extensions
    viewer.value.createExtension(CameraController);
    viewer.value.createExtension(SelectionExtension);

    // Add a resize handler to ensure viewer stays properly sized
    const resizeObserver = new ResizeObserver(() => {
      if (viewer.value && viewerContainer.value) {
        try {
          console.log("Container resized, updating viewer");
          viewer.value.resize();

          // Force render to update after resize
          if (
            (viewer.value as any).renderHandler?.renderer &&
            (viewer.value as any).scene &&
            (viewer.value as any).cameraHandler?.activeCam
          ) {
            (viewer.value as any).renderHandler.renderer.render(
              (viewer.value as any).scene,
              (viewer.value as any).cameraHandler.activeCam
            );
          }
        } catch (e) {
          console.warn("Error during resize:", e);
        }
      }
    });

    resizeObserver.observe(viewerContainer.value);

    // Store the observer reference to disconnect it later
    (viewer.value as any).userData = {
      ...(viewer.value as any).userData,
      resizeObserver,
    };

    viewerInitialized.value = true;
    forceResetNeeded.value = false;
    console.log("Viewer initialized successfully");

    // Force initial resize
    if (viewerContainer.value) {
      viewer.value.resize();

      // Trigger a render to make sure canvas is updated
      if (
        (viewer.value as any).renderHandler?.renderer &&
        (viewer.value as any).scene &&
        (viewer.value as any).cameraHandler?.activeCam
      ) {
        (viewer.value as any).renderHandler.renderer.render(
          (viewer.value as any).scene,
          (viewer.value as any).cameraHandler.activeCam
        );
      }
    }

    return viewer.value;
  } catch (error) {
    console.error("Error initializing Speckle Viewer:", error);
    errorMessage.value =
      "Failed to initialize 3D viewer. Please try refreshing the page.";
    viewerInitialized.value = false;
    return null;
  }
};

const loadModels = async () => {
  console.log("loadModels called");

  if (!props.selectedProject) {
    console.error("Cannot load models: Project not available");
    return;
  }

  if (!viewer.value) {
    console.log("Viewer not initialized, initializing now");
    const viewerInstance = await initializeViewer();
    if (!viewerInstance) {
      console.error("Failed to initialize viewer");
      errorMessage.value = "Failed to initialize viewer";
      return;
    }
  }

  let successfulLoads = new Set(); // Track unique models that loaded successfully
  const attemptedUrls = new Set(); // Track URLs that have been attempted to avoid duplicates
  loadingModelIds.value = new Set(); // Reset the loading model IDs

  try {
    isLoadingModel.value = true;
    errorMessage.value = null;

    // Clear existing objects using the proper API method
    if (viewer.value) {
      console.log("Clearing existing objects before loading new ones");
      try {
        await viewer.value.unloadAll();
        console.log("Scene cleared successfully");
      } catch (resetError) {
        console.error("Error clearing scene:", resetError);
      }
    }

    // Get the models for the selected design option
    const modelsToLoad =
      props.selectedDesignOption === "Both"
        ? [...props.designOptions.Option1, ...props.designOptions.Option2]
        : props.designOptions[
            props.selectedDesignOption as keyof typeof props.designOptions
          ] || [];

    console.log(
      `Loading ${modelsToLoad.length} models for option: ${props.selectedDesignOption}`
    );

    if (modelsToLoad.length === 0) {
      console.log("No models to load");
      errorMessage.value =
        "No models selected. Please select a model from the project details.";
      return;
    }

    const token = store.speckle?.token || "";
    const serverUrl = "https://app.speckle.systems";
    let loadedObjectsCount = 0;

    // Load each model using UrlHelper and SpeckleLoader
    for (const model of modelsToLoad) {
      if (!model || !model.id) {
        console.warn("Skipping model due to missing ID");
        continue;
      }

      const modelId = model.id;
      const projectId = props.selectedProject.id;

      // Skip if we're already loading this model
      if (loadingModelIds.value.has(modelId)) {
        console.log(`Model ${modelId} is already being loaded, skipping`);
        continue;
      }

      // Mark this model as being loaded
      loadingModelIds.value.add(modelId);

      console.log(`Loading model: ${modelId} from project: ${projectId}`);

      try {
        const modelUrl = `${serverUrl}/projects/${projectId}/models/${modelId}`;
        const urls = await UrlHelper.getResourceUrls(modelUrl).catch((err) => {
          console.error(
            `Error getting resource URLs for model ${modelId}:`,
            err
          );
          return [];
        });

        if (!urls || urls.length === 0) {
          console.warn(`No resource URLs found for model: ${modelId}`);
          const directObjectUrl = `${serverUrl}/streams/${projectId}/objects/${modelId}`;
          console.log(`Trying direct object URL: ${directObjectUrl}`);

          if (viewer.value && viewer.value.getWorldTree) {
            try {
              const loader = new SpeckleLoader(
                viewer.value.getWorldTree(),
                directObjectUrl,
                token
              );

              try {
                if (loader && typeof loader.removeListener === "function") {
                  loader.removeListener("load-progress", () => {});
                }
              } catch (listenerErr) {
                console.warn(
                  "Could not remove listeners, continuing anyway:",
                  listenerErr
                );
              }

              console.log("Loading with direct object URL");
              await viewer.value.loadObject(loader, true);
              console.log(`Successfully loaded direct object: ${modelId}`);
              successfulLoads.add(modelId);
              loadedObjectsCount++;
            } catch (directErr) {
              console.error(
                `Failed to load model with direct URL: ${directErr}`
              );
            }
          }
          continue;
        }

        let modelLoaded = false;
        const urlsToTry = urls.slice(0, 2);

        for (const url of urlsToTry) {
          if (attemptedUrls.has(url)) {
            console.log(`Skipping already attempted URL: ${url}`);
            continue;
          }

          attemptedUrls.add(url);

          if (!viewer.value || !viewer.value.getWorldTree) {
            console.error("Viewer or WorldTree not available");
            continue;
          }

          try {
            const loader = new SpeckleLoader(
              viewer.value.getWorldTree(),
              url,
              token
            );

            if (!loader) {
              console.error("Failed to create loader for URL:", url);
              continue;
            }

            try {
              if (loader && typeof loader.removeListener === "function") {
                loader.removeListener("load-progress", () => {});
              }
            } catch (listenerErr) {
              console.warn(
                "Could not remove listeners, continuing anyway:",
                listenerErr
              );
            }

            console.log(`Loading object from URL: ${url}`);

            let loadTimedOut = false;
            const timeoutId = setTimeout(() => {
              loadTimedOut = true;
              console.warn(`Load timeout for URL: ${url}`);
            }, 30000);

            try {
              await Promise.race([
                viewer.value.loadObject(loader, true),
                new Promise((_, reject) =>
                  setTimeout(
                    () => reject(new Error("Operation timed out")),
                    30000
                  )
                ),
              ]);

              clearTimeout(timeoutId);

              if (!loadTimedOut) {
                console.log(`Successfully loaded resource from URL: ${url}`);
                successfulLoads.add(modelId);
                loadedObjectsCount++;
                modelLoaded = true;
                break;
              }
            } catch (loadError) {
              clearTimeout(timeoutId);
              console.error(`Error loading from URL ${url}:`, loadError);
            }

            await new Promise((resolve) => setTimeout(resolve, 300));
          } catch (loadErr) {
            console.error(`Error creating loader for URL ${url}:`, loadErr);
          }
        }

        if (!modelLoaded) {
          console.warn(`Failed to load any resources for model: ${modelId}`);
        }
      } catch (err) {
        console.error(`Error loading model ${modelId}:`, err);
      } finally {
        loadingModelIds.value.delete(modelId);
      }
    }

    if (successfulLoads.size === 0) {
      console.warn("No objects were loaded successfully");
      errorMessage.value =
        "Failed to load any models. Please check your selection.";
    } else {
      console.log(
        `Successfully loaded ${successfulLoads.size} unique models (${loadedObjectsCount} total objects)`
      );
      errorMessage.value = null;

      await fitCameraToScene();
      addGridHelper();
    }
  } catch (err) {
    console.error("Error in loadModels:", err);
    errorMessage.value = "Failed to load models. Please try again.";
  } finally {
    isLoadingModel.value = false;
    loadingModelIds.value.clear();
  }
};

const fitCameraToScene = async () => {
  if (!viewer.value) return;

  console.log("Attempting to fit camera to scene");

  await new Promise((resolve) => setTimeout(resolve, 500));

  try {
    const cameraController = viewer.value.getExtension(CameraController);
    if (cameraController) {
      // Use zoomExtents instead of fitToScene for proper camera fitting
      (cameraController as any).zoomExtents();
      console.log("Initial camera fit completed");
    } else {
      console.warn("CameraController extension not available");
    }
  } catch (e) {
    console.warn("Initial camera fit failed:", e);
  }

  const retryDelays = [100, 500, 1000, 2000];

  for (const delay of retryDelays) {
    await new Promise((resolve) => setTimeout(resolve, delay));

    try {
      console.log(`Retrying camera fit after ${delay}ms`);
      const cameraController = viewer.value.getExtension(CameraController);
      if (cameraController) {
        (cameraController as any).zoomExtents();

        if (delay > 500) {
          // Access the camera through the proper API
          const camera = (viewer.value as any).cameraHandler?.activeCam;
          if (camera && camera.position) {
            console.log("Adjusting camera position for better visibility");
            camera.position.multiplyScalar(1.2);
            camera.updateProjectionMatrix();

            if ((viewer.value as any).renderHandler?.renderer) {
              // Use the proper renderer access pattern
              (viewer.value as any).renderHandler.renderer.render(
                (viewer.value as any).scene,
                camera
              );
            }
          }
        }
      }
    } catch (e) {
      console.warn("Error during camera fit retry:", e);
    }
  }
};

const addGridHelper = () => {
  if (!viewer.value) return;

  try {
    // Get the scene from the viewer using type assertion
    const scene = (viewer.value as any).scene;
    if (!scene) {
      console.warn("Scene not available in viewer");
      return;
    }

    const existingGrid = scene.children.find(
      (child: THREE.Object3D) => child.name === "gridHelper"
    );
    if (existingGrid) {
      scene.remove(existingGrid);
    }

    const gridHelper = new THREE.GridHelper(100, 100, 0x888888, 0xcccccc);
    gridHelper.name = "gridHelper";
    gridHelper.position.y = -0.01;
    scene.add(gridHelper);

    console.log("Added grid helper for orientation");
  } catch (e) {
    console.warn("Failed to add grid helper:", e);
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

defineExpose({
  initializeViewer,
  loadModels,
  setMapPosition,
  disposeViewer,
  reinitializeViewer,
});
</script>

<style scoped>
#viewer-container {
  isolation: isolate;
  position: relative;
  min-height: 400px;
  display: block; /* Force block display */
  overflow: visible;
}

/* Force hardware acceleration */
#viewer-container,
#viewer-container * {
  -webkit-transform: translateZ(0);
  -moz-transform: translateZ(0);
  -ms-transform: translateZ(0);
  transform: translateZ(0);
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
.animate-pulse {
  animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
</style>
