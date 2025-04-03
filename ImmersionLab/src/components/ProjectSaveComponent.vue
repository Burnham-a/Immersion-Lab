<template>
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
</template>

<script setup lang="ts">
import { ref } from "vue";
import { saveProjectToLocalStorage } from "@/utils/projectUtils";

// Project variables
const projectNumber = ref("");
const copied = ref(false);
const projectSaved = ref(false);

// Define props for the component
const props = defineProps({
  selectedProject: {
    type: Object,
    default: null,
  },
  designOptions: {
    type: Object,
    required: true,
  },
});

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

// Save the project
const saveProject = () => {
  if (projectNumber.value && props.selectedProject) {
    const projectData = {
      number: projectNumber.value,
      project: props.selectedProject,
      designOptions: props.designOptions,
      timestamp: new Date().toISOString(),
    };

    saveProjectToLocalStorage(projectData);
    projectSaved.value = true;

    setTimeout(() => {
      projectSaved.value = false;
    }, 3000);
  }
};
</script>
