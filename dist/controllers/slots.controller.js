"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSlots = getSlots;
const error_1 = require("../middleware/error");
const slot_service_1 = require("../services/slot.service");
const date_1 = require("../utils/date");
async function getSlots(req, res) {
    const pitchId = Number(req.query.pitchId);
    const date = String(req.query.date ?? "");
    if (!Number.isInteger(pitchId) || pitchId <= 0) {
        throw new error_1.ApiError(400, "pitchId query parameter is required");
    }
    try {
        (0, date_1.assertDateOnly)(date);
    }
    catch {
        throw new error_1.ApiError(400, "Date must be in YYYY-MM-DD format");
    }
    try {
        (0, date_1.assertNotPastDate)(date);
    }
    catch {
        throw new error_1.ApiError(400, "Past dates are not allowed");
    }
    const slots = await (0, slot_service_1.getSlotsForPitchDate)(pitchId, date);
    res.set("Cache-Control", "no-store");
    return res.json({ pitchId, date, slots });
}
//# sourceMappingURL=slots.controller.js.map