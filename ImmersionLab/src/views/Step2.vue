<template>
  <main>
    <h3>Step 2</h3>
    <br />
    Move Forward - W <br />
    Move Backward - S <br />
    Move Up - E <br />
    Move Down - Q <br />
    Move Left - A <br />
    Move Right - D <br />
    Orbit - Left Mouse Click <br />
    Pan - Right Mouse Click <br />
    Zoom - Mouse Wheel <br />
  </main>
  <br />
  <canvas ref="canvasRef" style="width: 1000px; height: auto"></canvas>
</template>

<script setup>
import initializeScene from "@/components/3jsScript.js";
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
}
</style>

<style scoped>
h3 {
  font-size: 1.2rem;
  font-weight: 500;
  margin-bottom: 0.4rem;
  color: var(--color-heading);
}
</style>
