import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, ArrowUpDown, Pencil, Trash2 } from "lucide-react";

export type UserRow = {
  id: string;
  username: string;
};

interface ColumnProps {
  onEdit: (user: UserRow) => void;
  onDelete: (user: UserRow) => void;
  currentUserId: string | undefined;
}

export const getColumns = ({ onEdit, onDelete, currentUserId }: ColumnProps): ColumnDef<UserRow>[] => [
  {
    accessorKey: "id",
    header: "User ID",
    cell: ({ row }) => <div className="font-mono text-xs">{row.getValue("id")}</div>,
  },
  {
    accessorKey: "username",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-4"
        >
          Username
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => <div className="font-medium">{row.getValue("username")}</div>,
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const user = row.original;
      const isSelf = user.id === currentUserId;

      return (
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="icon" onClick={() => onEdit(user)} title="Edit User">
            <Pencil className="h-4 w-4 text-muted-foreground" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => onDelete(user)} 
            disabled={isSelf}
            title={isSelf ? "You cannot delete yourself" : "Delete User"}
            className={!isSelf ? "hover:text-destructive hover:bg-destructive/10" : ""}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      );
    },
  },
];
