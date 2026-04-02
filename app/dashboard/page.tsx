"use client";

import { useClerk, useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

function Dashboard() {
  const { signOut } = useClerk();
  const { isLoaded, userId } = useAuth();
  const router = useRouter();

  if (!isLoaded) {
    return <div>Loading...</div>;
  }

  async function handleSignOut() {
    await signOut();
    router.push("/");
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Button variant="outline" onClick={handleSignOut}>
          Sign Out
        </Button>
      </div>
      <p className="text-muted-foreground">Welcome! Your user ID: {userId}</p>
    </div>
  );
}

export default Dashboard;
