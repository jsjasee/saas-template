"use client";

import { useClerk, useAuth, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useCallback, useEffect, useState } from "react";
import { Todo } from "@/generated/prisma/browser";
import { useDebounceValue } from "usehooks-ts";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/Pagination";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { TodoItem } from "@/components/TodoItem";
import { TodoForm } from "@/components/TodoForm";

/*
A debounce value: Wait a bit. If the value keeps changing, do nothing yet. Only use the value after it has stayed still for a moment. eg. the person types h then e the l until they typed 'hello' -> a normal value will keep changing, a debounce value will wait until person stops typing for 500ms then take that value once it stops changing.
*/

function Dashboard() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const { isLoaded } = useAuth();
  const router = useRouter();
  const [todos, setTodos] = useState<Todo[]>([]); // you can specify the type of the todos as well because its in typescript.
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [totalPage, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [isSubscribed, setIsSubscribed] = useState(false);

  const [debounceSearchTerm] = useDebounceValue(searchTerm, 500); // the debounceSearchTerm will only update if user stops typing for 500ms

  // so useCallback is used here because we want to update the function that is stored when debounceSearchTerm runs? can i NOT use useCallback?
  const fetchTodos = useCallback(
    async (page: number) => {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          page: String(page),
          search: debounceSearchTerm,
        });
        const response = await fetch(`/api/todos?${params.toString()}`);

        // use React Query (now Tanstack Query)? -> to handle the cases that the query might fail (btw setLoading is given by React Query)
        if (!response.ok) {
          throw new Error("Failed to fetch todos");
        }

        const data = await response.json(); // refer to backend for the data structure
        setTodos(data.todos);
        setTotalPages(data.totalPages);
        setCurrentPage(data.currentPage);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    },
    [debounceSearchTerm],
  );

  const fetchSubscriptionStatus = useCallback(async () => {
    const response = await fetch("/api/subscription");
    if (!response.ok) {
      throw new Error("Failed to fetch subscription status.");
    }

    const data = await response.json();
    setIsSubscribed(data.isSubscribed); // based on the isSubscribed can show or hide subscrib button
  }, []);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    fetchSubscriptionStatus();
  }, [fetchSubscriptionStatus, isLoaded]);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    fetchTodos(currentPage);
  }, [currentPage, fetchTodos, isLoaded]);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    const params = new URLSearchParams();

    if (debounceSearchTerm) {
      params.set("search", debounceSearchTerm);
    }

    if (currentPage > 1) {
      params.set("page", String(currentPage));
    }

    const nextUrl = params.toString()
      ? `/dashboard?${params.toString()}`
      : "/dashboard";

    router.replace(nextUrl, { scroll: false });
  }, [currentPage, debounceSearchTerm, isLoaded, router]);

  const handleAddTodo = async (title: string) => {
    try {
      // we are expecting POST request from our backend
      // fetch is for put post get etc. requests, just specify the method
      const response = await fetch("/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" }, // we are sending a json data
        body: JSON.stringify({ title }), // refer to backend for the structure
      });

      if (!response.ok) {
        throw new Error("Failed to add todo");
      }

      await fetchTodos(currentPage);
    } catch (error) {
      // or use react hot toast to send out the notifications
      console.log(error);
    }
  };

  const handleUpdateTodo = async (id: string, completed: boolean) => {
    try {
      const response = await fetch(`/api/todos/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed }),
      });

      if (!response.ok) {
        throw new Error("Failed to update todo");
      }

      await fetchTodos(currentPage);
    } catch (error) {
      console.log(error);
    }
  };

  const handleDeleteTodo = async (id: string) => {
    try {
      const response = await fetch(`/api/todos/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete todo");
      }

      await fetchTodos(currentPage);
    } catch (error) {
      console.log(error);
    }
  };

  async function handleSignOut() {
    await signOut();
    router.push("/");
  }

  if (!isLoaded) {
    return <div>Loading...</div>;
  }

  /*
  <div className="min-h-screen bg-background p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Button variant="outline" onClick={handleSignOut}>
          Sign Out
        </Button>
      </div>
      <p className="text-muted-foreground">Welcome! Your user ID: {userId}</p>
    </div>
  */

  return (
    <div className="container mx-auto p-4 max-w-3xl mb-8">
      <h1 className="text-3xl font-bold mb-8 text-center">
        Welcome, {user?.emailAddresses[0].emailAddress}!
      </h1>
      <Button variant="outline" onClick={handleSignOut}>
        Sign Out
      </Button>
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Add New Todo</CardTitle>
        </CardHeader>
        <CardContent>
          <TodoForm onSubmit={(title) => handleAddTodo(title)} />
        </CardContent>
      </Card>
      {!isSubscribed && todos.length >= 3 && (
        <Alert variant="destructive" className="mb-8">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You&apos;ve reached the maximum number of free todos.{" "}
            <Link href="/subscribe" className="font-medium underline">
              Subscribe now
            </Link>{" "}
            to add more.
          </AlertDescription>
        </Alert>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Your Todos</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            type="text"
            placeholder="Search todos..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="mb-4"
          />
          {debounceSearchTerm && (
            <p className="mb-4 text-sm text-muted-foreground">
              Showing results for &quot;{debounceSearchTerm}&quot;
            </p>
          )}
          {loading ? (
            <p className="text-center text-muted-foreground">
              Loading your todos...
            </p>
          ) : todos.length === 0 ? (
            <p className="text-center text-muted-foreground">
              You don&apos;t have any todos yet. Add one above!
            </p>
          ) : (
            <>
              <ul className="space-y-4">
                {todos.map((todo: Todo) => (
                  <TodoItem
                    key={todo.id}
                    todo={todo}
                    onUpdate={handleUpdateTodo}
                    onDelete={handleDeleteTodo}
                  />
                ))}
              </ul>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPage}
                onPageChange={setCurrentPage}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default Dashboard;
