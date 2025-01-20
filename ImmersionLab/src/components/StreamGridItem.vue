<template>
  <div
    class="py-5 px-5 border rounded-lg hover:shadow-lg bg-white hover:shadow-blue-100 flex justify-between cursor-pointer"
    @click="selectProject"
  >
    <p class="text-gray-800 font-medium">{{ name }}</p>
    <p class="text-gray-600">{{ description }}</p>
    <p class="text-gray-400">{{ role }}</p>
  </div>
</template>

<script setup lang="ts">
export interface StreamGridItemProps {
  id: string;
  name: string;
  description: string;
  role?: string;
  models?: { items: { id: string; name: string }[] }; // Ensure models are defined
}

const props = defineProps<StreamGridItemProps>();

const emit = defineEmits(["select-project"]);

const selectProject = () => {
  emit("select-project", props);
};
</script>
