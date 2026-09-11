import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { auth } from "@/lib/auth";
import { ForbiddenError, UnauthorizedError } from "@/lib/rbac";
import type { Session } from "next-auth";

export class NotFoundError extends Error {
  constructor(message = "Not found") {
    super(message);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends Error {
  constructor(message = "Conflict") {
    super(message);
    this.name = "ConflictError";
  }
}

export class BadRequestError extends Error {
  constructor(message = "Bad request") {
    super(message);
    this.name = "BadRequestError";
  }
}

/** Resolves the active session, throwing UnauthorizedError if not signed in. */
export async function requireApiSession(): Promise<Session> {
  const session = await auth();
  if (!session?.user || !session.user.isActive) {
    throw new UnauthorizedError();
  }
  return session;
}

/** Wraps a route handler body so every route shares the same error mapping. */
export function apiRoute<T>(fn: () => Promise<T>) {
  return handle(fn);
}

async function handle<T>(fn: () => Promise<T>): Promise<Response> {
  try {
    const result = await fn();
    if (result instanceof Response) return result;
    return NextResponse.json(result ?? {}, { status: 200 });
  } catch (err) {
    return errorResponse(err);
  }
}

export function errorResponse(err: unknown): Response {
  if (err instanceof ZodError) {
    return NextResponse.json(
      { error: "ValidationError", issues: err.issues },
      { status: 400 }
    );
  }
  if (err instanceof UnauthorizedError) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (err instanceof ForbiddenError) {
    return NextResponse.json({ error: "Forbidden", message: err.message }, { status: 403 });
  }
  if (err instanceof NotFoundError) {
    return NextResponse.json({ error: "NotFound", message: err.message }, { status: 404 });
  }
  if (err instanceof ConflictError) {
    return NextResponse.json({ error: "Conflict", message: err.message }, { status: 409 });
  }
  if (err instanceof BadRequestError) {
    return NextResponse.json({ error: "BadRequest", message: err.message }, { status: 400 });
  }
  console.error(err);
  return NextResponse.json({ error: "InternalError" }, { status: 500 });
}

export function requestContext(req: Request) {
  return {
    ipAddress: req.headers.get("x-forwarded-for") ?? undefined,
    userAgent: req.headers.get("user-agent") ?? undefined,
  };
}
