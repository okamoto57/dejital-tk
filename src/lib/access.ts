import { prisma } from "./prisma";
import type { Session } from "next-auth";

export async function getAccessibleStores(session: Session) {
  if (session.user.role === "HQ_ADMIN") {
    return prisma.store.findMany({ orderBy: { name: "asc" } });
  }
  if (!session.user.storeId) return [];
  const store = await prisma.store.findUnique({ where: { id: session.user.storeId } });
  return store ? [store] : [];
}

/** Resolves which store the current request should operate on, enforcing that
 * STORE_MANAGER users can never view another store regardless of query params. */
export function resolveStoreId(
  session: Session,
  requestedStoreId: string | undefined,
  accessibleStoreIds: string[]
): string | null {
  if (session.user.role === "STORE_MANAGER") {
    return session.user.storeId ?? null;
  }
  if (requestedStoreId && accessibleStoreIds.includes(requestedStoreId)) {
    return requestedStoreId;
  }
  return accessibleStoreIds[0] ?? null;
}
