<template>
  <div class="mt-4">
    <button
      v-if="!isAuthenticated"
      @click="handleAuthClick"
      class="bg-blue-600 hover:bg-blue-800 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition duration-300"
    >
      Authenticate with Speckle
    </button>
  </div>
  <div v-if="!isAuthenticated" class="mt-6 text-gray-600">
    Please authenticate first to access projects.
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useImmersionLabStore } from "@/stores/store-IL";

const store = useImmersionLabStore();
const isAuthenticated = computed(() => store.isAuthenticated);

// Emit authentication event to parent
const emit = defineEmits(["auth-click"]);

const handleAuthClick = () => {
  console.log("Auth button clicked in AuthenticationComponent");
  emit("auth-click");
};
</script>
