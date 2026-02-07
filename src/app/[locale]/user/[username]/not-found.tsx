import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function UserNotFound() {
  return (
    <main className="flex min-h-[50vh] flex-col items-center justify-center px-4">
      <h1 className="mb-4 text-4xl font-bold">404</h1>
      <p className="mb-6 text-lg text-muted-foreground">User not found</p>
      <Button>
        <Link href="/">Return Home</Link>
      </Button>
    </main>
  );
}
