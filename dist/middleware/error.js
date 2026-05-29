"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiError = void 0;
exports.notFoundHandler = notFoundHandler;
exports.errorHandler = errorHandler;
const zod_1 = require("zod");
class ApiError extends Error {
    statusCode;
    constructor(statusCode, message) {
        super(message);
        this.name = "ApiError";
        this.statusCode = statusCode;
    }
}
exports.ApiError = ApiError;
function notFoundHandler(_req, _res, next) {
    next(new ApiError(404, "Route not found"));
}
function errorHandler(error, _req, res, _next) {
    if (error instanceof ApiError) {
        return res.status(error.statusCode).json({
            message: error.message
        });
    }
    if (error instanceof zod_1.ZodError) {
        return res.status(400).json({
            message: error.issues[0]?.message ?? "Invalid request payload"
        });
    }
    if (error instanceof Error) {
        return res.status(500).json({
            message: error.message
        });
    }
    return res.status(500).json({
        message: "Unknown server error"
    });
}
//# sourceMappingURL=error.js.map