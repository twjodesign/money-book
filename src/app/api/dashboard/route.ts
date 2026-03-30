import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登入" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const accountId = searchParams.get("accountId");
  if (!accountId) return NextResponse.json({ error: "缺少 accountId" }, { status: 400 });

  const db = getDb();
  const account = db.prepare("SELECT * FROM accounts WHERE id = ? AND user_id = ?").get(accountId, session.userId);
  if (!account) return NextResponse.json({ error: "帳戶不存在" }, { status: 404 });

  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  // 本月收支
  const monthSummary = db.prepare(`
    SELECT direction, SUM(amount) as total
    FROM transactions
    WHERE account_id = ? AND date LIKE ?
    GROUP BY direction
  `).all(accountId, `${thisMonth}%`) as { direction: string; total: number }[];

  const monthIncome = monthSummary.find((s) => s.direction === "income")?.total || 0;
  const monthExpense = monthSummary.find((s) => s.direction === "expense")?.total || 0;

  // 本月各分類支出 TOP 5
  const topExpenses = db.prepare(`
    SELECT c.group_name, c.name, c.icon, SUM(t.amount) as total
    FROM transactions t
    JOIN categories c ON t.category_id = c.id
    WHERE t.account_id = ? AND t.date LIKE ? AND t.direction = 'expense'
    GROUP BY c.group_name, c.name, c.icon
    ORDER BY total DESC
    LIMIT 5
  `).all(accountId, `${thisMonth}%`);

  // 最近 6 個月趨勢
  const months: { month: string; income: number; expense: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const data = db.prepare(`
      SELECT direction, SUM(amount) as total
      FROM transactions
      WHERE account_id = ? AND date LIKE ?
      GROUP BY direction
    `).all(accountId, `${m}%`) as { direction: string; total: number }[];

    months.push({
      month: m,
      income: data.find((d) => d.direction === "income")?.total || 0,
      expense: data.find((d) => d.direction === "expense")?.total || 0,
    });
  }

  // 最近 10 筆
  const recent = db.prepare(`
    SELECT t.*, c.name as category_name, c.icon as category_icon, c.group_name
    FROM transactions t
    JOIN categories c ON t.category_id = c.id
    WHERE t.account_id = ?
    ORDER BY t.date DESC, t.created_at DESC
    LIMIT 10
  `).all(accountId);

  // === 資產總覽 ===

  // 銀行帳戶
  const bankAccounts = db.prepare(
    "SELECT name, bank_name, balance, icon FROM bank_accounts WHERE account_id = ? ORDER BY sort_order"
  ).all(accountId) as { name: string; bank_name: string; balance: number; icon: string }[];
  const totalCash = bankAccounts.reduce((s, b) => s + b.balance, 0);

  // 投資
  const investAccounts = db.prepare(`
    SELECT ia.id, ia.name, ia.type,
      COALESCE(SUM(h.quantity * h.avg_cost), 0) as total_cost,
      COALESCE(SUM(h.quantity * h.current_price), 0) as total_value
    FROM invest_accounts ia
    LEFT JOIN holdings h ON h.invest_account_id = ia.id
    WHERE ia.account_id = ?
    GROUP BY ia.id
  `).all(accountId) as { id: string; name: string; type: string; total_cost: number; total_value: number }[];
  const totalInvestCost = investAccounts.reduce((s, a) => s + a.total_cost, 0);
  const totalInvestValue = investAccounts.reduce((s, a) => s + a.total_value, 0);

  // 房地產
  const properties = db.prepare(
    "SELECT name, market_value, cash_paid, loan_amount, monthly_payment, monthly_rent, purpose FROM properties WHERE account_id = ?"
  ).all(accountId) as { name: string; market_value: number; cash_paid: number; loan_amount: number; monthly_payment: number; monthly_rent: number; purpose: string }[];
  const totalPropertyValue = properties.reduce((s, p) => s + p.market_value, 0);
  const totalPropertyEquity = properties.reduce((s, p) => s + p.cash_paid, 0);
  const totalLoan = properties.reduce((s, p) => s + p.loan_amount, 0);
  const totalPropertyCashFlow = properties.reduce((s, p) => s + p.monthly_rent - p.monthly_payment, 0);

  // 夢想儲蓄
  const dreams = db.prepare(
    "SELECT name, icon, target_amount, current_amount, category FROM dreams WHERE account_id = ?"
  ).all(accountId) as { name: string; icon: string; target_amount: number; current_amount: number; category: string }[];
  const totalDreamTarget = dreams.reduce((s, d) => s + d.target_amount, 0);
  const totalDreamSaved = dreams.reduce((s, d) => s + d.current_amount, 0);

  // 總資產 = 現金 + 投資市值 + 房產淨值
  const totalAssets = totalCash + totalInvestValue + totalPropertyEquity;

  return NextResponse.json({
    monthIncome,
    monthExpense,
    monthNet: monthIncome - monthExpense,
    topExpenses,
    months,
    recent,
    // 資產總覽
    assets: {
      totalAssets,
      cash: { total: totalCash, accounts: bankAccounts },
      invest: { cost: totalInvestCost, value: totalInvestValue, accounts: investAccounts },
      property: { value: totalPropertyValue, equity: totalPropertyEquity, loan: totalLoan, cashFlow: totalPropertyCashFlow, items: properties },
      dreams: { target: totalDreamTarget, saved: totalDreamSaved, items: dreams },
    },
  });
}
