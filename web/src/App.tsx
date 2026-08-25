import { Route, Routes } from 'react-router-dom';

function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl items-center px-6">
      <section className="w-full rounded-2xl border border-sky-400/20 bg-slate-900/80 p-8 shadow-2xl">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-400">
          MoDMoS
        </p>
        <h1 className="mt-2 text-4xl font-bold text-slate-50">TripPlanner</h1>
        <p className="mt-4 text-slate-300">
          Plan practical, zero-paid-API itineraries.
        </p>
      </section>
    </main>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="*" element={<HomePage />} />
    </Routes>
  );
}
