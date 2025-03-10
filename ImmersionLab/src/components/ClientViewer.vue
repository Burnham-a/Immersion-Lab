<template>
  <div class="client-viewer">
    <!-- Design Option Controls -->
    <div class="design-options-controls mb-4">
      <button
        v-for="option in ['Option1', 'Option2', 'Both']"
        :key="option"
        @click="switchDesignOption(option)"
        :class="[
          'px-4 py-2 mx-2 rounded-lg font-medium transition',
          currentOption === option
            ? 'bg-orange-500 text-white'
            : 'bg-gray-200 text-gray-800 hover:bg-gray-300',
        ]"
      >
        {{ option }}
      </button>
    </div>

    <!-- Viewer Container -->
    <div ref="viewerContainer" class="viewer-container"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from "vue";
import {
  Viewer,
  DefaultViewerParams,
  SpeckleLoader,
  UrlHelper,
  WorldTree,
} from "@speckle/viewer";

const props = defineProps({
  projectData: {
    type: Object,
    required: true,
  },
});

const viewerContainer = ref(null);
const viewer = ref(null);
const currentOption = ref("Option1");

// Load models based on selected design option
const loadModels = async (option) => {
  if (!viewer.value) return;

  try {
    // Ensure viewer is initialized and supports the methods you're calling
    if (typeof viewer.value.setWorldTree === "function") {
      // Clear existing models
      const worldTree = new WorldTree();
      viewer.value.setWorldTree(worldTree);
    } else {
      console.warn("Viewer does not support setWorldTree method.");
    }

    // Determine which models to load based on selected option
    let modelsToLoad = [];
    if (option === "Both") {
      modelsToLoad = [
        ...props.projectData.designOptions.Option1,
        ...props.projectData.designOptions.Option2,
      ];
    } else {
      modelsToLoad = props.projectData.designOptions[option];
    }

    for (const model of modelsToLoad) {
      try {
        const urls = await UrlHelper.getResourceUrls(
          `https://app.speckle.systems/projects/${props.projectData.projectId}/models/${model.id}`
        );

        for (const url of urls) {
          const loader = new SpeckleLoader(
            viewer.value.worldTree, // assuming worldTree is available after viewer initialization
            url,
            props.projectData.authToken
          );
          await viewer.value.loadObject(loader, true);
          console.log(`Model ${model.name} loaded successfully`);
        }
      } catch (err) {
        console.error(`Error loading model ${model.name}:`, err);
      }
    }
  } catch (error) {
    console.error("Error loading models:", error);
  }
};

// Switch the design option and reload models
const switchDesignOption = async (option) => {
  currentOption.value = option;
  await loadModels(option);
};

// Initialize the viewer with provided settings and models
const initViewer = async () => {
  if (!viewerContainer.value) return;

  try {
    const backgroundColor =
      props.projectData.viewerSettings?.backgroundColor || "#ffffff"; // Default to white

    viewer.value = new Viewer(viewerContainer.value, {
      ...DefaultViewerParams,
      backgroundColor,
      verbose: true,
    });

    await viewer.value.init(); // Initialize viewer

    // Proceed to load models after viewer initialization
    await loadModels(currentOption.value);
  } catch (error) {
    console.error("Error initializing viewer:", error);
    throw error;
  }
};

onMounted(async () => {
  await initViewer();
});

onBeforeUnmount(() => {
  if (viewer.value && typeof viewer.value.dispose === "function") {
    viewer.value.dispose();
  }
});
</script>

<style scoped>
.client-viewer {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.design-options-controls {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
}

.viewer-container {
  width: 100%;
  height: 500px;
  background-color: #f0f0f0;
  border: 1px solid #ccc;
  border-radius: 0.5rem;
}
</style>
