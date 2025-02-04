import {
  createRouter,
  createWebHistory,
  type NavigationGuard,
} from "vue-router";
import HomeView from "../views/HomeView.vue";
import { useStore } from "@/stores/store";
import { authGuard } from "@/router/authGuards";

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
      component: () => import("@/views/ImmersionLab.vue"),
      beforeEnter: authGuard,
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
  ],
});

// Export the router
export default router;
