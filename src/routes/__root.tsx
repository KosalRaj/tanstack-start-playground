// src/routes/__root.tsx
/// <reference types="vite/client" />
import type { ReactNode } from "react";
import {
  Outlet,
  createRootRoute,
  HeadContent,
  Scripts,
  type ToOptions,
  type NavigateOptions,
  useRouter,
} from "@tanstack/react-router";
import { Provider } from "@react-spectrum/s2";
import { getUser } from "../auth";

import "@react-spectrum/s2/page.css";

// Configure the type of the `href` and `routerOptions` props on all React Spectrum components.
declare module "@react-spectrum/s2" {
  interface RouterConfig {
    href: ToOptions;
    routerOptions: Omit<NavigateOptions, keyof ToOptions>;
  }
}

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
  let router = useRouter();

  return (
    <Provider
      elementType="html"
      background="base"
      locale="en-US"
      router={{
        navigate: (href, opts) => {
          if (typeof href === "string") return;
          return router.navigate({ ...(href as any), ...opts });
        },
        useHref: (href) => {
          if (typeof href === "string") return href;
          return router.buildLocation(href).href;
        },
      }}
    >
      <head>
        <HeadContent />
      </head>
      <body>
        <Outlet />
        <Scripts />
      </body>
    </Provider>
  );
}
