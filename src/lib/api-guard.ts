import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import type { Session } from "next-auth";

export async function requireSession(): Promise<Session | NextResponse> {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return session;
}

export function canAccessStore(session: Session, storeId: string): boolean {
  if (session.user.role === "HQ_ADMIN") return true;
  return session.user.storeId === storeId;
}

export function isHqAdmin(session: Session): boolean {
  return session.user.role === "HQ_ADMIN";
}
