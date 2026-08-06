import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext.js";

const LINK_BASE = "rounded-md px-3 py-1.5 text-sm font-medium transition-colors";
const LINK_INACTIVE =
  "text-[#52514e] hover:bg-black/[0.04] hover:text-[#0b0b0b] dark:text-[#c3c2b7] dark:hover:bg-white/[0.06] dark:hover:text-white";
const LINK_ACTIVE = "bg-[#2a78d6]/10 text-[#2a78d6] dark:bg-[#3987e5]/15 dark:text-[#3987e5]";

function linkClassName({ isActive }: { isActive: boolean }): string {
  return `${LINK_BASE} ${isActive ? LINK_ACTIVE : LINK_INACTIVE}`;
}

export default function Nav() {
  const { user, loading } = useAuth();

  if (loading || !user) {
    return null;
  }

  return (
    <header className="sticky top-0 z-20 border-b border-black/10 bg-[#fcfcfb]/90 backdrop-blur dark:border-white/10 dark:bg-[#1a1a19]/90">
      <nav className="mx-auto flex max-w-2xl items-center gap-1 px-4 py-3">
        <NavLink to="/dashboard" className={linkClassName}>
          Dashboard
        </NavLink>
        <NavLink to="/" end className={linkClassName}>
          Lista de la compra
        </NavLink>
        <NavLink to="/crossfit" end className={linkClassName}>
          CrossFit
        </NavLink>
      </nav>
    </header>
  );
}
