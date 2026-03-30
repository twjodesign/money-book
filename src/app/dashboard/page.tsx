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
    note: string; category_name: string; category_icon: string; group_name: string;
  }[];
}

function formatMoney(n: number): string {
  return "$" + Math.abs(n).toLocaleString("zh-TW", { maximumFractionDigits: 0 });
}

const MONTH_NAMES = ["", "1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];

export default function DashboardPage() {
  const { currentAccount } = useApp();
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    if (!currentAccount) return;
    // 自動產生當月固定收支，再載入 dashboard
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
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-3xl animate-bounce">🐷</div>
      </div>
    );
  }

  const maxBar = Math.max(...data.months.map((m) => Math.max(m.income, m.expense)), 1);

  return (
    <div className="space-y-5 animate-in">
      {/* Greeting */}
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          {currentAccount?.type === "personal" ? "🧑" : "🏢"}{" "}
          {currentAccount?.name}
        </h2>
        <p className="text-sm text-[var(--text-muted)] mt-1">今天也要好好記帳喔～ 🌟</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card !border-[var(--green)] !border-opacity-40 text-center">
          <div className="text-2xl mb-1">💰</div>
          <p className="text-[10px] text-[var(--text-muted)] font-semibold">本月收入</p>
          <p className="text-lg font-bold text-[var(--green)]">{formatMoney(data.monthIncome)}</p>
        </div>
        <div className="card !border-[var(--red)] !border-opacity-40 text-center">
          <div className="text-2xl mb-1">🛒</div>
          <p className="text-[10px] text-[var(--text-muted)] font-semibold">本月支出</p>
          <p className="text-lg font-bold text-[var(--red)]">{formatMoney(data.monthExpense)}</p>
        </div>
        <div className={`card text-center ${data.monthNet >= 0 ? "!border-[var(--accent)] !border-opacity-40" : "!border-[var(--red)] !border-opacity-40"}`}>
          <div className="text-2xl mb-1">{data.monthNet >= 0 ? "🎉" : "😅"}</div>
          <p className="text-[10px] text-[var(--text-muted)] font-semibold">本月結餘</p>
          <p className={`text-lg font-bold ${data.monthNet >= 0 ? "text-[var(--accent)]" : "text-[var(--red)]"}`}>
            {data.monthNet >= 0 ? "+" : "-"}{formatMoney(data.monthNet)}
          </p>
        </div>
      </div>

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
                    {net >= 0 ? "+" : ""}{formatMoney(net)}
                  </span>
                </div>
                <div className="flex gap-1.5 h-5">
                  <div
                    className="bar-income h-full transition-all"
                    style={{ width: `${(m.income / maxBar) * 100}%`, minWidth: m.income > 0 ? "4px" : 0 }}
                    title={`收入 ${formatMoney(m.income)}`}
                  />
                  <div
                    className="bar-expense h-full transition-all"
                    style={{ width: `${(m.expense / maxBar) * 100}%`, minWidth: m.expense > 0 ? "4px" : 0 }}
                    title={`支出 ${formatMoney(m.expense)}`}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex gap-4 mt-3 text-xs text-[var(--text-muted)]">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bar-income inline-block" /> 收入
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bar-expense inline-block" /> 支出
          </span>
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
                  <span className="tag tag-red">{formatMoney(item.total)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent transactions */}
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
                      <p className="text-sm font-semibold">{tx.category_name}</p>
                      <p className="text-[10px] text-[var(--text-muted)]">
                        {tx.date.slice(5)} {tx.note && `· ${tx.note}`}
                      </p>
                    </div>
                  </div>
                  <span className={`tag ${tx.direction === "income" ? "tag-green" : "tag-red"}`}>
                    {tx.direction === "income" ? "+" : "-"}{formatMoney(tx.amount)}
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
