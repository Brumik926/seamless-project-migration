import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { PageSpinner } from "./components/bank/PageSpinner";

export const getRouter = () => {
  // One client per request: a module-level QueryClient leaks cached data between SSR requests.
  const queryClient = new QueryClient({
    defaultOptions: { queries: { staleTime: 15_000, retry: 1, refetchOnWindowFocus: false } },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    // Lets Query own freshness; set caching defaults on the QueryClient, not the router.
    defaultPreloadStaleTime: 0,
    defaultPendingComponent: PageSpinner,
    defaultPendingMs: 150,
  });

  return router;
};
