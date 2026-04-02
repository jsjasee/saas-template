import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error("Webhook secret is NOT added in env file.");
  }

  // from the svix docs
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Error occurred - no svix headers.");
  }

  const payload = await req.json();
  const body = JSON.stringify(payload);

  const wh = new Webhook(WEBHOOK_SECRET);

  let event: WebhookEvent;

  try {
    // chances of this failing is quite high, so wrap in try catch
    event = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (error) {
    console.error("Error verifyying webhook", error);
    return new Response("Error occurred", { status: 400 });
  }

  const { id } = event.data;
  const eventType = event.type;

  // logs
  console.log(event);

  // this is like an api call
  if (eventType === "user.created") {
    try {
      const { email_addresses, primary_email_address_id } = event.data;

      console.log("✉️ EMAIL ADDRESS: ", email_addresses);
      console.log("primary_email_address_id:", primary_email_address_id);
      console.log("email_addresses:", JSON.stringify(email_addresses, null, 2));

      // this is optional, can just directly grab it from the email_addresses array (array of objects) i think?
      // (to check the structure, just go to the webhook section in clerk and click on the user.created event to test)
      const primaryEmail = email_addresses.find(
        (email) => email.id === primary_email_address_id,
      );

      if (!primaryEmail) {
        return new Response("No primary email found", { status: 400 });
      }

      // create a user in neon (postgresql)
      const newUser = await prisma.user.create({
        data: {
          id: event.data.id!, // why do we need to pass in the id? i thought id is auto created? like mongoDB?
          email: primaryEmail.email_address,
          isSubscribed: false,
        },
      });
      console.log("New User Created", newUser);
    } catch (error) {
      return new Response("error creating user in database", { status: 400 });
    }
  }

  // MUST RETURN A STATUS CODE 200 OTHERWISE IT WILL COUNT AS AN ERROR
  return new Response("Webhook received successfully", { status: 200 });
}
