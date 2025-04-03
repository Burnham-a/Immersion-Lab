<template>
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
                Versions: {{ model.versions?.totalCount || 0 }}
              </p>
            </div>
            <!-- Buttons to assign models to either Option1 or Option2 -->
            <button
              @click="addModelToDesignOption(model, 'Option1')"
              class="bg-orange-600 hover:bg-orange-800 text-white text-sm font-medium px-4 py-2 rounded-lg shadow-md"
              :class="{ 'bg-orange-900': isModelAssignedTo(model, 'Option1') }"
            >
              {{
                isModelAssignedTo(model, "Option1")
                  ? "Selected for Option 1"
                  : "Assign to Option 1"
              }}
            </button>
            <button
              @click="addModelToDesignOption(model, 'Option2')"
              class="bg-green-600 hover:bg-green-800 text-white text-sm font-medium px-4 py-2 rounded-lg shadow-md"
              :class="{ 'bg-green-900': isModelAssignedTo(model, 'Option2') }"
            >
              {{
                isModelAssignedTo(model, "Option2")
                  ? "Selected for Option 2"
                  : "Assign to Option 2"
              }}
            </button>
          </div>
        </li>
      </ul>
    </div>

    <!-- Display selected models for both design options -->
    <div v-if="selectedProject">
      <h3 class="text-xl font-semibold text-gray-600">Selected Models:</h3>
      <p v-if="designOptions.Option1.length > 0" class="text-left pl-4 mt-2">
        <span class="font-medium">Design Option 1:</span>
        {{ selectedProject.name }}_{{ designOptions.Option1[0].name }}
      </p>
      <p v-else class="text-left pl-4 mt-2 text-gray-500 italic">
        No model selected for Design Option 1
      </p>

      <p v-if="designOptions.Option2.length > 0" class="text-left pl-4 mt-2">
        <span class="font-medium">Design Option 2:</span>
        {{ selectedProject.name }}_{{ designOptions.Option2[0].name }}
      </p>
      <p v-else class="text-left pl-4 mt-2 text-gray-500 italic">
        No model selected for Design Option 2
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits } from "vue";

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

const emit = defineEmits(["add-model-to-design-option"]);

const isModelAssignedTo = (model: { id: string }, option: string) => {
  if (!props.designOptions[option] || !props.designOptions[option].length) {
    return false;
  }

  return props.designOptions[option].some(
    (m: { id: string }) => m.id === model.id
  );
};

const addModelToDesignOption = (
  model: { id: string; name: string },
  option: string
) => {
  emit("add-model-to-design-option", model, option);
};
</script>
