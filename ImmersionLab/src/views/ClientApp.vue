<template>
  <div class="client-home">
    <!-- Development Disclaimer -->
    <div
      class="disclaimer mb-6 p-3 bg-yellow-100 border border-yellow-400 text-yellow-800 rounded-md"
    >
      <strong>⚠️ Disclaimer:</strong> This page is currently under development.
      Content and functionality may be incomplete or subject to change.
    </div>

    <h1 class="text-3xl font-bold mb-6">Enter Project Code</h1>
    <input
      v-model="projectNumber"
      type="text"
      placeholder="Enter project code"
      class="input-field"
    />
    <button
      @click="goToProjectViewer"
      :disabled="!projectNumber"
      class="bg-green-600 hover:bg-green-800 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition duration-300"
    >
      View Project
    </button>
    <div v-if="errorMessage" class="text-red-600 mt-4">{{ errorMessage }}</div>

    <!-- Project info display -->
    <div
      v-if="projectData"
      class="project-info mt-6 p-4 bg-gray-50 rounded-lg text-left"
    >
      <h2 class="text-xl font-semibold mb-2">
        {{ projectData.project?.name || "Unnamed Project" }}
      </h2>
      <p class="text-sm text-gray-500">
        Last updated: {{ formatDate(projectData.timestamp) }}
      </p>

      <!-- Display model information -->
      <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Option 1 Models -->
        <div class="border rounded-lg p-3 bg-blue-50">
          <h3 class="font-medium text-lg mb-2 text-blue-700">
            Option 1 Models
          </h3>
          <div
            v-if="
              !projectData.designOptions?.Option1 ||
              projectData.designOptions.Option1.length === 0
            "
            class="text-gray-500 italic"
          >
            No models selected
          </div>
          <ul v-else class="space-y-1">
            <li
              v-for="(model, index) in projectData.designOptions.Option1"
              :key="`opt1-${index}`"
              class="text-sm py-1 px-2 bg-white rounded"
            >
              {{ model.name }}
            </li>
          </ul>
        </div>

        <!-- Option 2 Models -->
        <div class="border rounded-lg p-3 bg-green-50">
          <h3 class="font-medium text-lg mb-2 text-green-700">
            Option 2 Models
          </h3>
          <div
            v-if="
              !projectData.designOptions?.Option2 ||
              projectData.designOptions.Option2.length === 0
            "
            class="text-gray-500 italic"
          >
            No models selected
          </div>
          <ul v-else class="space-y-1">
            <li
              v-for="(model, index) in projectData.designOptions.Option2"
              :key="`opt2-${index}`"
              class="text-sm py-1 px-2 bg-white rounded"
            >
              {{ model.name }}
            </li>
          </ul>
        </div>
      </div>

      <div class="mt-3 text-sm">
        <span class="font-medium">Active Option: </span>
        <span
          :class="{
            'text-orange-600': projectData.activeOption === 'Option1',
            'text-green-600': projectData.activeOption === 'Option2',
            'text-purple-600': projectData.activeOption === 'Both',
          }"
        >
          {{ projectData.activeOption }}
        </span>
      </div>
    </div>

    <ClientDesignSelect
      v-if="projectData"
      :projectData="formatProjectDataForViewer(projectData)"
      :designOptions="getDesignOptions()"
      :selectedDesignOption="selectedDesignOption"
      @option-selected="selectDesignOption"
      class="mt-6"
    />

    <!-- Background color selector -->
    <div v-if="projectData" class="mt-6 p-4 bg-gray-50 rounded-lg">
      <h3 class="text-lg font-semibold mb-2">Background Color</h3>
      <div class="flex items-center space-x-4">
        <input
          type="color"
          v-model="backgroundColor"
          @change="updateBackgroundColor"
          class="h-8 w-16 rounded border border-gray-300 cursor-pointer"
        />
        <button
          @click="resetBackgroundColor"
          class="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300"
        >
          Reset
        </button>
      </div>
    </div>

    <ClientViewer
      v-if="projectData"
      :projectData="formatProjectDataForViewer(projectData)"
      :designOptions="getDesignOptions()"
      :selectedDesignOption="selectedDesignOption"
      :backgroundColor="backgroundColor"
      :speckleModels="speckleModels"
      ref="viewerRef"
      class="mt-6"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from "vue";
import ClientViewer from "@/components/ClientViewer.vue";
import ClientDesignSelect from "@/components/ClientDesignSelect.vue";
import { useImmersionLabStore } from "@/stores/store-IL"; // Import the store
// Fix the Speckle Viewer import
import { Viewer } from "@speckle/viewer";
import { convertSpeckleObjectToThreeJS } from "@/utils/SpeckleModelConverter";

// Define reactive variables
const projectNumber = ref("");
const errorMessage = ref(null);
const projectData = ref(null);
const selectedDesignOption = ref("Option1");
const backgroundColor = ref("#ffffff");
const viewerRef = ref(null);
const speckleModels = ref([]);
const isLoadingModels = ref(false);
const modelLoadingStatus = ref("");

// Access the store
const store = useImmersionLabStore();

// Format date function
const formatDate = (dateString) => {
  try {
    return new Date(dateString).toLocaleString();
  } catch (e) {
    return "Unknown date";
  }
};

// Get design options in the correct format
const getDesignOptions = () => {
  if (!projectData.value) return { Option1: [], Option2: [] };

  // If it's a share code decoded data
  if (projectData.value.designOptions) {
    return projectData.value.designOptions;
  }

  // If it's the older format or other source
  return {
    Option1: projectData.value.option1Models || [],
    Option2: projectData.value.option2Models || [],
  };
};

// Format project data for the viewer component
const formatProjectDataForViewer = (data) => {
  // If it's a share code decoded data, need to restructure it
  if (data.designOptions && data.project) {
    return {
      name: data.project.name,
      id: data.project.id,
      models: {
        items: [
          ...data.designOptions.Option1,
          ...data.designOptions.Option2,
        ].filter(
          (value, index, self) =>
            index === self.findIndex((m) => m.id === value.id)
        ), // Remove duplicates
      },
      designOptions: data.designOptions,
      activeOption: data.activeOption || selectedDesignOption.value,
    };
  }

  // If it's the regular project data format, return as is
  return data;
};

// Define goToProjectViewer function
const goToProjectViewer = async () => {
  const trimmedCode = projectNumber.value.trim();
  if (trimmedCode) {
    // First check if it's a share code (contains a hyphen)
    if (trimmedCode.includes("-")) {
      try {
        // Parse the share code (format: PREFIX-BASE64DATA)
        const parts = trimmedCode.split("-");
        if (parts.length < 2) {
          throw new Error("Invalid share code format");
        }

        // Extract and decode the base64 data part
        const encodedData = parts.slice(1).join("-"); // In case there are multiple hyphens
        const jsonData = atob(encodedData);
        const decodedData = JSON.parse(jsonData);

        console.log("Decoded project data:", decodedData);

        // Set the project data
        projectData.value = decodedData;

        // Also save to store for other components
        store.selectedProject = formatProjectDataForViewer(decodedData);
        store.designOptions = decodedData.designOptions || {
          Option1: [],
          Option2: [],
        };

        // Initialize design option from the decoded data
        if (decodedData.activeOption) {
          selectedDesignOption.value = decodedData.activeOption;
        }

        // Wait for next render cycle before updating the viewer and loading models
        setTimeout(async () => {
          if (viewerRef.value && viewerRef.value.updateDesignOption) {
            viewerRef.value.updateDesignOption(selectedDesignOption.value);
          }

          // Load the models for the selected option
          await loadSpeckleModelsForOption(selectedDesignOption.value);
        }, 100);

        errorMessage.value = null;
        return;
      } catch (error) {
        errorMessage.value = "Invalid share code format";
        console.error("Error decoding share code:", error);
        return;
      }
    }

    // If not a share code, try the original local storage lookup
    const storedData = localStorage.getItem(trimmedCode);
    if (storedData) {
      try {
        console.log("Raw project data from localStorage:", storedData);
        projectData.value = JSON.parse(storedData);
        store.selectedProject = projectData.value; // Save the project data to the store

        // Initialize design option and background color from saved data
        if (projectData.value.selectedDesignOption) {
          selectedDesignOption.value = projectData.value.selectedDesignOption;
        }

        if (projectData.value.backgroundColor) {
          backgroundColor.value = projectData.value.backgroundColor;
        }

        errorMessage.value = null;
      } catch (error) {
        errorMessage.value = "Invalid project data format";
        console.error("Error parsing project data:", error);
      }
    } else {
      errorMessage.value = "Project not found. Please check the project code.";
    }
  }
};

// Update the selected design option
const selectDesignOption = async (option) => {
  console.log("Design option selected:", option);
  selectedDesignOption.value = option;

  // Update the viewer if it has the necessary method
  if (viewerRef.value && viewerRef.value.updateDesignOption) {
    viewerRef.value.updateDesignOption(option);
  }

  // Load models based on the selected option
  await loadSpeckleModelsForOption(option);
};

// Load Speckle models based on selected design option
const loadSpeckleModelsForOption = async (option) => {
  if (!projectData.value || !projectData.value.designOptions) {
    console.error("No project data available");
    return;
  }

  try {
    isLoadingModels.value = true;
    speckleModels.value = [];

    let modelsToLoad = [];

    // Determine which models to load based on the option
    if (option === "Both") {
      modelsToLoad = [
        ...(projectData.value.designOptions.Option1 || []),
        ...(projectData.value.designOptions.Option2 || []),
      ];
    } else {
      modelsToLoad = projectData.value.designOptions[option] || [];
    }

    if (modelsToLoad.length === 0) {
      console.log(`No models to load for option: ${option}`);
      isLoadingModels.value = false;
      return;
    }

    console.log(`Loading ${modelsToLoad.length} models for option: ${option}`);

    // Load each model
    for (const model of modelsToLoad) {
      modelLoadingStatus.value = `Loading model: ${model.name}...`;

      try {
        // Create a container div for the Speckle viewer (not attached to DOM)
        const container = document.createElement("div");

        // Create a new Speckle viewer
        const viewer = new Viewer({
          container,
          showStats: false,
          environmentSrc: "/env-maps/env.jpg",
        });

        // Load the model from Speckle
        // Note: In a real implementation, you would need to authenticate
        const streamId = model.streamId || projectData.value.project?.id;
        if (!streamId) {
          console.warn(`No stream ID for model: ${model.name}`);
          continue;
        }

        await viewer.loadObject(`${streamId}/objects/${model.id}`);

        // Get the object from the viewer
        const speckleObject = viewer.getObject();

        // Convert to Three.js format
        const threeJsModel = convertSpeckleObjectToThreeJS(speckleObject);

        // Add metadata to the model
        threeJsModel.userData = {
          ...model,
          designOption: option,
          originalId: model.id,
        };

        // Add to our models array
        speckleModels.value.push(threeJsModel);

        console.log(`Loaded model: ${model.name}`);

        // Dispose of the Speckle viewer to free memory
        viewer.dispose();
      } catch (modelError) {
        console.error(`Error loading model ${model.name}:`, modelError);
      }
    }

    modelLoadingStatus.value = `Loaded ${speckleModels.value.length} models successfully`;

    // Notify the viewer to update with the new models
    if (viewerRef.value && viewerRef.value.updateSpeckleModels) {
      viewerRef.value.updateSpeckleModels(speckleModels.value);
    }
  } catch (error) {
    console.error("Error loading Speckle models:", error);
    modelLoadingStatus.value = `Error loading models: ${error.message}`;
  } finally {
    isLoadingModels.value = false;
  }
};

// Update background color and apply to viewer
const updateBackgroundColor = () => {
  if (viewerRef.value && viewerRef.value.updateBackgroundColor) {
    viewerRef.value.updateBackgroundColor(backgroundColor.value);
  }
};

// Reset background color to default
const resetBackgroundColor = () => {
  backgroundColor.value = "#ffffff";
  updateBackgroundColor();
};

// Check for project code in URL on mount
onMounted(() => {
  const urlParams = new URLSearchParams(window.location.search);
  const codeFromUrl = urlParams.get("code");
  if (codeFromUrl) {
    projectNumber.value = codeFromUrl;
    goToProjectViewer();
  }
});

// Watch for changes in project data to load models
watch(
  () => projectData.value,
  async (newProjectData) => {
    if (newProjectData) {
      await loadSpeckleModelsForOption(selectedDesignOption.value);
    }
  },
  { immediate: false }
);
</script>

<style scoped>
.client-home {
  text-align: center;
  padding: 40px;
}

.input-field {
  padding: 10px;
  font-size: 16px;
  width: 250px;
  margin-bottom: 20px;
  border-radius: 5px;
  border: 1px solid #ccc;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.project-info {
  border-left: 4px solid #4f46e5;
}
</style>
