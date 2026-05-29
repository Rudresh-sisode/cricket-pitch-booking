"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.slotsRouter = void 0;
const express_1 = require("express");
const slots_controller_1 = require("../controllers/slots.controller");
const async_handler_1 = require("../utils/async-handler");
exports.slotsRouter = (0, express_1.Router)();
exports.slotsRouter.get("/", (0, async_handler_1.asyncHandler)(slots_controller_1.getSlots));
//# sourceMappingURL=slots.routes.js.map