<template>
  <main
    class="max-w-4xl mx-auto py-10 px-6 sm:px-8 lg:px-10 text-center bg-white shadow-xl rounded-2xl"
  >
    <h1 class="text-4xl font-extrabold text-white-800 mb-6">
      Immersion Lab: Choose a Project
    </h1>
    <br />
    <div class="mt-4">
      <button
        @click="redirectToSpeckleAuthPage"
        class="bg-blue-600 hover:bg-blue-800 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition duration-300"
      >
        Authenticate with Speckle
      </button>
    </div>
    <br />
    <div v-if="isAuthenticated" class="mt-10 space-y-8">
      <StreamSearchBar v-model="searchQuery" class="w-full" />

      <div v-if="errorMessage" class="text-red-600">{{ errorMessage }}</div>

      <div v-else-if="filteredProjects.length > 0">
        <StreamGrid
          :projects="filteredProjects"
          @project-selected="handleProjectSelected"
        />
      </div>
      <br />
      <div class="flex justify-center space-x-4 mt-6">
        <button
          @click="selectDesignOption('Option1')"
          :class="[
            'py-2 px-4 rounded-lg font-medium transition',
            selectedDesignOption === 'Option1'
              ? 'bg-orange-500 text-white'
              : 'bg-gray-200 text-gray-800 hover:bg-gray-300',
          ]"
        >
          Option 1
        </button>
        <button
          @click="selectDesignOption('Option2')"
          :class="[
            'py-2 px-4 rounded-lg font-medium transition',
            selectedDesignOption === 'Option2'
              ? 'bg-orange-500 text-white'
              : 'bg-gray-200 text-gray-800 hover:bg-gray-300',
          ]"
        >
          Option 2
        </button>
      </div>
      <br />
      <div class="space-y-6">
        <h2 v-if="selectedProject" class="text-2xl font-bold text-white-700">
          Viewing Project: {{ selectedProject.name }}
        </h2>

        <div v-if="selectedProject?.models?.items?.length">
          <h3 class="text-xl font-semibold text-white-600">
            Available Models:
          </h3>
          <ul class="space-y-3">
            <li
              v-for="model in selectedProject.models.items"
              :key="model.id"
              class="p-4 bg-gray-100 rounded-lg shadow-md hover:bg-gray-200 transition"
            >
              <div class="flex justify-between items-center">
                <div>
                  <p class="text-gray-800 font-semibold">{{ model.name }}</p>
                  <p class="text-sm text-gray-500">
                    Versions: {{ model.versions.totalCount }}
                  </p>
                </div>
                <button
                  @click="addModelToDesignOption(model)"
                  class="bg-orange-600 hover:bg-orange-800 text-white text-sm font-medium px-4 py-2 rounded-lg shadow-md"
                >
                  Select for {{ selectedDesignOption }}
                </button>
              </div>
            </li>
          </ul>
        </div>
        <br />
        <div class="space-y-4">
          <h3 class="text-xl font-bold text-white-800">
            Selected Model for {{ selectedDesignOption }}
          </h3>
          <div class="bg-gray-50 p-4 rounded-lg shadow-md">
            <ul>
              <li
                v-for="model in designOptions[selectedDesignOption]"
                :key="model.id"
                class="text-gray-600"
              >
                - {{ model.name }}
              </li>
            </ul>
          </div>
        </div>
        <br />
        <div
          ref="viewerContainer"
          class="w-full h-96 bg-gray-200 rounded-lg shadow-inner mt-4"
          style="border: 2px solid orange"
        ></div>
      </div>
    </div>

    <div v-else class="mt-6 text-gray-600">
      Please authenticate first to access projects.
    </div>
  </main>
</template>

<script setup lang="ts">
import StreamGrid from "@/components/StreamGrid.vue";
import StreamSearchBar from "@/components/StreamSearchBar.vue";
import { ref, computed, watchEffect, nextTick, markRaw } from "vue";
import { useStore } from "@/stores/store-IL";
import {
  Viewer,
  DefaultViewerParams,
  SpeckleLoader,
  UrlHelper,
  CameraController,
  SelectionExtension,
} from "@speckle/viewer";
import { useQuery } from "@urql/vue";
import { projectsQuery } from "@/graphql/queries/streams";

interface Model {
  id: string;
  name: string;
  versions: { totalCount: number };
}

interface Project {
  id: string;
  name: string;
  description: string;
  role: string;
  models: { items: Model[] };
}

const store = useStore();
const redirectToSpeckleAuthPage = () => store.redirectToSpeckleAuthPage();

const searchQuery = ref("");
const isAuthenticated = computed(() => store.isAuthenticated);
const selectedProject = ref<Project | null>(null);
const errorMessage = ref<string | null>(null);
const viewerContainer = ref<HTMLElement | null>(null);
const viewer = ref<Viewer | null>(null);
const hasSearched = ref(false);

const designOptions = ref<{ Option1: Model[]; Option2: Model[] }>({
  Option1: [],
  Option2: [],
});
const selectedDesignOption = ref<"Option1" | "Option2">("Option1");

const { data, error } = useQuery({
  query: projectsQuery,
  requestPolicy: "network-only",
  context: {
    fetchOptions: { headers: { Authorization: `Bearer ${store.authToken}` } },
  },
  pause: !isAuthenticated.value,
});

const projects = ref<Project[]>([]);

watchEffect(() => {
  if (error.value) {
    errorMessage.value = error.value.message;
    return;
  }
  projects.value = data.value?.activeUser?.projects?.items || [];
});

const filteredProjects = computed(() => {
  if (!hasSearched.value) return [];
  return projects.value.filter((project) =>
    project.name.toLowerCase().includes(searchQuery.value.toLowerCase())
  );
});

watchEffect(() => {
  if (searchQuery.value.trim().length > 0) {
    hasSearched.value = true;
  }
});

const handleProjectSelected = async (project: Project) => {
  selectedProject.value = project;
  await nextTick(); // Ensure DOM is fully updated
  initViewer();
};

const selectDesignOption = (option: "Option1" | "Option2") => {
  selectedDesignOption.value = option;
  loadModel();
};

const addModelToDesignOption = (model: Model) => {
  const option = selectedDesignOption.value;
  designOptions.value[option] = [model]; // Replace any existing model
  loadModel();
};

const initViewer = async () => {
  await nextTick(); // Ensure DOM is fully updated

  if (!viewerContainer.value) {
    console.error("Viewer container not found!");
    return;
  }

  if (viewer.value) {
    viewer.value.dispose(); // Clean up existing viewer instance
  }

  console.log("Initializing viewer...");
  viewer.value = markRaw(
    new Viewer(viewerContainer.value, DefaultViewerParams)
  );
  await viewer.value.init();
  console.log("Viewer initialized");

  viewer.value.createExtension(CameraController);
  viewer.value.createExtension(SelectionExtension);

  loadModel();
};

const loadModel = async () => {
  if (!selectedProject.value || !viewer.value) {
    console.warn("Selected project or viewer not found!");
    return;
  }

  viewer.value.unloadAll();

  const models = designOptions.value[selectedDesignOption.value];

  for (const model of models) {
    try {
      const urls = await UrlHelper.getResourceUrls(
        `https://app.speckle.systems/projects/${selectedProject.value.id}/models/${model.id}`
      );

      if (urls.length === 0) {
        console.warn(`No URLs found for model: ${model.name}`);
        continue;
      }

      for (const url of urls) {
        const loader = new SpeckleLoader(
          viewer.value.getWorldTree(),
          url,
          store.authToken
        );
        await viewer.value.loadObject(loader, true);
        console.log("Model loaded:", model.name);
      }
    } catch (err) {
      console.error(`Error loading model: ${model.name}`, err);
    }
  }
};
</script>

<style scoped>
main {
  background: linear-gradient(135deg, #f0f4f800, #d9e2ec00);
}
</style>
