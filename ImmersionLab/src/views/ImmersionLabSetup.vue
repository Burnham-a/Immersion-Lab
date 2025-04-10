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
          <!-- Add a button for debugging -->
          <button
            @click="debugViewer"
            class="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300 ml-2"
          >
            Debug
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

      <!-- Project Save Component -->
      <ProjectSaveComponent
        ref="projectSaveComponent"
        :selected-project="selectedProject || undefined"
        :design-options="designOptions"
        :viewer-background-color="viewerBackgroundColor"
        v-model:selected-design-option="selectedDesignOption"
        :current-model="currentModel"
        @update:selected-design-option="handleDesignOptionChange"
      />
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
import { ref, computed, watchEffect, onMounted, nextTick } from "vue";
import { useRoute, useRouter } from "vue-router";

// Import the newly created components
import AuthenticationComponent from "@/components/AuthenticationComponent.vue";
import UserProfileComponent from "@/components/UserProfileComponent.vue";
import ProjectSearchComponent from "@/components/ProjectSearchComponent.vue";
import ProjectDetailsComponent from "@/components/ProjectDetailsComponent.vue";
import DesignOptionsComponent from "@/components/DesignOptionsComponent.vue";
import ViewerComponent from "@/components/ViewerComponent.vue";
import ProjectSaveComponent from "@/components/ProjectSaveComponent.vue";

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
const viewerComponent = ref<InstanceType<typeof ViewerComponent> | null>(null);
const viewerInitialized = ref(false);
const projectSaveComponent = ref<InstanceType<
  typeof ProjectSaveComponent
> | null>(null);
const selectedModel = ref<{ name: string; id: string } | null>(null);
const currentModel = computed(() => selectedModel.value || undefined);

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

    // Call the authenticate method with better error handling
    const authResult = await store.authenticate().catch((error) => {
      console.error("Auth method exception:", error);
      // Return null to indicate authentication failure but don't throw
      // to allow the login flow to continue
      return null;
    });

    // Check if authentication was successful
    if (store.isAuthenticated && store.speckle.token) {
      console.log("Authentication successful, fetching projects...");
      await fetchProjects();
    } else {
      console.log("Authentication in progress or redirected to login page");
      // Don't show an error since the user might just be going through the auth flow
      // We'll only show an error if there was an actual exception
      if (!authResult && !store.speckle.token) {
        authError.value =
          "Authentication process started. Please complete the login in the opened window.";
      }
    }
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

const clearAuthError = () => {
  authError.value = undefined;
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

const handleProjectSelected = async (project: StreamGridItemProps) => {
  console.log("Project selected:", project);

  try {
    // First reset the current selection to ensure clean state
    designOptions.value = {
      Option1: [],
      Option2: [],
    };

    const models =
      project.models && project.models.items ? project.models : { items: [] };

    selectedProject.value = {
      ...project,
      models: models,
    };

    // Initialize the viewer after project selection
    await nextTick();

    // Initialize viewer explicitly after DOM updates
    if (viewerComponent.value) {
      console.log("Initializing viewer after project selection");
      await viewerComponent.value.initializeViewer();
      viewerInitialized.value = true;
    }
  } catch (err) {
    console.error("Error handling project selection:", err);
  }
};

const updateSearchQuery = (query: string) => {
  searchQuery.value = query;
};

const viewDesignOption = async (option: string) => {
  console.log(`Viewing design option: ${option}`);
  selectedDesignOption.value = option as "Option1" | "Option2" | "Both";

  if (viewerComponent.value && viewerInitialized.value) {
    await viewerComponent.value.loadModels();
  }
};

// Update the addModelToDesignOption function
const addModelToDesignOption = async (model: any, option: string) => {
  console.log(`Adding model to ${option}:`, model);

  try {
    // Clone and update the design options
    const updatedOptions = { ...designOptions.value };

    if (option === "Option1") {
      // Make sure the model is actually added to the array
      updatedOptions.Option1 = [{ ...model }];
      console.log("Updated Option1 models:", updatedOptions.Option1);
    } else if (option === "Option2") {
      updatedOptions.Option2 = [{ ...model }];
      console.log("Updated Option2 models:", updatedOptions.Option2);
    }

    // Update the design options with the new references
    designOptions.value = updatedOptions;

    // Set selected option
    selectedDesignOption.value = option as "Option1" | "Option2" | "Both";

    // Store the selected model
    selectedModel.value = { ...model }; // Create a new object to ensure reactivity

    // After updating the model, print the full state to verify
    console.log("Current design options state:", {
      Option1Count: designOptions.value.Option1.length,
      Option2Count: designOptions.value.Option2.length,
      CurrentOption: selectedDesignOption.value,
    });

    // Ensure viewer is initialized with better error handling
    if (viewerComponent.value) {
      if (!viewerInitialized.value) {
        try {
          await viewerComponent.value.initializeViewer();
          viewerInitialized.value = true;
        } catch (err) {
          console.error("Error initializing viewer:", err);
        }
      }

      // Try to load models with proper error handling
      try {
        await viewerComponent.value.loadModels();
      } catch (error) {
        console.error("Error loading models:", error);
      }
    }
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

  try {
    if (!viewerComponent.value) {
      console.log("Viewer component not available");
      return;
    }

    // First check if viewer is actually ready before applying color
    viewerComponent.value
      .isViewerReady()
      .then((isReady) => {
        if (isReady && viewerComponent.value?.updateViewerBackgroundColor) {
          try {
            console.log("Viewer is ready, applying background color now");
            viewerComponent.value.updateViewerBackgroundColor(
              viewerBackgroundColor.value
            );
          } catch (error) {
            console.error("Error in updateViewerBackgroundColor call:", error);
          }

          // Schedule additional attempts after different delays to handle edge cases
          // This helps with race conditions in rendering cycles
          const retryDelays = [100, 500, 1000];

          retryDelays.forEach((delay) => {
            setTimeout(() => {
              try {
                if (
                  viewerComponent.value &&
                  viewerComponent.value.updateViewerBackgroundColor
                ) {
                  console.log(`Attempting color apply retry after ${delay}ms`);
                  viewerComponent.value.updateViewerBackgroundColor(
                    viewerBackgroundColor.value
                  );
                }
              } catch (error) {
                console.error(
                  `Error in delayed background color update (${delay}ms):`,
                  error
                );
              }
            }, delay);
          });
        } else {
          console.log("Viewer not ready yet, postponing color application");

          // Schedule a delayed attempt when the viewer might be ready
          setTimeout(() => {
            if (viewerComponent.value) {
              viewerComponent.value
                .isViewerReady()
                .then((isReady) => {
                  if (
                    isReady &&
                    viewerComponent.value?.updateViewerBackgroundColor
                  ) {
                    console.log(
                      "Viewer is ready now, applying delayed background color"
                    );
                    try {
                      viewerComponent.value.updateViewerBackgroundColor(
                        viewerBackgroundColor.value
                      );
                    } catch (error) {
                      console.error(
                        "Error in delayed updateViewerBackgroundColor call:",
                        error
                      );
                    }
                  }
                })
                .catch((err) => {
                  console.error("Error in delayed viewer ready check:", err);
                });
            }
          }, 1500);
        }
      })
      .catch((err) => {
        console.error("Error checking if viewer is ready:", err);
      });
  } catch (error) {
    console.error("Error updating background color:", error);
  }
};

const resetBackgroundColor = () => {
  viewerBackgroundColor.value = "#ffffff";
  updateBackgroundColor();
};

// Add the debug function
const debugViewer = () => {
  if (viewerComponent.value) {
    viewerComponent.value.debugViewerStructure();
  } else {
    console.log("No viewer component to debug");
  }
};

// Add a handler for design option changes
const handleDesignOptionChange = (option: "Option1" | "Option2" | "Both") => {
  console.log("Design option changed from ProjectSaveComponent:", option);
  selectedDesignOption.value = option;

  // If the viewer is initialized, update it to reflect the new option
  if (viewerComponent.value && viewerInitialized.value) {
    nextTick(() => {
      viewerComponent.value?.loadModels().catch((err) => {
        console.error("Error loading models after design option change:", err);
      });
    });
  }
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
  }
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
