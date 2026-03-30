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

  const investAccounts = db.prepare(
    "SELECT * FROM invest_accounts WHERE account_id = ? ORDER BY created_at"
  ).all(accountId) as { id: string; account_id: string; name: string; type: string; broker: string; note: string; created_at: string }[];

  const holdingsStmt = db.prepare("SELECT * FROM holdings WHERE invest_account_id = ? ORDER BY symbol");

  const result = investAccounts.map((ia) => ({
    ...ia,
    holdings: holdingsStmt.all(ia.id),
  }));

  return NextResponse.json(result);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登入" }, { status: 401 });

  const { account_id, name, type, broker, note } = await req.json();
  if (!account_id || !name || !type) {
    return NextResponse.json({ error: "缺少必填欄位" }, { status: 400 });
  }

  const db = getDb();
  const account = db.prepare("SELECT id FROM accounts WHERE id = ? AND user_id = ?").get(account_id, session.userId);
  if (!account) return NextResponse.json({ error: "帳戶不存在" }, { status: 404 });

  const id = uuid();
  db.prepare(
    "INSERT INTO invest_accounts (id, account_id, name, type, broker, note) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(id, account_id, name, type, broker || "", note || "");

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
    SELECT ia.id FROM invest_accounts ia
    JOIN accounts a ON ia.account_id = a.id
    WHERE ia.id = ? AND a.user_id = ?
  `).get(id, session.userId);
  if (!item) return NextResponse.json({ error: "不存在" }, { status: 404 });

  const del = db.transaction(() => {
    db.prepare("DELETE FROM holdings WHERE invest_account_id = ?").run(id);
    db.prepare("DELETE FROM invest_accounts WHERE id = ?").run(id);
  });
  del();

  return NextResponse.json({ ok: true });
}
