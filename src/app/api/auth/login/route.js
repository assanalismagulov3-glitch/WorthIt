export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { prisma } from "../../../../lib/prisma";
import { scryptSync, timingSafeEqual } from "crypto";

function verifyPassword(password, stored) {
  const [salt, hashHex] = (stored || "").split(":");
  if (!salt || !hashHex) return false;
  const hashBuf = Buffer.from(hashHex, "hex");
  const testBuf = scryptSync(password, salt, 64);
  return hashBuf.length === testBuf.length && timingSafeEqual(hashBuf, testBuf);
}

export async function POST(req) {
  try {
    const { email, password } = await req.json();

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return Response.json({ error: "Invalid credentials" }, { status: 401 });

    const ok = verifyPassword(password, user.password);
    if (!ok) return Response.json({ error: "Invalid credentials" }, { status: 401 });

    return Response.json({
      user: { id: user.id, email: user.email, currency: user.currency },
    });
  } catch (e) {
    console.error("LOGIN ERROR:", e);
    return Response.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
