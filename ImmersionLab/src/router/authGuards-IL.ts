import { useStore } from "@/stores/store-IL";
import type { NavigationGuard } from "vue-router";

export const authGuardIL: NavigationGuard = async (to, from, next) => {
  const store = useStore();

  console.log("Entering authGuard for route:", to.name);

  try {
    // Handle access code from query params
    if (to.query.access_code) {
      console.log("authGuard: Found access code:", to.query.access_code);

      // Exchange the access code and fetch the user
      await store.exchangeAccessCode(to.query.access_code as string);
      await store.getUser();
      console.log("authGuard: Authentication successful");

      // Redirect to the intended route instead of home
      next({ path: to.path, query: {} });
      return;
    }

    // Restore session and validate authentication
    console.log("authGuard: Restoring session...");
    await store.restoreSession();

    if (store.isAuthenticated) {
      console.log("authGuard: User is authenticated");
      next(); // Allow access to the target route
    } else {
      console.warn("authGuard: User is not authenticated, redirecting to home");
      next({ path: "/", query: { redirect: to.fullPath } }); // Store intended destination
    }
  } catch (error) {
    console.error("authGuard: Error during guard execution", error);
    next("/"); // Redirect to home on error
  }
};
