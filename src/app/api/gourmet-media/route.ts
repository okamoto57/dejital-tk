import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, canAccessStore } from "@/lib/api-guard";

export async function PUT(req: NextRequest) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  const { storeId, yearMonth, mediaName, cost, revenue, guests, score } = await req.json();
  if (!storeId || !yearMonth || !mediaName) {
    return NextResponse.json({ error: "storeId, yearMonth, mediaName are required" }, { status: 400 });
  }
  if (!canAccessStore(session, storeId)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const record = await prisma.gourmetMediaRecord.upsert({
    where: { storeId_yearMonth_mediaName: { storeId, yearMonth, mediaName } },
    update: { cost: Number(cost) || 0, revenue: Number(revenue) || 0, guests: Number(guests) || 0, score: Number(score) || 0 },
    create: {
      storeId,
      yearMonth,
      mediaName,
      cost: Number(cost) || 0,
      revenue: Number(revenue) || 0,
      guests: Number(guests) || 0,
      score: Number(score) || 0,
    },
  });

  return NextResponse.json(record);
}
