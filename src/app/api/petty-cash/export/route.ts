import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { requireSession, canAccessStore } from "@/lib/api-guard";
import { monthRange } from "@/lib/store-data";

export async function GET(req: NextRequest) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  const storeId = req.nextUrl.searchParams.get("storeId");
  const yearMonth = req.nextUrl.searchParams.get("yearMonth");
  if (!storeId || !yearMonth) {
    return NextResponse.json({ error: "storeId and yearMonth are required" }, { status: 400 });
  }
  if (!canAccessStore(session, storeId)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { start, end } = monthRange(yearMonth);
  const entries = await prisma.pettyCashEntry.findMany({
    where: { storeId, date: { gte: start, lt: end } },
    orderBy: { date: "asc" },
  });

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("小口現金");

  sheet.columns = [
    { header: "日付", key: "date", width: 15 },
    { header: "科目", key: "category", width: 20 },
    { header: "区分", key: "inout", width: 8 },
    { header: "金額", key: "amount", width: 12 },
    { header: "支払先", key: "payee", width: 24 },
    { header: "摘要", key: "note", width: 32 },
    { header: "F食材", key: "isFood", width: 10 },
  ];

  entries.forEach((entry) => {
    sheet.addRow({
      date: entry.date.toISOString().slice(0, 10),
      category: entry.category,
      inout: entry.inout,
      amount: entry.amount,
      payee: entry.payee,
      note: entry.note,
      isFood: entry.isFood ? "はい" : "いいえ",
    });
  });

  sheet.getRow(1).font = { bold: true };
  sheet.getColumn("amount").numFmt = "#,##0";

  const buffer = await workbook.xlsx.writeBuffer();
  const fileName = `pettycash-${yearMonth}.xlsx`;

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
