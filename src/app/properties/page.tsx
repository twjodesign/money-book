"use client";

import { useState, useEffect } from "react";
import { useApp } from "@/components/AppShell";

interface Property {
  id: string;
  account_id: string;
  name: string;
  address: string;
  purpose: "self" | "rent" | "invest";
  market_value: number;
  cash_paid: number;
  loan_balance: number;
  monthly_payment: number;
  monthly_rent: number;
  note: string;
  created_at: string;
}

function formatMoney(n: number): string {
  return "$" + Math.abs(n).toLocaleString("zh-TW", { maximumFractionDigits: 0 });
}

const PURPOSE_MAP: Record<string, { label: string; emoji: string; tagClass: string }> = {
  self: { label: "自住", emoji: "🏠", tagClass: "tag-blue" },
  rent: { label: "收租", emoji: "🏘️", tagClass: "tag-green" },
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
    fetch(`/api/properties?accountId=${currentAccount.id}`)
      .then((r) => r.json())
      .then(setProperties);
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
      body: JSON.stringify({
        account_id: currentAccount.id,
        name,
        address,
        purpose,
        market_value: parseFloat(marketValue) || 0,
        cash_paid: parseFloat(cashPaid) || 0,
        loan_balance: parseFloat(loanBalance) || 0,
        monthly_payment: parseFloat(monthlyPayment) || 0,
        monthly_rent: parseFloat(monthlyRent) || 0,
        note,
      }),
    });

    setName("");
    setAddress("");
    setPurpose("self");
    setMarketValue("");
    setCashPaid("");
    setLoanBalance("");
    setMonthlyPayment("");
    setMonthlyRent("");
    setNote("");
    setSaving(false);
    setShowForm(false);
    setShowSuccess("房產新增成功！");
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
    <div className="space-y-5 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">🏠 房產管理</h2>
          <p className="text-sm text-[var(--text-muted)] mt-1">追蹤你的不動產資產～</p>
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

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card !border-[var(--accent)] !border-opacity-40 text-center">
          <p className="text-[10px] text-[var(--text-muted)] font-semibold">🏘️ 總估值</p>
          <p className="text-lg font-bold text-[var(--accent)]">{formatMoney(totalMarketValue)}</p>
        </div>
        <div className="card !border-[var(--green)] !border-opacity-40 text-center">
          <p className="text-[10px] text-[var(--text-muted)] font-semibold">💰 總淨資產</p>
          <p className="text-lg font-bold text-[var(--green)]">{formatMoney(totalEquity)}</p>
        </div>
        <div className="card !border-[var(--blue)] !border-opacity-40 text-center">
          <p className="text-[10px] text-[var(--text-muted)] font-semibold">📊 總月現金流</p>
          <p className={`text-lg font-bold ${totalMonthlyCashFlow >= 0 ? "text-[var(--green)]" : "text-[var(--red)]"}`}>
            {totalMonthlyCashFlow >= 0 ? "+" : "-"}{formatMoney(totalMonthlyCashFlow)}
          </p>
        </div>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="card animate-in">
          <h3 className="text-sm font-bold mb-3">🆕 新增房產</h3>
          <form onSubmit={handleSave} className="space-y-4">
            {/* Purpose selector */}
            <div>
              <label className="block text-xs text-[var(--text-muted)] font-semibold mb-2">用途</label>
              <div className="flex gap-2 bg-[var(--bg)] p-1 rounded-2xl">
                {(["self", "rent", "invest"] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                      purpose === p ? "bg-[var(--accent)] text-white shadow-md" : "text-[var(--text-muted)]"
                    }`}
                    onClick={() => setPurpose(p)}
                  >
                    {PURPOSE_MAP[p].emoji} {PURPOSE_MAP[p].label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[var(--text-muted)] font-semibold mb-1">🏷️ 名稱</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="信義區套房" required />
              </div>
              <div>
                <label className="block text-xs text-[var(--text-muted)] font-semibold mb-1">📍 地址</label>
                <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="台北市信義區..." />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-[var(--text-muted)] font-semibold mb-1">💎 市場估值</label>
                <input type="number" value={marketValue} onChange={(e) => setMarketValue(e.target.value)} placeholder="0" />
              </div>
              <div>
                <label className="block text-xs text-[var(--text-muted)] font-semibold mb-1">💵 已付現金</label>
                <input type="number" value={cashPaid} onChange={(e) => setCashPaid(e.target.value)} placeholder="0" />
              </div>
              <div>
                <label className="block text-xs text-[var(--text-muted)] font-semibold mb-1">🏦 貸款餘額</label>
                <input type="number" value={loanBalance} onChange={(e) => setLoanBalance(e.target.value)} placeholder="0" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-[var(--text-muted)] font-semibold mb-1">📅 每月還款</label>
                <input type="number" value={monthlyPayment} onChange={(e) => setMonthlyPayment(e.target.value)} placeholder="0" />
              </div>
              <div>
                <label className="block text-xs text-[var(--text-muted)] font-semibold mb-1">🏘️ 每月租金</label>
                <input type="number" value={monthlyRent} onChange={(e) => setMonthlyRent(e.target.value)} placeholder="0" />
              </div>
              <div>
                <label className="block text-xs text-[var(--text-muted)] font-semibold mb-1">📝 備註</label>
                <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="房客小王..." />
              </div>
            </div>

            <button type="submit" className="btn-primary w-full" disabled={saving}>
              {saving ? "新增中..." : "新增房產 🏠"}
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
              <div key={prop.id} className="card !rounded-2xl group">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[var(--accent-light)] flex items-center justify-center text-lg">
                      {info.emoji}
                    </div>
                    <div>
                      <p className="text-sm font-bold">{prop.name}</p>
                      <p className="text-[10px] text-[var(--text-muted)]">
                        {prop.address} {prop.note && `· ${prop.note}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`tag ${info.tagClass}`}>{info.emoji} {info.label}</span>
                    <button onClick={() => handleDelete(prop.id)} className="opacity-0 group-hover:opacity-100 text-xs p-1 hover:text-[var(--red)] transition-opacity">
                      🗑️
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-[var(--bg)] rounded-xl p-2">
                    <p className="text-[10px] text-[var(--text-muted)] font-semibold">市場估值</p>
                    <p className="text-sm font-bold text-[var(--accent)]">{formatMoney(prop.market_value)}</p>
                  </div>
                  <div className="bg-[var(--bg)] rounded-xl p-2">
                    <p className="text-[10px] text-[var(--text-muted)] font-semibold">已付現金</p>
                    <p className="text-sm font-bold text-[var(--green)]">{formatMoney(prop.cash_paid)}</p>
                  </div>
                  <div className="bg-[var(--bg)] rounded-xl p-2">
                    <p className="text-[10px] text-[var(--text-muted)] font-semibold">貸款餘額</p>
                    <p className="text-sm font-bold text-[var(--red)]">{formatMoney(prop.loan_balance)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center mt-2">
                  <div className="bg-[var(--bg)] rounded-xl p-2">
                    <p className="text-[10px] text-[var(--text-muted)] font-semibold">每月還款</p>
                    <p className="text-sm font-bold text-[var(--red)]">-{formatMoney(prop.monthly_payment)}</p>
                  </div>
                  <div className="bg-[var(--bg)] rounded-xl p-2">
                    <p className="text-[10px] text-[var(--text-muted)] font-semibold">每月租金</p>
                    <p className="text-sm font-bold text-[var(--green)]">+{formatMoney(prop.monthly_rent)}</p>
                  </div>
                  <div className="bg-[var(--bg)] rounded-xl p-2">
                    <p className="text-[10px] text-[var(--text-muted)] font-semibold">月現金流</p>
                    <p className={`text-sm font-bold ${cashFlow >= 0 ? "text-[var(--green)]" : "text-[var(--red)]"}`}>
                      {cashFlow >= 0 ? "+" : "-"}{formatMoney(cashFlow)}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between bg-[var(--green-light)] rounded-xl px-3 py-2">
                  <p className="text-xs font-semibold text-[var(--green)]">💰 淨資產（已付現金）</p>
                  <p className="text-sm font-bold text-[var(--green)]">{formatMoney(prop.cash_paid)}</p>
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
          <p className="text-xs text-[var(--text-muted)] mt-1">點右上角「新增」加入你的不動產</p>
        </div>
      )}
    </div>
  );
}
