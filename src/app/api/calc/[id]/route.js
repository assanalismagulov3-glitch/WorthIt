import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req, { params }) {
  try {
    const id = params?.id;
    const body = await req.json();

    const data = {};
    if (typeof body?.name === "string") data.name = body.name;
    if (typeof body?.isActive === "boolean") data.isActive = body.isActive;
    if (body?.payload) data.payload = body.payload;
    if ("endDate" in (body || {})) data.endDate = body.endDate ? new Date(body.endDate) : null;

    const item = await prisma.calcItem.update({
      where: { id },
      data,
    });

    return NextResponse.json({ item });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const id = params?.id;

    // мягкое удаление
    const item = await prisma.calcItem.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ ok: true, item });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
