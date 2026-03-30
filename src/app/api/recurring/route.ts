import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { v4 as uuid } from "uuid";

// 列出固定收支
export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登入" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const accountId = searchParams.get("accountId");
  if (!accountId) return NextResponse.json({ error: "缺少 accountId" }, { status: 400 });

  const db = getDb();
  const account = db.prepare("SELECT id FROM accounts WHERE id = ? AND user_id = ?").get(accountId, session.userId);
  if (!account) return NextResponse.json({ error: "帳戶不存在" }, { status: 404 });

  const items = db.prepare(`
    SELECT r.*, c.name as category_name, c.icon as category_icon, c.group_name
    FROM recurring r
    JOIN categories c ON r.category_id = c.id
    WHERE r.account_id = ?
    ORDER BY r.direction, r.day_of_month
  `).all(accountId);

  return NextResponse.json(items);
}

// 新增固定收支
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登入" }, { status: 401 });

  const { account_id, category_id, direction, amount, note, day_of_month } = await req.json();
  if (!account_id || !category_id || !direction || !amount) {
    return NextResponse.json({ error: "缺少必填欄位" }, { status: 400 });
  }

  const db = getDb();
  const account = db.prepare("SELECT id FROM accounts WHERE id = ? AND user_id = ?").get(account_id, session.userId);
  if (!account) return NextResponse.json({ error: "帳戶不存在" }, { status: 404 });

  const id = uuid();
  db.prepare(
    "INSERT INTO recurring (id, account_id, category_id, direction, amount, note, day_of_month) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(id, account_id, category_id, direction, amount, note || "", day_of_month || 1);

  return NextResponse.json({ id });
}

// 刪除固定收支
export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登入" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "缺少 id" }, { status: 400 });

  const db = getDb();
  const item = db.prepare(`
    SELECT r.id FROM recurring r
    JOIN accounts a ON r.account_id = a.id
    WHERE r.id = ? AND a.user_id = ?
  `).get(id, session.userId);
  if (!item) return NextResponse.json({ error: "不存在" }, { status: 404 });

  db.prepare("DELETE FROM recurring_log WHERE recurring_id = ?").run(id);
  db.prepare("DELETE FROM recurring WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
