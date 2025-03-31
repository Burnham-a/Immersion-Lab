<template>
  <div class="border p-8 rounded-lg">
    <div v-if="fetching" class="flex text-gray-600 justify-center text-sm">
      Loading...
    </div>
    <div v-if="error" class="flex text-red-600 justify-center text-sm">
      {{ error.message }}
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <StreamGridItem
        v-for="project in projects"
        :key="project.id"
        :id="project.id"
        :name="project.name"
        :description="project.description || ''"
        :role="project.role || ''"
        :models="project.models || { items: [] }"
        @click="selectProject(project)"
      />
    </div>
    <div v-if="projects.length === 0" class="text-gray-500 text-center py-4">
      No projects found matching your search criteria.
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CombinedError } from "@urql/core";
import StreamGridItem from "./StreamGridItem.vue";
import { StreamGridItemProps } from "@/types/StreamGridItemProps";

export interface Project {
  id: string;
  name: string;
  description?: string;
  role?: string;
  models?: { items: { id: string; name: string }[] };
}

export interface StreamGridProps {
  projects: Project[];
  fetching?: boolean;
  error?: CombinedError;
}

const props = defineProps<StreamGridProps>();

const emit = defineEmits(["project-selected"]);

const selectProject = (project: Project) => {
  console.log("Project selected in StreamGrid:", project.name);
  emit("project-selected", project);
};
</script>
