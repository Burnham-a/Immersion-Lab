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
        <!-- Enhanced loading indicator with spinner -->
        <div
          v-if="viewerState.loading"
          class="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50"
        >
          <div
            class="bg-white p-6 rounded-lg shadow-xl flex flex-col items-center"
          >
            <div class="spinner mb-4"></div>
            <div class="text-gray-800 font-medium">
              Loading model{{
                viewerState.loadingModelIds.size > 1 ? "s" : ""
              }}...
            </div>
            <div class="text-sm text-gray-600 mt-1">
              {{ viewerState.loadingModelIds.size }} model(s) in queue
            </div>
          </div>
        </div>

        <!-- Empty fallback element for when canvas isn't rendered properly -->
        <div
          v-if="viewerState.needsReset || !viewerState.initialized"
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

          <!-- Simplify the controls to only show translation mode -->
          <div v-if="isObjectMovementEnabled" class="flex gap-1 mt-1">
            <button class="px-2 py-1 rounded text-xs bg-blue-500 text-white">
              Translate Mode
            </button>
          </div>
        </div>
      </div>
      <div
        v-if="viewerState.error"
        class="text-red-600 mt-2 bg-white/80 p-1 rounded"
      >
        {{ viewerState.error }}
      </div>
    </div>
    <br />
    <!-- Google Map Section - Added margin-top for spacing -->
    <div class="w-full mt-12" style="height: 30vh; min-height: 250px">
      <h2 class="text-xl font-semibold text-gray-800 mb-2">Map View</h2>
      <div class="w-full h-full">
        <!-- Google map component - fix class prop warning -->
        <div class="rounded-lg overflow-hidden shadow">
          <GoogleMap ref="googleMap" />
        </div>
        <br />
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
  reactive,
  onUnmounted,
  onBeforeMount,
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
// Fix the TypeScript error by importing TransformControls with explicit type annotation
import { TransformControls } from "three/examples/jsm/controls/TransformControls.js";

// Define an extended interface for the TransformControls
type ExtendedTransformControls = TransformControls & {
  visible: boolean;
  children: THREE.Object3D[];
  traverse: (callback: (object: THREE.Object3D) => void) => void;
  updateMatrixWorld: (force?: boolean) => void;
  object?: THREE.Object3D;
};

// Create a reactive state object to manage viewer state in one place
const viewerState = reactive({
  initialized: false,
  loading: false,
  needsReset: false,
  error: null as string | null,
  loadingModelIds: new Set<string>(),
});

// Updated ExtendedSelection class to be compatible with Speckle Viewer API
class ExtendedSelection extends SelectionExtension {
  /** Store selected objects */
  public selectionRvs: Record<string, any> = {};

  // Add static ID to properly register the extension
  static get extensionId() {
    return "extended-selection";
  }

  // Update the type reference to avoid the error
  private transformControls: TransformControls | null = null;

  // Store selected objects - use any[] to avoid TypeScript errors with Speckle objects
  private selectedObjects: any[] = [];

  // Track if initialized
  private isInitialized = false;

  // Original positions for undo
  private originalPositions = new Map<THREE.Object3D, THREE.Vector3>();

  // Constructor to accept viewer instance directly
  constructor(viewer: Viewer) {
    // Call the parent constructor correctly - don't try to get CameraController yet
    const cameraController = viewer.getExtension(CameraController);
    if (!cameraController) {
      throw new Error("CameraController is required but not found.");
    }
    super(viewer, cameraController);
  }

  public init() {
    if (this.isInitialized) return;

    try {
      console.log("Initializing ExtendedSelection transform controls...");

      // Make sure CameraController is created first
      const cameraController = this.viewer.getExtension(CameraController);
      if (!cameraController) {
        console.warn("CameraController not found, creating it first");
        this.viewer.createExtension(CameraController);
      }

      // Wait a moment to ensure the viewer is fully initialized
      setTimeout(() => {
        this.initializeTransformControls();
      }, 500);
    } catch (error) {
      console.error("Failed to initialize transform controls:", error);
    }
  }

  private initializeTransformControls() {
    try {
      // Get required components from viewer
      const renderer = this.viewer.getRenderer();
      if (!renderer) {
        console.error("Renderer not available");
        return;
      }

      const camera = renderer.renderingCamera;
      const domElement = renderer.renderer.domElement;

      if (!camera || !domElement) {
        console.error("Camera or DOM element not available");
        return;
      }

      // Create transform controls
      this.transformControls = new TransformControls(camera, domElement);

      // CRITICAL: Set mode to translate only
      this.transformControls.setMode("translate");

      // Set size and appearance
      this.transformControls.setSize(1.2);

      // Fix: Properly add TransformControls to scene
      // TransformControls inherits from Object3D so we shouldn't need a cast
      try {
        renderer.scene.add(this.transformControls as unknown as THREE.Object3D);
        console.log("Transform controls added to scene successfully");
      } catch (err) {
        console.error("Error adding transform controls to scene:", err);
      }

      // Add event listeners
      this.transformControls.addEventListener("change", () => {
        this.viewer.requestRender();
      });

      this.transformControls.addEventListener(
        "dragging-changed",
        (event: any) => {
          // Disable camera controls while dragging
          const cameraController = this.viewer.getExtension(CameraController);
          if (cameraController) {
            cameraController.enabled = !event.value;
          }

          // Store original positions when starting drag
          if (event.value && this.transformControls?.object) {
            const obj = this.transformControls.object;
            if (!this.originalPositions.has(obj)) {
              this.originalPositions.set(obj, obj.position.clone());
            }
          }

          // Apply changes to all selected objects when dragging ends
          if (!event.value && this.transformControls?.object) {
            this.applyTransformation();
          }
        }
      );

      // Fix: Use visible property instead of enabled
      this.transformControls.enabled = false;

      this.isInitialized = true;
      console.log("Transform controls initialized successfully");
    } catch (error) {
      console.error("Error in initializeTransformControls:", error);
    }
  }

  // Apply transformation to all selected objects
  private applyTransformation() {
    if (!this.transformControls?.object) return;

    const controlObject = this.transformControls.object;

    // Object IDs in selection
    const selectedIds = Object.keys(this.selectionRvs);

    for (const id of selectedIds) {
      // Get the actual object from viewer
      const object = this.viewer.getRenderer().getObject(this.selectionRvs[id]);

      if (object) {
        // Apply the new position
        try {
          // Only handle translation for simplicity
          object.transformTRS(
            controlObject.position,
            undefined,
            undefined,
            undefined
          );
        } catch (err) {
          console.warn(`Failed to transform object ${id}:`, err);
        }
      }
    }

    // Request render with necessary flags
    this.viewer.requestRender(UpdateFlags.RENDER_RESET | UpdateFlags.SHADOWS);
  }

  /** This is called when objects are clicked */
  protected onObjectClicked(selection: SelectionEvent) {
    console.log("Object clicked:", selection);

    // Don't call the base class implementation to avoid default behavior
    // super.onObjectClicked(selection);

    // Don't clear existing selection
    // this.selectObjects([]);

    // Process the new selection
    if (
      selection &&
      ((Array.isArray(selection.multiple) && selection.multiple.length > 0) ||
        (selection.hits && selection.hits.length > 0))
    ) {
      // Use hits data if available or fall back to multiple
      const objectIds = Array.isArray(selection.multiple)
        ? selection.multiple
        : selection.hits?.map((hit) => hit.node.id) || [];

      // Filter out undefined IDs
      const validIds = objectIds.filter((id) => id !== undefined) as string[];

      if (validIds.length > 0) {
        super.selectObjects(validIds);
        this.updateGizmo(true, validIds);
      }
    }
    // Don't hide the gizmo if no selection
    // else {
    //   this.hideGizmo();
    // }
  }

  // Update the gizmo position and attach to object
  public updateGizmo(show: boolean, objectIds: string[] = []) {
    if (!this.transformControls || !this.isInitialized) return;

    // If we should hide the gizmo
    if (!show || objectIds.length === 0) {
      this.hideGizmo();
      return;
    }

    try {
      console.log(`Updating gizmo for ${objectIds.length} objects`);

      // Get all selected objects
      const objects = [];
      const center = new THREE.Vector3();
      let count = 0;

      for (const id of objectIds) {
        const object = this.viewer
          .getRenderer()
          .getObject(this.selectionRvs[id]);
        if (object) {
          objects.push(object);

          // Add position to calculate average
          if (object.translation) {
            center.add(object.translation);
            count++;
          }
        }
      }

      if (objects.length === 0) {
        console.log("No objects found for gizmo");
        this.hideGizmo();
        return;
      }

      // If we have positions, calculate center
      if (count > 0) {
        center.divideScalar(count);
      }

      // Create a dummy object at the center position
      const dummyObject = new THREE.Object3D();
      dummyObject.position.copy(center);
      dummyObject.userData.isGizmoAnchor = true;

      // Add the dummy to the scene first
      this.viewer.getRenderer().scene.add(dummyObject);

      // Debug logging
      console.log(
        `Created dummy object at position: ${center.x}, ${center.y}, ${center.z}`
      );

      // Show the transform controls
      this.transformControls.attach(dummyObject);

      // Fix: Use both enabled and enabled properties
      this.transformControls.enabled = true;

      // Make sure to re-add the transform controls if needed
      if (!this.transformControls?.object) {
        console.log("Re-adding transform controls to scene");
        this.viewer
          .getRenderer()
          .scene.add(this.transformControls as unknown as THREE.Object3D);
      }

      // Force transform controls to update
      // Removed unnecessary call to updateMatrixWorld

      // Keep a reference to selected objects
      this.selectedObjects = objects;

      console.log(
        `Gizmo attached at position (${center.x}, ${center.y}, ${center.z})`
      );

      // Force a render to show the changes
      this.viewer.requestRender();
    } catch (error) {
      console.error("Error updating gizmo:", error);
      this.hideGizmo();
    }
  }

  // Hide gizmo - fix to use enabled property consistently
  public hideGizmo() {
    if (!this.transformControls) return;

    try {
      console.log("Hiding transform gizmo");
      this.transformControls.enabled = false;
      this.transformControls.detach();
      this.viewer.requestRender();
    } catch (err) {
      console.error("Error hiding gizmo:", err);
    }
  }

  // Enable/disable transform controls
  public enableTransformControls(enabled: boolean) {
    if (!this.transformControls) return;

    if (!enabled) {
      this.hideGizmo();
    } else if (Object.keys(this.selectionRvs).length > 0) {
      this.updateGizmo(true, Object.keys(this.selectionRvs));
    }
  }

  // Override select objects to update gizmo immediately
  public selectObjects(ids: Array<string>, multiSelect = false) {
    super.selectObjects(ids, multiSelect);

    // Always update gizmo when selection changes
    if (ids.length > 0) {
      this.updateGizmo(true, ids);
    } else {
      this.hideGizmo();
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
const debugInfo = ref<string | null>(null);
const canvasCheckTimer = ref<number | null>(null);

// State variables for object movement
const isObjectMovementEnabled = ref(false);
const objectMovementExtension = ref<ExtendedSelection | null>(null);
const currentTransformMode = ref<"translate" | "rotate" | "scale">("translate");

// Centralize all cleanup to prevent memory leaks
const cleanupResources = () => {
  // Clear timers
  if (canvasCheckTimer.value) {
    clearInterval(canvasCheckTimer.value);
    canvasCheckTimer.value = null;
  }

  // Clean up viewer
  disposeViewer();
};

// Set up component lifecycle hooks
onBeforeMount(() => {
  // Reset all state when component is mounted
  viewerState.initialized = false;
  viewerState.loading = false;
  viewerState.needsReset = false;
  viewerState.error = null;
  viewerState.loadingModelIds.clear();
});

onMounted(async () => {
  console.log("ViewerComponent mounted");

  // Wait for DOM to settle
  await new Promise((resolve) => setTimeout(resolve, 200));

  try {
    await initializeViewer();

    // Start checking if canvas is actually visible/rendered
    startCanvasChecks();

    if (props.selectedProject) {
      await loadModels();
    }
  } catch (err) {
    console.error("Error during component mount:", err);
    viewerState.error = "Failed to initialize viewer";
  }
});

// Ensure cleanup on both unmount events
onBeforeUnmount(cleanupResources);
onUnmounted(cleanupResources);

// Function to check if the canvas is properly displayed - simplified
const startCanvasChecks = () => {
  // Clear any existing timer
  if (canvasCheckTimer.value) {
    clearInterval(canvasCheckTimer.value);
  }

  // Set up interval to check if canvas is properly rendered
  canvasCheckTimer.value = setInterval(() => {
    if (!viewerContainer.value) return;

    // Skip checks if component is being unmounted
    if (!viewerContainer.value.isConnected) {
      clearInterval(canvasCheckTimer.value as number);
      return;
    }

    const canvas = viewerContainer.value.querySelector("canvas");
    if (!canvas) {
      debugInfo.value = "Canvas not found";
      viewerState.needsReset = true;
      return;
    }

    // Check if canvas has proper dimensions and is visible
    const canvasStyle = window.getComputedStyle(canvas);
    debugInfo.value = `${canvas.width}x${canvas.height}`;

    if (canvas.width === 0 || canvas.height === 0) {
      viewerState.needsReset = true;
      return;
    }

    // Check if viewer is initialized but not showing content
    if (
      viewerState.initialized &&
      viewerState.needsReset &&
      !viewerState.loading
    ) {
      console.log("Canvas needs reset - attempting to fix");
      reinitializeViewer();
    }
  }, 3000); // Check less frequently
};

// Add a forced re-initialization method - simplified
const reinitializeViewer = async () => {
  try {
    console.log("Forcing viewer re-initialization...");
    viewerState.needsReset = false;

    await disposeViewer();
    await nextTick();

    // Ensure container is ready
    await new Promise((resolve) => setTimeout(resolve, 300));

    await initializeViewer();

    if (props.selectedProject) {
      await loadModels();
    }
  } catch (err) {
    console.error("Error during viewer reinitialization:", err);
    viewerState.error = "Failed to reinitialize viewer";
  }
};

// Safely dispose the viewer to prevent memory leaks
const disposeViewer = async () => {
  try {
    if (viewer.value) {
      // Clean up resize observer if it exists
      if ((viewer.value as any).userData?.resizeObserver) {
        (viewer.value as any).userData.resizeObserver.disconnect();
      }

      await viewer.value.dispose();
      viewer.value = null;
      viewerState.initialized = false;
      objectMovementExtension.value = null;
    }
  } catch (err) {
    console.error("Error disposing viewer:", err);
  }
};

// Watch for changes in the background color and update the viewer
watch(
  () => props.viewerBackgroundColor,
  (newColor) => {
    if (viewerContainer.value) {
      viewerContainer.value.style.backgroundColor = newColor;
    }

    if (viewerState.initialized && viewer.value) {
      updateViewerBackgroundColor(newColor);
    }
  }
);

// Watch for changes in the selected design option to update the viewer
watch(
  [() => props.selectedDesignOption, () => props.designOptions],
  async () => {
    if (props.selectedProject && viewerState.initialized) {
      await loadModels();
    }
  },
  { deep: true }
);

// Add a safe color validator function
const isValidColor = (color: string): boolean => {
  try {
    new THREE.Color(color);
    return true;
  } catch (e) {
    console.warn(`Invalid color value: ${color}`);
    return false;
  }
};

// Simplified background color update function
const updateViewerBackgroundColor = (color: string) => {
  if (!viewer.value || !isValidColor(color)) return;

  try {
    // Try to apply the color to the renderer
    const renderer = viewer.value.getRenderer?.();
    if (renderer?.renderer) {
      const threeColor = new THREE.Color(color);
      renderer.renderer.setClearColor(threeColor, 1.0);

      // Try to set scene background if available
      if ((viewer.value as any).scene) {
        (viewer.value as any).scene.background = threeColor.clone();
      }

      // Force a render
      viewer.value.requestRender();
    }
  } catch (err) {
    console.warn("Error updating background color:", err);
  }
};

// Simplified model loading function
const loadModels = async () => {
  if (!props.selectedProject || !viewer.value) {
    console.warn(
      "Cannot load models: No project selected or viewer not initialized"
    );
    return;
  }

  try {
    // Set loading state
    viewerState.loading = true;
    viewerState.error = null;

    // Clear current scene
    await viewer.value.unloadAll();

    // Apply background color immediately
    if (viewerContainer.value) {
      viewerContainer.value.style.backgroundColor = props.viewerBackgroundColor;
    }

    // Get the models for the selected design option
    const optionName = props.selectedDesignOption;
    const modelsToLoad =
      optionName === "Both"
        ? [...props.designOptions.Option1, ...props.designOptions.Option2]
        : props.designOptions[optionName as keyof typeof props.designOptions] ||
          [];

    if (modelsToLoad.length === 0) {
      viewerState.error = "No models selected for this option";
      return;
    }

    const token = store.speckle?.token || "";
    const serverUrl = "https://app.speckle.systems";
    let successCount = 0;

    // Track already processed models to avoid duplicates
    const processedModelIds = new Set<string>();

    // Update loading state with total count
    viewerState.loadingModelIds.clear();
    modelsToLoad.forEach((model: { id?: string }) => {
      if (model?.id) viewerState.loadingModelIds.add(model.id);
    });

    // Process models sequentially instead of all at once
    for (const model of modelsToLoad) {
      if (!model?.id || processedModelIds.has(model.id)) continue;

      processedModelIds.add(model.id);
      const modelId = model.id;
      const projectId = props.selectedProject.id;

      try {
        // Try using direct object URL first for simplicity
        const directObjectUrl = `${serverUrl}/streams/${projectId}/objects/${modelId}`;

        // Create loader
        const loader = new SpeckleLoader(
          viewer.value.getWorldTree(),
          directObjectUrl,
          token
        );

        // Load the object with a timeout
        await Promise.race([
          viewer.value.loadObject(loader, true),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Loading timeout")), 30000)
          ),
        ]);

        viewerState.loadingModelIds.delete(modelId);
        successCount++;
      } catch (err) {
        console.warn(`Failed to load model ${modelId}:`, err);

        // Try alternative loading with UrlHelper as fallback
        try {
          const modelUrl = `${serverUrl}/projects/${projectId}/models/${modelId}`;
          const urls = await UrlHelper.getResourceUrls(modelUrl);

          if (urls && urls.length > 0) {
            const loader = new SpeckleLoader(
              viewer.value.getWorldTree(),
              urls[0],
              token
            );

            await Promise.race([
              viewer.value.loadObject(loader, true),
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Loading timeout")), 30000)
              ),
            ]);

            viewerState.loadingModelIds.delete(modelId);
            successCount++;
          }
        } catch (fallbackErr) {
          console.error(`Fallback loading failed for ${modelId}:`, fallbackErr);
          // Remove from loading queue even if it failed
          viewerState.loadingModelIds.delete(modelId);
        }
      }
    }

    if (successCount === 0) {
      viewerState.error =
        "Failed to load any models. Please check your selection.";
      return;
    }

    // Configure the scene after loading
    await fitCameraToScene();
    addGridHelper();

    // Initialize object movement right after loading
    console.log("Models loaded, initializing object movement...");
    const ext = initObjectMovementExtension();

    // Always enable object movement by default
    isObjectMovementEnabled.value = true;

    // Force a render to make sure everything is displayed properly
    if (viewer.value) {
      viewer.value.requestRender();
    }

    // Reapply background color
    updateViewerBackgroundColor(props.viewerBackgroundColor);
  } catch (err) {
    console.error("Error in loadModels:", err);
    viewerState.error = "Failed to load models. Please try again.";
  } finally {
    viewerState.loading = false;
    viewerState.loadingModelIds.clear();
  }
};

// Initialize the viewer with simplified approach
const initializeViewer = async () => {
  if (!viewerContainer.value) {
    console.warn("Viewer container not available");
    return null;
  }

  try {
    console.log("Initializing viewer...");
    viewerState.error = null;

    // Clear container of any leftover elements
    while (viewerContainer.value.firstChild) {
      viewerContainer.value.removeChild(viewerContainer.value.firstChild);
    }

    // Configure viewer parameters
    const viewerParams = {
      ...DefaultViewerParams,
      verbose: true, // Enable verbose for debugging
      showStats: false, // Hide stats for better performance
      renderer: {
        antialias: true,
        alpha: false,
      },
    };

    // Set container background color immediately
    viewerContainer.value.style.backgroundColor = props.viewerBackgroundColor;

    // Create and initialize viewer
    const viewerInstance = new Viewer(viewerContainer.value, viewerParams);

    // First initialize the viewer
    await viewerInstance.init();
    viewer.value = markRaw(viewerInstance);

    // Create essential base extensions first
    const cameraController = viewerInstance.createExtension(CameraController);
    console.log("Created CameraController:", cameraController);

    // Then create the regular selection extension
    const selectionExt = viewerInstance.createExtension(SelectionExtension);
    console.log("Created SelectionExtension:", selectionExt);

    // Initialize our custom extension
    console.log("Creating ExtendedSelection extension");
    try {
      // Try a more direct approach for creating the extension
      const extendedSelectionInstance = new ExtendedSelection(viewerInstance);

      // Register our extension manually
      viewerInstance.createExtension(ExtendedSelection);

      objectMovementExtension.value = extendedSelectionInstance;
      extendedSelectionInstance.init();

      console.log("Successfully created and initialized ExtendedSelection");
    } catch (error) {
      console.error("Failed to create ExtendedSelection:", error);
      viewerState.error = "Failed to initialize object movement controls";
    }

    // Ensure canvas has correct style
    const canvas = viewerContainer.value.querySelector("canvas");
    if (canvas) {
      canvas.style.position = "absolute";
      canvas.style.top = "0";
      canvas.style.left = "0";
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      canvas.style.zIndex = "2";
      canvas.style.display = "block";
      debugInfo.value = `Created: ${canvas.width}x${canvas.height}`;
    }

    // Add resize observer
    const resizeObserver = new ResizeObserver(() => {
      if (viewer.value && viewerContainer.value) {
        try {
          viewer.value.resize();
          viewer.value.requestRender();
        } catch (e) {
          console.warn("Error during resize:", e);
        }
      }
    });

    resizeObserver.observe(viewerContainer.value);
    (viewer.value as any).userData = { resizeObserver };

    viewerState.initialized = true;
    viewerState.needsReset = false;

    // Apply color and force resize
    updateViewerBackgroundColor(props.viewerBackgroundColor);
    viewerInstance.resize();
    viewerInstance.requestRender();

    // Enable object movement by default (only if extension was created successfully)
    if (objectMovementExtension.value) {
      isObjectMovementEnabled.value = true;
    }

    return viewer.value;
  } catch (error) {
    console.error("Error initializing Speckle Viewer:", error);
    viewerState.error = "Failed to initialize viewer";
    viewerState.initialized = false;
    return null;
  }
};

// Simplified camera fit function
const fitCameraToScene = async () => {
  if (!viewer.value) return;

  try {
    const cameraController = viewer.value.getExtension(CameraController);
    if (cameraController) {
      (cameraController as any).zoomExtents();
    }

    // Add a delayed second attempt for better positioning
    setTimeout(() => {
      if (viewer.value) {
        const cameraController = viewer.value.getExtension(CameraController);
        if (cameraController) {
          (cameraController as any).zoomExtents();
          viewer.value.requestRender();
        }
      }
    }, 1000);
  } catch (e) {
    console.warn("Error during camera fit:", e);
  }
};

// Add grid helper for orientation
const addGridHelper = () => {
  if (!viewer.value) return;

  try {
    const scene = (viewer.value as any).scene;
    if (!scene) return;

    const existingGrid = scene.children.find(
      (child: THREE.Object3D) => child.name === "gridHelper"
    );
    if (existingGrid) scene.remove(existingGrid);

    const gridHelper = new THREE.GridHelper(100, 100, 0x888888, 0xcccccc);
    gridHelper.name = "gridHelper";
    gridHelper.position.y = -0.01;
    scene.add(gridHelper);
  } catch (e) {
    console.warn("Failed to add grid helper:", e);
  }
};

// Set map position
const setMapPosition = (lat: number, lng: number) => {
  if (googleMap.value?.map) {
    try {
      googleMap.value.map.setCenter({ lat, lng });
    } catch (error) {
      console.error("Error setting map position:", error);
    }
  }
};

// Toggle object movement mode - simplify to only enable/disable
const toggleObjectMovement = () => {
  isObjectMovementEnabled.value = !isObjectMovementEnabled.value;

  console.log("Object movement toggled:", isObjectMovementEnabled.value);

  if (objectMovementExtension.value) {
    objectMovementExtension.value.enableTransformControls(
      isObjectMovementEnabled.value
    );
  }

  if (viewer.value) {
    viewer.value.requestRender();
  }
};

// Initialize object movement extension - simplified version
const initObjectMovementExtension = () => {
  if (!viewer.value || !viewerState.initialized) return null;

  try {
    console.log("Initializing object movement extension...");

    // Get the extension we created earlier
    let extension = viewer.value.getExtension(ExtendedSelection);

    if (!extension) {
      console.log("Creating new ExtendedSelection extension");
      extension = viewer.value.createExtension(ExtendedSelection);
    }

    if (extension) {
      console.log("Extension found, initializing");
      objectMovementExtension.value = extension;
      extension.init();

      // Register a direct listener for debugging
      viewer.value.on(ViewerEvent.ObjectClicked, (event) => {
        console.log("Object clicked event:", event);
      });

      // Enable by default
      extension.enableTransformControls(true);

      // Force a render
      viewer.value.requestRender();
    } else {
      console.warn("Failed to initialize or find extension");
    }

    return extension;
  } catch (err) {
    console.error("Error initializing movement extension:", err);
    return null;
  }
};

// Remove transform mode functions since we're focusing only on translation
const setTransformMode = () => {
  // Do nothing - we only support translate mode
};

// Export public methods
defineExpose({
  initializeViewer,
  loadModels,
  setMapPosition,
  disposeViewer,
  reinitializeViewer,
  updateViewerBackgroundColor,
  toggleObjectMovement,
  setTransformMode,
  currentTransformMode,
});
</script>

<style scoped>
#viewer-container {
  isolation: isolate;
  position: relative;
  min-height: 400px;
  display: block;
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

/* Add spinner animation */
.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-left-color: #1a73e8;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
