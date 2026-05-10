import Link from "next/link";
import { ArrowRight, CheckCircle2, Zap } from "lucide-react";
import Navbar from "@/components/Navbar";

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main className="min-h-[calc(100vh-64px)] bg-stripe-surface relative overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-stripe-blue/10 blur-[100px]" />
          <div className="absolute bottom-[-10%] left-[-5%] w-[600px] h-[600px] rounded-full bg-indigo-500/10 blur-[120px]" />
        </div>

        <div className="container-page max-w-5xl mx-auto pt-20 md:pt-32 pb-16 relative z-10 flex flex-col items-center text-center">

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-stripe-blue/10 border border-stripe-blue/20 text-stripe-blue text-sm font-bold mb-8 uppercase tracking-wide">
            <Zap className="h-4 w-4" /> v2.0 Redesign Live
          </div>

          <h1 className="text-5xl md:text-7xl font-bold text-stripe-textPrimary tracking-tight leading-tight max-w-4xl">
            Manage your team's work, <span className="text-transparent bg-clip-text bg-gradient-to-r from-stripe-blue to-indigo-500">beautifully</span>
          </h1>

          <p className="mt-6 text-lg md:text-xl text-stripe-textSecondary max-w-2xl font-medium">
            Collaborate on projects, streamline tasks, and track high-level progress with a fully integrated suite of hierarchy-based workflows.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 w-full">
            <Link href="/signup" className="flex items-center justify-center gap-2 w-full sm:w-auto rounded-md bg-stripe-blue px-8 py-3.5 text-base font-semibold text-white shadow-lg hover:bg-stripe-blue/90 hover:shadow-xl hover:-translate-y-0.5 transition-all outline-none focus:ring-4 focus:ring-stripe-blue/30">
              Start for free <ArrowRight className="h-5 w-5" />
            </Link>
            <Link href="/login" className="flex items-center justify-center w-full sm:w-auto rounded-md bg-white border border-stripe-border px-8 py-3.5 text-base font-semibold text-stripe-textPrimary shadow-sm hover:bg-slate-50 hover:shadow-md transition-all outline-none focus:ring-4 focus:ring-slate-200">
              Sign In
            </Link>
          </div>

          <div className="mt-20 pt-10 border-t border-stripe-border border-dashed w-full max-w-3xl flex flex-col sm:flex-row justify-center gap-6 sm:gap-12 text-sm font-semibold text-stripe-textSecondary">
            <span className="flex items-center gap-2 justify-center"><CheckCircle2 className="h-5 w-5 text-emerald-500" /> Integrated Workflows</span>
            <span className="flex items-center gap-2 justify-center"><CheckCircle2 className="h-5 w-5 text-emerald-500" /> Advanced Analytics</span>
            <span className="flex items-center gap-2 justify-center"><CheckCircle2 className="h-5 w-5 text-emerald-500" /> Role-based Access</span>
          </div>

        </div>
      </main>
    </>
  );
}
