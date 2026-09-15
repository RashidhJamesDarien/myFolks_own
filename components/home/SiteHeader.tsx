"use client";

import React from "react";
import { Icon } from "./Icon";
import { NavButton } from "./NavButton";
import { BrandMark } from "./BrandMark";
import type { View } from "./types";

export function SiteHeader({
  view,
  darkMode,
  themeAnimating,
  mobileMenuOpen,
  profileConfirmed,
  onNavigate,
  onToggleMobileMenu,
  onToggleTheme,
}: {
  view: View;
  darkMode: boolean;
  themeAnimating: boolean;
  mobileMenuOpen: boolean;
  profileConfirmed: boolean;
  onNavigate: (view: View) => void;
  onToggleMobileMenu: () => void;
  onToggleTheme: (
    event: React.MouseEvent<HTMLButtonElement>,
  ) => void;
}) {
  return (
    <header className="site-header">
      <div className="header-inner">
        <button
          type="button"
          className="brand-button focus-ring"
          onClick={() => onNavigate("discover")}
        >
          <div className="brand-mark">
            <BrandMark />
          </div>

          <span>
            <span className="wordmark">myFolks</span>

            <span className="tagline">
              Find common ground
            </span>
          </span>
        </button>

        <button
          type="button"
          className="mobile-menu-toggle focus-ring"
          onClick={onToggleMobileMenu}
          aria-expanded={mobileMenuOpen}
          aria-label={
            mobileMenuOpen
              ? "Close navigation"
              : "Open navigation"
          }
        >
          <Icon
            name={mobileMenuOpen ? "x" : "menu"}
            size={22}
          />
        </button>

        <nav
          className={`primary-nav ${
            mobileMenuOpen ? "is-open" : ""
          }`}
        >
          <NavButton
            active={view === "discover"}
            onClick={() => onNavigate("discover")}
          >
            Discover
          </NavButton>

          <NavButton
            active={view === "friends"}
            onClick={() => onNavigate("friends")}
          >
            Friends
          </NavButton>

          {profileConfirmed && (
            <NavButton
              active={view === "messages"}
              onClick={() => onNavigate("messages")}
            >
              Messages
            </NavButton>
          )}

          {!profileConfirmed && (
            <NavButton
              active={view === "create"}
              onClick={() => onNavigate("create")}
            >
              Create profile
            </NavButton>
          )}

          {profileConfirmed && (
            <>
              <NavButton
                active={view === "profile"}
                onClick={() => onNavigate("profile")}
              >
                My profile
              </NavButton>

              <NavButton
                active={view === "settings"}
                onClick={() => onNavigate("settings")}
              >
                Settings
              </NavButton>
            </>
          )}

          <button
            type="button"
            className="theme-toggle focus-ring"
            onClick={onToggleTheme}
            disabled={themeAnimating}
            aria-label={
              darkMode
                ? "Switch to light mode"
                : "Switch to dark mode"
            }
            title={
              darkMode
                ? "Switch to light mode"
                : "Switch to dark mode"
            }
          >
            <Icon
              name={darkMode ? "sun" : "moon"}
              size={18}
              strokeWidth={2}
            />
          </button>
        </nav>
      </div>
    </header>
  );
}
