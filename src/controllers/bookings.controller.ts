import type { Request, Response } from "express";
import { emitSlotBooked, emitSlotReleased, emitSlotReserved } from "../config/socket";
import {
  confirmBooking,
  getMyBookings,
  mapPrismaError,
  parseAndValidateBookingInput,
  reserveSlot
} from "../services/booking.service";

export async function reserve(req: Request, res: Response) {
  const userId = req.user!.id;
  const input = await parseAndValidateBookingInput(req.body);

  const result = await reserveSlot(userId, input.pitchId, input.date, input.startTime);

  emitSlotReserved(input.pitchId, input.date, input.startTime, userId);

  return res.json({
    message: result.alreadyReserved ? "Slot already reserved by you" : "Slot reserved",
    expiresInSeconds: result.expiresInSeconds
  });
}

export async function confirm(req: Request, res: Response) {
  const userId = req.user!.id;
  const input = await parseAndValidateBookingInput(req.body);

  try {
    const result = await confirmBooking(userId, input.pitchId, input.date, input.startTime);

    emitSlotBooked(input.pitchId, input.date, input.startTime, result.booking.id, userId);

    return res.status(result.idempotent ? 200 : 201).json({
      message: result.idempotent ? "Booking already confirmed" : "Booking confirmed",
      booking: result.booking
    });
  } catch (error) {
    throw mapPrismaError(error);
  }
}

export async function myBookings(req: Request, res: Response) {
  const bookings = await getMyBookings(req.user!.id);
  return res.json({ bookings });
}

export async function releaseFromExpiry(pitchId: number, date: string, startTime: string) {
  emitSlotReleased(pitchId, date, startTime);
}
