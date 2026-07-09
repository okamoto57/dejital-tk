import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/api-guard";

export async function POST(req: NextRequest) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  const { currentPassword, newPassword } = await req.json();
  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "現在のパスワードと新しいパスワードを入力してください" }, { status: 400 });
  }
  if (typeof newPassword !== "string" || newPassword.length < 8) {
    return NextResponse.json({ error: "新しいパスワードは8文字以上で入力してください" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) {
    return NextResponse.json({ error: "ユーザーが見つかりません" }, { status: 404 });
  }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "現在のパスワードが正しくありません" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

  return NextResponse.json({ ok: true });
}
