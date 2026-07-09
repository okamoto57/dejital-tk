"use client";

import { useState } from "react";
import { Lock } from "lucide-react";
import { BRAND } from "@/lib/theme";
import { Card, Field, useInputCls } from "./ui";

export function PasswordChangeForm({ userName, userEmail }: { userName: string; userEmail: string }) {
  const inputCls = useInputCls();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function submit() {
    setError(null);
    setSaved(false);
    if (newPassword !== confirmPassword) {
      setError("新しいパスワード(確認)が一致しません");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error ?? "変更に失敗しました");
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "変更に失敗しました");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card title="アカウント情報">
        <div className="text-sm">
          <div className="font-semibold">{userName}</div>
          <div className="text-xs text-slate-500">{userEmail}</div>
        </div>
      </Card>

      <Card
        title={
          <span className="flex items-center gap-1.5">
            <Lock size={15} /> パスワード変更
          </span>
        }
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="現在のパスワード">
            <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className={inputCls} />
          </Field>
          <Field label="新しいパスワード(8文字以上)">
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={inputCls} />
          </Field>
          <Field label="新しいパスワード(確認)">
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={inputCls} />
          </Field>
        </div>
        {error && (
          <p className="mt-2 text-xs font-semibold" style={{ color: BRAND.alert }}>
            {error}
          </p>
        )}
        {saved && !error && (
          <p className="mt-2 text-xs font-semibold" style={{ color: BRAND.green }}>
            パスワードを変更しました。
          </p>
        )}
        <button
          onClick={submit}
          disabled={submitting || !currentPassword || !newPassword}
          className="mt-3 rounded-xl px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
          style={{ backgroundColor: BRAND.blue }}
        >
          {submitting ? "変更中..." : "パスワードを変更する"}
        </button>
      </Card>
    </div>
  );
}
