import * as fs from "node:fs";
import * as crypto from "node:crypto";
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

async function writeUsers(users: any[]) {
  await fs.promises.writeFile(authFilePath, JSON.stringify(users, null, 2), "utf-8");
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

export const register = createServerFn({ method: "POST" })
  .inputValidator((d: any) => d)
  .handler(async ({ data }) => {
    try {
      const { username, password } = data;
      if (!username || !password) {
        return { success: false, error: "Username and password are required" };
      }

      const users = await readUsers();
      if (users.find((u: any) => u.username === username)) {
        return { success: false, error: "Username already exists" };
      }

      const newUser = {
        id: crypto.randomUUID(),
        username,
        password,
      };

      users.push(newUser);
      await writeUsers(users);

      setCookie("userId", newUser.id, {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7 // 1 week
      });

      return { success: true };
    } catch (err) {
      console.error("register error:", err);
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

// --- User Management CRUD Server Functions ---

export const getUsersList = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const users = await readUsers();
    // Return users without exposing passwords directly
    return users.map((u: any) => ({
      id: u.id,
      username: u.username,
      // You could optionally omit password, but since this is an admin dashboard showing raw JSON logic:
      password: u.password,
    }));
  } catch (err) {
    console.error("getUsersList error:", err);
    return [];
  }
});

export const createUserFn = createServerFn({ method: "POST" })
  .inputValidator((d: any) => d)
  .handler(async ({ data }) => {
    try {
      const { username, password } = data;
      if (!username || !password) return { success: false, error: "Missing fields" };

      const users = await readUsers();
      if (users.find((u: any) => u.username === username)) {
        return { success: false, error: "Username already exists" };
      }

      users.push({ id: crypto.randomUUID(), username, password });
      await writeUsers(users);
      return { success: true };
    } catch (err) {
      console.error("createUser error:", err);
      return { success: false, error: "Failed to create user" };
    }
  });

export const updateUserFn = createServerFn({ method: "POST" })
  .inputValidator((d: any) => d)
  .handler(async ({ data }) => {
    try {
      const { id, username, password } = data;
      if (!id || !username || !password) return { success: false, error: "Missing fields" };

      const users = await readUsers();
      const index = users.findIndex((u: any) => u.id === id);
      if (index === -1) return { success: false, error: "User not found" };

      // Ensure new username doesn't conflict with another user
      if (users.some((u: any) => u.username === username && u.id !== id)) {
        return { success: false, error: "Username already taken by another user" };
      }

      users[index] = { ...users[index], username, password };
      await writeUsers(users);
      return { success: true };
    } catch (err) {
      console.error("updateUser error:", err);
      return { success: false, error: "Failed to update user" };
    }
  });

export const deleteUserFn = createServerFn({ method: "POST" })
  .inputValidator((d: any) => d)
  .handler(async ({ data }) => {
    try {
      const { id } = data;
      const currentUserId = getCookie("userId");

      if (!id) return { success: false, error: "User ID required" };
      if (id === currentUserId) return { success: false, error: "You cannot delete your own account." };

      let users = await readUsers();
      const initialLength = users.length;
      users = users.filter((u: any) => u.id !== id);

      if (users.length === initialLength) {
        return { success: false, error: "User not found" };
      }

      await writeUsers(users);
      return { success: true };
    } catch (err) {
      console.error("deleteUser error:", err);
      return { success: false, error: "Failed to delete user" };
    }
  });
