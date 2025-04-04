<template>
  <div class="bg-white">
    <div class="px-6 py-24 sm:px-6 sm:py-32 lg:px-8">
      <div class="mx-auto max-w-2xl text-center justify-center">
        <img
          v-if="store.isAuthenticated"
          :src="store.user?.avatar"
          class="w-28 mx-auto rounded-full mb-8 shadow-lg shadow-blue-200 border-2 border-blue-500"
          alt=""
        />
        <h2 class="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
          {{ headline }}<br />Learn by doing it.
        </h2>
        <p class="mx-auto mt-6 max-w-xl text-lg leading-8 text-gray-600">
          The world runs on 3D: designers, engineers, hackers and entire
          organizations rely on us for interoperability, automation and
          collaboration to deliver better, together.
        </p>
        <div class="mt-10 flex items-center justify-center gap-x-6">
          <button
            v-if="store.isAuthenticated"
            @click="router.push('/streams')"
            class="rounded-md bg-blue-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            Get started
          </button>
          <button
            v-else
            @click="login"
            class="rounded-md bg-blue-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            Login with Speckle
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from "@/stores/store";
import { useRouter } from "vue-router";

const store = useAuthStore();
const router = useRouter();

const headline = store.isAuthenticated
  ? `Your first Speckle app, ${store.user?.name}`
  : "Your first Speckle app!";

// Add login function if redirectToSpeckleAuthPage doesn't exist in the store
function login() {
  // If your store has a different method for authentication, use that instead
  if (typeof store.login === "function") {
    store.login();
  } else {
    console.error("Login method not found in store");
    // Fallback - you may need to implement proper authentication here
    // or check your store implementation
  }
}
</script>
