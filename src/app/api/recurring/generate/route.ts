import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { v4 as uuid } from "uuid";

// 產生當月固定收支（打開 Dashboard 時自動呼叫）
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登入" }, { status: 401 });

  const { account_id } = await req.json();
  if (!account_id) return NextResponse.json({ error: "缺少 account_id" }, { status: 400 });

  const db = getDb();
  const account = db.prepare("SELECT id FROM accounts WHERE id = ? AND user_id = ?").get(account_id, session.userId);
  if (!account) return NextResponse.json({ error: "帳戶不存在" }, { status: 404 });

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  // 取得所有啟用的固定收支
  const items = db.prepare(
    "SELECT * FROM recurring WHERE account_id = ? AND active = 1"
  ).all(account_id) as {
    id: string; category_id: string; direction: string;
    amount: number; title: string; note: string; day_of_month: number;
  }[];

  let generated = 0;

  const insertTx = db.prepare(
    "INSERT INTO transactions (id, account_id, category_id, direction, amount, title, note, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  );
  const insertLog = db.prepare(
    "INSERT INTO recurring_log (id, recurring_id, month, transaction_id) VALUES (?, ?, ?, ?)"
  );
  const checkLog = db.prepare(
    "SELECT id FROM recurring_log WHERE recurring_id = ? AND month = ?"
  );

  const run = db.transaction(() => {
    for (const item of items) {
      // 已經產生過就跳過
      const existing = checkLog.get(item.id, currentMonth);
      if (existing) continue;

      const txId = uuid();
      const day = Math.min(item.day_of_month, new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate());
      const date = `${currentMonth}-${String(day).padStart(2, "0")}`;

      insertTx.run(txId, account_id, item.category_id, item.direction, item.amount, item.title || "", `[固定] ${item.note}`, date);
      insertLog.run(uuid(), item.id, currentMonth, txId);
      generated++;
    }
  });

  run();

  return NextResponse.json({ generated, month: currentMonth });
}
