"use client";

import { useState, useEffect } from "react";
import { useApp } from "@/components/AppShell";

interface BankAccount {
  id: string; account_id: string; name: string; bank_name: string;
  balance: number; icon: string; note: string; created_at: string;
}

function fmt(n: number): string {
  return "$" + Math.abs(n).toLocaleString("zh-TW", { maximumFractionDigits: 0 });
}

const ICON_OPTIONS = ["🏦", "💳", "🏧", "💰"];

export default function BankAccountsPage() {
  const { currentAccount } = useApp();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [bankName, setBankName] = useState("");
  const [balance, setBalance] = useState("");
  const [icon, setIcon] = useState("🏦");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState("");

  useEffect(() => {
    if (!currentAccount) return;
    fetch(`/api/bank-accounts?accountId=${currentAccount.id}`).then((r) => r.json()).then(setAccounts);
  }, [currentAccount]);

  const totalCash = accounts.reduce((s, a) => s + a.balance, 0);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !bankName || !balance || !currentAccount) return;
    setSaving(true);
    await fetch("/api/bank-accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ account_id: currentAccount.id, name, bank_name: bankName, balance: parseFloat(balance), icon, note }),
    });
    setName(""); setBankName(""); setBalance(""); setIcon("🏦"); setNote("");
    setSaving(false); setShowForm(false);
    setShowSuccess("帳戶新增成功");
    setTimeout(() => setShowSuccess(""), 2000);
    const res = await fetch(`/api/bank-accounts?accountId=${currentAccount.id}`);
    setAccounts(await res.json());
  }

  async function handleDelete(id: string) {
    if (!confirm("確定刪除這個銀行帳戶嗎？")) return;
    await fetch(`/api/bank-accounts?id=${id}`, { method: "DELETE" });
    setAccounts((prev) => prev.filter((a) => a.id !== id));
  }

  return (
    <div className="space-y-4 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">銀行帳戶</h2>
          <p className="text-sm text-[var(--text-muted)] mt-1">管理現金與存款</p>
        </div>
        <button className="btn-primary text-sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? "取消" : "+ 新增"}
        </button>
      </div>

      {showSuccess && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[var(--green)] text-white px-6 py-3 rounded-2xl font-semibold text-sm shadow-lg animate-in">
          {showSuccess}
        </div>
      )}

      {/* Total */}
      <div className="card text-center">
        <p className="section-label mb-1">現金總額</p>
        <p className="text-3xl font-bold text-[var(--green)]">{fmt(totalCash)}</p>
        <p className="text-xs text-[var(--text-muted)] mt-1">{accounts.length} 個帳戶</p>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="card animate-in">
          <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-3">新增銀行帳戶</h3>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block section-label mb-2">圖示</label>
              <div className="flex gap-2">
                {ICON_OPTIONS.map((opt) => (
                  <button key={opt} type="button" onClick={() => setIcon(opt)}
                    className={`w-10 h-10 rounded-xl text-lg flex items-center justify-center transition-all border ${
                      icon === opt ? "bg-[var(--green-light)] border-[var(--green)]" : "bg-[var(--bg)] border-[var(--border)]"
                    }`}
                  >{opt}</button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block section-label mb-1.5">帳戶名稱</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="薪轉戶" required />
              </div>
              <div>
                <label className="block section-label mb-1.5">銀行名稱</label>
                <input type="text" value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="國泰世華" required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block section-label mb-1.5">初始餘額</label>
                <input type="number" value={balance} onChange={(e) => setBalance(e.target.value)} placeholder="0" required />
              </div>
              <div>
                <label className="block section-label mb-1.5">備註</label>
                <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="選填" />
              </div>
            </div>
            <button type="submit" className="btn-primary w-full" disabled={saving}>
              {saving ? "新增中..." : "新增帳戶"}
            </button>
          </form>
        </div>
      )}

      {/* Account list */}
      {accounts.length > 0 && (
        <div>
          <p className="section-label px-1 mb-2">帳戶列表</p>
          <div className="space-y-2">
            {accounts.map((acct) => (
              <div key={acct.id} className="card !p-3 !rounded-2xl flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--green-light)] flex items-center justify-center text-lg">{acct.icon}</div>
                  <div>
                    <p className="text-sm font-semibold">{acct.name}</p>
                    <p className="text-[10px] text-[var(--text-muted)]">{acct.bank_name}{acct.note && ` · ${acct.note}`}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="tag tag-green font-bold">{fmt(acct.balance)}</span>
                  <button onClick={() => handleDelete(acct.id)} className="opacity-0 group-hover:opacity-100 text-xs p-1 hover:text-[var(--red)] transition-opacity">🗑️</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {accounts.length === 0 && !showForm && (
        <div className="card text-center py-8">
          <div className="text-4xl mb-2">🏦</div>
          <p className="text-sm text-[var(--text-muted)]">還沒有銀行帳戶</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">點右上角「+ 新增」加入帳戶</p>
        </div>
      )}
    </div>
  );
}
