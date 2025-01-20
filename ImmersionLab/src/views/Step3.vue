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

// GraphQL query for projects
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

// Manage fetched projects and error messages
const projects = ref<StreamGridItemProps[]>([]);
const errorMessage = computed(() =>
  error.value ? error.value.message : undefined
);

// Watch fetched data and process it
watchEffect(() => {
  const items = data.value?.activeUser?.projects?.items;
  if (items) {
    console.log("Fetched projects data:", items); // Debugging
    projects.value = items.map(
      (project: {
        id: string;
        name: string;
        description: string;
        role: string;
        models: { items: { id: string; name: string }[] }; // Ensure models are defined
      }) => ({
        id: project.id,
        name: project.name,
        description: project.description,
        role: project.role,
        models: project.models || { items: [] }, // Ensure models are defined
      })
    );
  }
});

// Filter projects based on search query
const filteredProjects = computed(() => {
  if (!searchQuery.value) return [];
  return projects.value.filter((project) =>
    project.name.toLowerCase().includes(searchQuery.value.toLowerCase())
  );
});

// Define the type for the selected project
interface SelectedProject extends StreamGridItemProps {
  models: { items: { id: string; name: string }[] };
}

// Manage selected project and Speckle Viewer URL
const selectedProject = ref<SelectedProject | null>(null);
const selectedModelId = ref<string | null>(null);

const speckleViewerUrl = computed(() => {
  if (selectedModelId.value) {
    return `https://app.speckle.systems/projects/${selectedProject.value?.id}/models/${selectedModelId.value}`;
  }
  return null;
});

// Handlers for project selection
const handleProjectSelected = async (project: StreamGridItemProps) => {
  try {
    console.log("Selected project:", project); // Debugging
    selectedProject.value = { ...project, models: { items: [] } }; // Ensure models are initialized
    if (project.id) {
      console.log("Fetching models for selected project:", project.name);
      const updatedProject = await fetchProjectModels(project.id);
      console.log("Fetched models:", updatedProject.models); // Debugging
      selectedProject.value.models = updatedProject.models || { items: [] };
      if (
        selectedProject.value.models.items &&
        selectedProject.value.models.items.length > 0
      ) {
        selectedModelId.value = selectedProject.value.models.items[0].id; // Set the first model as default
      }
    }
  } catch (error) {
    console.error("Error in handleProjectSelected:", error);
  }
};

const updateViewerUrl = () => {
  // This function will be called when the model selection changes
  console.log("Selected model ID:", selectedModelId.value);
};

async function fetchProjectModels(projectId: string) {
  try {
    const response = await fetch(
      `https://app.speckle.systems/api/streams/${projectId}/objects`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${store.authToken}` },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Error fetching models: ${response.statusText} - ${errorText}`
      );
    }

    // Check if the response is JSON
    const contentType = response.headers.get("Content-Type");
    if (!contentType || !contentType.includes("application/json")) {
      const text = await response.text(); // Read the response as text
      console.error("Unexpected response:", text); // Log the unexpected response
      throw new Error(`Unexpected content type: ${contentType}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching models:", error);
    return { models: [] }; // Fallback with an empty models list
  }
}
</script>
