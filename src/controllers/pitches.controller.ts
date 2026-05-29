import type { Request, Response } from "express";
import { prisma } from "../config/prisma";

export async function getPitches(_req: Request, res: Response) {
  const pitches = await prisma.pitch.findMany({
    orderBy: { id: "asc" }
  });

  return res.json({ pitches });
}
