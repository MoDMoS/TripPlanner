import { useEffect, useState, type ReactNode } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { TopBar } from './TopBar';
import './shell.css';

const STORAGE_KEY = 'trip-planner-nav-open';

const navItems: {
  to: string;
  end?: boolean;
  label: string;
  icon: ReactNode;
}[] = [
  { to: '/', end: true, label: 'ทริปของฉัน', icon: <TripsIcon /> },
];

function readOpen() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return true;
    return raw === '1';
  } catch {
    return true;
  }
}

export function Layout() {
  const [open, setOpen] = useState(readOpen);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, open ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [open]);

  return (
    <div className="app-shell app-shell-sidebar">
      <aside className={`app-sidebar ${open ? 'open' : 'collapsed'}`}>
        <div className={`app-sidebar-head ${open ? 'open' : ''}`}>
          {open ? <p className="app-sidebar-label">เมนู</p> : null}
          <button
            type="button"
            className="app-sidebar-toggle"
            onClick={() => setOpen((prev) => !prev)}
            aria-label={open ? 'ปิดเมนู' : 'เปิดเมนู'}
            title={open ? 'ปิดเมนู' : 'เปิดเมนู'}
          >
            {open ? <CollapseIcon /> : <MenuIcon />}
          </button>
        </div>

        <nav className="app-sidebar-nav" aria-label="Trip Planner pages">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              title={item.label}
              className={({ isActive }) =>
                [
                  'app-sidebar-link',
                  open ? 'with-label' : 'icon-only',
                  isActive ? 'active' : '',
                ]
                  .filter(Boolean)
                  .join(' ')
              }
            >
              <span className="app-sidebar-icon">{item.icon}</span>
              {open ? <span className="app-sidebar-text">{item.label}</span> : null}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="app-main">
        <TopBar title="Trip Planner" subtitle="Service by MoDMoS" />
        <main className="app-main-scroll">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="nav-svg"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

function MenuIcon() {
  return (
    <Icon>
      <path d="M4 6h16M4 12h16M4 18h16" />
    </Icon>
  );
}

function CollapseIcon() {
  return (
    <Icon>
      <path d="M15 6l-6 6 6 6" />
    </Icon>
  );
}

function TripsIcon() {
  return (
    <Icon>
      <path d="M3 7h18" />
      <path d="M3 12h18" />
      <path d="M3 17h12" />
      <circle cx="18" cy="17" r="2.5" />
    </Icon>
  );
}
