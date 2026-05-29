export const OPENING_HOUR = 6;
export const CLOSING_HOUR = 23;

export type SlotWindow = {
  startTime: string;
  endTime: string;
};

function twoDigits(value: number) {
  return value.toString().padStart(2, "0");
}

export function formatTime(hour: number) {
  return `${twoDigits(hour)}:00`;
}

export function createHourlySlots() {
  const slots: SlotWindow[] = [];
  for (let hour = OPENING_HOUR; hour < CLOSING_HOUR; hour += 1) {
    slots.push({
      startTime: formatTime(hour),
      endTime: formatTime(hour + 1)
    });
  }
  return slots;
}

export function isValidStartTime(startTime: string) {
  return createHourlySlots().some((slot) => slot.startTime === startTime);
}

export function endTimeFromStart(startTime: string) {
  const match = /^(\d{2}):00$/.exec(startTime);
  if (!match) {
    throw new Error("Invalid time format");
  }

  const hour = Number(match[1]);
  if (hour < OPENING_HOUR || hour >= CLOSING_HOUR) {
    throw new Error("Slot outside operating hours");
  }

  return formatTime(hour + 1);
}
