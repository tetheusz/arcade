import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const LOCAL_COVER_PREFIX = "/uploads/covers/";
const LOCAL_COVER_DIR = path.join(process.cwd(), "public", "uploads", "covers");
const LOCAL_PROFILE_AVATAR_PREFIX = "/uploads/profiles/avatars/";
const LOCAL_PROFILE_AVATAR_DIR = path.join(
  process.cwd(),
  "public",
  "uploads",
  "profiles",
  "avatars",
);

type UploadTarget = {
  label: string;
  storageFolder: string;
  localDir: string;
  localUrlPrefix: string;
};

function getFileExtension(file: File) {
  const fromType = file.type.split("/")[1]?.toLowerCase();

  if (fromType === "jpeg") {
    return "jpg";
  }

  if (fromType) {
    return fromType;
  }

  const fromName = file.name.split(".").pop()?.toLowerCase();
  return fromName || "jpg";
}

function validateImageFile(file: File, label = "imagem") {
  if (!file.type.startsWith("image/")) {
    throw new Error(`A ${label} precisa ser um arquivo de imagem.`);
  }

  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error(`A ${label} precisa ter no máximo 5 MB.`);
  }
}

function getSupabaseStorageConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "arcade-covers";

  if (!url || !serviceKey) {
    return null;
  }

  return { url, serviceKey, bucket };
}

function getSupabasePublicPrefix(bucket: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!url) {
    return null;
  }

  return `${url}/storage/v1/object/public/${bucket}/`;
}

function isReadOnlyDeployEnvironment() {
  return Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
}

function isDynamicallyUploadedLocalFile(fileName: string) {
  return /^\d+-[0-9a-f-]{36}\.[a-z0-9]+$/i.test(fileName);
}

async function uploadImageFile(file: File, target: UploadTarget) {
  validateImageFile(file, target.label);

  const extension = getFileExtension(file);
  const fileName = `${Date.now()}-${randomUUID()}.${extension}`;
  const filePath = `${target.storageFolder}/${fileName}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  const supabaseConfig = getSupabaseStorageConfig();

  if (supabaseConfig) {
    const supabase = createClient(supabaseConfig.url, supabaseConfig.serviceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { error } = await supabase.storage
      .from(supabaseConfig.bucket)
      .upload(filePath, bytes, {
        contentType: file.type,
        upsert: false,
        cacheControl: "3600",
      });

    if (error) {
      throw new Error(`Não foi possível enviar a ${target.label}: ${error.message}`);
    }

    const { data } = supabase.storage.from(supabaseConfig.bucket).getPublicUrl(filePath);

    return data.publicUrl;
  }

  if (isReadOnlyDeployEnvironment()) {
    throw new Error(
      "Upload de imagem indisponivel em producao sem Supabase Storage. Configure SUPABASE_SERVICE_ROLE_KEY e SUPABASE_STORAGE_BUCKET na Vercel, ou informe uma URL externa da capa.",
    );
  }

  await mkdir(target.localDir, { recursive: true });
  await writeFile(path.join(target.localDir, fileName), bytes);

  return `${target.localUrlPrefix}${fileName}`;
}

async function removeManagedImage(url: string, localPrefix: string, storageFolder: string) {
  if (url.startsWith(localPrefix)) {
    const fileName = url.slice(localPrefix.length);

    if (!fileName || !isDynamicallyUploadedLocalFile(fileName)) {
      return;
    }

    if (isReadOnlyDeployEnvironment()) {
      return;
    }

    const localDir = localPrefix === LOCAL_COVER_PREFIX ? LOCAL_COVER_DIR : LOCAL_PROFILE_AVATAR_DIR;
    await rm(path.join(localDir, fileName), { force: true });
    return;
  }

  const supabaseConfig = getSupabaseStorageConfig();

  if (!supabaseConfig) {
    return;
  }

  const publicPrefix = getSupabasePublicPrefix(supabaseConfig.bucket);

  if (!publicPrefix || !url.startsWith(publicPrefix)) {
    return;
  }

  const objectPath = url.slice(publicPrefix.length);

  if (!objectPath.startsWith(`${storageFolder}/`)) {
    return;
  }

  const supabase = createClient(supabaseConfig.url, supabaseConfig.serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  await supabase.storage.from(supabaseConfig.bucket).remove([objectPath]);
}

export async function uploadCoverImage(file: File) {
  return uploadImageFile(file, {
    label: "capa",
    storageFolder: "covers",
    localDir: LOCAL_COVER_DIR,
    localUrlPrefix: LOCAL_COVER_PREFIX,
  });
}

export async function uploadProfileAvatar(file: File) {
  return uploadImageFile(file, {
    label: "foto de perfil",
    storageFolder: "profiles/avatars",
    localDir: LOCAL_PROFILE_AVATAR_DIR,
    localUrlPrefix: LOCAL_PROFILE_AVATAR_PREFIX,
  });
}

export async function removeManagedCoverImage(url: string | null | undefined) {
  if (!url) {
    return;
  }

  await removeManagedImage(url, LOCAL_COVER_PREFIX, "covers");
}

export async function removeManagedProfileAvatar(url: string | null | undefined) {
  if (!url) {
    return;
  }

  await removeManagedImage(url, LOCAL_PROFILE_AVATAR_PREFIX, "profiles/avatars");
}

export function isManagedProfileAvatarUrl(url: string) {
  if (url.startsWith(LOCAL_PROFILE_AVATAR_PREFIX)) {
    return true;
  }

  const supabaseConfig = getSupabaseStorageConfig();

  if (!supabaseConfig) {
    return false;
  }

  const publicPrefix = getSupabasePublicPrefix(supabaseConfig.bucket);

  return Boolean(
    publicPrefix &&
      url.startsWith(publicPrefix) &&
      url.slice(publicPrefix.length).startsWith("profiles/avatars/"),
  );
}

export function hasUploadedFile(value: FormDataEntryValue | null): value is File {
  return value instanceof File && value.size > 0;
}
