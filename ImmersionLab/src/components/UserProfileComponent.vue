<template>
  <div
    v-if="user"
    class="flex items-center justify-between p-4 bg-gray-100 rounded-lg"
  >
    <div class="flex items-center gap-4">
      <img
        :src="user.avatar"
        alt="avatar"
        width="50"
        height="50"
        class="rounded-full"
      />
      <div class="text-left">
        <div class="font-semibold">{{ user.name }}</div>
      </div>
    </div>
    <button
      @click="handleLogoutClick"
      class="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-300"
    >
      Logout
    </button>
  </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits } from "vue";

// Define props for the component
const props = defineProps({
  user: {
    type: Object,
    required: true,
  },
});

// Define emits for the component
const emit = defineEmits(["logout"]);

const handleLogoutClick = () => {
  console.log("Logout button clicked in UserProfileComponent");
  emit("logout");
};
</script>
