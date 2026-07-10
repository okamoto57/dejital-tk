import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, canAccessStore } from "@/lib/api-guard";

export async function PUT(req: NextRequest) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  const { storeId, yearMonth, groups, fee } = await req.json();
  if (!storeId || !yearMonth) {
    return NextResponse.json({ error: "storeId and yearMonth are required" }, { status: 400 });
  }
  if (!canAccessStore(session, storeId)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const record = await prisma.prCampaignRecord.upsert({
    where: { storeId_yearMonth: { storeId, yearMonth } },
    update: { groups: Number(groups) || 0, fee: Number(fee) || 0 },
    create: { storeId, yearMonth, groups: Number(groups) || 0, fee: Number(fee) || 0 },
  });

  return NextResponse.json(record);
}
