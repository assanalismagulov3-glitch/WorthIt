"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { loadUser } from "@/lib/session";

export default function AddSpendingPage() {
  const router = useRouter();
  const user = loadUser();

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("expense"); // expense | income
  const [bucket, setBucket] = useState("this_month"); // only for expense
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const save = async () => {
    setErr("");
    if (!user?.id) return router.push("/signin");

    const a = Number(String(amount).replace(",", "."));
    if (!title.trim()) return setErr("Title required");
    if (!Number.isFinite(a) || a <= 0) return setErr("Amount must be > 0");

    setLoading(true);
    try {
      const res = await fetch("/api/tx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          type, // income / expense
          title: title.trim(),
          amount: a,
          category: type === "expense" ? bucket : "income",
        }),
      });

      const raw = await res.text();
      let data = {};
      try { data = JSON.parse(raw); } catch {}

      if (!res.ok) {
        setErr(data?.error || raw.slice(0, 200) || `Error (${res.status})`);
        return;
      }

      router.push("/home");
    } catch (e) {
      setErr(e?.message || "Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-[28px] bg-white/80 border border-black/10 shadow-sm p-5">
      <div className="text-center font-extrabold text-xl mb-4">Add transaction</div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <button
          type="button"
          onClick={() => setType("expense")}
          className={`rounded-full py-2 font-semibold border ${
            type === "expense" ? "bg-[var(--accent)] shadow" : "bg-white border-black/10"
          }`}
        >
          Expense
        </button>
        <button
          type="button"
          onClick={() => setType("income")}
          className={`rounded-full py-2 font-semibold border ${
            type === "income" ? "bg-[var(--accent)] shadow" : "bg-white border-black/10"
          }`}
        >
          Income
        </button>
      </div>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full rounded-full bg-[#F4F6FB] px-4 py-3 outline-none mb-3"
        placeholder={type === "income" ? "Title (e.g., Salary)" : "Title (e.g., Doner)"}
      />

      <input
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        inputMode="decimal"
        className="w-full rounded-full bg-[#F4F6FB] px-4 py-3 outline-none mb-3"
        placeholder="Amount"
      />

      {type === "expense" && (
        <div className="space-y-2 text-sm text-black/70 mb-4">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="bucket"
              checked={bucket === "this_month"}
              onChange={() => setBucket("this_month")}
            />
            Payments this month
          </label>

          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="bucket"
              checked={bucket === "planned"}
              onChange={() => setBucket("planned")}
            />
            Monthly planned payments
          </label>

          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="bucket"
              checked={bucket === "savings"}
              onChange={() => setBucket("savings")}
            />
            Piggy bank (savings)
          </label>
        </div>
      )}

      {err ? <div className="text-sm text-red-600 mb-3">{err}</div> : null}

      <button
        type="button"
        onClick={save}
        disabled={loading}
        className="w-full rounded-full bg-[var(--accent)] py-3 font-semibold shadow-[0_10px_18px_rgba(0,0,0,0.18)] disabled:opacity-60"
      >
        {loading ? "Saving..." : "Save"}
      </button>
    </div>
  );
}
