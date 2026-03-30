import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get("symbol")?.toUpperCase().trim();
  const type = searchParams.get("type") || "tw_stock";

  if (!symbol) return NextResponse.json({ name: "" });

  // TW stocks: try TWSE/TPEX first (returns Chinese name)
  if (type === "tw_stock") {
    try {
      const resp = await fetch(
        `https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=tse_${symbol}.tw_otc_${symbol}.tw&json=1&delay=0`,
        { headers: { Referer: "https://mis.twse.com.tw/" }, signal: AbortSignal.timeout(5000) }
      );
      const data = await resp.json();
      if (data.msgArray?.length > 0) {
        const n = data.msgArray[0].n;
        if (n) return NextResponse.json({ name: n });
      }
    } catch {}
  }

  // Yahoo Finance fallback (works for US stocks, TW stocks, crypto)
  const yahooSymbol =
    type === "tw_stock" ? `${symbol}.TW` :
    type === "crypto" ? `${symbol}-USD` :
    symbol;

  try {
    const resp = await fetch(
      `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(yahooSymbol)}&quotesCount=1&newsCount=0`,
      { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(5000) }
    );
    const data = await resp.json();
    const quote = data.quotes?.[0];
    if (quote) {
      const name = quote.shortname || quote.longname || "";
      if (name) return NextResponse.json({ name });
    }
  } catch {}

  return NextResponse.json({ name: "" });
}
