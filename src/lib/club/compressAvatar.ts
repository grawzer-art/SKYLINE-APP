import { AVATAR, avatarTarget, checkAvatarInput } from "../../domain/club.ts";

/** Recompresse une photo côté navigateur : redimensionnée (≤ 512 px), recadrée en carré, ré-encodée (EXIF et géolocalisation supprimés), ≤ 512 Ko. */
export async function compressAvatar(file: File): Promise<{ ok: true; blob: Blob } | { ok: false; reason: "type" | "size" | "decode" | "toobig" }> {
  const chk = checkAvatarInput(file); if (chk !== "ok") return { ok: false, reason: chk };
  let bmp: ImageBitmap; try { bmp = await createImageBitmap(file, { imageOrientation: "from-image" }); } catch { return { ok: false, reason: "decode" }; }
  const side = Math.min(bmp.width, bmp.height); const { w } = avatarTarget(side, side);
  const cv = document.createElement("canvas"); cv.width = w; cv.height = w; const ctx = cv.getContext("2d"); if (!ctx) return { ok: false, reason: "decode" };
  ctx.drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, w, w); bmp.close();
  for (const [type, q] of [["image/webp", 0.85], ["image/jpeg", 0.85], ["image/jpeg", 0.7], ["image/jpeg", 0.5]] as const) {
    const blob: Blob | null = await new Promise((r) => cv.toBlob(r, type, q));
    if (blob && blob.type === type && blob.size <= AVATAR.maxBytes) return { ok: true, blob };
  }
  return { ok: false, reason: "toobig" };
}
