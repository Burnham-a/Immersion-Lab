// authGuards.ts (Step3 Authentication Guard)
import { useAuthStore } from "@/stores/store";
import type { NavigationGuard } from "vue-router";

export const authGuard: NavigationGuard = async (to, from, next) => {
  const store = useAuthStore();
  try {
    const user = await store.speckle.user();
    if (user) {
      store.user = user;
      store.isAuthenticated = true;
      next();
    } else {
      console.warn("User not authenticated. Redirecting to Step3...");
      await store.speckle.login();
      next();
    }
  } catch (error) {
    console.error("Error during authentication:", error);
    next(false); // Abort navigation on error
  }
};
