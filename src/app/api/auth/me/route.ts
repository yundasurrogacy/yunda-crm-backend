import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session-cookie";

export async function GET() {
  const s = await getServerSession();
  if (!s) return NextResponse.json({ session: null });
  return NextResponse.json({
    session: {
      email: s.email,
      role: s.role,
      portals: s.portals,
      activePortal: s.activePortal,
    },
  });
}
