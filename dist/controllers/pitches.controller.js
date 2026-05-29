"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPitches = getPitches;
const prisma_1 = require("../config/prisma");
async function getPitches(_req, res) {
    const pitches = await prisma_1.prisma.pitch.findMany({
        orderBy: { id: "asc" }
    });
    return res.json({ pitches });
}
//# sourceMappingURL=pitches.controller.js.map