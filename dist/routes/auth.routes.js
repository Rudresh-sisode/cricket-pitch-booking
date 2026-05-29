"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = void 0;
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const auth_1 = require("../middleware/auth");
const async_handler_1 = require("../utils/async-handler");
exports.authRouter = (0, express_1.Router)();
exports.authRouter.post("/register", (0, async_handler_1.asyncHandler)(auth_controller_1.register));
exports.authRouter.post("/login", (0, async_handler_1.asyncHandler)(auth_controller_1.login));
exports.authRouter.post("/logout", auth_1.requireAuth, (0, async_handler_1.asyncHandler)(auth_controller_1.logout));
//# sourceMappingURL=auth.routes.js.map