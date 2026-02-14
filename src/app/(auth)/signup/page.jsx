"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { saveUser } from "@/lib/session";

export default function SignUpPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");

  const [currency, setCurrency] = useState("KZT");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const nextFromStep1 = () => {
    setErr("");
    if (!email || !password) return setErr("Email and password required");
    if (password.length < 8) return setErr("Password must be at least 8 characters");
    if (password !== password2) return setErr("Passwords do not match");
    setStep(2);
  };

  const register = async () => {
    setErr("");
    try {
      setLoading(true);

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, currency }),
      });

      const raw = await res.text();
      let data = {};
      try {
        data = JSON.parse(raw);
      } catch {}

      if (!res.ok) {
        setErr(data?.error || raw.slice(0, 300) || `Register failed (${res.status})`);
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
      <div className="text-3xl font-extrabold mb-2">Create an account</div>

      <div className="text-sm text-black/60 mb-6">
        Already have account?{" "}
        <Link className="text-sky-500 font-semibold" href="/signin">
          Sign in
        </Link>
      </div>

      {step === 1 && (
        <>
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

            <div className="text-xs text-black/45 px-1">
              Password must be 8+ characters (MVP).
            </div>

            <input
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              className="w-full rounded-full bg-[#F4F6FB] px-4 py-3 outline-none"
              placeholder="Password again"
              type="password"
            />
          </div>

          {err ? <div className="text-sm text-red-600 mt-3">{err}</div> : null}

          <button
            type="button"
            onClick={nextFromStep1}
            className="mt-6 w-full rounded-full bg-[var(--accent)] py-3 font-semibold shadow-[0_10px_18px_rgba(0,0,0,0.18)]"
          >
            Continue
          </button>
        </>
      )}

      {step === 2 && (
        <>
          <div className="space-y-3">
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full rounded-full bg-[#F4F6FB] px-4 py-3 outline-none"
            >
              <option value="KZT">Currency: KZT ₸</option>
              <option value="USD">Currency: USD $</option>
              <option value="EUR">Currency: EUR €</option>
            </select>
          </div>

          {err ? <div className="text-sm text-red-600 mt-3">{err}</div> : null}

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="w-1/2 rounded-full bg-white py-3 font-semibold border border-black/10"
            >
              Back
            </button>

            <button
              type="button"
              onClick={register}
              disabled={loading}
              className="w-1/2 rounded-full bg-[var(--accent)] py-3 font-semibold shadow-[0_10px_18px_rgba(0,0,0,0.18)] disabled:opacity-60"
            >
              {loading ? "Loading..." : "Finish"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}