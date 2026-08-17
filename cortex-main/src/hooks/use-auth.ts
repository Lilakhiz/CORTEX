import { useState, useCallback } from "react";
import { api } from "@/convex/_generated/api";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useQuery } from "convex/react";

const convexUrl = import.meta.env.VITE_CONVEX_URL as string;

export function useAuth() {
  const [isAuthenticatedMock, setIsAuthenticatedMock] = useState<boolean>(() => {
    return localStorage.getItem("cortex_auth") === "true";
  });
  const [userMock, setUserMock] = useState<{ name?: string; email?: string } | null>(() => {
    const saved = localStorage.getItem("cortex_user");
    return saved ? JSON.parse(saved) : (isAuthenticatedMock ? { name: "Guest User", email: "guest@cortex.explore" } : null);
  });

  const signInMock = useCallback(async (_provider: string, formData?: FormData) => {
    let email = "guest@cortex.explore";
    let name = "Guest User";
    if (formData && formData.get("email")) {
      email = String(formData.get("email"));
      name = email.split("@")[0] || "Explorer";
    }
    const newUser = { name, email };
    localStorage.setItem("cortex_auth", "true");
    localStorage.setItem("cortex_user", JSON.stringify(newUser));
    setIsAuthenticatedMock(true);
    setUserMock(newUser);
    return { redirect: "/dashboard" };
  }, []);

  const signOutMock = useCallback(async () => {
    localStorage.removeItem("cortex_auth");
    localStorage.removeItem("cortex_user");
    setIsAuthenticatedMock(false);
    setUserMock(null);
  }, []);

  // When convexUrl is set, we use real auth queries
  const convexAuth = useConvexAuth();
  console.log("Convex Auth:", convexAuth);
  const userQuery = useQuery(api.users.currentUser);
  const authActions = useAuthActions();

  if (!convexUrl) {
    return {
      isLoading: false,
      isAuthenticated: isAuthenticatedMock,
      user: userMock,
      signIn: signInMock,
      signOut: signOutMock,
    };
  }

  return {
    isLoading: convexAuth.isLoading || userQuery === undefined,
    isAuthenticated: convexAuth.isAuthenticated,
    user: userQuery,
    signIn: authActions.signIn,
    signOut: authActions.signOut,
  };
}
