"use server";

import { clerkClient, currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

/**
 * Ensures a user exists in the database
 */
async function getOrCreateUser() {
  // Get current Clerk user
  const clerkUser = await currentUser();
  if (!clerkUser) throw new Error("Unauthorized");

  const userId = clerkUser.id;

  // Check if user exists in DB
  let user = await db.user.findUnique({ where: { clerkUserId: userId } });
  if (user) return user;

  // Get email safely
  const email = clerkUser.emailAddresses?.[0]?.emailAddress;
  if (!email) throw new Error("No email found for user");

  // Create new user in DB with default role "PATIENT"
  user = await db.user.create({
    data: {
      clerkUserId: userId,
      email,
      name: `${clerkUser.firstName ?? ""} ${clerkUser.lastName ?? ""}`,
      imageUrl: clerkUser.profileImageUrl ?? "",
      role: "PATIENT", // default role
    },
  });

  return user;
}

/**
 * Sets the user's role
 */
export async function setUserRole(formData) {
  const user = await getOrCreateUser();

  const role = formData.get("role");
  if (!role || !["PATIENT", "DOCTOR"].includes(role)) {
    throw new Error("Invalid role selection");
  }

  if (role === "PATIENT") {
    await db.user.update({
      where: { clerkUserId: user.clerkUserId },
      data: { role: "PATIENT" },
    });
    revalidatePath("/");
    return { success: true, redirect: "/doctors" };
  }

  if (role === "DOCTOR") {
    const specialty = formData.get("specialty");
    const experience = parseInt(formData.get("experience"), 10);
    const credentialUrl = formData.get("credentialUrl");
    const description = formData.get("description");

    if (!specialty || !experience || !credentialUrl || !description) {
      throw new Error("All fields are required");
    }

    await db.user.update({
      where: { clerkUserId: user.clerkUserId },
      data: {
        role: "DOCTOR",
        specialty,
        experience,
        credentialUrl,
        description,
        verificationStatus: "PENDING",
      },
    });

    revalidatePath("/");
    return { success: true, redirect: "/doctor/verification" };
  }
}

/**
 * Gets the current user's profile
 */
export async function getCurrentUser() {
  return await getOrCreateUser();
}
