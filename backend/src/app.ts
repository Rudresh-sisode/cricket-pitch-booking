import express from "express";
import cors from "cors";
import { env } from "./config/env";
import { authRouter } from "./routes/auth.routes";
import { pitchesRouter } from "./routes/pitches.routes";
import { slotsRouter } from "./routes/slots.routes";
import { bookingsRouter } from "./routes/bookings.routes";
import { errorHandler, notFoundHandler } from "./middleware/error";

export const app = express();

app.use(
  cors({
    origin: env.frontendOrigin,
    credentials: true
  })
);
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/auth", authRouter);
app.use("/pitches", pitchesRouter);
app.use("/slots", slotsRouter);
app.use("/", bookingsRouter);

app.use(notFoundHandler);
app.use(errorHandler);
