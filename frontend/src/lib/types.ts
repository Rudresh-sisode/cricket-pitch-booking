export type User = {
  id: number;
  name: string;
  email: string;
};

export type Pitch = {
  id: number;
  name: string;
  location: string;
  pricePerHour: string;
};

export type SlotStatus = "available" | "booked" | "reserved";

export type Slot = {
  startTime: string;
  endTime: string;
  status: SlotStatus;
  reservedByUserId: number | null;
  reservedTtlSeconds: number | null;
};

export type Booking = {
  id: number;
  bookingDate: string;
  startTime: string;
  endTime: string;
  createdAt: string;
  pitch: Pitch;
};
