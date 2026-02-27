import * as fs from "node:fs";
import { createServerFn } from "@tanstack/react-start";
import { getCookie, setCookie, deleteCookie } from "@tanstack/react-start/server";

const authFilePath = "db/auth.json";

async function readUsers() {
  try {
    const content = await fs.promises.readFile(authFilePath, "utf-8").catch(() => "[]");
    return JSON.parse(content);
  } catch (err) {
    console.error("Error reading users:", err);
    return [];
  }
}

export const getUser = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const userId = getCookie("userId");
    if (!userId) return null;

    const users = await readUsers();
    return users.find((u: any) => u.id === userId) || null;
  } catch (err) {
    console.error("getUser error:", err);
    return null;
  }
});

export const login = createServerFn({ method: "POST" })
  .inputValidator((d: any) => d)
  .handler(async ({ data }) => {
    try {
      const { username, password } = data;
      const users = await readUsers();
      const user = users.find((u: any) => u.username === username && u.password === password);

      if (user) {
        setCookie("userId", user.id, { 
          path: "/", 
          httpOnly: true, 
          sameSite: "lax",
          maxAge: 60 * 60 * 24 * 7 // 1 week
        });
        return { success: true };
      }

      return { success: false, error: "Invalid username or password" };
    } catch (err) {
      console.error("login error:", err);
      return { success: false, error: "Internal server error" };
    }
  });

export const logout = createServerFn({ method: "POST" }).handler(async () => {
  try {
    deleteCookie("userId", { path: "/" });
    return { success: true };
  } catch (err) {
    console.error("logout error:", err);
    return { success: false };
  }
});
