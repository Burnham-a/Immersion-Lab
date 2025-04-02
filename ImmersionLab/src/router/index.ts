import {
  createRouter,
  createWebHistory,
  type NavigationGuard,
} from "vue-router";
import HomeView from "../views/HomeView.vue";
import { authGuard } from "@/router/authGuards.ts";
import { authGuardIL } from "@/router/authGuards-IL.ts";
import LoginPage from "@/views/LoginPage.vue"; // Ensure this path points to your Login page component

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
      path: "/ImmersionLab",
      name: "ImmersionLab",
      component: () => import("@/views/ImmersionLabSetup.vue"), // Ensure correct path
      beforeEnter: authGuardIL, // Ensure authGuardIL is used
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
      beforeEnter: authGuard,
    },
    {
      path: "/StaffClient",
      name: "StaffClient",
      component: () => import("@/views/StaffClient.vue"),
    },
    {
      path: "/ClientApp",
      name: "ClientApp",
      component: () => import("@/views/ClientApp.vue"),
      beforeEnter: authGuardIL,
    },
  ],
});

// Export the router
export default router;
