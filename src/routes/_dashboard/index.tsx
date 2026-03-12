import * as fs from "node:fs";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const filePath = "count.txt";

async function readCount() {
  return parseInt(
    await fs.promises.readFile(filePath, "utf-8").catch(() => "0"),
  );
}

const getCount = createServerFn({
  method: "GET",
}).handler(async () => {
  return await readCount();
});

const updateCount = createServerFn({ method: "POST" })
  .inputValidator((d: number) => d)
  .handler(async ({ data }) => {
    const count = await readCount();
    await fs.promises.writeFile(filePath, `${count + data}`);
  });

export const Route = createFileRoute("/_dashboard/")({
  loader: async () => await getCount(),
  component: DashboardHome,
});

function DashboardHome() {
  const router = useRouter();
  const state = Route.useLoaderData();
  const { user } = Route.useRouteContext();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard Overview</h1>
        <p className="text-muted-foreground mt-2">
          Welcome back, {user?.username}! Here is what's happening today.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{state}</div>
            <CardDescription>
              Live count reading from the local text file storage.
            </CardDescription>
          </CardContent>
        </Card>
      </div>

      <div className="bg-background border rounded-lg p-6 flex flex-col items-start gap-4 shadow-sm">
        <h3 className="font-semibold text-lg">Interactive Counter</h3>
        <p className="text-muted-foreground text-sm">
          Press the button below to trigger the server function mutation across the layout.
        </p>
        <Button
          onClick={() => {
            updateCount({ data: 1 }).then(() => {
              router.invalidate();
            });
          }}
        >
          Add 1 to Count
        </Button>
      </div>
    </div>
  );
}
