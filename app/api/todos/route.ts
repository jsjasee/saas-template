import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

const ITEMS_PER_PAGE = 10; // for pagination

// grabbing the todos
export async function GET(req: NextRequest) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1"); // how will the searchParams url look like? like this (from frontend): /api/todos?page=${page}&search=${debounceSearchTerm}
  const search = searchParams.get("search") || "";

  try {
    const todos = await prisma.todo.findMany({
      where: {
        userId: userId,
        title: {
          contains: search, // we not finding the exact match,
          mode: "insensitive", // not case-sensitive,
        },
      },
      orderBy: { createdAt: "desc" }, // orderby descending
      take: ITEMS_PER_PAGE, // take these items ONLY, but then we also need to determine the skip which is below
      skip: (page - 1) * ITEMS_PER_PAGE,
    });

    // we can optionally count the number of todos
    const totalItems = await prisma.todo.count({
      where: {
        userId: userId,
        title: {
          contains: "search",
          mode: "insensitive",
        },
      },
    });

    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

    return NextResponse.json(
      {
        todos,
        currentPage: page,
        totalPages,
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    console.error("Error getting todos", error);
    return NextResponse.json(
      {
        error: "Internal server error",
      },
      {
        status: 500,
      },
    );
  }
}

// adding a new todo + restrict user so they cannot post more than 3 todos
export async function POST(req: NextRequest) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { todos: true }, // we are also grabbing all the todos that is attached to the user.
  });
  console.log(user);

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // if user is not subscribed, highest limit is 3
  if (!user.isSubscribed && user.todos.length >= 3) {
    return NextResponse.json(
      {
        error: "Free users can only create up to 3 todos.",
      },
      {
        status: 403,
      },
    );
  }

  const { title } = await req.json();
  const todo = await prisma.todo.create({
    data: { title, userId },
  });

  return NextResponse.json(todo, { status: 201 });
}
