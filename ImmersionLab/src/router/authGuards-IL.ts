// authGuards-IL.ts (ImmersionLab Authentication Guard)
import { useImmersionLabStore } from "@/stores/store-IL";
import type { NavigationGuard } from "vue-router";

export const authGuardIL: NavigationGuard = async (to, from, next) => {
  const store = useImmersionLabStore();
  try {
    const user = await store.speckle.user();
    if (user) {
      store.user = user;
      store.isAuthenticated = true;
      next();
    } else {
      console.warn("User not authenticated. Redirecting to ImmersionLab...");
      await store.speckle.login();
      next();
    }
  } catch (error) {
    console.error("Error during authentication:", error);
    next(false); // Abort navigation on error
  }
};
