<template>
  <div>
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

    <!-- Buttons to view the selected design options or both -->
    <div class="flex justify-center space-x-4 mt-6">
      <button
        @click="viewDesignOption('Option1')"
        :class="getButtonClass('Option1')"
        :disabled="!hasModelsForOption('Option1')"
        :title="
          !hasModelsForOption('Option1') ? 'No models assigned to Option 1' : ''
        "
      >
        View Design Option 1
      </button>
      <button
        @click="viewDesignOption('Option2')"
        :class="getButtonClass('Option2')"
        :disabled="!hasModelsForOption('Option2')"
        :title="
          !hasModelsForOption('Option2') ? 'No models assigned to Option 2' : ''
        "
      >
        View Design Option 2
      </button>
      <button
        @click="viewDesignOption('Both')"
        :class="getButtonClass('Both')"
        :disabled="!hasModelsForAnyOption()"
        :title="
          !hasModelsForAnyOption() ? 'No models assigned to any option' : ''
        "
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
        v-model="viewerBackgroundColorModel"
        type="color"
        id="backgroundColor"
        class="border px-4 py-2 rounded-lg"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from "vue";

const props = defineProps({
  selectedDesignOption: {
    type: String,
    required: true,
  },
  viewerBackgroundColor: {
    type: String,
    default: "#ffffff",
  },
  designOptions: {
    type: Object,
    default: () => ({
      Option1: [],
      Option2: [],
    }),
  },
});

const emit = defineEmits([
  "select-design-option",
  "view-design-option",
  "update:viewerBackgroundColor",
]);

// Two-way binding for color picker
const viewerBackgroundColorModel = ref(props.viewerBackgroundColor);

watch(viewerBackgroundColorModel, (newVal) => {
  emit("update:viewerBackgroundColor", newVal);
});

const hasModelsForOption = (option: string): boolean => {
  if (option === "Both") {
    return hasModelsForOption("Option1") || hasModelsForOption("Option2");
  }

  return (
    props.designOptions &&
    props.designOptions[option] &&
    props.designOptions[option].length > 0
  );
};

const hasModelsForAnyOption = () => {
  return hasModelsForOption("Option1") || hasModelsForOption("Option2");
};

const getButtonClass = (option: string) => {
  const baseClass = "py-2 px-4 rounded-lg shadow-md transition";

  // If button is disabled (no models for that option)
  if (
    (option !== "Both" && !hasModelsForOption(option)) ||
    (option === "Both" && !hasModelsForAnyOption())
  ) {
    return `${baseClass} bg-gray-300 text-gray-500 cursor-not-allowed`;
  }

  // Active/selected button
  if (props.selectedDesignOption === option) {
    return `${baseClass} bg-blue-600 hover:bg-blue-800 text-white`;
  }

  // Normal state
  return `${baseClass} bg-gray-200 hover:bg-gray-400 text-gray-800`;
};

const selectDesignOption = (option: string) => {
  emit("select-design-option", option);
};

const viewDesignOption = (option: string) => {
  // Only emit if there are models for this option
  if (
    (option !== "Both" && hasModelsForOption(option)) ||
    (option === "Both" && hasModelsForAnyOption())
  ) {
    emit("view-design-option", option);
  }
};
</script>
