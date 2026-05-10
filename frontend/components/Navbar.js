"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { clearAuth } from "@/lib/auth";
import useAuthClientState from "@/hooks/useAuthClientState";
import { Zap } from "lucide-react";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { mounted, token, role } = useAuthClientState();

  if (!mounted) return null;

  const isActive = (path) => pathname === path;

  const NavLink = ({ href, label }) => {
    const active = isActive(href);
    return (
      <Link
        href={href}
        className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium h-16 transition-colors ${active
            ? "border-stripe-blue text-stripe-blue"
            : "border-transparent text-stripe-textSecondary hover:border-stripe-border hover:text-stripe-foreground"
          }`}
      >
        {label}
      </Link>
    );
  };

  return (
    <nav className="h-16 bg-white border-b border-border">
      <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-4">
        <div className="flex h-full items-center gap-8">
          <Link href="/" className="flex items-center gap-2 font-bold text-stripe-blue text-xl">
            <Zap className="h-5 w-5" fill="currentColor" />
            TaskFlow
          </Link>
          {token && (
            <div className="hidden sm:flex h-full space-x-6">
              <NavLink href="/dashboard" label="Dashboard" />
              <NavLink href="/projects" label="Projects" />
            </div>
          )}
        </div>
        <div className="flex items-center gap-4">
          {token ? (
            <>
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-stripe-blue/10 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-stripe-blue border border-stripe-blue/20">
                  {role}
                </span>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-stripe-foreground text-white font-medium text-sm">
                  {role?.charAt(0).toUpperCase() || "U"}
                </div>
              </div>
              <button
                className="rounded-md border border-border bg-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-background text-foreground transition-colors"
                onClick={() => {
                  clearAuth();
                  router.push("/login");
                }}
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm font-medium text-stripe-textSecondary hover:text-stripe-foreground">
                Login
              </Link>
              <Link href="/signup" className="rounded-md bg-stripe-blue px-4 py-2 text-sm font-medium text-white hover:bg-stripe-blue/90 shadow-sm transition-colors">
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
