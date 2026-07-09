import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, canAccessStore } from "@/lib/api-guard";

export async function POST(req: NextRequest) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  const body = await req.json();
  const { storeId, date, actualSales, foodCost, laborCost, customers } = body;

  if (!storeId || !date) {
    return NextResponse.json({ error: "storeId and date are required" }, { status: 400 });
  }
  if (!canAccessStore(session, storeId)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // Only fields the caller actually provided are written, so entering just one
  // metric (e.g. only labor cost) never clobbers other, previously-saved metrics.
  const data: Record<string, number | null> = {};
  for (const [key, value] of Object.entries({ actualSales, foodCost, laborCost })) {
    if (value === undefined) continue;
    if (typeof value !== "number" || Number.isNaN(value) || value < 0) {
      return NextResponse.json({ error: `${key} must be a non-negative number` }, { status: 400 });
    }
    data[key] = value;
  }
  if (customers !== undefined) {
    data.customers = typeof customers === "number" ? customers : null;
  }

  const record = await prisma.dailyRecord.upsert({
    where: { storeId_date: { storeId, date: new Date(date) } },
    update: data,
    create: { storeId, date: new Date(date), ...data },
  });

  return NextResponse.json(record);
}

export async function DELETE(req: NextRequest) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  const { id } = await req.json();
  const record = await prisma.dailyRecord.findUnique({ where: { id } });
  if (!record) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!canAccessStore(session, record.storeId)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  await prisma.dailyRecord.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
