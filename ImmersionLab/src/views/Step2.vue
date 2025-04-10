<template>
  <main>
    <h3>Step 2</h3>
    <div class="viewer-container">
      <canvas ref="canvasRef"></canvas>
    </div>

    <div class="controls-info">
      <h4>Controls:</h4>
      <div class="controls-grid">
        <div class="control-group">
          <h5>Movement</h5>
          <p>Move Forward - W</p>
          <p>Move Backward - S</p>
          <p>Move Left - A</p>
          <p>Move Right - D</p>
          <p>Move Up - E</p>
          <p>Move Down - Q</p>
        </div>
        <div class="control-group">
          <h5>Camera</h5>
          <p>Orbit - Left Mouse Click</p>
          <p>Pan - Right Mouse Click</p>
          <p>Zoom - Mouse Wheel</p>
        </div>
      </div>
    </div>
  </main>
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

.viewer-container {
  width: 100%;
  margin: 1rem 0 2rem 0;
  position: relative;
}

canvas {
  width: 100%;
  height: 600px;
  display: block;
  background-color: #f0f0f0;
  border-radius: 8px;
}

.controls-info {
  margin-top: 1rem;
  padding: 1rem;
  background-color: rgba(240, 240, 240, 0.8);
  border-radius: 8px;
}

.controls-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
}

.control-group h5 {
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: var(--title-color);
}

.control-group p {
  margin: 0.3rem 0;
  font-size: 0.9rem;
}

h4 {
  margin-top: 0;
  margin-bottom: 1rem;
}

h3 {
  font-size: 1.2rem;
  font-weight: 500;
  margin-bottom: 0.4rem;
  color: var(--title-color);
}

@media (prefers-color-scheme: light) {
  h3 {
    color: var(--title-color);
  }
}
</style>
