"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { setToken, getToken, apiFetch } from "@/lib/api";
import {
  validateEmail,
  validatePassword,
  validateConfirmPassword,
  mapServerError,
} from "@/lib/validators";
import { Eye, EyeOff, Loader2 } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false, confirmPassword: false });
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
  const confirmPasswordError = validateConfirmPassword(password, confirmPassword);
  const isFormValid = !emailError && !passwordError && !confirmPasswordError;

  const showEmailError = (touched.email || hasSubmitted) && Boolean(emailError);
  const showPasswordError = (touched.password || hasSubmitted) && Boolean(passwordError);
  const showConfirmError =
    (touched.confirmPassword || hasSubmitted) && Boolean(confirmPasswordError);

  async function handleSubmit(e) {
    e.preventDefault();
    setHasSubmitted(true);
    setServerError("");

    if (!isFormValid) {
      return;
    }

    setLoading(true);
    try {
      const regRes = await apiFetch("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), password }),
      });

      if (!regRes.ok) {
        const errorData = await regRes.json().catch(() => ({}));
        throw { status: regRes.status, detail: errorData.detail };
      }

      // Auto login after successful registration
      const loginRes = await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), password }),
      });

      if (loginRes.ok) {
        const data = await loginRes.json();
        setToken(data.access_token);
        router.push("/projects");
      } else {
        router.push("/login");
      }
    } catch (err) {
      setServerError(mapServerError(err, "register"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-page px-4">
      <div className="w-full max-w-sm rounded border border-border bg-white p-8">
        <div className="mb-6">
          <h1 className="text-xl font-bold tracking-tight text-text">Create an account</h1>
          <p className="mt-1 text-sm text-text-muted">Sign up to start designing with PixelForge</p>
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
            <label htmlFor="reg-email" className="block text-xs font-medium text-text mb-1">
              Email
            </label>
            <input
              id="reg-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
              aria-invalid={showEmailError}
              aria-describedby={showEmailError ? "reg-email-error" : undefined}
              className={`w-full rounded border px-3 py-2 text-sm text-text placeholder-slate-400 focus:outline-none focus:ring-2 transition ${
                showEmailError
                  ? "border-danger focus:border-danger focus:ring-red-100"
                  : "border-border focus:border-accent focus:ring-slate-100"
              }`}
              placeholder="name@example.com"
            />
            {showEmailError && (
              <p id="reg-email-error" aria-live="polite" className="mt-1 text-xs text-danger">
                {emailError}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="reg-password" className="block text-xs font-medium text-text mb-1">
              Password
            </label>
            <div className="relative">
              <input
                id="reg-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => setTouched((prev) => ({ ...prev, password: true }))}
                aria-invalid={showPasswordError}
                aria-describedby={showPasswordError ? "reg-password-error" : undefined}
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
              <p id="reg-password-error" aria-live="polite" className="mt-1 text-xs text-danger">
                {passwordError}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="reg-confirm-password" className="block text-xs font-medium text-text mb-1">
              Confirm password
            </label>
            <div className="relative">
              <input
                id="reg-confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onBlur={() => setTouched((prev) => ({ ...prev, confirmPassword: true }))}
                aria-invalid={showConfirmError}
                aria-describedby={showConfirmError ? "reg-confirm-error" : undefined}
                className={`w-full rounded border px-3 py-2 pr-10 text-sm text-text placeholder-slate-400 focus:outline-none focus:ring-2 transition ${
                  showConfirmError
                    ? "border-danger focus:border-danger focus:ring-red-100"
                    : "border-border focus:border-accent focus:ring-slate-100"
                }`}
                placeholder="Re-enter password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                className="absolute right-2.5 top-2.5 text-text-muted hover:text-text focus:outline-none"
                aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
              >
                {showConfirmPassword ? (
                  <EyeOff size={18} strokeWidth={1.75} />
                ) : (
                  <Eye size={18} strokeWidth={1.75} />
                )}
              </button>
            </div>
            {showConfirmError && (
              <p id="reg-confirm-error" aria-live="polite" className="mt-1 text-xs text-danger">
                {confirmPasswordError}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center space-x-2 rounded bg-accent hover:bg-accent-hover text-white py-2 px-4 text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-accent/20"
          >
            {loading && <Loader2 size={16} strokeWidth={1.75} className="animate-spin" />}
            <span>{loading ? "Creating account..." : "Create account"}</span>
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-text-muted">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-accent hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
