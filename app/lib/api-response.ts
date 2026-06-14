import { NextResponse } from "next/server";

export function apiError(message: string, status: number) {
  return NextResponse.json({ message }, { status });
}

export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message;
  return fallback;
}
