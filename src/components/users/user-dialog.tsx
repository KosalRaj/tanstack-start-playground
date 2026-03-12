import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { UserRow } from "./columns";

interface UserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: UserRow | null; // null means "Add Mode", object means "Edit Mode"
  onSubmit: (data: { id?: string; username: string; password?: string }) => void;
  isLoading: boolean;
}

export function UserDialog({ open, onOpenChange, user, onSubmit, isLoading }: UserDialogProps) {
  const isEditing = !!user;
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // Sync state when dialog opens/closes
  useEffect(() => {
    if (open) {
      if (user) {
        setUsername(user.username);
        // Leave password blank in edit mode unless user wants to change it
        setPassword("");
      } else {
        setUsername("");
        setPassword("");
      }
    }
  }, [open, user]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;

    if (isEditing) {
      onSubmit({ id: user.id, username, password: password || undefined });
    } else {
      if (!password) return; // Password is required on create
      onSubmit({ username, password });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit User" : "Add New User"}</DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Update user details. Leave the password blank to keep it unchanged."
                : "Create a new user account below."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="username" className="text-right">
                Username
              </Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="password" className="text-right">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="col-span-3"
                required={!isEditing} // Require password on create, optional on edit
                placeholder={isEditing ? "Leave blank to ignore" : ""}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || (!username) || (!isEditing && !password)}>
              {isLoading ? "Saving..." : "Save User"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
