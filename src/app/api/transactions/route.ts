import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { v4 as uuid } from "uuid";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登入" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const accountId = searchParams.get("accountId");
  const month = searchParams.get("month"); // YYYY-MM
  const limit = parseInt(searchParams.get("limit") || "50");

  if (!accountId) return NextResponse.json({ error: "缺少 accountId" }, { status: 400 });

  const db = getDb();
  // verify ownership
  const account = db.prepare("SELECT id FROM accounts WHERE id = ? AND user_id = ?").get(accountId, session.userId);
  if (!account) return NextResponse.json({ error: "帳戶不存在" }, { status: 404 });

  let query = `
    SELECT t.*, c.name as category_name, c.icon as category_icon, c.group_name
    FROM transactions t
    JOIN categories c ON t.category_id = c.id
    WHERE t.account_id = ?
  `;
  const params: (string | number)[] = [accountId];

  if (month) {
    query += " AND t.date LIKE ?";
    params.push(`${month}%`);
  }

  query += " ORDER BY t.date DESC, t.created_at DESC LIMIT ?";
  params.push(limit);

  const transactions = db.prepare(query).all(...params);
  return NextResponse.json(transactions);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登入" }, { status: 401 });

  const { account_id, category_id, direction, amount, title, note, date } = await req.json();
  if (!account_id || !category_id || !direction || !amount || !date) {
    return NextResponse.json({ error: "缺少必填欄位" }, { status: 400 });
  }

  const db = getDb();
  const account = db.prepare("SELECT id FROM accounts WHERE id = ? AND user_id = ?").get(account_id, session.userId);
  if (!account) return NextResponse.json({ error: "帳戶不存在" }, { status: 404 });

  const id = uuid();
  db.prepare(
    "INSERT INTO transactions (id, account_id, category_id, direction, amount, title, note, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(id, account_id, category_id, direction, amount, title || "", note || "", date);

  return NextResponse.json({ id });
}

export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登入" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "缺少 id" }, { status: 400 });

  const db = getDb();
  const tx = db.prepare(`
    SELECT t.id FROM transactions t
    JOIN accounts a ON t.account_id = a.id
    WHERE t.id = ? AND a.user_id = ?
  `).get(id, session.userId);
  if (!tx) return NextResponse.json({ error: "紀錄不存在" }, { status: 404 });

  db.prepare("DELETE FROM transactions WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
