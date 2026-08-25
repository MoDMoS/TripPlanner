const STEPS = [
  'Choose Places',
  'Organize Days',
  'Schedule',
  'Preview',
  'Export',
];

type Props = {
  step: number;
  title: string;
  children: React.ReactNode;
};

export function WizardShell({ step, title, children }: Props) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-600">
          TripPlanner
        </p>
        <h1 className="mt-1 text-2xl font-bold text-violet-950">{title}</h1>
        <ol className="mt-4 flex flex-wrap gap-2 text-xs">
          {STEPS.map((label, index) => {
            const n = index + 1;
            const active = n === step;
            const done = n < step;
            return (
              <li
                key={label}
                className={`rounded-full px-3 py-1 ${
                  active
                    ? 'bg-violet-600 text-white'
                    : done
                      ? 'bg-violet-200 text-violet-900'
                      : 'bg-white/70 text-violet-400'
                }`}
              >
                {n}. {label}
              </li>
            );
          })}
        </ol>
      </header>
      {children}
    </div>
  );
}
