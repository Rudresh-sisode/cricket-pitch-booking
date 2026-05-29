import type { NextFunction, Request, Response } from "express";
import { redis } from "../config/redis";
import { ApiError } from "./error";
import { extractBearerToken, verifyAccessToken } from "../utils/jwt";

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = extractBearerToken(req.headers.authorization);
    if (!token) {
      throw new ApiError(401, "Missing bearer token");
    }

    const user = verifyAccessToken(token);
    const isBlacklisted = await redis.exists(`auth:blacklist:${user.jti}`);

    if (isBlacklisted) {
      throw new ApiError(401, "Token has been logged out");
    }

    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    if (error instanceof ApiError) {
      return next(error);
    }

    return next(new ApiError(401, "Invalid or expired token"));
  }
}
