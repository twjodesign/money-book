import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登入" }, { status: 401 });

  const db = getDb();
  const user = db.prepare("SELECT id, email, name FROM users WHERE id = ?").get(session.userId) as
    | { id: string; email: string; name: string }
    | undefined;
  if (!user) return NextResponse.json({ error: "用戶不存在" }, { status: 404 });

  const accounts = db.prepare("SELECT * FROM accounts WHERE user_id = ? ORDER BY created_at").all(session.userId);
  return NextResponse.json({ user, accounts });
}
