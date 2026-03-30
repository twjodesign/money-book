import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { v4 as uuid } from "uuid";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登入" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const investAccountId = searchParams.get("invest_account_id");
  if (!investAccountId) return NextResponse.json({ error: "缺少 invest_account_id" }, { status: 400 });

  const db = getDb();
  // verify ownership: invest_accounts → accounts → user_id
  const owner = db.prepare(`
    SELECT ia.id FROM invest_accounts ia
    JOIN accounts a ON ia.account_id = a.id
    WHERE ia.id = ? AND a.user_id = ?
  `).get(investAccountId, session.userId);
  if (!owner) return NextResponse.json({ error: "投資帳戶不存在" }, { status: 404 });

  const items = db.prepare(
    "SELECT * FROM holdings WHERE invest_account_id = ? ORDER BY symbol"
  ).all(investAccountId);

  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登入" }, { status: 401 });

  const { invest_account_id, symbol, name, quantity, avg_cost, current_price, currency, note } = await req.json();
  if (!invest_account_id || !symbol || !name) {
    return NextResponse.json({ error: "缺少必填欄位" }, { status: 400 });
  }

  const db = getDb();
  const owner = db.prepare(`
    SELECT ia.id FROM invest_accounts ia
    JOIN accounts a ON ia.account_id = a.id
    WHERE ia.id = ? AND a.user_id = ?
  `).get(invest_account_id, session.userId);
  if (!owner) return NextResponse.json({ error: "投資帳戶不存在" }, { status: 404 });

  const id = uuid();
  db.prepare(`
    INSERT INTO holdings (id, invest_account_id, symbol, name, quantity, avg_cost, current_price, currency, note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, invest_account_id, symbol, name, quantity || 0, avg_cost || 0, current_price || 0, currency || "TWD", note || "");

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
    SELECT h.id FROM holdings h
    JOIN invest_accounts ia ON h.invest_account_id = ia.id
    JOIN accounts a ON ia.account_id = a.id
    WHERE h.id = ? AND a.user_id = ?
  `).get(id, session.userId);
  if (!item) return NextResponse.json({ error: "不存在" }, { status: 404 });

  db.prepare("DELETE FROM holdings WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登入" }, { status: 401 });

  const { id, current_price } = await req.json();
  if (!id || current_price === undefined) {
    return NextResponse.json({ error: "缺少 id 或 current_price" }, { status: 400 });
  }

  const db = getDb();
  const item = db.prepare(`
    SELECT h.id FROM holdings h
    JOIN invest_accounts ia ON h.invest_account_id = ia.id
    JOIN accounts a ON ia.account_id = a.id
    WHERE h.id = ? AND a.user_id = ?
  `).get(id, session.userId);
  if (!item) return NextResponse.json({ error: "不存在" }, { status: 404 });

  db.prepare("UPDATE holdings SET current_price = ?, updated_at = datetime('now') WHERE id = ?").run(current_price, id);
  return NextResponse.json({ ok: true });
}
