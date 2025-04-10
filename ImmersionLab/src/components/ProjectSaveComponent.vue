<template>
  <div class="project-save-component">
    <h2 class="text-2xl font-bold mb-4 title-text">
      Save Project Configuration
    </h2>

    <div class="flex flex-col gap-4">
      <!-- Enhanced display for selected models -->
      <div
        v-if="selectedProject"
        class="bg-blue-50 border border-blue-200 rounded-md p-4 text-left mb-4"
      >
        <h3 class="text-xl font-semibold subtitle-text mb-3">
          Selected Models:
        </h3>

        <!-- Option 1 model display -->
        <div
          class="mb-2 p-2"
          :class="{ 'bg-blue-100 rounded': selectedDesignOption === 'Option1' }"
        >
          <p class="font-medium">Design Option 1:</p>
          <p v-if="designOptions.Option1.length > 0" class="pl-4 mt-1">
            <span class="text-blue-700 font-medium">
              {{ designOptions.Option1[0]?.name || "Unnamed Model" }}
            </span>
          </p>
          <p
            v-else-if="currentModel && selectedDesignOption === 'Option1'"
            class="pl-4 mt-1"
          >
            <span class="text-blue-700 font-medium">{{
              currentModel.name
            }}</span>
            <span class="text-xs text-gray-500 ml-2">(Currently selected)</span>
          </p>
          <p v-else class="pl-4 mt-1 text-gray-500 italic">
            No model selected for Design Option 1
          </p>
        </div>

        <!-- Option 2 model display -->
        <div
          class="mb-2 p-2"
          :class="{ 'bg-blue-100 rounded': selectedDesignOption === 'Option2' }"
        >
          <p class="font-medium">Design Option 2:</p>
          <p v-if="designOptions.Option2.length > 0" class="pl-4 mt-1">
            <span class="text-blue-700 font-medium">
              {{ designOptions.Option2[0]?.name || "Unnamed Model" }}
            </span>
          </p>
          <p
            v-else-if="currentModel && selectedDesignOption === 'Option2'"
            class="pl-4 mt-1"
          >
            <span class="text-blue-700 font-medium">{{
              currentModel.name
            }}</span>
            <span class="text-xs text-gray-500 ml-2">(Currently selected)</span>
          </p>
          <p v-else class="pl-4 mt-1 text-gray-500 italic">
            No model selected for Design Option 2
          </p>
        </div>
      </div>

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
        :class="{
          'opacity-50 cursor-not-allowed': !canSave || isSaving,
          'opacity-100': canSave && !isSaving,
        }"
        :disabled="!canSave || isSaving"
      >
        {{ isSaving ? "Saving..." : "Save Project Configuration" }}
      </button>

      <!-- Replace selection buttons with a status indicator -->
      <div class="my-3 p-3 bg-blue-50 rounded-md border border-blue-200">
        <h3 class="font-semibold mb-1">Currently Selected:</h3>
        <div class="flex items-center">
          <div class="rounded-full w-3 h-3 bg-blue-600 mr-2"></div>
          <span class="font-medium">{{
            selectedDesignOption === "Option1" ? "Option 1" : "Option 2"
          }}</span>
          <span class="ml-2 text-sm text-gray-600">
            ({{
              selectedDesignOption === "Option1"
                ? (designOptions.Option1 && designOptions.Option1.length) || 0
                : (designOptions.Option2 && designOptions.Option2.length) || 0
            }}
            {{
              selectedDesignOption === "Option1" &&
              (!designOptions.Option1 || designOptions.Option1.length === 0) &&
              currentModel
                ? "+ 1 pending"
                : selectedDesignOption === "Option2" &&
                  (!designOptions.Option2 ||
                    designOptions.Option2.length === 0) &&
                  currentModel
                ? "+ 1 pending"
                : ""
            }}
            total models)
          </span>
        </div>
        <p class="text-sm text-gray-600 mt-1">
          This option will be shown to viewers when you share the project.
        </p>
      </div>

      <!-- Display the unique project code when available -->
      <div
        v-if="projectCode"
        class="text-left border p-4 rounded-md bg-green-50 my-4"
      >
        <h3 class="font-bold text-lg text-green-800 mb-2">Project Code</h3>
        <p class="mb-2">
          Share this code with your client to let them view this project:
        </p>
        <div class="flex items-center">
          <code class="bg-white p-2 rounded border font-mono text-lg">{{
            projectCode
          }}</code>
          <button
            @click="copyProjectCode"
            class="ml-2 bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded"
          >
            Copy
          </button>
        </div>
        <p v-if="codeCopied" class="text-green-600 mt-2">
          Code copied to clipboard!
        </p>

        <!-- Share with client button -->
        <div class="mt-3">
          <button
            @click="shareWithClient"
            class="flex items-center bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
              />
            </svg>
            Share with Client
          </button>
          <p v-if="codeShared" class="text-green-600 mt-2">
            Code copied to share with client!
          </p>
        </div>
      </div>

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

        <!-- Enhance the selected option display -->
        <div
          class="mt-2 p-2 rounded-md"
          :class="{
            'bg-blue-100':
              selectedDesignOption === savedProjectInfo.selectedOption,
            'bg-yellow-100':
              selectedDesignOption !== savedProjectInfo.selectedOption,
          }"
        >
          <p>
            <strong>Selected Option:</strong>
            <span
              class="ml-1 font-semibold"
              :class="{
                'text-blue-700':
                  selectedDesignOption === savedProjectInfo.selectedOption,
                'text-yellow-700':
                  selectedDesignOption !== savedProjectInfo.selectedOption,
              }"
            >
              {{ savedProjectInfo.selectedOption }}
            </span>
            <span
              v-if="selectedDesignOption !== savedProjectInfo.selectedOption"
              class="ml-2 text-xs text-yellow-700"
            >
              (Changed since last save)
            </span>
          </p>
          <p
            class="text-sm"
            :class="{
              'text-blue-600':
                selectedDesignOption === savedProjectInfo.selectedOption,
              'text-yellow-600':
                selectedDesignOption !== savedProjectInfo.selectedOption,
            }"
          >
            This option has
            {{
              savedProjectInfo.designOptions[
                savedProjectInfo.selectedOption as "Option1" | "Option2"
              ]?.length || 0
            }}
            saved models
          </p>
        </div>

        <p class="font-semibold mt-2">Design Option 1:</p>
        <div
          v-if="hasOption1Models"
          class="pl-4"
          :class="{
            'bg-blue-50 p-2 rounded': selectedDesignOption === 'Option1',
          }"
        >
          <!-- Show current models if available, otherwise show saved models -->
          <div v-if="currentOption1Models.length > 0">
            <div
              v-for="(model, index) in currentOption1Models"
              :key="index"
              class="mb-1"
            >
              <p>{{ model.name || "Unnamed Model" }}</p>
            </div>
          </div>
          <div v-else>
            <div
              v-for="(model, index) in savedProjectInfo.designOptions.Option1"
              :key="index"
              class="mb-1"
            >
              <p>{{ model.name || "Unnamed Model" }}</p>
            </div>
          </div>
        </div>
        <div
          v-else
          class="pl-4 text-gray-500 italic"
          :class="{
            'bg-blue-50 p-2 rounded': selectedDesignOption === 'Option1',
          }"
        >
          No models in Option 1
        </div>

        <p class="font-semibold mt-3">Design Option 2:</p>
        <div
          v-if="hasOption2Models"
          class="pl-4"
          :class="{
            'bg-blue-50 p-2 rounded': selectedDesignOption === 'Option2',
          }"
        >
          <!-- Show current models if available, otherwise show saved models -->
          <div v-if="currentOption2Models.length > 0">
            <div
              v-for="(model, index) in currentOption2Models"
              :key="index"
              class="mb-1"
            >
              <p>{{ model.name || "Unnamed Model" }}</p>
            </div>
          </div>
          <div v-else>
            <div
              v-for="(model, index) in savedProjectInfo.designOptions.Option2"
              :key="index"
              class="mb-1"
            >
              <p>{{ model.name || "Unnamed Model" }}</p>
            </div>
          </div>
        </div>
        <div
          v-else
          class="pl-4 text-gray-500 italic"
          :class="{
            'bg-blue-50 p-2 rounded': selectedDesignOption === 'Option2',
          }"
        >
          No models in Option 2
        </div>

        <p>
          <strong>Background Color:</strong>
          <span
            class="inline-block w-4 h-4 border border-gray-300 ml-2"
            :style="{
              backgroundColor: savedProjectInfo.backgroundColor || '#ffffff',
            }"
          ></span>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watchEffect, onMounted, watch } from "vue";
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
  currentModel: {
    type: Object,
    default: null,
  },
});

// Emit events to communicate back to parent components
const emit = defineEmits(["update:selectedDesignOption"]);

const isSaving = ref(false);
const savedStatus = ref<{ type: string; message: string } | null>(null);
const projectCode = ref<string | null>(null);
const codeCopied = ref(false);
const codeShared = ref(false);

interface SavedProjectInfo {
  name: string;
  savedAt: string;
  selectedOption: string;
  designOptions: {
    Option1: any[];
    Option2: any[];
  };
  backgroundColor?: string;
}

const savedProjectInfo = ref<SavedProjectInfo | null>(null);

// Add computed properties to check for models in both current and saved state
const currentOption1Models = computed(() => {
  // Ensure we're returning a copy of the array to maintain reactivity
  const models = props.designOptions?.Option1 || [];
  console.log("Computing currentOption1Models:", models.length, models);
  return [...models]; // Create a new array to ensure reactivity
});

const currentOption2Models = computed(() => {
  const models = props.designOptions?.Option2 || [];
  console.log("Computing currentOption2Models:", models.length, models);
  return [...models]; // Create a new array to ensure reactivity
});

// Improved checks for models in options
const hasOption1Models = computed(() => {
  const currentModels =
    Array.isArray(currentOption1Models.value) &&
    currentOption1Models.value.length > 0;
  const savedModels =
    savedProjectInfo.value &&
    Array.isArray(savedProjectInfo.value.designOptions?.Option1) &&
    savedProjectInfo.value.designOptions.Option1.length > 0;

  console.log(
    "hasOption1Models - Current:",
    currentModels,
    "Saved:",
    savedModels
  );
  return currentModels || savedModels;
});

const hasOption2Models = computed(() => {
  const currentModels =
    Array.isArray(currentOption2Models.value) &&
    currentOption2Models.value.length > 0;
  const savedModels =
    savedProjectInfo.value &&
    Array.isArray(savedProjectInfo.value.designOptions?.Option2) &&
    savedProjectInfo.value.designOptions.Option2.length > 0;

  console.log(
    "hasOption2Models - Current:",
    currentModels,
    "Saved:",
    savedModels
  );
  return currentModels || savedModels;
});

// Check if we can save the project - Simplified
const canSave = computed(() => {
  // Must have a selected project with valid ID
  if (!props.selectedProject || !props.selectedProject.id) {
    return false;
  }

  // Check if there are models in the selected design option
  const hasModelsInSelectedOption =
    (props.selectedDesignOption === "Option1" &&
      currentOption1Models.value.length > 0) ||
    (props.selectedDesignOption === "Option2" &&
      currentOption2Models.value.length > 0) ||
    (props.selectedDesignOption === "Both" &&
      (currentOption1Models.value.length > 0 ||
        currentOption2Models.value.length > 0));

  // Allow saving if project is selected and there's at least one model
  // or if we have a current model selected that we need to save
  return props.currentModel != null || hasModelsInSelectedOption;
});

// Generate a unique project code
const generateProjectCode = () => {
  // Create a random 8-character alphanumeric code
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Copy project code to clipboard
const copyProjectCode = async () => {
  if (projectCode.value) {
    try {
      await navigator.clipboard.writeText(projectCode.value);
      codeCopied.value = true;
      codeShared.value = false; // Reset the other status
      setTimeout(() => {
        codeCopied.value = false;
      }, 3000);
    } catch (err) {
      console.error("Failed to copy code:", err);
    }
  }
};

// Share project code with client (copy with additional context)
const shareWithClient = async () => {
  if (projectCode.value && props.selectedProject?.name) {
    try {
      const shareText = `Project: ${props.selectedProject.name}\nAccess Code: ${projectCode.value}\n\nUse this code at our Immersion Lab viewer to see your project.`;
      await navigator.clipboard.writeText(shareText);
      codeShared.value = true;
      codeCopied.value = false; // Reset the other status
      setTimeout(() => {
        codeShared.value = false;
      }, 3000);
    } catch (err) {
      console.error("Failed to copy share text:", err);
    }
  }
};

// Watch for changes to selected design option in props and update project settings accordingly
watch(
  () => props.selectedDesignOption,
  (newOption) => {
    console.log("Selected design option changed:", newOption);

    // If we have a saved project, update it with the new selected option
    if (savedProjectInfo.value) {
      console.log("Updating saved project info with new selected option");
      savedProjectInfo.value.selectedOption = newOption;
    }
  },
  { immediate: true }
);

// Watch for changes to design options to update the UI
watch(
  () => props.designOptions,
  (newOptions) => {
    console.log("Design options changed:", newOptions);
    console.log("Option1 models:", newOptions?.Option1?.length || 0);
    console.log("Option2 models:", newOptions?.Option2?.length || 0);

    // Force reactivity update by creating a new object
    if (savedProjectInfo.value) {
      savedProjectInfo.value = { ...savedProjectInfo.value };
    }
  },
  { deep: true }
);

// Add a watcher for currentModel to update the UI
watch(
  () => props.currentModel,
  (newModel) => {
    if (newModel) {
      console.log(
        "Current model changed in ProjectSaveComponent:",
        newModel.name
      );

      // Force reactivity update
      if (savedProjectInfo.value) {
        savedProjectInfo.value = { ...savedProjectInfo.value };
      }
    }
  }
);

// Load previously saved project info if available
watchEffect(() => {
  if (props.selectedProject?.id) {
    try {
      const savedProject = getProjectFromLocalStorage(props.selectedProject.id);
      if (savedProject) {
        savedProjectInfo.value = savedProject;
        projectCode.value = savedProject.projectCode;
        console.log("Loaded saved project:", savedProject);

        // Check if the saved selected option is different from the current one
        // and emit an event to update the parent component
        if (
          savedProject.selectedOption &&
          savedProject.selectedOption !== props.selectedDesignOption
        ) {
          console.log(
            `Loaded different selected option: ${savedProject.selectedOption}, current: ${props.selectedDesignOption}`
          );
          emit("update:selectedDesignOption", savedProject.selectedOption);
        }
      } else {
        savedProjectInfo.value = null;
        projectCode.value = null;
      }
    } catch (error) {
      console.error("Error loading saved project:", error);
      savedProjectInfo.value = null;
      projectCode.value = null;
    }
  } else {
    savedProjectInfo.value = null;
    projectCode.value = null;
  }
});

// Function to save the project
const saveProject = async () => {
  console.log("Save project triggered");

  // Log the current models state before saving
  console.log(
    "Current Option1 models before save:",
    props.designOptions?.Option1?.length || 0
  );
  console.log(
    "Current Option2 models before save:",
    props.designOptions?.Option2?.length || 0
  );
  console.log(
    "Current selected model before save:",
    props.currentModel?.name || "None"
  );

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

    // Generate a project code if one doesn't exist
    const code = projectCode.value || generateProjectCode();
    projectCode.value = code;

    // Create project data with additional properties
    // Make a deep copy of design options to avoid reference issues
    const designOptionsCopy = {
      Option1: Array.isArray(props.designOptions.Option1)
        ? JSON.parse(JSON.stringify(props.designOptions.Option1))
        : [],
      Option2: Array.isArray(props.designOptions.Option2)
        ? JSON.parse(JSON.stringify(props.designOptions.Option2))
        : [],
    };

    // Ensure the selected model is included in the saved configuration
    if (
      props.currentModel &&
      props.selectedDesignOption === "Option1" &&
      designOptionsCopy.Option1.length === 0
    ) {
      console.log("Adding current model to Option1");
      designOptionsCopy.Option1.push(props.currentModel);
    } else if (
      props.currentModel &&
      props.selectedDesignOption === "Option2" &&
      designOptionsCopy.Option2.length === 0
    ) {
      console.log("Adding current model to Option2");
      designOptionsCopy.Option2.push(props.currentModel);
    }

    // Log the copied design options to verify
    console.log("Design options being saved:", designOptionsCopy);
    console.log("Option1 models count:", designOptionsCopy.Option1.length);
    console.log("Option2 models count:", designOptionsCopy.Option2.length);

    const projectData = {
      projectId: props.selectedProject.id,
      name: props.selectedProject.name || "Unnamed Project",
      designOptions: designOptionsCopy,
      selectedOption: props.selectedDesignOption, // This ensures we save the current selected option
      backgroundColor: props.viewerBackgroundColor,
      savedAt: new Date().toISOString(),
      projectCode: code,
    };

    // Save the project configuration
    saveProjectToLocalStorage(props.selectedProject.id, projectData);

    // Also save by project code for client access
    localStorage.setItem(code, JSON.stringify(projectData));

    // Update status and refresh saved project info
    savedStatus.value = {
      type: "success",
      message: "Project configuration saved successfully!",
    };

    // Refresh the saved project info
    const savedProject = getProjectFromLocalStorage(props.selectedProject.id);
    if (savedProject) {
      savedProjectInfo.value = savedProject;
      console.log("Updated saved project info:", savedProjectInfo.value);
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

// Expose the saveProject method to parent components
defineExpose({ saveProject });

// Add mounted hook to log initial state
onMounted(() => {
  console.log("ProjectSaveComponent mounted");
  console.log(
    "Initial Option1 models:",
    props.designOptions?.Option1?.length || 0
  );
  console.log(
    "Initial Option2 models:",
    props.designOptions?.Option2?.length || 0
  );
});

// Inside the script section, add a helper computed property to get project name safely
const projectName = computed(() => {
  return props.selectedProject?.name || "Unnamed Project";
});
</script>

<style scoped>
.project-save-component {
  position: relative;
  z-index: 10;
  background-color: white;
  padding: 1.5rem;
  border-radius: 0.5rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  margin-top: 2rem;
  margin-bottom: 2rem;
}

.title-text {
  color: var(--title-color);
}

.subtitle-text {
  color: var(--subtitle-color, #2563eb);
}

.debug-info {
  border: 1px solid #ccc;
  font-family: monospace;
}
</style>
