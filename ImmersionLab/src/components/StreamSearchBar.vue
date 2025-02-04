<template>
  <div class="relative mt-2 rounded-md shadow-sm">
    <div
      class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"
    ></div>
    <input
      class="block w-full rounded-md border-0 py-4 pl-10 text-white-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-500 sm:text-sm sm:leading-6 shadow-lg shadow-blue-200"
      v-model="searchQuery"
      type="search"
      placeholder="Search for a project"
    />
  </div>
</template>

<script setup lang="ts">
// import { MagnifyingGlassIcon } from "@heroicons/vue/20/solid";
import { defineProps, defineEmits, computed } from "vue";

const props = defineProps({
  modelValue: String,
});

const emit = defineEmits(["update:modelValue"]);

const searchQuery = computed({
  get: () => props.modelValue,
  set: (value) => emit("update:modelValue", value),
});
</script>
