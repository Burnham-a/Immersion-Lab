<!-- src/components/LoadingSpinner.vue -->
<template>
  <div class="flex justify-center items-center w-full h-full">
    <div
      class="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500 border-solid"
    ></div>
  </div>
</template>

<style scoped>
@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.animate-spin {
  animation: spin 1s linear infinite;
}
</style>
