<template>
  <header class="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
    <h1 class="text-3xl font-bold leading-tight tracking-tight text-gray-900">
      Step 3: Choose a Stream
    </h1>
  </header>

  <div class="flex justify-center mt-6">
    <button
      @click="redirectToSpeckleAuthPage"
      class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
    >
      Authenticate with Speckle
    </button>
  </div>

  <main
    v-if="isAuthenticated"
    class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col space-y-8"
  >
    <StreamSearchBar v-model="searchQuery" />
    <StreamGrid :streams="streams" :error="error" :fetching="fetching" />
  </main>

  <div v-else class="flex justify-center mt-6">
    <p>Please authenticate first to access streams.</p>
  </div>
</template>

<script setup lang="ts">
import StreamGrid from "@/components/StreamGrid.vue";
import StreamSearchBar from "@/components/StreamSearchBar.vue";
import type { StreamGridItemProps } from "@/types/StreamGridItemProps";
import { streamsQuery } from "@/graphql/queries/streams";
import { useQuery } from "@urql/vue";
import { ref, computed } from "vue";
import { useStore } from "@/stores/store"; // Ensure correct import path

const redirectToSpeckleAuthPage = () => {
  store.redirectToSpeckleAuthPage();
};

const searchQuery = ref("");
const store = useStore();

const { data, error, fetching } = useQuery({
  query: streamsQuery,
  variables: { searchQuery },
});

const streams = computed<StreamGridItemProps[]>(() => {
  if (!data.value) return [];
  return data.value.streams.items.map((stream: any) => ({
    id: stream.id,
    name: stream.name,
    commitsCount: stream.commits.totalCount,
  }));
});

const isAuthenticated = computed(() => store.isAuthenticated); // Add computed property for authentication state
</script>
