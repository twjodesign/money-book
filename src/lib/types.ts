export type AccountType = "personal" | "business";
export type Direction = "income" | "expense";

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface Account {
  id: string;
  user_id: string;
  name: string;
  type: AccountType;
  company_name?: string;
  created_at: string;
}

export interface Category {
  id: string;
  account_type: AccountType;
  direction: Direction;
  group_name: string;
  name: string;
  icon: string;
  sort_order: number;
}

export interface Transaction {
  id: string;
  account_id: string;
  category_id: string;
  direction: Direction;
  amount: number;
  note: string;
  date: string;
  created_at: string;
  // joined fields
  category_name?: string;
  category_icon?: string;
  group_name?: string;
}

export interface Recurring {
  id: string;
  account_id: string;
  category_id: string;
  direction: Direction;
  amount: number;
  note: string;
  day_of_month: number;
  active: number;
  created_at: string;
  // joined
  category_name?: string;
  category_icon?: string;
  group_name?: string;
}

export interface PeriodSummary {
  period: string;
  label: string;
  totalIncome: number;
  totalExpense: number;
  netIncome: number;
  groups: GroupSummary[];
}

export interface GroupSummary {
  group_name: string;
  direction: Direction;
  total: number;
  items: { name: string; icon: string; total: number }[];
}

export interface PeriodComparison {
  current: PeriodSummary;
  previous: PeriodSummary;
  incomeChange: number;
  expenseChange: number;
  netChange: number;
  groupChanges: {
    group_name: string;
    direction: Direction;
    current: number;
    previous: number;
    changePercent: number;
  }[];
}
