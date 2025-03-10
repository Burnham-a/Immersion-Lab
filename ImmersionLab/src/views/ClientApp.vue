<template>
  <div class="client-home">
    <h1 class="text-3xl font-bold mb-6">Enter Project Number</h1>
    <input
      v-model="projectNumber"
      type="text"
      placeholder="Enter project number"
      class="input-field"
    />
    <button
      @click="goToProjectViewer"
      :disabled="!projectNumber"
      class="bg-green-600 hover:bg-green-800 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition duration-300"
    >
      View Project
    </button>
    <div v-if="errorMessage" class="text-red-600 mt-4">{{ errorMessage }}</div>
    <ClientViewer v-if="projectData" :projectData="projectData" class="mt-6" />
  </div>
</template>

<script setup>
import { ref } from "vue";
import ClientViewer from "@/components/ClientViewer.vue";

const projectNumber = ref("");
const errorMessage = ref(null);
const projectData = ref(null);

const goToProjectViewer = async () => {
  if (projectNumber.value) {
    const storedData = localStorage.getItem(projectNumber.value);
    if (storedData) {
      try {
        projectData.value = JSON.parse(storedData);
        errorMessage.value = null;
      } catch (error) {
        errorMessage.value = "Invalid project data format";
        console.error("Error parsing project data:", error);
      }
    } else {
      errorMessage.value =
        "Project not found. Please check the project number.";
    }
  }
};
</script>

<style scoped>
.client-home {
  text-align: center;
  padding: 40px;
}

.input-field {
  padding: 10px;
  font-size: 16px;
  width: 250px;
  margin-bottom: 20px;
  border-radius: 5px;
  border: 1px solid #ccc;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
