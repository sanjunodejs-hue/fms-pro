import { createActor } from "@/backend";
import type { UserProfile } from "@/types";
import type { Role } from "@/types";
import { useActor, useInternetIdentity } from "@caffeineai/core-infrastructure";
import type React from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

interface AuthContextType {
  isAuthenticated: boolean;
  loginStatus: string;
  login: () => void;
  logout: () => void;
  userProfile: UserProfile | null;
  setUserProfileState: (profile: UserProfile) => void;
  role: Role | null;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  loginStatus: "idle",
  login: () => {},
  logout: () => {},
  userProfile: null,
  setUserProfileState: () => {},
  role: null,
  isLoading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { loginStatus, login, clear } = useInternetIdentity();
  const { actor, isFetching } = useActor(createActor);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = loginStatus === "success";

  useEffect(() => {
    if (!isAuthenticated || isFetching || !actor) {
      if (!isFetching && loginStatus !== "logging-in") setIsLoading(false);
      return;
    }
    setIsLoading(true);
    actor
      .getUserProfile()
      .then((profile) => {
        if (profile !== null && profile !== undefined) {
          setUserProfile(profile as unknown as UserProfile);
        }
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, isFetching, actor, loginStatus]);

  const setUserProfileState = useCallback((profile: UserProfile) => {
    setUserProfile(profile);
  }, []);

  const logout = useCallback(() => {
    clear();
    setUserProfile(null);
  }, [clear]);

  const role = userProfile?.role ?? null;

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        loginStatus,
        login,
        logout,
        userProfile,
        setUserProfileState,
        role,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
