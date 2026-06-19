"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  requireActionSession,
  requireActionAdmin,
  actionResult,
  actionError,
  ActionError,
} from "@/lib/auth-guard";
import { CACHE_TAGS } from "@/lib/cache";

export async function applyProtocolAction(data: {
  name: string;
  description: string;
  website: string;
  twitter?: string;
}) {
  try {
    const session = await requireActionSession();

    const application = await prisma.protocolApplication.create({
      data: {
        userId: session.user.id,
        ...data,
      },
    });

    revalidatePath("/protocols");
    return actionResult(application);
  } catch (error) {
    if (error instanceof ActionError) return actionError(error.message, error.code);
    return actionError("Falha ao enviar candidatura.");
  }
}

export async function approveProtocolApplicationAction(applicationId: string) {
  try {
    await requireActionAdmin();

    const application = await prisma.protocolApplication.findUnique({
      where: { id: applicationId },
    });

    if (!application) return actionError("Candidatura não encontrada.", "NOT_FOUND");

    const slug = application.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    const protocol = await prisma.$transaction(async (tx) => {
      const created = await tx.protocol.create({
        data: {
          name: application.name,
          slug,
          description: application.description,
          website: application.website,
          twitter: application.twitter,
          isVerified: true,
        },
      });

      await tx.protocolAdmin.create({
        data: { userId: application.userId, protocolId: created.id },
      });

      await tx.protocolApplication.update({
        where: { id: applicationId },
        data: { status: "APPROVED" },
      });

      return created;
    });

    revalidatePath("/admin/protocols");
    revalidatePath("/protocols");
    return actionResult(protocol);
  } catch (error) {
    if (error instanceof ActionError) return actionError(error.message, error.code);
    return actionError("Falha ao aprovar protocolo.");
  }
}

export async function createProtocolAction(data: {
  name: string;
  description: string;
  website?: string;
  twitter?: string;
  logoUrl?: string;
}) {
  try {
    await requireActionAdmin();

    const slug = data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    const protocol = await prisma.protocol.create({
      data: {
        ...data,
        slug,
        isVerified: true,
      },
    });

    revalidatePath("/protocols");
    revalidatePath("/admin/protocols");
    return actionResult(protocol);
  } catch (error) {
    if (error instanceof ActionError) return actionError(error.message, error.code);
    return actionError("Falha ao criar protocolo.");
  }
}

export async function updateProtocolAction(
  protocolId: string,
  data: {
    name: string;
    description: string;
    website?: string;
    twitter?: string;
    logoUrl?: string;
    isVerified?: boolean;
  },
) {
  try {
    await requireActionAdmin();

    const existing = await prisma.protocol.findUnique({ where: { id: protocolId } });

    if (!existing) {
      return actionError("Protocolo não encontrado.", "NOT_FOUND");
    }

    const name = data.name.trim();
    const description = data.description.trim();

    if (!name || !description) {
      return actionError("Nome e descrição são obrigatórios.");
    }

    const slug =
      name === existing.name
        ? existing.slug
        : name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "");

    const protocol = await prisma.protocol.update({
      where: { id: protocolId },
      data: {
        name,
        slug,
        description,
        website: data.website?.trim() || null,
        twitter: data.twitter?.trim() || null,
        logoUrl: data.logoUrl?.trim() || null,
        ...(data.isVerified !== undefined ? { isVerified: data.isVerified } : {}),
      },
    });

    revalidatePath("/protocols");
    revalidatePath("/admin/protocols");
    revalidatePath(`/protocols/${protocol.slug}`);
    revalidatePath(`/admin/protocols/${protocolId}/edit`);
    revalidateTag(CACHE_TAGS.protocols, "max");
    return actionResult(protocol);
  } catch (error) {
    if (error instanceof ActionError) return actionError(error.message, error.code);
    if (
      error instanceof Error &&
      error.message.includes("Unique constraint")
    ) {
      return actionError("Já existe um protocolo com esse nome ou slug.");
    }
    return actionError("Falha ao atualizar protocolo.");
  }
}

export async function deleteProtocolAction(protocolId: string) {
  try {
    await requireActionAdmin();

    const existing = await prisma.protocol.findUnique({
      where: { id: protocolId },
      include: {
        missions: {
          where: {
            escrowStatus: { in: ["OPEN", "FUNDED"] },
          },
          select: { id: true },
          take: 1,
        },
      },
    });

    if (!existing) {
      return actionError("Protocolo não encontrado.", "NOT_FOUND");
    }

    if (existing.missions.length > 0) {
      return actionError(
        "Não é possível excluir um protocolo com bounties em escrow ativo.",
      );
    }

    await prisma.protocol.delete({ where: { id: protocolId } });

    revalidatePath("/protocols");
    revalidatePath("/admin/protocols");
    revalidateTag(CACHE_TAGS.protocols, "max");
    return actionResult({ deleted: protocolId });
  } catch (error) {
    if (error instanceof ActionError) return actionError(error.message, error.code);
    return actionError("Falha ao excluir protocolo.");
  }
}
