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

  async function authenticateUser() {
    const user = await speckle.user();
    if (!user) {
      await speckle.login();
    }
    return user;
  }

  async function logoutUser() {
    await speckle.logout();
  }

  return { isAuthenticated, user, speckle };
});
