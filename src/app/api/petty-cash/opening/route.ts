import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, canAccessStore } from "@/lib/api-guard";

export async function PUT(req: NextRequest) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  const { storeId, yearMonth, opening } = await req.json();
  if (!storeId || !yearMonth || typeof opening !== "number" || Number.isNaN(opening)) {
    return NextResponse.json({ error: "storeId, yearMonth, opening(number) are required" }, { status: 400 });
  }
  if (!canAccessStore(session, storeId)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const record = await prisma.pettyCashOpening.upsert({
    where: { storeId_yearMonth: { storeId, yearMonth } },
    update: { opening },
    create: { storeId, yearMonth, opening },
  });

  return NextResponse.json(record);
}
