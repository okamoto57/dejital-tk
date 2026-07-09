import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, isHqAdmin } from "@/lib/api-guard";
import { TYPE_PROFILE, type StoreType } from "@/lib/theme";

const VALID_TYPES = Object.keys(TYPE_PROFILE) as StoreType[];

export async function POST(req: NextRequest) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;
  if (!isHqAdmin(session)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { name, code, type } = await req.json();
  if (!name || !code || !VALID_TYPES.includes(type)) {
    return NextResponse.json({ error: "name, code, and a valid type are required" }, { status: 400 });
  }

  const profile = TYPE_PROFILE[type as StoreType];
  const store = await prisma.store.create({
    data: { name, code, type, targetF: profile.targetF, targetL: profile.targetL },
  });

  return NextResponse.json(store);
}

export async function PUT(req: NextRequest) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;
  if (!isHqAdmin(session)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id, name, code, type, targetF, targetL } = await req.json();
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const store = await prisma.store.update({
    where: { id },
    data: {
      ...(name ? { name } : {}),
      ...(code ? { code } : {}),
      ...(type && VALID_TYPES.includes(type) ? { type } : {}),
      ...(typeof targetF === "number" ? { targetF } : {}),
      ...(typeof targetL === "number" ? { targetL } : {}),
    },
  });

  return NextResponse.json(store);
}

export async function DELETE(req: NextRequest) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;
  if (!isHqAdmin(session)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id } = await req.json();
  await prisma.store.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
