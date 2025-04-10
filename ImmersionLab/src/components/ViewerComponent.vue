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

        <!-- Object movement controls -->
        <div
          class="absolute top-2 right-2 bg-white/80 text-sm p-1 rounded z-50 flex gap-2 flex-col"
        >
          <button
            @click="toggleObjectMovement"
            class="px-2 py-1 rounded text-xs"
            :class="
              isObjectMovementEnabled
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700'
            "
          >
            {{ isObjectMovementEnabled ? "Disable" : "Enable" }} Object Movement
          </button>

          <!-- Add mode selector buttons -->
          <div v-if="isObjectMovementEnabled" class="flex gap-1 mt-1">
            <button
              v-for="mode in ['translate', 'rotate', 'scale'] as Array<'translate' | 'rotate' | 'scale'>"
              :key="mode"
              @click="setTransformMode(mode)"
              class="px-2 py-1 rounded text-xs"
              :class="
                currentTransformMode === mode
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700'
              "
            >
              {{ mode.charAt(0).toUpperCase() + mode.slice(1) }}
            </button>
          </div>
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
  UpdateFlags,
  ObjectLayers,
  type SelectionEvent,
} from "@speckle/viewer";
import * as THREE from "three";
import { Object3D, Vector3, Box3 } from "three";
// Update TransformControls import with proper type casting
import { TransformControls } from "three/examples/jsm/controls/TransformControls.js";

// Define an extended interface for the TransformControls
type ExtendedTransformControls = TransformControls & {
  visible: boolean;
  children: THREE.Object3D[];
};

// ExtendedSelection class implementation for object movement
class ExtendedSelection extends SelectionExtension {
  // Add static ID to properly register the extension
  static get extensionId() {
    return "extended-selection";
  }

  /** This object will recieve the TransformControls translation */
  private dummyAnchor: Object3D = new Object3D();
  /** Stock three.js gizmo */
  private transformControls: ExtendedTransformControls | undefined;
  private lastGizmoTranslation: Vector3 = new Vector3();
  // Add a property to store camera controller for disable/enable during dragging
  protected declare cameraProvider: any;
  // Add mode support
  private currentMode: "translate" | "rotate" | "scale" = "translate";

  public init() {
    // Perform initialization logic specific to ExtendedSelection

    /** We set the layers to PROPS so that the viewer regular pipeline ignores it */
    this.dummyAnchor.layers.set(ObjectLayers.PROPS);
    this.viewer.getRenderer().scene.add(this.dummyAnchor);

    // Store camera controller reference
    this.cameraProvider = this.viewer.getExtension(CameraController);

    // Initialize the gizmo
    this.initGizmo();
  }

  public selectObjects(ids: Array<string>, multiSelect = false) {
    super.selectObjects(ids, multiSelect);
    this.updateGizmo(ids.length ? true : false);
  }

  protected onObjectClicked(selection: SelectionEvent) {
    /** Do whatever the base extension is doing */
    super.onObjectClicked(selection);
    console.log("Object clicked:", selection);
    /** Update the anchor and gizmo location */
    this.updateGizmo(selection ? true : false);
  }

  // Add a method to set the transform mode
  public setMode(mode: "translate" | "rotate" | "scale") {
    if (this.transformControls) {
      this.currentMode = mode;
      this.transformControls.setMode(mode);
      this.viewer.requestRender();
    }
  }

  private initGizmo() {
    const camera = this.viewer.getRenderer().renderingCamera;
    if (!camera) {
      throw new Error("Cannot init move gizmo with no camera");
    }

    /** Create a new TransformControls gizmo */
    const gizmo = new TransformControls(
      camera,
      this.viewer.getRenderer().renderer.domElement
    );

    this.transformControls = gizmo as ExtendedTransformControls;

    /** The gizmo creates an entire hierarchy of children internally,
     *  and three.js objects do not inherit parent layer values, so
     *  we must set all the child gizmo objects to the desired layer manually
     */
    this.transformControls.children.forEach((obj: THREE.Object3D) => {
      obj.layers.set(ObjectLayers.PROPS);
    });

    /** Set the raycaster's layer as well */
    this.transformControls.getRaycaster().layers.set(ObjectLayers.PROPS);

    /** We set the overall gizmo size */
    this.transformControls.setSize(0.5);

    // Default to translate mode
    this.transformControls.setMode("translate");

    /** These are the TransformControls events */
    this.transformControls.addEventListener("change", () => {
      /** We request a render each time we interact with the gizmo */
      this.viewer.requestRender();
    });

    this.transformControls.addEventListener(
      "dragging-changed",
      (event: THREE.Event) => {
        /** When we start dragging the gizmo, we disable the camera controls
         *  and re-enable them once we're done
         */
        const val = !!(event as { value?: boolean }).value;

        if (this.cameraProvider) {
          if (val) {
            this.cameraProvider.enabled = !val;
          } else {
            setTimeout(() => {
              this.cameraProvider.enabled = !val;
            }, 100);
          }
        }
      }
    );

    this.transformControls.addEventListener(
      "objectChange",
      this.onAnchorChanged.bind(this)
    );

    /** We add the gizmo to the scene */
    this.viewer
      .getRenderer()
      .scene.add(this.transformControls as unknown as THREE.Object3D);
  }

  /** This positions the anchor and gizmo to the center of the selected objects
   *  bounds. Note that a single selection might yield multiple individual objects
   *  to getting selected
   */
  private updateGizmo(attach: boolean) {
    const box = new Box3();
    // Track if we have any valid selection
    let hasValidSelection = false;

    // Calculate bounds union of all selected objects
    for (const k in this.selectionRvs) {
      const batchObject = this.viewer
        .getRenderer()
        .getObject(this.selectionRvs[k]);
      if (!batchObject) {
        console.warn(
          "Batch object not found for selection:",
          this.selectionRvs[k]
        );
        continue;
      }
      box.union(batchObject.aabb);
      hasValidSelection = true;
    }

    // If no valid selection objects found, detach gizmo
    if (!hasValidSelection) {
      if (this.transformControls) {
        this.transformControls.detach();
      }
      return;
    }

    const center = box.getCenter(new Vector3());
    this.dummyAnchor.position.copy(center);
    this.lastGizmoTranslation.copy(this.dummyAnchor.position);

    if (this.transformControls) {
      // Always make sure transform controls are visible when we have a selection
      this.transformControls.visible = true;

      if (attach) {
        console.log("Attaching TransformControls to dummy anchor");
        this.transformControls.attach(this.dummyAnchor);
      } else {
        this.transformControls.detach();
      }
    }
  }

  /** This is where the transformation gets applied */
  private onAnchorChanged() {
    // Calculate the delta position from the last transformation
    const anchorPos = new Vector3().copy(this.dummyAnchor.position);
    const anchorPosDelta = anchorPos.sub(this.lastGizmoTranslation);

    // Apply the movement to all selected objects
    for (const k in this.selectionRvs) {
      const batchObject = this.viewer
        .getRenderer()
        .getObject(this.selectionRvs[k]);
      /** Only objects of type mesh can have batch objects.
       *  Lines and points do not
       */
      if (!batchObject) continue;

      /** Apply the transformation - calculate the new position */
      const newPosition = new Vector3()
        .copy(batchObject.translation)
        .add(anchorPosDelta);

      /** Apply the transformation */
      batchObject.transformTRS(newPosition, undefined, undefined, undefined);
    }

    // Update our reference position
    this.lastGizmoTranslation.copy(this.dummyAnchor.position);

    // Request render update with necessary flags
    this.viewer.requestRender(UpdateFlags.RENDER_RESET | UpdateFlags.SHADOWS);
  }

  public enableTransformControls(enabled: boolean) {
    if (this.transformControls) {
      if (!enabled) {
        this.transformControls.detach();
      }
      // Toggle visibility of transform controls
      this.transformControls.visible = enabled;
      this.viewer.requestRender();
    }
    if (this.transformControls) {
      console.log(
        "TransformControls visibility:",
        this.transformControls.visible
      );
    }
  }
}

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

// State variables for object movement
const isObjectMovementEnabled = ref(false);
const objectMovementExtension = ref<ExtendedSelection | null>(null);
const currentTransformMode = ref<"translate" | "rotate" | "scale">("translate");

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
    console.log("viewerBackgroundColor prop changed to:", newColor);

    if (!viewerInitialized.value || !viewer.value) {
      console.log("Viewer not initialized yet, will apply color when ready");
      return;
    }

    // Call our updated function
    updateViewerBackgroundColor(newColor);
  },
  { immediate: true } // This will run once on component creation
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

// Add a safe color validator function
const isValidColor = (color: string): boolean => {
  try {
    // Check if the color can be parsed by THREE.js
    new THREE.Color(color);
    return true;
  } catch (e) {
    console.warn(`Invalid color value: ${color}`, e);
    return false;
  }
};

// Modify the updateViewerBackgroundColor function to use the direct container style approach
const updateViewerBackgroundColor = async (color: string) => {
  // Add this DEBUG section at the beginning of the function
  console.log("DEBUG: Viewer structure:", {
    hasScene: !!(viewer.value && (viewer.value as any).scene),
    hasRenderer: !!(
      viewer.value && (viewer.value as any).renderHandler?.renderer
    ),
    viewerKeys: viewer.value ? Object.keys(viewer.value) : [],
    sceneType:
      viewer.value && (viewer.value as any).scene
        ? (viewer.value as any).scene.constructor.name
        : "none",
  });

  console.log(`Applying background color: ${color}`);

  // 1. Try applying color to the container directly (from example)
  if (viewerContainer.value) {
    viewerContainer.value.style.backgroundColor = color;
    console.log("Applied background color to container:", color);
  }

  // 2. If viewer exists, also try to apply color to the scene (when available)
  if (viewer.value) {
    try {
      // Validate color before attempting to use it
      if (!isValidColor(color)) {
        console.warn(`Skipping invalid background color: ${color}`);
        return;
      }

      // Get container using the viewer's method (from example)
      try {
        if (typeof viewer.value.getContainer === "function") {
          const container = viewer.value.getContainer();
          if (container) {
            container.style.backgroundColor = color;
            console.log(
              "Applied background color via viewer's container:",
              color
            );
          }
        }
      } catch (err) {
        console.warn("Error setting container via viewer:", err);
      }

      // Still try the traditional THREE.js way when scene and renderer are available
      const renderHandler = (viewer.value as any).renderHandler;
      const scene = (viewer.value as any).scene;

      if (renderHandler?.renderer && scene) {
        // Create a THREE.js color
        const threeColor = new THREE.Color(color);
        renderHandler.renderer.setClearColor(threeColor, 1.0);
        console.log("Set renderer clear color to:", color);

        scene.background = threeColor.clone();
        console.log("Set scene background to:", color);

        // Force render if we have all required components
        if (await isViewerReady()) {
          setTimeout(() => forceRender(), 10);
          console.log("Forced render after background color update");
        }
      } else {
        console.log(
          "Using container background only, scene/renderer not available"
        );
      }
    } catch (err) {
      console.error("Error in scene/renderer color update:", err);
      // Container style should still be applied
    }
  }
};

// Add helper functions for background color updates and rendering
const isViewerReady = async () => {
  if (!viewer.value) return false;

  // Wait for any pending initialization to complete
  if (!viewerInitialized.value) {
    // If viewer exists but not marked as initialized, wait a bit
    await new Promise((resolve) => setTimeout(resolve, 100));
    if (!viewerInitialized.value) return false;
  }

  // Check if all necessary components are available
  const hasScene = !!(viewer.value && (viewer.value as any).scene);
  const hasRenderer = !!(
    viewer.value && (viewer.value as any).renderHandler?.renderer
  );
  const hasCamera = !!(
    viewer.value && (viewer.value as any).cameraHandler?.activeCam
  );

  return hasScene && hasRenderer && hasCamera;
};

// Make the forceRender function more defensive
const forceRender = () => {
  if (!viewer.value) return;

  // Check if viewer is ready before attempting to render
  if (!isViewerReady()) {
    console.warn("Missing renderer, scene or camera. Cannot force render.");
    return;
  }

  try {
    const renderHandler = (viewer.value as any).renderHandler;
    const scene = (viewer.value as any).scene;
    const camera = (viewer.value as any).cameraHandler?.activeCam;

    renderHandler.renderer.render(scene, camera);
  } catch (err) {
    console.error("Error during force render:", err);
  }
};

// Modify the loadModels function to ensure color is applied right after loading
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

        // Apply container background color immediately
        if (viewerContainer.value) {
          viewerContainer.value.style.backgroundColor =
            props.viewerBackgroundColor;
          console.log(
            "Applied container background during model load:",
            props.viewerBackgroundColor
          );
        }
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

      // Add a delay before initializing the object movement extension
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Make sure object movement extension is initialized after models are loaded
      if (!objectMovementExtension.value) {
        console.log("Initializing object movement extension after model load");
        initObjectMovementExtension();
      }

      // Enable object movement by default
      isObjectMovementEnabled.value = true;
      if (objectMovementExtension.value) {
        objectMovementExtension.value.enableTransformControls(true);
        forceRender();
      }

      // Re-apply background color after loading models - both container and scene
      updateViewerBackgroundColor(props.viewerBackgroundColor);
    }
  } catch (err) {
    console.error("Error in loadModels:", err);
    errorMessage.value = "Failed to load models. Please try again.";
  } finally {
    isLoadingModel.value = false;
    loadingModelIds.value.clear();
  }
};

// Modify the initializeViewer function to add our extended selection
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

    // Configure viewer parameters with explicit background color
    const viewerParams = {
      ...DefaultViewerParams,
      verbose: true,
      showStats: true,
      renderer: {
        antialias: true,
        alpha: false, // Set to false for solid background
      },
    };

    // Set container background color immediately
    if (viewerContainer.value) {
      viewerContainer.value.style.backgroundColor = props.viewerBackgroundColor;
      console.log(
        "Set initial container background:",
        props.viewerBackgroundColor
      );
    }

    // Create and initialize viewer
    console.log(
      "Creating new viewer instance with background color:",
      props.viewerBackgroundColor
    );
    const viewerInstance = new Viewer(viewerContainer.value, viewerParams);
    await viewerInstance.init();
    viewer.value = markRaw(viewerInstance);

    // Set initial background color using our custom function right after init
    console.log("Setting initial background color");
    updateViewerBackgroundColor(props.viewerBackgroundColor);

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

    // Initialize our extended selection extension with object movement capabilities
    initObjectMovementExtension();

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

    // Force initial resize and render
    if (viewerContainer.value) {
      viewer.value.resize();
      forceRender();
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

            // Instead of direct renderer access, use our helper function
            forceRender();

            // Re-apply background color
            updateViewerBackgroundColor(props.viewerBackgroundColor);
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

// Add this function and expose it
const debugViewerStructure = () => {
  if (!viewer.value) {
    console.log("DEBUG: No viewer instance available");
    return;
  }

  console.log("DEBUG: Viewer structure:", {
    viewerKeys: Object.keys(viewer.value),
    hasScene: !!(viewer.value && (viewer.value as any).scene),
    hasRenderer: !!(
      viewer.value && (viewer.value as any).renderHandler?.renderer
    ),
    rendererType:
      viewer.value && (viewer.value as any).renderHandler?.renderer
        ? (viewer.value as any).renderHandler.renderer.constructor.name
        : "none",
    sceneType:
      viewer.value && (viewer.value as any).scene
        ? (viewer.value as any).scene.constructor.name
        : "none",
  });

  // Try to print specific properties
  if ((viewer.value as any).scene) {
    console.log("Scene background:", (viewer.value as any).scene.background);
  }

  if ((viewer.value as any).renderHandler?.renderer) {
    console.log("Renderer:", (viewer.value as any).renderHandler.renderer);
  }
};

// Toggle object movement mode
const toggleObjectMovement = () => {
  isObjectMovementEnabled.value = !isObjectMovementEnabled.value;

  if (!viewer.value || !objectMovementExtension.value) {
    console.warn("Viewer or movement extension not initialized");
    return;
  }

  objectMovementExtension.value.enableTransformControls(
    isObjectMovementEnabled.value
  );
  console.log(
    `Object movement ${isObjectMovementEnabled.value ? "enabled" : "disabled"}`
  );
  console.log(
    `Object movement is now ${
      isObjectMovementEnabled.value ? "enabled" : "disabled"
    }`
  );

  // Force a render update to show/hide the controls
  if (viewer.value) {
    viewer.value.requestRender();
  }
};

// Initialize the ExtendedSelection extension
const initObjectMovementExtension = () => {
  if (!viewer.value) {
    console.warn("Cannot initialize object movement without viewer");
    return null;
  }

  try {
    // Create the base SelectionExtension first if it doesn't exist
    let baseSelection = viewer.value.getExtension(SelectionExtension);
    if (!baseSelection) {
      console.log("Creating base SelectionExtension first");
      baseSelection = viewer.value.createExtension(SelectionExtension);

      // Give it a moment to initialize
      viewer.value.requestRender();
    }

    // Make sure it's there before proceeding
    if (!viewer.value.getExtension(SelectionExtension)) {
      console.error("Failed to create base SelectionExtension");
      return null;
    }

    // Now remove it to replace with our extended version
    if (baseSelection && typeof baseSelection.dispose === "function") {
      baseSelection.dispose();
    }

    // Create and initialize extended selection extension
    console.log("Initializing object movement extension...");
    const extension = viewer.value.createExtension(ExtendedSelection);
    if (!extension) {
      console.error("Failed to create ExtendedSelection extension");
      return null;
    }

    objectMovementExtension.value = extension;

    // Initially set the transform controls to the current state
    setTimeout(() => {
      if (extension) {
        extension.enableTransformControls(isObjectMovementEnabled.value);
        if (isObjectMovementEnabled.value) {
          extension.setMode(currentTransformMode.value);
        }
        // Force a render to make sure everything is visible
        viewer.value?.requestRender();
      }
    }, 500);

    console.log("Object movement extension initialized successfully");
    return extension;
  } catch (err) {
    console.error("Error initializing object movement extension:", err);
    // If there's an error, try to create at least the base selection extension
    try {
      console.log("Falling back to standard SelectionExtension");
      viewer.value.createExtension(SelectionExtension);
    } catch (fallbackErr) {
      console.error("Fallback also failed:", fallbackErr);
    }
    return null;
  }
};

// Add a method to set the transform mode
const setTransformMode = (mode: "translate" | "rotate" | "scale") => {
  currentTransformMode.value = mode;
  if (objectMovementExtension.value) {
    objectMovementExtension.value.setMode(mode);
  }
};

// Add this to your defineExpose
defineExpose({
  initializeViewer,
  loadModels,
  setMapPosition,
  disposeViewer,
  reinitializeViewer,
  updateViewerBackgroundColor,
  debugViewerStructure,
  isViewerReady,
  toggleObjectMovement,
  setTransformMode, // Add this method
  currentTransformMode, // Expose the current mode
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
