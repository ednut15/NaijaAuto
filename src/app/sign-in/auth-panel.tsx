"use client";

import { FormEvent, useMemo, useState } from "react";

interface AuthPanelProps {
  nextPath: string;
  initialMessage?: string;
}

interface SessionResponse {
  ok: true;
  redirectTo: string;
  requiresEmailVerification?: boolean;
}

interface ErrorResponse {
  error?: string;
}

function getErrorMessage(payload: unknown, fallback: string): string {
  if (payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string") {
    return payload.error;
  }

  return fallback;
}

export function AuthPanel({ nextPath, initialMessage }: AuthPanelProps) {
  const [authMode, setAuthMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(initialMessage ?? null);
  const [signupRole, setSignupRole] = useState<"buyer" | "seller">("buyer");
  const [signupSellerType, setSignupSellerType] = useState<"private" | "dealer">("private");

  const panelTitle = useMemo(
    () => (authMode === "sign-in" ? "Sign In" : "Create Account"),
    [authMode],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    try {
      const isSignUp = authMode === "sign-up";
      const endpoint = isSignUp ? "/api/auth/session/signup" : "/api/auth/session/login";

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
          role: isSignUp ? signupRole : undefined,
          sellerType: isSignUp && signupRole === "seller" ? signupSellerType : undefined,
          redirectTo: nextPath,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as SessionResponse | ErrorResponse;
      if (!response.ok || !("ok" in payload)) {
        throw new Error(getErrorMessage(payload, "Unable to complete authentication."));
      }

      if (payload.requiresEmailVerification) {
        setMessage("Account created. Check your email to confirm before signing in.");
        setAuthMode("sign-in");
        return;
      }

      window.location.assign(payload.redirectTo || nextPath);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to complete authentication.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="section">
      <div className="filter-panel" style={{ maxWidth: 560, margin: "0 auto" }}>
        <div className="section-head" style={{ marginBottom: 16 }}>
          <div>
            <h2>{panelTitle}</h2>
            <p>Use your NaijaAuto account to access seller, moderator, and admin tools.</p>
          </div>
        </div>

        {message ? (
          <div className="filter-panel" style={{ marginBottom: 12 }}>
            {message}
          </div>
        ) : null}

        {error ? (
          <div className="empty-state" style={{ marginBottom: 12 }}>
            {error}
          </div>
        ) : null}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 10 }}>
            <label className="label" htmlFor="auth-email">
              Email
            </label>
            <input className="input" id="auth-email" name="email" type="email" required autoComplete="email" />
          </div>

          <div style={{ marginBottom: 10 }}>
            <label className="label" htmlFor="auth-password">
              Password
            </label>
            <input
              className="input"
              id="auth-password"
              name="password"
              type="password"
              minLength={8}
              required
              autoComplete={authMode === "sign-up" ? "new-password" : "current-password"}
            />
          </div>

          {authMode === "sign-up" ? (
            <div className="filter-grid" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))", marginBottom: 10 }}>
              <div>
                <label className="label" htmlFor="auth-role">
                  Role
                </label>
                <select
                  className="select"
                  id="auth-role"
                  value={signupRole}
                  onChange={(event) => setSignupRole(event.target.value as "buyer" | "seller")}
                >
                  <option value="buyer">Buyer</option>
                  <option value="seller">Seller</option>
                </select>
              </div>

              <div>
                <label className="label" htmlFor="auth-seller-type">
                  Seller Type
                </label>
                <select
                  className="select"
                  id="auth-seller-type"
                  value={signupSellerType}
                  onChange={(event) => setSignupSellerType(event.target.value as "private" | "dealer")}
                  disabled={signupRole !== "seller"}
                >
                  <option value="private">Private</option>
                  <option value="dealer">Dealer</option>
                </select>
              </div>
            </div>
          ) : null}

          <button className="button" type="submit" disabled={isSubmitting} style={{ width: "100%", justifyContent: "center" }}>
            {isSubmitting ? "Submitting..." : authMode === "sign-in" ? "Sign In" : "Create Account"}
          </button>
        </form>

        <div style={{ marginTop: 14, textAlign: "center", color: "var(--muted)", fontSize: "0.92rem" }}>
          {authMode === "sign-in" ? (
            <>
              New to NaijaAuto?{" "}
              <button
                type="button"
                className="button secondary"
                style={{ marginLeft: 8, padding: "8px 12px" }}
                onClick={() => {
                  setAuthMode("sign-up");
                  setError(null);
                }}
              >
                Create account
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                type="button"
                className="button secondary"
                style={{ marginLeft: 8, padding: "8px 12px" }}
                onClick={() => {
                  setAuthMode("sign-in");
                  setError(null);
                }}
              >
                Sign in
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
