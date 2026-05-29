"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CLOSING_HOUR = exports.OPENING_HOUR = void 0;
exports.formatTime = formatTime;
exports.createHourlySlots = createHourlySlots;
exports.isValidStartTime = isValidStartTime;
exports.endTimeFromStart = endTimeFromStart;
exports.OPENING_HOUR = 6;
exports.CLOSING_HOUR = 23;
function twoDigits(value) {
    return value.toString().padStart(2, "0");
}
function formatTime(hour) {
    return `${twoDigits(hour)}:00`;
}
function createHourlySlots() {
    const slots = [];
    for (let hour = exports.OPENING_HOUR; hour < exports.CLOSING_HOUR; hour += 1) {
        slots.push({
            startTime: formatTime(hour),
            endTime: formatTime(hour + 1)
        });
    }
    return slots;
}
function isValidStartTime(startTime) {
    return createHourlySlots().some((slot) => slot.startTime === startTime);
}
function endTimeFromStart(startTime) {
    const match = /^(\d{2}):00$/.exec(startTime);
    if (!match) {
        throw new Error("Invalid time format");
    }
    const hour = Number(match[1]);
    if (hour < exports.OPENING_HOUR || hour >= exports.CLOSING_HOUR) {
        throw new Error("Slot outside operating hours");
    }
    return formatTime(hour + 1);
}
//# sourceMappingURL=slots.js.map