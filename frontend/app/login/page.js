"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { setToken, getToken, apiFetch } from "@/lib/api";
import { validateEmail, validatePassword, mapServerError } from "@/lib/validators";
import { Eye, EyeOff, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false });
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  // Redirect away if already signed in
  useEffect(() => {
    if (getToken()) {
      router.replace("/projects");
    }
  }, [router]);

  const emailError = validateEmail(email);
  const passwordError = validatePassword(password);
  const isFormValid = !emailError && !passwordError;

  const showEmailError = (touched.email || hasSubmitted) && Boolean(emailError);
  const showPasswordError = (touched.password || hasSubmitted) && Boolean(passwordError);

  async function handleSubmit(e) {
    e.preventDefault();
    setHasSubmitted(true);
    setServerError("");

    if (!isFormValid) {
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), password }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw { status: res.status, detail: errorData.detail };
      }

      const data = await res.json();
      setToken(data.access_token);
      router.push("/projects");
    } catch (err) {
      setServerError(mapServerError(err, "login"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-page px-4">
      <div className="w-full max-w-sm rounded border border-border bg-white p-8">
        <div className="mb-6">
          <h1 className="text-xl font-bold tracking-tight text-text">Sign in to PixelForge</h1>
          <p className="mt-1 text-sm text-text-muted">Enter your email and password to continue</p>
        </div>

        {serverError && (
          <div
            role="alert"
            aria-live="polite"
            className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-danger"
          >
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-xs font-medium text-text mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
              aria-invalid={showEmailError}
              aria-describedby={showEmailError ? "email-error" : undefined}
              className={`w-full rounded border px-3 py-2 text-sm text-text placeholder-slate-400 focus:outline-none focus:ring-2 transition ${
                showEmailError
                  ? "border-danger focus:border-danger focus:ring-red-100"
                  : "border-border focus:border-accent focus:ring-slate-100"
              }`}
              placeholder="name@example.com"
            />
            {showEmailError && (
              <p id="email-error" aria-live="polite" className="mt-1 text-xs text-danger">
                {emailError}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-medium text-text mb-1">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => setTouched((prev) => ({ ...prev, password: true }))}
                aria-invalid={showPasswordError}
                aria-describedby={showPasswordError ? "password-error" : undefined}
                className={`w-full rounded border px-3 py-2 pr-10 text-sm text-text placeholder-slate-400 focus:outline-none focus:ring-2 transition ${
                  showPasswordError
                    ? "border-danger focus:border-danger focus:ring-red-100"
                    : "border-border focus:border-accent focus:ring-slate-100"
                }`}
                placeholder="At least 8 characters"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-2.5 top-2.5 text-text-muted hover:text-text focus:outline-none"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff size={18} strokeWidth={1.75} />
                ) : (
                  <Eye size={18} strokeWidth={1.75} />
                )}
              </button>
            </div>
            {showPasswordError && (
              <p id="password-error" aria-live="polite" className="mt-1 text-xs text-danger">
                {passwordError}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center space-x-2 rounded bg-accent hover:bg-accent-hover text-white py-2 px-4 text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-accent/20"
          >
            {loading && <Loader2 size={16} strokeWidth={1.75} className="animate-spin" />}
            <span>{loading ? "Signing in..." : "Sign in"}</span>
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-text-muted">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-medium text-accent hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
