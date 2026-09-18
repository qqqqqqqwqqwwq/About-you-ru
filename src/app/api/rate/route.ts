import { NextResponse } from "next/server";
import { getEurRubRate } from "@/lib/cbr";

export async function GET() {
  const { rate, source } = await getEurRubRate();
  return NextResponse.json({ rate, source });
}
