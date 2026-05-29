import { Router } from "express";
import { getPitches } from "../controllers/pitches.controller";
import { asyncHandler } from "../utils/async-handler";

export const pitchesRouter = Router();

pitchesRouter.get("/", asyncHandler(getPitches));
