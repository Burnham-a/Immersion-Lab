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
              class="w-full h-[500px] bg-gray-200 rounded-lg shadow-inner"
              :style="{
                border: '2px solid orange',
                backgroundColor: viewerBackgroundColor,
              }"
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
import {
  ref,
  computed,
  watchEffect,
  onBeforeUnmount,
  onMounted,
  nextTick,
} from "vue";
import { useRoute, useRouter } from "vue-router";
import StreamGrid from "@/components/StreamGrid.vue";
import StreamSearchBar from "@/components/StreamSearchBar.vue";
import GoogleMap from "@/components/GoogleMap.vue";
import { useImmersionLabStore } from "@/stores/store-IL"; // Updated import
import {
  Viewer,
  DefaultViewerParams,
  SpeckleLoader,
  CameraController,
  SelectionExtension,
  UrlHelper,
} from "@speckle/viewer";
import { useQuery } from "@urql/vue";
import { projectsQuery } from "@/graphql/queries/streams";
import * as THREE from "three";
import { saveProjectToLocalStorage } from "@/utils/projectUtils";
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
const viewer = ref<Viewer | null>(null);
const selectedDesignOption = ref("Option1");
const designOptions = ref<{
  Option1: { name: string }[];
  Option2: { name: string }[];
}>({
  Option1: [],
  Option2: [],
});
const viewerBackgroundColor = ref<string>("#ffffff"); // Default to white
const viewerInitialized = ref(false);

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

const resumeQueryAfterAuth = () => {
  if (isAuthenticated.value) {
    executeQuery(); // Use the correct method to execute the query
  }
};

const projectNumber = ref("");
const copied = ref(false);
const projectSaved = ref(false);

const googleMap = ref(null);

onBeforeUnmount(() => {
  disposeViewer();
});

const disposeViewer = async () => {
  try {
    if (viewer.value) {
      console.log("Disposing viewer instance...");

      // Safely dispose the viewer
      if (typeof viewer.value.dispose === "function") {
        await viewer.value.dispose();
      }

      viewer.value = null;
      viewerInitialized.value = false;
      console.log("Viewer disposed successfully.");
    }
  } catch (err) {
    console.error("Error disposing viewer:", err);
  }
};

const generateRandomProjectNumber = () => {
  const prefix = "IL";
  const year = new Date().getFullYear().toString().slice(-2);
  const month = (new Date().getMonth() + 1).toString().padStart(2, "0");
  const randomNum = Math.floor(1000 + Math.random() * 9000); // 4-digit random number

  projectNumber.value = `${prefix}-${year}${month}-${randomNum}`;
};

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
const addModelToDesignOption = async (model: any, option: string) => {
  if (option === "Option1") {
    designOptions.value.Option1 = [model];
  } else if (option === "Option2") {
    designOptions.value.Option2 = [model];
  }

  // Load the model into the viewer
  if (viewer.value && model.id) {
    try {
      console.log(`Loading model ${model.name} into the viewer for ${option}`);
      await viewer.value.loadObject(model.id);
      console.log(`Model ${model.name} loaded successfully.`);
    } catch (err) {
      console.error(`Failed to load model ${model.name}:`, err);
    }
  } else {
    console.warn("Viewer is not initialized or model ID is missing.");
  }
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
    return projects.value;
  }

  const query = searchQuery.value.toLowerCase().trim();

  const filtered = projects.value.filter((project) => {
    // Check project name first
    if (project.name && project.name.toLowerCase().includes(query)) {
      return true;
    }

    // Then check models if available
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

const viewDesignOption = (option: string) => {
  console.log(`Viewing design option: ${option}`);
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

  // Wait before initializing the viewer
  setTimeout(() => {
    initializeViewer();
  }, 800);

  // Set up auth change watcher
  watchEffect(() => {
    if (isAuthenticated.value && store.speckle.token) {
      console.log("Authentication state changed. Fetching projects...");
      executeProjectQuery();
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

const handleLogout = () => {
  console.log("Logging out user");
  try {
    store.speckle.logout();
    console.log("Logout successful");
    selectedProject.value = null;
    projects.value = [];
  } catch (err) {
    console.error("Logout error:", err);
  }
};

const initializeViewer = async () => {
  // Clear any error messages
  errorMessage.value = null;

  try {
    // Wait for DOM to be ready
    await nextTick();

    // Get container element
    const containerElement = document.getElementById("viewer-container");

    console.log("Viewer container element:", containerElement);

    if (!containerElement) {
      errorMessage.value =
        "Viewer container not found. Please refresh the page.";
      return;
    }

    // Clean up existing viewer
    if (viewerInitialized.value && viewer.value) {
      await disposeViewer();
    }

    // Create the viewer with proper configuration object
    viewer.value = new Viewer({
      container: containerElement,
      showStats: false,
      environmentSettings: {
        enable: false,
      },
    });

    // Configure viewer after creation
    if (viewer.value && viewer.value.renderer) {
      viewer.value.renderer.setClearColor(
        new THREE.Color(viewerBackgroundColor.value)
      );
    }

    // Add extensions after a short delay
    setTimeout(() => {
      if (viewer.value) {
        try {
          new CameraController(viewer.value);
          new SelectionExtension(
            viewer.value,
            new CameraController(viewer.value)
          );
          console.log("Viewer extensions added successfully");
        } catch (extErr) {
          console.error("Error adding viewer extensions:", extErr);
        }
      }
    }, 500);

    viewerInitialized.value = true;
    console.log("Viewer initialized successfully");
  } catch (err) {
    console.error("Error initializing viewer:", err);
    errorMessage.value =
      "Failed to initialize viewer: " +
      (err instanceof Error ? err.message : String(err));
  }
};

// Update watchEffect for background color changes with better error handling
watchEffect(() => {
  if (viewer.value && viewerInitialized.value) {
    try {
      // Update the viewer background color when it changes
      viewer.value.renderer.setClearColor(
        new THREE.Color(viewerBackgroundColor.value)
      );
    } catch (colorErr) {
      console.error("Error updating viewer background color:", colorErr);
      // Don't set errorMessage here to avoid disrupting the UI for a non-critical error
    }
  }
});

const saveProject = () => {
  if (projectNumber.value) {
    try {
      // Save the project with selected information
      saveProjectToLocalStorage({
        projectNumber: projectNumber.value,
        projectName: selectedProject.value?.name || "",
        designOptions: designOptions.value,
        // Add any other project details you want to save
      });

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
