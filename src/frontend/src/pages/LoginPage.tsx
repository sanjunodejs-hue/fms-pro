import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { FolderKanban, ShieldCheck, TrendingUp, Users } from "lucide-react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const features = [
  { icon: <Users size={16} />, text: "Full CRM with lead management" },
  { icon: <TrendingUp size={16} />, text: "EMI tracking & payment automation" },
  { icon: <ShieldCheck size={16} />, text: "Role-based access control" },
];

export default function LoginPage() {
  const { login, loginStatus, isAuthenticated, userProfile, isLoading } =
    useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      if (!userProfile) {
        navigate("/profile-setup", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    }
  }, [isAuthenticated, userProfile, isLoading, navigate]);

  if (loginStatus === "logging-in" || isLoading) {
    return <LoadingSpinner fullPage />;
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left panel — hero */}
      <div
        className="hidden lg:flex flex-col justify-between w-1/2 p-10 relative overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #1e293b 100%)",
        }}
      >
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center">
              <FolderKanban size={20} className="text-white" />
            </div>
            <span className="font-bold text-white text-xl tracking-wide">
              FMS Pro
            </span>
          </div>
          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Student Fee
            <br />
            Management
            <br />
            <span className="text-blue-400">Made Simple</span>
          </h1>
          <p className="text-blue-100/70 text-base max-w-xs">
            Manage leads, students, EMI plans, and payments all in one modern
            SaaS platform.
          </p>
        </div>

        <img
          src="/assets/generated/fms-hero.dim_800x600.jpg"
          alt="FMS Dashboard Preview"
          className="absolute inset-0 w-full h-full object-cover opacity-10"
        />

        <div className="relative z-10 space-y-3">
          {features.map((f) => (
            <div
              key={f.text}
              className="flex items-center gap-3 text-blue-100/80 text-sm"
            >
              <div className="w-7 h-7 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-300">
                {f.icon}
              </div>
              {f.text}
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — login */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <FolderKanban size={20} className="text-primary-foreground" />
            </div>
            <span className="font-bold text-foreground text-xl">FMS Pro</span>
          </div>

          <h2 className="text-2xl font-bold text-foreground mb-1">
            Welcome back
          </h2>
          <p className="text-muted-foreground text-sm mb-8">
            Sign in with your Internet Identity to continue.
          </p>

          <div className="bg-card border border-border rounded-2xl p-8 shadow-sm">
            <div className="flex flex-col items-center text-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <ShieldCheck size={28} className="text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground text-base">
                  Secure Authentication
                </p>
                <p className="text-muted-foreground text-xs mt-1">
                  Powered by Internet Identity — no passwords required.
                </p>
              </div>
              <Button
                type="button"
                className="w-full"
                onClick={login}
                disabled={loginStatus === "logging-in"}
                data-ocid="login.submit_button"
              >
                {loginStatus === "logging-in"
                  ? "Signing in..."
                  : "Login with Internet Identity"}
              </Button>
            </div>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-6">
            First time? A profile setup will be required after login.
          </p>
        </div>
      </div>
    </div>
  );
}
