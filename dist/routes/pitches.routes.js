"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pitchesRouter = void 0;
const express_1 = require("express");
const pitches_controller_1 = require("../controllers/pitches.controller");
const async_handler_1 = require("../utils/async-handler");
exports.pitchesRouter = (0, express_1.Router)();
exports.pitchesRouter.get("/", (0, async_handler_1.asyncHandler)(pitches_controller_1.getPitches));
//# sourceMappingURL=pitches.routes.js.map