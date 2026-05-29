"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertDateOnly = assertDateOnly;
exports.todayLocalDateOnly = todayLocalDateOnly;
exports.assertNotPastDate = assertNotPastDate;
exports.dateToUtcStart = dateToUtcStart;
exports.dateRangeUtc = dateRangeUtc;
exports.toDateOnlyString = toDateOnlyString;
const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;
function assertDateOnly(date) {
    if (!DATE_ONLY_REGEX.test(date)) {
        throw new Error("Date must be in YYYY-MM-DD format");
    }
}
function todayLocalDateOnly() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}
function assertNotPastDate(date) {
    assertDateOnly(date);
    if (date < todayLocalDateOnly()) {
        throw new Error("Date cannot be in the past");
    }
}
function dateToUtcStart(date) {
    assertDateOnly(date);
    return new Date(`${date}T00:00:00.000Z`);
}
function dateRangeUtc(date) {
    const start = dateToUtcStart(date);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    return { start, end };
}
function toDateOnlyString(date) {
    return date.toISOString().slice(0, 10);
}
//# sourceMappingURL=date.js.map