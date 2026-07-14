"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSession, destroySession } from "@/lib/auth";
import { BCRYPT_COST_FACTOR } from "@/constants";
import { RegisterSchema, LoginSchema, type RegisterInput, type LoginInput } from "./schemas";

export type AuthActionResult = { message: string } | undefined;

// Registration is one-time only: closed as soon as the first User row exists.
export async function registerAction(input: RegisterInput): Promise<AuthActionResult> {
  const existingUserCount = await prisma.user.count();

  if (existingUserCount > 0) {
    redirect("/login");
  }

  const validatedFields = RegisterSchema.safeParse(input);

  if (!validatedFields.success) {
    return { message: validatedFields.error.issues[0]?.message ?? "Data tidak valid." };
  }

  const { username, password } = validatedFields.data;
  const hashedPassword = await bcrypt.hash(password, BCRYPT_COST_FACTOR);

  const user = await prisma.user.create({
    data: { username, password: hashedPassword },
  });

  await createSession(user.id);
  redirect("/dashboard");
}

const INVALID_CREDENTIALS_MESSAGE = "Username atau password salah.";

export async function loginAction(input: LoginInput): Promise<AuthActionResult> {
  const validatedFields = LoginSchema.safeParse(input);

  if (!validatedFields.success) {
    return { message: validatedFields.error.issues[0]?.message ?? "Data tidak valid." };
  }

  const { username, password } = validatedFields.data;
  const user = await prisma.user.findUnique({ where: { username } });

  if (!user) {
    return { message: INVALID_CREDENTIALS_MESSAGE };
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    return { message: INVALID_CREDENTIALS_MESSAGE };
  }

  await createSession(user.id);
  redirect("/dashboard");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}
