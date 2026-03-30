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
    "SELECT * FROM properties WHERE account_id = ? ORDER BY created_at"
  ).all(accountId);

  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登入" }, { status: 401 });

  const {
    account_id, name, address, purpose, market_value, cash_paid,
    loan_amount, loan_rate, loan_remaining_months, monthly_payment, monthly_rent, note
  } = await req.json();

  if (!account_id || !name) {
    return NextResponse.json({ error: "缺少必填欄位" }, { status: 400 });
  }

  const db = getDb();
  const account = db.prepare("SELECT id FROM accounts WHERE id = ? AND user_id = ?").get(account_id, session.userId);
  if (!account) return NextResponse.json({ error: "帳戶不存在" }, { status: 404 });

  const id = uuid();
  db.prepare(`
    INSERT INTO properties (id, account_id, name, address, purpose, market_value, cash_paid,
      loan_amount, loan_rate, loan_remaining_months, monthly_payment, monthly_rent, note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, account_id, name, address || "", purpose || "self",
    market_value || 0, cash_paid || 0, loan_amount || 0, loan_rate || 0,
    loan_remaining_months || 0, monthly_payment || 0, monthly_rent || 0, note || ""
  );

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
    SELECT p.id FROM properties p
    JOIN accounts a ON p.account_id = a.id
    WHERE p.id = ? AND a.user_id = ?
  `).get(id, session.userId);
  if (!item) return NextResponse.json({ error: "不存在" }, { status: 404 });

  db.prepare("DELETE FROM properties WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
