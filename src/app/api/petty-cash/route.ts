import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, canAccessStore } from "@/lib/api-guard";
import { isFoodCategory } from "@/lib/theme";

export async function POST(req: NextRequest) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  const body = await req.json();
  const { storeId, date, category, inout, amount, payee, note } = body;

  if (!storeId || !date || !category || !inout) {
    return NextResponse.json({ error: "storeId, date, category, inout are required" }, { status: 400 });
  }
  if (!canAccessStore(session, storeId)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (typeof amount !== "number" || Number.isNaN(amount) || amount <= 0) {
    return NextResponse.json({ error: "amount must be a positive number" }, { status: 400 });
  }
  if (inout !== "IN" && inout !== "OUT") {
    return NextResponse.json({ error: "inout must be IN or OUT" }, { status: 400 });
  }

  const entry = await prisma.pettyCashEntry.create({
    data: {
      storeId,
      date: new Date(date),
      category,
      inout,
      amount,
      payee: payee || "ー",
      note: note || "",
      isFood: isFoodCategory(category),
    },
  });

  return NextResponse.json(entry);
}

export async function DELETE(req: NextRequest) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  const { id } = await req.json();
  const entry = await prisma.pettyCashEntry.findUnique({ where: { id } });
  if (!entry) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!canAccessStore(session, entry.storeId)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  await prisma.pettyCashEntry.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
