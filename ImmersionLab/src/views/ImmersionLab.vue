<template>
  <main
    class="max-w-4xl mx-auto py-10 px-6 sm:px-8 lg:px-10 text-center bg-white shadow-xl rounded-2xl"
  >
    <!-- Page title -->
    <h1 class="text-4xl font-extrabold text-white-800 mb-6">
      Immersion Lab: Choose a Project
    </h1>
    <br />
    <!-- Authenticate button to start the Speckle authentication process -->
    <div class="mt-4">
      <button
        @click="redirectToSpeckleAuthPage"
        class="bg-blue-600 hover:bg-blue-800 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition duration-300"
      >
        Authenticate with Speckle
      </button>
    </div>
    <br />
    <!-- Only show the following section if the user is authenticated -->
    <div v-if="isAuthenticated" class="mt-10 space-y-8">
      <!-- Search bar for filtering projects -->
      <StreamSearchBar v-model="searchQuery" class="w-full" />
      <!-- Show any error messages -->
      <div v-if="errorMessage" class="text-red-600">{{ errorMessage }}</div>
      <!-- Show project grid if there are any filtered projects -->
      <div v-else-if="filteredProjects.length > 0">
        <StreamGrid
          :projects="filteredProjects"
          @project-selected="handleProjectSelected"
        />
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
        <h2 v-if="selectedProject" class="text-2xl font-bold text-white-700">
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
          <h3 class="text-xl font-semibold text-white-600">
            Available Models:
          </h3>
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
          <h3 class="text-xl font-semibold text-white-600">Selected Models:</h3>
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
        <div class="w-200 h-300 flex flex-col space-y-2 mt-6">
          <!-- Speckle Viewer Section -->
          <div class="w-full h-full">
            <h2 class="text-xl font-semibold text-white-800">Viewer</h2>
            <div
              ref="viewerContainer"
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
            <h2 class="text-xl font-semibold text-white-800">Map View</h2>
            <div class="flex-1">
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
  </main>
</template>

<script setup lang="ts">
import { ref, computed, watchEffect, nextTick, markRaw } from "vue";
import StreamGrid from "@/components/StreamGrid.vue";
import StreamSearchBar from "@/components/StreamSearchBar.vue";
import GoogleMap from "@/components/GoogleMap.vue"; // Import the GoogleMap component
import { useStore } from "@/stores/store-IL.ts";
import {
  Viewer,
  DefaultViewerParams,
  SpeckleLoader,
  UrlHelper,
  CameraController,
  SelectionExtension,
} from "@speckle/viewer";
import { useQuery } from "@urql/vue";
import { projectsQuery } from "@/graphql/queries/streams";

const store = useStore();
// Define function to redirect to Speckle authentication page
const redirectToSpeckleAuthPage = () => store.redirectToSpeckleAuthPage();
// Declare necessary reactive variables
const searchQuery = ref("");
const isAuthenticated = computed(() => store.isAuthenticated);
const selectedProject = ref(null);
const errorMessage = ref(null);
const viewerContainer = ref(null);
const viewer = ref(null);
const selectedDesignOption = ref("Option1");
const designOptions = ref({ Option1: [], Option2: [] });
const viewerBackgroundColor = ref<string>("#ffffff"); // Default to white
const { data, error } = useQuery({
  query: projectsQuery,
  requestPolicy: "network-only",
  context: {
    fetchOptions: { headers: { Authorization: `Bearer ${store.authToken}` } },
  },
  pause: !isAuthenticated.value,
});

// Define the reference to GoogleMap component
const googleMap = ref(null);

// Debugging: Check if data is correctly fetched
watchEffect(() => {
  console.log("Fetched Data:", data.value);
});

// Filter projects based on search query
const projects = ref<StreamGridItemProps[]>([]); // Define the projects array

// Fetching the data from the API
watchEffect(() => {
  if (error.value) {
    errorMessage.value = error.value.message;
    return;
  }
  const fetchedProjects = data.value?.activeUser?.projects?.items || [];
  projects.value = fetchedProjects.map((project: any) => ({
    id: project.id,
    name: project.name,
    description: project.description,
    role: project.role,
    models: project.models || { items: [] },
  }));
});

// Now the filteredProjects will work based on the 'projects' array
const filteredProjects = computed(() => {
  // Don't show any projects if the search query is empty
  if (!searchQuery.value) return []; // Return an empty array by default

  // Filter projects based on the search query
  return projects.value.filter((project) =>
    project.name.toLowerCase().includes(searchQuery.value.toLowerCase())
  );
});

// Check if search query is working properly
watchEffect(() => {
  console.log("Search Query:", searchQuery.value);
});

// Function to determine button classes based on selected design option
const getButtonClass = (option) => {
  return [
    "py-2 px-4 rounded-lg font-medium transition",
    selectedDesignOption.value === option
      ? "bg-orange-500 text-white"
      : "bg-gray-200 text-gray-800 hover:bg-gray-300",
  ];
};

// Ensure the models for the selected project are defined
watchEffect(() => {
  if (selectedProject.value && !selectedProject.value.models) {
    selectedProject.value.models = { items: [] }; // Ensure it’s always defined
  }
});

// Select design option
const selectDesignOption = (option) => {
  selectedDesignOption.value = option;
};

// Assign model to a design option
const addModelToDesignOption = (model, option) => {
  console.log(`Model added to ${option}:`, model);
  designOptions.value[option] = [model]; // Override the selected model for the option
  loadModels();
};

// Handle when a project is selected from the project grid
const handleProjectSelected = (project) => {
  console.log("Project selected:", project);
  selectedProject.value = project;
  designOptions.value = { Option1: [], Option2: [] }; // Reset design options when a new project is selected

  // Example: Assume your project contains lat/lng info
  if (project.location) {
    setMapPosition(project.location.lat, project.location.lng);
  }
};

// View selected design option
const viewDesignOption = (option) => {
  selectedDesignOption.value = option;
  loadModels();
};

// Initialize viewer after DOM update
const initViewer = async () => {
  await nextTick();
  if (!viewerContainer.value) return;
  if (viewer.value) viewer.value.dispose();
  viewer.value = markRaw(
    new Viewer(viewerContainer.value, DefaultViewerParams)
  );
  await viewer.value.init();
  viewer.value.createExtension(CameraController);
  viewer.value.createExtension(SelectionExtension);
  loadModels();
};

// Load models for the selected design options
const loadModels = async () => {
  if (!selectedProject.value || !viewer.value) return;
  viewer.value.unloadAll();
  const modelsToLoad =
    selectedDesignOption.value === "Both"
      ? [...designOptions.value.Option1, ...designOptions.value.Option2]
      : designOptions.value[selectedDesignOption.value];

  for (const model of modelsToLoad) {
    try {
      const urls = await UrlHelper.getResourceUrls(
        `https://app.speckle.systems/projects/${selectedProject.value.id}/models/${model.id}`
      );
      for (const url of urls) {
        const loader = new SpeckleLoader(
          viewer.value.getWorldTree(),
          url,
          store.authToken
        );
        await viewer.value.loadObject(loader, true);
      }
    } catch (err) {
      console.error(`Error loading model: ${model.name}`, err);
    }
  }
};

// Set the map view center position
const setMapPosition = (lat, lng) => {
  if (googleMap.value && googleMap.value.map) {
    googleMap.value.map.setCenter(new google.maps.LatLng(lat, lng));
  }
};

// Initialize viewer on page load
watchEffect(() => {
  if (viewerContainer.value) {
    initViewer();
  }
});
</script>

<style scoped>
main {
  background: linear-gradient(135deg, #f0f4f800, #d9e2ec00);
}
</style>
