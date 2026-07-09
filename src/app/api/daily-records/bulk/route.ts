import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, canAccessStore } from "@/lib/api-guard";

interface DayInput {
  date: string;
  actualSales?: number;
  foodCost?: number;
  laborCost?: number;
  customers?: number;
}

export async function POST(req: NextRequest) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  const { storeId, days } = (await req.json()) as { storeId: string; days: DayInput[] };
  if (!storeId || !Array.isArray(days) || days.length === 0) {
    return NextResponse.json({ error: "storeId and a non-empty days array are required" }, { status: 400 });
  }
  if (!canAccessStore(session, storeId)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const ops = [];
  for (const day of days) {
    if (!day.date) continue;

    // Only fields actually provided are written, so a partially-filled row
    // never clobbers other metrics already saved for that date.
    const data: Record<string, number> = {};
    for (const [key, value] of Object.entries({
      actualSales: day.actualSales,
      foodCost: day.foodCost,
      laborCost: day.laborCost,
      customers: day.customers,
    })) {
      if (value === undefined) continue;
      if (typeof value !== "number" || Number.isNaN(value) || value < 0) {
        return NextResponse.json({ error: `${day.date}: ${key} must be a non-negative number` }, { status: 400 });
      }
      data[key] = value;
    }
    if (Object.keys(data).length === 0) continue;

    const date = new Date(day.date);
    ops.push(
      prisma.dailyRecord.upsert({
        where: { storeId_date: { storeId, date } },
        update: data,
        create: { storeId, date, ...data },
      })
    );
  }

  if (ops.length === 0) {
    return NextResponse.json({ error: "no rows with data to save" }, { status: 400 });
  }

  await prisma.$transaction(ops);

  return NextResponse.json({ ok: true, count: ops.length });
}
