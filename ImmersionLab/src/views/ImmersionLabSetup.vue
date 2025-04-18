<template>
  <main class="max-w-4xl mx-auto py-10 px-6 sm:px-8 lg:px-10 text-center">
    <!-- Page title -->
    <h1 class="text-4xl font-extrabold title-text mb-6">
      Immersion Lab: Choose a Project
    </h1>
    <br />

    <!-- Authentication Component -->
    <AuthenticationComponent
      @auth-click="handleAuthClick"
      :is-authenticating="isAuthenticating"
      :auth-error="authError"
    />

    <!-- Only show the following section if the user is authenticated -->
    <div v-if="isAuthenticated" class="mt-10 space-y-8">
      <!-- User Profile Component -->
      <UserProfileComponent :user="user ?? {}" @logout="handleLogout" />

      <!-- Project Search Component -->
      <ProjectSearchComponent
        :projects="searchQuery.length > 0 ? projects : []"
        :is-loading-projects="isLoadingProjects"
        :error-message="errorMessage"
        @search-query-change="updateSearchQuery"
        @project-selected="handleProjectSelected"
      />
      <br />

      <!-- Project Details Component - Modified to listen for model selection -->
      <ProjectDetailsComponent
        :selected-project="selectedProjectForViewer"
        :design-options="designOptions"
        @add-model-to-design-option="addModelToDesignOption"
        @model-selected="handleModelSelected"
      />
      <br />

      <!-- Design Options Component - Modified to remove select buttons and only show view buttons -->
      <DesignOptionsComponent
        :selected-design-option="selectedDesignOption"
        :design-options="designOptions"
        @view-design-option="viewDesignOption"
      />
      <br />

      <!-- Viewer Settings Component -->
      <div class="mb-6 bg-white p-4 rounded-lg shadow">
        <h2 class="text-xl font-semibold text-gray-800 mb-3">
          Viewer Settings
        </h2>
        <div class="flex items-center space-x-4">
          <label
            for="background-color"
            class="text-sm font-medium text-gray-700"
            >Background Color:</label
          >
          <input
            type="color"
            id="background-color"
            v-model="viewerBackgroundColor"
            @change="updateBackgroundColor"
            class="h-8 w-16 rounded border border-gray-300 cursor-pointer"
          />
          <button
            @click="resetBackgroundColor"
            class="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300"
          >
            Reset
          </button>
        </div>
      </div>

      <!-- Viewer Component -->
      <ViewerComponent
        v-if="selectedProject"
        ref="viewerComponent"
        :selected-project="selectedProjectForViewer"
        :selected-design-option="selectedDesignOption"
        :design-options="designOptions"
        :viewer-background-color="viewerBackgroundColor"
      />
      <br />
      <br />
      <br />
      <br />
      <br />
      <br />
      <br />
      <br />
      <!-- Add the Selected Models Component at the end -->
      <SelectedModelsComponent
        :design-options="designOptions"
        :selected-project="selectedProjectForViewer"
        :selected-design-option="selectedDesignOption"
      />
      <br />
    </div>

    <!-- Loading indicator -->
    <div v-if="isAuthenticating" class="mt-6">
      <p class="auth-message auth-message-info">
        Authenticating, please wait...
      </p>
    </div>

    <!-- Authentication error message -->
    <div
      v-if="authError && !isAuthenticated"
      class="mt-6 auth-message auth-message-error"
    >
      <p>{{ authError }}</p>
      <button
        @click="clearAuthError"
        class="mt-2 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
      >
        Try Again
      </button>
    </div>
  </main>
</template>

<script setup lang="ts">
console.log("Initializing ImmersionLabSetup.vue...");

// Verify imports
import {
  ref,
  computed,
  watchEffect,
  onMounted,
  onBeforeUnmount,
  nextTick,
  shallowRef,
} from "vue";
import { useRoute, useRouter } from "vue-router";

// Import the newly created components
import AuthenticationComponent from "@/components/AuthenticationComponent.vue";
import UserProfileComponent from "@/components/UserProfileComponent.vue";
import ProjectSearchComponent from "@/components/ProjectSearchComponent.vue";
import ProjectDetailsComponent from "@/components/ProjectDetailsComponent.vue";
import DesignOptionsComponent from "@/components/DesignOptionsComponent.vue";
import ViewerComponent from "@/components/ViewerComponent.vue";
import SelectedModelsComponent from "@/components/SelectedModelsComponent.vue";

import { useImmersionLabStore } from "@/stores/store-IL";
import type { StreamGridItemProps } from "@/types/StreamGridItemProps";

// Import GraphQL query
import { useQuery } from "@urql/vue";
import { projectsQuery } from "@/graphql/queries/streams";

const store = useImmersionLabStore();
const route = useRoute();
const router = useRouter();

// Refs and computed properties
const user = computed(() => store.user);
const isLoadingProjects = ref(false);
const isAuthenticated = computed(() => store.isAuthenticated);
const isAuthenticating = ref(false);
const authError = ref<string | undefined>(undefined);
const selectedProject = ref<{
  name: string;
  id: string;
  models?: { items: any[] };
} | null>(null);

const selectedProjectForViewer = computed(() =>
  selectedProject.value ? { ...selectedProject.value } : undefined
);
const errorMessage = ref<string | undefined>(undefined);
const selectedDesignOption = ref<"Option1" | "Option2" | "Both">("Option1");
const designOptions = ref<{
  Option1: { name: string; id: string }[];
  Option2: { name: string; id: string }[];
}>({
  Option1: [],
  Option2: [],
});
const viewerBackgroundColor = ref<string>("#ffffff");
const searchQuery = ref("");
const projects = ref<StreamGridItemProps[]>([]);
const viewerComponent = shallowRef<InstanceType<typeof ViewerComponent> | null>(
  null
);
const viewerInitialized = ref(false);
const selectedModel = ref<{ name: string; id: string } | null>(null);
const currentModel = computed(() => selectedModel.value || undefined);
const isViewerOperationInProgress = ref(false);

// Reactive array to store selected models
const selectedModels = ref<{ name: string; id: string }[]>([]);

// GraphQL Query
const { executeQuery, data, error } = useQuery({
  query: projectsQuery,
  requestPolicy: "network-only",
  context: computed(() => ({
    fetchOptions: {
      headers: {
        Authorization: store.speckle.token
          ? `Bearer ${store.speckle.token}`
          : "",
      },
    },
  })),
  pause: computed(() => !store.isAuthenticated || !store.speckle.token),
});

// Authentication handling
const handleAuthClick = async () => {
  try {
    isAuthenticating.value = true;
    authError.value = undefined;

    // Attempt authentication with auto-retry
    await attemptAuthentication(false);
  } catch (error) {
    console.error("Authentication error:", error);
    authError.value =
      error instanceof Error
        ? `Authentication failed: ${error.message}`
        : "Authentication failed. Please try again.";
  } finally {
    isAuthenticating.value = false;
  }
};

// New function to attempt authentication with auto-retry
const attemptAuthentication = async (isRetry = false) => {
  console.log(`${isRetry ? "Retrying" : "Starting"} authentication process...`);

  // Call the authenticate method with better error handling
  const authResult = await store.authenticate().catch((error) => {
    console.error("Auth method exception:", error);
    return null;
  });

  // If we have a token immediately, proceed with fetching projects
  if (store.isAuthenticated && store.speckle.token) {
    console.log("Authentication successful, fetching projects...");
    await fetchProjects();
    return true;
  } else {
    // Start polling for when authentication completes
    console.log("Authentication initiated, waiting for completion...");
    try {
      await pollForAuthentication();
      return true;
    } catch (error) {
      console.log("Polling failed:", error);

      // Auto-retry once if this wasn't already a retry
      if (!isRetry) {
        console.log("Auto-retrying authentication...");
        // Slight delay before retry
        await new Promise((resolve) => setTimeout(resolve, 500));
        return attemptAuthentication(true);
      }
      throw error;
    }
  }
};

// Improved polling function for authentication completion
const pollForAuthentication = async () => {
  const maxAttempts = 2; // Reduce polling time to 2 seconds
  let attempts = 0;

  return new Promise<void>((resolve, reject) => {
    const checkAuth = async () => {
      attempts++;

      console.log(`Polling for auth (attempt ${attempts}/${maxAttempts})...`);

      // Try to refresh auth status from store
      try {
        await store.checkAuthStatus();
      } catch (e) {
        console.warn("Error checking auth status:", e);
      }

      // Check if we're authenticated now
      if (store.isAuthenticated && store.speckle.token) {
        console.log("Authentication detected via polling!");
        await fetchProjects();
        resolve();
        return;
      }

      // Check if we've exceeded max attempts
      if (attempts >= maxAttempts) {
        console.log("Authentication polling timed out");
        reject(new Error("Authentication polling timed out"));
        return;
      }

      // Continue polling with increasing delay
      const delay = Math.min(1000 + attempts * 200, 3000);
      setTimeout(checkAuth, delay);
    };

    // Start polling
    checkAuth();
  });
};

// Update the clearAuthError function to automatically retry authentication
const clearAuthError = async () => {
  authError.value = undefined;
  // Automatically retry authentication when "Try Again" is clicked
  try {
    isAuthenticating.value = true;
    await attemptAuthentication(false);
  } catch (error) {
    console.error("Authentication retry error:", error);
    authError.value =
      error instanceof Error
        ? `Authentication failed: ${error.message}`
        : "Authentication failed. Please try again.";
  } finally {
    isAuthenticating.value = false;
  }
};

// Fix the logout handler to match the original implementation
const handleLogout = async () => {
  console.log("Logout handler triggered in ImmersionLabSetup");

  // Clean up local resources first
  if (viewerComponent.value) {
    viewerComponent.value.disposeViewer();
  }

  // Reset local component state
  selectedProject.value = null;
  projects.value = [];
  designOptions.value = {
    Option1: [],
    Option2: [],
  };
  viewerInitialized.value = false;
  authError.value = undefined;

  // Use the store's logout method
  try {
    await store.logout();
    console.log("User logged out successfully");
  } catch (error) {
    console.error("Error during logout:", error);
  }
};

// Project handling
const fetchProjects = async () => {
  if (!store.isAuthenticated || !store.speckle.token) {
    console.log("Cannot fetch projects: Not authenticated or missing token");
    return;
  }

  try {
    isLoadingProjects.value = true;
    errorMessage.value = undefined;

    await executeQuery();

    if (error.value) {
      throw new Error(error.value.message);
    }
  } catch (err) {
    console.error("Error fetching projects:", err);
    errorMessage.value = "Failed to fetch projects.";
  } finally {
    isLoadingProjects.value = false;
  }
};

const safeViewerOperation = async (
  operation: (viewer: InstanceType<typeof ViewerComponent>) => Promise<void>
) => {
  if (isViewerOperationInProgress.value) {
    console.log("Another viewer operation in progress, skipping");
    return;
  }

  try {
    isViewerOperationInProgress.value = true;

    // First check if viewer component exists and is mounted
    if (
      !viewerComponent.value ||
      !document.body.contains(viewerComponent.value.$el)
    ) {
      console.warn("Viewer component not available or not in document");
      return;
    }

    await operation(viewerComponent.value);
  } catch (error) {
    console.error("Error in viewer operation:", error);
  } finally {
    isViewerOperationInProgress.value = false;
  }
};

const handleProjectSelected = async (project: StreamGridItemProps) => {
  console.log("Project selected:", project);

  try {
    // First reset the current selection to ensure clean state
    designOptions.value = {
      Option1: [],
      Option2: [],
    };

    // Reset viewer initialization flag to ensure proper initialization
    viewerInitialized.value = false;

    const models =
      project.models && project.models.items ? project.models : { items: [] };

    selectedProject.value = {
      ...project,
      models: models,
    };

    // Initialize the viewer after project selection
    await nextTick();

    // Wait another tick for the conditional rendering to complete
    await nextTick();

    // Give the DOM time to fully render the viewer component
    setTimeout(async () => {
      await safeViewerOperation(async (viewer) => {
        console.log("Initializing viewer after project selection");
        await viewer.initializeViewer();
        viewerInitialized.value = true;
      });
    }, 100);
  } catch (err) {
    console.error("Error handling project selection:", err);
    viewerInitialized.value = false;
  }
};

const updateSearchQuery = (query: string) => {
  searchQuery.value = query;
};

const viewDesignOption = async (option: string) => {
  console.log(`Viewing design option: ${option}`);
  selectedDesignOption.value = option as "Option1" | "Option2" | "Both";

  // Wait for the state update to be reflected in the DOM
  await nextTick();

  setTimeout(async () => {
    await safeViewerOperation(async (viewer) => {
      await viewer.loadModels();
    });
  }, 100);
};

// Update the addModelToDesignOption function
const addModelToDesignOption = async (model: any, option: string) => {
  if (!model || !option) {
    console.error("Invalid model or option:", { model, option });
    return;
  }

  // Add more debugging
  console.log(`ImmersionLabSetup: Adding model to ${option}:`, model);
  console.log(
    "Current designOptions before update:",
    JSON.stringify(designOptions.value)
  );

  try {
    // Create a clean model object with just the properties we need
    const cleanModel = {
      id: model.id,
      name: model.name,
    };

    // Directly update the design options without cloning first
    if (option === "Option1") {
      // Force reactivity by using array methods
      designOptions.value.Option1 = [];
      designOptions.value.Option1.push(cleanModel);
    } else if (option === "Option2") {
      designOptions.value.Option2 = [];
      designOptions.value.Option2.push(cleanModel);
    }

    console.log("Updated designOptions:", JSON.stringify(designOptions.value));

    // Store the selected model
    selectedModel.value = cleanModel;

    // Force the component to update
    await nextTick();

    // Now select this design option
    selectedDesignOption.value = option as "Option1" | "Option2" | "Both";

    // Force another update
    await nextTick();

    // Log to verify
    console.log(
      "Final design options state:",
      JSON.stringify({
        option1Length: designOptions.value.Option1.length,
        option2Length: designOptions.value.Option2.length,
        option1: designOptions.value.Option1,
        option2: designOptions.value.Option2,
      })
    );

    // Load the models in the viewer
    setTimeout(async () => {
      await safeViewerOperation(async (viewer) => {
        if (!viewerInitialized.value) {
          await viewer.initializeViewer();
          viewerInitialized.value = true;
        }
        await viewer.loadModels();
      });
    }, 150);
  } catch (err) {
    console.error("Error in addModelToDesignOption:", err);
  }
};

// Add a new function to handle model selection from ProjectDetailsComponent
const handleModelSelected = (model: any) => {
  console.log("Model selected in ProjectDetailsComponent:", model);
  selectedModel.value = model; // Update the selected model for ProjectSaveComponent
};

// Update the color update function with better error handling and checking
const updateBackgroundColor = () => {
  console.log("Background color changed to:", viewerBackgroundColor.value);

  // Use the safe viewer operation with a timeout to ensure the DOM is ready
  setTimeout(async () => {
    await safeViewerOperation(async (viewer) => {
      viewer.updateViewerBackgroundColor(viewerBackgroundColor.value);
    });
  }, 50);
};

const resetBackgroundColor = () => {
  viewerBackgroundColor.value = "#ffffff";
  updateBackgroundColor();
};

// Add a handler for design option changes
const handleDesignOptionChange = (option: "Option1" | "Option2" | "Both") => {
  console.log("Design option changed:", option);
  selectedDesignOption.value = option;

  // If the viewer is initialized, update it to reflect the new option
  setTimeout(async () => {
    await safeViewerOperation(async (viewer) => {
      await viewer.loadModels();
    });
  }, 100);
};

// Watch for data changes
watchEffect(() => {
  try {
    if (data.value && data.value.activeUser && data.value.activeUser.projects) {
      const fetchedProjects = data.value.activeUser.projects.items || [];
      projects.value = fetchedProjects.map((project: any) => ({
        ...project,
        name: project.name || "Unnamed Project",
        description: project.description || "",
        models: project.models || { items: [] },
      }));
      console.log("Projects updated:", projects.value.length);
    }
  } catch (err) {
    console.error("Error processing projects data:", err);
    errorMessage.value = "An error occurred while processing project data.";
  }
});

// Initialize the component
onMounted(async () => {
  // Check if already authenticated and fetch projects if needed
  if (store.isAuthenticated && store.speckle.token) {
    try {
      console.log("Already authenticated, fetching projects...");
      await fetchProjects();
    } catch (err) {
      console.error("Error fetching projects on mount:", err);
      // If we get an authentication error during automatic fetch,
      // we should clear the auth state as the token might be invalid
      if (
        err instanceof Error &&
        (err.message.includes("403") || err.message.includes("authentication"))
      ) {
        await store.logout();
        authError.value = "Your session has expired. Please log in again.";
      }
    }
  } else {
    console.log("Not authenticated yet, waiting for user login");

    // Check if we're in the process of returning from authentication
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has("auth") || urlParams.has("access_token")) {
      console.log(
        "Detected auth parameters in URL, attempting to complete authentication"
      );
      isAuthenticating.value = true;
      try {
        await store.checkAuthStatus();
        if (store.isAuthenticated && store.speckle.token) {
          console.log("Authentication completed from URL parameters");
          await fetchProjects();
        }
      } catch (error) {
        console.error("Error completing authentication from URL:", error);
      } finally {
        isAuthenticating.value = false;
      }
    }
  }
});

// Clean up resources properly when the component is unmounted
onBeforeUnmount(() => {
  // Clear all viewer references and release resources
  try {
    if (viewerComponent.value) {
      viewerComponent.value.disposeViewer();
    }
  } catch (error) {
    console.error("Error during viewer component cleanup:", error);
  }

  // Reset all state
  viewerInitialized.value = false;
  selectedProject.value = null;
  isViewerOperationInProgress.value = false;

  // Clean up design options
  designOptions.value = {
    Option1: [],
    Option2: [],
  };
});
</script>

<style scoped>
main {
  background-color: #00000000;
  border-radius: 0.5rem;
  padding: 2rem;
}

.title-text {
  color: var(--title-color);
}

.adaptive-heading {
  color: var(--inverse-color);
}

.adaptive-text {
  color: var(--inverse-color-muted);
}

@media (prefers-color-scheme: light) {
  .adaptive-heading {
    color: var(--vt-c-black);
  }

  .adaptive-text {
    color: var(--vt-c-black-mute);
  }
}

@media (prefers-color-scheme: dark) {
  .adaptive-heading {
    color: var(--vt-c-white);
  }

  .adaptive-text {
    color: var(--vt-c-white-mute);
  }
}

.auth-message {
  padding: 0.75rem 1rem;
  border-radius: 0.375rem;
  font-weight: 500;
  margin: 0.5rem auto;
  max-width: 32rem;
}

.auth-message-info {
  color: var(--color-text);
  background-color: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.3);
}

.auth-message-error {
  color: var(--color-text);
  background-color: rgba(220, 38, 38, 0.1);
  border: 1px solid rgba(220, 38, 38, 0.3);
}
</style>
