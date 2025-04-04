<template>
  <div>
    <StreamSearchBar v-model="searchQueryModel" class="w-full" />

    <p class="text-xs text-gray-400">
      Filtered projects:
      {{ filteredProjects.length }}
    </p>
  </div>

  <!-- Show any error messages -->
  <div v-if="errorMessage" class="text-red-600">{{ errorMessage }}</div>

  <!-- Show project grid if there are any projects -->
  <div v-else>
    <div v-if="isLoadingProjects" class="text-gray-600 my-4">
      Loading projects...
    </div>
    <p v-else-if="projects.length === 0" class="text-gray-600">
      No projects available. Please start typing....
    </p>
    <div v-else-if="filteredProjects.length > 0" class="my-4">
      <StreamGrid
        :projects="filteredProjects"
        @project-selected="handleProjectSelected"
      />
    </div>
    <div v-else class="text-gray-600">
      No projects match your search criteria
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watchEffect } from "vue";
import StreamSearchBar from "@/components/StreamSearchBar.vue";
import StreamGrid from "@/components/StreamGrid.vue";
import { StreamGridItemProps } from "@/types/StreamGridItemProps";

// Define props
const props = defineProps({
  projects: {
    type: Array as () => StreamGridItemProps[],
    default: () => [],
  },
  isLoadingProjects: {
    type: Boolean,
    default: false,
  },
  errorMessage: {
    type: String,
    default: null,
  },
});

// Define emits
const emit = defineEmits(["project-selected", "search-query-change"]);

// Local search query state with two-way binding
const searchQueryModel = ref("");

// Forward search query changes to parent
watchEffect(() => {
  emit("search-query-change", searchQueryModel.value);
});

// Compute filtered projects
const filteredProjects = computed(() => {
  if (
    !props.projects ||
    !searchQueryModel.value ||
    searchQueryModel.value.trim() === ""
  ) {
    return props.projects || [];
  }

  const query = searchQueryModel.value.toLowerCase().trim();

  return props.projects.filter((project) => {
    if (project.name && project.name.toLowerCase().includes(query)) {
      return true;
    }

    if (project.models?.items?.length > 0) {
      return project.models.items.some(
        (model) => model.name && model.name.toLowerCase().includes(query)
      );
    }

    return false;
  });
});

const handleProjectSelected = (project) => {
  emit("project-selected", project);
};
</script>
