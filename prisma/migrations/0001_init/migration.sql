-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('confirmed', 'cancelled');

-- CreateTable
CREATE TABLE "User" (
  "id" SERIAL NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "password" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pitch" (
  "id" SERIAL NOT NULL,
  "name" TEXT NOT NULL,
  "location" TEXT NOT NULL,
  "pricePerHour" DECIMAL(10,2) NOT NULL,

  CONSTRAINT "Pitch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
  "id" SERIAL NOT NULL,
  "userId" INTEGER NOT NULL,
  "pitchId" INTEGER NOT NULL,
  "bookingDate" DATE NOT NULL,
  "startTime" VARCHAR(5) NOT NULL,
  "endTime" VARCHAR(5) NOT NULL,
  "status" "BookingStatus" NOT NULL DEFAULT 'confirmed',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Pitch_name_key" ON "Pitch"("name");

-- CreateIndex
CREATE INDEX "Booking_pitchId_bookingDate_idx" ON "Booking"("pitchId", "bookingDate");

-- CreateIndex
CREATE INDEX "Booking_userId_createdAt_idx" ON "Booking"("userId", "createdAt");

-- Partial unique index: only confirmed bookings are unique per pitch/date/start
CREATE UNIQUE INDEX "Booking_pitch_date_start_confirmed_unique"
ON "Booking" ("pitchId", "bookingDate", "startTime")
WHERE "status" = 'confirmed';

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Booking" ADD CONSTRAINT "Booking_pitchId_fkey"
FOREIGN KEY ("pitchId") REFERENCES "Pitch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
