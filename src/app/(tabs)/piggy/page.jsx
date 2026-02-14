"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { loadUser } from "@/lib/session";

function formatMoney(n, currency) {
  const sym = currency === "KZT" ? "₸" : currency === "USD" ? "$" : "€";
  const val = Number(n || 0);
  return `${Math.round(val).toLocaleString()} ${sym}`;
}

function startOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export default function PiggyPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);

  const [tx, setTx] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // MVP: цель пока локально (быстро и без миграций). Потом вынесем в БД.
  const [goalTitle, setGoalTitle] = useState("My goal");
  const [goalTarget, setGoalTarget] = useState("100000");
  const [addAmount, setAddAmount] = useState("");

  useEffect(() => {
    const u = loadUser();
    setUser(u);
    if (!u?.id) {
      router.push("/signin");
      return;
    }

    // load local goal
    try {
      const saved = JSON.parse(localStorage.getItem("piggy_goal") || "{}");
      if (saved?.title) setGoalTitle(saved.title);
      if (saved?.target) setGoalTarget(String(saved.target));
    } catch {}

    const load = async () => {
      setErr("");
      setLoading(true);
      try {
        const res = await fetch(`/api/tx?userId=${encodeURIComponent(u.id)}`);
        const raw = await res.text();
        let data = {};
        try { data = JSON.parse(raw); } catch {}

        if (!res.ok) {
          setErr(data?.error || raw.slice(0, 200) || `Error (${res.status})`);
          setTx([]);
          return;
        }
        setTx(Array.isArray(data.tx) ? data.tx : []);
      } catch (e) {
        setErr(e?.message || "Network error");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [router]);

  const stats = useMemo(() => {
    const currency = user?.currency || "KZT";
    const monthStart = startOfMonth();

    let savedAll = 0;
    let savedMonth = 0;

    const list = [];

    for (const t of tx) {
      const amt = Number(t.amount || 0);
      const type = (t.type || "").toLowerCase();
      const cat = (t.category || "").toLowerCase();
      const d = new Date(t.createdAt);
      const inMonth = Number.isFinite(d.getTime()) && d >= monthStart;

      if (type === "expense" && cat === "savings") {
        savedAll += amt;
        if (inMonth) savedMonth += amt;
        list.push(t);
      }
    }

    list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const target = Math.max(0, Number(goalTarget || 0));
    const pct = target > 0 ? Math.min(100, Math.round((savedAll / target) * 100)) : 0;

    return {
      currency,
      savedAll,
      savedMonth,
      target,
      pct,
      last: list.slice(0, 6),
    };
  }, [tx, user, goalTarget]);

  const saveGoal = () => {
    const cleanTarget = Math.max(0, Number(goalTarget || 0));
    const obj = { title: goalTitle || "My goal", target: cleanTarget };
    localStorage.setItem("piggy_goal", JSON.stringify(obj));
  };

  const quickAdd = (v) => setAddAmount(String(v));

  const addToPiggy = async () => {
    setErr("");
    const amt = Number(addAmount || 0);
    if (!Number.isFinite(amt) || amt <= 0) {
      setErr("Enter amount to save");
      return;
    }
    if (!user?.id) {
      setErr("No session");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/tx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          type: "expense",
          category: "savings",
          title: `Piggy bank: ${goalTitle || "My goal"}`,
          amount: amt,
        }),
      });

      const raw = await res.text();
      let data = {};
      try { data = JSON.parse(raw); } catch {}

      if (!res.ok) {
        setErr(data?.error || raw.slice(0, 200) || `Error (${res.status})`);
        return;
      }

      setAddAmount("");

      // reload tx
      const r2 = await fetch(`/api/tx?userId=${encodeURIComponent(user.id)}`);
      const t2 = await r2.json();
      setTx(Array.isArray(t2.tx) ? t2.tx : []);
    } catch (e) {
      setErr(e?.message || "Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* GOAL */}
      <div className="rounded-[28px] bg-white/80 border border-black/10 shadow-sm p-5">
        <div className="text-sm font-extrabold mb-3">Piggy bank</div>

        <input
          value={goalTitle}
          onChange={(e) => setGoalTitle(e.target.value)}
          onBlur={saveGoal}
          className="w-full rounded-full bg-[#F4F6FB] px-4 py-3 outline-none mb-3"
          placeholder="Goal title (e.g., New iPhone)"
        />

        <input
          value={goalTarget}
          onChange={(e) => setGoalTarget(e.target.value)}
          onBlur={saveGoal}
          className="w-full rounded-full bg-[#F4F6FB] px-4 py-3 outline-none"
          placeholder="Target amount (e.g., 500000)"
          inputMode="numeric"
        />

        <div className="mt-4">
          <div className="flex items-center justify-between text-sm">
            <div className="text-black/70">Progress</div>
            <div className="text-black/45">{stats.pct}%</div>
          </div>
          <div className="mt-2 h-3 rounded-full bg-black/10 overflow-hidden">
            <div className="h-full bg-[var(--accent)]" style={{ width: `${stats.pct}%` }} />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl bg-[#F4F6FB] p-3">
              <div className="text-black/50 text-xs">Saved (total)</div>
              <div className="font-extrabold">{formatMoney(stats.savedAll, stats.currency)}</div>
            </div>
            <div className="rounded-2xl bg-[#F4F6FB] p-3">
              <div className="text-black/50 text-xs">Saved (this month)</div>
              <div className="font-extrabold">{formatMoney(stats.savedMonth, stats.currency)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ADD SAVING */}
      <div className="rounded-[28px] bg-white/80 border border-black/10 shadow-sm p-5">
        <div className="text-sm font-extrabold mb-2">Add to piggy</div>

        <div className="grid grid-cols-4 gap-2 mb-3">
          <button onClick={() => quickAdd(500)} className="rounded-full bg-[#F4F6FB] py-2 text-xs font-extrabold border border-black/10">+500</button>
          <button onClick={() => quickAdd(1000)} className="rounded-full bg-[#F4F6FB] py-2 text-xs font-extrabold border border-black/10">+1k</button>
          <button onClick={() => quickAdd(5000)} className="rounded-full bg-[#F4F6FB] py-2 text-xs font-extrabold border border-black/10">+5k</button>
          <button onClick={() => quickAdd(10000)} className="rounded-full bg-[#F4F6FB] py-2 text-xs font-extrabold border border-black/10">+10k</button>
        </div>

        <input
          value={addAmount}
          onChange={(e) => setAddAmount(e.target.value)}
          className="w-full rounded-full bg-[#F4F6FB] px-4 py-3 outline-none mb-3"
          placeholder="Amount to save"
          inputMode="numeric"
        />

        {err ? <div className="text-sm text-red-600 mb-3">{err}</div> : null}

        <button
          type="button"
          onClick={addToPiggy}
          disabled={loading}
          className="w-full rounded-full bg-[var(--accent)] py-3 font-semibold shadow-[0_10px_18px_rgba(0,0,0,0.18)] disabled:opacity-60"
        >
          {loading ? "Saving..." : "Save money"}
        </button>

        <div className="mt-3 text-xs text-black/50">
          ✅ This will subtract from your available money because it’s saved as an expense category <b>savings</b>.
        </div>
      </div>

      {/* HISTORY */}
      <div className="rounded-[28px] bg-white/80 border border-black/10 shadow-sm p-5">
        <div className="text-sm font-extrabold mb-2">History</div>

        {loading ? (
          <div className="text-sm text-black/50">Loading...</div>
        ) : stats.last.length === 0 ? (
          <div className="text-sm text-black/50">No savings yet</div>
        ) : (
          <div className="space-y-2">
            {stats.last.map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-2xl bg-[#F4F6FB] px-4 py-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">{t.title}</div>
                  <div className="text-xs text-black/45">{new Date(t.createdAt).toLocaleDateString()}</div>
                </div>
                <div className="text-sm font-extrabold shrink-0">-{formatMoney(t.amount, stats.currency)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
