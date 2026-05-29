import crypto from "crypto";
import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../config/env";
import type { AuthUser } from "../types/auth";

type TokenPayload = {
  sub: number;
  email: string;
  jti: string;
};

export function createAccessToken(user: { id: number; email: string }) {
  const jti = crypto.randomUUID();
  const payload: TokenPayload = {
    sub: user.id,
    email: user.email,
    jti
  };

  const signOptions: SignOptions = {
    expiresIn: env.jwtExpiresIn as SignOptions["expiresIn"]
  };

  const token = jwt.sign(payload, env.jwtSecret, signOptions);
  return { token, jti };
}

export function verifyAccessToken(token: string): AuthUser {
  const decoded = jwt.verify(token, env.jwtSecret);
  if (!decoded || typeof decoded !== "object") {
    throw new Error("Invalid token payload");
  }

  const payload = decoded as jwt.JwtPayload & Partial<TokenPayload>;
  const userId = typeof payload.sub === "string" ? Number(payload.sub) : payload.sub;

  if (!userId || !payload.email || !payload.jti) {
    throw new Error("Invalid token payload");
  }

  return {
    id: userId,
    email: payload.email,
    jti: payload.jti
  };
}

export function decodeTokenExpiry(token: string) {
  const decoded = jwt.decode(token) as { exp?: number } | null;
  return decoded?.exp ?? null;
}

export function extractBearerToken(header?: string) {
  if (!header) {
    return null;
  }

  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token;
}
