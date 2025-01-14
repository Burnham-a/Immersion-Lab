<template>
  <header>
    <div class="wrapper">
      <h1>Step2</h1>
      <br />
      Move Up - W <br />
      Move Down - S <br />
      Move Left - A <br />
      Move Right - D <br />
      Orbit - Left Mouse Click <br />
    </div>
    <br />
  </header>

  <main>
    <canvas ref="canvasRef" style="width: 1000px; height: auto"></canvas>
  </main>
</template>

<script setup>
import initializeScene from "@/views/script.js";
import { onMounted, ref } from "vue";

const canvasRef = ref(null); // Reference for the canvas element

onMounted(() => {
  if (canvasRef.value) {
    initializeScene(canvasRef.value); // Pass the canvas element to the Three.js script
  }
});
</script>

<style scoped>
header {
  line-height: 1.5;
}

.logo {
  display: block;
  margin: 0 auto 2rem;
}

@media (min-width: 1024px) {
  header {
    display: flex;
    place-items: center;
    padding-right: calc(var(--section-gap) / 2);
    text-align: center;
  }

  .logo {
    margin: 0 2rem 0 0;
  }

  header .wrapper {
    display: flex;
    place-items: flex-start;
    flex-wrap: wrap;
  }

  h3 {
    font-size: 1.2rem;
    text-align: center;
  }
}
</style>
