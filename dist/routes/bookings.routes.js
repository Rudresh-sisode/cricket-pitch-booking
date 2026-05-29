"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bookingsRouter = void 0;
const express_1 = require("express");
const bookings_controller_1 = require("../controllers/bookings.controller");
const auth_1 = require("../middleware/auth");
const async_handler_1 = require("../utils/async-handler");
exports.bookingsRouter = (0, express_1.Router)();
exports.bookingsRouter.post("/reserve-slot", auth_1.requireAuth, (0, async_handler_1.asyncHandler)(bookings_controller_1.reserve));
exports.bookingsRouter.post("/confirm-booking", auth_1.requireAuth, (0, async_handler_1.asyncHandler)(bookings_controller_1.confirm));
exports.bookingsRouter.get("/my-bookings", auth_1.requireAuth, (0, async_handler_1.asyncHandler)(bookings_controller_1.myBookings));
//# sourceMappingURL=bookings.routes.js.map