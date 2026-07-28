import { NextResponse } from "next/server";
import { getAllLessons } from "@/lib/lessons";

/**
 * The unit → lesson-slug map, for the certificate page. Progress itself never
 * touches the server — the client compares this static catalog against its own
 * localStorage list.
 */
export function GET() {
  const byUnit = new Map<string, string[]>();
  for (const lesson of getAllLessons()) {
    const list = byUnit.get(lesson.unit) ?? [];
    list.push(lesson.slug);
    byUnit.set(lesson.unit, list);
  }
  return NextResponse.json(Array.from(byUnit, ([unit, slugs]) => ({ unit, slugs })));
}
