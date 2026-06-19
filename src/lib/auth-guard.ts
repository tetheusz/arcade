import { headers } from "next/headers";
import { auth, isAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export class ActionError extends Error {
  constructor(
    message: string,
    public code: "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" | "VALIDATION",
  ) {
    super(message);
    this.name = "ActionError";
  }
}

export async function requireActionSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new ActionError("Sessão necessária.", "UNAUTHORIZED");
  }

  return session;
}

export async function requireActionAdmin() {
  const session = await requireActionSession();

  if (!isAdminSession(session)) {
    throw new ActionError("Acesso de admin necessário.", "FORBIDDEN");
  }

  return session;
}

export async function requireProtocolAdmin(userId: string, protocolId: string) {
  const admin = await prisma.protocolAdmin.findFirst({
    where: { userId, protocolId },
  });

  if (!admin) {
    throw new ActionError("Acesso de admin de protocolo necessário.", "FORBIDDEN");
  }

  return admin;
}

export async function requireReviewerOrAdmin(
  userId: string,
  protocolId?: string,
) {
  const session = await requireActionSession();

  if (isAdminSession(session)) {
    return session;
  }

  if (protocolId) {
    await requireProtocolAdmin(session.user.id, protocolId);
    return session;
  }

  throw new ActionError("Permissão de revisão necessária.", "FORBIDDEN");
}

export function actionResult<T>(data: T) {
  return { success: true as const, data };
}

export function actionError(message: string, code: ActionError["code"] = "VALIDATION") {
  return { success: false as const, error: message, code };
}
