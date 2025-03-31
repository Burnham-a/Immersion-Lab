import "./assets/main.css";

import { createApp } from "vue";
import App from "./App.vue";
import router from "./router/index.ts";
import { createPinia } from "pinia";
import urql from "@urql/vue";
import { SpeckleGraphQLClient } from "./graphql/client";

const app = createApp(App);

app.use(router);
app.use(createPinia());
app.use(urql, SpeckleGraphQLClient);

app.mount("#app");
