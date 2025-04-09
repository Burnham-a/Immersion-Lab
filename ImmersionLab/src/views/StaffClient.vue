<template>
  <div class="home-container">
    <h1 class="text-4xl font-extrabold title-text mb-6 text-shadow">
      Welcome to the Immersion Lab
    </h1>
    <div class="button-container">
      <!-- Button for Staff -->
      <button
        @click="goToStaffHome"
        class="bg-blue-600 hover:bg-blue-800 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition duration-300"
      >
        Staff Login
      </button>

      <!-- Button for Clients -->
      <button
        @click="goToClientApp"
        class="bg-green-600 hover:bg-green-800 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition duration-300"
      >
        Client Login
      </button>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from "vue-router";
import { useImmersionLabStore } from "@/stores/store-IL";

const router = useRouter();
const store = useImmersionLabStore();

const goToStaffHome = async () => {
  try {
    // Reset any authentication state if needed
    if (store.isAuthenticated) {
      await store.logout();
    }

    await router.push({ name: "ImmersionLab" });
  } catch (error) {
    console.error("Navigation error:", error);
    // Handle the error appropriately
  }
};

const goToClientApp = async () => {
  try {
    // Reset any authentication state if needed
    if (store.isAuthenticated) {
      await store.logout();
    }

    await router.push({ name: "ClientApp" });
  } catch (error) {
    console.error("Navigation error:", error);
    // Handle the error appropriately
  }
};
</script>

<style scoped>
.home-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100vh;
}

.button-container {
  display: flex;
  gap: 20px;
  margin-top: 30px;
}

.text-shadow {
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
}

.adaptive-heading {
  color: var(--inverse-color);
}

@media (prefers-color-scheme: light) {
  .adaptive-heading {
    color: var(--vt-c-black);
  }
}

@media (prefers-color-scheme: dark) {
  .adaptive-heading {
    color: var(--vt-c-white);
  }
}
</style>
