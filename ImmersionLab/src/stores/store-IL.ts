import { defineStore } from "pinia";
import { SpeckleGraphQLClient } from "@/graphql/client.ts";
import { userInfoQuery } from "@/graphql/queries/user-info";
import { ref } from "vue";

export const SPECKLE_CHALLENGE_KEY = "SpeckleDemoApp.Challenge";
export const SPECKLE_AUTH_TOKEN_KEY = "SpeckleDemoApp.AuthToken";
export const SPECKLE_AUTH_REFRESH_TOKEN_KEY = "SpeckleDemoApp.AuthRefreshToken";

interface State {
  user: any | null;
  authToken: string | null;
  selectedProject: any | null;
}

export const useStore = defineStore("store", {
  state: (): State => ({
    user: null,
    authToken: localStorage.getItem(SPECKLE_AUTH_TOKEN_KEY),
    selectedProject: ref(null), // Ensure reactivity
  }),
  getters: {
    isAuthenticated(): boolean {
      console.log("isAuthenticated:", this.user !== null);
      return this.user !== null;
    },
  },
  actions: {
    setSelectedProject(project: any) {
      console.log("🔄 Setting selected project:", project);
      this.selectedProject = project;
    },
    clearSelectedProject() {
      console.log("🗑️ Clearing selected project.");
      this.selectedProject = null;
    },
    async getUser() {
      try {
        const { data } = await SpeckleGraphQLClient.query(userInfoQuery, {});
        if (data?.activeUser) {
          this.user = data.activeUser;
          console.log("User successfully fetched:", this.user);
        } else {
          console.warn("No active user returned:", data);
          this.user = null;
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        this.user = null;
      }
    },
  },
});
