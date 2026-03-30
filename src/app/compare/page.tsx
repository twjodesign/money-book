"use client";

import { useState, useEffect } from "react";
import { useApp } from "@/components/AppShell";
import type { PeriodComparison } from "@/lib/types";

function formatMoney(n: number): string {
  return "$" + Math.abs(n).toLocaleString("zh-TW", { maximumFractionDigits: 0 });
}

function ChangeTag({ percent, inverse }: { percent: number; inverse?: boolean }) {
  const isUp = percent > 0;
  const isFlat = Math.abs(percent) < 0.5;
  const isGood = inverse ? !isUp : isUp;
  const isAlert = Math.abs(percent) > 15;

  if (isFlat) return <span className="tag tag-blue">→ 持平</span>;

  return (
    <span className={`tag ${isGood ? "tag-green" : "tag-red"}`}>
      {isUp ? "↑" : "↓"} {Math.abs(percent).toFixed(1)}%
      {isAlert && " ⚡"}
    </span>
  );
}

export default function ComparePage() {
  const { currentAccount } = useApp();
  const [type, setType] = useState<"quarter" | "half" | "year">("quarter");
  const [year, setYear] = useState(new Date().getFullYear());
  const [period, setPeriod] = useState(() => {
    const m = new Date().getMonth();
    return Math.ceil((m + 1) / 3);
  });
  const [data, setData] = useState<PeriodComparison | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!currentAccount) return;
    setLoading(true);
    fetch(`/api/compare?accountId=${currentAccount.id}&type=${type}&year=${year}&period=${period}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      });
  }, [currentAccount, type, year, period]);

  useEffect(() => {
    const m = new Date().getMonth();
    if (type === "quarter") setPeriod(Math.ceil((m + 1) / 3));
    else if (type === "half") setPeriod(m < 6 ? 1 : 2);
    else setPeriod(1);
  }, [type]);

  const periodOptions = () => {
    if (type === "quarter") return [1, 2, 3, 4].map((q) => ({ value: q, label: `Q${q}` }));
    if (type === "half") return [1, 2].map((h) => ({ value: h, label: `H${h}` }));
    return [{ value: 1, label: `${year}` }];
  };

  return (
    <div className="space-y-5 animate-in">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">📈 週期比較</h2>
        <p className="text-sm text-[var(--text-muted)] mt-1">看看錢錢有沒有乖乖成長～ 🌱</p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-2">
        <div className="flex bg-[var(--bg-card)] p-1 rounded-2xl border-2 border-[var(--border)]">
          {(["quarter", "half", "year"] as const).map((t) => (
            <button
              key={t}
              className={`px-4 py-1.5 rounded-xl text-sm font-bold transition-all ${
                type === t
                  ? "bg-[var(--accent)] text-white shadow-md"
                  : "text-[var(--text-muted)] hover:text-[var(--text)]"
              }`}
              onClick={() => setType(t)}
            >
              {t === "quarter" ? "🗓️ 季" : t === "half" ? "📅 半年" : "🎯 年"}
            </button>
          ))}
        </div>

        <select
          className="!w-auto !p-1.5 !px-3 text-sm !rounded-xl"
          value={year}
          onChange={(e) => setYear(parseInt(e.target.value))}
        >
          {[2024, 2025, 2026, 2027].map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>

        {type !== "year" && (
          <select
            className="!w-auto !p-1.5 !px-3 text-sm !rounded-xl"
            value={period}
            onChange={(e) => setPeriod(parseInt(e.target.value))}
          >
            {periodOptions().map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        )}
      </div>

      {loading && (
        <div className="text-center py-8">
          <div className="text-3xl animate-bounce">🔍</div>
          <p className="text-sm text-[var(--text-muted)] mt-2">計算中...</p>
        </div>
      )}

      {data && !loading && (
        <>
          {/* Header card */}
          <div className="card !border-[var(--accent)] !border-opacity-40">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg">⚡</span>
              <h3 className="text-sm font-bold">{data.current.label} vs {data.previous.label}</h3>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[var(--green-light)] rounded-2xl p-3 text-center">
                <div className="text-xl mb-1">💰</div>
                <p className="text-[10px] text-[var(--text-muted)] font-semibold">總收入</p>
                <p className="text-base font-bold text-[var(--green)]">{formatMoney(data.current.totalIncome)}</p>
                <div className="mt-1">
                  <ChangeTag percent={data.incomeChange} />
                </div>
                <p className="text-[10px] text-[var(--text-muted)] mt-1">前期 {formatMoney(data.previous.totalIncome)}</p>
              </div>

              <div className="bg-[var(--red-light)] rounded-2xl p-3 text-center">
                <div className="text-xl mb-1">🛒</div>
                <p className="text-[10px] text-[var(--text-muted)] font-semibold">總支出</p>
                <p className="text-base font-bold text-[var(--red)]">{formatMoney(data.current.totalExpense)}</p>
                <div className="mt-1">
                  <ChangeTag percent={data.expenseChange} inverse />
                </div>
                <p className="text-[10px] text-[var(--text-muted)] mt-1">前期 {formatMoney(data.previous.totalExpense)}</p>
              </div>

              <div className={`${data.current.netIncome >= 0 ? "bg-[var(--accent-light)]" : "bg-[var(--red-light)]"} rounded-2xl p-3 text-center`}>
                <div className="text-xl mb-1">{data.current.netIncome >= 0 ? "🎉" : "😰"}</div>
                <p className="text-[10px] text-[var(--text-muted)] font-semibold">淨收入</p>
                <p className={`text-base font-bold ${data.current.netIncome >= 0 ? "text-[var(--accent)]" : "text-[var(--red)]"}`}>
                  {formatMoney(data.current.netIncome)}
                </p>
                <div className="mt-1">
                  <ChangeTag percent={data.netChange} />
                </div>
                <p className="text-[10px] text-[var(--text-muted)] mt-1">前期 {formatMoney(data.previous.netIncome)}</p>
              </div>
            </div>
          </div>

          {/* Detail comparison */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Income */}
            <div className="card">
              <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-[var(--green-light)] flex items-center justify-center text-xs">💰</span>
                收入明細
              </h3>
              {data.groupChanges.filter((g) => g.direction === "income").length === 0 ? (
                <div className="text-center py-4">
                  <div className="text-2xl mb-1">😶</div>
                  <p className="text-xs text-[var(--text-muted)]">本期沒有收入紀錄</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {data.groupChanges
                    .filter((g) => g.direction === "income")
                    .sort((a, b) => b.current - a.current)
                    .map((g) => (
                      <div key={g.group_name} className="flex items-center justify-between p-2 rounded-xl bg-[var(--bg)] transition-colors hover:bg-[var(--green-light)]">
                        <div>
                          <p className="text-sm font-semibold">{g.group_name}</p>
                          <p className="text-[10px] text-[var(--text-muted)]">前期 {formatMoney(g.previous)}</p>
                        </div>
                        <div className="text-right space-y-1">
                          <p className="text-sm font-bold">{formatMoney(g.current)}</p>
                          <ChangeTag percent={g.changePercent} />
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Expense */}
            <div className="card">
              <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-[var(--red-light)] flex items-center justify-center text-xs">🛒</span>
                支出明細
              </h3>
              {data.groupChanges.filter((g) => g.direction === "expense").length === 0 ? (
                <div className="text-center py-4">
                  <div className="text-2xl mb-1">🎊</div>
                  <p className="text-xs text-[var(--text-muted)]">本期零支出，太強了！</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {data.groupChanges
                    .filter((g) => g.direction === "expense")
                    .sort((a, b) => b.current - a.current)
                    .map((g) => (
                      <div key={g.group_name} className="flex items-center justify-between p-2 rounded-xl bg-[var(--bg)] transition-colors hover:bg-[var(--red-light)]">
                        <div>
                          <p className="text-sm font-semibold">{g.group_name}</p>
                          <p className="text-[10px] text-[var(--text-muted)]">前期 {formatMoney(g.previous)}</p>
                        </div>
                        <div className="text-right space-y-1">
                          <p className="text-sm font-bold">{formatMoney(g.current)}</p>
                          <ChangeTag percent={g.changePercent} inverse />
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>

          {/* Alerts */}
          {data.groupChanges.filter((g) => Math.abs(g.changePercent) > 15 && g.current > 0).length > 0 && (
            <div className="card !border-[var(--orange)] !border-opacity-50 !bg-[var(--orange-light)]">
              <h3 className="text-sm font-bold mb-2 flex items-center gap-2">
                ⚡ 異常波動提醒
              </h3>
              <div className="space-y-2">
                {data.groupChanges
                  .filter((g) => Math.abs(g.changePercent) > 15 && g.current > 0)
                  .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))
                  .map((g) => (
                    <div key={g.group_name} className="flex items-center gap-2 text-sm bg-white/60 rounded-xl p-2">
                      <span>{g.direction === "expense" ? "🛒" : "💰"}</span>
                      <span className="font-semibold">{g.group_name}</span>
                      <span className="text-[var(--text-muted)]">
                        {g.changePercent > 0 ? "增加" : "減少"} {Math.abs(g.changePercent).toFixed(1)}%
                      </span>
                      <span className="text-xs text-[var(--text-muted)]">
                        ({formatMoney(g.previous)} → {formatMoney(g.current)})
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
