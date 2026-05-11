import { Role } from "@/backend";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import {
  Activity,
  BarChart3,
  Bell,
  BookOpen,
  CalendarClock,
  ChevronLeft,
  ClipboardList,
  CreditCard,
  FileText,
  FolderKanban,
  GraduationCap,
  LayoutDashboard,
  Receipt,
  Settings,
  UserCheck,
  Users,
  UsersRound,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  roles?: Role[];
  group?: string;
}

const ALL_ROLES: Role[] = [
  Role.admin,
  Role.teamHead,
  Role.counselor,
  Role.accountant,
];
const ADMIN_ONLY: Role[] = [Role.admin];
const ADMIN_TH: Role[] = [Role.admin, Role.teamHead];
const ADMIN_TH_COUNSELOR: Role[] = [Role.admin, Role.teamHead, Role.counselor];
const ADMIN_ACCOUNTANT: Role[] = [Role.admin, Role.accountant];
const TH_COUNSELOR: Role[] = [Role.teamHead, Role.counselor];
const _ACCOUNTANT_ONLY: Role[] = [Role.accountant];

const NAV_ITEMS: NavItem[] = [
  {
    path: "/dashboard",
    label: "Dashboard",
    icon: <LayoutDashboard size={17} />,
    roles: ALL_ROLES,
    group: "core",
  },
  {
    path: "/leads",
    label: "Leads",
    icon: <ClipboardList size={17} />,
    roles: ADMIN_TH_COUNSELOR,
    group: "crm",
  },
  {
    path: "/followups",
    label: "Follow-ups",
    icon: <CalendarClock size={17} />,
    roles: ADMIN_TH_COUNSELOR,
    group: "crm",
  },
  {
    path: "/students",
    label: "Students",
    icon: <GraduationCap size={17} />,
    roles: ADMIN_TH_COUNSELOR,
    group: "crm",
  },
  {
    path: "/courses",
    label: "Course Categories",
    icon: <BookOpen size={17} />,
    roles: ADMIN_ONLY,
    group: "crm",
  },
  {
    path: "/emi",
    label: "EMI Management",
    icon: <CreditCard size={17} />,
    roles: [...ADMIN_ACCOUNTANT, ...TH_COUNSELOR].filter(
      (v, i, a) => a.indexOf(v) === i,
    ),
    group: "finance",
  },
  {
    path: "/payments",
    label: "Payments",
    icon: <FileText size={17} />,
    roles: [...ADMIN_ACCOUNTANT, ...TH_COUNSELOR].filter(
      (v, i, a) => a.indexOf(v) === i,
    ),
    group: "finance",
  },
  {
    path: "/receipts",
    label: "Receipts",
    icon: <Receipt size={17} />,
    roles: ADMIN_ACCOUNTANT,
    group: "finance",
  },
  {
    path: "/reminders",
    label: "Reminders",
    icon: <Bell size={17} />,
    roles: ALL_ROLES,
    group: "comm",
  },
  {
    path: "/teams",
    label: "Team Management",
    icon: <UsersRound size={17} />,
    roles: ADMIN_TH,
    group: "admin",
  },
  {
    path: "/users",
    label: "Users",
    icon: <UserCheck size={17} />,
    roles: ADMIN_ONLY,
    group: "admin",
  },
  {
    path: "/activity-logs",
    label: "Activity Logs",
    icon: <Activity size={17} />,
    roles: ADMIN_ONLY,
    group: "admin",
  },
  {
    path: "/reports",
    label: "Reports",
    icon: <BarChart3 size={17} />,
    roles: ADMIN_ONLY,
    group: "admin",
  },
  {
    path: "/settings",
    label: "Settings",
    icon: <Settings size={17} />,
    roles: ADMIN_ONLY,
    group: "admin",
  },
];

const GROUP_LABELS: Record<string, string> = {
  core: "",
  crm: "CRM",
  finance: "Finance",
  comm: "Communication",
  admin: "Administration",
};

const ROLE_META: Record<Role, { label: string; accent: string; bg: string }> = {
  [Role.admin]: {
    label: "Administrator",
    accent: "bg-primary",
    bg: "bg-primary/15",
  },
  [Role.teamHead]: {
    label: "Team Head",
    accent: "bg-emerald-500",
    bg: "bg-emerald-500/15",
  },
  [Role.counselor]: {
    label: "Counselor",
    accent: "bg-amber-500",
    bg: "bg-amber-500/15",
  },
  [Role.accountant]: {
    label: "Accountant",
    accent: "bg-rose-500",
    bg: "bg-rose-500/15",
  },
};

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { role, userProfile } = useAuth();
  const location = useLocation();

  const visible = NAV_ITEMS.filter(
    (item) => !item.roles || (role && item.roles.includes(role as Role)),
  );

  const roleMeta = role ? ROLE_META[role as Role] : null;

  // Group items for rendering
  const groups = ["core", "crm", "finance", "comm", "admin"];
  const grouped = groups
    .map((g) => ({ group: g, items: visible.filter((i) => i.group === g) }))
    .filter((g) => g.items.length > 0);

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          onKeyDown={(e) => e.key === "Escape" && onClose()}
          role="presentation"
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 w-64 flex flex-col transition-transform duration-300",
          "lg:static lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
        style={{
          background: "oklch(var(--sidebar))",
          borderRight: "1px solid oklch(var(--sidebar-border))",
        }}
      >
        {/* Logo area */}
        <div
          className="flex items-center justify-between h-16 px-4 shrink-0"
          style={{ borderBottom: "1px solid oklch(var(--sidebar-border))" }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shadow-sm"
              style={{ background: "var(--gradient-primary)" }}
            >
              <FolderKanban size={15} className="text-white" />
            </div>
            <div>
              <span
                className="font-bold text-sm tracking-wide block"
                style={{ color: "oklch(var(--sidebar-foreground))" }}
              >
                FMS Pro
              </span>
              <span
                className="text-[10px] opacity-50"
                style={{ color: "oklch(var(--sidebar-foreground))" }}
              >
                Fee Management
              </span>
            </div>
          </div>
          <button
            type="button"
            className="lg:hidden p-1 rounded opacity-60 hover:opacity-100 transition-smooth"
            style={{ color: "oklch(var(--sidebar-foreground))" }}
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <ChevronLeft size={18} />
          </button>
        </div>

        {/* User identity panel */}
        {userProfile && roleMeta && (
          <div
            className="px-3 py-3 mx-3 mt-3 mb-1 rounded-xl"
            style={{
              background:
                "linear-gradient(135deg, oklch(var(--sidebar-border) / 0.6), oklch(var(--sidebar-border) / 0.2))",
            }}
          >
            <div className="flex items-center gap-2.5">
              <div
                className={cn(
                  "w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-sm shrink-0",
                  roleMeta.accent,
                )}
              >
                {userProfile.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p
                  className="text-sm font-semibold truncate"
                  style={{ color: "oklch(var(--sidebar-foreground))" }}
                >
                  {userProfile.name}
                </p>
                <span
                  className={cn(
                    "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold text-white mt-0.5",
                    roleMeta.accent,
                  )}
                >
                  {roleMeta.label}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Nav groups */}
        <nav
          className="flex-1 overflow-y-auto py-2 px-2 space-y-0"
          aria-label="Main navigation"
        >
          {grouped.map(({ group, items }) => (
            <div key={group} className="mb-1">
              {GROUP_LABELS[group] && (
                <p
                  className="text-[10px] font-semibold uppercase tracking-widest px-3 py-1.5 mt-2"
                  style={{ color: "oklch(var(--sidebar-foreground) / 0.4)" }}
                >
                  {GROUP_LABELS[group]}
                </p>
              )}
              {items.map((item) => {
                const isActive =
                  item.path === "/dashboard"
                    ? location.pathname === "/dashboard" ||
                      location.pathname === "/"
                    : location.pathname.startsWith(item.path);
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => onClose()}
                    data-ocid={`nav.${item.label.toLowerCase().replace(/[^a-z0-9]/g, "-")}.link`}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-smooth mb-0.5",
                      isActive ? "text-white" : "hover:bg-white/5",
                    )}
                    style={
                      isActive
                        ? {
                            background:
                              "linear-gradient(90deg, oklch(var(--sidebar-primary) / 0.9), oklch(var(--sidebar-primary) / 0.6))",
                            color: "white",
                            boxShadow:
                              "0 2px 8px oklch(var(--sidebar-primary) / 0.35)",
                          }
                        : { color: "oklch(var(--sidebar-foreground) / 0.70)" }
                    }
                  >
                    <span
                      className={cn(
                        "shrink-0",
                        isActive ? "opacity-100" : "opacity-70",
                      )}
                    >
                      {item.icon}
                    </span>
                    <span className="truncate">{item.label}</span>
                    {isActive && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white/80 shrink-0" />
                    )}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Bottom user hint */}
        <div
          className="px-3 py-3"
          style={{ borderTop: "1px solid oklch(var(--sidebar-border))" }}
        >
          <div className="flex items-center gap-2 px-2">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
              style={{ background: "oklch(var(--sidebar-border))" }}
            >
              <Users
                size={12}
                style={{ color: "oklch(var(--sidebar-foreground) / 0.6)" }}
              />
            </div>
            <p
              className="text-[11px] truncate"
              style={{ color: "oklch(var(--sidebar-foreground) / 0.45)" }}
            >
              FMS Pro · v2.0
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
