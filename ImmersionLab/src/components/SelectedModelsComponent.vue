<template>
  <div class="bg-white p-6 rounded-lg shadow mb-6">
    <h2 class="text-xl font-semibold text-gray-800 mb-4">Selected Models</h2>

    <!-- Display the currently active project and option -->
    <div class="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
      <div class="flex flex-wrap gap-2 items-center justify-between">
        <div>
          <span class="font-medium mr-2">Current Project:</span>
          <span class="text-blue-700">{{
            selectedProject?.name || "None"
          }}</span>
        </div>
        <div>
          <span class="font-medium mr-2">Active Option:</span>
          <span
            :class="{
              'text-orange-600': selectedDesignOption === 'Option1',
              'text-green-600': selectedDesignOption === 'Option2',
              'text-purple-600': selectedDesignOption === 'Both',
            }"
          >
            {{ selectedDesignOption }}
          </span>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- Option 1 Models -->
      <div class="border rounded-lg p-4">
        <h3 class="font-medium text-lg mb-3 text-blue-700">
          Option 1
          <span class="text-sm text-gray-600"
            >({{ option1Models.length }} models)</span
          >
        </h3>
        <div v-if="option1Models.length === 0" class="text-gray-500 italic">
          No models selected
        </div>
        <ul v-else class="space-y-2">
          <li
            v-for="(model, index) in option1Models"
            :key="`opt1-${index}`"
            class="flex justify-between items-center py-1 px-2 bg-blue-50 rounded"
          >
            <span class="text-sm truncate max-w-[80%]">{{ model.name }}</span>
            <span class="text-xs text-gray-500"
              >ID: {{ shortenId(model.id) }}</span
            >
          </li>
        </ul>
      </div>

      <!-- Option 2 Models -->
      <div class="border rounded-lg p-4">
        <h3 class="font-medium text-lg mb-3 text-green-700">
          Option 2
          <span class="text-sm text-gray-600"
            >({{ option2Models.length }} models)</span
          >
        </h3>
        <div v-if="option2Models.length === 0" class="text-gray-500 italic">
          No models selected
        </div>
        <ul v-else class="space-y-2">
          <li
            v-for="(model, index) in option2Models"
            :key="`opt2-${index}`"
            class="flex justify-between items-center py-1 px-2 bg-green-50 rounded"
          >
            <span class="text-sm truncate max-w-[80%]">{{ model.name }}</span>
            <span class="text-xs text-gray-500"
              >ID: {{ shortenId(model.id) }}</span
            >
          </li>
        </ul>
      </div>
    </div>

    <!-- Share Project Section -->
    <div class="mt-6 border-t pt-4">
      <h3 class="font-medium text-lg mb-3 text-gray-700">Share Project</h3>
      <div class="flex flex-col space-y-3">
        <!-- Generated Code Display -->
        <div class="flex items-center">
          <div
            class="bg-gray-100 p-2 rounded flex-1 font-mono text-sm overflow-x-auto"
          >
            {{ shareCode || "Click generate to create a code" }}
          </div>
          <button
            @click="generateShareCode"
            class="ml-2 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Generate
          </button>
          <button
            v-if="shareCode"
            @click="copyShareCode"
            class="ml-2 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Copy
          </button>
        </div>

        <!-- Save Button -->
        <button
          v-if="shareCode"
          @click="saveProjectData"
          class="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 w-full"
        >
          Save Project Configuration
        </button>

        <!-- Status Messages -->
        <p v-if="statusMessage" class="text-sm" :class="statusMessageClass">
          {{ statusMessage }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineProps, computed, ref, watch } from "vue";

const props = defineProps({
  designOptions: {
    type: Object,
    required: true,
    default: () => ({
      Option1: [],
      Option2: [],
    }),
  },
  selectedProject: {
    type: Object,
    default: null,
  },
  selectedDesignOption: {
    type: String,
    default: "Option1",
  },
});

// Debug mode toggle - set to false now that it's working
const debugMode = ref(false);

// Add watcher to log when design options change
watch(
  () => props.designOptions,
  (newVal) => {
    console.log("SelectedModelsComponent: designOptions changed", newVal);
  },
  { deep: true }
);

// Computed properties to access the models from each option
const option1Models = computed(() => {
  const models = props.designOptions.Option1 || [];
  console.log("Option1 models:", models);
  return models;
});

const option2Models = computed(() => {
  const models = props.designOptions.Option2 || [];
  console.log("Option2 models:", models);
  return models;
});

// Create debug info for display
const debugInfo = computed(() => {
  return JSON.stringify(
    {
      selectedProject: props.selectedProject
        ? {
            id: props.selectedProject.id,
            name: props.selectedProject.name,
          }
        : null,
      selectedDesignOption: props.selectedDesignOption,
      modelsInOption1: option1Models.value.length,
      modelsInOption2: option2Models.value.length,
      option1ModelNames: option1Models.value.map((m) => m.name),
      activeModels:
        props.selectedDesignOption === "Both"
          ? [...option1Models.value, ...option2Models.value].map((m) => ({
              id: m.id,
              name: m.name,
            }))
          : (props.designOptions[props.selectedDesignOption] || []).map(
              (m: { id: string; name: string }) => ({ id: m.id, name: m.name })
            ),
    },
    null,
    2
  );
});

// Helper function to check if a model is in Option 1
const isInOption1 = (modelId: string): boolean => {
  return option1Models.value.some((m) => m.id === modelId);
};

// Helper function to shorten IDs for display
const shortenId = (id: string): string => {
  if (!id) return "";
  return id.length > 10 ? `${id.substring(0, 7)}...` : id;
};

// Share code functionality
const shareCode = ref("");
const statusMessage = ref("");
const statusMessageClass = ref("");

// Generate a random code and encode the current project data
const generateShareCode = () => {
  try {
    // Create a payload with all necessary project data
    const payload = {
      project: props.selectedProject
        ? {
            id: props.selectedProject.id,
            name: props.selectedProject.name,
          }
        : null,
      designOptions: {
        Option1: option1Models.value.map((m) => ({ id: m.id, name: m.name })),
        Option2: option2Models.value.map((m) => ({ id: m.id, name: m.name })),
      },
      activeOption: props.selectedDesignOption,
      timestamp: new Date().toISOString(),
    };

    // Stringify and encode the payload
    const jsonData = JSON.stringify(payload);
    const encodedData = btoa(jsonData);

    // Generate a random prefix (6 characters)
    const prefix = Math.random().toString(36).substring(2, 8).toUpperCase();

    // Combine into a share code
    shareCode.value = `${prefix}-${encodedData}`;

    showStatus("Share code generated!", "text-green-600");
  } catch (error) {
    console.error("Error generating share code:", error);
    showStatus("Failed to generate code", "text-red-600");
  }
};

// Copy the share code to clipboard
const copyShareCode = async () => {
  try {
    await navigator.clipboard.writeText(shareCode.value);
    showStatus("Code copied to clipboard!", "text-green-600");
  } catch (error) {
    console.error("Failed to copy:", error);
    showStatus("Failed to copy code", "text-red-600");
  }
};

// Save the project configuration
const saveProjectData = () => {
  try {
    if (!shareCode.value) {
      showStatus("Please generate a code first", "text-yellow-600");
      return;
    }

    // Create a key for local storage
    const storageKey = `immersion-lab-project-${Date.now()}`;

    // Create storage payload
    const storagePayload = {
      code: shareCode.value,
      project: props.selectedProject?.name || "Unnamed Project",
      timestamp: new Date().toISOString(),
    };

    // Save to local storage
    localStorage.setItem(storageKey, JSON.stringify(storagePayload));

    showStatus("Project configuration saved!", "text-green-600");
  } catch (error) {
    console.error("Error saving project data:", error);
    showStatus("Failed to save project data", "text-red-600");
  }
};

// Helper to show status messages
const showStatus = (message, cssClass) => {
  statusMessage.value = message;
  statusMessageClass.value = cssClass;

  // Clear status after 3 seconds
  setTimeout(() => {
    statusMessage.value = "";
  }, 3000);
};
</script>
