"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error);
      return;
    }

    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--bg)]">
      <div className="card w-full max-w-sm animate-in">
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">🐷</div>
          <h1 className="text-2xl font-bold text-[var(--accent)]">MoneyBook</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">小豬記帳本～歡迎回來 🎉</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">📧 Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="your@email.com" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">🔑 密碼</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="輸入密碼" />
          </div>

          {error && (
            <div className="bg-[var(--red-light)] text-[var(--red)] text-sm p-3 rounded-xl font-semibold flex items-center gap-2">
              😅 {error}
            </div>
          )}

          <button type="submit" className="btn-primary w-full !text-base" disabled={loading}>
            {loading ? "登入中... 🐷" : "登入 →"}
          </button>
        </form>

        <p className="text-center text-sm mt-5 text-[var(--text-muted)]">
          還沒有帳號？{" "}
          <a href="/register" className="text-[var(--accent)] font-bold hover:underline">
            來註冊吧 ✨
          </a>
        </p>
      </div>
    </div>
  );
}
