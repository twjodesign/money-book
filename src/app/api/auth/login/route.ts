import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { verifyPassword, createSession } from "@/lib/auth";

export async function POST(req: Request) {
  const { email, password } = await req.json();
  if (!email || !password) {
    return NextResponse.json({ error: "缺少必填欄位" }, { status: 400 });
  }

  const db = getDb();
  const user = db.prepare("SELECT id, password_hash, name FROM users WHERE email = ?").get(email) as
    | { id: string; password_hash: string; name: string }
    | undefined;

  if (!user || !verifyPassword(password, user.password_hash)) {
    return NextResponse.json({ error: "信箱或密碼錯誤" }, { status: 401 });
  }

  const token = createSession(user.id);
  const res = NextResponse.json({ ok: true, userId: user.id, name: user.name });
  res.cookies.set("session", token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  });
  return res;
}
