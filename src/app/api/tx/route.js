import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// GET /api/tx?userId=...
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const tx = await prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ tx });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

// POST /api/tx
export async function POST(req) {
  try {
    const body = await req.json();
    const { userId, type, title, amount, category, createdAt } = body || {};

    if (!userId || !type || !title) {
      return NextResponse.json(
        { error: "userId, type, title are required" },
        { status: 400 }
      );
    }

    const num = Number(amount);
    if (!Number.isFinite(num) || num <= 0) {
      return NextResponse.json(
        { error: "amount must be a positive number" },
        { status: 400 }
      );
    }

    const tx = await prisma.transaction.create({
      data: {
        userId,
        type, // "income" | "expense"
        title,
        amount: num,
        category: category || "this_month",
        createdAt: createdAt ? new Date(createdAt) : undefined,
      },
    });

    return NextResponse.json({ tx });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
