import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    console.error("WEBHOOK_SECRET is missing in environment variables");
    return new Response("Server misconfiguration", { status: 500 });
  }

  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Missing Svix headers", { status: 400 });
  }

  let payload: any;
  try {
    payload = await req.json();
  } catch (err) {
    console.error("Failed to parse JSON payload:", err);
    return new Response("Invalid JSON payload", { status: 400 });
  }

  const body = JSON.stringify(payload);

  const webhook = new Webhook(WEBHOOK_SECRET);
  let event: WebhookEvent;

  try {
    event = webhook.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Webhook verification failed:", err);
    return new Response("Invalid webhook signature", { status: 400 });
  }

  const { type, data } = event;
  
  console.log("Event data:", data);

  if (type === "user.created") {
    try {
      const { email_addresses, primary_email_address_id } = data;

      if (!email_addresses || email_addresses.length === 0) {
        console.error("No email addresses found in event data");
        return new Response("No email addresses found", { status: 400 });
      }

      const primaryEmail = email_addresses.find(
        (email) => email.id === primary_email_address_id
      );

      if (!primaryEmail || !primaryEmail.email_address) {
        console.error("Primary email address not found in event data");
        return new Response("Primary email address missing", { status: 400 });
      }

      const newUser = await prisma.user.create({
        data: {
          id: data.id,
          email: primaryEmail.email_address,
          isSubscribed: false,
        },
      });

      console.log("User successfully created:", newUser);
    } catch (err) {
      console.error("Error saving user to database:", err);
      return new Response("Database error", { status: 500 });
    }
  }

  return new Response("Webhook processed successfully", { status: 200 });
}
