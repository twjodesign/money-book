"use client";

import { useState, useEffect } from "react";
import { useApp } from "@/components/AppShell";
import type { Category, Transaction } from "@/lib/types";

function fmt(n: number): string {
  return "$" + Math.abs(n).toLocaleString("zh-TW", { maximumFractionDigits: 0 });
}

export default function TransactionsPage() {
  const { currentAccount } = useApp();
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [direction, setDirection] = useState<"expense" | "income">("expense");
  const [categoryId, setCategoryId] = useState("");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (!currentAccount) return;
    fetch(`/api/categories?type=${currentAccount.type}`)
      .then((r) => r.json())
      .then((cats: Category[]) => {
        setCategories(cats);
        const filtered = cats.filter((c) => c.direction === direction);
        if (filtered.length > 0) setCategoryId(filtered[0].id);
      });
  }, [currentAccount]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!currentAccount) return;
    fetch(`/api/transactions?accountId=${currentAccount.id}&month=${month}`)
      .then((r) => r.json())
      .then(setTransactions);
  }, [currentAccount, month]);

  useEffect(() => {
    const filtered = categories.filter((c) => c.direction === direction);
    if (filtered.length > 0) setCategoryId(filtered[0].id);
  }, [direction, categories]);

  const filteredCats = categories.filter((c) => c.direction === direction);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!title || !amount || !categoryId || !currentAccount) return;
    setSaving(true);
    await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ account_id: currentAccount.id, category_id: categoryId, direction, title, amount: parseFloat(amount), note, date }),
    });
    setTitle(""); setAmount(""); setNote("");
    setSaving(false); setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
    const res = await fetch(`/api/transactions?accountId=${currentAccount.id}&month=${month}`);
    setTransactions(await res.json());
  }

  async function handleDelete(id: string) {
    if (!confirm("確定刪除這筆紀錄嗎？")) return;
    await fetch(`/api/transactions?id=${id}`, { method: "DELETE" });
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  }

  const monthIncome = transactions.filter((t) => t.direction === "income").reduce((s, t) => s + t.amount, 0);
  const monthExpense = transactions.filter((t) => t.direction === "expense").reduce((s, t) => s + t.amount, 0);

  return (
    <div className="space-y-4 animate-in">
      <h2 className="text-2xl font-bold">記帳</h2>

      {showSuccess && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[var(--green)] text-white px-6 py-3 rounded-2xl font-semibold text-sm shadow-lg animate-in">
          已記錄
        </div>
      )}

      {/* Add form */}
      <div className="card">
        <form onSubmit={handleSave} className="space-y-4">
          {/* Direction toggle */}
          <div className="flex gap-2 bg-[var(--bg)] p-1 rounded-2xl">
            <button type="button"
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                direction === "expense" ? "bg-[var(--red)] text-white shadow-sm" : "text-[var(--text-muted)]"
              }`}
              onClick={() => setDirection("expense")}
            >
              支出
            </button>
            <button type="button"
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                direction === "income" ? "bg-[var(--green)] text-white shadow-sm" : "text-[var(--text-muted)]"
              }`}
              onClick={() => setDirection("income")}
            >
              收入
            </button>
          </div>

          {/* Category chips */}
          <div>
            <label className="block section-label mb-2">分類</label>
            <div className="flex flex-wrap gap-2">
              {filteredCats.map((c) => (
                <button key={c.id} type="button" onClick={() => setCategoryId(c.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                    categoryId === c.id
                      ? direction === "income"
                        ? "bg-[var(--green-light)] border-[var(--green)] text-[var(--green)]"
                        : "bg-[var(--red-light)] border-[var(--red)] text-[var(--red)]"
                      : "bg-[var(--bg)] border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--accent)]"
                  }`}
                >
                  {c.icon} {c.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block section-label mb-1.5">名稱</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="台新銀行月薪、Netflix 家庭方案..." required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block section-label mb-1.5">金額</label>
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
                placeholder="0" required min="1" className="!text-lg !font-bold" />
            </div>
            <div>
              <label className="block section-label mb-1.5">日期</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
          </div>

          <div>
            <label className="block section-label mb-1.5">備註</label>
            <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="選填" />
          </div>

          <button type="submit" className="btn-primary w-full" disabled={saving}>
            {saving ? "記錄中..." : direction === "income" ? "記錄收入" : "記錄支出"}
          </button>
        </form>
      </div>

      {/* Month filter + summary */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold">交易紀錄</h3>
          <span className="tag tag-green">+{fmt(monthIncome)}</span>
          <span className="tag tag-red">-{fmt(monthExpense)}</span>
        </div>
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)}
          className="!w-auto !p-1.5 !px-3 text-xs !rounded-xl" />
      </div>

      {transactions.length === 0 ? (
        <div className="card text-center py-8">
          <div className="text-4xl mb-2">📭</div>
          <p className="text-sm text-[var(--text-muted)]">本月還沒有紀錄</p>
        </div>
      ) : (
        <div className="space-y-2">
          {transactions.map((tx) => (
            <div key={tx.id} className="card !p-3 !rounded-2xl flex items-center justify-between group">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${
                  tx.direction === "income" ? "bg-[var(--green-light)]" : "bg-[var(--red-light)]"
                }`}>
                  {tx.category_icon}
                </div>
                <div>
                  <p className="text-sm font-semibold">{tx.title || tx.category_name}</p>
                  <p className="text-[10px] text-[var(--text-muted)]">
                    {tx.title ? tx.category_name + " · " : ""}{tx.date.slice(5).replace("-", "/")}{tx.note && ` · ${tx.note}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`tag ${tx.direction === "income" ? "tag-green" : "tag-red"}`}>
                  {tx.direction === "income" ? "+" : "-"}{fmt(tx.amount)}
                </span>
                <button onClick={() => handleDelete(tx.id)}
                  className="opacity-0 group-hover:opacity-100 text-[var(--text-muted)] hover:text-[var(--red)] text-xs transition-opacity p-1">
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
