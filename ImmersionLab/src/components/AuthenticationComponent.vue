<template>
  <div class="authentication-component">
    <button
      @click="$emit('auth-click')"
      class="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
      :disabled="isAuthenticating"
    >
      <span v-if="isAuthenticating">Authenticating...</span>
      <span v-else>Sign In with Speckle</span>
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

defineProps({
  isAuthenticating: {
    type: Boolean,
    default: false,
  },
  authError: {
    type: String,
    default: null,
  },
});

defineEmits(["auth-click"]);
</script>
