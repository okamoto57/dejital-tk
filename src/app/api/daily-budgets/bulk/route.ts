import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, canAccessStore } from "@/lib/api-guard";

interface DayBudgetInput {
  date: string;
  budgetSales: number;
  laborBudget: number;
  // updatedAt the client last saw for this day (null if the day had no
  // existing record yet). Used for optimistic-concurrency conflict detection.
  expectedUpdatedAt?: string | null;
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

  // Fetch every existing row for the affected dates in one query instead of
  // one round-trip per day — 30+ sequential round-trips inside an
  // interactive transaction was slow enough to blow Prisma's transaction
  // timeout and 500 the whole request.
  const existingRows = await prisma.dailyRecord.findMany({
    where: { storeId, date: { in: days.map((d) => new Date(d.date)) } },
  });
  const existingByDate = new Map(existingRows.map((r) => [r.date.toISOString().slice(0, 10), r]));

  const conflicts: string[] = [];
  const toWrite: DayBudgetInput[] = [];
  for (const d of days) {
    const existing = existingByDate.get(d.date);
    const currentUpdatedAt = existing ? existing.updatedAt.toISOString() : null;
    const staleBaseline = currentUpdatedAt !== (d.expectedUpdatedAt ?? null);
    // The budget grid always resubmits all 30 days, even ones the user
    // never touched, so a stale baseline alone isn't necessarily a real
    // conflict — only flag it if applying this write would actually
    // discard a value someone else set that differs from ours.
    const wouldChangeData = !existing || existing.budgetSales !== d.budgetSales || existing.laborBudget !== d.laborBudget;
    if (staleBaseline && wouldChangeData) {
      conflicts.push(d.date);
      continue;
    }
    toWrite.push(d);
  }

  const rows =
    toWrite.length > 0
      ? await prisma.$transaction(
          toWrite.map((d) =>
            prisma.dailyRecord.upsert({
              where: { storeId_date: { storeId, date: new Date(d.date) } },
              update: { budgetSales: d.budgetSales, laborBudget: d.laborBudget },
              create: { storeId, date: new Date(d.date), budgetSales: d.budgetSales, laborBudget: d.laborBudget },
            })
          )
        )
      : [];

  const updated = rows.map((row, i) => ({ date: toWrite[i].date, updatedAt: row.updatedAt.toISOString() }));

  return NextResponse.json({ ok: true, count: updated.length, conflicts, updated });
}
