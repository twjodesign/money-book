"use client";

import { useState } from "react";
import { useApp } from "@/components/AppShell";

export default function AccountsPage() {
  const { accounts, currentAccount, setCurrentAccount, refreshAccounts, userName } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<"personal" | "business">("personal");
  const [companyName, setCompanyName] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    await fetch("/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, type, company_name: type === "business" ? companyName : undefined }),
    });

    setName("");
    setCompanyName("");
    setShowForm(false);
    setSaving(false);
    refreshAccounts();
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <div className="space-y-5 animate-in">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">😊 帳戶管理</h2>
        <button className="btn-primary text-sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? "取消" : "➕ 新帳戶"}
        </button>
      </div>

      {/* User info card */}
      <div className="card !bg-[var(--accent-light)] !border-[var(--accent)] !border-opacity-30">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[var(--accent)] flex items-center justify-center text-2xl text-white">
            {userName.slice(0, 1)}
          </div>
          <div>
            <p className="font-bold text-lg">{userName}</p>
            <p className="text-sm text-[var(--text-muted)]">{accounts.length} 個帳戶 · 管理你的財務 🌟</p>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="card animate-in">
          <h3 className="text-sm font-bold mb-3 flex items-center gap-2">🆕 建立新帳戶</h3>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="flex gap-2 bg-[var(--bg)] p-1 rounded-2xl">
              <button
                type="button"
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  type === "personal"
                    ? "bg-[var(--accent)] text-white shadow-md"
                    : "text-[var(--text-muted)]"
                }`}
                onClick={() => setType("personal")}
              >
                🧑 個人
              </button>
              <button
                type="button"
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  type === "business"
                    ? "bg-[var(--purple)] text-white shadow-md"
                    : "text-[var(--text-muted)]"
                }`}
                onClick={() => setType("business")}
              >
                🏢 公司
              </button>
            </div>

            <div>
              <label className="block text-xs text-[var(--text-muted)] font-semibold mb-1">帳戶名稱</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={type === "personal" ? "我的生活帳" : "公司帳戶"}
                required
              />
            </div>

            {type === "business" && (
              <div>
                <label className="block text-xs text-[var(--text-muted)] font-semibold mb-1">公司名稱</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="666 Studio"
                />
              </div>
            )}

            <button type="submit" className="btn-primary w-full" disabled={saving}>
              {saving ? "建立中... ✨" : "建立帳戶 🎉"}
            </button>
          </form>
        </div>
      )}

      {/* Account list */}
      <div className="space-y-3">
        {accounts.map((account) => {
          const active = currentAccount?.id === account.id;
          return (
            <div
              key={account.id}
              className={`card !p-4 !rounded-2xl flex items-center justify-between cursor-pointer transition-all ${
                active ? "!border-[var(--accent)] !shadow-[var(--shadow-hover)] scale-[1.01]" : "hover:!border-[var(--accent)] hover:!border-opacity-50"
              }`}
              onClick={() => setCurrentAccount(account)}
            >
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl ${
                  account.type === "personal" ? "bg-[var(--accent-light)]" : "bg-[var(--purple-light)]"
                }`}>
                  {account.type === "personal" ? "🧑" : "🏢"}
                </div>
                <div>
                  <p className="font-bold">{account.name}</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {account.type === "personal" ? "個人帳戶" : "公司帳戶"}
                    {account.company_name && ` · ${account.company_name}`}
                  </p>
                </div>
              </div>
              {active && (
                <span className="tag tag-orange">使用中 ✨</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Logout */}
      <div className="pt-4">
        <button
          onClick={handleLogout}
          className="w-full py-3 rounded-2xl border-2 border-[var(--border)] text-[var(--text-muted)] font-semibold hover:bg-[var(--red-light)] hover:text-[var(--red)] hover:border-[var(--red)] transition-all"
        >
          👋 登出帳號
        </button>
      </div>
    </div>
  );
}
