import { Router } from "express";
import { getSlots } from "../controllers/slots.controller";
import { asyncHandler } from "../utils/async-handler";

export const slotsRouter = Router();

slotsRouter.get("/", asyncHandler(getSlots));
