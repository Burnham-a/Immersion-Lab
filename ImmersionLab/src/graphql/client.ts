// @/graphql/client.ts
import { SPECKLE_AUTH_TOKEN_KEY } from "@/stores/store-IL";
import { createClient } from "@urql/vue";

const GRAPHQL_SERVER_URL = import.meta.env.VITE_GRAPHQL_SERVER_URL;

if (!GRAPHQL_SERVER_URL) {
  console.error("❌ Missing VITE_GRAPHQL_SERVER_URL in environment variables.");
}

import { cacheExchange, fetchExchange } from "@urql/core";

export const SpeckleGraphQLClient = createClient({
  url: GRAPHQL_SERVER_URL,
  exchanges: [cacheExchange, fetchExchange],
  fetchOptions: () => {
    const token = localStorage.getItem(SPECKLE_AUTH_TOKEN_KEY);
    return {
      headers: { Authorization: token ? `Bearer ${token}` : "" },
    };
  },
});
