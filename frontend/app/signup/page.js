"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Zap, CheckCircle2 } from "lucide-react";

const ROLES = [
  { value: "admin", label: "Admin" },
  { value: "pl", label: "Project Lead (PL)" },
  { value: "qr", label: "Quality Review (QR)" },
  { value: "tasker", label: "Tasker" }
];

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "tasker",
    parent_id: ""
  });
  const [parents, setParents] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadParents() {
      if (form.role === "tasker") {
        const res = await api.get("/auth/parent-options", { params: { forRole: "tasker" } });
        setParents(res.data);
      } else if (form.role === "qr") {
        const res = await api.get("/auth/parent-options", { params: { forRole: "qr" } });
        setParents(res.data);
      } else {
        setParents([]);
      }
    }
    loadParents().catch(() => setParents([]));
  }, [form.role]);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      const payload = { ...form };
      if (!(form.role === "tasker" || form.role === "qr")) delete payload.parent_id;
      await api.post("/auth/signup", payload);
      router.push("/login");
    } catch (err) {
      setError(err.response?.data?.error || "Signup failed");
    }
  }

  return (
    <main className="flex min-h-screen bg-[var(--page-bg)]">
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
              <span>Set up roles for every member</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 opacity-80" />
              <span>Track individual and team progress</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 opacity-80" />
              <span>Collaborate with beautifully crafted UI</span>
            </div>
          </div>
        </div>
        <div className="relative z-10 text-sm text-white/70">
          © {new Date().getFullYear()} TaskFlow Inc.
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="flex w-full lg:w-1/2 flex-col justify-center bg-stripe-card px-8 sm:px-16 lg:px-24">
        <div className="w-full max-w-sm mx-auto py-12">
          <h2 className="text-2xl font-bold text-stripe-textPrimary mb-6">Create an account</h2>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div>
              <label className="block text-sm font-medium text-stripe-textPrimary mb-1">Name</label>
              <input
                className="w-full rounded-input border border-stripe-border px-3 py-2 outline-none focus:border-stripe-blue focus:ring-1 focus:ring-stripe-blue transition-all bg-white"
                placeholder="Jane Doe"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stripe-textPrimary mb-1">Email</label>
              <input
                className="w-full rounded-input border border-stripe-border px-3 py-2 outline-none focus:border-stripe-blue focus:ring-1 focus:ring-stripe-blue transition-all bg-white"
                placeholder="jane@company.com"
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
            <div>
              <label className="block text-sm font-medium text-stripe-textPrimary mb-1">Role</label>
              <select
                className="w-full rounded-input border border-stripe-border px-3 py-2 outline-none focus:border-stripe-blue focus:ring-1 focus:ring-stripe-blue transition-all bg-white text-stripe-textPrimary"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value, parent_id: "" })}
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            {form.role === "tasker" && (
              <div>
                <label className="block text-sm font-medium text-stripe-textPrimary mb-1">Assign to QA</label>
                <select
                  className="w-full rounded-input border border-stripe-border px-3 py-2 outline-none focus:border-stripe-blue focus:ring-1 focus:ring-stripe-blue transition-all bg-white text-stripe-textPrimary"
                  value={form.parent_id}
                  onChange={(e) => setForm({ ...form, parent_id: e.target.value })}
                  required
                >
                  <option value="">Select your QR</option>
                  {parents.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.email})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {form.role === "qr" && (
              <div>
                <label className="block text-sm font-medium text-stripe-textPrimary mb-1">Assign to Lead</label>
                <select
                  className="w-full rounded-input border border-stripe-border px-3 py-2 outline-none focus:border-stripe-blue focus:ring-1 focus:ring-stripe-blue transition-all bg-white text-stripe-textPrimary"
                  value={form.parent_id}
                  onChange={(e) => setForm({ ...form, parent_id: e.target.value })}
                  required
                >
                  <option value="">Select your PL</option>
                  {parents.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.email})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {error && <p className="text-sm text-stripe-danger font-medium">{error}</p>}

            <button className="w-full rounded-input bg-stripe-blue mt-4 px-4 py-2 font-medium text-white hover:bg-stripe-blue/90 shadow-sm transition-colors">
              Create account
            </button>
          </form>
          <p className="mt-6 text-sm text-stripe-textSecondary">
            Already have an account?{" "}
            <Link href="/login" className="text-stripe-blue font-medium hover:underline">
              Login
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
