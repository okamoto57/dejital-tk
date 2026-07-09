import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, canAccessStore } from "@/lib/api-guard";

export async function PUT(req: NextRequest) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  const { storeId, yearMonth, source, score, scorePrev, reviews, reviewsDelta, extra } = await req.json();
  if (!storeId || !yearMonth || !source) {
    return NextResponse.json({ error: "storeId, yearMonth, source are required" }, { status: 400 });
  }
  if (source !== "GOOGLE" && source !== "TABELOG" && source !== "DAZHONG") {
    return NextResponse.json({ error: "source must be GOOGLE, TABELOG, or DAZHONG" }, { status: 400 });
  }
  if (!canAccessStore(session, storeId)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const data = {
    score: Number(score) || 0,
    scorePrev: Number(scorePrev) || 0,
    reviews: Number(reviews) || 0,
    reviewsDelta: Number(reviewsDelta) || 0,
    extra: JSON.stringify(extra ?? {}),
  };

  const record = await prisma.reputationSnapshot.upsert({
    where: { storeId_yearMonth_source: { storeId, yearMonth, source } },
    update: data,
    create: { storeId, yearMonth, source, ...data },
  });

  return NextResponse.json(record);
}
