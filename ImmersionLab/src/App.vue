<script setup lang="ts">
import { RouterLink, RouterView, useRoute, useRouter } from "vue-router";
import HelloWorld from "./components/HelloWorld.vue";
import { onMounted, provide, ref, watch } from "vue";

const route = useRoute();
const router = useRouter();

// Create a reactive reference to track when components should reset their state
const resetTrigger = ref(0);

// Theme state (light or dark)
const theme = ref(localStorage.getItem("theme") || "light");

// Function to toggle between light and dark themes
const toggleTheme = () => {
  theme.value = theme.value === "light" ? "dark" : "light";
  localStorage.setItem("theme", theme.value);
  applyTheme();
};

// Apply the theme to the document
const applyTheme = () => {
  document.documentElement.setAttribute("data-theme", theme.value);
};

// Apply theme on component mount
onMounted(() => {
  applyTheme();
});

// Function to reset component states without page refresh
const resetComponentStates = () => {
  // Increment to trigger watchers in components
  resetTrigger.value++;
};

// Provide the reset trigger to child components
provide("resetTrigger", resetTrigger);

// Provide the reset function to child components
provide("resetComponentStates", resetComponentStates);

// Provide theme and toggle function to child components
provide("theme", theme);
provide("toggleTheme", toggleTheme);

// Listen for navigation and reset states when route changes
router.beforeEach((to, from, next) => {
  if (from.path !== to.path) {
    resetComponentStates();
  }
  next();
});
</script>

<template>
  <header>
    <img
      alt="Vue logo"
      class="logo"
      src="@/assets/Logo_IL.svg"
      width="125"
      height="125"
    />

    <div class="wrapper">
      <!-- Conditionally render HelloWorld component -->
      <HelloWorld
        v-if="route.path !== '/StaffClient'"
        msg="Immersion Lab App"
      />

      <nav>
        <!-- <div v-if="user">
          <div>{{ user.name }}</div>
          <img :src="user.avatar" alt="avatar" width="50" height="50" />
        </div> -->
        <RouterLink to="/">Home</RouterLink>
        <RouterLink to="/Step1">Step1</RouterLink>
        <RouterLink to="/Step2">Step2</RouterLink>
        <RouterLink to="/Step3">Step3</RouterLink>
        <RouterLink to="/StaffClient">Immersion Lab App</RouterLink>
        <button @click="toggleTheme" class="theme-toggle">
          {{ theme === "light" ? "🌙" : "☀️" }}
        </button>
      </nav>
    </div>
  </header>

  <!-- Using :key ensures the component is recreated when the path changes -->
  <RouterView :key="route.path" />
</template>

<style>
:root {
  /* Light theme (default) */
  --color-background: #ffffff;
  --color-text: #213547;
  --color-border: #ddd;
  --color-heading: #181818;
  --color-button: #f1f1f1;
  --color-button-hover: #e2e2e2;

  /* Added title contrast variables */
  --title-color: #000000;
  --title-color-contrast: #ffffff;
}

[data-theme="dark"] {
  /* Dark theme */
  --color-background: #242424;
  --color-text: rgba(255, 255, 255, 0.87);
  --color-border: #444;
  --color-heading: #ffffff;
  --color-button: #333;
  --color-button-hover: #444;

  /* Added title contrast variables for dark mode */
  --title-color: #ffffff;
  --title-color-contrast: #000000;
}

body {
  background-color: var(--color-background);
  color: var(--color-text);
  transition: all 0.3s ease;
}
</style>

<style scoped>
header {
  line-height: 1.5;
  max-height: 100vh;
}

.logo {
  display: block;
  margin: 0 auto 2rem;
}

nav {
  width: 100%;
  font-size: 12px;
  text-align: center;
  margin-top: 2rem;
}

nav a.router-link-exact-active {
  color: var(--color-text);
}

nav a.router-link-exact-active:hover {
  background-color: transparent;
}

nav a {
  display: inline-block;
  padding: 0 1rem;
  border-left: 1px solid var(--color-border);
}

nav a:first-of-type {
  border: 0;
}

.theme-toggle {
  margin-left: 1rem;
  background: var(--color-button);
  border: none;
  border-radius: 50%;
  width: 2rem;
  height: 2rem;
  cursor: pointer;
  font-size: 1rem;
  display: inline-flex;
  justify-content: center;
  align-items: center;
  transition: background-color 0.3s;
}

.theme-toggle:hover {
  background-color: var(--color-button-hover);
}

@media (min-width: 1024px) {
  header {
    display: flex;
    place-items: center;
    padding-right: calc(var(--section-gap) / 2);
  }

  .logo {
    margin: 0 2rem 0 0;
  }

  header .wrapper {
    display: flex;
    place-items: flex-start;
    flex-wrap: wrap;
  }

  nav {
    text-align: left;
    margin-left: -1rem;
    font-size: 1rem;

    padding: 1rem 0;
    margin-top: 1rem;
  }
}
</style>
