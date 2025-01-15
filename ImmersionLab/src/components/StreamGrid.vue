<template>
  <div class="border p-8 rounded-lg">
    <div v-if="fetching" class="flex text-gray-600 justify-center text-sm">
      Loading...
    </div>
    <div v-if="error" class="flex text-red-600 justify-center text-sm">
      {{ error.message }}
    </div>
    <div class="grid grid-cols-3 gap-4">
      <StreamGridItem
        v-for="project in projects"
        :key="project.id"
        :id="project.id"
        :name="project.name"
        :description="project.description"
        :role="project.role"
        @select-project="selectProject"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CombinedError } from "@urql/core";
import StreamGridItem, { type StreamGridItemProps } from "./StreamGridItem.vue";

export interface Project {
  id: string;
  name: string;
  description: string;
  role: string;
  models: { items: any[] }; // Ensure models is included
}

export interface StreamGridProps {
  projects: Project[];
  fetching?: boolean;
  error?: CombinedError;
}

const props = defineProps<StreamGridProps>();

const selectProject = (project: Project) => {
  emit("project-selected", project);
};

const emit = defineEmits(["project-selected"]);
</script>
