import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

// 1. for the function, name it POST or GET etc. in nextJS
export async function POST() {
  const { userId } = await auth(); // what's the difference between auth() and useAuth() ? latter is for frontend only?

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // capture payment code here, eg. if user enter details and click on the subscribe etc. then pass it to stripe or something

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } }); // we saved this id in the neon DB when user is created, so we can use this id to locate them?
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    const subscriptionEnds = new Date();
    subscriptionEnds.setMonth(subscriptionEnds.getMonth() + 1); // grabbing the subscription then add it for one more month

    // update the subscription Ends field
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { isSubscribed: true, subscriptionEnds: subscriptionEnds },
    });

    return NextResponse.json(
      {
        message: "Subscription success",
        subscriptionEnds: updatedUser.subscriptionEnds,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error updating subscription", error);
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

export async function GET() {
  const { userId } = await auth(); // what's the difference between auth() and useAuth() ? latter is for frontend only?

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // find the user
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        isSubscribed: true,
        subscriptionEnds: true,
      }, // mark the fields you want to select, like sql
    }); // we saved this id in the neon DB when user is created, so we can use this id to locate them?
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    const now = new Date();

    // mark a subscription as gone if it is a new month.
    // check if user has a subscription and the subscription has ended, then remove the subscription on the database.
    if (user.subscriptionEnds && user.subscriptionEnds < now) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          isSubscribed: false,
          subscriptionEnds: null,
        },
      });

      return NextResponse.json({
        isSubscribed: false, // is confirmed not subscribed already, so we can confidently return FALSE for isSubscribed.
        subscriptionEnds: null,
      });
    }

    return NextResponse.json({
      isSubscribed: user.isSubscribed,
      subscriptionEnds: user.subscriptionEnds,
    });
  } catch (error) {
    console.error("Error updating subscription", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
