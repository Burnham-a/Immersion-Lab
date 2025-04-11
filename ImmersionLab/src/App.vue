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

      <nav class="navigation">
        <!-- <div v-if="user">
          <div>{{ user.name }}</div>
          <img :src="user.avatar" alt="avatar" width="50" height="50" />
        </div> -->
        <div class="nav-links">
          <RouterLink to="/">Home</RouterLink>
          <RouterLink to="/Step1">Step 1</RouterLink>
          <RouterLink to="/Step2">Step 2</RouterLink>
          <RouterLink to="/Step3">Step 3</RouterLink>
          <RouterLink to="/StaffClient" class="app-button"
            >Immersion Lab App</RouterLink
          >
        </div>
        <button
          @click="toggleTheme"
          class="theme-toggle"
          aria-label="Toggle theme"
        >
          {{ theme === "light" ? "🌙" : "☀️" }}
        </button>
      </nav>
    </div>
  </header>

  <!-- Using :key ensures the component is recreated when the path changes -->
  <RouterView :key="route.path" />

  <!-- Footer with developer credits -->
  <footer>
    <div class="developer-credits">
      Developed by Adam Burnham and Amad Hussain
    </div>
  </footer>
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
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
</style>

<style scoped>
header {
  line-height: 1.5;
  max-height: 100vh;
  display: flex; /* Ensure header sections are side by side */
  flex-wrap: wrap; /* Allow wrapping for smaller screens */
  align-items: center;
  justify-content: center; /* Center the content horizontally */
  flex-direction: column; /* Stack elements vertically */
  padding: 1rem; /* Add padding for spacing */
}

.logo {
  display: block;
  margin: 0 auto; /* Center the logo horizontally */
  margin-bottom: 1rem; /* Add spacing below the logo */
  flex-shrink: 0; /* Prevent logo from shrinking */
}

.wrapper {
  flex: 1; /* Allow the wrapper to take up remaining space */
  display: flex;
  flex-direction: column;
  align-items: center; /* Center content horizontally */
  gap: 1rem; /* Add spacing between elements */
}

nav.navigation {
  width: 100%;
  font-size: 12px;
  text-align: center;
  margin-top: 2rem;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.nav-links {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 0.5rem;
}

nav a.router-link-exact-active {
  color: var(--color-text);
  font-weight: 600;
  background-color: rgba(0, 0, 0, 0.05);
}

[data-theme="dark"] nav a.router-link-exact-active {
  background-color: rgba(255, 255, 255, 0.1);
}

nav a.router-link-exact-active:hover {
  background-color: rgba(0, 0, 0, 0.08);
}

[data-theme="dark"] nav a.router-link-exact-active:hover {
  background-color: rgba(255, 255, 255, 0.15);
}

nav a {
  display: inline-block;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  text-decoration: none;
  color: var(--color-text);
  transition: background-color 0.3s, color 0.3s;
}

nav a:hover {
  background-color: var(--color-button-hover);
}

.theme-toggle {
  margin-left: 0.5rem;
  background: var(--color-button);
  border: 1px solid var(--color-border);
  border-radius: 50%;
  width: 2.5rem;
  height: 2.5rem;
  cursor: pointer;
  font-size: 1.2rem;
  display: inline-flex;
  justify-content: center;
  align-items: center;
  transition: background-color 0.3s, transform 0.2s;
}

.theme-toggle:hover {
  background-color: var(--color-button-hover);
  transform: scale(1.05);
}

footer {
  margin-top: auto;
  padding: 1rem;
  text-align: center;
  border-top: 1px solid var(--color-border);
  background-color: var(--color-background);
}

.developer-credits {
  font-size: 0.9rem;
  color: var(--color-text);
  opacity: 0.8;
}

/* Special styling for the Immersion Lab App button */
.app-button {
  background-color: #ff9900;
  color: white !important;
  border-radius: 20px;
  padding: 8px 16px;
  font-weight: bold;
  transition: all 0.3s ease;
  border: 2px solid transparent;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.app-button:hover {
  background-color: #4169e1;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.app-button.router-link-exact-active {
  background-color: #4169e1;
  color: white !important;
}

[data-theme="dark"] .app-button {
  background-color: #ff9900;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
}

[data-theme="dark"] .app-button:hover {
  background-color: #4169e1;
}

[data-theme="dark"] .app-button.router-link-exact-active {
  background-color: #ff9900;
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

  nav.navigation {
    text-align: left;
    margin-left: -1rem;
    font-size: 1rem;
    padding: 1rem 0;
    margin-top: 1rem;
    justify-content: space-between;
  }

  .nav-links {
    justify-content: flex-start;
  }
}
</style>
