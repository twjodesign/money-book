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

  const items = db.prepare(`
    SELECT d.*,
      (SELECT COUNT(*) FROM dream_deposits dd WHERE dd.dream_id = d.id) as deposit_count,
      (SELECT COALESCE(SUM(dd.amount), 0) FROM dream_deposits dd WHERE dd.dream_id = d.id) as deposit_sum
    FROM dreams d
    WHERE d.account_id = ?
    ORDER BY d.created_at
  `).all(accountId);

  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登入" }, { status: 401 });

  const { account_id, name, icon, target_amount, target_date, category, note } = await req.json();
  if (!account_id || !name) {
    return NextResponse.json({ error: "缺少必填欄位" }, { status: 400 });
  }

  const db = getDb();
  const account = db.prepare("SELECT id FROM accounts WHERE id = ? AND user_id = ?").get(account_id, session.userId);
  if (!account) return NextResponse.json({ error: "帳戶不存在" }, { status: 404 });

  const id = uuid();
  db.prepare(`
    INSERT INTO dreams (id, account_id, name, icon, target_amount, target_date, category, note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, account_id, name, icon || "✨", target_amount || 0, target_date || null, category || "other", note || "");

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
    SELECT d.id FROM dreams d
    JOIN accounts a ON d.account_id = a.id
    WHERE d.id = ? AND a.user_id = ?
  `).get(id, session.userId);
  if (!item) return NextResponse.json({ error: "不存在" }, { status: 404 });

  const del = db.transaction(() => {
    db.prepare("DELETE FROM dream_deposits WHERE dream_id = ?").run(id);
    db.prepare("DELETE FROM dreams WHERE id = ?").run(id);
  });
  del();

  return NextResponse.json({ ok: true });
}
