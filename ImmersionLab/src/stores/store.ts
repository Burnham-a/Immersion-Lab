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

  // Hard-code the client ID and client secret to ensure they're properly set
  const CLIENT_ID = "81d17fdbee";
  const CLIENT_SECRET = "30fb836fff";
  const SERVER_URL = "https://app.speckle.systems";
  const REDIRECT_URL =
    import.meta.env.VITE_SPECKLE_REDIRECT_URI ||
    "http://localhost:5173/Step3/auth-callback";

  // Define options with hardcoded values to prevent undefined issues
  const options: ApplicationOptions = {
    clientId: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    serverUrl: SERVER_URL,
    redirectUri: REDIRECT_URL,
  };

  // Log the options being used to help with debugging
  console.log("Initializing Speckle client with options:", {
    clientId: options.clientId,
    serverUrl: options.serverUrl,
    redirectUri: options.redirectUri,
    // Don't log client secret for security reasons
  });

  // Initialize the Speckle client with our options
  const speckle = new SpeckleAuthClient(options);

  const login = async () => {
    try {
      console.log("Starting login with client ID:", CLIENT_ID);

      // Manually specify the redirectUrl again during login to ensure it's used
      await speckle.login({
        redirectUri: options.redirectUri,
        // Additional optional parameters if helpful:
        // appId: CLIENT_ID,
        // Challenge for PKCE flow (if needed)
        // challenge: "randomGeneratedChallenge"
      });
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
