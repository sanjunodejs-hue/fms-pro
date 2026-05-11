import { createActor } from "@/backend";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import type { UserProfile } from "@/types";
import { useActor } from "@caffeineai/core-infrastructure";
import { FolderKanban, UserCircle } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function ProfileSetupPage() {
  const navigate = useNavigate();
  const { setUserProfileState } = useAuth();
  const { actor } = useActor(createActor);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actor) return;
    if (!name.trim() || !email.trim()) {
      setError("Name and email are required.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await actor.setUserProfile(name.trim(), email.trim());
      if (result.__kind__ === "ok") {
        setUserProfileState(result.ok as unknown as UserProfile);
        navigate("/dashboard", { replace: true });
      } else {
        setError(result.err);
      }
    } catch (_e) {
      setError("Failed to save profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <FolderKanban size={20} className="text-primary-foreground" />
          </div>
          <span className="font-bold text-foreground text-xl">FMS Pro</span>
        </div>

        <div className="bg-card border border-border rounded-2xl p-8 shadow-sm">
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <UserCircle size={28} className="text-primary" />
            </div>
            <h2 className="text-xl font-bold text-foreground">
              Complete Your Profile
            </h2>
            <p className="text-muted-foreground text-sm mt-1">
              Set up your account to get started.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                data-ocid="profile.name.input"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                data-ocid="profile.email.input"
              />
            </div>

            {error && (
              <p
                className="text-sm text-destructive"
                data-ocid="profile.error_state"
              >
                {error}
              </p>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
              data-ocid="profile.submit_button"
            >
              {loading ? "Saving..." : "Save & Continue"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
