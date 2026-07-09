import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, canAccessStore } from "@/lib/api-guard";

export async function PUT(req: NextRequest) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  const { storeId, yearMonth, platform, metrics } = await req.json();
  if (!storeId || !yearMonth || !platform || typeof metrics !== "object") {
    return NextResponse.json({ error: "storeId, yearMonth, platform, metrics are required" }, { status: 400 });
  }
  if (!canAccessStore(session, storeId)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const record = await prisma.snsMetric.upsert({
    where: { storeId_yearMonth_platform: { storeId, yearMonth, platform } },
    update: { metrics: JSON.stringify(metrics) },
    create: { storeId, yearMonth, platform, metrics: JSON.stringify(metrics) },
  });

  return NextResponse.json(record);
}
