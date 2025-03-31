// store-IL.ts (ImmersionLab Authentication Store)
import { defineStore } from "pinia";
import {
  SpeckleAuthClient,
  type ApplicationOptions,
  type User,
} from "speckle-auth";
import { ref } from "vue";

export const SPECKLE_AUTH_TOKEN_KEY = "speckle_auth_token";

export const useAuthStore = defineStore("immersionLab", () => {
  const isAuthenticated = ref(false);
  const user = ref<User | null>(null);

  const options: ApplicationOptions = {
    clientId: import.meta.env.VITE_SPECKLE_CLIENT_ID,
    clientSecret: import.meta.env.VITE_SPECKLE_CLIENT_SECRET,
    serverUrl: import.meta.env.VITE_SPECKLE_SERVER_URL,
  };

  const speckle = new SpeckleAuthClient(options);

  const login = async () => {
    try {
      // Call login without passing any arguments
      await speckle.login();
    } catch (error) {
      console.error("Error during login:", error);
    }
  };

  const initializeUser = async () => {
    try {
      // Fetch user data when explicitly called
      user.value = await speckle.user();
      if (user.value) {
        isAuthenticated.value = true; // Set authentication status
      }
    } catch (error) {
      console.error("Error during initialization:", error);
    }
  };

  return { isAuthenticated, user, speckle, login, initializeUser };
});
