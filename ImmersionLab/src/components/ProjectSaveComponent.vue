<template>
  <div class="project-save-component">
    <h2 class="text-2xl font-bold mb-4">Save Project Configuration</h2>

    <div class="flex flex-col gap-4">
      <div
        v-if="savedStatus"
        :class="[
          'p-4 rounded-md',
          savedStatus.type === 'success'
            ? 'bg-green-100 text-green-800'
            : 'bg-red-100 text-red-800',
        ]"
      >
        {{ savedStatus.message }}
      </div>

      <button
        @click="saveProject"
        class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        :disabled="!canSave || isSaving"
      >
        {{ isSaving ? "Saving..." : "Save Project Configuration" }}
      </button>

      <div
        v-if="savedProjectInfo"
        class="text-left border p-4 rounded-md bg-gray-50"
      >
        <h3 class="font-bold">Saved Project Information</h3>
        <p><strong>Project Name:</strong> {{ savedProjectInfo.name }}</p>
        <p>
          <strong>Saved At:</strong>
          {{ new Date(savedProjectInfo.savedAt).toLocaleString() }}
        </p>
        <p>
          <strong>Selected Option:</strong>
          {{ savedProjectInfo.selectedOption }}
        </p>
        <p>
          <strong>Models in Option 1:</strong>
          {{ savedProjectInfo.designOptions.Option1.length }}
        </p>
        <p>
          <strong>Models in Option 2:</strong>
          {{ savedProjectInfo.designOptions.Option2.length }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watchEffect } from "vue";
import {
  saveProjectToLocalStorage,
  getProjectFromLocalStorage,
} from "@/utils/projectUtils";

const props = defineProps({
  selectedProject: {
    type: Object,
    default: null,
  },
  designOptions: {
    type: Object,
    default: () => ({ Option1: [], Option2: [] }),
  },
  viewerBackgroundColor: {
    type: String,
    default: "#ffffff",
  },
  selectedDesignOption: {
    type: String,
    default: "Option1",
  },
});

const isSaving = ref(false);
const savedStatus = ref<{ type: string; message: string } | null>(null);
interface SavedProjectInfo {
  name: string;
  savedAt: string;
  selectedOption: string;
  designOptions: {
    Option1: any[];
    Option2: any[];
  };
}

const savedProjectInfo = ref<SavedProjectInfo | null>(null);

// Check if we can save the project
const canSave = computed(() => {
  // Must have a selected project with valid ID
  if (!props.selectedProject || !props.selectedProject.id) {
    return false;
  }

  // Must have at least one model in either Option1 or Option2
  const hasOption1Models =
    Array.isArray(props.designOptions.Option1) &&
    props.designOptions.Option1.length > 0;
  const hasOption2Models =
    Array.isArray(props.designOptions.Option2) &&
    props.designOptions.Option2.length > 0;

  return hasOption1Models || hasOption2Models;
});

// Load previously saved project info if available
watchEffect(() => {
  if (props.selectedProject?.id) {
    try {
      const savedProject = getProjectFromLocalStorage(props.selectedProject.id);
      if (savedProject) {
        savedProjectInfo.value = savedProject;
      } else {
        savedProjectInfo.value = null;
      }
    } catch (error) {
      console.error("Error loading saved project:", error);
      savedProjectInfo.value = null;
    }
  } else {
    savedProjectInfo.value = null;
  }
});

// Function to save the project
const saveProject = async () => {
  if (!canSave.value) {
    savedStatus.value = {
      type: "error",
      message:
        "Cannot save: Please select a project and add at least one model to a design option.",
    };
    return;
  }

  isSaving.value = true;
  savedStatus.value = null;

  try {
    // Validate project before saving
    if (
      !props.selectedProject ||
      !props.selectedProject.id ||
      typeof props.selectedProject.id !== "string"
    ) {
      throw new Error("Invalid project data. Project must have a valid ID.");
    }

    // Save the project configuration
    saveProjectToLocalStorage(props.selectedProject.id, props.designOptions);

    // Update status and refresh saved project info
    savedStatus.value = {
      type: "success",
      message: "Project configuration saved successfully!",
    };

    // Refresh the saved project info
    const savedProject = getProjectFromLocalStorage(props.selectedProject.id);
    if (savedProject) {
      savedProjectInfo.value = savedProject;
    }
  } catch (error) {
    console.error("Error saving project:", error);
    savedStatus.value = {
      type: "error",
      message: `Failed to save project: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    };
  } finally {
    isSaving.value = false;
  }
};
</script>
