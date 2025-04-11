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
      :projectData="projectData"
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
      :projectData="projectData"
      :selectedDesignOption="selectedDesignOption"
      :backgroundColor="backgroundColor"
      ref="viewerRef"
      class="mt-6"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import ClientViewer from "@/components/ClientViewer.vue";
import ClientDesignSelect from "@/components/ClientDesignSelect.vue";
import { useImmersionLabStore } from "@/stores/store-IL"; // Import the store

// Define reactive variables
const projectNumber = ref("");
const errorMessage = ref(null);
const projectData = ref(null);
const selectedDesignOption = ref("Option1");
const backgroundColor = ref("#ffffff");
const viewerRef = ref(null);

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

        // Initialize design option from the decoded data
        if (decodedData.activeOption) {
          selectedDesignOption.value = decodedData.activeOption;
        }

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
const selectDesignOption = (option) => {
  selectedDesignOption.value = option;
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
