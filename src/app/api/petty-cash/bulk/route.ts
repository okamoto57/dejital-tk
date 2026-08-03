import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, canAccessStore } from "@/lib/api-guard";
import { isFoodCategory } from "@/lib/theme";

export async function POST(req: NextRequest) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  const body = await req.json();
  const { storeId, entries } = body;
  if (!storeId || !Array.isArray(entries)) return NextResponse.json({ error: 'invalid' }, { status: 400 });
  if (!canAccessStore(session, storeId)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  try {
    const created = [];
    for (const e of entries) {
      const { date, category, inout, amount, payee, note } = e;
      if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) continue;
      if (inout !== 'IN' && inout !== 'OUT') continue;
      const parsedDate = new Date(date);
      if (Number.isNaN(parsedDate.getTime())) continue;
      const row = await prisma.pettyCashEntry.create({
        data: {
          storeId,
          date: parsedDate,
          category,
          inout,
          amount,
          payee: payee || 'ー',
          note: note || '',
          isFood: isFoodCategory(category),
        },
      });
      created.push(row);
      if (inout === 'OUT') {
        await prisma.receiptHistory.create({ data: { storeId, parsedDate, amount, payee: payee || 'ー', note: note || '', category } });
      }
    }

    return NextResponse.json({ created });
  } catch (e) {
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }
}
