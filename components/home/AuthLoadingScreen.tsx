"use client";

import { BrandMark } from "./BrandMark";

export function AuthLoadingScreen() {
  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="auth-brand">
          <div className="auth-brand-mark">
            <BrandMark />
          </div>

          <div>
            <strong>myFolks</strong>
            <span>Find common ground</span>
          </div>
        </div>

        <div className="auth-heading">
          <p className="eyebrow">myFolks</p>

          <h1>Getting things ready.</h1>

          <p>Just a moment.</p>
        </div>
      </section>
    </main>
  );
}
