import { getCloudClient } from "./client";

// Comprime e faz upload no bucket "fotos", retorna URL pública.
export async function uploadFotoBlob(blob: Blob, fazendaId: string, codigo: string): Promise<string> {
  const client = getCloudClient(codigo);
  const ext = blob.type.includes("png") ? "png" : "jpg";
  const path = `${fazendaId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await client.storage.from("fotos").upload(path, blob, { contentType: blob.type, upsert: false });
  if (error) throw error;
  const { data } = client.storage.from("fotos").getPublicUrl(path);
  return data.publicUrl;
}

export async function compressFile(file: File, maxSize = 1280, quality = 0.8): Promise<Blob> {
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = URL.createObjectURL(file);
  });
  const ratio = Math.min(1, maxSize / Math.max(img.width, img.height));
  const w = Math.round(img.width * ratio);
  const h = Math.round(img.height * ratio);
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
  URL.revokeObjectURL(img.src);
  return new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), "image/jpeg", quality));
}
