import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../auth';
import { AppLauncher } from './AppLauncher';

export function TopBar({
  title = 'Trip Planner',
  subtitle = 'Service by MoDMoS',
}: {
  title?: string;
  subtitle?: string;
}) {
  const { user, loading, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const initial = (user?.name?.trim()?.charAt(0) || '?').toUpperCase();
  const loginNext = encodeURIComponent(window.location.href);

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <a className="topbar-brand" href="/">
          <img src="/favicon.png" alt="" width={44} height={44} />
          <div>
            <p className="topbar-title">{title}</p>
            <p className="topbar-sub">{subtitle}</p>
          </div>
        </a>

        {loading ? (
          <span className="topbar-muted">กำลังโหลด...</span>
        ) : user ? (
          <div className="topbar-user">
            <div className="topbar-menu" ref={menuRef}>
              <button
                type="button"
                className="topbar-profile-btn"
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                title="โปรไฟล์"
                onClick={() => setMenuOpen((prev) => !prev)}
              >
                <span className="topbar-avatar">{initial}</span>
                <span className="topbar-profile-name">{user.name}</span>
              </button>

              {menuOpen ? (
                <div className="topbar-dropdown" role="menu">
                  <div className="topbar-dropdown__head">
                    <p className="topbar-dropdown__name">{user.name}</p>
                    <p className="topbar-dropdown__email">{user.email}</p>
                  </div>
                  <a
                    role="menuitem"
                    className="topbar-dropdown__item"
                    href="/profile"
                    onClick={() => setMenuOpen(false)}
                  >
                    จัดการโปรไฟล์
                  </a>
                  <button
                    type="button"
                    role="menuitem"
                    className="topbar-dropdown__item topbar-dropdown__item--danger"
                    onClick={() => {
                      setMenuOpen(false);
                      void logout();
                    }}
                  >
                    ออกจากระบบ
                  </button>
                </div>
              ) : null}
            </div>

            <AppLauncher />
          </div>
        ) : (
          <div className="topbar-user">
            <a className="btn-ghost" href={`/login?next=${loginNext}`}>
              เข้าสู่ระบบ
            </a>
            <a className="btn-primary btn-primary--sm" href={`/register?next=${loginNext}`}>
              สมัครสมาชิก
            </a>
            <AppLauncher />
          </div>
        )}
      </div>
    </header>
  );
}
