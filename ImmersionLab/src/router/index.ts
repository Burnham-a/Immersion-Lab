import { createRouter, createWebHistory } from "vue-router";
import HomeView from "../views/HomeView.vue";

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
    },
  ],
});

export default router;
