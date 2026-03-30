import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_PATH = path.join(process.cwd(), "data", "moneybook.db");

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    initSchema(db);
  }
  return db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    -- 用戶
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- 帳戶（個人/公司）
    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('personal', 'business')),
      company_name TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- 分類
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      account_type TEXT NOT NULL,
      direction TEXT NOT NULL CHECK(direction IN ('income', 'expense')),
      group_name TEXT NOT NULL,
      name TEXT NOT NULL,
      icon TEXT,
      sort_order INTEGER DEFAULT 0
    );

    -- 交易紀錄
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL REFERENCES accounts(id),
      category_id TEXT NOT NULL REFERENCES categories(id),
      direction TEXT NOT NULL CHECK(direction IN ('income', 'expense')),
      amount REAL NOT NULL,
      note TEXT,
      date TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- 索引
    CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(account_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
    CREATE INDEX IF NOT EXISTS idx_transactions_account_date ON transactions(account_id, date);
    CREATE INDEX IF NOT EXISTS idx_accounts_user ON accounts(user_id);
  `);

  // 初始化分類（如果空的）
  const count = db.prepare("SELECT COUNT(*) as c FROM categories").get() as { c: number };
  if (count.c === 0) {
    seedCategories(db);
  }
}

function seedCategories(db: Database.Database) {
  const insert = db.prepare(
    "INSERT INTO categories (id, account_type, direction, group_name, name, icon, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)"
  );

  const categories = [
    // === 個人 - 收入 ===
    ["p-inc-salary", "personal", "income", "薪資收入", "薪資", "💰", 1],
    ["p-inc-invest", "personal", "income", "投資收益", "投資收益", "📈", 2],
    ["p-inc-rent", "personal", "income", "租金收入", "租金收入", "🏠", 3],
    ["p-inc-side", "personal", "income", "副業收入", "接案/副業", "💼", 4],
    ["p-inc-other", "personal", "income", "其他收入", "其他收入", "💵", 5],

    // === 個人 - 房地產 ===
    ["p-exp-mortgage", "personal", "expense", "房地產", "房貸", "🏦", 10],
    ["p-exp-mgmt-fee", "personal", "expense", "房地產", "管理費", "🔧", 11],
    ["p-exp-repair", "personal", "expense", "房地產", "修繕費", "🛠️", 12],
    ["p-exp-house-tax", "personal", "expense", "房地產", "房屋稅/地價稅", "🏛️", 13],

    // === 個人 - 訂閱支出 ===
    ["p-exp-sub-stream", "personal", "expense", "訂閱支出", "串流服務", "📺", 20],
    ["p-exp-sub-soft", "personal", "expense", "訂閱支出", "軟體工具", "💻", 21],
    ["p-exp-sub-member", "personal", "expense", "訂閱支出", "會員", "🎫", 22],
    ["p-exp-sub-insure", "personal", "expense", "訂閱支出", "保險", "🛡️", 23],

    // === 個人 - 生活支出 ===
    ["p-exp-food", "personal", "expense", "生活支出", "飲食", "🍜", 30],
    ["p-exp-transport", "personal", "expense", "生活支出", "交通", "🚗", 31],
    ["p-exp-entertain", "personal", "expense", "生活支出", "娛樂", "🎮", 32],
    ["p-exp-medical", "personal", "expense", "生活支出", "醫療", "🏥", 33],
    ["p-exp-education", "personal", "expense", "生活支出", "教育/進修", "📚", 34],
    ["p-exp-misc", "personal", "expense", "生活支出", "雜支", "📎", 35],

    // === 公司 - 收入 ===
    ["b-inc-revenue", "business", "income", "營業收入", "營業收入", "💰", 1],
    ["b-inc-other", "business", "income", "業外收入", "業外收入", "💵", 2],
    ["b-inc-subsidy", "business", "income", "補助", "補助/獎勵金", "🎁", 3],

    // === 公司 - 支出 ===
    ["b-exp-salary", "business", "expense", "人事成本", "薪資", "👥", 10],
    ["b-exp-labor", "business", "expense", "人事成本", "勞健保", "🛡️", 11],
    ["b-exp-bonus", "business", "expense", "人事成本", "獎金", "🎊", 12],
    ["b-exp-office", "business", "expense", "辦公室", "租金/水電", "🏢", 20],
    ["b-exp-marketing", "business", "expense", "行銷", "行銷費用", "📣", 21],
    ["b-exp-software", "business", "expense", "工具", "軟體/訂閱", "💻", 22],
    ["b-exp-material", "business", "expense", "進貨", "原物料/進貨", "📦", 23],
    ["b-exp-travel", "business", "expense", "差旅", "交通/差旅", "✈️", 24],

    // === 公司 - 政府雜項 ===
    ["b-exp-vat", "business", "expense", "政府雜項", "營業稅", "🏛️", 30],
    ["b-exp-corp-tax", "business", "expense", "政府雜項", "營所稅", "🏛️", 31],
    ["b-exp-nhi2", "business", "expense", "政府雜項", "二代健保", "🏥", 32],
    ["b-exp-pension", "business", "expense", "政府雜項", "勞退提撥", "🏦", 33],
    ["b-exp-reg-fee", "business", "expense", "政府雜項", "登記/變更費", "📋", 34],
    ["b-exp-fine", "business", "expense", "政府雜項", "罰鍰/滯納金", "⚠️", 35],
    ["b-exp-gov-other", "business", "expense", "政府雜項", "其他規費", "📎", 36],
  ];

  const insertMany = db.transaction(() => {
    for (const cat of categories) {
      insert.run(...cat);
    }
  });
  insertMany();
}
