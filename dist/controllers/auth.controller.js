"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = register;
exports.login = login;
exports.logout = logout;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const zod_1 = require("zod");
const prisma_1 = require("../config/prisma");
const error_1 = require("../middleware/error");
const jwt_1 = require("../utils/jwt");
const redis_1 = require("../config/redis");
const registerSchema = zod_1.z.object({
    name: zod_1.z.string().min(2),
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6)
});
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6)
});
async function register(req, res) {
    const input = registerSchema.parse(req.body);
    const existing = await prisma_1.prisma.user.findUnique({
        where: { email: input.email.toLowerCase() }
    });
    if (existing) {
        throw new error_1.ApiError(409, "Email is already registered");
    }
    const passwordHash = await bcryptjs_1.default.hash(input.password, 10);
    const user = await prisma_1.prisma.user.create({
        data: {
            name: input.name,
            email: input.email.toLowerCase(),
            password: passwordHash
        }
    });
    const { token } = (0, jwt_1.createAccessToken)({ id: user.id, email: user.email });
    return res.status(201).json({
        token,
        user: {
            id: user.id,
            name: user.name,
            email: user.email
        }
    });
}
async function login(req, res) {
    const input = loginSchema.parse(req.body);
    const user = await prisma_1.prisma.user.findUnique({
        where: { email: input.email.toLowerCase() }
    });
    if (!user) {
        throw new error_1.ApiError(401, "Invalid credentials");
    }
    const isMatch = await bcryptjs_1.default.compare(input.password, user.password);
    if (!isMatch) {
        throw new error_1.ApiError(401, "Invalid credentials");
    }
    const { token } = (0, jwt_1.createAccessToken)({ id: user.id, email: user.email });
    return res.json({
        token,
        user: {
            id: user.id,
            name: user.name,
            email: user.email
        }
    });
}
async function logout(req, res) {
    if (!req.user || !req.token) {
        throw new error_1.ApiError(401, "Unauthorized");
    }
    const exp = (0, jwt_1.decodeTokenExpiry)(req.token);
    const now = Math.floor(Date.now() / 1000);
    const ttl = exp && exp > now ? exp - now : 60;
    await redis_1.redis.set(`auth:blacklist:${req.user.jti}`, "1", "EX", ttl);
    return res.json({ message: "Logged out" });
}
//# sourceMappingURL=auth.controller.js.map