import { createFileRoute, useRouter } from "@tanstack/react-router";
import { login } from "../auth";
import { TextField, Button, Form, Heading, Text } from "@react-spectrum/s2";
import { useState } from "react";

export const Route = createFileRoute("/login")({
  component: LoginComponent,
});

function LoginComponent() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const username = formData.get("username") as string;
    const password = formData.get("password") as string;

    const result = await login({ data: { username, password } });

    if (result.success) {
      router.invalidate();
      router.navigate({ to: "/" });
    } else {
      setError(result.error || "Login failed");
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        gap: "24px",
      }}
    >
      <Form
        onSubmit={handleSubmit}
        styles={{ maxWidth: "520px", width: "100%" } as any}
      >
        <Heading level={1}>Login</Heading>
        <TextField label="Username" name="username" isRequired autoFocus />
        <PasswordField label="Password" name="password" isRequired />
        {error && <div style={{ color: "red", marginTop: "8px" }}>{error}</div>}
        <div style={{ marginTop: "16px" }}>
          <Button type="submit" variant="accent">
            Login
          </Button>
        </div>
      </Form>
    </div>
  );
}

// PasswordField is not exported by S2 directly, let's use TextField with type="password"
function PasswordField(props: any) {
  return <TextField {...props} type="password" />;
}
