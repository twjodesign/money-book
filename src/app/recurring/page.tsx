"use client";

import { useState, useEffect } from "react";
import { useApp } from "@/components/AppShell";
import type { Category, Recurring } from "@/lib/types";

function formatMoney(n: number): string {
  return "$" + Math.abs(n).toLocaleString("zh-TW", { maximumFractionDigits: 0 });
}

export default function RecurringPage() {
  const { currentAccount } = useApp();
  const [items, setItems] = useState<Recurring[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [direction, setDirection] = useState<"expense" | "income">("income");
  const [categoryId, setCategoryId] = useState("");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [dayOfMonth, setDayOfMonth] = useState("1");
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState("");

  useEffect(() => {
    if (!currentAccount) return;
    fetch(`/api/recurring?accountId=${currentAccount.id}`)
      .then((r) => r.json())
      .then(setItems);
    fetch(`/api/categories?type=${currentAccount.type}`)
      .then((r) => r.json())
      .then(setCategories);
  }, [currentAccount]);

  useEffect(() => {
    const filtered = categories.filter((c) => c.direction === direction);
    if (filtered.length > 0) setCategoryId(filtered[0].id);
  }, [direction, categories]);

  const filteredCats = categories.filter((c) => c.direction === direction);
  const incomeItems = items.filter((i) => i.direction === "income");
  const expenseItems = items.filter((i) => i.direction === "expense");
  const totalIncome = incomeItems.reduce((s, i) => s + i.amount, 0);
  const totalExpense = expenseItems.reduce((s, i) => s + i.amount, 0);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!title || !amount || !categoryId || !currentAccount) return;
    setSaving(true);

    await fetch("/api/recurring", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        account_id: currentAccount.id,
        category_id: categoryId,
        direction,
        title,
        amount: parseFloat(amount),
        note,
        day_of_month: parseInt(dayOfMonth),
      }),
    });

    setTitle("");
    setAmount("");
    setNote("");
    setSaving(false);
    setShowForm(false);
    setShowSuccess("新增成功！");
    setTimeout(() => setShowSuccess(""), 2000);

    const res = await fetch(`/api/recurring?accountId=${currentAccount.id}`);
    setItems(await res.json());
  }

  async function handleDelete(id: string) {
    if (!confirm("確定刪除這筆固定收支嗎？")) return;
    await fetch(`/api/recurring?id=${id}`, { method: "DELETE" });
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  async function handleGenerate() {
    if (!currentAccount) return;
    const res = await fetch("/api/recurring/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ account_id: currentAccount.id }),
    });
    const data = await res.json();
    if (data.generated > 0) {
      setShowSuccess(`已產生 ${data.generated} 筆本月固定收支！`);
    } else {
      setShowSuccess("本月固定收支已全部入帳 ✅");
    }
    setTimeout(() => setShowSuccess(""), 3000);
  }

  return (
    <div className="space-y-5 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">🔄 固定收支</h2>
          <p className="text-sm text-[var(--text-muted)] mt-1">設一次，每月自動入帳～</p>
        </div>
        <button className="btn-primary text-sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? "取消" : "➕ 新增"}
        </button>
      </div>

      {/* Success toast */}
      {showSuccess && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[var(--green)] text-white px-6 py-3 rounded-2xl font-bold text-sm shadow-lg animate-in">
          {showSuccess}
        </div>
      )}

      {/* Monthly summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card !border-[var(--green)] !border-opacity-40 text-center">
          <p className="text-[10px] text-[var(--text-muted)] font-semibold">每月固定收入</p>
          <p className="text-lg font-bold text-[var(--green)]">{formatMoney(totalIncome)}</p>
        </div>
        <div className="card !border-[var(--red)] !border-opacity-40 text-center">
          <p className="text-[10px] text-[var(--text-muted)] font-semibold">每月固定支出</p>
          <p className="text-lg font-bold text-[var(--red)]">{formatMoney(totalExpense)}</p>
        </div>
        <div className="card !border-[var(--accent)] !border-opacity-40 text-center">
          <p className="text-[10px] text-[var(--text-muted)] font-semibold">每月淨額</p>
          <p className={`text-lg font-bold ${totalIncome - totalExpense >= 0 ? "text-[var(--green)]" : "text-[var(--red)]"}`}>
            {totalIncome - totalExpense >= 0 ? "+" : "-"}{formatMoney(totalIncome - totalExpense)}
          </p>
        </div>
      </div>

      {/* Generate button */}
      <button onClick={handleGenerate} className="btn-outline w-full flex items-center justify-center gap-2 !py-3">
        ⚡ 立即產生本月固定收支
      </button>

      {/* Add form */}
      {showForm && (
        <div className="card animate-in">
          <h3 className="text-sm font-bold mb-3">🆕 新增固定收支</h3>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="flex gap-2 bg-[var(--bg)] p-1 rounded-2xl">
              <button
                type="button"
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  direction === "income" ? "bg-[var(--green)] text-white shadow-md" : "text-[var(--text-muted)]"
                }`}
                onClick={() => setDirection("income")}
              >
                💰 固定收入
              </button>
              <button
                type="button"
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  direction === "expense" ? "bg-[var(--red)] text-white shadow-md" : "text-[var(--text-muted)]"
                }`}
                onClick={() => setDirection("expense")}
              >
                🛒 固定支出
              </button>
            </div>

            {/* Category chips */}
            <div>
              <label className="block text-xs text-[var(--text-muted)] font-semibold mb-2">分類</label>
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
                        : "bg-[var(--bg)] border-[var(--border)] text-[var(--text-muted)]"
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

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-[var(--text-muted)] font-semibold mb-1">💵 金額</label>
                <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" required min="1" />
              </div>
              <div>
                <label className="block text-xs text-[var(--text-muted)] font-semibold mb-1">📅 每月幾號</label>
                <input type="number" value={dayOfMonth} onChange={(e) => setDayOfMonth(e.target.value)} min="1" max="31" required />
              </div>
              <div>
                <label className="block text-xs text-[var(--text-muted)] font-semibold mb-1">📋 備註</label>
                <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="薪水、Netflix..." />
              </div>
            </div>

            <button type="submit" className="btn-primary w-full" disabled={saving}>
              {saving ? "新增中..." : "新增固定項目 🔄"}
            </button>
          </form>
        </div>
      )}

      {/* Income list */}
      {incomeItems.length > 0 && (
        <div>
          <h3 className="text-sm font-bold mb-2 flex items-center gap-2">💰 固定收入</h3>
          <div className="space-y-2">
            {incomeItems.map((item) => (
              <div key={item.id} className="card !p-3 !rounded-2xl flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--green-light)] flex items-center justify-center text-lg">
                    {item.category_icon}
                  </div>
                  <div>
                    <p className="text-sm font-bold">{item.title || item.category_name}</p>
                    <p className="text-[10px] text-[var(--text-muted)]">
                      {item.title ? item.category_name + " · " : ""}每月 {item.day_of_month} 號{item.note && ` · ${item.note}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="tag tag-green">+{formatMoney(item.amount)}</span>
                  <button onClick={() => handleDelete(item.id)} className="opacity-0 group-hover:opacity-100 text-xs p-1 hover:text-[var(--red)] transition-opacity">
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Expense list */}
      {expenseItems.length > 0 && (
        <div>
          <h3 className="text-sm font-bold mb-2 flex items-center gap-2">🛒 固定支出</h3>
          <div className="space-y-2">
            {expenseItems.map((item) => (
              <div key={item.id} className="card !p-3 !rounded-2xl flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--red-light)] flex items-center justify-center text-lg">
                    {item.category_icon}
                  </div>
                  <div>
                    <p className="text-sm font-bold">{item.title || item.category_name}</p>
                    <p className="text-[10px] text-[var(--text-muted)]">
                      {item.title ? item.category_name + " · " : ""}每月 {item.day_of_month} 號{item.note && ` · ${item.note}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="tag tag-red">-{formatMoney(item.amount)}</span>
                  <button onClick={() => handleDelete(item.id)} className="opacity-0 group-hover:opacity-100 text-xs p-1 hover:text-[var(--red)] transition-opacity">
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {items.length === 0 && !showForm && (
        <div className="card text-center py-8">
          <div className="text-4xl mb-2">🔄</div>
          <p className="text-sm text-[var(--text-muted)]">還沒有固定收支</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">點右上角「新增」設定每月薪水、訂閱等</p>
        </div>
      )}
    </div>
  );
}
