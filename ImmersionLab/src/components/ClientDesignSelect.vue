<template>
  <div class="design-options my-6">
    <h2 class="text-2xl font-semibold mb-4">Design Options</h2>

    <div class="flex justify-center space-x-4">
      <button
        @click="selectOption('Option1')"
        class="px-4 py-2 rounded-lg transition-colors"
        :class="
          selectedOption === 'Option1'
            ? 'bg-blue-600 text-white'
            : 'bg-gray-200'
        "
      >
        Option 1
      </button>
      <button
        @click="selectOption('Option2')"
        class="px-4 py-2 rounded-lg transition-colors"
        :class="
          selectedOption === 'Option2'
            ? 'bg-blue-600 text-white'
            : 'bg-gray-200'
        "
        :disabled="!hasOption2"
      >
        Option 2
      </button>
      <button
        @click="selectOption('Both')"
        class="px-4 py-2 rounded-lg transition-colors"
        :class="
          selectedOption === 'Both' ? 'bg-blue-600 text-white' : 'bg-gray-200'
        "
        :disabled="!hasOption2"
      >
        Compare Both
      </button>
    </div>

    <div
      v-if="!hasOption2 && selectedOption !== 'Option1'"
      class="mt-3 text-amber-600"
    >
      No models available for Option 2
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from "vue";

const props = defineProps({
  projectData: {
    type: Object,
    required: true,
  },
  initialOption: {
    type: String,
    default: null,
  },
});

const emit = defineEmits(["option-selected"]);

// Initialize with saved selection or default to Option1
const selectedOption = ref(
  props.initialOption || props.projectData?.selectedDesignOption || "Option1"
);

// Determine if Option2 has any models
const hasOption2 = computed(() => {
  return props.projectData?.designOptions?.Option2?.length > 0;
});

// Select a design option
const selectOption = (option) => {
  // Don't allow selecting options with no models
  if (option === "Option2" && !hasOption2.value) return;
  if (option === "Both" && !hasOption2.value) return;

  selectedOption.value = option;
  emit("option-selected", option);
};

// Watch for changes in projectData
watch(
  () => props.projectData,
  (newData) => {
    if (newData?.selectedDesignOption) {
      selectedOption.value = newData.selectedDesignOption;
      emit("option-selected", selectedOption.value);
    }
  },
  { immediate: true }
);
</script>

<style scoped>
button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
