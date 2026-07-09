import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    role: "HQ_ADMIN" | "STORE_MANAGER";
    storeId: string | null;
  }

  interface Session {
    user: {
      id: string;
      role: "HQ_ADMIN" | "STORE_MANAGER";
      storeId: string | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: "HQ_ADMIN" | "STORE_MANAGER";
    storeId: string | null;
  }
}
