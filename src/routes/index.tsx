// src/routes/index.tsx
import * as fs from "node:fs";
import { createFileRoute, useRouter, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { logout } from "../auth";
import { Button, Heading, Text } from "@react-spectrum/s2";

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
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '16px' }}>
      <Heading level={1}>Welcome, {user?.username}!</Heading>
      <Text>The current count is: {state}</Text>
      <div style={{ display: 'flex', gap: '8px' }}>
        <Button
          type="button"
          onPress={() => {
            updateCount({ data: 1 }).then(() => {
              router.invalidate();
            });
          }}
        >
          Add 1
        </Button>
        <Button
          type="button"
          variant="secondary"
          onPress={handleLogout}
        >
          Logout
        </Button>
      </div>
    </div>
  );
}
