/// <reference types="vite/client" />
import type { ReactNode } from "react";
import {
  Outlet,
  createRootRoute,
  HeadContent,
  Scripts,
  useRouter,
} from "@tanstack/react-router";
import { getUser } from "../auth";
import { Toaster } from "@/components/ui/sonner";

import "../index.css";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "TanStack Start Starter",
      },
    ],
  }),
  beforeLoad: async () => {
    try {
      const user = await getUser();
      return { user };
    } catch (err) {
      console.error("Error in root beforeLoad:", err);
      return { user: null };
    }
  },
  component: RootComponent,
});

function RootComponent() {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="antialiased min-h-screen bg-background">
        <Outlet />
        <Toaster />
        <Scripts />
      </body>
    </html>
  );
}
