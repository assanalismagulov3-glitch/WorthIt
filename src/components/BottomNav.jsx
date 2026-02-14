"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, List, Calculator, Trophy, Sparkles } from "lucide-react";

const tabs = [
  { href: "/home", Icon: Home },
  { href: "/shopping", Icon: List },
  { href: "/calculators", Icon: Calculator },
  { href: "/piggy", Icon: Trophy },
  { href: "/ai", Icon: Sparkles, label: "AI" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-0 left-0 right-0 flex justify-center">
      <div className="w-full max-w-[430px] px-4 pb-4">
        <nav className="h-[74px] rounded-[24px] bg-white/90 backdrop-blur border border-black/5 shadow-[0_10px_26px_rgba(0,0,0,0.12)] flex items-center justify-around">
          {tabs.map(({ href, Icon, label }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className="w-14 h-14 flex items-center justify-center rounded-2xl"
              >
                <div className="flex flex-col items-center justify-center gap-1">
                  <Icon
                    size={22}
                    className={active ? "text-[var(--accent)]" : "text-black/45"}
                  />
                  {label ? (
                    <div className={active ? "text-xs font-semibold text-[var(--accent)]" : "text-xs text-black/40"}>
                      {label}
                    </div>
                  ) : null}
                </div>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
