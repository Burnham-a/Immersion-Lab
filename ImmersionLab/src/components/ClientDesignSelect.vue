<template>
  <div class="design-options-container">
    <h2 class="text-xl font-bold mb-4">Design Options</h2>

    <div class="design-options-grid">
      <button
        v-for="option in availableOptions"
        :key="option.id"
        @click="selectOption(option.id)"
        :class="[
          'design-option-button',
          selectedOption === option.id ? 'selected' : '',
        ]"
      >
        <div class="option-name">{{ option.name }}</div>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";

const props = defineProps({
  projectData: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(["option-selected"]);

const selectedOption = ref("Option1");

// Determine which options are available based on data
const availableOptions = computed(() => {
  const options = [];
  const designOptions = props.projectData.designOptions;

  if (designOptions) {
    if (designOptions.Option1 && designOptions.Option1.length > 0) {
      options.push({ id: "Option1", name: "Design Option 1" });
    }

    if (designOptions.Option2 && designOptions.Option2.length > 0) {
      options.push({ id: "Option2", name: "Design Option 2" });
    }

    // Only add "Both" if both options have models
    if (
      designOptions.Option1 &&
      designOptions.Option1.length > 0 &&
      designOptions.Option2 &&
      designOptions.Option2.length > 0
    ) {
      options.push({ id: "Both", name: "Compare Both Options" });
    }
  }

  return options;
});

// Select a design option
const selectOption = (optionId) => {
  selectedOption.value = optionId;
  emit("option-selected", optionId);
};

// Initialize with saved selection if available
onMounted(() => {
  if (props.projectData.selectedDesignOption) {
    // Check if saved option exists in available options
    const isValidOption = availableOptions.value.some(
      (option) => option.id === props.projectData.selectedDesignOption
    );

    if (isValidOption) {
      selectedOption.value = props.projectData.selectedDesignOption;
      emit("option-selected", props.projectData.selectedDesignOption);
    }
  }
});
</script>

<style scoped>
.design-options-container {
  padding: 1rem;
  background-color: #f8f9fa;
  border-radius: 8px;
}

.design-options-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  justify-content: center;
}

.design-option-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 180px;
  height: 80px;
  padding: 1rem;
  border-radius: 8px;
  background-color: white;
  border: 2px solid #e2e8f0;
  cursor: pointer;
  transition: all 0.2s ease;
}

.design-option-button:hover {
  border-color: #4f46e5;
  transform: translateY(-2px);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.design-option-button.selected {
  border-color: #4f46e5;
  background-color: #eef2ff;
}

.option-name {
  font-weight: 600;
  margin-top: 0.5rem;
}
</style>
