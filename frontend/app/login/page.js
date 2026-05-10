"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import api from "@/lib/api";
import { saveAuth } from "@/lib/auth";
import { Zap, CheckCircle2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      const response = await api.post("/auth/login", form);
      saveAuth(response.data.token);
      router.push("/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || "Login failed");
    }
  }

  return (
    <main className="flex min-h-screen bg-stripe-bg">
      {/* Left Branding Panel */}
      <div className="hidden w-1/2 bg-stripe-blue p-12 text-white lg:flex flex-col justify-between relative overflow-hidden">
        {/* Subtle grid overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff1a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff1a_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30"></div>

        <div className="relative z-10 flex items-center gap-2 font-bold text-2xl">
          <Zap className="h-6 w-6" fill="currentColor" />
          TaskFlow
        </div>
        <div className="relative z-10 mb-24 max-w-md">
          <h1 className="text-4xl font-bold mb-6">Manage your team's work, beautifully</h1>
          <div className="space-y-4 text-white/90">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 opacity-80" />
              <span>Review workflows integrated natively</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 opacity-80" />
              <span>Hierarchical access and analytics</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 opacity-80" />
              <span>Lightning fast, highly responsive UI</span>
            </div>
          </div>
        </div>
        <div className="relative z-10 text-sm text-white/70">
          © {new Date().getFullYear()} TaskFlow Inc.
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="flex w-full lg:w-1/2 flex-col justify-center bg-stripe-card px-8 sm:px-16 lg:px-24">
        <div className="w-full max-w-sm mx-auto">
          <h2 className="text-2xl font-bold text-stripe-textPrimary mb-6">Welcome back</h2>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div>
              <label className="block text-sm font-medium text-stripe-textPrimary mb-1">Email</label>
              <input
                className="w-full rounded-input border border-stripe-border px-3 py-2 outline-none focus:border-stripe-blue focus:ring-1 focus:ring-stripe-blue transition-all bg-white"
                placeholder="you@company.com"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stripe-textPrimary mb-1">Password</label>
              <input
                className="w-full rounded-input border border-stripe-border px-3 py-2 outline-none focus:border-stripe-blue focus:ring-1 focus:ring-stripe-blue transition-all bg-white"
                placeholder="••••••••"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>
            {error ? <p className="text-sm text-stripe-danger font-medium">{error}</p> : null}
            <button className="w-full rounded-input bg-stripe-blue mt-2 px-4 py-2 font-medium text-white hover:bg-stripe-blue/90 shadow-sm transition-colors">
              Login
            </button>
          </form>
          <p className="mt-6 text-sm text-stripe-textSecondary">
            Don't have an account?{" "}
            <Link href="/signup" className="text-stripe-blue font-medium hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
