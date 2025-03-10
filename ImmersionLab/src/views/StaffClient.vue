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

const router = useRouter();

// Go to the staff home page (current home page)
const goToStaffHome = () => {
  router.push({ name: "ImmersionLab" }); // Assuming 'StaffHome' is the name of your existing home route for staff
};

// Go to the client page, where the project number will be entered
const goToClientApp = () => {
  router.push({ name: "ClientApp" }); // Assuming 'ClientHome' will be your new page for clients
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
