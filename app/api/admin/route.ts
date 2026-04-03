import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

async function isAdmin(userId: string) {
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  return user.privateMetadata.role === "admin";
}

// list all the users
// search each user
// for each user maybe list the todos and delete their todos or update their todos
