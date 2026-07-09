import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, isHqAdmin } from "@/lib/api-guard";

export async function POST(req: NextRequest) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;
  if (!isHqAdmin(session)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { storeIds } = await req.json();
  if (!Array.isArray(storeIds) || storeIds.some((id) => typeof id !== "string")) {
    return NextResponse.json({ error: "storeIds must be an array of strings" }, { status: 400 });
  }

  await prisma.$transaction(storeIds.map((id: string, index: number) => prisma.store.update({ where: { id }, data: { sortOrder: index } })));

  return NextResponse.json({ ok: true });
}
