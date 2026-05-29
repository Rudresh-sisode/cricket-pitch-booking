"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const env_1 = require("./config/env");
const auth_routes_1 = require("./routes/auth.routes");
const pitches_routes_1 = require("./routes/pitches.routes");
const slots_routes_1 = require("./routes/slots.routes");
const bookings_routes_1 = require("./routes/bookings.routes");
const error_1 = require("./middleware/error");
exports.app = (0, express_1.default)();
exports.app.use((0, cors_1.default)({
    origin: env_1.env.frontendOrigin,
    credentials: true
}));
exports.app.use(express_1.default.json());
exports.app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
});
exports.app.use("/auth", auth_routes_1.authRouter);
exports.app.use("/pitches", pitches_routes_1.pitchesRouter);
exports.app.use("/slots", slots_routes_1.slotsRouter);
exports.app.use("/", bookings_routes_1.bookingsRouter);
exports.app.use(error_1.notFoundHandler);
exports.app.use(error_1.errorHandler);
//# sourceMappingURL=app.js.map