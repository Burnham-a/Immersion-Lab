<template>
  <main
    class="max-w-4xl mx-auto py-10 px-6 sm:px-8 lg:px-10 text-center bg-white shadow-xl rounded-2xl"
  >
    <!-- Page title -->
    <h1 class="text-4xl font-extrabold text-gray-800 mb-6">
      Immersion Lab: Choose a Project
    </h1>
    <br />
    <!-- Authenticate button to start the Speckle authentication process -->
    <div class="mt-4">
      <button
        @click="handleAuthClick"
        class="bg-blue-600 hover:bg-blue-800 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition duration-300"
      >
        Authenticate with Speckle
      </button>
    </div>
    <br />
    <!-- Only show the following section if the user is authenticated -->
    <div v-if="isAuthenticated" class="mt-10 space-y-8">
      <div
        v-if="user"
        class="flex items-center justify-between p-4 bg-gray-100 rounded-lg"
      >
        <div class="flex items-center gap-4">
          <img
            :src="user.avatar"
            alt="avatar"
            width="50"
            height="50"
            class="rounded-full"
          />
          <div class="text-left">
            <div class="font-semibold">{{ user.name }}</div>
          </div>
        </div>
        <button
          @click="handleLogout"
          class="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-300"
        >
          Logout
        </button>
      </div>
      <!-- Search bar for filtering projects -->
      <div>
        <StreamSearchBar v-model="searchQuery" class="w-full" />
        <p class="text-sm text-gray-500 mt-1">
          Enter search text or leave empty to see all projects
        </p>
        <p class="text-xs text-gray-400">
          Total projects: {{ projects.length }} | Filtered projects:
          {{ filteredProjects.length }}
        </p>
      </div>
      <!-- Show any error messages -->
      <div v-if="errorMessage" class="text-red-600">{{ errorMessage }}</div>
      <!-- Show project grid if there are any projects -->
      <div v-else>
        <div v-if="isLoadingProjects" class="text-gray-600 my-4">
          Loading projects...
        </div>
        <p v-else-if="projects.length === 0" class="text-gray-600">
          No projects available. Please check your Speckle account.
        </p>
        <div v-else-if="filteredProjects.length > 0" class="my-4">
          <StreamGrid
            :projects="filteredProjects"
            @project-selected="handleProjectSelected"
          />
        </div>
        <div v-else class="text-gray-600">
          No projects match your search criteria
        </div>
      </div>
      <br />
      <!-- Design options selection buttons -->
      <div class="flex justify-center space-x-4 mt-6">
        <button
          @click="selectDesignOption('Option1')"
          :class="getButtonClass('Option1')"
        >
          Select Design Option 1
        </button>
        <button
          @click="selectDesignOption('Option2')"
          :class="getButtonClass('Option2')"
        >
          Select Design Option 2
        </button>
      </div>
      <br />
      <!-- Display details of the selected project -->
      <div class="space-y-6">
        <h2 v-if="selectedProject" class="text-2xl font-bold text-gray-700">
          Viewing Project: {{ selectedProject.name }}
        </h2>
        <!-- Show available models for the selected project -->
        <div
          v-if="
            selectedProject?.models &&
            selectedProject.models.items &&
            selectedProject.models.items.length
          "
        >
          <h3 class="text-xl font-semibold text-gray-600">Available Models:</h3>
          <ul class="space-y-3">
            <li
              v-for="model in selectedProject.models.items"
              :key="model.id"
              class="p-4 bg-gray-100 rounded-lg shadow-md hover:bg-gray-200 transition"
            >
              <div class="flex justify-between items-center">
                <div>
                  <p class="text-gray-800 font-semibold">{{ model.name }}</p>
                  <p class="text-sm text-gray-500">
                    Versions: {{ model.versions.totalCount }}
                  </p>
                </div>
                <!-- Buttons to assign models to either Option1 or Option2 -->
                <button
                  @click="addModelToDesignOption(model, 'Option1')"
                  class="bg-orange-600 hover:bg-orange-800 text-white text-sm font-medium px-4 py-2 rounded-lg shadow-md"
                >
                  Assign to Option 1
                </button>
                <button
                  @click="addModelToDesignOption(model, 'Option2')"
                  class="bg-green-600 hover:bg-green-800 text-white text-sm font-medium px-4 py-2 rounded-lg shadow-md"
                >
                  Assign to Option 2
                </button>
              </div>
            </li>
          </ul>
        </div>
        <!-- Display selected models for both design options -->
        <div v-if="selectedProject">
          <h3 class="text-xl font-semibold text-gray-600">Selected Models:</h3>
          <p v-if="designOptions.Option1.length > 0">
            Design Option 1: {{ selectedProject.name }}_{{
              designOptions.Option1[0].name
            }}
          </p>
          <p v-if="designOptions.Option2.length > 0">
            Design Option 2: {{ selectedProject.name }}_{{
              designOptions.Option2[0].name
            }}
          </p>
        </div>
        <br />
        <!-- Buttons to view the selected design options or both -->
        <div class="flex justify-center space-x-4 mt-6">
          <button
            @click="viewDesignOption('Option1')"
            :class="getButtonClass('Option1')"
          >
            View Design Option 1
          </button>
          <button
            @click="viewDesignOption('Option2')"
            :class="getButtonClass('Option2')"
          >
            View Design Option 2
          </button>
          <button
            @click="viewDesignOption('Both')"
            :class="getButtonClass('Both')"
          >
            View Both
          </button>
        </div>
        <br />
        <!-- Allow user to change the background color of the viewer -->
        <div class="flex justify-center space-x-4 mt-6">
          <label for="backgroundColor" class="font-medium"
            >Viewer Background Colour:</label
          >
          <br />
          <!-- Color picker input for changing viewer background -->
          <input
            v-model="viewerBackgroundColor"
            type="color"
            id="backgroundColor"
            class="border px-4 py-2 rounded-lg"
          />
        </div>
        <div class="w-full h-full flex flex-col space-y-2 mt-6">
          <!-- Speckle Viewer Section -->
          <div class="w-full h-full">
            <h2 class="text-xl font-semibold text-gray-800">Viewer</h2>
            <div
              id="viewer-container"
              ref="viewerContainer"
              class="w-full h-[500px] bg-gray-200 rounded-lg shadow-inner"
            ></div>
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
      </div>
    </div>
    <!-- If not authenticated, display a message prompting the user to authenticate -->
    <div v-else class="mt-6 text-gray-600">
      Please authenticate first to access projects.
    </div>
    <div>
      <h1 class="text-3xl font-bold mb-6">Save Project</h1>

      <!-- Project Number Generator & Copy to Clipboard Feature -->
      <div class="mt-6 flex flex-col items-center">
        <div class="flex items-center gap-4 mb-4">
          <input
            v-model="projectNumber"
            type="text"
            placeholder="Enter a project number"
            class="input-field"
            Pvalue="projectNumber"
          />
          <button
            @click="generateRandomProjectNumber"
            class="bg-purple-600 hover:bg-purple-800 text-white font-semibold py-2 px-4 rounded-lg shadow-md"
          >
            Generate Number
          </button>
          <button
            @click="copyProjectNumberToClipboard"
            class="bg-teal-600 hover:bg-teal-800 text-white font-semibold py-2 px-4 rounded-lg shadow-md flex items-center"
            :class="{ 'bg-green-600': copied }"
          >
            <span v-if="!copied">Copy to Clipboard</span>
            <span v-else>Copied!</span>
          </button>
        </div>
        <br />
        <button
          @click="saveProject"
          :disabled="!projectNumber"
          class="bg-blue-600 hover:bg-blue-800 text-white font-semibold py-3 px-6 rounded-lg shadow-md"
        >
          Save Project
        </button>
      </div>

      <!-- Saved Project Notification -->
      <div
        v-if="projectSaved"
        class="mt-4 p-4 bg-green-100 text-green-800 rounded-lg"
      >
        Project saved successfully with number:
        <strong>{{ projectNumber }}</strong>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
console.log("Initializing ImmersionLabSetup.vue...");

// Verify imports
import {
  ref,
  computed,
  watchEffect,
  onBeforeUnmount,
  onMounted,
  nextTick,
  markRaw,
} from "vue";
import { useRoute, useRouter } from "vue-router";

import StreamGrid from "@/components/StreamGrid.vue";
import StreamSearchBar from "@/components/StreamSearchBar.vue";
import GoogleMap from "@/components/GoogleMap.vue";
import { useImmersionLabStore } from "@/stores/store-IL";
import {
  Viewer,
  DefaultViewerParams,
  CameraController,
  SelectionExtension,
  UrlHelper,
  IViewer,
} from "@speckle/viewer";
import ObjectLoader from "@speckle/objectloader"; // Using ObjectLoader instead of SpeckleLoader
console.log("Speckle Viewer imports loaded successfully.");

// Add version logging to help debug compatibility issues
console.log("Speckle version information:", {
  viewerVersion: "unknown", // Removed invalid reference to Viewer.version
  objectLoaderVersion: "unknown", // Removed invalid reference to ObjectLoader.version
});

import { useQuery } from "@urql/vue";
import { projectsQuery } from "@/graphql/queries/streams";
console.log("GraphQL and URQL imports loaded successfully.");
import * as THREE from "three";
console.log("THREE.js imports loaded successfully.");
import { saveProjectToLocalStorage } from "@/utils/projectUtils";
console.log("Utility imports loaded successfully.");
import { StreamGridItemProps } from "@/types/StreamGridItemProps";

const store = useImmersionLabStore(); // Updated store usage
const route = useRoute();
const router = useRouter();

const user = computed(() => store.user); // Use user from the store
const isLoadingProjects = ref(false);

const isAuthenticated = computed(() => store.isAuthenticated);
const selectedProject = ref<{
  name: string;
  id: string;
  models?: { items: any[] };
} | null>(null);
const errorMessage = ref<string | null>(null);
const selectedDesignOption = ref<"Option1" | "Option2" | "Both">("Option1");
const designOptions = ref<{
  Option1: { name: string; id: string }[];
  Option2: { name: string; id: string }[];
}>({
  Option1: [],
  Option2: [],
});
const viewerBackgroundColor = ref<string>("#ffffff"); // Default to white

const { executeQuery, data, error } = useQuery({
  query: projectsQuery,
  requestPolicy: "network-only",
  context: {
    fetchOptions: {
      headers: { Authorization: `Bearer ${store.speckle.token ?? ""}` }, // Use store.speckle.token
    },
  },
  pause: true, // Pause query by default
});

// Project variables
const projectNumber = ref("");
const copied = ref(false);
const projectSaved = ref(false);

// Ensure TypeScript recognizes the google namespace
/// <reference types="google.maps" />
const googleMap = ref<{ map?: google.maps.Map } | null>(null);

// Reference to the Speckle Viewer and container
const viewer = ref<IViewer | null>(null) as Ref<IViewer | null>;
const viewerContainer = ref<HTMLElement | null>(null);
const viewerInitialized = ref(false);
const isLoadingModel = ref(false);

// Clean up resources when component is destroyed
onBeforeUnmount(() => {
  disposeViewer();
});

// Dispose the viewer to prevent memory leaks and WebGL context issues
const disposeViewer = async () => {
  try {
    if (viewer.value && typeof viewer.value.dispose === "function") {
      console.log("Disposing viewer instance...");
      await viewer.value.dispose();
      viewer.value = null;
      viewerInitialized.value = false;
    }
  } catch (err) {
    console.error("Error disposing viewer:", err);
  }
};

// Generate random project number
const generateRandomProjectNumber = () => {
  const prefix = "IL";
  const year = new Date().getFullYear().toString().slice(-2);
  const month = (new Date().getMonth() + 1).toString().padStart(2, "0");
  const randomNum = Math.floor(1000 + Math.random() * 9000); // 4-digit random number

  projectNumber.value = `${prefix}-${year}${month}-${randomNum}`;
};

// Copy project number to clipboard
const copyProjectNumberToClipboard = () => {
  if (projectNumber.value) {
    navigator.clipboard
      .writeText(projectNumber.value)
      .then(() => {
        copied.value = true;
        setTimeout(() => {
          copied.value = false;
        }, 2000);
      })
      .catch((err) => {
        console.error("Failed to copy: ", err);
      });
  }
};

const projects = ref<StreamGridItemProps[]>([]);
const searchQuery = ref(""); // Define searchQuery as a ref

// Computed property for filtered projects
const filteredProjects = computed(() => {
  console.log("Computing filtered projects...");
  console.log("Search query:", searchQuery.value);
  console.log("All projects:", projects.value?.length || 0);

  if (
    !projects.value ||
    !searchQuery.value ||
    searchQuery.value.trim() === ""
  ) {
    return projects.value || [];
  }

  const query = searchQuery.value.toLowerCase().trim();

  const filtered = projects.value.filter((project) => {
    if (project.name && project.name.toLowerCase().includes(query)) {
      return true;
    }

    if (project.models?.items?.length > 0) {
      return project.models.items.some(
        (model) => model.name && model.name.toLowerCase().includes(query)
      );
    }

    return false;
  });

  console.log("Filtered results:", filtered.length);
  return filtered;
});

const initializeViewer = async () => {
  // Return early if already in the process of initializing or no container exists
  if (!viewerContainer.value || viewerInitialized.value) {
    console.log("Viewer already initialized or container not available");
    return null;
  }

  try {
    // Dispose existing viewer if present
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
      viewerContainer.value.clientWidth === 0 ||
      viewerContainer.value.clientHeight === 0
    ) {
      console.warn("Viewer container has no dimensions. Setting minimum size.");
      viewerContainer.value.style.minHeight = "500px";
      viewerContainer.value.style.minWidth = "100%";
    }

    console.log("Creating new viewer instance...");
    // Create viewer parameters with proper type
    const viewerParams = {
      ...DefaultViewerParams,
      backgroundColor: new THREE.Color(viewerBackgroundColor.value),
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
    viewerInitialized.value = false;
    return null;
  }
};

// Watch for changes in the background color and update the viewer
watchEffect(() => {
  if (viewerInitialized.value && viewer.value) {
    try {
      if (typeof viewer.value.setBackgroundColor === "function") {
        viewer.value.setBackgroundColor(
          new THREE.Color(viewerBackgroundColor.value)
        );
      }
    } catch (error) {
      console.warn("Could not update background color:", error);
    }
  }
});

const loadModelFromSpeckle = async (projectId: string, modelId: string) => {
  try {
    console.log(`Loading model: projectId=${projectId}, modelId=${modelId}`);

    if (!viewer.value) {
      console.error("Viewer not initialized");
      return false;
    }

    console.log(
      `Direct model loading with projectId=${projectId}, modelId=${modelId}`
    );

    // If we have the model ID from your logs: 0f923af5b8 corresponds to object ID 2c194dba8cd0eb96bd8fcf3ba77ba345
    // We can try to map directly if possible
    const knownModelToObjectMap: Record<string, string> = {
      // Add any known mappings here if available
      "0f923af5b8": "2c194dba8cd0eb96bd8fcf3ba77ba345",
    };

    // Use known object ID if available, otherwise try with the model ID directly
    const objectId = knownModelToObjectMap[modelId] || modelId;
    console.log(`Using object ID: ${objectId} for model loading`);

    // APPROACH 1: Try direct object loading using manual object construction
    try {
      console.log("Approach 1: Direct object creation");

      // Create a simple test object that will definitely be visible
      const testObject = {
        id: "test-object",
        speckle_type: "Objects.Geometry.Mesh",
        displayValue: {
          vertices: [
            0, 0, 0, 10, 0, 0, 10, 10, 0, 0, 10, 0, 0, 0, 10, 10, 0, 10, 10, 10,
            10, 0, 10, 10,
          ],
          faces: [
            0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7, 0, 4, 5, 0, 5, 1, 1, 5, 6, 1, 6,
            2, 2, 6, 7, 2, 7, 3, 3, 7, 4, 3, 4, 0,
          ],
          colors: Array(8).fill(0xff0000), // Red color
        },
        // Add any other required properties for your viewer
      };

      if (viewer.value && typeof viewer.value.addObject === "function") {
        try {
          console.log("Adding test object to viewer");
          await viewer.value.addObject(testObject);
          console.log("Test object added to scene successfully");

          // Check if the object is actually in the scene
          if (typeof viewer.value.getObjectsCount === "function") {
            const objectCount = viewer.value.getObjectsCount();
            console.log(
              `Object count after adding test object: ${objectCount}`
            );
          }

          // This test object should be visible if the viewer is working correctly
          return true;
        } catch (testObjError) {
          console.error("Error adding test object:", testObjError);
        }
      }
    } catch (directError) {
      console.error("Direct object creation approach failed:", directError);
    }

    // APPROACH 2: Try with the ObjectLoader but print more details
    try {
      console.log(
        `Approach 2: Creating ObjectLoader with streamId=${projectId}, objectId=${objectId}`
      );

      const objectLoader = new ObjectLoader({
        serverUrl: "https://app.speckle.systems",
        token: store.speckle.token || undefined,
        streamId: projectId,
        objectId: objectId,
        options: {
          enableCaching: true,
          fullyTraverseArrays: true,
        },
      });

      console.log(
        "Object loader created, available methods:",
        Object.getOwnPropertyNames(Object.getPrototypeOf(objectLoader))
      );

      // Try getRootObject with better error handling and logging
      if (typeof objectLoader.getRootObject === "function") {
        console.log("Using objectLoader.getRootObject() method");
        try {
          const obj = await objectLoader.getRootObject();

          // Log details about the received object
          if (obj) {
            console.log("Root object retrieved successfully");
            console.log("Object properties:", Object.keys(obj));
            console.log("Object type:", obj.speckle_type || obj.__type);
            console.log(
              "Has children:",
              Boolean(obj.children) && Array.isArray(obj.children)
            );
            console.log(
              "Children count:",
              Array.isArray(obj.children) ? obj.children.length : 0
            );
            console.log("Has displayValue:", Boolean(obj.displayValue));
            console.log("Has geometry:", Boolean(obj.geometry));
          } else {
            console.log("Root object is null or undefined");
          }

          if (
            obj &&
            viewer.value &&
            typeof viewer.value.addObject === "function"
          ) {
            console.log("Adding root object to viewer...");
            await viewer.value.addObject(obj);
            console.log("Model added via objectLoader.getRootObject() method");

            // Verify object was added
            if (typeof viewer.value.getObjectsCount === "function") {
              const count = viewer.value.getObjectsCount();
              console.log(
                `Objects in scene after adding root object: ${count}`
              );
            }

            return true;
          }
        } catch (rootObjError) {
          console.error("getRootObject error:", rootObjError);
        }
      }
    } catch (objectLoaderError) {
      console.error("ObjectLoader approach failed:", objectLoaderError);
    }

    // APPROACH 3: Try direct URL loading again, but with more specific error handling
    try {
      const directUrl = `https://app.speckle.systems/projects/${projectId}/models/${modelId}`;
      console.log(`Approach 3: Trying to load from direct URL: ${directUrl}`);

      if (viewer.value && typeof viewer.value.loadObject === "function") {
        try {
          const loader = new ObjectLoader({
            serverUrl: "https://app.speckle.systems",
            token: store.speckle.token || undefined,
            streamId: projectId,
            objectId: modelId,
          });

          await viewer.value.loadObject(loadModels, {
            onProgress: (progress: any) => {
              console.log(`Load progress: ${progress.toFixed(2)}%`);
            },
            onError: (error: any) => {
              console.error("Loader error:", error);
            },
          });
          console.log(`Model loaded from direct URL: ${directUrl}`);

          // Verify object was added
          if (typeof viewer.value.getObjectsCount === "function") {
            const count = viewer.value.getObjectsCount();
            console.log(`Objects in scene after URL loading: ${count}`);
          }

          return true;
        } catch (loadError) {
          console.error("loadObjectFromUrl error:", loadError);
        }
      }
    } catch (directUrlError) {
      console.log("Direct URL load failed:", directUrlError);
    }

    console.log("All model loading approaches failed");
    return false;
  } catch (error) {
    console.error("Error in loadModelFromSpeckle:", error);
    return false;
  }
};

const loadModels = async () => {
  if (!selectedProject.value || !viewer.value) {
    console.error("Cannot load models: Project or viewer not available");
    return;
  }

  try {
    console.log("Unloading existing objects before loading new ones");
    // Clear existing objects from viewer
    if (typeof viewer.value.unloadAll === "function") {
      if (viewer.value && typeof viewer.value.unloadAll === "function") {
        viewer.value?.unloadAll();
      }
    } else if (typeof viewer.value.unloadAll === "function") {
      viewer.value.unloadAll();
    }

    const modelsToLoad =
      selectedDesignOption.value === "Both"
        ? [...designOptions.value.Option1, ...designOptions.value.Option2]
        : designOptions.value[
            selectedDesignOption.value as keyof typeof designOptions.value
          ];

    console.log(
      `Loading ${modelsToLoad.length} models for option: ${selectedDesignOption.value}`
    );

    let loadedAnyModel = false;

    for (const model of modelsToLoad) {
      if (!model || !model.id) {
        console.warn("Skipping model due to missing ID:", model);
        continue;
      }

      try {
        const modelId = model.id;
        const projectId = selectedProject.value.id;

        console.log(`Loading model: ${modelId} from project: ${projectId}`);

        // Use our simplified loading function
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

    // Add viewer state debugging
    console.log("Viewer state after loading attempts:", {
      isInitialized: viewerInitialized.value,
      hasViewerInstance: Boolean(viewer.value),
      loadedAnyModel,
      containerDimensions: viewerContainer.value
        ? {
            width: viewerContainer.value.clientWidth,
            height: viewerContainer.value.clientHeight,
            visibility: getComputedStyle(viewerContainer.value).visibility,
            display: getComputedStyle(viewerContainer.value).display,
          }
        : "no-container",
    });

    // Inside loadModels function, replace the camera positioning code

    if (loadedAnyModel) {
      try {
        console.log("Models loaded, positioning camera...");

        // Force a delay to make sure objects are fully processed
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Check that we have objects in the scene
        let objectCount = 0;
        if (
          viewer.value &&
          typeof viewer.value.getObjectsCount === "function"
        ) {
          objectCount = viewer.value.getObjectsCount();
          console.log(
            `Objects in scene before camera positioning: ${objectCount}`
          );
        }

        if (objectCount > 0) {
          // Try camera positioning methods
          if (viewer.value) {
            // Try different camera positioning methods
            if (typeof viewer.value.zoomExtents === "function") {
              await viewer.value.zoomExtents();
              console.log("Camera positioned via zoomExtents");
            } else if (
              typeof viewer.value.centerAndZoomToAllObjects === "function"
            ) {
              await viewer.value.centerAndZoomToAllObjects();
              console.log("Camera positioned via centerAndZoomToAllObjects");
            } else {
              // Try any other method as a last resort
              const viewerAsAny = viewer.value as any;
              if (typeof viewerAsAny.requestFullCameraRefresh === "function") {
                await viewerAsAny.requestFullCameraRefresh();
                console.log("Camera refreshed via requestFullCameraRefresh");
              }
            }

            // Force viewer update if method exists
            if (typeof viewer.value.update === "function") {
              viewer.value.update();
              console.log("Forced viewer update");
            }
          }
        } else {
          console.warn("No objects detected in scene, cannot position camera");
        }
      } catch (cameraErr) {
        console.warn("Error positioning camera:", cameraErr);
      }
    } else {
      console.warn(
        "No models were loaded successfully. Cannot position camera."
      );
    }

    setTimeout(() => {
      try {
        if (
          viewer.value &&
          typeof viewer.value.getObjectsCount === "function"
        ) {
          const count = viewer.value.getObjectsCount();
          console.log(`Objects in scene after loading: ${count}`);

          if (count === 0 && loadedAnyModel) {
            console.warn(
              "Objects were loaded but count is 0. This suggests the viewer may not be displaying the objects correctly."
            );
          }
        } else {
          console.log(
            "Unable to get object count - viewer may not support this method"
          );
        }
      } catch (err) {
        console.error("Error checking scene objects:", err);
      }
    }, 1000);
  } catch (err) {
    console.error("Error in loadModels:", err);
    errorMessage.value = "Failed to load models. Please try again.";
  }
};

const addModelToDesignOption = async (model: any, option: string) => {
  if (!viewerInitialized.value) {
    console.error("Viewer is not initialized. Cannot assign model.");
    return;
  }

  console.log(`Adding model to ${option}:`, model);

  if (option === "Option1") {
    designOptions.value = {
      ...designOptions.value,
      Option1: [model],
    };
  } else if (option === "Option2") {
    designOptions.value = {
      ...designOptions.value,
      Option2: [model],
    };
  }

  selectedDesignOption.value = option as "Option1" | "Option2" | "Both";

  await loadModels();
};

watchEffect(() => {
  try {
    if (data.value && data.value.activeUser && data.value.activeUser.projects) {
      const fetchedProjects = data.value.activeUser.projects.items || [];
      projects.value = fetchedProjects.map((project: any) => ({
        ...project,
        name: project.name || "Unnamed Project",
        description: project.description || "",
        models: project.models || { items: [] },
      }));
      console.log("Projects updated:", projects.value.length);
    }
  } catch (err) {
    console.error("Error processing projects data:", err);
    errorMessage.value = "An error occurred while processing project data.";
  }
});

watchEffect(() => {
  console.log("Search query changed:", searchQuery.value);
  console.log("Available projects to search:", projects.value?.length || 0);
});

watchEffect(() => {
  if (projects.value && projects.value.length > 0) {
    console.log(
      "Project structure sample:",
      JSON.stringify(projects.value[0], null, 2)
    );
  }
});

const getButtonClass = (option: string) => {
  return [
    "py-2 px-4 rounded-lg shadow-md",
    {
      "bg-blue-600 hover:bg-blue-800 text-white":
        selectedDesignOption.value === option,
      "bg-gray-200 hover:bg-gray-400 text-gray-800":
        selectedDesignOption.value !== option,
    },
  ];
};

watchEffect(() => {
  if (selectedProject.value?.models?.items) {
    designOptions.value.Option1 = selectedProject.value.models.items.filter(
      (model: any) => model.option === "Option1"
    );
    designOptions.value.Option2 = selectedProject.value.models.items.filter(
      (model: any) => model.option === "Option2"
    );
  } else {
    designOptions.value.Option1 = [];
    designOptions.value.Option2 = [];
  }
});

const selectDesignOption = (option: string) => {
  selectedDesignOption.value = option as "Option1" | "Option2" | "Both";
};

const viewDesignOption = async (option: string) => {
  console.log(`Viewing design option: ${option}`);
  selectedDesignOption.value = option as "Option1" | "Option2" | "Both";
  await loadModels();
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

const handleProjectSelected = (project: StreamGridItemProps) => {
  console.log("Project selected:", project);

  try {
    const models =
      project.models && project.models.items ? project.models : { items: [] };

    selectedProject.value = {
      ...project,
      models: models,
    };

    designOptions.value = { Option1: [], Option2: [] };

    if ("location" in project && project.location) {
      if (
        project.location &&
        typeof project.location === "object" &&
        "lat" in project.location &&
        "lng" in project.location
      ) {
        if (
          typeof project.location.lat === "number" &&
          typeof project.location.lng === "number"
        ) {
          setMapPosition(project.location.lat, project.location.lng);
        } else {
          console.warn("Invalid location data:", project.location);
        }
      } else {
        console.warn(
          "Project location is missing or invalid:",
          project.location
        );
      }
    }

    console.log("Selected project set:", selectedProject.value);
  } catch (err) {
    console.error("Error setting selected project:", err);
    errorMessage.value = "Error selecting project. Please try again.";
  }
};

const debugProjects = () => {
  console.log("============ PROJECT DEBUGGING ============");
  console.log(`Total projects: ${projects.value?.length || 0}`);

  if (projects.value && projects.value.length > 0) {
    const sampleProject = projects.value[0];
    console.log("Sample project structure:", {
      name: sampleProject.name,
      id: sampleProject.id,
      hasModels: Boolean(sampleProject.models?.items?.length),
      modelCount: sampleProject.models?.items?.length || 0,
    });

    if (sampleProject.models?.items?.length > 0) {
      console.log("Sample model:", sampleProject.models.items[0]);
    }
  }

  console.log("Current search query:", searchQuery.value);
  console.log("Filtered projects count:", filteredProjects.value?.length || 0);
  console.log("=========================================");
};

const executeProjectQuery = async () => {
  try {
    isLoadingProjects.value = true;
    console.log(
      "Executing projects query with token:",
      store.speckle.token?.substring(0, 10) + "..."
    );
    await executeQuery({
      requestPolicy: "network-only",
      context: {
        fetchOptions: {
          headers: { Authorization: `Bearer ${store.speckle.token || ""}` },
        },
      },
    });

    setTimeout(debugProjects, 1000);
  } catch (err) {
    console.error("Error executing project query:", err);
    errorMessage.value = "Failed to fetch projects. Please try again.";
  } finally {
    isLoadingProjects.value = false;
  }
};

onMounted(async () => {
  console.log("Component mounted. Starting initialization sequence.");

  if (isAuthenticated.value && store.speckle.token) {
    console.log("User is already authenticated. Fetching projects...");
    executeProjectQuery();
  }

  watchEffect(() => {
    if (isAuthenticated.value && store.speckle.token) {
      console.log("Authentication state changed. Fetching projects...");
      executeProjectQuery();
    }
  });

  watchEffect(async () => {
    if (
      viewerContainer.value &&
      !viewerInitialized.value &&
      isAuthenticated.value
    ) {
      await initializeViewer();
    }
  });
});

const handleAuthClick = () => {
  if (!isAuthenticated.value) {
    console.log("Starting authentication process");
    const loginResult = store.speckle.login();
    if (loginResult instanceof Promise) {
      loginResult
        .then(() => {
          console.log(
            "Authentication successful, token:",
            store.speckle.token ? "Present" : "Missing"
          );
          if (store.speckle.token) {
            executeProjectQuery();
            nextTick(() => initializeViewer());
          }
        })
        .catch((err) => {
          console.error("Authentication error:", err);
        });
    } else {
      console.error("store.speckle.login() did not return a Promise.");
    }
  } else {
    console.log("User is already authenticated");
  }
};

const handleLogout = async () => {
  console.log("Logging out user...");
  try {
    await disposeViewer();

    await store.speckle.logout();

    store.isAuthenticated = false;
    store.user = null;

    selectedProject.value = null;
    projects.value = [];
    designOptions.value = { Option1: [], Option2: [] };
    projectNumber.value = "";
    projectSaved.value = false;

    console.log("Logout successful");
  } catch (err) {
    console.error("Logout error:", err);
    errorMessage.value = "Failed to log out. Please try again.";
  }
};

const saveProject = () => {
  if (projectNumber.value) {
    try {
      const projectData = {
        projectNumber: projectNumber.value,
        projectName: selectedProject.value?.name || "",
        designOptions: designOptions.value,
        selectedProject: selectedProject.value,
        projectData: { models: selectedProject.value?.models || [] },
      };

      saveProjectToLocalStorage(JSON.stringify(projectData), "projectKey"); // Replace 'projectKey' with the appropriate key if needed

      projectSaved.value = true;

      setTimeout(() => {
        projectSaved.value = false;
      }, 5000);
    } catch (error) {
      console.error("Error saving project:", error);
      errorMessage.value = "Failed to save project. Please try again.";
    }
  }
};
</script>

<style scoped>
main {
  background: linear-gradient(135deg, #f0f4f800, #d9e2ec00);
}

.input-field {
  padding: 10px;
  font-size: 16px;
  width: 250px;
  margin-right: 10px;
  border-radius: 5px;
  border: 1px solid #ccc;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
