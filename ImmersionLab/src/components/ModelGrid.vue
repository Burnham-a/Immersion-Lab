<template>
  <div class="border p-8 rounded-lg">
    <div class="grid grid-cols-3 gap-4">
      <div
        v-for="model in models"
        :key="model.id"
        class="py-5 px-5 border rounded-lg hover:shadow-lg bg-white hover:shadow-blue-100 flex justify-between cursor-pointer"
        @click="selectModel(model)"
      >
        <p class="text-gray-800 font-medium">{{ model.name }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

interface Model {
  id: string;
  name: string;
}

const props = defineProps<{ models: Model[] }>();
const emit = defineEmits(["model-selected"]);

const selectModel = (model: Model) => {
  emit("model-selected", model);
};
</script>
