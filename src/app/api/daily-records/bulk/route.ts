import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, canAccessStore } from "@/lib/api-guard";

interface DayInput {
  date: string;
  actualSales?: number;
  foodCost?: number;
  laborCost?: number;
  customers?: number;
  // updatedAt the client last saw for this day (null if the day had no
  // existing record yet). Used for optimistic-concurrency conflict detection.
  expectedUpdatedAt?: string | null;
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

  const prepared: { date: string; data: Record<string, number> }[] = [];
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
    prepared.push({ date: day.date, data });
  }

  if (prepared.length === 0) {
    return NextResponse.json({ error: "no rows with data to save" }, { status: 400 });
  }

  const expectedByDate = new Map(days.map((d) => [d.date, d.expectedUpdatedAt ?? null]));

  // Fetch every existing row for the affected dates in one query instead of
  // one round-trip per day — 30+ sequential round-trips inside an
  // interactive transaction was slow enough to blow Prisma's transaction
  // timeout and 500 the whole request.
  const existingRows = await prisma.dailyRecord.findMany({
    where: { storeId, date: { in: prepared.map((d) => new Date(d.date)) } },
  });
  const existingByDate = new Map(existingRows.map((r) => [r.date.toISOString().slice(0, 10), r]));

  const conflicts: string[] = [];
  const toWrite: typeof prepared = [];
  for (const day of prepared) {
    const existing = existingByDate.get(day.date);
    const currentUpdatedAt = existing ? existing.updatedAt.toISOString() : null;
    const staleBaseline = currentUpdatedAt !== (expectedByDate.get(day.date) ?? null);
    // A stale baseline alone isn't necessarily a real conflict — only flag
    // it if applying our (only the fields we actually typed) write would
    // discard a value someone else set that differs from ours.
    const wouldChangeData =
      !existing || Object.entries(day.data).some(([key, value]) => existing[key as keyof typeof existing] !== value);
    if (staleBaseline && wouldChangeData) {
      // Someone else saved this day since we loaded it — skip rather than
      // silently overwrite their edit, and report it back to the client.
      conflicts.push(day.date);
      continue;
    }
    toWrite.push(day);
  }

  const rows =
    toWrite.length > 0
      ? await prisma.$transaction(
          toWrite.map((day) =>
            prisma.dailyRecord.upsert({
              where: { storeId_date: { storeId, date: new Date(day.date) } },
              update: day.data,
              create: { storeId, date: new Date(day.date), ...day.data },
            })
          )
        )
      : [];

  const updated = rows.map((row, i) => ({ date: toWrite[i].date, updatedAt: row.updatedAt.toISOString() }));

  return NextResponse.json({ ok: true, count: updated.length, conflicts, updated });
}
