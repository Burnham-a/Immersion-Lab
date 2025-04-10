<script setup>
defineProps({
  msg: {
    type: String,
    required: true,
  },
});
</script>

<template>
  <div class="greetings">
    <h1 class="green">{{ msg }}</h1>
    <h3 class="subtitle">The next evolution of your design</h3>
  </div>
</template>

<style scoped>
h1 {
  font-weight: 700;
  font-size: 2.5rem; /* Reduced size */
  position: relative;
  margin-bottom: 0.5rem;
  background: linear-gradient(
    45deg,
    #ff9900,
    #ff6600
  ); /* Changed to orange gradient */
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

h3 {
  font-size: 1.2rem; /* Reduced size */
  color: var(--title-color); /* Use theme-based color for contrast */
  font-weight: 400;
  margin-top: 0.5rem;
}

.subtitle {
  opacity: 0.8;
  color: var(--title-color); /* Corrected to use title color for subtitle */
}

.greetings {
  padding: 1.5rem 1rem; /* Adjusted padding */
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center; /* Ensures proper centering */
}

@media (min-width: 1024px) {
  h1 {
    font-size: 3rem; /* Slightly smaller for large screens */
  }

  h3 {
    font-size: 1.4rem; /* Slightly smaller for large screens */
  }
}

:root {
  --title-color: #000000; /* Default light theme title color */
  --title-color-contrast: #ffffff; /* Default light theme subtitle contrast */
}

[data-theme="dark"] {
  --title-color: #ffffff; /* Dark theme title color */
  --title-color-contrast: #ffffff; /* Corrected to use contrast color for light text */
}
</style>
