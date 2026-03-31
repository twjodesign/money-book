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
    setName(""); setCompanyName(""); setShowForm(false); setSaving(false);
    refreshAccounts();
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <div className="space-y-4 animate-in">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">設定</h2>
        <button className="btn-primary text-sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? "取消" : "+ 新帳戶"}
        </button>
      </div>

      {/* User info */}
      <div className="card">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[var(--accent)] flex items-center justify-center text-xl text-white font-bold">
            {userName.slice(0, 1)}
          </div>
          <div>
            <p className="font-semibold text-lg">{userName}</p>
            <p className="text-sm text-[var(--text-muted)]">{accounts.length} 個帳戶</p>
          </div>
        </div>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="card animate-in">
          <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-3">建立新帳戶</h3>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="flex gap-2 bg-[var(--bg)] p-1 rounded-2xl">
              <button type="button"
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  type === "personal" ? "bg-[var(--accent)] text-white shadow-sm" : "text-[var(--text-muted)]"
                }`}
                onClick={() => setType("personal")}>個人</button>
              <button type="button"
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  type === "business" ? "bg-[var(--purple)] text-white shadow-sm" : "text-[var(--text-muted)]"
                }`}
                onClick={() => setType("business")}>公司</button>
            </div>
            <div>
              <label className="block section-label mb-1.5">帳戶名稱</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                placeholder={type === "personal" ? "我的生活帳" : "公司帳戶"} required />
            </div>
            {type === "business" && (
              <div>
                <label className="block section-label mb-1.5">公司名稱</label>
                <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="666 Studio" />
              </div>
            )}
            <button type="submit" className="btn-primary w-full" disabled={saving}>
              {saving ? "建立中..." : "建立帳戶"}
            </button>
          </form>
        </div>
      )}

      {/* Account list */}
      <div>
        <p className="section-label px-1 mb-2">帳戶列表</p>
        <div className="space-y-2">
          {accounts.map((account) => {
            const active = currentAccount?.id === account.id;
            return (
              <div key={account.id}
                className={`card !p-4 flex items-center justify-between cursor-pointer transition-all ${
                  active ? "!border-[var(--accent)]" : "hover:!border-[var(--accent-medium)]"
                }`}
                onClick={() => setCurrentAccount(account)}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${
                    account.type === "personal" ? "bg-[var(--accent-light)]" : "bg-[var(--purple-light)]"
                  }`}>
                    {account.type === "personal" ? "🧑" : "🏢"}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{account.name}</p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {account.type === "personal" ? "個人帳戶" : "公司帳戶"}
                      {account.company_name && ` · ${account.company_name}`}
                    </p>
                  </div>
                </div>
                {active && <span className="tag tag-orange">使用中</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Logout */}
      <div className="pt-2">
        <button onClick={handleLogout}
          className="w-full py-3 rounded-2xl border border-[var(--border)] text-[var(--text-muted)] text-sm font-medium hover:bg-[var(--red-light)] hover:text-[var(--red)] hover:border-[var(--red)] transition-all">
          登出
        </button>
      </div>
    </div>
  );
}
