// store-IL.ts (ImmersionLab Authentication Store)
import { defineStore } from "pinia";
import {
  SpeckleAuthClient,
  type ApplicationOptions,
  type User,
} from "speckle-auth";
import { ref } from "vue";

export const SPECKLE_AUTH_TOKEN_KEY = "speckle_auth_token";

export const useImmersionLabStore = defineStore("immersionLab", () => {
  const isAuthenticated = ref(false);
  const user = ref<User | null>(null);

  const options: ApplicationOptions = {
    clientId: import.meta.env.VITE_CLIENT_LAB_ID,
    clientSecret: import.meta.env.VITE_CLIENT_LAB_SECRET,
    serverUrl: import.meta.env.VITE_SERVER_URL,
  };

  const speckle = new SpeckleAuthClient(options);

  async function authenticate() {
    try {
      const userData = await speckle.user();
      if (!userData) {
        await speckle.login();
        return;
      }
      user.value = userData;
      isAuthenticated.value = true;
      return userData;
    } catch (error) {
      console.error("Authentication error:", error);
      isAuthenticated.value = false;
      user.value = null;
      throw error;
    }
  }

  async function logout() {
    try {
      await speckle.logout();
      isAuthenticated.value = false;
      user.value = null;
    } catch (error) {
      console.error("Logout error:", error);
      throw error;
    }
  }

  return { isAuthenticated, user, speckle, authenticate, logout };
});
