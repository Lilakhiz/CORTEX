import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

import { useAuth } from "@/hooks/use-auth";
import { ArrowRight, Loader2, Mail, UserX, Chrome } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { motion, AnimatePresence } from "framer-motion";

interface AuthProps {
  redirectAfterAuth?: string;
}

function resolveRedirectAfterAuth(
  returnTo: string | null,
  fallback = "/dashboard",
) {
  if (returnTo?.startsWith("/") && !returnTo.startsWith("//")) {
    return returnTo;
  }
  return fallback;
}

function Auth({ redirectAfterAuth }: AuthProps = {}) {
  const { isLoading: authLoading, isAuthenticated, signIn } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = resolveRedirectAfterAuth(
    searchParams.get("returnTo"),
    redirectAfterAuth,
  );
  const [step, setStep] = useState<"signIn" | { email: string }>("signIn");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");

  useEffect(() => {
  console.log({
    authLoading,
    isAuthenticated,
    redirect,
  });

  if (!authLoading && isAuthenticated) {
    console.log("Redirecting to:", redirect);
    navigate(redirect, { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate, redirect]);

  const handleEmailSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData(event.currentTarget);
      await signIn("email-otp", formData);
      setStep({ email: formData.get("email") as string });
      setIsLoading(false);
    } catch (error) {
      console.error("Email sign-in error:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to send verification code. Please try again.",
      );
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData(event.currentTarget);
      await signIn("email-otp", formData);
      navigate(redirect);
    } catch (error) {
      console.error("OTP verification error:", error);
      setError("The verification code you entered is incorrect.");
      setIsLoading(false);
      setOtp("");
    }
  };

  const handleGuestLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await signIn("anonymous");
      navigate(redirect);
    } catch (error) {
      console.error("Guest login error:", error);
      setError(`Failed to sign in as guest: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-neutral-950">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-black/[0.02] dark:bg-white/[0.02]" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-black/[0.02] dark:bg-white/[0.02]" />
      </div>

      {/* Back link */}
      <div className="relative z-10 px-6 pt-8">
        <button
          onClick={() => navigate("/")}
          className="text-sm text-neutral-500 hover:text-black dark:hover:text-white transition-colors"
        >
          &larr; Back to Cortex
        </button>
      </div>

      {/* Auth Content */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-sm"
        >
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-black dark:bg-white mb-4">
              <span className="text-white dark:text-black text-sm font-bold">C</span>
            </div>
            <h1 className="text-xl font-semibold tracking-tight text-black dark:text-white">
              {step === "signIn" ? "Welcome to Cortex" : "Check your email"}
            </h1>
            <p className="text-sm text-neutral-500 mt-1.5 font-[350]">
              {step === "signIn"
                ? "Sign in or create an account to get started."
                : `We sent a code to ${step.email}`}
            </p>
          </div>

          <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-900 shadow-sm overflow-hidden">
            <AnimatePresence mode="wait">
              {step === "signIn" ? (
                <motion.div
                  key="signin"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="p-6 space-y-5"
                >

                  {/* Email form */}
                  <form onSubmit={handleEmailSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                        Email address
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" strokeWidth={1.5} />
                        <Input
                          name="email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="name@example.com"
                          className="pl-10 h-10 text-sm rounded-xl border-black/10 dark:border-white/10"
                          disabled={isLoading}
                          required
                        />
                      </div>
                    </div>

                    {error && (
                      <p className="text-xs text-red-500">{error}</p>
                    )}

                    <Button
                      type="submit"
                      className="w-full h-10 rounded-xl bg-black text-white dark:bg-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-200 text-sm"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          Continue with Email
                          <ArrowRight className="w-3.5 h-3.5 ml-1" strokeWidth={1.5} />
                        </>
                      )}
                    </Button>
                  </form>

                  {/* Guest login */}
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={handleGuestLogin}
                      disabled={isLoading}
                      className="text-xs text-neutral-500 hover:text-black dark:hover:text-white transition-colors"
                    >
                      Continue as guest
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="otp"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="p-6"
                >
                  <form onSubmit={handleOtpSubmit} className="space-y-5">
                    <input type="hidden" name="email" value={step.email} />
                    <input type="hidden" name="code" value={otp} />

                    <div className="flex justify-center">
                      <InputOTP
                        value={otp}
                        onChange={setOtp}
                        maxLength={6}
                        disabled={isLoading}
                      >
                        <InputOTPGroup>
                          {Array.from({ length: 6 }).map((_, index) => (
                            <InputOTPSlot key={index} index={index} />
                          ))}
                        </InputOTPGroup>
                      </InputOTP>
                    </div>

                    {error && (
                      <p className="text-xs text-red-500 text-center">{error}</p>
                    )}

                    <Button
                      type="submit"
                      className="w-full h-10 rounded-xl bg-black text-white dark:bg-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-200 text-sm"
                      disabled={isLoading || otp.length !== 6}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        <>
                          Verify code
                          <ArrowRight className="w-3.5 h-3.5 ml-1" strokeWidth={1.5} />
                        </>
                      )}
                    </Button>

                    <p className="text-xs text-center text-neutral-500">
                      Didn't receive a code?{" "}
                      <button
                        type="button"
                        className="text-black dark:text-white underline hover:no-underline"
                        onClick={() => setStep("signIn")}
                      >
                        Try again
                      </button>
                    </p>

                    <button
                      type="button"
                      className="w-full text-xs text-neutral-500 hover:text-black dark:hover:text-white transition-colors text-center"
                      onClick={() => setStep("signIn")}
                    >
                      Use a different email
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* <p className="text-[11px] text-center text-neutral-400 mt-6"> */}
        </motion.div>
      </div>
    </div>
            
  );
}

export default function AuthPage(props: AuthProps) {
  return (
    <Suspense>
      <Auth {...props} />
    </Suspense>
  );
}
