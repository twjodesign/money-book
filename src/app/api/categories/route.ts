import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const accountType = searchParams.get("type") || "personal";

  const db = getDb();
  const categories = db.prepare(
    "SELECT * FROM categories WHERE account_type = ? ORDER BY direction, sort_order"
  ).all(accountType);

  return NextResponse.json(categories);
}
