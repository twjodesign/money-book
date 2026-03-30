import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { hashPassword, createSession } from "@/lib/auth";
import { v4 as uuid } from "uuid";

export async function POST(req: Request) {
  const { email, password, name } = await req.json();
  if (!email || !password || !name) {
    return NextResponse.json({ error: "缺少必填欄位" }, { status: 400 });
  }

  const db = getDb();
  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (existing) {
    return NextResponse.json({ error: "此信箱已註冊" }, { status: 409 });
  }

  const userId = uuid();
  const passwordHash = hashPassword(password);
  db.prepare("INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)").run(
    userId, email, passwordHash, name
  );

  // 自動建一個個人帳戶
  const personalId = uuid();
  db.prepare("INSERT INTO accounts (id, user_id, name, type) VALUES (?, ?, ?, ?)").run(
    personalId, userId, `${name}的個人帳戶`, "personal"
  );

  const token = createSession(userId);
  const res = NextResponse.json({ ok: true, userId, accountId: personalId });
  res.cookies.set("session", token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  });
  return res;
}
