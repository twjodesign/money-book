"use client";

import { useState, useEffect } from "react";
import { useApp } from "@/components/AppShell";

interface Holding {
  id: string;
  invest_account_id: string;
  symbol: string;
  name: string;
  quantity: number;
  avg_cost: number;
  current_price: number;
  purchase_date: string | null;
}

interface InvestAccount {
  id: string;
  account_id: string;
  name: string;
  type: "tw_stock" | "us_stock" | "crypto";
  broker: string;
  created_at: string;
  holdings?: Holding[];
}

function fmt(n: number): string {
  return "$" + Math.abs(n).toLocaleString("zh-TW", { maximumFractionDigits: 0 });
}

const TYPE_MAP: Record<string, { label: string; emoji: string; tagClass: string }> = {
  tw_stock: { label: "台股", emoji: "🇹🇼", tagClass: "tag-red" },
  us_stock: { label: "美股", emoji: "🇺🇸", tagClass: "tag-blue" },
  crypto: { label: "加密貨幣", emoji: "🪙", tagClass: "tag-purple" },
};

export default function InvestmentsPage() {
  const { currentAccount } = useApp();
  const [investAccounts, setInvestAccounts] = useState<InvestAccount[]>([]);
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [addHoldingFor, setAddHoldingFor] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState("");

  // Account form
  const [acctName, setAcctName] = useState("");
  const [acctType, setAcctType] = useState<"tw_stock" | "us_stock" | "crypto">("tw_stock");
  const [acctBroker, setAcctBroker] = useState("");
  const [savingAcct, setSavingAcct] = useState(false);

  // Holding form
  const [hSymbol, setHSymbol] = useState("");
  const [hName, setHName] = useState("");
  const [hLookingUp, setHLookingUp] = useState(false);
  const [hTotalCost, setHTotalCost] = useState(""); // 購買總額
  const [hAvgCost, setHAvgCost] = useState("");     // 單價
  const [hQuantity, setHQuantity] = useState("");   // 數量 (auto-calc)
  const [hCurrentPrice, setHCurrentPrice] = useState("");
  const [hPurchaseDate, setHPurchaseDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [savingHolding, setSavingHolding] = useState(false);

  async function loadAll() {
    if (!currentAccount) return;
    const accts: InvestAccount[] = await fetch(`/api/invest-accounts?accountId=${currentAccount.id}`).then((r) => r.json());
    const withHoldings = await Promise.all(
      accts.map(async (a) => {
        const holdings: Holding[] = await fetch(`/api/holdings?invest_account_id=${a.id}`).then((r) => r.json());
        return { ...a, holdings };
      })
    );
    setInvestAccounts(withHoldings);
  }

  useEffect(() => { loadAll(); }, [currentAccount]);

  // Grand totals
  let grandCost = 0, grandMarket = 0;
  investAccounts.forEach((a) => {
    (a.holdings || []).forEach((h) => {
      grandCost += h.quantity * h.avg_cost;
      grandMarket += h.quantity * h.current_price;
    });
  });
  const grandPnL = grandMarket - grandCost;
  const grandReturn = grandCost > 0 ? (grandPnL / grandCost * 100) : 0;

  // Get holding form's account type for symbol lookup
  function getHoldingAcctType() {
    if (!addHoldingFor) return "tw_stock";
    return investAccounts.find((a) => a.id === addHoldingFor)?.type || "tw_stock";
  }

  async function lookupSymbol(symbol: string) {
    if (!symbol.trim()) return;
    const type = getHoldingAcctType();
    setHLookingUp(true);
    try {
      const res = await fetch(`/api/stock-lookup?symbol=${encodeURIComponent(symbol)}&type=${type}`);
      const data = await res.json();
      if (data.name) setHName(data.name);
    } finally {
      setHLookingUp(false);
    }
  }

  // Auto-calc quantity when total or avg_cost changes
  function handleTotalCostChange(val: string) {
    setHTotalCost(val);
    const total = parseFloat(val);
    const price = parseFloat(hAvgCost);
    if (!isNaN(total) && !isNaN(price) && price > 0) {
      setHQuantity((total / price).toFixed(4).replace(/\.?0+$/, ""));
    }
  }

  function handleAvgCostChange(val: string) {
    setHAvgCost(val);
    const total = parseFloat(hTotalCost);
    const price = parseFloat(val);
    if (!isNaN(total) && !isNaN(price) && price > 0) {
      setHQuantity((total / price).toFixed(4).replace(/\.?0+$/, ""));
    }
  }

  function handleQuantityChange(val: string) {
    setHQuantity(val);
    const qty = parseFloat(val);
    const price = parseFloat(hAvgCost);
    if (!isNaN(qty) && !isNaN(price) && price > 0) {
      setHTotalCost((qty * price).toFixed(0));
    }
  }

  async function handleSaveAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!acctName || !acctBroker || !currentAccount) return;
    setSavingAcct(true);
    await fetch("/api/invest-accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ account_id: currentAccount.id, name: acctName, type: acctType, broker: acctBroker }),
    });
    setAcctName(""); setAcctType("tw_stock"); setAcctBroker("");
    setSavingAcct(false); setShowAccountForm(false);
    setShowSuccess("投資帳戶新增成功！");
    setTimeout(() => setShowSuccess(""), 2000);
    await loadAll();
  }

  async function handleDeleteAccount(id: string) {
    if (!confirm("確定刪除這個投資帳戶嗎？（持股也會一起刪除）")) return;
    await fetch(`/api/invest-accounts?id=${id}`, { method: "DELETE" });
    await loadAll();
  }

  async function handleSaveHolding(e: React.FormEvent) {
    e.preventDefault();
    if (!hSymbol || !hName || !hQuantity || !hAvgCost || !hCurrentPrice || !addHoldingFor) return;
    setSavingHolding(true);
    await fetch("/api/holdings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        invest_account_id: addHoldingFor,
        symbol: hSymbol.toUpperCase(),
        name: hName,
        quantity: parseFloat(hQuantity),
        avg_cost: parseFloat(hAvgCost),
        current_price: parseFloat(hCurrentPrice),
        purchase_date: hPurchaseDate || null,
      }),
    });
    setHSymbol(""); setHName(""); setHTotalCost(""); setHAvgCost(""); setHQuantity(""); setHCurrentPrice("");
    setHPurchaseDate(new Date().toISOString().slice(0, 10));
    setSavingHolding(false); setAddHoldingFor(null);
    setShowSuccess("持股新增成功！");
    setTimeout(() => setShowSuccess(""), 2000);
    await loadAll();
  }

  async function handleDeleteHolding(id: string) {
    if (!confirm("確定刪除這筆持股嗎？")) return;
    await fetch(`/api/holdings?id=${id}`, { method: "DELETE" });
    await loadAll();
  }

  async function handleUpdatePrice(holdingId: string, newPrice: string) {
    const price = parseFloat(newPrice);
    if (isNaN(price) || price <= 0) return;
    await fetch(`/api/holdings?id=${holdingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ current_price: price }),
    });
    await loadAll();
  }

  return (
    <div className="space-y-5 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">📈 投資帳戶</h2>
          <p className="text-sm text-[var(--text-muted)] mt-1">追蹤你的股票與加密貨幣～</p>
        </div>
        <button className="btn-primary text-sm" onClick={() => setShowAccountForm(!showAccountForm)}>
          {showAccountForm ? "取消" : "➕ 新增帳戶"}
        </button>
      </div>

      {/* Success toast */}
      {showSuccess && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[var(--green)] text-white px-6 py-3 rounded-2xl font-bold text-sm shadow-lg animate-in">
          {showSuccess}
        </div>
      )}

      {/* Grand total */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card !border-[var(--accent)] !border-opacity-40 text-center">
          <p className="text-[10px] text-[var(--text-muted)] font-semibold">💰 總成本</p>
          <p className="text-lg font-bold text-[var(--text)]">{fmt(grandCost)}</p>
        </div>
        <div className="card !border-[var(--blue)] !border-opacity-40 text-center">
          <p className="text-[10px] text-[var(--text-muted)] font-semibold">📊 總市值</p>
          <p className="text-lg font-bold text-[var(--blue)]">{fmt(grandMarket)}</p>
        </div>
        <div className="card !border-[var(--green)] !border-opacity-40 text-center">
          <p className="text-[10px] text-[var(--text-muted)] font-semibold">📈 總報酬</p>
          <p className={`text-lg font-bold ${grandPnL >= 0 ? "text-[var(--green)]" : "text-[var(--red)]"}`}>
            {grandPnL >= 0 ? "+" : "-"}{fmt(grandPnL)}
          </p>
          <p className={`text-[10px] font-semibold ${grandReturn >= 0 ? "text-[var(--green)]" : "text-[var(--red)]"}`}>
            {grandReturn >= 0 ? "+" : ""}{grandReturn.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Add account form */}
      {showAccountForm && (
        <div className="card animate-in">
          <h3 className="text-sm font-bold mb-3">🆕 新增投資帳戶</h3>
          <form onSubmit={handleSaveAccount} className="space-y-4">
            <div>
              <label className="block text-xs text-[var(--text-muted)] font-semibold mb-2">類型</label>
              <div className="flex gap-2 bg-[var(--bg)] p-1 rounded-2xl">
                {(["tw_stock", "us_stock", "crypto"] as const).map((t) => {
                  const info = TYPE_MAP[t];
                  return (
                    <button key={t} type="button"
                      className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${acctType === t ? "bg-[var(--accent)] text-white shadow-md" : "text-[var(--text-muted)]"}`}
                      onClick={() => setAcctType(t)}>
                      {info.emoji} {info.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[var(--text-muted)] font-semibold mb-1">📋 帳戶名稱</label>
                <input type="text" value={acctName} onChange={(e) => setAcctName(e.target.value)} placeholder="台股主帳戶" required />
              </div>
              <div>
                <label className="block text-xs text-[var(--text-muted)] font-semibold mb-1">🏢 券商/交易所</label>
                <input type="text" value={acctBroker} onChange={(e) => setAcctBroker(e.target.value)} placeholder="元大證券" required />
              </div>
            </div>
            <button type="submit" className="btn-primary w-full" disabled={savingAcct}>
              {savingAcct ? "新增中..." : "新增投資帳戶 📈"}
            </button>
          </form>
        </div>
      )}

      {/* Account sections */}
      {investAccounts.map((acct) => {
        const info = TYPE_MAP[acct.type] || TYPE_MAP.tw_stock;
        const holdings = acct.holdings || [];
        let acctCost = 0, acctMarket = 0;
        holdings.forEach((h) => { acctCost += h.quantity * h.avg_cost; acctMarket += h.quantity * h.current_price; });
        const acctPnL = acctMarket - acctCost;
        const acctReturn = acctCost > 0 ? (acctPnL / acctCost * 100) : 0;

        return (
          <div key={acct.id} className="card !rounded-2xl">
            {/* Account header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--accent-light)] flex items-center justify-center text-lg">
                  {info.emoji}
                </div>
                <div>
                  <p className="text-sm font-bold">{acct.name}</p>
                  <p className="text-[10px] text-[var(--text-muted)]">{acct.broker}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`tag ${info.tagClass}`}>{info.label}</span>
                <button onClick={() => setAddHoldingFor(addHoldingFor === acct.id ? null : acct.id)} className="btn-outline !py-1 !px-2 text-xs">
                  ➕ 持股
                </button>
                <button onClick={() => handleDeleteAccount(acct.id)} className="text-xs p-1 hover:text-[var(--red)] transition-opacity">
                  🗑️
                </button>
              </div>
            </div>

            {/* Account subtotals */}
            <div className="grid grid-cols-3 gap-2 text-center mb-3">
              <div className="bg-[var(--bg)] rounded-xl p-2">
                <p className="text-[10px] text-[var(--text-muted)] font-semibold">成本</p>
                <p className="text-xs font-bold">{fmt(acctCost)}</p>
              </div>
              <div className="bg-[var(--bg)] rounded-xl p-2">
                <p className="text-[10px] text-[var(--text-muted)] font-semibold">市值</p>
                <p className="text-xs font-bold text-[var(--blue)]">{fmt(acctMarket)}</p>
              </div>
              <div className="bg-[var(--bg)] rounded-xl p-2">
                <p className="text-[10px] text-[var(--text-muted)] font-semibold">報酬</p>
                <p className={`text-xs font-bold ${acctPnL >= 0 ? "text-[var(--green)]" : "text-[var(--red)]"}`}>
                  {acctPnL >= 0 ? "+" : "-"}{fmt(acctPnL)} ({acctReturn >= 0 ? "+" : ""}{acctReturn.toFixed(1)}%)
                </p>
              </div>
            </div>

            {/* Add holding form */}
            {addHoldingFor === acct.id && (
              <div className="bg-[var(--bg)] rounded-xl p-3 mb-3 animate-in">
                <h4 className="text-xs font-bold mb-3">🆕 新增持股</h4>
                <form onSubmit={handleSaveHolding} className="space-y-3">
                  {/* Symbol + Name */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-[var(--text-muted)] font-semibold mb-1">
                        股票代號 {hLookingUp && <span className="text-[var(--accent)]">查詢中...</span>}
                      </label>
                      <input
                        type="text"
                        value={hSymbol}
                        onChange={(e) => setHSymbol(e.target.value)}
                        onBlur={(e) => lookupSymbol(e.target.value)}
                        placeholder={acct.type === "tw_stock" ? "2330" : acct.type === "us_stock" ? "NVDA" : "BTC"}
                        required
                        className="!text-xs !py-2 uppercase"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-[var(--text-muted)] font-semibold mb-1">股票名稱</label>
                      <input
                        type="text"
                        value={hName}
                        onChange={(e) => setHName(e.target.value)}
                        placeholder={acct.type === "tw_stock" ? "台積電" : "NVIDIA"}
                        required
                        className="!text-xs !py-2"
                      />
                    </div>
                  </div>

                  {/* Total cost + Unit price + Quantity */}
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] text-[var(--text-muted)] font-semibold mb-1">購買總額</label>
                      <input
                        type="number"
                        value={hTotalCost}
                        onChange={(e) => handleTotalCostChange(e.target.value)}
                        placeholder="100000"
                        className="!text-xs !py-2"
                        step="any"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-[var(--text-muted)] font-semibold mb-1">單價/均價</label>
                      <input
                        type="number"
                        value={hAvgCost}
                        onChange={(e) => handleAvgCostChange(e.target.value)}
                        placeholder="850"
                        required
                        className="!text-xs !py-2"
                        step="any"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-[var(--text-muted)] font-semibold mb-1">數量（自動）</label>
                      <input
                        type="number"
                        value={hQuantity}
                        onChange={(e) => handleQuantityChange(e.target.value)}
                        placeholder="117"
                        required
                        className="!text-xs !py-2"
                        step="any"
                      />
                    </div>
                  </div>

                  {/* Current price + Purchase date */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-[var(--text-muted)] font-semibold mb-1">現在股價</label>
                      <input
                        type="number"
                        value={hCurrentPrice}
                        onChange={(e) => setHCurrentPrice(e.target.value)}
                        placeholder="920"
                        required
                        className="!text-xs !py-2"
                        step="any"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-[var(--text-muted)] font-semibold mb-1">📅 購買日期</label>
                      <input
                        type="date"
                        value={hPurchaseDate}
                        onChange={(e) => setHPurchaseDate(e.target.value)}
                        className="!text-xs !py-2"
                      />
                    </div>
                  </div>

                  {/* P&L preview */}
                  {hQuantity && hAvgCost && hCurrentPrice && (
                    <div className="bg-white rounded-lg p-2 text-center">
                      {(() => {
                        const qty = parseFloat(hQuantity);
                        const cost = parseFloat(hAvgCost);
                        const cur = parseFloat(hCurrentPrice);
                        if (isNaN(qty) || isNaN(cost) || isNaN(cur)) return null;
                        const pnl = (cur - cost) * qty;
                        const pct = cost > 0 ? ((cur - cost) / cost * 100) : 0;
                        return (
                          <p className={`text-xs font-bold ${pnl >= 0 ? "text-[var(--green)]" : "text-[var(--red)]"}`}>
                            預估盈虧：{pnl >= 0 ? "+" : "-"}{fmt(pnl)} ({pct >= 0 ? "+" : ""}{pct.toFixed(1)}%)
                          </p>
                        );
                      })()}
                    </div>
                  )}

                  <button type="submit" className="btn-primary w-full !py-2 text-xs" disabled={savingHolding}>
                    {savingHolding ? "新增中..." : "新增持股 📊"}
                  </button>
                </form>
              </div>
            )}

            {/* Holdings list */}
            {holdings.length > 0 ? (
              <div className="space-y-2">
                {holdings.map((h) => {
                  const cost = h.quantity * h.avg_cost;
                  const market = h.quantity * h.current_price;
                  const pnl = market - cost;
                  const returnPct = cost > 0 ? (pnl / cost * 100) : 0;
                  return (
                    <div key={h.id} className="bg-[var(--bg)] rounded-xl p-3 group">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-xs font-bold">{h.symbol}</p>
                            <p className="text-xs text-[var(--text-muted)]">{h.name}</p>
                            {h.purchase_date && (
                              <p className="text-[10px] text-[var(--text-muted)] bg-[var(--border)] rounded-full px-2 py-0.5">
                                {h.purchase_date.slice(0, 7)}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-[10px] text-[var(--text-muted)]">
                            <span>{h.quantity} 股</span>
                            <span>均價 {fmt(h.avg_cost)}</span>
                            <span className="flex items-center gap-1">
                              現價{" "}
                              <input
                                type="number"
                                defaultValue={h.current_price}
                                onBlur={(e) => handleUpdatePrice(h.id, e.target.value)}
                                className="!inline !w-20 !py-0 !px-1 !text-[10px] !border !rounded-lg !bg-transparent"
                                step="any"
                              />
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <div className="text-right">
                            <p className="text-xs font-bold text-[var(--blue)]">{fmt(market)}</p>
                            <p className={`text-[10px] font-semibold ${pnl >= 0 ? "text-[var(--green)]" : "text-[var(--red)]"}`}>
                              {pnl >= 0 ? "+" : "-"}{fmt(pnl)} ({returnPct >= 0 ? "+" : ""}{returnPct.toFixed(1)}%)
                            </p>
                          </div>
                          <button onClick={() => handleDeleteHolding(h.id)} className="opacity-0 group-hover:opacity-100 text-xs p-1 hover:text-[var(--red)] transition-opacity">
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-[var(--text-muted)] text-center py-2">尚無持股，點「➕ 持股」新增</p>
            )}
          </div>
        );
      })}

      {investAccounts.length === 0 && !showAccountForm && (
        <div className="card text-center py-8">
          <div className="text-4xl mb-2">📈</div>
          <p className="text-sm text-[var(--text-muted)]">還沒有投資帳戶</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">點右上角「新增帳戶」開始追蹤投資</p>
        </div>
      )}
    </div>
  );
}
