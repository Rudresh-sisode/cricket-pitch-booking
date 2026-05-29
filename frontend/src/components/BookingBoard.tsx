import { useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { API_URL, apiRequest } from "../api/client";
import { useAuth } from "../context/AuthContext";
import type { Booking, Pitch, Slot } from "../lib/types";

const HOLD_SECONDS = 120;

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function today() {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function to12h(time: string) {
  const [hStr, m] = time.split(":");
  const h = Number(hStr);
  if (Number.isNaN(h)) return time;
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${m ?? "00"} ${period}`;
}

function buildDateStrip(days = 14) {
  const base = new Date();
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    return {
      value: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
      weekday: d.toLocaleDateString("en-US", { weekday: "short" }),
      day: d.getDate(),
      month: d.toLocaleDateString("en-US", { month: "short" }),
      isToday: i === 0
    };
  });
}

const PITCH_ACCENTS = [
  "from-pitch-500 to-emerald-700",
  "from-neon-500 to-indigo-700",
  "from-gold-400 to-orange-700",
  "from-rose-500 to-fuchsia-700"
];

type SlotsResponse = {
  pitchId: number;
  date: string;
  slots: Slot[];
};

export function BookingBoard() {
  const { token, user, logout } = useAuth();
  const minDate = today();
  const dateStrip = useMemo(() => buildDateStrip(14), []);
  const [pitches, setPitches] = useState<Pitch[]>([]);
  const [selectedPitchId, setSelectedPitchId] = useState<number | null>(null);
  const [date, setDate] = useState(today);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [holdDeadlines, setHoldDeadlines] = useState<Record<string, number>>({});
  const [busySlot, setBusySlot] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const [socketReady, setSocketReady] = useState(false);
  const [tick, setTick] = useState(0);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setTick((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, []);

  // Auto-dismiss toasts
  useEffect(() => {
    if (!statusMessage && !errorMessage) return;
    const timer = window.setTimeout(() => {
      setStatusMessage(null);
      setErrorMessage(null);
    }, 4000);
    return () => window.clearTimeout(timer);
  }, [statusMessage, errorMessage]);

  useEffect(() => {
    if (!token) return;

    apiRequest<{ pitches: Pitch[] }>("/pitches")
      .then((response) => {
        setPitches(response.pitches);
        setSelectedPitchId((current) => current ?? response.pitches[0]?.id ?? null);
      })
      .catch((error: Error) => setErrorMessage(error.message));
  }, [token]);

  const loadSlots = async () => {
    if (!selectedPitchId) return;

    const response = await apiRequest<SlotsResponse>(`/slots?pitchId=${selectedPitchId}&date=${date}`);
    setSlots(response.slots);

    if (user) {
      const nextDeadlines: Record<string, number> = {};
      response.slots.forEach((slot) => {
        if (
          slot.status === "reserved" &&
          slot.reservedByUserId === user.id &&
          slot.reservedTtlSeconds &&
          slot.reservedTtlSeconds > 0
        ) {
          nextDeadlines[slot.startTime] = Date.now() + slot.reservedTtlSeconds * 1000;
        }
      });

      setHoldDeadlines(nextDeadlines);
    }
  };

  const loadBookings = async () => {
    if (!token) return;

    const response = await apiRequest<{ bookings: Booking[] }>("/my-bookings", { token });
    setBookings(response.bookings);
  };

  useEffect(() => {
    loadSlots().catch((error: Error) => setErrorMessage(error.message));
  }, [selectedPitchId, date]);

  useEffect(() => {
    loadBookings().catch((error: Error) => setErrorMessage(error.message));
  }, [token]);

  // Persistent session socket: created once we have a token, torn down only on
  // logout/unmount. A real tab close fires the server-side disconnect handler,
  // which releases any holds this connection still owns.
  useEffect(() => {
    if (!token) return;

    const socket: Socket = io(API_URL, { transports: ["websocket"], auth: { token } });
    socketRef.current = socket;

    socket.on("connect", () => {
      setLive(true);
      setSocketReady(true);
    });
    socket.on("disconnect", () => {
      setLive(false);
      setSocketReady(false);
    });

    socket.on("slot:reserved", ({ startTime, userId }: { startTime: string; userId: number }) => {
      setSlots((existing) =>
        existing.map((slot) =>
          slot.startTime === startTime
            ? { ...slot, status: "reserved", reservedByUserId: userId, reservedTtlSeconds: null }
            : slot
        )
      );
    });

    socket.on("slot:booked", ({ startTime }: { startTime: string }) => {
      setSlots((existing) =>
        existing.map((slot) =>
          slot.startTime === startTime
            ? { ...slot, status: "booked", reservedByUserId: null, reservedTtlSeconds: null }
            : slot
        )
      );
      setHoldDeadlines((existing) => {
        const copy = { ...existing };
        delete copy[startTime];
        return copy;
      });
      loadBookings().catch(() => undefined);
    });

    socket.on("slot:released", ({ startTime }: { startTime: string }) => {
      setSlots((existing) =>
        existing.map((slot) =>
          slot.startTime === startTime
            ? { ...slot, status: "available", reservedByUserId: null, reservedTtlSeconds: null }
            : slot
        )
      );
      setHoldDeadlines((existing) => {
        const copy = { ...existing };
        delete copy[startTime];
        return copy;
      });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token]);

  // Join/leave the room for the currently viewed pitch+date. Re-runs when the
  // socket (re)connects so a fresh connection rejoins the active room.
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !socketReady || !selectedPitchId) return;

    socket.emit("join-room", { pitchId: selectedPitchId, date });
    return () => {
      socket.emit("leave-room", { pitchId: selectedPitchId, date });
    };
  }, [selectedPitchId, date, socketReady]);

  const reserve = async (startTime: string) => {
    if (!token || !selectedPitchId) return;

    setBusySlot(startTime);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const response = await apiRequest<{ message: string; expiresInSeconds: number }>("/reserve-slot", {
        method: "POST",
        token,
        body: {
          pitchId: selectedPitchId,
          date,
          startTime
        }
      });

      setStatusMessage(response.message);
      setSlots((existing) =>
        existing.map((slot) =>
          slot.startTime === startTime
            ? {
                ...slot,
                status: "reserved",
                reservedByUserId: user?.id ?? null,
                reservedTtlSeconds: response.expiresInSeconds
              }
            : slot
        )
      );

      setHoldDeadlines((existing) => ({
        ...existing,
        [startTime]: Date.now() + response.expiresInSeconds * 1000
      }));

      // Let the server tie this hold to our connection so it is released early
      // if we disconnect before confirming.
      socketRef.current?.emit("hold:start", { pitchId: selectedPitchId, date, startTime });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Reservation failed";
      setErrorMessage(message);
      await loadSlots();
    } finally {
      setBusySlot(null);
    }
  };

  const confirm = async (startTime: string) => {
    if (!token || !selectedPitchId) return;

    setBusySlot(startTime);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const response = await apiRequest<{ message: string }>("/confirm-booking", {
        method: "POST",
        token,
        body: {
          pitchId: selectedPitchId,
          date,
          startTime
        }
      });

      setStatusMessage(response.message);
      setHoldDeadlines((existing) => {
        const copy = { ...existing };
        delete copy[startTime];
        return copy;
      });

      // Hold is now a confirmed booking; stop tracking it for disconnect release.
      socketRef.current?.emit("hold:end", { pitchId: selectedPitchId, date, startTime });

      await Promise.all([loadSlots(), loadBookings()]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Confirmation failed";
      setErrorMessage(message);
      await loadSlots();
    } finally {
      setBusySlot(null);
    }
  };

  const remainingSeconds = (startTime: string) => {
    const deadline = holdDeadlines[startTime];
    if (!deadline) return 0;
    return Math.max(0, Math.floor((deadline - Date.now()) / 1000));
  };

  const counts = useMemo(() => {
    return slots.reduce(
      (acc, slot) => {
        acc[slot.status] += 1;
        return acc;
      },
      { available: 0, reserved: 0, booked: 0 } as Record<Slot["status"], number>
    );
  }, [slots]);

  const selectedPitch = pitches.find((pitch) => pitch.id === selectedPitchId) ?? null;
  const upcomingBookings = useMemo(() => bookings.slice(0, 8), [bookings]);

  if (!user) {
    return null;
  }

  return (
    <div className="relative">
      {/* Top app bar */}
      <header className="sticky top-0 z-30 border-b border-white/5 bg-night-950/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3.5">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-pitch-400 to-pitch-600 shadow-glow-pitch">
              <CricketIcon className="h-5 w-5 text-night-950" />
            </div>
            <div className="leading-tight">
              <p className="font-display text-base font-bold tracking-tight text-white">PitchPass</p>
              <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-pitch-400">
                Cricket Booking
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`pill border ${
                live
                  ? "border-pitch-500/30 bg-pitch-500/10 text-pitch-300"
                  : "border-white/10 bg-white/5 text-slate-400"
              }`}
            >
              <span className="relative flex h-2 w-2">
                {live && (
                  <span className="absolute inline-flex h-full w-full animate-ping-soft rounded-full bg-pitch-400" />
                )}
                <span
                  className={`relative inline-flex h-2 w-2 rounded-full ${
                    live ? "bg-pitch-400" : "bg-slate-500"
                  }`}
                />
              </span>
              {live ? "Live" : "Offline"}
            </span>

            <div className="hidden items-center gap-2.5 rounded-full border border-white/10 bg-white/5 py-1 pl-1 pr-3 sm:flex">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-neon-400 to-indigo-600 text-sm font-bold text-night-950">
                {user.name.charAt(0).toUpperCase()}
              </span>
              <span className="text-sm font-semibold text-slate-200">{user.name}</span>
            </div>

            <button className="btn-ghost px-3.5 py-2" onClick={logout}>
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-6 px-4 pb-16 pt-6">
        {/* Hero / pitch selection */}
        <section className="animate-fade-up">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-pitch-400">
                Choose your ground
              </p>
              <h1 className="mt-1 font-display text-2xl font-bold text-white sm:text-3xl">
                Reserve your pitch in real time
              </h1>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pitches.map((pitch, index) => {
              const active = pitch.id === selectedPitchId;
              const accent = PITCH_ACCENTS[index % PITCH_ACCENTS.length];
              return (
                <button
                  key={pitch.id}
                  onClick={() => setSelectedPitchId(pitch.id)}
                  className={`group relative overflow-hidden rounded-2xl border p-4 text-left transition-all duration-200 ${
                    active
                      ? "border-pitch-500/50 bg-white/[0.06] shadow-glow-pitch"
                      : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]"
                  }`}
                >
                  <div
                    className={`absolute -right-10 -top-10 h-28 w-28 rounded-full bg-gradient-to-br ${accent} opacity-20 blur-2xl transition-opacity group-hover:opacity-30`}
                  />
                  <div className="relative flex items-start justify-between">
                    <div
                      className={`grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br ${accent} text-night-950`}
                    >
                      <PitchIcon name={pitch.name} className="h-6 w-6" />
                    </div>
                    {active && (
                      <span className="pill bg-pitch-500/15 text-pitch-300">Selected</span>
                    )}
                  </div>
                  <p className="relative mt-3 font-display text-base font-bold text-white">
                    {pitch.name}
                  </p>
                  <p className="relative mt-0.5 flex items-center gap-1 text-xs text-slate-400">
                    <PinIcon className="h-3.5 w-3.5" />
                    {pitch.location}
                  </p>
                  <p className="relative mt-3 text-sm">
                    <span className="font-display text-lg font-bold text-white">
                      ₹{pitch.pricePerHour}
                    </span>
                    <span className="text-slate-400"> / hour</span>
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        {/* Date strip */}
        <section className="animate-fade-up">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Match day
            </p>
            <label className="flex items-center gap-2 text-xs text-slate-400">
              Jump to
              <input
                className="rounded-lg border border-white/10 bg-night-900/70 px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-neon-400/60"
                type="date"
                value={date}
                min={minDate}
                onChange={(event) => {
                  const next = event.target.value;
                  setDate(next < minDate ? minDate : next);
                }}
              />
            </label>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {dateStrip.map((d) => {
              const active = d.value === date;
              return (
                <button
                  key={d.value}
                  onClick={() => setDate(d.value)}
                  className={`flex min-w-[64px] flex-col items-center rounded-xl border px-3 py-2.5 transition ${
                    active
                      ? "border-neon-400/50 bg-neon-500/10 text-white shadow-glow-neon"
                      : "border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/20 hover:text-slate-200"
                  }`}
                >
                  <span className="text-[10px] font-semibold uppercase tracking-wider">
                    {d.isToday ? "Today" : d.weekday}
                  </span>
                  <span className="font-display text-lg font-bold leading-none">{d.day}</span>
                  <span className="text-[10px] uppercase tracking-wider opacity-70">{d.month}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Main grid: slots + bookings */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Slots */}
          <section className="glass animate-fade-up p-5 lg:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-bold text-white">
                  {selectedPitch?.name ?? "Slots"}
                </h2>
                <p className="text-xs text-slate-400">
                  {new Date(date + "T00:00:00").toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric"
                  })}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatChip color="bg-pitch-400" label="Available" value={counts.available} />
                <StatChip color="bg-gold-400" label="On hold" value={counts.reserved} />
                <StatChip color="bg-rose-500" label="Booked" value={counts.booked} />
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {slots.length === 0 && (
                <p className="col-span-full py-10 text-center text-sm text-slate-500">
                  No slots for this day.
                </p>
              )}

              {slots.map((slot) => {
                const isMine = slot.reservedByUserId === user.id;
                const seconds = remainingSeconds(slot.startTime);
                const busy = busySlot === slot.startTime;

                return (
                  <SlotCard
                    key={slot.startTime}
                    slot={slot}
                    isMine={isMine}
                    seconds={seconds}
                    busy={busy}
                    onReserve={() => reserve(slot.startTime)}
                    onConfirm={() => confirm(slot.startTime)}
                  />
                );
              })}
            </div>
          </section>

          {/* My bookings */}
          <section className="glass animate-fade-up p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-white">My Tickets</h2>
              <span className="pill bg-white/5 text-slate-300">{bookings.length}</span>
            </div>

            <div className="mt-4 space-y-3">
              {upcomingBookings.length === 0 && (
                <div className="rounded-xl border border-dashed border-white/10 py-10 text-center">
                  <p className="text-sm text-slate-400">No bookings yet.</p>
                  <p className="mt-1 text-xs text-slate-500">Reserve a slot to see it here.</p>
                </div>
              )}

              {upcomingBookings.map((booking) => (
                <TicketStub key={booking.id} booking={booking} />
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* Toast */}
      {(statusMessage || errorMessage) && (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-40 flex justify-center px-4">
          <div
            className={`pointer-events-auto flex animate-fade-up items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium shadow-ticket backdrop-blur-xl ${
              errorMessage
                ? "border-rose-500/30 bg-rose-500/15 text-rose-200"
                : "border-pitch-500/30 bg-pitch-500/15 text-pitch-200"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${errorMessage ? "bg-rose-400" : "bg-pitch-400"}`} />
            {errorMessage ?? statusMessage}
          </div>
        </div>
      )}

      {/* consume tick so countdowns re-render each second */}
      <span className="hidden">{tick}</span>
    </div>
  );
}

function SlotCard({
  slot,
  isMine,
  seconds,
  busy,
  onReserve,
  onConfirm
}: {
  slot: Slot;
  isMine: boolean;
  seconds: number;
  busy: boolean;
  onReserve: () => void;
  onConfirm: () => void;
}) {
  const meta =
    slot.status === "booked"
      ? { ring: "border-rose-500/25", glow: "", pill: "bg-rose-500/15 text-rose-300", label: "Booked" }
      : slot.status === "reserved"
        ? {
            ring: "border-gold-500/30",
            glow: isMine ? "shadow-glow-gold" : "",
            pill: "bg-gold-500/15 text-gold-300",
            label: isMine ? "Your hold" : "On hold"
          }
        : {
            ring: "border-pitch-500/25",
            glow: "",
            pill: "bg-pitch-500/15 text-pitch-300",
            label: "Available"
          };

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border bg-night-850/60 p-4 transition ${meta.ring} ${meta.glow}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="font-display text-lg font-bold text-white">{to12h(slot.startTime)}</p>
          <p className="text-xs text-slate-400">to {to12h(slot.endTime)}</p>
        </div>
        <span className={`pill ${meta.pill}`}>{meta.label}</span>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        {slot.status === "available" && (
          <button className="btn-primary flex-1" disabled={busy} onClick={onReserve}>
            {busy ? "Holding…" : "Reserve"}
          </button>
        )}

        {slot.status === "reserved" && isMine && (
          <div className="flex w-full items-center gap-3">
            <CountdownRing seconds={seconds} total={HOLD_SECONDS} />
            <button className="btn-gold flex-1" disabled={busy || seconds <= 0} onClick={onConfirm}>
              {busy ? "Confirming…" : "Confirm booking"}
            </button>
          </div>
        )}

        {slot.status === "reserved" && !isMine && (
          <p className="flex-1 text-center text-xs font-semibold uppercase tracking-wider text-gold-300/80">
            Held by another player
          </p>
        )}

        {slot.status === "booked" && (
          <p className="flex-1 text-center text-xs font-semibold uppercase tracking-wider text-rose-300/80">
            Slot sold out
          </p>
        )}
      </div>
    </div>
  );
}

function CountdownRing({ seconds, total }: { seconds: number; total: number }) {
  const r = 16;
  const circumference = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, seconds / total));
  const offset = circumference * (1 - pct);
  const danger = seconds <= 20;

  return (
    <div className="relative grid h-12 w-12 shrink-0 place-items-center">
      <svg className="h-12 w-12 -rotate-90" viewBox="0 0 40 40">
        <circle cx="20" cy="20" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3.5" />
        <circle
          cx="20"
          cy="20"
          r={r}
          fill="none"
          stroke={danger ? "#fb7185" : "#fbbf24"}
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-500 ease-linear"
        />
      </svg>
      <span
        className={`absolute font-mono text-xs font-bold ${danger ? "text-rose-300" : "text-gold-300"}`}
      >
        {seconds}
      </span>
    </div>
  );
}

function TicketStub({ booking }: { booking: Booking }) {
  return (
    <div className="ticket-notch flex items-stretch overflow-hidden rounded-xl border border-white/10 bg-gradient-to-r from-night-800 to-night-850">
      <div className="flex w-1.5 flex-col bg-gradient-to-b from-pitch-400 to-pitch-600" />
      <div className="flex-1 p-3.5">
        <div className="flex items-center justify-between">
          <p className="font-display text-sm font-bold text-white">{booking.pitch.name}</p>
          <span className="pill bg-pitch-500/15 text-pitch-300">Confirmed</span>
        </div>
        <p className="mt-1 text-xs text-slate-400">{booking.pitch.location}</p>
        <div className="mt-2 flex items-center gap-3 text-xs text-slate-300">
          <span className="flex items-center gap-1">
            <CalendarIcon className="h-3.5 w-3.5 text-slate-500" />
            {booking.bookingDate.slice(0, 10)}
          </span>
          <span className="flex items-center gap-1">
            <ClockIcon className="h-3.5 w-3.5 text-slate-500" />
            {to12h(booking.startTime)} – {to12h(booking.endTime)}
          </span>
        </div>
      </div>
    </div>
  );
}

function StatChip({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5">
      <span className={`h-2 w-2 rounded-full ${color}`} />
      <span className="text-xs font-semibold text-white">{value}</span>
      <span className="hidden text-[11px] text-slate-400 sm:inline">{label}</span>
    </div>
  );
}

/* ---------- Icons ---------- */

function CricketIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M14.5 3.5a2.5 2.5 0 0 1 3.54 0l2.46 2.46a2.5 2.5 0 0 1 0 3.54l-8.5 8.5a2.5 2.5 0 0 1-3.54 0L6 15.54a2.5 2.5 0 0 1 0-3.54l8.5-8.5Z"
        fill="currentColor"
        opacity="0.9"
      />
      <circle cx="6.5" cy="17.5" r="2.6" fill="currentColor" />
    </svg>
  );
}

function PitchIcon({ name, className }: { name: string; className?: string }) {
  const key = name.toLowerCase();
  if (key.includes("indoor") || key.includes("net")) {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
        <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.8" />
        <path
          d="M3 9h18M3 15h18M9 3v18M15 3v18"
          stroke="currentColor"
          strokeWidth="1.4"
          opacity="0.8"
        />
      </svg>
    );
  }
  if (key.includes("box")) {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
        <path d="M12 2 3 6v12l9 4 9-4V6l-9-4Z" stroke="currentColor" strokeWidth="1.8" />
        <path d="M3 6l9 4 9-4M12 10v12" stroke="currentColor" strokeWidth="1.6" opacity="0.85" />
      </svg>
    );
  }
  // turf / default
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <ellipse cx="12" cy="12" rx="9" ry="6" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 6v12" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" />
    </svg>
  );
}

function PinIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <circle cx="12" cy="10" r="2.4" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <rect x="3" y="4.5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3 9h18M8 2.5v4M16 2.5v4" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 7v5l3.5 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
