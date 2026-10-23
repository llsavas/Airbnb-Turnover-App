import "server-only";
import { createClient } from "@/lib/supabase/server";

export const PHOTO_BUCKET = "photos";

// Temporary links for private photos, keyed by storage path.
export async function signedPhotoUrls(paths: (string | null)[]): Promise<Map<string, string>> {
  const unique = [...new Set(paths.filter((p): p is string => !!p))];
  if (unique.length === 0) return new Map();
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrls(unique, 60 * 60);
  if (error) throw error;
  return new Map(
    data.flatMap((d) => (d.path && d.signedUrl ? [[d.path, d.signedUrl] as const] : [])),
  );
}

// Stores a photo under the cleaning's folder and returns its path. Storage
// policies only accept it if the user works on that cleaning.
export async function uploadCleaningPhoto(cleaningId: string, file: File): Promise<string> {
  return uploadPhoto(cleaningId, file);
}

// Reference photo of how an apartment should look ("Padrão"); admins only.
export async function uploadReferencePhoto(propertyId: string, file: File): Promise<string> {
  return uploadPhoto(`padrao/${propertyId}`, file);
}

async function uploadPhoto(folder: string, file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("O arquivo precisa ser uma foto.");
  const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${folder}/${crypto.randomUUID()}.${extension}`;
  const supabase = await createClient();
  const { error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  return path;
}
