"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name }),
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
          <div className="text-5xl mb-3">🎉</div>
          <h1 className="text-2xl font-bold text-[var(--accent)]">加入 MoneyBook</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">讓小豬幫你管好錢錢 🐷💰</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">😊 你的名字</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required placeholder="怎麼稱呼你？" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">📧 Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="your@email.com" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">🔑 設定密碼</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} placeholder="至少 6 個字元" />
          </div>

          {error && (
            <div className="bg-[var(--red-light)] text-[var(--red)] text-sm p-3 rounded-xl font-semibold flex items-center gap-2">
              😅 {error}
            </div>
          )}

          <button type="submit" className="btn-primary w-full !text-base" disabled={loading}>
            {loading ? "建立中... ✨" : "開始記帳 🐷"}
          </button>
        </form>

        <p className="text-center text-sm mt-5 text-[var(--text-muted)]">
          已經有帳號了？{" "}
          <a href="/login" className="text-[var(--accent)] font-bold hover:underline">
            登入 →
          </a>
        </p>
      </div>
    </div>
  );
}
