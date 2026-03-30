import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { v4 as uuid } from "uuid";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登入" }, { status: 401 });

  const db = getDb();
  const accounts = db.prepare("SELECT * FROM accounts WHERE user_id = ? ORDER BY created_at").all(session.userId);
  return NextResponse.json(accounts);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登入" }, { status: 401 });

  const { name, type, company_name } = await req.json();
  if (!name || !type) return NextResponse.json({ error: "缺少名稱或類型" }, { status: 400 });

  const db = getDb();
  const id = uuid();
  db.prepare("INSERT INTO accounts (id, user_id, name, type, company_name) VALUES (?, ?, ?, ?, ?)").run(
    id, session.userId, name, type, company_name || null
  );

  return NextResponse.json({ id, name, type, company_name });
}
