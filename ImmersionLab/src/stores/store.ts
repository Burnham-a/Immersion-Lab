// @/stores/store.ts
import { defineStore } from "pinia";
import { SpeckleGraphQLClient } from "@/graphql/client.ts";
import { userInfoQuery } from "@/graphql/queries/user-info";

export const SPECKLE_CHALLENGE_KEY = "SpeckleDemoApp.Challenge";
export const SPECKLE_AUTH_TOKEN_KEY = "SpeckleDemoApp.AuthToken";
export const SPECKLE_AUTH_REFRESH_TOKEN_KEY = "SpeckleDemoApp.AuthRefreshToken";

interface State {
  user: any | null;
}

export const useStore = defineStore("store", {
  state: (): State => ({
    user: null,
  }),
  getters: {
    isAuthenticated(): boolean {
      return this.user !== null;
    },
  },
  actions: {
    redirectToSpeckleAuthPage() {
      const speckleServer = import.meta.env.VITE_SPECKLE_SERVER;
      const appId = import.meta.env.VITE_SPECKLE_APP_ID;

      if (!speckleServer || !appId) {
        console.error(
          "Environment variables VITE_SPECKLE_SERVER or VITE_SPECKLE_APP_ID are missing."
        );
        alert(
          "Authentication is not configured correctly. Please contact support."
        );
        return;
      }

      // Generate a random challenge
      const challenge =
        Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);

      // Store the challenge in localStorage
      localStorage.setItem("SpeckleDemoApp.Challenge", challenge);

      // Redirect to the Speckle Server auth page
      window.location.href = `${speckleServer}/authn/verify/${appId}/${challenge}`;
    },
    async exchangeAccessCode(accessCode: string) {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_SPECKLE_SERVER}/auth/token/`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              accessCode: accessCode,
              appId: import.meta.env.VITE_SPECKLE_APP_ID,
              appSecret: import.meta.env.VITE_SPECKLE_APP_SECRET,
              challenge: localStorage.getItem(SPECKLE_CHALLENGE_KEY),
            }),
          }
        );

        if (!res.ok) {
          console.error("Failed to exchange access code:", res.statusText);
          throw new Error(`HTTP error! status: ${res.status}`);
        }

        const data = await res.json();

        if (data.token) {
          // If retrieving the token was successful, remove challenge and set the new token and refresh token
          localStorage.removeItem(SPECKLE_CHALLENGE_KEY);
          localStorage.setItem(SPECKLE_AUTH_TOKEN_KEY, data.token);
          localStorage.setItem(
            SPECKLE_AUTH_REFRESH_TOKEN_KEY,
            data.refreshToken
          );
        } else {
          console.error("Token missing in response:", data);
          throw new Error("Authentication token is missing in the response.");
        }

        return data;
      } catch (error) {
        console.error("Error during token exchange:", error);
        throw error; // Rethrow the error for further handling in the calling code
      }
    },
    // other actions...
    async getUser() {
      const { data } = await SpeckleGraphQLClient.query(userInfoQuery, {});
      this.user = data.activeUser;
    },
    // other actions...
    async restoreSession() {
      const token = localStorage.getItem(SPECKLE_AUTH_TOKEN_KEY);
      if (token) {
        await this.getUser();
      }
    },
  },
});
