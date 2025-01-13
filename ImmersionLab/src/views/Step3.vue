<template>
  <div class="Step3">
    <h1>This is a Step3 page</h1>
    <div v-if="!isLoggedIn">
      <button @click="loginToSpeckle">Login to Speckle</button>
    </div>
    <div v-else>
      <div v-if="projects.length === 0">
        <p>Loading projects...</p>
      </div>
      <div v-else>
        <label for="projectSelect">Choose a project:</label>
        <select id="projectSelect" v-model="selectedProject">
          <option
            v-for="project in projects"
            :key="project.id"
            :value="project"
          >
            {{ project.name }}
          </option>
        </select>
        <button @click="loadProject">Open Viewer</button>
      </div>
    </div>
    <div
      id="renderer"
      ref="renderer"
      style="width: 100%; height: 100%; left: 0px; top: 0px; position: absolute"
    ></div>
  </div>
</template>

<script>
import { initializeViewer } from "@/views/Speckle";
import { SpeckleAuthClient } from "@speckle/browser-auth";

export default {
  name: "Step3",
  data() {
    return {
      isLoggedIn: false,
      authClient: null,
      projects: [],
      selectedProject: null,
    };
  },
  methods: {
    async loginToSpeckle() {
      try {
        // Initialize Speckle Auth Client
        this.authClient = new SpeckleAuthClient({
          serverUrl: "https://app.speckle.systems",
          appId: "your-app-id", // Replace with your Speckle App ID
          redirectUrl: window.location.origin, // Use your actual redirect URL
        });

        // Trigger the login flow
        const token = await this.authClient.authenticate();
        console.log("Logged in successfully. Token:", token);

        // Mark as logged in and fetch projects
        this.isLoggedIn = true;
        await this.fetchProjects();
      } catch (error) {
        console.error("Login failed:", error);
      }
    },
    async fetchProjects() {
      try {
        const response = await fetch("https://app.speckle.systems/graphql", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.authClient.getAccessToken()}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: `
              query {
                projects {
                  id
                  name
                }
              }
            `,
          }),
        });
        const { data } = await response.json();
        this.projects = data.projects || [];
        console.log("Fetched projects:", this.projects);
      } catch (error) {
        console.error("Failed to fetch projects:", error);
      }
    },
    async loadProject() {
      if (!this.selectedProject) {
        alert("Please select a project first!");
        return;
      }

      try {
        const projectUrl = `https://app.speckle.systems/projects/${this.selectedProject.id}`;
        const renderer = this.$refs.renderer;

        if (renderer) {
          await initializeViewer(
            renderer,
            projectUrl,
            this.authClient.getAccessToken()
          );
          console.log(
            "Viewer initialized for project:",
            this.selectedProject.name
          );
        } else {
          console.error("Renderer element not found!");
        }
      } catch (error) {
        console.error("Failed to load project in viewer:", error);
      }
    },
  },
};
</script>

<style>
@media (min-width: 1024px) {
  .Step3 {
    min-height: 100vh;
    display: flex;
    align-items: center;
    flex-direction: column;
    gap: 20px;
  }
  #renderer {
    flex-grow: 1;
    width: 100%;
  }
}
</style>
