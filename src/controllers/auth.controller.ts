import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { ApiError } from "../middleware/error";
import { createAccessToken, decodeTokenExpiry } from "../utils/jwt";
import { redis } from "../config/redis";

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6)
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

export async function register(req: Request, res: Response) {
  const input = registerSchema.parse(req.body);

  const existing = await prisma.user.findUnique({
    where: { email: input.email.toLowerCase() }
  });

  if (existing) {
    throw new ApiError(409, "Email is already registered");
  }

  const passwordHash = await bcrypt.hash(input.password, 10);
  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email.toLowerCase(),
      password: passwordHash
    }
  });

  const { token } = createAccessToken({ id: user.id, email: user.email });

  return res.status(201).json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email
    }
  });
}

export async function login(req: Request, res: Response) {
  const input = loginSchema.parse(req.body);

  const user = await prisma.user.findUnique({
    where: { email: input.email.toLowerCase() }
  });

  if (!user) {
    throw new ApiError(401, "Invalid credentials");
  }

  const isMatch = await bcrypt.compare(input.password, user.password);
  if (!isMatch) {
    throw new ApiError(401, "Invalid credentials");
  }

  const { token } = createAccessToken({ id: user.id, email: user.email });

  return res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email
    }
  });
}

export async function logout(req: Request, res: Response) {
  if (!req.user || !req.token) {
    throw new ApiError(401, "Unauthorized");
  }

  const exp = decodeTokenExpiry(req.token);
  const now = Math.floor(Date.now() / 1000);
  const ttl = exp && exp > now ? exp - now : 60;

  await redis.set(`auth:blacklist:${req.user.jti}`, "1", "EX", ttl);

  return res.json({ message: "Logged out" });
}
