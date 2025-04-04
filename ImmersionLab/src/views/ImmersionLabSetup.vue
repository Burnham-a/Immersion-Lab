<template>
  <main
    class="max-w-4xl mx-auto py-10 px-6 sm:px-8 lg:px-10 text-center bg-white shadow-xl rounded-2xl"
  >
    <!-- Page title -->
    <h1 class="text-4xl font-extrabold text-gray-800 mb-6">
      Immersion Lab: Choose a Project
    </h1>
    <br />

    <!-- Authentication Component -->
    <AuthenticationComponent @auth-click="handleAuthClick" />

    <!-- Only show the following section if the user is authenticated -->
    <div v-if="isAuthenticated" class="mt-10 space-y-8">
      <!-- User Profile Component -->
      <UserProfileComponent :user="user" @logout="handleLogout" />

      <!-- Project Search Component -->
      <div>
        <ProjectSearchComponent
          :projects="filteredProjects"
          :is-loading-projects="isLoadingProjects"
          :error-message="errorMessage"
          @search-query-change="updateSearchQuery"
          @project-selected="handleProjectSelected"
        />
        <p class="text-sm text-gray-500 mt-2 text-right">
          {{
            searchQuery.length > 0
              ? `Showing ${filteredProjects.length} of ${projects.length} projects`
              : `Total projects: ${projects.length}`
          }}
        </p>
      </div>
      <br />

      <!-- Design Options Component -->
      <DesignOptionsComponent
        :selected-design-option="selectedDesignOption"
        v-model:viewer-background-color="viewerBackgroundColor"
        :design-options="designOptions"
        @select-design-option="selectDesignOption"
        @view-design-option="viewDesignOption"
      />
      <br />

      <!-- Project Details Component -->
      <ProjectDetailsComponent
        :selected-project="selectedProject"
        :design-options="designOptions"
        @add-model-to-design-option="addModelToDesignOption"
      />

      <!-- Viewer Component -->
      <ViewerComponent
        v-if="selectedProject"
        ref="viewerComponent"
        :selected-project="selectedProject"
        :selected-design-option="selectedDesignOption"
        :design-options="designOptions"
        :viewer-background-color="viewerBackgroundColor"
      />

      <!-- Project Save Component -->
      <ProjectSaveComponent
        :selected-project="selectedProject"
        :design-options="designOptions"
        :viewer-background-color="viewerBackgroundColor"
        :selected-design-option="selectedDesignOption"
      />
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

// Add error handling utility
import { useImmersionLabStore } from "@/stores/store-IL";
import { StreamGridItemProps } from "@/types/StreamGridItemProps";

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
const selectedProject = ref<{
  name: string;
  id: string;
  models?: { items: any[] };
} | null>(null);
const errorMessage = ref<string | null>(null);
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

// Add filteredProjects computed property to only show projects when there's a search query
const filteredProjects = computed(() => {
  if (!searchQuery.value) return []; // Return empty array when no search query
  return projects.value.filter((project) =>
    project.name.toLowerCase().includes(searchQuery.value.toLowerCase())
  );
});

// GraphQL Query
const { executeQuery, data, error } = useQuery({
  query: projectsQuery,
  requestPolicy: "network-only",
  context: {
    fetchOptions: {
      headers: { Authorization: `Bearer ${store.speckle.token ?? ""}` },
    },
  },
  pause: true, // Pause query by default
});

// Authentication handling
const handleAuthClick = async () => {
  try {
    await store.authenticate();
    if (store.isAuthenticated) {
      await fetchProjects();
    }
  } catch (error) {
    console.error("Authentication error:", error);
    errorMessage.value = "Authentication failed. Please try again.";
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
  if (!store.isAuthenticated) return;

  try {
    isLoadingProjects.value = true;
    errorMessage.value = null;

    await executeQuery();
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
    if (!project || !project.id) {
      console.error("Invalid project data:", project);
      errorMessage.value = "Invalid project data";
      return;
    }

    // First reset the current selection to ensure clean state
    designOptions.value = {
      Option1: [],
      Option2: [],
    };

    // Ensure models property is always correctly formatted
    const models = project.models?.items?.length
      ? { items: project.models.items }
      : { items: [] };

    selectedProject.value = {
      ...project,
      name: project.name || "Unnamed Project",
      id: project.id,
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
    errorMessage.value = "Error selecting project";
  }
};

const updateSearchQuery = (query: string) => {
  searchQuery.value = query;
};

// Design options handling
const selectDesignOption = (option: string) => {
  selectedDesignOption.value = option as "Option1" | "Option2" | "Both";
};

const viewDesignOption = async (option: string) => {
  console.log(`Viewing design option: ${option}`);
  selectedDesignOption.value = option as "Option1" | "Option2" | "Both";

  if (viewerComponent.value && viewerInitialized.value) {
    await viewerComponent.value.loadModels();
  }
};

const addModelToDesignOption = async (model: any, option: string) => {
  console.log(`Adding model to ${option}:`, model);

  // Validate model input
  if (!model || !model.id || !model.name) {
    console.error("Invalid model data:", model);
    errorMessage.value = "Invalid model data provided";
    return;
  }

  try {
    // Clone and update the design options with validated model
    const updatedOptions = { ...designOptions.value };
    const validatedModel = {
      id: model.id,
      name: model.name,
      // Add any other required properties for the model
    };

    if (option === "Option1") {
      updatedOptions.Option1 = [validatedModel];
    } else if (option === "Option2") {
      updatedOptions.Option2 = [validatedModel];
    }

    // Update the design options
    designOptions.value = updatedOptions;

    // Set selected option
    selectedDesignOption.value = option as "Option1" | "Option2" | "Both";

    // Ensure viewer is initialized
    if (viewerComponent.value) {
      if (!viewerInitialized.value) {
        await viewerComponent.value.initializeViewer();
        viewerInitialized.value = true;
      }

      // Add a small delay to ensure state is updated
      setTimeout(async () => {
        try {
          if (viewerComponent.value) {
            await viewerComponent.value.loadModels();
          }
        } catch (error) {
          console.error("Error loading models:", error);
          errorMessage.value = "Failed to load models. Please try again.";
        }
      }, 100);
    }
  } catch (err) {
    console.error("Error adding model to design option:", err);
    errorMessage.value = "Failed to add model to design option";
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
      console.log(`Projects loaded: ${projects.value.length}`);
    }
  } catch (err) {
    console.error("Error processing projects data:", err);
    errorMessage.value = "An error occurred while processing project data.";
  }
});

// Initialize the component
onMounted(async () => {
  // Check if already authenticated and fetch projects if needed
  if (store.isAuthenticated) {
    await fetchProjects();
  }
});
</script>
