import { Role } from "@/backend";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Bell, ChevronDown, LogOut, Menu, Settings, User } from "lucide-react";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  [Role.admin]: { label: "Admin", color: "bg-primary/15 text-primary" },
  [Role.teamHead]: {
    label: "Team Head",
    color: "bg-emerald-500/15 text-emerald-600",
  },
  [Role.counselor]: {
    label: "Counselor",
    color: "bg-amber-500/15 text-amber-600",
  },
  [Role.accountant]: {
    label: "Accountant",
    color: "bg-rose-500/15 text-rose-600",
  },
};

interface TopNavbarProps {
  onMenuClick: () => void;
  notificationCount?: number;
}

export function TopNavbar({
  onMenuClick,
  notificationCount = 0,
}: TopNavbarProps) {
  const [profileOpen, setProfileOpen] = useState(false);
  const { userProfile, logout, role } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const roleMeta = role
    ? (ROLE_LABELS[role] ?? {
        label: role,
        color: "bg-muted text-muted-foreground",
      })
    : null;

  // Build breadcrumb from path
  const segments = location.pathname.split("/").filter(Boolean);
  const breadcrumb = segments.map((seg) =>
    seg.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
  );

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="bg-card border-b border-border h-16 flex items-center px-4 gap-3 shrink-0 shadow-xs">
      {/* Hamburger */}
      <button
        type="button"
        className="lg:hidden text-muted-foreground hover:text-foreground transition-smooth p-1.5 rounded-md hover:bg-muted"
        onClick={onMenuClick}
        aria-label="Open sidebar"
        data-ocid="nav.sidebar_toggle.button"
      >
        <Menu size={20} />
      </button>

      {/* Breadcrumb */}
      <nav
        aria-label="Breadcrumb"
        className="flex-1 flex items-center gap-1.5 min-w-0"
      >
        <span className="text-muted-foreground/50 text-sm hidden sm:inline">
          FMS
        </span>
        {breadcrumb.map((crumb, idx) => (
          <span key={crumb} className="flex items-center gap-1.5 min-w-0">
            {(idx > 0 || true) && (
              <span className="text-muted-foreground/40 text-sm">/</span>
            )}
            <span
              className={cn(
                "text-sm font-medium truncate",
                idx === breadcrumb.length - 1
                  ? "text-foreground"
                  : "text-muted-foreground",
              )}
            >
              {crumb}
            </span>
          </span>
        ))}
      </nav>

      <div className="flex items-center gap-2 shrink-0">
        {/* Notification bell */}
        <button
          type="button"
          className="relative p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-smooth"
          aria-label={`${notificationCount} notifications`}
          onClick={() => navigate("/reminders")}
          data-ocid="nav.notifications.button"
        >
          <Bell size={18} />
          {notificationCount > 0 && (
            <span className="absolute top-1 right-1 min-w-[16px] h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center font-bold px-0.5">
              {notificationCount > 9 ? "9+" : notificationCount}
            </span>
          )}
        </button>

        {/* Profile dropdown */}
        <div className="relative">
          <button
            type="button"
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-muted text-sm font-medium transition-smooth"
            onClick={() => setProfileOpen((v) => !v)}
            aria-label="Profile menu"
            aria-expanded={profileOpen}
            data-ocid="nav.profile.button"
          >
            <div className="w-7 h-7 rounded-full bg-gradient-primary flex items-center justify-center text-white text-xs font-bold shrink-0">
              {userProfile?.name?.charAt(0)?.toUpperCase() ?? "?"}
            </div>
            <div className="hidden sm:flex flex-col items-start min-w-0">
              <span className="text-foreground text-xs font-semibold truncate max-w-[100px] leading-tight">
                {userProfile?.name ?? "User"}
              </span>
              {roleMeta && (
                <span
                  className={cn(
                    "text-[10px] font-medium px-1.5 py-0 rounded-sm",
                    roleMeta.color,
                  )}
                >
                  {roleMeta.label}
                </span>
              )}
            </div>
            <ChevronDown
              size={13}
              className={cn(
                "text-muted-foreground transition-transform duration-200",
                profileOpen && "rotate-180",
              )}
            />
          </button>

          {profileOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setProfileOpen(false)}
                onKeyDown={(e) => e.key === "Escape" && setProfileOpen(false)}
                role="presentation"
                aria-hidden="true"
              />
              <div
                className="absolute right-0 mt-2 w-52 bg-popover border border-border rounded-xl shadow-elevated z-20 overflow-hidden"
                data-ocid="nav.profile.dropdown"
              >
                <div className="px-4 py-3 border-b border-border bg-muted/30">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {userProfile?.name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {userProfile?.email}
                  </p>
                  {roleMeta && (
                    <span
                      className={cn(
                        "inline-flex items-center mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold",
                        roleMeta.color,
                      )}
                    >
                      {roleMeta.label}
                    </span>
                  )}
                </div>
                <div className="py-1">
                  <button
                    type="button"
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-smooth"
                    onClick={() => {
                      setProfileOpen(false);
                      navigate("/settings");
                    }}
                    data-ocid="nav.settings.link"
                  >
                    <Settings size={14} className="text-muted-foreground" />
                    Settings
                  </button>
                  <button
                    type="button"
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-destructive hover:bg-muted transition-smooth"
                    onClick={handleLogout}
                    data-ocid="nav.logout.button"
                  >
                    <LogOut size={14} />
                    Sign out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
