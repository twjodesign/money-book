import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import type { PeriodSummary, PeriodComparison, GroupSummary } from "@/lib/types";

function getQuarterRange(year: number, quarter: number): [string, string] {
  const startMonth = (quarter - 1) * 3 + 1;
  const endMonth = startMonth + 2;
  const start = `${year}-${String(startMonth).padStart(2, "0")}-01`;
  const endDate = new Date(year, endMonth, 0);
  const end = `${year}-${String(endMonth).padStart(2, "0")}-${endDate.getDate()}`;
  return [start, end];
}

function getHalfYearRange(year: number, half: number): [string, string] {
  if (half === 1) return [`${year}-01-01`, `${year}-06-30`];
  return [`${year}-07-01`, `${year}-12-31`];
}

function getYearRange(year: number): [string, string] {
  return [`${year}-01-01`, `${year}-12-31`];
}

function getPeriodLabel(type: string, year: number, period: number): string {
  if (type === "quarter") return `${year} Q${period}`;
  if (type === "half") return `${year} H${period}`;
  return `${year}`;
}

function computeSummary(db: ReturnType<typeof getDb>, accountId: string, start: string, end: string, label: string): PeriodSummary {
  const rows = db.prepare(`
    SELECT c.group_name, c.name, c.icon, t.direction, SUM(t.amount) as total
    FROM transactions t
    JOIN categories c ON t.category_id = c.id
    WHERE t.account_id = ? AND t.date >= ? AND t.date <= ?
    GROUP BY c.group_name, c.name, c.icon, t.direction
    ORDER BY t.direction, c.group_name, c.name
  `).all(accountId, start, end) as {
    group_name: string; name: string; icon: string; direction: string; total: number;
  }[];

  let totalIncome = 0;
  let totalExpense = 0;
  const groupMap = new Map<string, GroupSummary>();

  for (const row of rows) {
    if (row.direction === "income") totalIncome += row.total;
    else totalExpense += row.total;

    const key = `${row.direction}:${row.group_name}`;
    if (!groupMap.has(key)) {
      groupMap.set(key, {
        group_name: row.group_name,
        direction: row.direction as "income" | "expense",
        total: 0,
        items: [],
      });
    }
    const group = groupMap.get(key)!;
    group.total += row.total;
    group.items.push({ name: row.name, icon: row.icon, total: row.total });
  }

  return {
    period: `${start}~${end}`,
    label,
    totalIncome,
    totalExpense,
    netIncome: totalIncome - totalExpense,
    groups: Array.from(groupMap.values()),
  };
}

function calcChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登入" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const accountId = searchParams.get("accountId");
  const type = searchParams.get("type") || "quarter"; // quarter | half | year
  const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()));
  const period = parseInt(searchParams.get("period") || "1");

  if (!accountId) return NextResponse.json({ error: "缺少 accountId" }, { status: 400 });

  const db = getDb();
  const account = db.prepare("SELECT id FROM accounts WHERE id = ? AND user_id = ?").get(accountId, session.userId);
  if (!account) return NextResponse.json({ error: "帳戶不存在" }, { status: 404 });

  let currentRange: [string, string];
  let prevRange: [string, string];
  let currentLabel: string;
  let prevLabel: string;

  if (type === "quarter") {
    currentRange = getQuarterRange(year, period);
    currentLabel = getPeriodLabel("quarter", year, period);
    if (period === 1) {
      prevRange = getQuarterRange(year - 1, 4);
      prevLabel = getPeriodLabel("quarter", year - 1, 4);
    } else {
      prevRange = getQuarterRange(year, period - 1);
      prevLabel = getPeriodLabel("quarter", year, period - 1);
    }
  } else if (type === "half") {
    currentRange = getHalfYearRange(year, period);
    currentLabel = getPeriodLabel("half", year, period);
    if (period === 1) {
      prevRange = getHalfYearRange(year - 1, 2);
      prevLabel = getPeriodLabel("half", year - 1, 2);
    } else {
      prevRange = getHalfYearRange(year, 1);
      prevLabel = getPeriodLabel("half", year, 1);
    }
  } else {
    currentRange = getYearRange(year);
    currentLabel = getPeriodLabel("year", year, 0);
    prevRange = getYearRange(year - 1);
    prevLabel = getPeriodLabel("year", year - 1, 0);
  }

  const current = computeSummary(db, accountId, currentRange[0], currentRange[1], currentLabel);
  const previous = computeSummary(db, accountId, prevRange[0], prevRange[1], prevLabel);

  // group-level changes
  const allGroups = new Set([
    ...current.groups.map((g) => `${g.direction}:${g.group_name}`),
    ...previous.groups.map((g) => `${g.direction}:${g.group_name}`),
  ]);

  const groupChanges = Array.from(allGroups).map((key) => {
    const [dir, gname] = key.split(":");
    const cur = current.groups.find((g) => g.direction === dir && g.group_name === gname);
    const prev = previous.groups.find((g) => g.direction === dir && g.group_name === gname);
    return {
      group_name: gname,
      direction: dir as "income" | "expense",
      current: cur?.total || 0,
      previous: prev?.total || 0,
      changePercent: calcChange(cur?.total || 0, prev?.total || 0),
    };
  });

  const comparison: PeriodComparison = {
    current,
    previous,
    incomeChange: calcChange(current.totalIncome, previous.totalIncome),
    expenseChange: calcChange(current.totalExpense, previous.totalExpense),
    netChange: calcChange(current.netIncome, previous.netIncome),
    groupChanges,
  };

  return NextResponse.json(comparison);
}
