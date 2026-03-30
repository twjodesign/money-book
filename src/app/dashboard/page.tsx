"use client";

import { useState, useEffect } from "react";
import { useApp } from "@/components/AppShell";

interface DashboardData {
  monthIncome: number;
  monthExpense: number;
  monthNet: number;
  topExpenses: { group_name: string; name: string; icon: string; total: number }[];
  months: { month: string; income: number; expense: number }[];
  recent: {
    id: string; direction: string; amount: number; date: string;
    title: string; note: string; category_name: string; category_icon: string;
  }[];
  assets: {
    totalAssets: number;
    cash: { total: number; accounts: { name: string; bank_name: string; balance: number; icon: string }[] };
    invest: { cost: number; value: number; accounts: { name: string; type: string; total_cost: number; total_value: number }[] };
    property: { value: number; equity: number; loan: number; cashFlow: number; items: { name: string; market_value: number; cash_paid: number; loan_amount: number; monthly_payment: number; monthly_rent: number; purpose: string }[] };
    dreams: { target: number; saved: number; items: { name: string; icon: string; target_amount: number; current_amount: number; category: string }[] };
  };
}

function fmt(n: number): string {
  return "$" + Math.abs(n).toLocaleString("zh-TW", { maximumFractionDigits: 0 });
}

const MONTH_NAMES = ["", "1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];
const TYPE_LABEL: Record<string, string> = { tw_stock: "🇹🇼 台股", us_stock: "🇺🇸 美股", crypto: "🪙 加密貨幣" };
const PURPOSE_LABEL: Record<string, string> = { self: "自住", rent: "收租", invest: "投資" };

export default function DashboardPage() {
  const { currentAccount } = useApp();
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    if (!currentAccount) return;
    fetch("/api/recurring/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ account_id: currentAccount.id }),
    }).finally(() => {
      fetch(`/api/dashboard?accountId=${currentAccount.id}`)
        .then((r) => r.json())
        .then(setData);
    });
  }, [currentAccount]);

  if (!data) {
    return <div className="flex items-center justify-center py-20"><div className="text-3xl animate-bounce">🐷</div></div>;
  }

  const { assets } = data;
  const investReturn = assets.invest.cost > 0 ? ((assets.invest.value - assets.invest.cost) / assets.invest.cost * 100) : 0;
  const maxBar = Math.max(...data.months.map((m) => Math.max(m.income, m.expense)), 1);
  const dreamPercent = assets.dreams.target > 0 ? (assets.dreams.saved / assets.dreams.target * 100) : 0;

  return (
    <div className="space-y-5 animate-in">
      {/* Total Assets Hero */}
      <div className="card !border-[var(--accent)] !border-opacity-50 !bg-gradient-to-br from-[var(--accent-light)] to-white text-center">
        <p className="text-xs text-[var(--text-muted)] font-semibold">💎 總資產</p>
        <p className="text-3xl font-bold text-[var(--accent)] mt-1">{fmt(assets.totalAssets)}</p>
        <div className="flex justify-center gap-4 mt-3 text-xs">
          <span className="tag tag-blue">🏦 現金 {fmt(assets.cash.total)}</span>
          <span className="tag tag-purple">📈 投資 {fmt(assets.invest.value)}</span>
          <span className="tag tag-orange">🏠 房產 {fmt(assets.property.equity)}</span>
        </div>
      </div>

      {/* Monthly summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card !border-[var(--green)] !border-opacity-40 text-center">
          <div className="text-xl mb-1">💰</div>
          <p className="text-[10px] text-[var(--text-muted)] font-semibold">本月收入</p>
          <p className="text-lg font-bold text-[var(--green)]">{fmt(data.monthIncome)}</p>
        </div>
        <div className="card !border-[var(--red)] !border-opacity-40 text-center">
          <div className="text-xl mb-1">🛒</div>
          <p className="text-[10px] text-[var(--text-muted)] font-semibold">本月支出</p>
          <p className="text-lg font-bold text-[var(--red)]">{fmt(data.monthExpense)}</p>
        </div>
        <div className="card text-center">
          <div className="text-xl mb-1">{data.monthNet >= 0 ? "🎉" : "😅"}</div>
          <p className="text-[10px] text-[var(--text-muted)] font-semibold">本月結餘</p>
          <p className={`text-lg font-bold ${data.monthNet >= 0 ? "text-[var(--green)]" : "text-[var(--red)]"}`}>
            {data.monthNet >= 0 ? "+" : "-"}{fmt(data.monthNet)}
          </p>
        </div>
      </div>

      {/* Bank Accounts Quick View */}
      {assets.cash.accounts.length > 0 && (
        <div className="card">
          <h3 className="text-sm font-bold mb-3 flex items-center gap-2">🏦 銀行帳戶</h3>
          <div className="space-y-2">
            {assets.cash.accounts.map((b, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span>{b.icon}</span>
                  <div>
                    <p className="text-sm font-semibold">{b.name}</p>
                    <p className="text-[10px] text-[var(--text-muted)]">{b.bank_name}</p>
                  </div>
                </div>
                <span className="tag tag-green">{fmt(b.balance)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Investment Quick View */}
      {assets.invest.accounts.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold flex items-center gap-2">📈 投資組合</h3>
            <span className={`tag ${investReturn >= 0 ? "tag-green" : "tag-red"}`}>
              {investReturn >= 0 ? "↑" : "↓"} {Math.abs(investReturn).toFixed(1)}%
            </span>
          </div>
          <div className="space-y-2">
            {assets.invest.accounts.map((a, i) => {
              const ret = a.total_cost > 0 ? ((a.total_value - a.total_cost) / a.total_cost * 100) : 0;
              return (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-sm">{TYPE_LABEL[a.type] || a.type} {a.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">{fmt(a.total_value)}</span>
                    <span className={`tag text-[10px] ${ret >= 0 ? "tag-green" : "tag-red"}`}>
                      {ret >= 0 ? "+" : ""}{ret.toFixed(1)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-2 pt-2 border-t border-[var(--border)] text-xs text-[var(--text-muted)]">
            <span>投入 {fmt(assets.invest.cost)}</span>
            <span className="font-bold">市值 {fmt(assets.invest.value)}</span>
          </div>
        </div>
      )}

      {/* Property Quick View */}
      {assets.property.items.length > 0 && (
        <div className="card">
          <h3 className="text-sm font-bold mb-3 flex items-center gap-2">🏠 房地產</h3>
          <div className="space-y-2">
            {assets.property.items.map((p, i) => (
              <div key={i} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">{p.name}</p>
                  <p className="text-[10px] text-[var(--text-muted)]">{PURPOSE_LABEL[p.purpose]} · 貸款 {fmt(p.loan_amount)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold">{fmt(p.market_value)}</p>
                  <p className="text-[10px] text-[var(--text-muted)]">
                    月 {p.monthly_rent > 0 ? `+${fmt(p.monthly_rent)}` : ""}{p.monthly_payment > 0 ? ` -${fmt(p.monthly_payment)}` : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 pt-2 border-t border-[var(--border)] text-xs text-[var(--text-muted)]">
            <span>總貸款 {fmt(assets.property.loan)}</span>
            <span>月現金流 <b className={assets.property.cashFlow >= 0 ? "text-[var(--green)]" : "text-[var(--red)]"}>
              {assets.property.cashFlow >= 0 ? "+" : ""}{fmt(assets.property.cashFlow)}
            </b></span>
          </div>
        </div>
      )}

      {/* Dreams Quick View */}
      {assets.dreams.items.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold flex items-center gap-2">✨ 夢想儲蓄</h3>
            <span className="tag tag-purple">{dreamPercent.toFixed(0)}% 達成</span>
          </div>
          <div className="space-y-2">
            {assets.dreams.items.map((d, i) => {
              const pct = d.target_amount > 0 ? (d.current_amount / d.target_amount * 100) : 0;
              return (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm">{d.icon} {d.name}</span>
                    <span className="text-xs text-[var(--text-muted)]">{fmt(d.current_amount)} / {fmt(d.target_amount)}</span>
                  </div>
                  <div className="w-full h-2 bg-[var(--bg)] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${pct >= 100 ? "bg-[var(--green)]" : "bg-[var(--accent)]"}`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 6-month trend */}
      <div className="card">
        <h3 className="text-sm font-bold mb-4 flex items-center gap-2">📊 近 6 個月趨勢</h3>
        <div className="space-y-3">
          {data.months.map((m) => {
            const monthNum = parseInt(m.month.slice(5));
            const net = m.income - m.expense;
            return (
              <div key={m.month}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-[var(--text-muted)] w-10">{MONTH_NAMES[monthNum]}</span>
                  <span className={`text-xs font-bold ${net >= 0 ? "text-[var(--green)]" : "text-[var(--red)]"}`}>
                    {net >= 0 ? "+" : ""}{fmt(net)}
                  </span>
                </div>
                <div className="flex gap-1.5 h-5">
                  <div className="bar-income h-full transition-all" style={{ width: `${(m.income / maxBar) * 100}%`, minWidth: m.income > 0 ? "4px" : 0 }} />
                  <div className="bar-expense h-full transition-all" style={{ width: `${(m.expense / maxBar) * 100}%`, minWidth: m.expense > 0 ? "4px" : 0 }} />
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex gap-4 mt-3 text-xs text-[var(--text-muted)]">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bar-income inline-block" /> 收入</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bar-expense inline-block" /> 支出</span>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Top expenses */}
        <div className="card">
          <h3 className="text-sm font-bold mb-3 flex items-center gap-2">🔥 本月花費排行</h3>
          {data.topExpenses.length === 0 ? (
            <div className="text-center py-4">
              <div className="text-3xl mb-2">🎊</div>
              <p className="text-sm text-[var(--text-muted)]">本月零支出！太厲害了～</p>
            </div>
          ) : (
            <div className="space-y-2">
              {data.topExpenses.map((item, i) => (
                <div key={i} className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm w-5 text-center font-bold text-[var(--text-muted)]">
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`}
                    </span>
                    <span className="text-sm">{item.icon} {item.name}</span>
                  </div>
                  <span className="tag tag-red">{fmt(item.total)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent */}
        <div className="card">
          <h3 className="text-sm font-bold mb-3 flex items-center gap-2">🕐 最近紀錄</h3>
          {data.recent.length === 0 ? (
            <div className="text-center py-4">
              <div className="text-3xl mb-2">📝</div>
              <p className="text-sm text-[var(--text-muted)]">還沒有紀錄，快來記第一筆！</p>
            </div>
          ) : (
            <div className="space-y-2">
              {data.recent.slice(0, 7).map((tx) => (
                <div key={tx.id} className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{tx.category_icon}</span>
                    <div>
                      <p className="text-sm font-semibold">{tx.title || tx.category_name}</p>
                      <p className="text-[10px] text-[var(--text-muted)]">{tx.date.slice(5)} {tx.note && `· ${tx.note}`}</p>
                    </div>
                  </div>
                  <span className={`tag ${tx.direction === "income" ? "tag-green" : "tag-red"}`}>
                    {tx.direction === "income" ? "+" : "-"}{fmt(tx.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
