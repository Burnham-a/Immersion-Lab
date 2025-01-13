import {
  createRouter,
  createWebHistory,
  type NavigationGuard,
} from "vue-router";
import HomeView from "../views/HomeView.vue";
import { useStore } from "@/stores/store";

// Define a reusable requiresAuthGuard for routes needing authentication
const requiresAuthGuard: NavigationGuard = async (to, from, next) => {
  const store = useStore();
  await store.restoreSession();
  if (store.isAuthenticated) {
    next();
  } else {
    next("/");
  }
};

// Define the router
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "home",
      component: HomeView,
    },
    {
      path: "/Step1",
      name: "Step1",
      component: () => import("@/views/Step1.vue"),
    },
    {
      path: "/Step2",
      name: "Step2",
      component: () => import("@/views/Step2.vue"),
    },
    {
      path: "/Step3",
      name: "Step3",
      component: () => import("@/views/Step3.vue"),
      beforeEnter: async (to, from, next) => {
        const store = useStore();
        // Handle access_code query parameter if present
        if (to.query.access_code) {
          const accessCode = to.query.access_code as string;
          try {
            await store.exchangeAccessCode(accessCode);
            await store.getUser();
          } catch (error) {
            console.error("Error during authentication:", error);
            next("/");
            return;
          }
        } else {
          await store.restoreSession();
        }
        // Proceed to Step3 after validation
        next();
      },
    },
  ],
});

// Export the router
export default router;
