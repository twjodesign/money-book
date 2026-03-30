"use client";

import { useState, useEffect } from "react";
import { useApp } from "@/components/AppShell";
import type { Category, Transaction } from "@/lib/types";

function formatMoney(n: number): string {
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
  const grouped = new Map<string, Category[]>();
  filteredCats.forEach((c) => {
    if (!grouped.has(c.group_name)) grouped.set(c.group_name, []);
    grouped.get(c.group_name)!.push(c);
  });

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!title || !amount || !categoryId || !currentAccount) return;
    setSaving(true);

    await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        account_id: currentAccount.id,
        category_id: categoryId,
        direction,
        title,
        amount: parseFloat(amount),
        note,
        date,
      }),
    });

    setTitle("");
    setAmount("");
    setNote("");
    setSaving(false);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);

    const res = await fetch(`/api/transactions?accountId=${currentAccount.id}&month=${month}`);
    setTransactions(await res.json());
  }

  async function handleDelete(id: string) {
    if (!confirm("確定刪除這筆紀錄嗎？ 🗑️")) return;
    await fetch(`/api/transactions?id=${id}`, { method: "DELETE" });
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  }

  // Monthly totals
  const monthIncome = transactions.filter((t) => t.direction === "income").reduce((s, t) => s + t.amount, 0);
  const monthExpense = transactions.filter((t) => t.direction === "expense").reduce((s, t) => s + t.amount, 0);

  return (
    <div className="space-y-5 animate-in">
      <h2 className="text-2xl font-bold flex items-center gap-2">✏️ 記帳</h2>

      {/* Success toast */}
      {showSuccess && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[var(--green)] text-white px-6 py-3 rounded-2xl font-bold text-sm shadow-lg animate-in">
          ✅ 記好了！
        </div>
      )}

      {/* Add form */}
      <div className="card">
        <form onSubmit={handleSave} className="space-y-4">
          {/* Direction toggle */}
          <div className="flex gap-2 bg-[var(--bg)] p-1 rounded-2xl">
            <button
              type="button"
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                direction === "expense"
                  ? "bg-[var(--red)] text-white shadow-md"
                  : "text-[var(--text-muted)] hover:text-[var(--text)]"
              }`}
              onClick={() => setDirection("expense")}
            >
              🛒 支出
            </button>
            <button
              type="button"
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                direction === "income"
                  ? "bg-[var(--green)] text-white shadow-md"
                  : "text-[var(--text-muted)] hover:text-[var(--text)]"
              }`}
              onClick={() => setDirection("income")}
            >
              💰 收入
            </button>
          </div>

          {/* Category chips */}
          <div>
            <label className="block text-xs text-[var(--text-muted)] font-semibold mb-2">選個分類</label>
            <div className="flex flex-wrap gap-2">
              {filteredCats.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategoryId(c.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border-2 ${
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
            <label className="block text-xs text-[var(--text-muted)] font-semibold mb-1">✏️ 名稱</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="台新銀行月薪、Netflix 家庭方案..."
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[var(--text-muted)] font-semibold mb-1">💵 金額</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="多少錢？"
                required
                min="1"
                className="!text-lg !font-bold"
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--text-muted)] font-semibold mb-1">📅 日期</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
          </div>

          <div>
            <label className="block text-xs text-[var(--text-muted)] font-semibold mb-1">📋 備註</label>
            <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="記一下花在哪～" />
          </div>

          <button type="submit" className="btn-primary w-full !text-base" disabled={saving}>
            {saving ? "存入中... 🐷" : direction === "income" ? "💰 記收入！" : "🛒 記支出！"}
          </button>
        </form>
      </div>

      {/* Month filter + summary */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-bold">📋 交易紀錄</h3>
          <div className="flex gap-2">
            <span className="tag tag-green">+{formatMoney(monthIncome)}</span>
            <span className="tag tag-red">-{formatMoney(monthExpense)}</span>
          </div>
        </div>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="!w-auto !p-1.5 !px-3 text-xs !rounded-xl"
        />
      </div>

      {transactions.length === 0 ? (
        <div className="card text-center py-8">
          <div className="text-4xl mb-2">📭</div>
          <p className="text-sm text-[var(--text-muted)]">本月還沒有紀錄呢～</p>
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
                  <p className="text-sm font-bold">{tx.title || tx.category_name}</p>
                  <p className="text-[10px] text-[var(--text-muted)]">
                    {tx.title ? tx.category_name + " · " : ""}{tx.date.slice(5).replace("-", "/")}{tx.note && ` · ${tx.note}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`tag ${tx.direction === "income" ? "tag-green" : "tag-red"}`}>
                  {tx.direction === "income" ? "+" : "-"}{formatMoney(tx.amount)}
                </span>
                <button
                  onClick={() => handleDelete(tx.id)}
                  className="opacity-0 group-hover:opacity-100 text-[var(--text-muted)] hover:text-[var(--red)] text-xs transition-opacity p-1"
                >
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
