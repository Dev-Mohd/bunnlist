import { createHash } from "node:crypto";
import type { Prisma, PrismaClient } from "@prisma/client";
import sharp from "sharp";
import { z } from "zod";
import { ApiError } from "./errors";
import type { PhotoStore } from "./suggestionPhotos";

// The admin's photo tools: lift the bag off a plain backdrop onto white, crop,
// delete, restore the original, and do a whole roaster at once. All of it is
// plain arithmetic on the pixels (backdrop colour, edges, flood fill), never a
// generative or learned model: the bag stays the roaster's own photo.

const SIZE = 900;

export const Crop = z.object({
  x: z.number().min(0).max(1), y: z.number().min(0).max(1), w: z.number().min(0.05).max(1), h: z.number().min(0.05).max(1),
});
export type Crop = z.infer<typeof Crop>;

export interface CutOptions {
  /** 0–100: how far from the backdrop colour still counts as backdrop. */
  sensitivity: number;
  crop?: Crop | null;
  /** False: crop and square only, the backdrop stays. */
  removeBackground: boolean;
}

export interface CutResult {
  jpeg: Buffer;
  /** Share of the frame the bag covers, 0–1 (1 when the backdrop was kept). */
  foreground: number;
  /** Why the result may be wrong, in Arabic; null when it looks right. */
  warningAr: string | null;
}

/** Applies the crop, lifts the backdrop (when asked) and centres the bag on a white square. */
export async function cutout(bytes: Buffer, opts: CutOptions): Promise<CutResult> {
  let img = sharp(bytes, { failOn: "none" }).rotate();
  const meta = await img.metadata();
  const [w0, h0] = meta.orientation && meta.orientation >= 5 ? [meta.height ?? 0, meta.width ?? 0] : [meta.width ?? 0, meta.height ?? 0];
  if (!w0 || !h0) throw ApiError.unprocessable("not_an_image");
  if (opts.crop) {
    const left = Math.min(w0 - 1, Math.round(opts.crop.x * w0)), top = Math.min(h0 - 1, Math.round(opts.crop.y * h0));
    const width = Math.max(1, Math.min(w0 - left, Math.round(opts.crop.w * w0)));
    const height = Math.max(1, Math.min(h0 - top, Math.round(opts.crop.h * h0)));
    img = sharp(await img.extract({ left, top, width, height }).toBuffer());
  }
  const { data, info } = await img.resize(SIZE, SIZE, { fit: "inside", withoutEnlargement: false })
    .flatten({ background: "#ffffff" }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height;
  if (!opts.removeBackground) {
    return { jpeg: await onWhite(data, w, h, null, { x0: 0, y0: 0, x1: w - 1, y1: h - 1 }), foreground: 1, warningAr: null };
  }
  const mask = foregroundMask(data, w, h, opts.sensitivity);
  const box = bounds(mask, w, h);
  const foreground = box.count / (w * h);
  if (box.count === 0 || foreground < 0.03) throw ApiError.unprocessable("cutout_empty");
  const edges = (box.x0 <= 1 ? 1 : 0) + (box.y0 <= 1 ? 1 : 0) + (box.x1 >= w - 2 ? 1 : 0) + (box.y1 >= h - 2 ? 1 : 0);
  const ragged = outline(mask, w, h) / Math.sqrt(box.count);
  const warningAr = foreground > 0.88 ? "ما انشالت الخلفية، يمكن الخلفية مو سادة. ارفع الحساسية أو قص الصورة أول"
    : ragged > 7.2 ? "حدود الكيس متقطعة، يمكن الخلفية فيها رسومات أو ظل. قص الصورة على الكيس أو غيّر الحساسية"
    : edges >= 2 ? "الكيس لامس طرفين من الصورة، يمكن انقص منه. جرّب القص أو خفّف الحساسية"
    : null;
  return { jpeg: await onWhite(data, w, h, mask, box), foreground, warningAr };
}

/** Distance between two RGB pixels (a cheap perceptual weighting). */
function dist(a: Uint8Array | Buffer, i: number, r: number, g: number, b: number): number {
  const dr = a[i] - r, dg = a[i + 1] - g, db = a[i + 2] - b;
  return Math.sqrt(2 * dr * dr + 4 * dg * dg + 3 * db * db) / 3;
}

/**
 * 1 for the bag, 0 for the backdrop. The backdrop is the border's median colour;
 * it spreads inward from the border through pixels near that colour (or near the
 * neighbour it came from, for soft shading), and stops at edges, so a white bag on
 * a white table keeps its outline.
 */
export function foregroundMask(px: Buffer | Uint8Array, w: number, h: number, sensitivity: number): Uint8Array {
  const n = w * h;
  const border: number[][] = [[], [], []];
  for (let x = 0; x < w; x++) for (const y of [0, 1, h - 2, h - 1]) for (let c = 0; c < 3; c++) border[c].push(px[(y * w + x) * 3 + c]);
  for (let y = 0; y < h; y++) for (const x of [0, 1, w - 2, w - 1]) for (let c = 0; c < 3; c++) border[c].push(px[(y * w + x) * 3 + c]);
  const median = (v: number[]) => v.sort((a, b) => a - b)[v.length >> 1];
  const [br, bg, bb] = border.map(median);

  const s = Math.max(0, Math.min(100, sensitivity)) / 100;
  const tol = 8 + s * 50;           // from the backdrop colour
  const edgeT = 6 + s * 10;         // luminance step that counts as an outline

  // Sobel on luminance; an edge pixel (and its neighbours) blocks the spread.
  const lum = new Float32Array(n);
  for (let i = 0; i < n; i++) lum[i] = 0.299 * px[i * 3] + 0.587 * px[i * 3 + 1] + 0.114 * px[i * 3 + 2];
  const edge = new Uint8Array(n);
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x;
    const gx = lum[i - w + 1] + 2 * lum[i + 1] + lum[i + w + 1] - lum[i - w - 1] - 2 * lum[i - 1] - lum[i + w - 1];
    const gy = lum[i + w - 1] + 2 * lum[i + w] + lum[i + w + 1] - lum[i - w - 1] - 2 * lum[i - w] - lum[i - w + 1];
    if (Math.abs(gx) + Math.abs(gy) > edgeT * 4) edge[i] = 1;
  }
  // Thickened twice, so small gaps in a faint outline are sealed.
  let wall = edge;
  for (let pass = 0; pass < 2; pass++) {
    const grown = new Uint8Array(n);
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      if (wall[i] || wall[i - 1] || wall[i + 1] || wall[i - w] || wall[i + w]) grown[i] = 1;
    }
    wall = grown;
  }

  const bgMask = new Uint8Array(n);
  const queue = new Int32Array(n);
  let head = 0, tail = 0;
  const seed = (i: number) => {
    if (!bgMask[i] && !wall[i] && dist(px, i * 3, br, bg, bb) < tol) { bgMask[i] = 1; queue[tail++] = i; }
  };
  for (let x = 0; x < w; x++) { seed(x); seed((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { seed(y * w); seed(y * w + w - 1); }
  while (head < tail) {
    const i = queue[head++];
    const x = i % w, y = (i - x) / w;
    for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1]) {
      if (j < 0 || bgMask[j] || wall[j]) continue;
      if (dist(px, j * 3, br, bg, bb) < tol) { bgMask[j] = 1; queue[tail++] = j; }
    }
  }
  // The thickening is given back: a wall pixel off the outline, mostly surrounded by backdrop, is backdrop.
  for (let pass = 0; pass < 2; pass++) {
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      if (bgMask[i] || !wall[i] || edge[i] || dist(px, i * 3, br, bg, bb) >= tol) continue;
      if (bgMask[i - 1] + bgMask[i + 1] + bgMask[i - w] + bgMask[i + w] >= 2) bgMask[i] = 1;
    }
  }
  const fg = new Uint8Array(n);
  for (let i = 0; i < n; i++) fg[i] = bgMask[i] ? 0 : 1;
  return dropSpecks(fg, w, h, Math.max(40, Math.round(0.0008 * n)));
}

/** Clears foreground islands smaller than `min` pixels (dust, table grain). */
function dropSpecks(fg: Uint8Array, w: number, h: number, min: number): Uint8Array {
  const seen = new Uint8Array(fg.length);
  const stack = new Int32Array(fg.length);
  for (let s = 0; s < fg.length; s++) {
    if (!fg[s] || seen[s]) continue;
    const members: number[] = [];
    let top = 0; stack[top++] = s; seen[s] = 1;
    while (top > 0) {
      const i = stack[--top]; members.push(i);
      const x = i % w, y = (i - x) / w;
      for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1]) {
        if (j >= 0 && fg[j] && !seen[j]) { seen[j] = 1; stack[top++] = j; }
      }
    }
    if (members.length < min) for (const i of members) fg[i] = 0;
  }
  return fg;
}

/** Pixels on the bag's outline; a clean bag's outline is about 4·√area, a torn-up scene's far more. */
function outline(mask: Uint8Array, w: number, h: number): number {
  let n = 0;
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x;
    if (mask[i] && (!mask[i - 1] || !mask[i + 1] || !mask[i - w] || !mask[i + w])) n++;
  }
  return n;
}

type Box = { x0: number; y0: number; x1: number; y1: number; count?: number };

function bounds(mask: Uint8Array, w: number, h: number): Required<Box> {
  let x0 = w, y0 = h, x1 = -1, y1 = -1, count = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!mask[y * w + x]) continue;
    count++;
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  return { x0, y0, x1, y1, count };
}

/** The bag (or the whole frame) centred on a white square with a margin, as JPEG. */
async function onWhite(px: Buffer, w: number, h: number, mask: Uint8Array | null, box: Box): Promise<Buffer> {
  const out = Buffer.from(px);
  if (mask) {
    for (let i = 0; i < w * h; i++) {
      if (mask[i]) continue;
      const x = i % w, y = (i - x) / w;
      // A pixel next to the bag is blended half-way, so the outline isn't jagged.
      const near = (x > 0 && mask[i - 1]) || (x < w - 1 && mask[i + 1]) || (y > 0 && mask[i - w]) || (y < h - 1 && mask[i + w]);
      for (let c = 0; c < 3; c++) out[i * 3 + c] = near ? (px[i * 3 + c] + 255) >> 1 : 255;
    }
  }
  const bw = box.x1 - box.x0 + 1, bh = box.y1 - box.y0 + 1;
  const cropped = await sharp(out, { raw: { width: w, height: h, channels: 3 } })
    .extract({ left: box.x0, top: box.y0, width: bw, height: bh }).png().toBuffer();
  const inner = Math.round(SIZE * (mask ? 0.86 : 1));
  const fitted = await sharp(cropped).resize(inner, inner, { fit: "contain", background: "#ffffff" }).toBuffer();
  return sharp({ create: { width: SIZE, height: SIZE, channels: 3, background: "#ffffff" } })
    .composite([{ input: fitted, gravity: "center" }]).jpeg({ quality: 86, mozjpeg: true }).toBuffer();
}

// — Where photos come from and go to —

export const PhotoTarget = z.object({ kind: z.enum(["submission", "lot"]), id: z.string().min(1) });
export type PhotoTarget = z.infer<typeof PhotoTarget>;

export const PhotoToolRequest = z.discriminatedUnion("action", [
  PhotoTarget.extend({
    action: z.enum(["preview", "apply"]),
    sensitivity: z.number().min(0).max(100).default(50),
    crop: Crop.nullable().optional(),
    removeBackground: z.boolean().default(true),
  }),
  PhotoTarget.extend({ action: z.literal("delete") }),
  PhotoTarget.extend({ action: z.literal("restore") }),
  z.object({
    action: z.literal("roaster"), roaster: z.string().trim().min(1), sensitivity: z.number().min(0).max(100).default(50),
    /** submission: the roaster's waiting suggestions; lot: its published coffees. */
    kind: z.enum(["submission", "lot"]).default("submission"),
  }),
]);
export type PhotoToolRequest = z.infer<typeof PhotoToolRequest>;

type Extras = Record<string, unknown>;
const asExtras = (v: Prisma.JsonValue | null): Extras => (v && typeof v === "object" && !Array.isArray(v) ? { ...(v as Extras) } : {});

async function download(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw ApiError.unprocessable("photo_unavailable");
  return Buffer.from(await res.arrayBuffer());
}

type Linked = { id: string; photoPath: string | null; extras: Prisma.JsonValue | null };

/** The suggestion a published coffee came from (it keeps the original photo), if any. */
const linked = (prisma: PrismaClient, lotId: string): Promise<Linked | null> =>
  prisma.mobileCoffeeSubmission.findFirst({ where: { approvedLotId: lotId }, select: { id: true, photoPath: true, extras: true } });

/** A suggestion's original photo path: kept aside once edited, else its current one. */
function originalPath(s: { photoPath: string | null; extras: Prisma.JsonValue | null }): string | null {
  const extras = asExtras(s.extras);
  return (typeof extras.originalPhotoPath === "string" ? extras.originalPhotoPath : null) ?? s.photoPath;
}

async function privatePhoto(store: PhotoStore, path: string): Promise<Buffer> {
  const url = await store.signedUrl(path);
  if (!url) throw ApiError.unprocessable("photo_unavailable");
  return download(url);
}

/** The photo to work from: always the original upload when there is one, so edits never stack. */
async function source(prisma: PrismaClient, store: PhotoStore, t: PhotoTarget): Promise<Buffer> {
  if (t.kind === "submission") {
    const s = await prisma.mobileCoffeeSubmission.findUnique({ where: { id: t.id }, select: { photoPath: true, extras: true } });
    if (!s) throw ApiError.unprocessable("submission_not_found");
    const path = originalPath(s);
    if (!path) throw ApiError.unprocessable("no_photo");
    return privatePhoto(store, path);
  }
  const lot = await prisma.coffeeLot.findUnique({ where: { id: t.id }, select: { imageUrl: true } });
  if (!lot) throw ApiError.unprocessable("lot_not_found");
  const sub = await linked(prisma, t.id);
  const path = sub && originalPath(sub);
  if (path) return privatePhoto(store, path);
  if (!lot.imageUrl) throw ApiError.unprocessable("no_photo");
  return download(lot.imageUrl);
}

/** Notes on a published coffee's suggestion that its photo was edited (so imports and roaster runs leave it). */
async function markLotEdited(prisma: PrismaClient, lotId: string): Promise<void> {
  const sub = await linked(prisma, lotId);
  if (!sub) return;
  const extras = asExtras(sub.extras);
  await prisma.mobileCoffeeSubmission.update({
    where: { id: sub.id },
    data: { extras: { ...extras, photoEdited: true, photoCutFailed: false, originalPhotoPath: extras.originalPhotoPath ?? sub.photoPath ?? null } as Prisma.InputJsonValue },
  });
}

const version = (b: Buffer) => createHash("sha1").update(b).digest("hex").slice(0, 8);

/** Saves an edited JPEG as the suggestion's or lot's photo; returns a URL to show it. */
async function save(prisma: PrismaClient, store: PhotoStore, t: PhotoTarget, jpeg: Buffer): Promise<string | null> {
  if (t.kind === "submission") {
    const s = await prisma.mobileCoffeeSubmission.findUniqueOrThrow({ where: { id: t.id }, select: { photoPath: true, extras: true } });
    const extras = asExtras(s.extras);
    const path = `imports/edit-${t.id}-${version(jpeg)}.jpg`;
    await store.put(path, jpeg);
    await prisma.mobileCoffeeSubmission.update({
      where: { id: t.id },
      data: {
        photoPath: path,
        extras: { ...extras, photoEdited: true, photoCutFailed: false, originalPhotoPath: extras.originalPhotoPath ?? s.photoPath ?? null } as Prisma.InputJsonValue,
      },
    });
    return store.signedUrl(path);
  }
  if (!store.putPublic) throw ApiError.forbidden("storage_not_configured");
  const lot = await prisma.coffeeLot.findUniqueOrThrow({ where: { id: t.id }, select: { slug: true } });
  const imageUrl = await store.putPublic(`lots/${lot.slug}-${version(jpeg)}.jpg`, jpeg);
  await prisma.coffeeLot.update({
    where: { id: t.id },
    data: {
      imageUrl, storedImageUrl: imageUrl, imageType: "USER_UPLOADED", imagePermissionStatus: "APPROVED",
      imageSource: "USER_UPLOAD", imageStorageProvider: "supabase", imageStoredAt: new Date(), imageApprovedAt: new Date(),
    },
  });
  await markLotEdited(prisma, t.id);
  return imageUrl;
}

export type PhotoToolResult =
  | { imageBase64: string; foreground: number; warningAr: string | null }
  | { imageUrl: string | null }
  | { done: number; failed: { id: string; name: string; reason: string }[]; remaining: number };

const FAIL_AR: Record<string, string> = {
  cutout_empty: "ما بقى شي بعد شيل الخلفية",
  no_photo: "ما لها صورة",
  photo_unavailable: "ما قدرنا نجيب الصورة",
  not_an_image: "الملف مو صورة",
};

export async function photoTool(
  prisma: PrismaClient, store: PhotoStore | null, req: PhotoToolRequest, budgetMs = 45_000,
): Promise<PhotoToolResult> {
  if (!store) throw ApiError.forbidden("storage_not_configured");
  switch (req.action) {
    case "preview": {
      const r = await cutout(await source(prisma, store, req), req);
      return { imageBase64: r.jpeg.toString("base64"), foreground: r.foreground, warningAr: r.warningAr };
    }
    case "apply": {
      const r = await cutout(await source(prisma, store, req), req);
      return { imageUrl: await save(prisma, store, req, r.jpeg) };
    }
    case "delete":
      if (req.kind === "submission") {
        const s = await prisma.mobileCoffeeSubmission.findUnique({ where: { id: req.id }, select: { photoPath: true, extras: true } });
        if (!s) throw ApiError.unprocessable("submission_not_found");
        const extras = asExtras(s.extras);
        // The original is remembered, so "restore" can bring it back; the import won't re-add it.
        await prisma.mobileCoffeeSubmission.update({
          where: { id: req.id },
          data: { photoPath: null, extras: { ...extras, photoEdited: true, originalPhotoPath: extras.originalPhotoPath ?? s.photoPath ?? null } as Prisma.InputJsonValue },
        });
      } else {
        const lot = await prisma.coffeeLot.findUnique({ where: { id: req.id }, select: { id: true } });
        if (!lot) throw ApiError.unprocessable("lot_not_found");
        await prisma.coffeeLot.update({ where: { id: req.id }, data: { imageUrl: null, storedImageUrl: null, imageType: "NONE" } });
        await markLotEdited(prisma, req.id);
      }
      return { imageUrl: null };
    case "restore": {
      if (req.kind === "lot") return restoreLot(prisma, store, req.id);
      const s = await prisma.mobileCoffeeSubmission.findUnique({ where: { id: req.id }, select: { extras: true } });
      if (!s) throw ApiError.unprocessable("submission_not_found");
      const rest = asExtras(s.extras);
      const originalPhotoPath = rest.originalPhotoPath;
      if (typeof originalPhotoPath !== "string") throw ApiError.unprocessable("no_original");
      delete rest.originalPhotoPath; delete rest.photoEdited; delete rest.photoCutFailed;
      await prisma.mobileCoffeeSubmission.update({
        where: { id: req.id }, data: { photoPath: originalPhotoPath, extras: rest as Prisma.InputJsonValue },
      });
      return { imageUrl: await store.signedUrl(originalPhotoPath) };
    }
    case "roaster":
      return roasterCutouts(prisma, store, req.roaster, req.sensitivity, req.kind, budgetMs);
  }
}

/** Puts a published coffee's original photo (from its suggestion) back as its picture. */
async function restoreLot(prisma: PrismaClient, store: PhotoStore, lotId: string): Promise<{ imageUrl: string }> {
  const lot = await prisma.coffeeLot.findUnique({ where: { id: lotId }, select: { slug: true } });
  if (!lot) throw ApiError.unprocessable("lot_not_found");
  const sub = await linked(prisma, lotId);
  const path = sub && originalPath(sub);
  if (!sub || !path) throw ApiError.unprocessable("no_original");
  const imageUrl = await store.publish(path, `lots/${lot.slug}-original.jpg`);
  await prisma.coffeeLot.update({
    where: { id: lotId },
    data: { imageUrl, storedImageUrl: imageUrl, imageType: "USER_UPLOADED", imagePermissionStatus: "APPROVED", imageStoredAt: new Date() },
  });
  const extras = asExtras(sub.extras);
  delete extras.photoEdited; delete extras.photoCutFailed;
  await prisma.mobileCoffeeSubmission.update({ where: { id: sub.id }, data: { extras: extras as Prisma.InputJsonValue } });
  return { imageUrl };
}

/** One photo for a roaster-wide run: what to cut, and the suggestion that records how it went. */
type CutJob = { target: PhotoTarget; name: string; markId: string; extras: Prisma.JsonValue | null };

/** A roaster's photos not edited (or given up on) yet: its waiting suggestions, or its published coffees. */
async function cutJobs(prisma: PrismaClient, roaster: string, kind: "submission" | "lot"): Promise<CutJob[]> {
  const fresh = (extras: Prisma.JsonValue | null) => { const e = asExtras(extras); return !e.photoEdited && !e.photoCutFailed; };
  if (kind === "submission") {
    return (await prisma.mobileCoffeeSubmission.findMany({
      where: { status: "PENDING", roasterName: roaster, photoPath: { not: null } },
      select: { id: true, name: true, extras: true }, orderBy: { createdAt: "asc" },
    })).filter((r) => fresh(r.extras)).map((r) => ({ target: { kind, id: r.id }, name: r.name, markId: r.id, extras: r.extras }));
  }
  // Published coffees: only those from a suggestion, which keeps the original and the record of the run.
  const lots = await prisma.coffeeLot.findMany({
    where: { publishedAt: { not: null }, roaster: { nameAr: roaster } }, select: { id: true, nameAr: true }, orderBy: { nameAr: "asc" },
  });
  const subs = await prisma.mobileCoffeeSubmission.findMany({
    where: { approvedLotId: { in: lots.map((l) => l.id) } }, select: { id: true, approvedLotId: true, photoPath: true, extras: true },
  });
  const byLot = new Map(subs.map((s) => [s.approvedLotId, s]));
  return lots.flatMap((l) => {
    const s = byLot.get(l.id);
    return s && originalPath(s) && fresh(s.extras) ? [{ target: { kind, id: l.id }, name: l.nameAr, markId: s.id, extras: s.extras }] : [];
  });
}

/**
 * Lifts the backdrop off every photo of one roaster that wasn't edited yet. A
 * photo the cut can't do cleanly (empty, or a scene) is marked and left as it
 * was, so the next run moves on to the rest.
 */
async function roasterCutouts(
  prisma: PrismaClient, store: PhotoStore, roaster: string, sensitivity: number, kind: "submission" | "lot", budgetMs: number,
): Promise<{ done: number; failed: { id: string; name: string; reason: string }[]; remaining: number }> {
  const startedAt = Date.now();
  const rows = await cutJobs(prisma, roaster, kind);
  const result = { done: 0, failed: [] as { id: string; name: string; reason: string }[], remaining: 0 };
  let next = 0;
  const worker = async () => {
    while (next < rows.length) {
      const row = rows[next++];
      if (Date.now() - startedAt > budgetMs) { result.remaining += 1; continue; }
      const t = row.target;
      try {
        const r = await cutout(await source(prisma, store, t), { sensitivity, removeBackground: true });
        if (r.warningAr) {
          result.failed.push({ id: t.id, name: row.name, reason: r.warningAr });
          await markFailed(prisma, row.markId, row.extras);
          continue;
        }
        await save(prisma, store, t, r.jpeg);
        result.done += 1;
      } catch (e) {
        const code = e instanceof ApiError ? e.reason ?? e.code : "error";
        result.failed.push({ id: t.id, name: row.name, reason: FAIL_AR[code] ?? "تعذّر" });
        await markFailed(prisma, row.markId, row.extras);
      }
    }
  };
  await Promise.all([worker(), worker(), worker()]);
  return result;
}

/** Marks a photo the roaster-wide cut left alone, so the next run moves on. */
async function markFailed(prisma: PrismaClient, id: string, extras: Prisma.JsonValue | null): Promise<void> {
  await prisma.mobileCoffeeSubmission.update({
    where: { id }, data: { extras: { ...asExtras(extras), photoCutFailed: true } as Prisma.InputJsonValue },
  }).catch(() => undefined);
}
