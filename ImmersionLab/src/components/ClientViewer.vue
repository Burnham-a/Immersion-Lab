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
import { ref, watchEffect, onBeforeUnmount, markRaw, nextTick } from "vue";
import { useStore } from "@/stores/store-IL";
import {
  Viewer,
  DefaultViewerParams,
  SpeckleLoader,
  CameraController,
  SelectionExtension,
  UrlHelper,
} from "@speckle/viewer";
import * as THREE from "three";

// Store initialization
const store = useStore();

// Reactive variables
const viewerContainer = ref(null);
const viewer = ref(null);
const viewerInitialized = ref(false);
const selectedProject = ref(null);
const viewerBackgroundColor = ref("#ffffff");

// Track the currently selected design option
const currentOption = ref("Option1");

// Function to switch between design options
const switchDesignOption = (option) => {
  console.log("🔄 Switching to design option:", option);
  currentOption.value = option;

  if (!selectedProject.value) {
    console.warn("⚠️ No project selected! Skipping model loading.");
    return;
  }

  console.log("📌 Current project details:", selectedProject.value);
  loadModels();
};

// Cleanup before unmounting
onBeforeUnmount(() => {
  disposeViewer();
});

// Dispose viewer properly
const disposeViewer = async () => {
  if (viewer.value) {
    try {
      console.log("🗑️ Disposing viewer...");
      await viewer.value.dispose();
      viewer.value = null;
      viewerInitialized.value = false;
    } catch (err) {
      console.error("❌ Error disposing viewer:", err);
    }
  }
};

// Initialize Viewer
const initViewer = async () => {
  if (!viewerContainer.value || viewerInitialized.value) return;

  try {
    await disposeViewer();
    await nextTick(); // Ensure DOM updates

    console.log("🎥 Initializing viewer...");

    const viewerInstance = new Viewer(viewerContainer.value, {
      ...DefaultViewerParams,
      backgroundColor: new THREE.Color(viewerBackgroundColor.value),
    });

    await viewerInstance.init();
    viewer.value = markRaw(viewerInstance);
    viewer.value.createExtension(CameraController);
    viewer.value.createExtension(SelectionExtension);

    // viewerContainer.value.addEventListener("touchstart", () => {}, {
    //   passive: true,
    // });
    // viewerContainer.value.addEventListener("wheel", () => {}, {
    //   passive: true,
    // });

    viewerInitialized.value = true;
    console.log("✅ Viewer initialized successfully.");
  } catch (error) {
    console.error("❌ Error initializing viewer:", error.message, error.stack);

    viewerInitialized.value = false;
  }
};

// Load Model into Viewer
const loadModels = async () => {
  if (!selectedProject.value || !viewer.value) {
    console.warn("⚠️ No selected project or viewer not initialized.");
    return;
  }

  viewer.value.unloadAll();
  console.log("🗑️ Unloading previous models...");

  if (!selectedProject.value || !selectedProject.value.modelId) {
    console.error("❌ No valid model or project found.");
    return;
  }

  try {
    const modelId = selectedProject.value.modelId;

    if (!modelId) {
      console.error("❌ No valid model ID found.");
      return;
    }

    const modelUrl = `https://app.speckle.systems/projects/${selectedProject.value.id}/models/${modelId}`;
    console.log("🌍 Fetching Speckle model from:", modelUrl);

    let urls = [];
    try {
      urls = await UrlHelper.getResourceUrls(modelUrl);
      if (!urls || urls.length === 0) {
        throw new Error("No valid model URLs found.");
      }
    } catch (err) {
      console.error("❌ Error fetching model URLs:", err.message);
      return;
    }

    for (const url of urls) {
      console.log(`📦 Loading model from: ${url}`);
      const loader = new SpeckleLoader(
        viewer.value.getWorldTree(),
        url,
        store.authToken
      );

      await viewer.value.loadObject(loader, true);
      console.log(`✅ Successfully loaded model: ${modelId}`);
    }
  } catch (error) {
    console.error("❌ Error loading models:", error);
  }
};

// Watch for authentication & viewer initialization
watchEffect(() => {
  if (
    viewerContainer.value &&
    !viewerInitialized.value &&
    store.isAuthenticated
  ) {
    initViewer();
  }
});

// Watch for project selection & load model
watchEffect(() => {
  console.log("🔍 Watching for project selection...");

  if (!store.selectedProject) {
    console.warn("⚠️ No project selected in store.");
  } else {
    console.log("✅ Project detected:", store.selectedProject);
    selectedProject.value = store.selectedProject; // Ensures reactivity
    loadModels();
  }
});
</script>

<style scoped>
.viewer-container {
  width: 100%;
  height: 500px;
  border: 1px solid #ccc;
}

.error {
  color: red;
}
</style>
