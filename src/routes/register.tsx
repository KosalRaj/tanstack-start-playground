import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { register } from "../auth";
import { TextField, Button, Form, Heading } from "@react-spectrum/s2";
import { useState } from "react";

export const Route = createFileRoute("/register")({
  component: RegisterComponent,
});

function RegisterComponent() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const username = formData.get("username") as string;
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    const result = await register({ data: { username, password } });

    if (result.success) {
      router.invalidate();
      router.navigate({ to: "/" });
    } else {
      setError(result.error || "Registration failed");
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
        <Heading level={1}>Register</Heading>
        <TextField label="Username" name="username" isRequired autoFocus />
        <PasswordField label="Password" name="password" isRequired />
        <PasswordField label="Confirm Password" name="confirmPassword" isRequired />
        {error && <div style={{ color: "red", marginTop: "8px" }}>{error}</div>}
        <div style={{ marginTop: "16px", display: "flex", gap: "12px", alignItems: "center" }}>
          <Button type="submit" variant="accent">
            Register
          </Button>
          <Link to="/login" style={{ color: "blue", textDecoration: "underline" }}>
            Already have an account? Login
          </Link>
        </div>
      </Form>
    </div>
  );
}

function PasswordField(props: any) {
  return <TextField {...props} type="password" />;
}
