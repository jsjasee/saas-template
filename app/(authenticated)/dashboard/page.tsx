"use client";

import { useClerk, useAuth, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useCallback, useEffect, useState } from "react";
import { Todo } from "@/generated/prisma/browser";
import { useDebounceValue } from "usehooks-ts";
import { error } from "node:console";
/*
A debounce value: Wait a bit. If the value keeps changing, do nothing yet. Only use the value after it has stayed still for a moment. eg. the person types h then e the l until they typed 'hello' -> a normal value will keep changing, a debounce value will wait until person stops typing for 500ms then take that value once it stops changing.
*/

function Dashboard() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const { isLoaded, userId } = useAuth();
  const router = useRouter();
  const [todos, setTodos] = useState<Todo[]>([]); // you can specify the type of the todos as well because its in typescript.
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [totalPage, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(0);
  const [isSubscribed, setIsSubscribed] = useState(false);

  const [debounceSearchTerm] = useDebounceValue(searchTerm, 500); // the debounceSearchTerm will only update if user stops typing for 500ms

  if (!isLoaded) {
    return <div>Loading...</div>;
  }

  // so useCallback is used here because we want to update the function that is stored when debounceSearchTerm runs? can i NOT use useCallback?
  const fetchTodos = async function (page: number) {
    try {
      setLoading(true);
      // can use axios as well
      const response = await fetch(
        `/api/todos?page=${page}&search=${debounceSearchTerm}`,
      ); // this is how the params look like!

      // use React Query (now Tanstack Query)? -> to handle the cases that the query might fail (btw setLoading is given by React Query)
      if (!response.ok) {
        throw new Error("Failed to fetch todos");
      }

      const data = await response.json(); // refer to backend for the data structure
      setTodos(data.todos);
      setTotalPages(data.totalPages);
      setCurrentPage(data.currentPage);
      setLoading(false);
    } catch (error) {
      setLoading(false);
      throw new Error("Client failed to render Todos");
    }
  };

  // fetching of todos should bbe done automatically on initial load of the page.
  useEffect(() => {
    fetchTodos(1);
    fetchSubscriptionStatus();
  }, []);

  const fetchSubscriptionStatus = async () => {
    const response = await fetch("/api/subscription");
    if (!response.ok) {
      throw new Error("Failed to fetch subscription status.");
    }

    const data = await response.json();
    setIsSubscribed(data.isSubscribed); // based on the isSubscribed can show or hide subscrib button
  };

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
      const response = await fetch(`/api/todo/${id}`, {
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
