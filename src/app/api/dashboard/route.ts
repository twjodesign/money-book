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

  return NextResponse.json({
    monthIncome,
    monthExpense,
    monthNet: monthIncome - monthExpense,
    topExpenses,
    months,
    recent,
  });
}
