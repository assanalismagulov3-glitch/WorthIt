import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const kind = searchParams.get("kind"); // optional

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const where = { userId, isActive: true };
    if (kind) where.kind = kind;

    const items = await prisma.calcItem.findMany({
      where,
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ items });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { userId, kind, name, payload, endDate } = body || {};

    if (!userId || !kind || !name || !payload) {
      return NextResponse.json(
        { error: "userId, kind, name, payload are required" },
        { status: 400 }
      );
    }

    const item = await prisma.calcItem.create({
      data: {
        userId,
        kind,
        name,
        payload,
        endDate: endDate ? new Date(endDate) : null,
        isActive: true,
      },
    });

    return NextResponse.json({ item });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
