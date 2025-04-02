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
const selectedProject = ref<{ name: string; models?: { items: any[] } } | null>(
  null
);
const errorMessage = ref<string | null>(null);
const selectedDesignOption = ref("Option1");
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

const googleMap = ref(null);

// Reference to the Speckle Viewer and container
const viewer = ref<IViewer | null>(null);
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

// *** KEY CHANGE: Using the initialization approach from the previous script ***
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

    // Make sure the container has dimensions
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
    };

    // *** KEY CHANGE: Initialize viewer using the approach from the previous script ***
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

// *** KEY CHANGE: Using the loadModels approach from the previous script ***
const loadModels = async () => {
  if (!selectedProject.value || !viewer.value) {
    console.error("Cannot load models: Project or viewer not available");
    return;
  }

  try {
    console.log("Unloading existing objects before loading new ones");
    // Clear existing objects from viewer
    if (typeof viewer.value.unloadAll === "function") {
      viewer.value.unloadAll();
    } else if (typeof viewer.value.clearObjects === "function") {
      viewer.value.clearObjects();
    }

    const modelsToLoad =
      selectedDesignOption.value === "Both"
        ? [...designOptions.value.Option1, ...designOptions.value.Option2]
        : designOptions.value[selectedDesignOption.value];

    console.log(
      `Loading ${modelsToLoad.length} models for option: ${selectedDesignOption.value}`
    );

    for (const model of modelsToLoad) {
      if (!model || !model.id) {
        console.warn("Skipping model due to missing ID:", model);
        continue;
      }

      try {
        const streamId = model.id;
        console.log(`Loading model: ${streamId}`);

        // APPROACH 1: Try using the viewer's built-in loading methods
        try {
          // Most direct approach
          if (typeof viewer.value.load === "function") {
            await viewer.value.load(streamId, { token: store.speckle.token });
            console.log(
              `Model loaded successfully via direct load: ${streamId}`
            );
            continue;
          }

          // Alternative direct approach
          if (typeof viewer.value.loadStream === "function") {
            await viewer.value.loadStream(streamId, {
              token: store.speckle.token,
            });
            console.log(
              `Model loaded successfully via loadStream: ${streamId}`
            );
            continue;
          }
        } catch (directLoadError) {
          console.log("Direct load methods failed:", directLoadError);
        }

        // APPROACH 2: Try using SpeckleLoader
        try {
          if (
            viewer.value.getWorldTree &&
            typeof SpeckleLoader === "function"
          ) {
            const worldTree = viewer.value.getWorldTree();
            if (worldTree) {
              // Create a loader with the necessary parameters
              const loaderParams = {
                serverUrl: "app.speckle.systems",
                streamId: streamId,
                objectId: model.id,
                token: store.speckle.token,
              };

              const loader = new SpeckleLoader(worldTree, loaderParams);

              if (typeof viewer.value.loadObject === "function") {
                await viewer.value.loadObject(loader);
                console.log(
                  `Model loaded successfully via SpeckleLoader: ${streamId}`
                );
                continue;
              }
            }
          }
        } catch (loaderError) {
          console.log("SpeckleLoader approach failed:", loaderError);
        }

        // APPROACH 3: Try URL-based approach
        try {
          // Construct URL manually as fallback
          const url = `https://app.speckle.systems/projects/${streamId}/models/${model.id}`;
          console.log(`Trying to load from URL: ${url}`);

          if (typeof UrlHelper?.getResourceUrls === "function") {
            const urls = await UrlHelper.getResourceUrls(url);

            if (urls && urls.length > 0) {
              for (const resourceUrl of urls) {
                if (typeof viewer.value.loadObjectFromUrl === "function") {
                  await viewer.value.loadObjectFromUrl(resourceUrl, {
                    token: store.speckle.token,
                  });
                  console.log(`Model loaded from URL: ${resourceUrl}`);
                } else if (
                  viewer.value.getWorldTree &&
                  typeof SpeckleLoader === "function"
                ) {
                  const worldTree = viewer.value.getWorldTree();
                  if (worldTree) {
                    const urlLoader = new SpeckleLoader(
                      worldTree,
                      resourceUrl,
                      store.speckle.token
                    );
                    await viewer.value.loadObject(urlLoader);
                    console.log(
                      `Model loaded via URL and SpeckleLoader: ${resourceUrl}`
                    );
                  }
                }
              }
              continue;
            }
          }
        } catch (urlError) {
          console.log("URL-based loading failed:", urlError);
        }

        // APPROACH 4: Last resort - try using ObjectLoader without onProgress
        try {
          console.log("Trying ObjectLoader approach without progress tracking");

          const objectLoader = new ObjectLoader({
            serverUrl: "https://app.speckle.systems",
            token: store.speckle.token || undefined,
            streamId: streamId,
            objectId: model.id, // Default to main branch if only stream ID is provided
            options: {
              enableCaching: true,
              fullyTraverseArrays: false,
              excludeProps: ["displayValue", "displayMesh"],
            },
          });

          console.log("ObjectLoader created, attempting to load...");

          // Don't use onProgress at all, just call load()
          const obj = await objectLoader.load();
          console.log("Object successfully loaded");

          if (
            obj &&
            viewer.value &&
            typeof viewer.value.loadObject === "function"
          ) {
            await viewer.value.loadObject(obj);
            console.log(`Model added to viewer: ${streamId}`);
            continue;
          }
        } catch (objectLoaderError) {
          console.error("ObjectLoader approach failed:", objectLoaderError);
        }

        console.error(`All loading approaches failed for model ${streamId}`);
      } catch (modelError) {
        console.error(`Error processing model ${model.id}:`, modelError);
      }
    }

    // Center camera on all loaded objects
    try {
      if (typeof viewer.value.requestFullCameraRefresh === "function") {
        viewer.value.requestFullCameraRefresh();
      } else if (typeof viewer.value.zoomExtents === "function") {
        viewer.value.zoomExtents();
      } else if (typeof viewer.value.centerAndZoomToAllObjects === "function") {
        viewer.value.centerAndZoomToAllObjects();
      }
    } catch (cameraError) {
      console.warn("Error refreshing camera view:", cameraError);
    }
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

  // Ensure Vue detects the change
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

  selectedDesignOption.value = option;

  // Load the model into the viewer
  await loadModels();
};

watchEffect(() => {
  try {
    if (data.value && data.value.activeUser && data.value.activeUser.projects) {
      const fetchedProjects = data.value.activeUser.projects.items || [];
      projects.value = fetchedProjects.map((project: any) => ({
        ...project,
        name: project.name || "Unnamed Project", // Ensure name is always available
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
  console.log("Available projects to search:", projects.value);
});

watchEffect(() => {
  if (projects.value && projects.value.length > 0) {
    console.log(
      "Project structure sample:",
      JSON.stringify(projects.value[0], null, 2)
    );
  }
});

const filteredProjects = computed(() => {
  console.log("Computing filtered projects...");
  console.log("Search query:", searchQuery.value);
  console.log("All projects:", projects.value.length);

  if (!searchQuery.value || searchQuery.value.trim() === "") {
    return projects.value; // Return all projects if no search query
  }

  const query = searchQuery.value.toLowerCase().trim();

  const filtered = projects.value.filter((project) => {
    // Check project name
    if (project.name && project.name.toLowerCase().includes(query)) {
      return true;
    }

    // Check models if available
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
  selectedDesignOption.value = option;
};

const viewDesignOption = async (option: string) => {
  console.log(`Viewing design option: ${option}`);
  selectedDesignOption.value = option;
  await loadModels(); // Load models for the selected option
};

// Set the map view center position
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
    // Ensure models property is correctly structured
    const models =
      project.models && project.models.items ? project.models : { items: [] };

    selectedProject.value = {
      ...project,
      models: models,
    };

    // Reset design options when a new project is selected
    designOptions.value = { Option1: [], Option2: [] };

    // If the project has location data, set the map position
    if (project.location) {
      setMapPosition(project.location.lat, project.location.lng);
    }

    console.log("Selected project set:", selectedProject.value);
  } catch (err) {
    console.error("Error setting selected project:", err);
    errorMessage.value = "Error selecting project. Please try again.";
  }
};

const debugProjects = () => {
  console.log("============ PROJECT DEBUGGING ============");
  console.log(`Total projects: ${projects.value.length}`);

  if (projects.value.length > 0) {
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
  console.log("Filtered projects count:", filteredProjects.value.length);
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

    // Add a small delay to ensure data is processed
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

  // First check authentication status and fetch projects
  if (isAuthenticated.value && store.speckle.token) {
    console.log("User is already authenticated. Fetching projects...");
    executeProjectQuery();
  }

  // Set up auth change watcher
  watchEffect(() => {
    if (isAuthenticated.value && store.speckle.token) {
      console.log("Authentication state changed. Fetching projects...");
      executeProjectQuery();
    }
  });

  // Initialize viewer when container is available and user is authenticated
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
            // Initialize viewer after authentication
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
    // First clear any models in the viewer to prevent errors
    await disposeViewer();

    // Use the speckle logout method from the store instead of the direct import
    await store.speckle.logout();

    // Clear authentication state in the store (may be redundant if store.speckle.logout() handles this)
    store.isAuthenticated = false;
    store.user = null;

    // Clear application state
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

      // Save the project with selected information
      saveProjectToLocalStorage(projectData);

      projectSaved.value = true;

      // Reset the flag after a few seconds
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
