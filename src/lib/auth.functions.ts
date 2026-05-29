import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "./db";

// Types
export type User = {
  id: string;
  email: string;
};

// Sign Up Schema
const AuthSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const signUp = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => AuthSchema.parse(d))
  .handler(async ({ data }) => {
    try {
      const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(data.email.toLowerCase());
      if (existing) {
        return { ok: false as const, error: "Email already registered" };
      }

      const id = "usr_" + Math.random().toString(36).substring(2, 10);
      const hash = await bcrypt.hash(data.password, 10);

      db.prepare("INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)").run(
        id,
        data.email.toLowerCase(),
        hash
      );

      return { ok: true as const, user: { id, email: data.email.toLowerCase() } };
    } catch (err: any) {
      return { ok: false as const, error: err.message || "Failed to create account" };
    }
  });

export const signIn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => AuthSchema.parse(d))
  .handler(async ({ data }) => {
    try {
      const user = db.prepare("SELECT id, email, password_hash FROM users WHERE email = ?").get(data.email.toLowerCase()) as any;
      if (!user) {
        return { ok: false as const, error: "Invalid email or password" };
      }

      const isValid = await bcrypt.compare(data.password, user.password_hash);
      if (!isValid) {
        return { ok: false as const, error: "Invalid email or password" };
      }

      return { ok: true as const, user: { id: user.id, email: user.email } };
    } catch (err: any) {
      return { ok: false as const, error: err.message || "Failed to sign in" };
    }
  });
