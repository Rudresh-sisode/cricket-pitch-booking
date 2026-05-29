"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reserve = reserve;
exports.confirm = confirm;
exports.myBookings = myBookings;
exports.releaseFromExpiry = releaseFromExpiry;
const socket_1 = require("../config/socket");
const booking_service_1 = require("../services/booking.service");
async function reserve(req, res) {
    const userId = req.user.id;
    const input = await (0, booking_service_1.parseAndValidateBookingInput)(req.body);
    const result = await (0, booking_service_1.reserveSlot)(userId, input.pitchId, input.date, input.startTime);
    (0, socket_1.emitSlotReserved)(input.pitchId, input.date, input.startTime, userId);
    return res.json({
        message: result.alreadyReserved ? "Slot already reserved by you" : "Slot reserved",
        expiresInSeconds: result.expiresInSeconds
    });
}
async function confirm(req, res) {
    const userId = req.user.id;
    const input = await (0, booking_service_1.parseAndValidateBookingInput)(req.body);
    try {
        const result = await (0, booking_service_1.confirmBooking)(userId, input.pitchId, input.date, input.startTime);
        (0, socket_1.emitSlotBooked)(input.pitchId, input.date, input.startTime, result.booking.id, userId);
        return res.status(result.idempotent ? 200 : 201).json({
            message: result.idempotent ? "Booking already confirmed" : "Booking confirmed",
            booking: result.booking
        });
    }
    catch (error) {
        throw (0, booking_service_1.mapPrismaError)(error);
    }
}
async function myBookings(req, res) {
    const bookings = await (0, booking_service_1.getMyBookings)(req.user.id);
    return res.json({ bookings });
}
async function releaseFromExpiry(pitchId, date, startTime) {
    (0, socket_1.emitSlotReleased)(pitchId, date, startTime);
}
//# sourceMappingURL=bookings.controller.js.map