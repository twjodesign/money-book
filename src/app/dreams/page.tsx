"use client";

import { useState, useEffect } from "react";
import { useApp } from "@/components/AppShell";

function fmt(n: number): string {
  return "$" + Math.abs(n).toLocaleString("zh-TW", { maximumFractionDigits: 0 });
}

interface Dream {
  id: string; account_id: string; name: string; icon: string;
  target_amount: number; current_amount: number; target_date: string | null;
  category: string; note: string; created_at: string;
  deposit_count: number; deposit_sum: number;
}

const CATEGORY_OPTIONS = [
  { value: "travel",    label: "旅行",   emoji: "✈️" },
  { value: "course",    label: "進修",   emoji: "📚" },
  { value: "luxury",    label: "奢侈品", emoji: "💎" },
  { value: "emergency", label: "緊急備用", emoji: "🛡️" },
  { value: "other",     label: "其他",   emoji: "✨" },
];

const ICON_OPTIONS = ["✈️", "📚", "💎", "🛡️", "🎯", "🏠", "🚗", "💍"];

function categoryTag(cat: string) {
  const found = CATEGORY_OPTIONS.find((c) => c.value === cat);
  return found ? `${found.emoji} ${found.label}` : "✨ 其他";
}

export default function DreamsPage() {
  const { currentAccount } = useApp();
  const [dreams, setDreams] = useState<Dream[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [depositDreamId, setDepositDreamId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("🎯");
  const [targetAmount, setTargetAmount] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [category, setCategory] = useState("other");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [depositNote, setDepositNote] = useState("");
  const [depositDate, setDepositDate] = useState(new Date().toISOString().slice(0, 10));
  const [depositing, setDepositing] = useState(false);
  const [showSuccess, setShowSuccess] = useState("");

  useEffect(() => {
    if (!currentAccount) return;
    fetch(`/api/dreams?accountId=${currentAccount.id}`).then((r) => r.json()).then(setDreams);
  }, [currentAccount]);

  const totalTarget = dreams.reduce((s, d) => s + d.target_amount, 0);
  const totalSaved = dreams.reduce((s, d) => s + d.current_amount, 0);
  const overallPercent = totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0;

  async function handleAddDream(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !currentAccount) return;
    setSaving(true);
    await fetch("/api/dreams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ account_id: currentAccount.id, name, icon, target_amount: parseFloat(targetAmount) || 0, target_date: targetDate || null, category, note }),
    });
    setName(""); setIcon("🎯"); setTargetAmount(""); setTargetDate(""); setCategory("other"); setNote("");
    setSaving(false); setShowForm(false);
    setShowSuccess("夢想已建立");
    setTimeout(() => setShowSuccess(""), 2000);
    const res = await fetch(`/api/dreams?accountId=${currentAccount.id}`);
    setDreams(await res.json());
  }

  async function handleDeposit(e: React.FormEvent) {
    e.preventDefault();
    if (!depositDreamId || !depositAmount) return;
    setDepositing(true);
    await fetch("/api/dreams/deposit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dream_id: depositDreamId, amount: parseFloat(depositAmount), note: depositNote, date: depositDate }),
    });
    setDepositAmount(""); setDepositNote(""); setDepositDate(new Date().toISOString().slice(0, 10));
    setDepositing(false); setDepositDreamId(null);
    setShowSuccess("存入成功");
    setTimeout(() => setShowSuccess(""), 2000);
    if (currentAccount) {
      const res = await fetch(`/api/dreams?accountId=${currentAccount.id}`);
      setDreams(await res.json());
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("確定刪除這個夢想嗎？所有存款紀錄也會一起刪除")) return;
    await fetch(`/api/dreams?id=${id}`, { method: "DELETE" });
    setDreams((prev) => prev.filter((d) => d.id !== id));
  }

  return (
    <div className="space-y-4 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">夢想儲蓄</h2>
          <p className="text-sm text-[var(--text-muted)] mt-1">為每個目標存一點點</p>
        </div>
        <button className="btn-primary text-sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? "取消" : "+ 新夢想"}
        </button>
      </div>

      {showSuccess && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[var(--green)] text-white px-6 py-3 rounded-2xl font-semibold text-sm shadow-lg animate-in">
          {showSuccess}
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card text-center">
          <p className="section-label mb-1">總目標</p>
          <p className="text-lg font-bold text-[var(--accent)]">{fmt(totalTarget)}</p>
        </div>
        <div className="card text-center">
          <p className="section-label mb-1">已存</p>
          <p className="text-lg font-bold text-[var(--green)]">{fmt(totalSaved)}</p>
        </div>
        <div className="card text-center">
          <p className="section-label mb-1">達成率</p>
          <p className="text-lg font-bold text-[var(--accent)]">{overallPercent}%</p>
        </div>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="card animate-in">
          <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-3">建立新夢想</h3>
          <form onSubmit={handleAddDream} className="space-y-4">
            <div>
              <label className="block section-label mb-2">圖示</label>
              <div className="flex flex-wrap gap-2">
                {ICON_OPTIONS.map((ic) => (
                  <button key={ic} type="button" onClick={() => setIcon(ic)}
                    className={`w-10 h-10 rounded-xl text-lg flex items-center justify-center transition-all border ${
                      icon === ic ? "bg-[var(--accent-light)] border-[var(--accent)] shadow-sm scale-110" : "bg-[var(--bg)] border-[var(--border)]"
                    }`}
                  >{ic}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="block section-label mb-1.5">夢想名稱</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="日本旅行、碩士學位..." required />
            </div>
            <div>
              <label className="block section-label mb-2">分類</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_OPTIONS.map((c) => (
                  <button key={c.value} type="button" onClick={() => setCategory(c.value)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                      category === c.value
                        ? "bg-[var(--accent-light)] border-[var(--accent)] text-[var(--accent)]"
                        : "bg-[var(--bg)] border-[var(--border)] text-[var(--text-muted)]"
                    }`}
                  >{c.emoji} {c.label}</button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block section-label mb-1.5">目標金額</label>
                <input type="number" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} placeholder="100,000" min="1" required className="!text-lg !font-bold" />
              </div>
              <div>
                <label className="block section-label mb-1.5">目標日期</label>
                <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="block section-label mb-1.5">備註</label>
              <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="選填" />
            </div>
            <button type="submit" className="btn-primary w-full" disabled={saving}>
              {saving ? "建立中..." : "建立夢想"}
            </button>
          </form>
        </div>
      )}

      {/* Dream list */}
      {dreams.length > 0 ? (
        <div className="space-y-3">
          {dreams.map((dream) => {
            const pct = dream.target_amount > 0 ? Math.min(100, Math.round((dream.current_amount / dream.target_amount) * 100)) : 0;
            const isComplete = pct >= 100;
            return (
              <div key={dream.id} className={`card group ${isComplete ? "!border-[var(--green)]" : ""}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${isComplete ? "bg-[var(--green-light)]" : "bg-[var(--accent-light)]"}`}>
                      {isComplete ? "🎉" : dream.icon}
                    </div>
                    <div>
                      <p className="text-sm font-semibold flex items-center gap-2">
                        {dream.name}
                        {isComplete && <span className="text-xs text-[var(--green)] font-medium">達成</span>}
                      </p>
                      <span className={`inline-block mt-0.5 px-2 py-0.5 rounded-lg text-[10px] font-semibold ${
                        isComplete ? "bg-[var(--green-light)] text-[var(--green)]" : "bg-[var(--accent-light)] text-[var(--accent)]"
                      }`}>{categoryTag(dream.category)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => { setDepositDreamId(depositDreamId === dream.id ? null : dream.id); setDepositAmount(""); setDepositNote(""); setDepositDate(new Date().toISOString().slice(0, 10)); }}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[var(--green-light)] text-[var(--green)] hover:bg-[var(--green)] hover:text-white transition-all">
                      存入
                    </button>
                    <button onClick={() => handleDelete(dream.id)} className="opacity-0 group-hover:opacity-100 text-xs p-1 hover:text-[var(--red)] transition-opacity">🗑️</button>
                  </div>
                </div>

                <div className="mb-2">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-[var(--text-muted)]">{fmt(dream.current_amount)} / {fmt(dream.target_amount)}</span>
                    <span className={`font-bold ${isComplete ? "text-[var(--green)]" : "text-[var(--accent)]"}`}>{pct}%</span>
                  </div>
                  <div className="w-full h-2 bg-[var(--bg)] rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-500 ${isComplete ? "bg-[var(--green)]" : "bg-[var(--accent)]"}`}
                      style={{ width: `${pct}%` }} />
                  </div>
                </div>

                {dream.target_date && (
                  <p className="text-[10px] text-[var(--text-muted)]">目標日期：{dream.target_date}</p>
                )}

                {depositDreamId === dream.id && (
                  <form onSubmit={handleDeposit} className="mt-3 pt-3 border-t border-[var(--border)] animate-in">
                    <div className="grid grid-cols-3 gap-2 mb-2">
                      <div>
                        <label className="block section-label mb-1">金額</label>
                        <input type="number" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} placeholder="0" required min="1" className="!text-sm" />
                      </div>
                      <div>
                        <label className="block section-label mb-1">日期</label>
                        <input type="date" value={depositDate} onChange={(e) => setDepositDate(e.target.value)} required className="!text-sm" />
                      </div>
                      <div>
                        <label className="block section-label mb-1">備註</label>
                        <input type="text" value={depositNote} onChange={(e) => setDepositNote(e.target.value)} placeholder="選填" className="!text-sm" />
                      </div>
                    </div>
                    <button type="submit" className="btn-primary w-full !py-2 !text-sm" disabled={depositing}>
                      {depositing ? "存入中..." : "確認存入"}
                    </button>
                  </form>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        !showForm && (
          <div className="card text-center py-8">
            <div className="text-4xl mb-2">✨</div>
            <p className="text-sm text-[var(--text-muted)]">還沒有夢想儲蓄</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">點右上角「+ 新夢想」開始存錢</p>
          </div>
        )
      )}
    </div>
  );
}
