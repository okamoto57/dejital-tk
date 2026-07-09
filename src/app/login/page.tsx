import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn } from "@/lib/auth";
import { BRAND } from "@/lib/theme";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const params = await searchParams;
  const callbackUrl = params.callbackUrl ?? "/dashboard";

  async function login(formData: FormData) {
    "use server";
    try {
      await signIn("credentials", {
        email: formData.get("email"),
        password: formData.get("password"),
        redirectTo: callbackUrl,
      });
    } catch (error) {
      if (error instanceof AuthError) {
        redirect(`/login?error=1&callbackUrl=${encodeURIComponent(callbackUrl)}`);
      }
      throw error;
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-xl font-black tracking-tight" style={{ color: BRAND.blue }}>
          デジタル・阪神TK
        </h1>
        <p className="mb-6 text-sm text-slate-500">店舗FL管理システムにログイン</p>

        <form action={login} className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-600">メールアドレス</span>
            <input
              name="email"
              type="email"
              required
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
              placeholder="you@example.com"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-600">パスワード</span>
            <input
              name="password"
              type="password"
              required
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
              placeholder="********"
            />
          </label>

          {params.error && (
            <p className="text-xs font-semibold" style={{ color: BRAND.alert }}>
              メールアドレスまたはパスワードが正しくありません。
            </p>
          )}

          <button
            type="submit"
            className="w-full rounded-xl py-2.5 text-sm font-bold text-white transition active:scale-95"
            style={{ backgroundColor: BRAND.blue }}
          >
            ログイン
          </button>
        </form>
      </div>
    </div>
  );
}
