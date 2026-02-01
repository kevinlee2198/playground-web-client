import { Link } from "@/i18n/navigation";
import type { UserSearchNode } from "@/lib/types/user";
import { cn } from "@/lib/utils";

interface UserSearchResultProps {
  user: UserSearchNode;
  isHighlighted?: boolean;
  onClick?: () => void;
}

export function UserSearchResult({ user, isHighlighted, onClick }: UserSearchResultProps) {
  return (
    <Link
      href={`/user/${user.username}`}
      onClick={onClick}
      className={cn(
        "flex flex-col px-4 py-2.5 transition-colors hover:bg-muted",
        isHighlighted && "bg-muted"
      )}
    >
      <span className="text-sm font-medium">
        {user.firstName} {user.lastName}
      </span>
      <span className="text-xs text-muted-foreground">@{user.username}</span>
    </Link>
  );
}
