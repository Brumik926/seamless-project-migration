import { createFileRoute, redirect } from "@tanstack/react-router";

// Templates live in the "Šablóny" tab of the recipients screen.
export const Route = createFileRoute("/_authenticated/sablony")({
  beforeLoad: () => {
    throw redirect({ to: "/prijemcovia", search: { tab: "sablony" } });
  },
});
