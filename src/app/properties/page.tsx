"use client";

import { useState, useEffect } from "react";
import { useApp } from "@/components/AppShell";

interface Property {
  id: string; account_id: string; name: string; address: string;
  purpose: "self" | "rent" | "invest"; market_value: number; cash_paid: number;
  loan_balance: number; monthly_payment: number; monthly_rent: number; note: string; created_at: string;
}

function fmt(n: number): string {
  return "$" + Math.abs(n).toLocaleString("zh-TW", { maximumFractionDigits: 0 });
}

const PURPOSE_MAP: Record<string, { label: string; emoji: string; tagClass: string }> = {
  self:   { label: "自住", emoji: "🏠", tagClass: "tag-blue" },
  rent:   { label: "收租", emoji: "🏘️", tagClass: "tag-green" },
  invest: { label: "投資", emoji: "📈", tagClass: "tag-purple" },
};

export default function PropertiesPage() {
  const { currentAccount } = useApp();
  const [properties, setProperties] = useState<Property[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [purpose, setPurpose] = useState<"self" | "rent" | "invest">("self");
  const [marketValue, setMarketValue] = useState("");
  const [cashPaid, setCashPaid] = useState("");
  const [loanBalance, setLoanBalance] = useState("");
  const [monthlyPayment, setMonthlyPayment] = useState("");
  const [monthlyRent, setMonthlyRent] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState("");

  useEffect(() => {
    if (!currentAccount) return;
    fetch(`/api/properties?accountId=${currentAccount.id}`).then((r) => r.json()).then(setProperties);
  }, [currentAccount]);

  const totalMarketValue = properties.reduce((s, p) => s + p.market_value, 0);
  const totalEquity = properties.reduce((s, p) => s + p.cash_paid, 0);
  const totalMonthlyCashFlow = properties.reduce((s, p) => s + (p.monthly_rent - p.monthly_payment), 0);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !currentAccount) return;
    setSaving(true);
    await fetch("/api/properties", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ account_id: currentAccount.id, name, address, purpose, market_value: parseFloat(marketValue) || 0, cash_paid: parseFloat(cashPaid) || 0, loan_balance: parseFloat(loanBalance) || 0, monthly_payment: parseFloat(monthlyPayment) || 0, monthly_rent: parseFloat(monthlyRent) || 0, note }),
    });
    setName(""); setAddress(""); setPurpose("self"); setMarketValue(""); setCashPaid(""); setLoanBalance(""); setMonthlyPayment(""); setMonthlyRent(""); setNote("");
    setSaving(false); setShowForm(false);
    setShowSuccess("房產新增成功");
    setTimeout(() => setShowSuccess(""), 2000);
    const res = await fetch(`/api/properties?accountId=${currentAccount.id}`);
    setProperties(await res.json());
  }

  async function handleDelete(id: string) {
    if (!confirm("確定刪除這筆房產嗎？")) return;
    await fetch(`/api/properties?id=${id}`, { method: "DELETE" });
    setProperties((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <div className="space-y-4 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">房產管理</h2>
          <p className="text-sm text-[var(--text-muted)] mt-1">追蹤不動產資產</p>
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

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card text-center">
          <p className="section-label mb-1">總估值</p>
          <p className="text-lg font-bold text-[var(--accent)]">{fmt(totalMarketValue)}</p>
        </div>
        <div className="card text-center">
          <p className="section-label mb-1">總淨資產</p>
          <p className="text-lg font-bold text-[var(--green)]">{fmt(totalEquity)}</p>
        </div>
        <div className="card text-center">
          <p className="section-label mb-1">月現金流</p>
          <p className={`text-lg font-bold ${totalMonthlyCashFlow >= 0 ? "text-[var(--green)]" : "text-[var(--red)]"}`}>
            {totalMonthlyCashFlow >= 0 ? "+" : "-"}{fmt(totalMonthlyCashFlow)}
          </p>
        </div>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="card animate-in">
          <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-3">新增房產</h3>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block section-label mb-2">用途</label>
              <div className="flex gap-2 bg-[var(--bg)] p-1 rounded-2xl">
                {(["self", "rent", "invest"] as const).map((p) => (
                  <button key={p} type="button"
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                      purpose === p ? "bg-[var(--accent)] text-white shadow-sm" : "text-[var(--text-muted)]"
                    }`}
                    onClick={() => setPurpose(p)}
                  >{PURPOSE_MAP[p].emoji} {PURPOSE_MAP[p].label}</button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block section-label mb-1.5">名稱</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="信義區套房" required />
              </div>
              <div>
                <label className="block section-label mb-1.5">地址</label>
                <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="台北市..." />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block section-label mb-1.5">市場估值</label>
                <input type="number" value={marketValue} onChange={(e) => setMarketValue(e.target.value)} placeholder="0" />
              </div>
              <div>
                <label className="block section-label mb-1.5">已付現金</label>
                <input type="number" value={cashPaid} onChange={(e) => setCashPaid(e.target.value)} placeholder="0" />
              </div>
              <div>
                <label className="block section-label mb-1.5">貸款餘額</label>
                <input type="number" value={loanBalance} onChange={(e) => setLoanBalance(e.target.value)} placeholder="0" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block section-label mb-1.5">每月還款</label>
                <input type="number" value={monthlyPayment} onChange={(e) => setMonthlyPayment(e.target.value)} placeholder="0" />
              </div>
              <div>
                <label className="block section-label mb-1.5">每月租金</label>
                <input type="number" value={monthlyRent} onChange={(e) => setMonthlyRent(e.target.value)} placeholder="0" />
              </div>
              <div>
                <label className="block section-label mb-1.5">備註</label>
                <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="選填" />
              </div>
            </div>
            <button type="submit" className="btn-primary w-full" disabled={saving}>
              {saving ? "新增中..." : "新增房產"}
            </button>
          </form>
        </div>
      )}

      {/* Property list */}
      {properties.length > 0 && (
        <div className="space-y-3">
          {properties.map((prop) => {
            const cashFlow = prop.monthly_rent - prop.monthly_payment;
            const info = PURPOSE_MAP[prop.purpose] || PURPOSE_MAP.self;
            return (
              <div key={prop.id} className="card group">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[var(--accent-light)] flex items-center justify-center text-lg">{info.emoji}</div>
                    <div>
                      <p className="text-sm font-semibold">{prop.name}</p>
                      <p className="text-[10px] text-[var(--text-muted)]">{prop.address}{prop.note && ` · ${prop.note}`}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`tag ${info.tagClass}`}>{info.label}</span>
                    <button onClick={() => handleDelete(prop.id)} className="opacity-0 group-hover:opacity-100 text-xs p-1 hover:text-[var(--red)] transition-opacity">🗑️</button>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center mb-2">
                  <div className="bg-[var(--bg)] rounded-xl p-2">
                    <p className="section-label mb-0.5">估值</p>
                    <p className="text-xs font-bold text-[var(--accent)]">{fmt(prop.market_value)}</p>
                  </div>
                  <div className="bg-[var(--bg)] rounded-xl p-2">
                    <p className="section-label mb-0.5">已付現金</p>
                    <p className="text-xs font-bold text-[var(--green)]">{fmt(prop.cash_paid)}</p>
                  </div>
                  <div className="bg-[var(--bg)] rounded-xl p-2">
                    <p className="section-label mb-0.5">貸款餘額</p>
                    <p className="text-xs font-bold text-[var(--red)]">{fmt(prop.loan_balance)}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-[var(--bg)] rounded-xl p-2">
                    <p className="section-label mb-0.5">月還款</p>
                    <p className="text-xs font-bold text-[var(--red)]">-{fmt(prop.monthly_payment)}</p>
                  </div>
                  <div className="bg-[var(--bg)] rounded-xl p-2">
                    <p className="section-label mb-0.5">月租金</p>
                    <p className="text-xs font-bold text-[var(--green)]">+{fmt(prop.monthly_rent)}</p>
                  </div>
                  <div className="bg-[var(--bg)] rounded-xl p-2">
                    <p className="section-label mb-0.5">月現金流</p>
                    <p className={`text-xs font-bold ${cashFlow >= 0 ? "text-[var(--green)]" : "text-[var(--red)]"}`}>
                      {cashFlow >= 0 ? "+" : "-"}{fmt(cashFlow)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {properties.length === 0 && !showForm && (
        <div className="card text-center py-8">
          <div className="text-4xl mb-2">🏠</div>
          <p className="text-sm text-[var(--text-muted)]">還沒有房產資料</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">點右上角「+ 新增」加入不動產</p>
        </div>
      )}
    </div>
  );
}
