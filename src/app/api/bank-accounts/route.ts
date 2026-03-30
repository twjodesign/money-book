import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { v4 as uuid } from "uuid";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登入" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const accountId = searchParams.get("accountId");
  if (!accountId) return NextResponse.json({ error: "缺少 accountId" }, { status: 400 });

  const db = getDb();
  const account = db.prepare("SELECT id FROM accounts WHERE id = ? AND user_id = ?").get(accountId, session.userId);
  if (!account) return NextResponse.json({ error: "帳戶不存在" }, { status: 404 });

  const items = db.prepare(
    "SELECT * FROM bank_accounts WHERE account_id = ? ORDER BY sort_order, created_at"
  ).all(accountId);

  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登入" }, { status: 401 });

  const { account_id, name, bank_name, balance, icon, note } = await req.json();
  if (!account_id || !name || !bank_name) {
    return NextResponse.json({ error: "缺少必填欄位" }, { status: 400 });
  }

  const db = getDb();
  const account = db.prepare("SELECT id FROM accounts WHERE id = ? AND user_id = ?").get(account_id, session.userId);
  if (!account) return NextResponse.json({ error: "帳戶不存在" }, { status: 404 });

  const id = uuid();
  db.prepare(
    "INSERT INTO bank_accounts (id, account_id, name, bank_name, balance, icon, note) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(id, account_id, name, bank_name, balance || 0, icon || "🏦", note || "");

  return NextResponse.json({ id });
}

export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登入" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "缺少 id" }, { status: 400 });

  const db = getDb();
  const item = db.prepare(`
    SELECT b.id FROM bank_accounts b
    JOIN accounts a ON b.account_id = a.id
    WHERE b.id = ? AND a.user_id = ?
  `).get(id, session.userId);
  if (!item) return NextResponse.json({ error: "不存在" }, { status: 404 });

  db.prepare("DELETE FROM bank_accounts WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登入" }, { status: 401 });

  const { id, balance, name, bank_name, icon } = await req.json();
  if (!id) return NextResponse.json({ error: "缺少 id" }, { status: 400 });

  const db = getDb();
  const item = db.prepare(`
    SELECT b.id FROM bank_accounts b
    JOIN accounts a ON b.account_id = a.id
    WHERE b.id = ? AND a.user_id = ?
  `).get(id, session.userId);
  if (!item) return NextResponse.json({ error: "不存在" }, { status: 404 });

  const sets: string[] = [];
  const params: (string | number)[] = [];

  if (balance !== undefined) { sets.push("balance = ?"); params.push(balance); }
  if (name !== undefined) { sets.push("name = ?"); params.push(name); }
  if (bank_name !== undefined) { sets.push("bank_name = ?"); params.push(bank_name); }
  if (icon !== undefined) { sets.push("icon = ?"); params.push(icon); }

  if (sets.length === 0) return NextResponse.json({ error: "沒有要更新的欄位" }, { status: 400 });

  params.push(id);
  db.prepare(`UPDATE bank_accounts SET ${sets.join(", ")} WHERE id = ?`).run(...params);

  return NextResponse.json({ ok: true });
}
