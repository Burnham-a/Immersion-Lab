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

  // Use environment variables with fallbacks for client credentials
  const CLIENT_ID = import.meta.env.VITE_CLIENT_ID;
  const CLIENT_SECRET = import.meta.env.VITE_CLIENT_SECRET;
  const SERVER_URL =
    import.meta.env.VITE_SERVER_URL || "https://app.speckle.systems";

  // Define options with values from environment variables
  const options: ApplicationOptions = {
    clientId: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    serverUrl: SERVER_URL,
  };

  // Log the options being used to help with debugging
  console.log("Initializing Speckle client with options:", {
    clientId: options.clientId,
    serverUrl: options.serverUrl,
  });
  // Don't log client secret for security reasons

  // Initialize the Speckle client with our options
  const speckle = new SpeckleAuthClient(options);

  const login = async () => {
    try {
      console.log("Starting login with client ID:", CLIENT_ID);

      // Manually specify the redirectUrl again during login to ensure it's used
      await speckle.login();
    } catch (error) {
      console.error("Error during login:", error);
      throw error; // Rethrow to allow caller to handle
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
