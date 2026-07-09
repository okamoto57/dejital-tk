import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const STORES = [
  "みなと軒 三宮高架下店",
  "麺道 しゅはり 六甲道店",
  "麺道 しゅはり 三宮センタープラザ店",
  "みなと軒 垂水駅前店",
  "みなと軒セントラルキッチン店",
  "九州ラー麺 加虎 住吉本店",
  "和牛之国",
  "麺道 しゅはり 伊丹店",
  "麺道 しゅはり 石橋店",
  "天然ラジウム療養泉 華の湯",
  "京の虎牛",
  "長浜ラーメン まる長",
  "博多長浜ラーメン一番 松原南店",
  "神来高の原店",
  "べらしお",
  "ナカモズマシマシ",
  "虎のゆうや",
  "和牛王国",
  "ひびの亭",
  "キョロちゃん 森ノ宮店",
  "キョロちゃん 池田店",
  "ダイニング蒼",
  "すずらんの湯",
  "蒼SWEET",
];

type StoreType = "ramen" | "yakiniku" | "spa" | "sweets" | "dining" | "ck";

function storeType(name: string): StoreType {
  if (/セントラルキッチン/.test(name)) return "ck";
  if (/湯|療養泉/.test(name)) return "spa";
  if (/SWEET|スイーツ/.test(name)) return "sweets";
  if (/みなと軒/.test(name)) return "ramen";
  if (/虎のゆうや|ひびの亭|キョロちゃん/.test(name)) return "yakiniku";
  if (/和牛|牛|焼肉/.test(name)) return "yakiniku";
  if (/麺|ラーメン|ラー麺|マシマシ|べらしお|神来/.test(name)) return "ramen";
  return "dining";
}

const TYPE_PROFILE: Record<StoreType, { targetF: number; targetL: number }> = {
  ramen: { targetF: 30, targetL: 25 },
  yakiniku: { targetF: 38, targetL: 22 },
  spa: { targetF: 14, targetL: 30 },
  sweets: { targetF: 28, targetL: 24 },
  dining: { targetF: 30, targetL: 26 },
  ck: { targetF: 46, targetL: 31 },
};

const SEED_PASSWORD = "password123";

async function main() {
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);

  const hqUser = await prisma.user.upsert({
    where: { email: "hq@hanshintk.local" },
    update: {},
    create: {
      email: "hq@hanshintk.local",
      passwordHash,
      name: "本部管理者",
      role: "HQ_ADMIN",
    },
  });

  console.log(`HQ_ADMIN: ${hqUser.email} / ${SEED_PASSWORD}`);

  for (let i = 0; i < STORES.length; i++) {
    const name = STORES[i];
    const type = storeType(name);
    const profile = TYPE_PROFILE[type];
    const code = String(i + 1).padStart(4, "0");

    const store = await prisma.store.upsert({
      where: { name },
      update: {},
      create: { name, code, type, targetF: profile.targetF, targetL: profile.targetL },
    });

    const managerEmail = `store${code}@hanshintk.local`;
    await prisma.user.upsert({
      where: { email: managerEmail },
      update: { storeId: store.id },
      create: {
        email: managerEmail,
        passwordHash,
        name: `${name} 店長`,
        role: "STORE_MANAGER",
        storeId: store.id,
      },
    });

    console.log(`STORE_MANAGER: ${managerEmail} / ${SEED_PASSWORD}  (${name})`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
