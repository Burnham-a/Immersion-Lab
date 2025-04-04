<template>
  <main class="max-w-3xl mx-auto py-10 px-4 sm:px-6 lg:px-8 text-center">
    <h1 class="text-3xl font-bold leading-tight tracking-tight text-gray-900">
      Step 3: Choose a Project
    </h1>
    <br />
    <div class="mt-4">
      <button
        v-if="!isAuthenticated"
        @click="handleAuthClick"
        class="bg-blue-600 hover:bg-blue-800 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition duration-300"
      >
        Authenticate with Speckle
      </button>
    </div>
    <br />

    <div v-if="isAuthenticated" class="mt-8 space-y-6">
      <!-- User information display with avatar -->
      <div
        class="flex items-center justify-center space-x-4 p-4 bg-gray-50 rounded-lg shadow-sm"
      >
        <div class="h-12 w-12 rounded-full overflow-hidden bg-gray-200">
          <img
            v-if="store.user?.avatar"
            :src="store.user.avatar"
            :alt="store.user?.name"
            class="h-full w-full object-cover"
          />
          <span
            v-else
            class="h-full w-full flex items-center justify-center text-2xl font-bold text-gray-400"
          >
            {{ store.user?.name?.charAt(0).toUpperCase() || "U" }}
          </span>
        </div>
        <div class="text-left">
          <p class="font-medium text-gray-900">
            Welcome, {{ store.user?.name || "User" }}
          </p>
          <p class="text-sm text-gray-500">{{ store.user?.email }}</p>
        </div>
        <button
          @click="handleLogout"
          class="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-md text-sm"
        >
          Log out
        </button>
      </div>

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
    // Reset authentication state when mounting the component to ensure starting logged out
    store.isAuthenticated = false;
    store.user = null;

    // Clear any existing token
    localStorage.removeItem("SpeckleToken");

    // Optional: If you still want to check for an existing valid session,
    // you can uncomment the following block
    /*
    const user = await store.speckle.user();
    if (user) {
      store.user = user;
      store.isAuthenticated = true;
    }
    */
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
          id: string; // Ensure 'id' property is included
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

// Correctly handle token for authentication
const token = ref(localStorage.getItem("SpeckleToken") || "");

// Create a reactive variable to trigger query re-execution when token changes
const tokenReady = computed(() => isAuthenticated.value && token.value);

const { data, error, fetching, executeQuery } = useQuery({
  query: projectsQuery,
  requestPolicy: "network-only",
  context: computed(() => ({
    fetchOptions: {
      headers: { Authorization: `Bearer ${store.speckle.token}` },
    },
  })),
  pause: computed(() => !isAuthenticated.value),
});

// Re-execute the query when user authenticates successfully
watchEffect(() => {
  if (isAuthenticated.value && store.speckle.token) {
    executeQuery();
  }
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
    selectedModelId.value = project.models.items[0]?.id || null;
  }
};

const selectModel = (modelId: string) => {
  selectedModelId.value = modelId;
};

const updateViewerUrl = () => {
  console.log("Viewer URL updated for model:", selectedModelId.value);
};

// Correctly implement authentication method based on available Speckle client methods
const handleAuthClick = async () => {
  try {
    console.log("Auth button clicked in Step3");
    console.log("Using client ID:", import.meta.env.VITE_CLIENT_ID);
    console.log("Using server URL:", import.meta.env.VITE_SERVER_URL);

    // Call the authentication method directly from the Speckle client
    await store.speckle.login();

    // Wait a moment for the authentication to complete as it might involve redirects
    setTimeout(async () => {
      try {
        // Check if authentication was successful by getting the user data
        const userData = await store.speckle.user();
        if (userData) {
          console.log("Authentication successful, user data:", userData);

          // Update the authentication state
          store.user = userData;
          store.isAuthenticated = true;

          // Store the token if available from the Speckle client
          if (store.speckle.token) {
            token.value = store.speckle.token;
            localStorage.setItem("SpeckleToken", store.speckle.token);
          }

          // Execute the query to fetch projects
          executeQuery();
        } else {
          console.warn("Login did not return user data");
          errorMessage.value = "Authentication in progress. Please wait...";
        }
      } catch (err) {
        console.error("Error checking authentication status:", err);
      }
    }, 1000);
  } catch (error) {
    console.error("Authentication error:", error);
    errorMessage.value = "Authentication failed. Please try again.";
  }
};

// Updated logout handler to match ImmersionLabSetup implementation
const handleLogout = async () => {
  console.log("Logout handler triggered in Step3");

  // Reset local component state
  selectedProject.value = null;
  projects.value = [];

  // Clear Speckle token and reset store state
  try {
    // Remove token from localStorage
    localStorage.removeItem("SpeckleToken");

    // Reset auth state
    store.isAuthenticated = false;
    store.user = null;

    // Use the logout method from the speckle client
    if (typeof store.speckle.logout === "function") {
      store.speckle.logout();
    }

    console.log("User logged out successfully");
  } catch (error) {
    console.error("Error during logout:", error);
  }
};
</script>

<style scoped>
main {
  background-color: #00000000;
  border-radius: 0.5rem;
  padding: 2rem;
}
</style>
