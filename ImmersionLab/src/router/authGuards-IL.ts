import type { NavigationGuardNext, RouteLocationNormalized } from "vue-router";
import { useImmersionLabStore } from "@/stores/store-IL";

export const authGuardIL = async (
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
  next: NavigationGuardNext
) => {
  try {
    const store = useImmersionLabStore();

    // Check if we have a token but not authenticated yet
    if (store.speckle.token && !store.isAuthenticated) {
      try {
        // Try to silently authenticate with the token
        await store.authenticate();
      } catch (e) {
        console.warn(
          "Token exists but authentication failed, will proceed anyway",
          e
        );
        // Continue even if this fails - the component will handle authentication
      }
    }

    console.log("Proceeding to Immersion Lab");
    return next();
  } catch (error) {
    console.error("Error during navigation:", error);
    // Still proceed even if there's an error
    return next();
  }
};
