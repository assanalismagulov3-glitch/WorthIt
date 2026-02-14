"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { saveUser } from "@/lib/session";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const login = async () => {
    setErr("");

    // быстрый тест — если кнопка живая, эта ошибка появится
    if (!email || !password) {
      setErr("Enter email and password");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      let data = {};
      try {
        data = await res.json();
      } catch {
        // если сервер вернул не JSON
      }

      if (!res.ok) {
        setErr(data?.error || `Login failed (${res.status})`);
        return;
      }

      saveUser(data.user);
      router.push("/home");
    } catch (e) {
      setErr(e?.message || "Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative z-10 bg-white rounded-[28px] px-5 py-6 shadow-[0_12px_26px_rgba(0,0,0,0.18)] border border-black/10">
      <div className="text-3xl font-extrabold mb-2">Sign in</div>
      <div className="text-sm text-black/60 mb-6">
        New User?{" "}
        <Link className="text-sky-500 font-semibold" href="/signup">
          Create an account
        </Link>
      </div>

      <div className="space-y-3">
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-full bg-[#F4F6FB] px-4 py-3 outline-none"
          placeholder="Email address"
        />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-full bg-[#F4F6FB] px-4 py-3 outline-none"
          placeholder="Password"
          type="password"
        />
      </div>

      {err ? <div className="text-sm text-red-600 mt-3">{err}</div> : null}

      <button
        type="button"
        onClick={login}
        disabled={loading}
        className="mt-6 w-full rounded-full bg-[var(--accent)] py-3 font-semibold shadow-[0_10px_18px_rgba(0,0,0,0.18)] disabled:opacity-60"
      >
        {loading ? "Loading..." : "Continue"}
      </button>

      <div className="text-center text-xs text-black/40 mt-5">OR</div>
      <div className="text-center text-sm text-black/55 mt-2">Continue with:</div>

      <button
        type="button"
        className="mx-auto mt-3 w-14 h-14 rounded-full bg-white border border-black/10 shadow flex items-center justify-center"
      >
        G
      </button>
    </div>
  );
}

