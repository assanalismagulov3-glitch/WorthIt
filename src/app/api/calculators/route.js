import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const kind = searchParams.get("kind"); // optional

    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

    const items = await prisma.calcItem.findMany({
      where: {
        userId,
        ...(kind ? { kind } : {}),
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ items });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { userId, kind, name, payload, isActive = true, endDate = null } = body || {};

    if (!userId || !kind || !name || !payload) {
      return NextResponse.json({ error: "userId, kind, name, payload required" }, { status: 400 });
    }

    const item = await prisma.calcItem.create({
      data: {
        userId,
        kind,
        name,
        payload,
        isActive: !!isActive,
        endDate: endDate ? new Date(endDate) : null,
      },
    });

    return NextResponse.json({ item });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

export async function PATCH(req) {
  try {
    const body = await req.json();
    const { id, userId, patch } = body || {};
    if (!id || !userId || !patch) return NextResponse.json({ error: "id, userId, patch required" }, { status: 400 });

    // безопасность: обновляем только свои записи
    const exists = await prisma.calcItem.findFirst({ where: { id, userId } });
    if (!exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const updated = await prisma.calcItem.update({
      where: { id },
      data: {
        ...(patch.name !== undefined ? { name: patch.name } : {}),
        ...(patch.payload !== undefined ? { payload: patch.payload } : {}),
        ...(patch.isActive !== undefined ? { isActive: !!patch.isActive } : {}),
        ...(patch.endDate !== undefined ? { endDate: patch.endDate ? new Date(patch.endDate) : null } : {}),
      },
    });

    return NextResponse.json({ item: updated });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const userId = searchParams.get("userId");
    if (!id || !userId) return NextResponse.json({ error: "id and userId required" }, { status: 400 });

    const exists = await prisma.calcItem.findFirst({ where: { id, userId } });
    if (!exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.calcItem.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
