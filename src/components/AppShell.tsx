"use client";

import { useState, useEffect, createContext, useContext } from "react";
import { useRouter, usePathname } from "next/navigation";
import type { Account } from "@/lib/types";

interface AppCtx {
  accounts: Account[];
  currentAccount: Account | null;
  setCurrentAccount: (a: Account) => void;
  userName: string;
  refreshAccounts: () => void;
}

const AppContext = createContext<AppCtx | null>(null);
export const useApp = () => useContext(AppContext)!;

const NAV = [
  { href: "/dashboard",     label: "總覽", icon: "🏠", activeIcon: "🏡" },
  { href: "/transactions",  label: "記帳", icon: "✏️", activeIcon: "📝" },
  { href: "/recurring",     label: "固定", icon: "🔄", activeIcon: "🔁" },
  { href: "/bank-accounts", label: "銀行", icon: "🏦", activeIcon: "💳" },
  { href: "/properties",    label: "房產", icon: "🏠", activeIcon: "🏡" },
  { href: "/investments",   label: "投資", icon: "📈", activeIcon: "💹" },
  { href: "/dreams",        label: "夢想", icon: "✨", activeIcon: "🌟" },
  { href: "/compare",       label: "比較", icon: "📊", activeIcon: "📉" },
  { href: "/accounts",      label: "設定", icon: "⚙️", activeIcon: "🔧" },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [currentAccount, setCurrentAccount] = useState<Account | null>(null);
  const [userName, setUserName] = useState("");
  const router = useRouter();
  const pathname = usePathname();

  async function fetchUser() {
    const res = await fetch("/api/auth/me");
    if (!res.ok) { router.push("/login"); return; }
    const data = await res.json();
    setUserName(data.user.name);
    setAccounts(data.accounts);
    if (data.accounts.length > 0 && !currentAccount) setCurrentAccount(data.accounts[0]);
  }

  useEffect(() => { fetchUser(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  if (!currentAccount) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-3xl animate-bounce">🐷</div>
      </div>
    );
  }

  return (
    <AppContext.Provider value={{ accounts, currentAccount, setCurrentAccount, userName, refreshAccounts: fetchUser }}>
      <div className="min-h-screen flex flex-col md:flex-row pb-20 md:pb-0">

        {/* Desktop sidebar */}
        <aside className="hidden md:flex flex-col w-56 border-r border-[var(--border)] bg-[var(--bg-card)] min-h-screen flex-shrink-0">
          {/* Logo */}
          <div className="px-5 pt-6 pb-4 border-b border-[var(--border)]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[var(--accent-light)] flex items-center justify-center text-lg">🐷</div>
              <div>
                <p className="text-base font-bold text-[var(--accent)] leading-tight">MoneyBook</p>
                <p className="text-[10px] text-[var(--text-muted)]">個人財務管理</p>
              </div>
            </div>
          </div>

          {/* User + account selector */}
          <div className="px-4 py-4 border-b border-[var(--border)]">
            <p className="text-[10px] text-[var(--text-muted)] mb-0.5">歡迎回來</p>
            <p className="text-sm font-semibold text-[var(--text)] mb-3">{userName}</p>
            <select
              className="text-xs !rounded-xl !bg-[var(--bg)] !border-[var(--border)] !py-2"
              value={currentAccount.id}
              onChange={(e) => { const a = accounts.find((a) => a.id === e.target.value); if (a) setCurrentAccount(a); }}
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.type === "personal" ? "個人" : "公司"} · {a.name}</option>
              ))}
            </select>
          </div>

          {/* Nav */}
          <nav className="px-3 py-3 flex-1">
            {NAV.map((item) => {
              const active = pathname === item.href;
              return (
                <a key={item.href} href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm mb-0.5 transition-all ${
                    active
                      ? "bg-[var(--accent-light)] text-[var(--accent)] font-semibold"
                      : "text-[var(--text-muted)] hover:bg-[var(--bg)] hover:text-[var(--text)] font-medium"
                  }`}
                >
                  <span className="text-base w-5 text-center">{active ? item.activeIcon : item.icon}</span>
                  <span>{item.label}</span>
                  {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />}
                </a>
              );
            })}
          </nav>

          {/* Logout */}
          <div className="p-4 border-t border-[var(--border)]">
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-xs text-[var(--text-muted)] hover:text-[var(--red)] transition-colors w-full px-3 py-2 rounded-xl hover:bg-[var(--red-light)]"
            >
              登出
            </button>
          </div>
        </aside>

        {/* Mobile top bar */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 bg-[var(--bg-card)] border-b border-[var(--border)] sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <span className="text-lg">🐷</span>
            <span className="font-bold text-sm text-[var(--accent)]">MoneyBook</span>
          </div>
          <select
            className="!w-auto !py-1 !px-2.5 text-xs !rounded-xl"
            value={currentAccount.id}
            onChange={(e) => { const a = accounts.find((a) => a.id === e.target.value); if (a) setCurrentAccount(a); }}
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.type === "personal" ? "個人" : "公司"} · {a.name}</option>
            ))}
          </select>
        </div>

        {/* Main */}
        <main className="flex-1 p-4 md:p-6 max-w-4xl mx-auto w-full">{children}</main>

        {/* Mobile bottom tab bar */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[var(--bg-card)] border-t border-[var(--border)] flex overflow-x-auto z-30 scrollbar-hide">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <a key={item.href} href={item.href}
                className={`flex-1 flex flex-col items-center py-2 pt-3 min-w-[60px] transition-all ${
                  active ? "text-[var(--accent)]" : "text-[var(--text-muted)]"
                }`}
              >
                <span className={`text-xl ${active ? "scale-110" : ""} transition-transform`}>
                  {active ? item.activeIcon : item.icon}
                </span>
                <span className={`text-[9px] mt-0.5 font-semibold tracking-wide`}>{item.label}</span>
              </a>
            );
          })}
        </nav>
      </div>
    </AppContext.Provider>
  );
}
