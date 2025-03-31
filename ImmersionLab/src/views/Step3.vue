<template>
  <main class="max-w-3xl mx-auto py-10 px-4 sm:px-6 lg:px-8 text-center">
    <h1 class="text-3xl font-bold leading-tight tracking-tight text-gray-900">
      Step 3: Choose a Project
    </h1>
    <br />
    <div class="mt-4">
      <button
        @click="redirectToSpeckleAuthPage"
        class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
      >
        Authenticate with Speckle
      </button>
    </div>
    <br />

    <div v-if="isAuthenticated" class="mt-8 space-y-6">
      <StreamSearchBar v-model="searchQuery" class="w-full" />

      <div v-if="errorMessage" class="text-red-600">
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

      <div v-else class="text-gray-500">No projects match your search.</div>
      <br />
      <div v-if="selectedProject" class="space-y-4">
        <h2 class="text-xl font-semibold">
          Viewing Project: {{ selectedProject.name }}
        </h2>
        <br />
        <div v-if="selectedProject.models.items.length > 0">
          <h3 class="text-lg font-medium">Available Models:</h3>
          <br />
          <ul class="space-y-2">
            <li
              v-for="model in selectedProject.models.items"
              :key="model.name"
              class="p-4 bg-gray-100 rounded-lg"
            >
              <div class="flex justify-between items-center">
                <div>
                  <p class="text-gray-800 font-medium">{{ model.name }}</p>
                  <p class="text-sm text-gray-500">
                    Versions: {{ model.versions?.totalCount ?? "N/A" }}
                  </p>
                </div>
                <button
                  @click="selectModel(model.id)"
                  class="bg-blue-500 hover:bg-blue-700 text-black text-sm font-semibold px-3 py-1 rounded"
                >
                  View in Viewer
                </button>
              </div>
            </li>
          </ul>
        </div>

        <div>
          <label
            for="model-select"
            class="block text-sm font-medium text-gray-700"
          >
            Select Model
          </label>
          <select
            id="model-select"
            v-model="selectedModelId"
            @change="updateViewerUrl"
            class="mt-1 w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
          >
            <option
              v-for="model in selectedProject.models.items"
              :key="model.id"
              :value="model.id"
            >
              {{ model.name }}
            </option>
          </select>
        </div>

        <div>
          <iframe
            v-if="speckleViewerUrl"
            title="Speckle"
            :src="speckleViewerUrl"
            width="100%"
            height="400"
            frameborder="0"
            class="mx-auto rounded-lg"
          ></iframe>
          <p v-else class="text-gray-500">No models available to display.</p>
        </div>
      </div>
    </div>

    <div v-else class="flex justify-center mt-6">
      <p>Please authenticate first to access projects.</p>
    </div>
  </main>
</template>

<script setup lang="ts">
import StreamGrid from "@/components/StreamGrid.vue";
import StreamSearchBar from "@/components/StreamSearchBar.vue";
import type { StreamGridItemProps } from "@/types/StreamGridItemProps";
import { projectsQuery } from "@/graphql/queries/streams";
import { useQuery } from "@urql/vue";
import { ref, computed, watchEffect, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/store";

const store = useAuthStore();
const router = useRouter();

onMounted(async () => {
  try {
    const user = await store.speckle.user();
    if (!user) {
      console.warn("User not authenticated, redirecting...");
      await router.push({ name: "Step3", query: { access_code: null } });
    } else {
      store.user = user;
      store.isAuthenticated = true;
    }
  } catch (error) {
    console.error("Error during authentication check:", error);
  }
});

const searchQuery = ref("");
const isAuthenticated = computed(() => store.isAuthenticated);
const projects = ref<
  Array<
    StreamGridItemProps & {
      models: {
        items: Array<{
          name: string;
          id: string; // Ensure 'id' is included
          option?: string;
          versions?: { totalCount?: number } | undefined;
        }>;
      };
    }
  >
>([]);
const selectedProject = ref<StreamGridItemProps | null>(null);
const selectedModelId = ref<string | null>(null);
const speckleViewerUrl = computed(() => {
  if (selectedProject.value && selectedModelId.value) {
    return `https://app.speckle.systems/projects/${selectedProject.value.id}/models/${selectedModelId.value}/#embed=%7B%22isEnabled%22%3Atrue%7D`;
  }
  return null;
});
const errorMessage = ref<string | null>(null);
const { data, error, fetching } = useQuery({
  query: projectsQuery,
  requestPolicy: "network-only",
  context: {
    fetchOptions: {
      headers: { Authorization: `Bearer ${store.speckle.token}` },
    },
  },
  pause: !isAuthenticated.value,
});

watchEffect(() => {
  if (error.value) {
    errorMessage.value = error.value.message;
    return;
  }
  const fetchedProjects = data.value?.activeUser?.projects?.items || [];
  projects.value = fetchedProjects.map((project: any) => ({
    id: project.id,
    name: project.name,
    description: project.description,
    role: project.role || "", // Provide a default empty string for undefined roles
    models: project.models || { items: [] },
  }));
});

const filteredProjects = computed(() => {
  if (!searchQuery.value) return projects.value;
  return projects.value.filter((project) =>
    project.name.toLowerCase().includes(searchQuery.value.toLowerCase())
  );
});

const handleProjectSelected = (project: StreamGridItemProps) => {
  selectedProject.value = project;
  if (project.models.items.length > 0) {
    selectedModelId.value = project.models.items[0].id || null;
  }
};

const selectModel = (modelId: string) => {
  selectedModelId.value = modelId;
};

const updateViewerUrl = () => {
  console.log("Viewer URL updated for model:", selectedModelId.value);
};

const redirectToSpeckleAuthPage = () => {
  const speckleAuthUrl = "https://speckle.systems/auth"; // Replace with actual URL
  window.location.href = speckleAuthUrl;
};
</script>

<style scoped>
main {
  background-color: #00000000;
  border-radius: 0.5rem;
  padding: 2rem;
}
</style>
