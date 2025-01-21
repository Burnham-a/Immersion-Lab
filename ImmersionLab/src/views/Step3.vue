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

    <div v-if="errorMessage" class="text-red-600 text-center">
      {{ errorMessage }}
    </div>
    <div v-else-if="filteredProjects.length > 0 && searchQuery.length > 0">
      <StreamGrid
        :projects="filteredProjects"
        :fetching="fetching"
        :error="error"
        @project-selected="handleProjectSelected"
      />
    </div>
    <div v-else class="text-center text-gray-500">
      No projects match your search.
    </div>

    <div v-if="selectedProject">
      <h2 class="text-xl font-semibold">
        Viewing Project: {{ selectedProject.name }}
      </h2>
      <p class="text-gray-700">{{ selectedProject.description }}</p>
      <p class="text-gray-500">Role: {{ selectedProject.role }}</p>

      <!-- List of models -->
      <div v-if="selectedProject.models.items.length > 0" class="mt-4">
        <h3 class="text-lg font-medium text-gray-900">Available Models:</h3>
        <ul class="mt-2 space-y-2">
          <li
            v-for="model in selectedProject.models.items"
            :key="model.id"
            class="p-4 bg-gray-100 rounded-lg"
          >
            <div class="flex justify-between items-center">
              <div>
                <p class="text-gray-800 font-medium">{{ model.name }}</p>
                <p class="text-sm text-gray-500">ID: {{ model.id }}</p>
              </div>
              <button
                @click="selectModel(model.id)"
                class="bg-blue-500 hover:bg-blue-700 text-white text-sm font-semibold px-3 py-1 rounded"
              >
                View in Viewer
              </button>
            </div>
          </li>
        </ul>
      </div>

      <!-- Model selection dropdown and iframe -->
      <div class="mt-4">
        <label
          for="model-select"
          class="block text-sm font-medium text-gray-700"
          >Select Model</label
        >
        <select
          id="model-select"
          v-model="selectedModelId"
          @change="updateViewerUrl"
          class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
        >
          <option
            v-for="model in selectedProject.models.items"
            :key="model.id"
            :value="model.id"
          >
            {{ model.name }}
          </option>
        </select>
        <div class="mt-4">
          <iframe
            v-if="speckleViewerUrl"
            :src="speckleViewerUrl"
            class="w-full h-[600px] border rounded-lg"
          ></iframe>
          <p v-else class="text-gray-500">No models available to display.</p>
        </div>
      </div>
    </div>
  </main>

  <div v-else class="flex justify-center mt-6">
    <p>Please authenticate first to access projects.</p>
  </div>
</template>

<script setup lang="ts">
import StreamGrid from "@/components/StreamGrid.vue";
import StreamSearchBar from "@/components/StreamSearchBar.vue";
import type { StreamGridItemProps } from "@/types/StreamGridItemProps";
import { projectsQuery } from "@/graphql/queries/streams";
import { useQuery, CombinedError } from "@urql/vue";
import { ref, computed, watchEffect } from "vue";
import { useStore } from "@/stores/store"; // Ensure correct import path

// Redirect to authentication page
const redirectToSpeckleAuthPage = () => {
  store.redirectToSpeckleAuthPage();
};

// Reactive states and store integration
const searchQuery = ref("");
const store = useStore();
const isAuthenticated = computed(() => store.isAuthenticated);

// Reactive state for selected project and models
const projects = ref<StreamGridItemProps[]>([]);
const selectedProject = ref<StreamGridItemProps | null>(null);
const selectedModelId = ref<string | null>(null);

const speckleViewerUrl = computed(() => {
  if (selectedModelId.value) {
    return `https://speckle.xyz/embed?stream=${selectedModelId.value}`;
  }
  return null;
});

// Error message state
const errorMessage = ref<string | null>(null);

// Fetching projects data
const { data, error, fetching } = useQuery({
  query: projectsQuery,
  variables: {},
  requestPolicy: "network-only",
  context: {
    fetchOptions: {
      headers: { Authorization: `Bearer ${store.authToken}` },
    },
  },
  pause: !isAuthenticated.value,
});

// Watcher to process fetched projects data
watchEffect(() => {
  if (error.value) {
    errorMessage.value = error.value.message;
    return;
  }

  const projectData = data.value?.project;
  if (projectData) {
    projects.value = [
      {
        id: projectData.id,
        name: projectData.name,
        description: projectData.description,
        role: projectData.role,
        models: projectData.models || { items: [] },
      },
    ];
  }
});

// Filtered projects for search
const filteredProjects = computed(() => {
  if (!searchQuery.value) return projects.value;
  return projects.value.filter((project) =>
    project.name.toLowerCase().includes(searchQuery.value.toLowerCase())
  );
});

// Handle project selection
const handleProjectSelected = async (project: StreamGridItemProps) => {
  selectedProject.value = project;
  if (project.models.items.length > 0) {
    selectedModelId.value = project.models.items[0].id; // Default to first model
  }
};

// Select a model
const selectModel = (modelId: string) => {
  selectedModelId.value = modelId;
};

const updateViewerUrl = () => {
  console.log("Viewer URL updated for model:", selectedModelId.value);
};
</script>
