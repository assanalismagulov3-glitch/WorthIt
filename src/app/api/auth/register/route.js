export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { prisma } from "../../../../lib/prisma";
import { randomBytes, scryptSync } from "crypto";

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export async function POST(req) {
  try {
    const { email, password, currency = "KZT" } = await req.json();

    if (!email || !password) {
      return Response.json({ error: "Email and password required" }, { status: 400 });
    }

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      return Response.json({ error: "User already exists" }, { status: 409 });
    }

    const user = await prisma.user.create({
      data: { email, password: hashPassword(password), currency },
      select: { id: true, email: true, currency: true },
    });

    return Response.json({ user });
  } catch (e) {
    console.error("REGISTER ERROR:", e);
    return Response.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
