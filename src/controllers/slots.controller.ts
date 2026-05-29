import type { Request, Response } from "express";
import { ApiError } from "../middleware/error";
import { getSlotsForPitchDate } from "../services/slot.service";
import { assertDateOnly, assertNotPastDate } from "../utils/date";

export async function getSlots(req: Request, res: Response) {
  const pitchId = Number(req.query.pitchId);
  const date = String(req.query.date ?? "");

  if (!Number.isInteger(pitchId) || pitchId <= 0) {
    throw new ApiError(400, "pitchId query parameter is required");
  }

  try {
    assertDateOnly(date);
  } catch {
    throw new ApiError(400, "Date must be in YYYY-MM-DD format");
  }

  try {
    assertNotPastDate(date);
  } catch {
    throw new ApiError(400, "Past dates are not allowed");
  }

  const slots = await getSlotsForPitchDate(pitchId, date);
  res.set("Cache-Control", "no-store");
  return res.json({ pitchId, date, slots });
}
