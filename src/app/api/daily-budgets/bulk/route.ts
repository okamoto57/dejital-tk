import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, canAccessStore } from "@/lib/api-guard";

interface DayBudgetInput {
  date: string;
  budgetSales: number;
  laborBudget: number;
}

export async function POST(req: NextRequest) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  const { storeId, days } = (await req.json()) as { storeId: string; days: DayBudgetInput[] };

  if (!storeId || !Array.isArray(days) || days.length === 0) {
    return NextResponse.json({ error: "storeId and a non-empty days array are required" }, { status: 400 });
  }
  if (!canAccessStore(session, storeId)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  for (const d of days) {
    if (!d.date || typeof d.budgetSales !== "number" || typeof d.laborBudget !== "number") {
      return NextResponse.json({ error: "each day requires date, budgetSales, laborBudget" }, { status: 400 });
    }
  }

  await prisma.$transaction(
    days.map((d) =>
      prisma.dailyRecord.upsert({
        where: { storeId_date: { storeId, date: new Date(d.date) } },
        update: { budgetSales: d.budgetSales, laborBudget: d.laborBudget },
        create: { storeId, date: new Date(d.date), budgetSales: d.budgetSales, laborBudget: d.laborBudget },
      })
    )
  );

  return NextResponse.json({ ok: true, count: days.length });
}
