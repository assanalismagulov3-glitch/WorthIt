"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";

export default function ShoppingPage() {
  const [items, setItems] = useState([]);
  const [done, setDone] = useState({});

  const addItem = () => {
    const text = prompt("Add item (example: Bread — 2 loaves)");
    if (!text) return;
    setItems((p) => [...p, text]);
  };

  const toggle = (i) => setDone((p) => ({ ...p, [i]: !p[i] }));

  const clear = () => {
    setItems([]);
    setDone({});
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between px-1">
        <h1 className="text-lg font-semibold">Add items to your shopping list</h1>
        <button onClick={addItem} className="w-10 h-10 rounded-full bg-white border border-black/10 shadow flex items-center justify-center">
          <Plus size={18} />
        </button>
      </div>

      <div className="bg-white/70 rounded-[26px] border border-black/5 shadow-sm min-h-[520px] p-4">
        {items.length === 0 ? (
          <div className="text-sm text-black/45">No items yet. Tap “+”.</div>
        ) : (
          <ul className="space-y-4">
            {items.map((it, i) => (
              <li key={i} className="flex items-center gap-3">
                <button
                  onClick={() => toggle(i)}
                  className="w-5 h-5 rounded-full border border-black/25 bg-white flex items-center justify-center"
                >
                  {done[i] ? <div className="w-2.5 h-2.5 rounded-full bg-black/70" /> : null}
                </button>
                <span className={done[i] ? "line-through text-black/40" : ""}>{it}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex justify-end pr-1">
        <button onClick={clear} className="w-10 h-10 rounded-full bg-white border border-black/10 shadow flex items-center justify-center">
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  );
}
