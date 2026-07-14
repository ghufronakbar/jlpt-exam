"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSession, destroySession } from "@/lib/auth";
import { BCRYPT_COST_FACTOR } from "@/constants";
import { RegisterSchema, LoginSchema } from "./schemas";

export type AuthFormState =
  | {
      errors?: {
        username?: string[];
        password?: string[];
        confirmPassword?: string[];
      };
      message?: string;
    }
  | undefined;

// Registration is one-time only: closed as soon as the first User row exists.
export async function registerAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const existingUserCount = await prisma.user.count();

  if (existingUserCount > 0) {
    redirect("/login");
  }

  const validatedFields = RegisterSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors };
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

export async function loginAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const validatedFields = LoginSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });

  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors };
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
