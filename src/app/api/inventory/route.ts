import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, canAccessStore } from "@/lib/api-guard";

export async function PUT(req: NextRequest) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  const { storeId, yearMonth, beginInventory, endInventory } = await req.json();
  if (!storeId || !yearMonth) {
    return NextResponse.json({ error: "storeId and yearMonth are required" }, { status: 400 });
  }
  if (!canAccessStore(session, storeId)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  for (const [key, value] of Object.entries({ beginInventory, endInventory })) {
    if (typeof value !== "number" || Number.isNaN(value) || value < 0) {
      return NextResponse.json({ error: `${key} must be a non-negative number` }, { status: 400 });
    }
  }

  const record = await prisma.inventorySnapshot.upsert({
    where: { storeId_yearMonth: { storeId, yearMonth } },
    update: { beginInventory, endInventory },
    create: { storeId, yearMonth, beginInventory, endInventory },
  });

  return NextResponse.json(record);
}
