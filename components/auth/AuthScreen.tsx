"use client";

import { FormEvent, useState } from "react";
import { supabase } from "@/src/lib/supabase";

type Mode = "login" | "signup";

export default function AuthScreen() {
  const [mode, setMode] = useState<Mode>("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resetMessages = () => {
    setMessage(null);
    setError(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    resetMessages();

    if (mode === "signup") {
      if (!username.trim()) {
        setError("Choose a username.");
        return;
      }

      if (!email.trim()) {
        setError("Enter your email address.");
        return;
      }

      if (password.length < 8) {
        setError("Your password must be at least 8 characters.");
        return;
      }

      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
    }

    setLoading(true);

    try {
      if (mode === "login") {
        const { error: signInError } =
          await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });

        if (signInError) {
          throw signInError;
        }

        setMessage("Welcome back.");
        return;
      }

      const { data, error: signUpError } =
        await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              username: username.trim(),
            },
          },
        });

      if (signUpError) {
        throw signUpError;
      }

      if (data.session) {
        setMessage("Your account has been created.");
      } else {
        setMessage(
          "Account created. Check your email to verify your account.",
        );
      }

      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    resetMessages();
    setMode((current) =>
      current === "login" ? "signup" : "login",
    );
  };

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="auth-brand">
          <div className="auth-brand-mark">m</div>

          <div>
            <strong>myFolks</strong>
            <span>Find common ground</span>
          </div>
        </div>

        <div className="auth-heading">
          <p className="eyebrow">
            {mode === "login" ? "Hey!!!!!!!" : "Join myFolks"}
          </p>

          <h1>
            {mode === "login"
              ? "Good to see you."
              : "Let's find your folks."}
          </h1>

          <p>
            {mode === "login"
              ? "Sign in to continue."
              : "Create your account and start discovering."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {mode === "signup" && (
            <label>
              <span>Username</span>

              <input
                type="text"
                value={username}
                onChange={(event) =>
                  setUsername(event.target.value)
                }
                placeholder="Enter your username"
                autoComplete="username"
                disabled={loading}
                required
              />
            </label>
          )}

          <label>
            <span>Email</span>

            <input
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              placeholder="Enter your email address"
              autoComplete="email"
              disabled={loading}
              required
            />
          </label>

          <label>
            <span>Password</span>

            <input
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              placeholder="Enter your password"
              autoComplete={
                mode === "login"
                  ? "current-password"
                  : "new-password"
              }
              disabled={loading}
              required
            />
          </label>

          {mode === "signup" && (
            <label>
              <span>Confirm password</span>

              <input
                type="password"
                value={confirmPassword}
                onChange={(event) =>
                  setConfirmPassword(event.target.value)
                }
                placeholder="Confirm your password"
                autoComplete="new-password"
                disabled={loading}
                required
              />
            </label>
          )}

          {error && (
            <div className="auth-message auth-message-error">
              {error}
            </div>
          )}

          {message && (
            <div className="auth-message auth-message-success">
              {message}
            </div>
          )}

          <button
            type="submit"
            className="button button-primary auth-submit"
            disabled={loading}
          >
            {loading
              ? "Please wait..."
              : mode === "login"
                ? "Log in"
                : "Create account"}
          </button>
        </form>

        <div className="auth-switch">
          <span>
            {mode === "login"
              ? "Don't have an account?"
              : "Already have an account?"}
          </span>

          <button
            type="button"
            onClick={switchMode}
            disabled={loading}
          >
            {mode === "login"
              ? "Create account"
              : "Log in"}
          </button>
        </div>
      </section>
    </main>
  );
}