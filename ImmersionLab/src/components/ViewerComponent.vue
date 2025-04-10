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
        v-if="viewerState.error"
        class="text-red-600 mt-2 bg-white/80 p-1 rounded"
      >
        {{ viewerState.error }}
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

// ExtendedSelection class implementation for object movement
class ExtendedSelection extends SelectionExtension {
  /** Store selected objects */
  public selectionRvs: Record<string, any> = {};
  // Add static ID to properly register the extension
  static get extensionId() {
    return "extended-selection";
  }

  /** This object will receive the TransformControls translation */
  private dummyAnchor: Object3D = new Object3D();
  /** Stock three.js gizmo */
  private transformControls: ExtendedTransformControls | undefined;
  private lastGizmoTranslation: Vector3 = new Vector3();
  // Add a property to store camera controller for disable/enable during dragging
  protected cameraProvider: any = null;
  // Add mode support
  private currentMode: "translate" | "rotate" | "scale" = "translate";

  public init() {
    /** We set the layers to PROPS so that the viewer regular pipeline ignores it */
    this.dummyAnchor.layers.set(ObjectLayers.PROPS);
    this.viewer.getRenderer().scene.add(this.dummyAnchor);

    // Store camera controller reference
    this.cameraProvider = this.viewer.getExtension(CameraController);

    // Initialize the gizmo
    this.initGizmo();
  }

  /** Initialize the transform controls */
  private initGizmo() {
    try {
      // Get the camera from the viewer's renderer
      const camera = this.viewer.getRenderer().renderingCamera;
      if (!camera) {
        console.error("Cannot initialize gizmo: No camera available");
        return;
      }

      // Get essential elements
      const domElement = this.viewer.getRenderer().renderer.domElement;
      const scene = this.viewer.getRenderer().scene;

      // CRITICAL FIX: Create a proper wrapper approach that Three.js will accept
      // Create a simple wrapper that extends Object3D and contains our controls
      class TransformControlsWrapper extends THREE.Object3D {
        controls: TransformControls;

        constructor(camera: THREE.Camera, dom: HTMLElement) {
          super();
          this.controls = new TransformControls(camera, dom);

          // Add the actual controls as a child to this wrapper object
          super.add(this.controls as unknown as THREE.Object3D);
        }

        // Add proper TypeScript class methods (not property assignments)
        attach(target: THREE.Object3D): this {
          this.controls.attach(target);
          return this;
        }

        detach(): this {
          this.controls.detach();
          return this;
        }

        // Override updateMatrixWorld to delegate to controls
        updateMatrixWorld(force?: boolean): void {
          super.updateMatrixWorld(force);
          // Check if the method exists on controls
          // Removed call to updateMatrixWorld as it does not exist on TransformControls
        }

        // Define proper method signatures for TransformControls
        setMode(mode: "translate" | "rotate" | "scale"): void {
          this.controls.setMode(mode as any);
        }

        setSize(size: number): void {
          this.controls.setSize(size);
        }

        getRaycaster(): THREE.Raycaster {
          return (this.controls as any).getRaycaster();
        }

        // Override addEventListener to forward events properly
        addEventListener<T extends keyof THREE.Object3DEventMap>(
          type: T,
          listener: THREE.EventListener<THREE.Object3DEventMap[T], T, this>
        ): void {
          // Forward the event from the inner controls to this wrapper
          this.controls.addEventListener(
            type,
            (event: THREE.Object3DEventMap[T]) => {
              // Forward the event to the wrapper's listeners
              this.dispatchEvent({ ...event, type });
            }
          );
        }

        // Property forwarding with proper TypeScript getter/setter definitions
        get visible(): boolean {
          return this.controls.visible;
        }

        set visible(value: boolean) {
          this.controls.visible = value;
        }

        get enabled(): boolean {
          return (this.controls as any).enabled;
        }

        set enabled(value: boolean) {
          (this.controls as any).enabled = value;
        }

        get object(): THREE.Object3D | undefined {
          return this.controls.object;
        }

        // Override children getter to include control's children
        get children(): THREE.Object3D[] {
          return [...super.children];
        }
      }

      // Create properly wrapped controls that Three.js can accept as an Object3D
      const wrapper = new TransformControlsWrapper(camera, domElement);
      this.transformControls = wrapper as unknown as ExtendedTransformControls;

      // Now we can safely use the wrapper methods
      this.transformControls.setSize(0.75);
      this.transformControls.visible = true;
      this.transformControls.enabled = true;
      this.transformControls.setMode(this.currentMode);

      // Now we can safely add it to the scene as it's a proper Object3D
      scene.add(this.transformControls as unknown as THREE.Object3D);
      console.log("Successfully added wrapped controls to scene");

      // Add event listeners directly to our wrapper
      this.transformControls.addEventListener("change", () => {
        this.viewer.requestRender();
      });

      this.transformControls.addEventListener("dragging-changed", (event) => {
        if (this.cameraProvider) {
          this.cameraProvider.enabled = !event.value;
        }
      });

      this.transformControls.addEventListener(
        "objectChange",
        this.onAnchorChanged.bind(this)
      );

      // Now attach our dummy anchor object
      this.dummyAnchor.position.set(0, 0, 0);
      this.transformControls.attach(this.dummyAnchor);

      // Set layers after attachment
      setTimeout(() => {
        // Setting raycaster and axis helper layers
        if (this.transformControls) {
          // Check if children exists and manually traverse the hierarchy
          if (this.transformControls.children) {
            this.transformControls.children.forEach((child) => {
              // Use Object3D traverse method on each child instead
              if (child && child.traverse) {
                child.traverse((obj) => {
                  obj.layers.set(ObjectLayers.PROPS);
                });
              }
            });
          }

          // Set raycaster layer if the method exists
          if (this.transformControls.getRaycaster) {
            this.transformControls
              .getRaycaster()
              .layers.set(ObjectLayers.PROPS);
          }

          // Force a render to update visibility
          this.viewer.requestRender(UpdateFlags.RENDER_RESET);
        }
      }, 100);

      // Add event listeners for interaction
      this.transformControls.addEventListener("change", () => {
        this.viewer.requestRender();
      });

      this.transformControls.addEventListener("dragging-changed", (event) => {
        if (this.cameraProvider) {
          this.cameraProvider.enabled = !event.value;
        }
      });

      this.transformControls.addEventListener(
        "objectChange",
        this.onAnchorChanged.bind(this)
      );

      console.log("Transform controls initialized successfully");

      // Force a full render to ensure controls are visible
      this.viewer.requestRender(UpdateFlags.RENDER_RESET);
    } catch (error) {
      console.error("Error initializing gizmo:", error);
    }
  }

  /** Update gizmo position based on selection */
  public updateGizmo(attach: boolean) {
    if (!this.transformControls) {
      console.log("No transform controls available");
      return;
    }

    try {
      // If not visible or no transform controls, hide and return
      if (!attach || !isObjectMovementEnabled.value) {
        if (this.transformControls) {
          this.transformControls.detach();
          this.transformControls.visible = false;
        }
        return;
      }

      // Get object IDs of selected objects
      const selectedIds = Object.keys(this.selectionRvs);
      if (selectedIds.length === 0) {
        if (this.transformControls) {
          this.transformControls.detach();
          this.transformControls.visible = false;
        }
        return;
      }

      // Calculate bounding box for all selected objects
      const box = new Box3();
      let hasValidObjects = false;

      for (const id of selectedIds) {
        const batchObject = this.viewer
          .getRenderer()
          ?.getObject(this.selectionRvs[id]);

        if (batchObject) {
          // Try to use the object's own AABB if available
          if (batchObject.aabb) {
            box.union(batchObject.aabb);
            hasValidObjects = true;
          } else {
            // Fall back to calculating from the object if needed
            try {
              const objectBox = new Box3().setFromObject(
                batchObject as unknown as THREE.Object3D
              );
              if (!objectBox.isEmpty()) {
                box.union(objectBox);
                hasValidObjects = true;
              }
            } catch (e) {
              console.warn("Error setting box from object:", e);
            }
          }
        }
      }

      if (!hasValidObjects || box.isEmpty()) {
        if (this.transformControls) {
          this.transformControls.detach();
          this.transformControls.visible = false;
        }
        return;
      }

      // Get center of bounding box
      const center = new Vector3();
      box.getCenter(center);

      // Update dummy anchor position
      this.dummyAnchor.position.copy(center);
      this.lastGizmoTranslation.copy(center);

      // Make sure transform controls are attached and visible
      if (this.transformControls) {
        this.transformControls.attach(this.dummyAnchor);
        this.transformControls.visible = true;
      }

      // Force render update
      this.viewer.requestRender();
    } catch (err) {
      console.warn("Error updating transform gizmo:", err);
    }
  }

  public selectObjects(ids: Array<string>, multiSelect = false) {
    super.selectObjects(ids, multiSelect);
    this.updateGizmo(ids.length > 0);
  }

  /** This is called when objects are clicked */
  protected onObjectClicked(selection: SelectionEvent) {
    /** Do whatever the base extension is doing */
    super.onObjectClicked(selection);

    // Update the gizmo based on selection
    if (
      selection &&
      Array.isArray(selection.multiple) &&
      selection.multiple.length > 0
    ) {
      this.updateGizmo(true);
    } else {
      this.updateGizmo(false);
    }
  }

  // Add a method to set the transform mode
  public setMode(mode: "translate" | "rotate" | "scale") {
    if (this.transformControls) {
      this.currentMode = mode;
      this.transformControls.setMode(mode);
      this.viewer.requestRender();
    }
  }

  /** This is where the transformation gets applied */
  private onAnchorChanged() {
    // Calculate the delta position from the last transformation
    const anchorPos = new Vector3().copy(this.dummyAnchor.position);
    const anchorPosDelta = anchorPos.clone().sub(this.lastGizmoTranslation);

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
      const newPosition = anchorPosDelta.clone().add(batchObject.translation);

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
        this.transformControls.visible = false;
      } else {
        // When enabling, if we have selected objects, show the gizmo again
        const selectedIds = Object.keys(this.selectionRvs);
        if (selectedIds.length > 0) {
          this.updateGizmo(true);
        }
      }
      this.viewer.requestRender();
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
  if (!props.selectedProject || !viewer.value) return;

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
    modelsToLoad.forEach((model) => {
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
      verbose: false, // Reduce console output
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
    viewerInstance.createExtension(ExtendedSelection);

    await viewerInstance.init();
    viewer.value = markRaw(viewerInstance);

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

    // Add essential extension
    viewerInstance.createExtension(CameraController);

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

// Toggle object movement mode
const toggleObjectMovement = () => {
  isObjectMovementEnabled.value = !isObjectMovementEnabled.value;

  if (objectMovementExtension.value) {
    objectMovementExtension.value.enableTransformControls(
      isObjectMovementEnabled.value
    );

    // Force a selection update to refresh gizmo state
    if (isObjectMovementEnabled.value && viewer.value) {
      if (viewer.value && viewer.value.getExtension) {
        const selectionExtension = viewer.value.getExtension(ExtendedSelection);
        const selectedIds = Object.keys(
          objectMovementExtension.value?.selectionRvs || {}
        );
        selectionExtension.selectObjects(selectedIds, true);
      }
    }
  }

  if (viewer.value) {
    viewer.value.requestRender();
  }
};

// Initialize object movement extension with more debugging
const initObjectMovementExtension = () => {
  if (!viewer.value || !viewerState.initialized) return null;

  try {
    console.log("Initializing object movement extension...");

    // First check if the extension already exists
    let extension = viewer.value.getExtension(ExtendedSelection);

    // If not, create it
    if (!extension) {
      extension = viewer.value.createExtension(ExtendedSelection);
    }

    console.log("Extension created:", extension);

    if (extension) {
      objectMovementExtension.value = extension;

      // Ensure transform controls are initialized
      extension.init();

      // Register a direct listener to handle object selection events
      viewer.value.on(ViewerEvent.ObjectClicked, (event) => {
        console.log("Selection event received:", event);
        if (extension && isObjectMovementEnabled.value) {
          // Force update the gizmo after a short delay to ensure proper positioning
          setTimeout(() => {
            extension.enableTransformControls(true);
            extension.updateGizmo(true); // Ensure gizmo is shown
            viewer.value?.requestRender();
          }, 100);
        }
      });

      // Enable by default right away
      extension.enableTransformControls(isObjectMovementEnabled.value);
      extension.setMode(currentTransformMode.value);
      viewer.value.requestRender();
    }

    return extension;
  } catch (err) {
    console.error("Error initializing movement extension:", err);
    return null;
  }
};

// Set transform mode
const setTransformMode = (mode: "translate" | "rotate" | "scale") => {
  currentTransformMode.value = mode;
  if (objectMovementExtension.value) {
    objectMovementExtension.value.setMode(mode);
  }
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
