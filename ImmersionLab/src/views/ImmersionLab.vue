<template>
  <main class="max-w-3xl mx-auto py-10 px-4 sm:px-6 lg:px-8 text-center">
    <h1 class="text-3xl font-bold leading-tight tracking-tight text-white-900">
      Immersion Lab: Choose a Project
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

        <div v-if="selectedProject?.models?.items?.length > 0">
          <h3 class="text-lg font-medium">Available Models:</h3>
          <br />
          <ul class="space-y-2">
            <li
              v-for="model in selectedProject.models.items"
              :key="model.id"
              class="p-4 bg-gray-100 rounded-lg"
            >
              <div class="flex justify-between items-center">
                <div>
                  <p class="text-gray-800 font-medium">{{ model.name }}</p>
                  <p class="text-sm text-gray-500">
                    Versions: {{ model.versions.totalCount }}
                  </p>
                </div>
                <button
                  @click="loadModel(model.id)"
                  class="bg-blue-500 hover:bg-blue-700 text-black text-sm font-semibold px-3 py-1 rounded"
                >
                  Load in Viewer
                </button>
              </div>
            </li>
          </ul>
        </div>

        <div
          ref="threeContainer"
          class="w-full h-96 bg-gray-200 rounded-lg"
        ></div>
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
import { useQuery } from "@urql/vue";
import { projectsQuery } from "@/graphql/queries/streams";
import { ref, computed, onMounted, onUnmounted, watchEffect } from "vue";
import { useStore } from "@/stores/store";
import * as THREE from "three";

interface Model {
  id: string;
  name: string;
  versions: {
    totalCount: number;
  };
}

interface Project {
  id: string;
  name: string;
  description: string;
  role: string;
  models: {
    items: Model[];
  };
}

const store = useStore();
const redirectToSpeckleAuthPage = () => store.redirectToSpeckleAuthPage();

const searchQuery = ref<string>("");
const isAuthenticated = computed(() => store.isAuthenticated);
const projects = ref<Project[]>([]);
const selectedProject = ref<Project | null>(null);
const errorMessage = ref<string | null>(null);
const threeContainer = ref<HTMLDivElement | null>(null);
const fetching = ref<boolean>(false);

const { data, error } = useQuery({
  query: projectsQuery,
  requestPolicy: "network-only",
  context: {
    fetchOptions: {
      headers: { Authorization: `Bearer ${store.authToken}` },
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
    role: project.role,
    models: project.models || { items: [] },
  }));
});

const filteredProjects = computed(() => {
  return projects.value.filter((project) =>
    project.name.toLowerCase().includes(searchQuery.value.toLowerCase())
  );
});

const handleProjectSelected = (project: Project) => {
  selectedProject.value = project;
};

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;

const initializeThreeJS = () => {
  if (!threeContainer.value) return;

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(
    75,
    threeContainer.value.clientWidth / threeContainer.value.clientHeight,
    0.1,
    1000
  );
  camera.position.z = 5;

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(
    threeContainer.value.clientWidth,
    threeContainer.value.clientHeight
  );
  threeContainer.value.appendChild(renderer.domElement);

  animate();
};

const animate = () => {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
};

const loadModel = async (modelId: string) => {
  if (!selectedProject.value) return;

  const response = await fetch(
    `https://speckle.xyz/streams/${selectedProject.value.id}/objects/${modelId}`,
    {
      headers: { Authorization: `Bearer ${store.authToken}` },
    }
  );

  const speckleData = await response.json();
  addSpeckleObjectsToScene(speckleData);
};

const addSpeckleObjectsToScene = (data: any) => {
  scene.clear();

  data.objects.forEach((obj: any) => {
    const geometry = new THREE.BoxGeometry(
      obj.dimensions.x,
      obj.dimensions.y,
      obj.dimensions.z
    );
    const material = new THREE.MeshBasicMaterial({ color: 0x0077ff });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(obj.position.x, obj.position.y, obj.position.z);
    scene.add(mesh);
  });
};

onMounted(() => initializeThreeJS());
onUnmounted(() => renderer.dispose());
</script>

<style scoped>
main {
  background-color: #f9fafb00;
  border-radius: 0.5rem;
  padding: 2rem;
}
</style>
