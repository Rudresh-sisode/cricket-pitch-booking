import { Router } from "express";
import { confirm, myBookings, reserve } from "../controllers/bookings.controller";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../utils/async-handler";

export const bookingsRouter = Router();

bookingsRouter.post("/reserve-slot", requireAuth, asyncHandler(reserve));
bookingsRouter.post("/confirm-booking", requireAuth, asyncHandler(confirm));
bookingsRouter.get("/my-bookings", requireAuth, asyncHandler(myBookings));
