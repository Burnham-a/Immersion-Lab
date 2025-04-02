<template>
  <div class="home-container">
    <h1 class="text-4xl font-extrabold text-gray-900 mb-6">
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

const goToStaffHome = () => {
  router.push({ name: "ImmersionLab" }); // Updated to match the correct route name
};

const goToClientApp = () => {
  router.push({ name: "ClientApp" });
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
</style>
