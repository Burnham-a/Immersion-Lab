<template>
  <div class="client-viewer">
    <div class="viewer-container">
      <div
        id="viewer-container"
        ref="viewerContainer"
        class="model-viewer"
      ></div>
      <div v-if="loading" class="loading-overlay">
        <div class="loading-spinner"></div>
        <div class="loading-text">Loading Model...</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from "vue";
import { Viewer } from "@speckle/viewer";

const props = defineProps({
  projectData: {
    type: Object,
    required: true,
  },
  selectedDesignOption: {
    type: String,
    default: "Option1",
  },
  backgroundColor: {
    type: String,
    default: "#ffffff",
  },
});

const viewerContainer = ref(null);
const viewer = ref(null);
const loading = ref(false);

// Initialize the viewer
const initViewer = async () => {
  if (!viewerContainer.value) return;

  if (viewer.value) {
    // Dispose existing viewer if needed
    viewer.value.dispose();
    viewer.value = null;
  }

  try {
    // Create a new viewer
    viewer.value = new Viewer(viewerContainer.value, {
      showStats: false,
      environmentSettings: {
        backgroundColor: props.backgroundColor || "#ffffff",
      },
    });

    // Wait for viewer to initialize
    await viewer.value.init();
    console.log("Viewer initialized");

    // Load models
    await loadModels();
  } catch (error) {
    console.error("Error initializing viewer:", error);
  }
};

// Load the models based on selected design option
const loadModels = async () => {
  if (!viewer.value || !props.projectData) return;

  loading.value = true;

  try {
    // Clear existing objects
    await viewer.value.unloadAll();

    const designOptions = props.projectData.designOptions;
    let modelsToLoad = [];

    if (props.selectedDesignOption === "Option1" && designOptions.Option1) {
      modelsToLoad = designOptions.Option1;
    } else if (
      props.selectedDesignOption === "Option2" &&
      designOptions.Option2
    ) {
      modelsToLoad = designOptions.Option2;
    } else if (props.selectedDesignOption === "Both") {
      modelsToLoad = [
        ...(designOptions.Option1 || []),
        ...(designOptions.Option2 || []),
      ];
    }

    if (modelsToLoad.length === 0) {
      console.warn("No models found for the selected design option");
      return;
    }

    // Load each model
    for (const model of modelsToLoad) {
      if (model.id) {
        console.log(`Loading model: ${model.id}`);
        await viewer.value.loadObject(model.id);
      }
    }

    // Center view on loaded objects
    viewer.value.centerOnGeometry();
  } catch (error) {
    console.error("Error loading models:", error);
  } finally {
    loading.value = false;
  }
};

// Update the background color
const updateBackgroundColor = (color) => {
  if (!viewer.value) return;

  try {
    viewer.value.setBackgroundColor(color);
  } catch (error) {
    console.error("Error updating background color:", error);
  }
};

// Export the method to be called from parent
defineExpose({
  updateBackgroundColor,
});

// Watch for changes in selected design option
watch(
  () => props.selectedDesignOption,
  async () => {
    if (viewer.value) {
      await loadModels();
    }
  }
);

// Watch for background color changes from props
watch(
  () => props.backgroundColor,
  (newColor) => {
    updateBackgroundColor(newColor);
  }
);

// Setup and cleanup
onMounted(() => {
  initViewer();
});

onBeforeUnmount(() => {
  if (viewer.value) {
    viewer.value.dispose();
    viewer.value = null;
  }
});
</script>

<style scoped>
.client-viewer {
  width: 100%;
  margin: 0 auto;
}

.viewer-container {
  position: relative;
  width: 100%;
  height: 500px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #ccc;
}

.model-viewer {
  width: 100%;
  height: 100%;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.5);
  color: white;
  z-index: 10;
}

.loading-spinner {
  border: 5px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top: 5px solid white;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin-bottom: 10px;
}

.loading-text {
  font-size: 16px;
  font-weight: 500;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>
