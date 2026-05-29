import { AuthForm } from "./components/AuthForm";
import { BookingBoard } from "./components/BookingBoard";
import { AuthProvider, useAuth } from "./context/AuthContext";

function StadiumBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* base gradient */}
      <div className="absolute inset-0 bg-night-950" />
      {/* floodlights */}
      <div className="absolute inset-0 bg-floodlight" />
      {/* turf field lines */}
      <div className="absolute inset-0 bg-field-lines opacity-60" />
      {/* glowing horizon arc — like a stadium roof */}
      <div className="absolute -top-1/3 left-1/2 h-[70vh] w-[140vw] -translate-x-1/2 rounded-[100%] border-t border-white/10 bg-[radial-gradient(closest-side,rgba(56,189,248,0.12),transparent)]" />
      {/* soft vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_120%_at_50%_0%,transparent_55%,rgba(0,0,0,0.65))]" />
    </div>
  );
}

function AppBody() {
  const { user, login, register } = useAuth();

  return (
    <main className="relative min-h-screen">
      <StadiumBackdrop />
      {!user ? (
        <section className="flex min-h-screen items-center justify-center px-4 py-10">
          <AuthForm onLogin={login} onRegister={register} />
        </section>
      ) : (
        <BookingBoard />
      )}
    </main>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppBody />
    </AuthProvider>
  );
}
