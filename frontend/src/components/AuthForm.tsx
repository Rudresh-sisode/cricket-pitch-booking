import { useState } from "react";

type Mode = "login" | "register";

type Props = {
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (name: string, email: string, password: string) => Promise<void>;
};

export function AuthForm({ onLogin, onRegister }: Props) {
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      if (mode === "login") {
        await onLogin(email, password);
      } else {
        await onRegister(name, email, password);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Request failed";
      setError(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid w-full max-w-5xl animate-fade-up overflow-hidden rounded-3xl border border-white/10 bg-night-850/70 shadow-ticket backdrop-blur-2xl md:grid-cols-2">
      {/* Brand / showcase panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden p-10 md:flex">
        <div className="absolute inset-0 bg-gradient-to-br from-pitch-600/30 via-night-900 to-neon-500/20" />
        <div className="absolute inset-0 bg-field-lines opacity-40" />
        <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-pitch-500/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-neon-500/20 blur-3xl" />

        <div className="relative">
          <BrandMark />
          <p className="mt-8 max-w-xs font-display text-3xl font-bold leading-tight text-white">
            Book your slot.
            <br />
            <span className="text-shimmer">Own the pitch.</span>
          </p>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-slate-300">
            Real-time availability across every turf, box-cricket arena and indoor net — reserved
            the instant you tap.
          </p>
        </div>

        <div className="relative space-y-3">
          <Feature dot="bg-pitch-400" label="Live slot availability — updates as others book" />
          <Feature dot="bg-gold-400" label="2-minute hold while you decide" />
          <Feature dot="bg-neon-400" label="Zero double-bookings, guaranteed" />
        </div>
      </div>

      {/* Form panel */}
      <div className="relative p-8 sm:p-10">
        <div className="md:hidden">
          <BrandMark />
        </div>

        <div className="mt-6 md:mt-0">
          <h1 className="font-display text-2xl font-bold text-white">
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            {mode === "login"
              ? "Sign in to grab your slot."
              : "Join in seconds and start booking."}
          </p>
        </div>

        {/* Mode switch */}
        <div className="mt-6 grid grid-cols-2 gap-1 rounded-xl border border-white/10 bg-night-900/70 p-1">
          {(["login", "register"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setMode(value)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold capitalize transition ${
                mode === value
                  ? "bg-gradient-to-r from-pitch-500 to-pitch-600 text-night-950 shadow-glow-pitch"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {value === "login" ? "Login" : "Register"}
            </button>
          ))}
        </div>

        <form className="mt-6 space-y-4" onSubmit={submit}>
          {mode === "register" && (
            <div>
              <label className="label">Full name</label>
              <input
                className="field"
                placeholder="Virat Kohli"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </div>
          )}

          <div>
            <label className="label">Email</label>
            <input
              className="field"
              placeholder="you@example.com"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          <div>
            <label className="label">Password</label>
            <input
              className="field"
              placeholder="••••••••"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={6}
            />
          </div>

          {error && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-sm text-rose-300">
              {error}
            </div>
          )}

          <button className="btn-primary w-full py-3 text-base" disabled={busy} type="submit">
            {busy ? (
              <>
                <Spinner /> Please wait…
              </>
            ) : mode === "login" ? (
              "Sign in"
            ) : (
              "Create account"
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-500">
          Secured with JWT · Passwords hashed with bcrypt
        </p>
      </div>
    </div>
  );
}

function BrandMark() {
  return (
    <div className="flex items-center gap-3">
      <div className="relative grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-pitch-400 to-pitch-600 shadow-glow-pitch">
        <CricketIcon className="h-6 w-6 text-night-950" />
      </div>
      <div className="leading-tight">
        <p className="font-display text-lg font-bold tracking-tight text-white">PitchPass</p>
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-pitch-400">
          Cricket Booking
        </p>
      </div>
    </div>
  );
}

function Feature({ dot, label }: { dot: string; label: string }) {
  return (
    <div className="flex items-center gap-3 text-sm text-slate-300">
      <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} />
      {label}
    </div>
  );
}

function Spinner() {
  return (
    <span className="h-4 w-4 animate-spin rounded-full border-2 border-night-950/30 border-t-night-950" />
  );
}

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
