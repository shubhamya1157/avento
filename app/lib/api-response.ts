// ===========================================================================
// api-response.ts — Tiny helpers for sending error replies from our API
// ===========================================================================
//
// Our backend "API routes" (the files in app/api/) often need to tell the
// browser that something went wrong — e.g. "missing email" or "not found".
// Instead of writing the same reply code over and over, we put two small
// reusable helpers here. Reusing code like this keeps every route consistent
// and saves typing (the "Don't Repeat Yourself" principle).
// ===========================================================================

// "import" brings in code from elsewhere. NextResponse is a tool from Next.js
// for building the reply (the "response") that our server sends back to the
// browser. "JSON" is a simple, universal text format for data — basically
// labelled values inside curly braces, like { "message": "hello" } — that both
// the server and the browser understand.
import { NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// apiError: build a JSON error response in one line.
//
// HTTP responses carry a "status code" — a number that summarises the result:
//   200 = OK,  201 = Created,  400 = Bad Request (you sent something wrong),
//   401 = Unauthorized (not logged in),  404 = Not Found,  500 = Server error.
//
// Example use:  return apiError("Email is required", 400);
// That sends the browser:  { "message": "Email is required" }  with code 400.
// ---------------------------------------------------------------------------
export function apiError(message: string, status: number) {
  // INPUTS: `message` (the text to show) and `status` (the number code above).
  // OUTPUT: a ready-to-send response. NextResponse.json(...) packages the
  // `{ message }` object into JSON and attaches the status code to it.
  // (`{ message }` is shorthand for `{ message: message }`.)
  return NextResponse.json({ message }, { status });
}

// ---------------------------------------------------------------------------
// getErrorMessage: safely pull a human-readable message out of an error.
//
// In JavaScript a `catch (error)` block can receive ANY kind of value, not
// always a real Error object. This helper checks: "is it a proper Error? then
// use its .message; otherwise use a safe fallback text." The `unknown` type
// forces us to check before trusting the value — a good safety habit.
// ---------------------------------------------------------------------------
export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message;
  return fallback;
}
