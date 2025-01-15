<template>
  <header class="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
    <h1 class="text-3xl font-bold leading-tight tracking-tight text-gray-900">
      Step 3: Choose a Project
    </h1>
  </header>

  <div class="flex justify-center mt-6">
    <button
      @click="redirectToSpeckleAuthPage"
      class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
    >
      Authenticate with Speckle
    </button>
  </div>

  <main
    v-if="isAuthenticated"
    class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col space-y-8"
  >
    <StreamSearchBar v-model="searchQuery" />
    <StreamGrid
      :projects="filteredProjects"
      :error="error"
      :fetching="fetching"
      @project-selected="handleProjectSelected"
    />
    <div
      v-if="
        selectedProject &&
        selectedProject.models &&
        selectedProject.models.items
      "
    >
      <ModelGrid
        :models="selectedProject.models.items"
        @model-selected="handleModelSelected"
      />
    </div>
  </main>

  <div v-else class="flex justify-center mt-6">
    <p>Please authenticate first to access project.</p>
  </div>
</template>

<script setup lang="ts">
import StreamGrid from "@/components/StreamGrid.vue";
import StreamSearchBar from "@/components/StreamSearchBar.vue";
import ModelGrid from "@/components/ModelGrid.vue";
import type { StreamGridItemProps } from "@/types/StreamGridItemProps";
import { projectsQuery } from "@/graphql/queries/streams";
import { useQuery, CombinedError } from "@urql/vue";
import { ref, computed, watchEffect } from "vue";
import { useStore } from "@/stores/store"; // Ensure correct import path

const redirectToSpeckleAuthPage = () => {
  store.redirectToSpeckleAuthPage();
};

const searchQuery = ref("");
const store = useStore();

const isAuthenticated = computed(() => store.isAuthenticated); // Add computed property for authentication state

const { data, error, fetching } = useQuery({
  query: projectsQuery,
  variables: {}, // Ensure no unsupported variables are passed
  requestPolicy: "network-only", // Ensure fresh data is fetched
  context: {
    fetchOptions: {
      headers: { Authorization: `Bearer ${store.authToken}` },
    },
  },
  pause: !isAuthenticated.value, // Pause the query if not authenticated
});

const projects = ref<StreamGridItemProps[]>([]);

watchEffect(() => {
  if (data.value) {
    console.log("Data fetched:", data.value);
    projects.value = data.value.activeUser.projects.items.map(
      (project: {
        id: string;
        name: string;
        description: string;
        role: string;
        models: { items: any[] };
      }) => ({
        id: project.id,
        name: project.name,
        description: project.description,
        role: project.role,
        models: project.models || { items: [] }, // Ensure models is defined
      })
    );
  }
});

const filteredProjects = computed(() => {
  if (!searchQuery.value) return projects.value;
  return projects.value.filter((project) =>
    project.name.toLowerCase().includes(searchQuery.value.toLowerCase())
  );
});

const errorMessage = computed(() => {
  return error.value ? error.value.message : undefined;
});

const selectedProject = ref<StreamGridItemProps | null>(null);
const selectedModel = ref(null);

const handleProjectSelected = (project: StreamGridItemProps) => {
  selectedProject.value = project;
};

const handleModelSelected = (model: any) => {
  selectedModel.value = model;
};

// Log the query and variables for debugging
console.log("GraphQL Query:", projectsQuery);
console.log("Query Variables:", {});
</script>
