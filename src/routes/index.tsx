// src/routes/index.tsx
import * as fs from "node:fs";
import { createFileRoute, useRouter, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { logout } from "../auth";
import { Button } from "@/components/ui/button";

const filePath = "count.txt";

async function readCount() {
  return parseInt(
    await fs.promises.readFile(filePath, "utf-8").catch(() => "0"),
  );
}

const getCount = createServerFn({
  method: "GET",
}).handler(() => {
  return readCount();
});

const updateCount = createServerFn({ method: "POST" })
  .inputValidator((d: number) => d)
  .handler(async ({ data }) => {
    const count = await readCount();
    await fs.promises.writeFile(filePath, `${count + data}`);
  });

export const Route = createFileRoute("/")({
  beforeLoad: async ({ context }) => {
    if (!context.user) {
      throw redirect({ to: "/login" });
    }
  },
  loader: async () => await getCount(),
  component: Home,
});

function Home() {
  const router = useRouter();
  const state = Route.useLoaderData();
  const { user } = Route.useRouteContext();

  const handleLogout = async () => {
    await logout();
    router.invalidate();
    router.navigate({ to: "/login" });
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen gap-4">
      <h1 className="text-4xl font-bold">Welcome, {user?.username}!</h1>
      <p className="text-lg">The current count is: {state}</p>
      <div className="flex gap-2">
        <Button
          onClick={() => {
            updateCount({ data: 1 }).then(() => {
              router.invalidate();
            });
          }}
        >
          Add 1
        </Button>
        <Button
          variant="secondary"
          onClick={handleLogout}
        >
          Logout
        </Button>
      </div>
    </div>
  );
}
