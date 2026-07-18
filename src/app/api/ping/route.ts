import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";


export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const packages = await prisma.testPackage.findMany();
    const testPackages = packages.map((item) => item.name);

    return NextResponse.json({
      success: true,
      data: testPackages,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json({
      success: false,
      data: error instanceof Error ? error.message : "Unknown Error",
    });
  }
}
