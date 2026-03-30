import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { v4 as uuid } from "uuid";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登入" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const dreamId = searchParams.get("dream_id");
  if (!dreamId) return NextResponse.json({ error: "缺少 dream_id" }, { status: 400 });

  const db = getDb();
  // verify ownership: dreams → accounts → user_id
  const owner = db.prepare(`
    SELECT d.id FROM dreams d
    JOIN accounts a ON d.account_id = a.id
    WHERE d.id = ? AND a.user_id = ?
  `).get(dreamId, session.userId);
  if (!owner) return NextResponse.json({ error: "夢想帳戶不存在" }, { status: 404 });

  const deposits = db.prepare(
    "SELECT * FROM dream_deposits WHERE dream_id = ? ORDER BY date DESC, created_at DESC"
  ).all(dreamId);

  return NextResponse.json(deposits);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登入" }, { status: 401 });

  const { dream_id, amount, note, date } = await req.json();
  if (!dream_id || !amount || !date) {
    return NextResponse.json({ error: "缺少必填欄位" }, { status: 400 });
  }

  const db = getDb();
  // verify ownership
  const owner = db.prepare(`
    SELECT d.id FROM dreams d
    JOIN accounts a ON d.account_id = a.id
    WHERE d.id = ? AND a.user_id = ?
  `).get(dream_id, session.userId);
  if (!owner) return NextResponse.json({ error: "夢想帳戶不存在" }, { status: 404 });

  const id = uuid();
  const run = db.transaction(() => {
    db.prepare(
      "INSERT INTO dream_deposits (id, dream_id, amount, note, date) VALUES (?, ?, ?, ?, ?)"
    ).run(id, dream_id, amount, note || "", date);

    db.prepare(
      "UPDATE dreams SET current_amount = current_amount + ? WHERE id = ?"
    ).run(amount, dream_id);
  });
  run();

  return NextResponse.json({ id });
}
