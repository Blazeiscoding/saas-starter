import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    console.error("WEBHOOK_SECRET is not defined in the environment variables");
    return new Response("Internal Server Error", { status: 500 });
  }

  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    console.error("Missing svix headers");
    return new Response("Bad Request: Missing svix headers", { status: 400 });
  }

  const payload = await req.json();
  const body = JSON.stringify(payload);

  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Error verifying webhook:", err);
    return new Response("Bad Request: Invalid webhook signature", { status: 400 });
  }

  const { id } = evt.data;
  const eventType = evt.type;

  console.log(`Received webhook: ID=${id}, Type=${eventType}`);
  console.log("Webhook data:", evt.data);

  if (eventType === "user.created") {
    try {
      const { email_addresses, primary_email_address_id } = evt.data;

      if (!primary_email_address_id || !email_addresses) {
        console.error("Invalid data from webhook");
        return new Response("Bad Request: Invalid data", { status: 400 });
      }

      const primaryEmail = email_addresses.find(
        (email) => email.id === primary_email_address_id
      );

      if (!primaryEmail) {
        console.error("No primary email found");
        return new Response("Bad Request: No primary email found", { status: 400 });
      }

      const newUser = await prisma.user.create({
        data: {
          id: evt.data.id,
          email: primaryEmail.email_address,
          isSubscribed: false, // Default setting
        },
      });

      console.log("New user created in database:", newUser);
    } catch (error) {
      console.error("Error creating user in database:", error);
      return new Response("Internal Server Error", { status: 500 });
    }
  }

  return new Response("Webhook processed successfully", { status: 200 });
}
