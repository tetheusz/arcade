"use server";

import { revalidatePath } from "next/cache";
import {
  requireActionAdmin,
  actionResult,
  actionError,
  ActionError,
} from "@/lib/auth-guard";
import {
  reorderPublishedPosts,
  setFeaturedPost,
  getPublishedPostsForAdminOrder,
} from "@/lib/posts";

export async function reorderPostsAction(orderedIds: string[]) {
  try {
    await requireActionAdmin();

    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return actionError("Lista de posts inválida.");
    }

    if (orderedIds.length > 100) {
      return actionError("Limite de posts excedido.");
    }

    const published = await getPublishedPostsForAdminOrder();
    const publishedIds = new Set(published.map((post) => post.id));

    if (
      orderedIds.length !== published.length ||
      orderedIds.some((id) => !publishedIds.has(id))
    ) {
      return actionError("Ordem inválida — recarregue a página.");
    }

    await reorderPublishedPosts(orderedIds);

    revalidatePath("/");
    revalidatePath("/posts");
    revalidatePath("/admin/posts/order");
    revalidatePath("/admin");

    return actionResult({ count: orderedIds.length });
  } catch (error) {
    if (error instanceof ActionError) return actionError(error.message, error.code);
    return actionError("Falha ao reordenar posts.");
  }
}

export async function setFeaturedPostAction(postId: string) {
  try {
    await requireActionAdmin();

    if (!postId?.trim()) {
      return actionError("Post inválido.");
    }

    await setFeaturedPost(postId.trim());

    revalidatePath("/");
    revalidatePath("/posts");
    revalidatePath("/admin/posts/order");

    return actionResult({ postId });
  } catch (error) {
    if (error instanceof ActionError) return actionError(error.message, error.code);
    return actionError("Falha ao definir destaque.");
  }
}
