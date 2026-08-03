export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface SegmentOptions {
  /** Minimum content width/height to keep (filters out noise slivers). */
  minContent?: number;
}

const DEFAULTS: Required<SegmentOptions> = { minContent: 20 };

function average(nums: ArrayLike<number>): number {
  if (nums.length === 0) return 255;
  let sum = 0;
  for (let i = 0; i < nums.length; i++) sum += nums[i];
  return sum / nums.length;
}

/** Otsu's method: picks the brightness threshold that best splits a set of
 * values into two classes (e.g. "surface" vs "receipt paper"), by finding
 * the split that maximizes the variance between the two classes' means.
 * Standard, dependency-free automatic thresholding — works whether the
 * photo's background happens to be a bright desk or a dark table/floor. */
export function otsuThreshold(values: ArrayLike<number>): number {
  const hist = new Array(256).fill(0);
  for (let i = 0; i < values.length; i++) {
    hist[Math.max(0, Math.min(255, Math.round(values[i])))]++;
  }
  const total = values.length;
  if (total === 0) return 128;

  let sumAll = 0;
  for (let t = 0; t < 256; t++) sumAll += t * hist[t];

  let sumB = 0;
  let weightB = 0;
  // Track the whole run of t's tied for the best variance, not just the
  // first — with few distinct brightness values (e.g. a clean two-tone
  // photo) that run can span dozens of t's, and a threshold at its start
  // sits right against the darker cluster instead of between the two.
  let bestVariance = -1;
  let bestRunStart = 0;
  let bestRunEnd = 0;
  for (let t = 0; t < 256; t++) {
    weightB += hist[t];
    if (weightB === 0) continue;
    const weightF = total - weightB;
    if (weightF === 0) break;
    sumB += t * hist[t];
    const meanB = sumB / weightB;
    const meanF = (sumAll - sumB) / weightF;
    const between = weightB * weightF * (meanB - meanF) * (meanB - meanF);
    if (between > bestVariance) {
      bestVariance = between;
      bestRunStart = t;
      bestRunEnd = t;
    } else if (between === bestVariance) {
      bestRunEnd = t;
    }
  }
  return Math.round((bestRunStart + bestRunEnd) / 2);
}

/** Decides whether the background (the surface receipts are laid on) is the
 * brighter or darker side of `threshold`, by sampling the photo's four
 * corners — in an overhead shot of receipts laid out with gaps, the corners
 * are almost always bare surface, not a receipt. */
export function detectBackgroundIsBright(width: number, height: number, brightness: ArrayLike<number>, threshold: number): boolean {
  const marginX = Math.max(1, Math.round(width * 0.08));
  const marginY = Math.max(1, Math.round(height * 0.08));
  const samples: number[] = [];
  const corners = [
    { x0: 0, y0: 0 },
    { x0: width - marginX, y0: 0 },
    { x0: 0, y0: height - marginY },
    { x0: width - marginX, y0: height - marginY },
  ];
  for (const c of corners) {
    for (let y = c.y0; y < c.y0 + marginY; y++) {
      for (let x = c.x0; x < c.x0 + marginX; x++) {
        samples.push(brightness[y * width + x]);
      }
    }
  }
  return average(samples) >= threshold;
}

/** Grows the foreground mask by `radius` pixels (a simple box dilation), to
 * bridge the small internal gaps a single receipt's own text/shadows can
 * create in the mask, without merging genuinely separate receipts (which
 * are asked to be photographed with a visible gap between them). */
function dilate(mask: Uint8Array, width: number, height: number, radius: number): Uint8Array {
  if (radius <= 0) return mask;
  const out = new Uint8Array(mask.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (mask[y * width + x]) {
        out[y * width + x] = 1;
        continue;
      }
      outer: for (let dy = -radius; dy <= radius; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= height) continue;
        const base = ny * width;
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx;
          if (nx < 0 || nx >= width) continue;
          if (mask[base + nx]) {
            out[y * width + x] = 1;
            break outer;
          }
        }
      }
    }
  }
  return out;
}

interface Blob {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  area: number;
}

/** Finds 4-connected components of `true` cells in a binary mask and
 * returns each one's bounding box and pixel count. Unlike a row/column
 * projection, this correctly separates receipts laid out irregularly —
 * different sizes, staggered, not aligned to a grid — which is the common
 * case for a real photo of several receipts on a table. */
function findConnectedComponents(mask: Uint8Array, width: number, height: number): Blob[] {
  const visited = new Uint8Array(mask.length);
  const blobs: Blob[] = [];
  const stackX = new Int32Array(mask.length);
  const stackY = new Int32Array(mask.length);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (!mask[idx] || visited[idx]) continue;

      let sp = 0;
      stackX[sp] = x;
      stackY[sp] = y;
      sp++;
      visited[idx] = 1;
      let minX = x;
      let maxX = x;
      let minY = y;
      let maxY = y;
      let area = 0;

      while (sp > 0) {
        sp--;
        const cx = stackX[sp];
        const cy = stackY[sp];
        area++;
        if (cx < minX) minX = cx;
        if (cx > maxX) maxX = cx;
        if (cy < minY) minY = cy;
        if (cy > maxY) maxY = cy;

        const neighbors: Array<[number, number]> = [
          [cx - 1, cy],
          [cx + 1, cy],
          [cx, cy - 1],
          [cx, cy + 1],
        ];
        for (const [nx, ny] of neighbors) {
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
          const nIdx = ny * width + nx;
          if (!mask[nIdx] || visited[nIdx]) continue;
          visited[nIdx] = 1;
          stackX[sp] = nx;
          stackY[sp] = ny;
          sp++;
        }
      }

      blobs.push({ x0: minX, y0: minY, x1: maxX + 1, y1: maxY + 1, area });
    }
  }
  return blobs;
}

/** Splits a grayscale brightness grid into rectangular regions, one per
 * receipt, by finding connected blobs of "not background" pixels. The
 * background/foreground split is computed adaptively per photo (Otsu
 * threshold + corner sampling), so this works for receipts on a light desk
 * or a dark table/floor alike, and — because it's a real 2D blob search,
 * not a row-then-column projection — it also handles receipts of different
 * sizes placed irregularly, not neatly gridded. Returns a single
 * full-image rect when nothing meaningful separates (an ordinary
 * single-receipt photo). */
export function segmentRegions(width: number, height: number, brightness: ArrayLike<number>, opts: SegmentOptions = {}): Rect[] {
  if (width <= 0 || height <= 0) return [];
  const { minContent } = { ...DEFAULTS, ...opts };

  const threshold = otsuThreshold(brightness);
  const backgroundIsBright = detectBackgroundIsBright(width, height, brightness, threshold);
  const isBackground = (v: number) => (backgroundIsBright ? v >= threshold : v <= threshold);

  const foreground = new Uint8Array(width * height);
  for (let i = 0; i < foreground.length; i++) foreground[i] = isBackground(brightness[i]) ? 0 : 1;

  const dilationRadius = Math.max(1, Math.round(Math.min(width, height) * 0.006));
  const bridged = dilate(foreground, width, height, dilationRadius);

  const minArea = minContent * minContent * 0.2;
  const blobs = findConnectedComponents(bridged, width, height).filter(
    (b) => b.x1 - b.x0 >= minContent && b.y1 - b.y0 >= minContent && b.area >= minArea
  );

  if (blobs.length <= 1) return [{ x: 0, y: 0, w: width, h: height }];
  return blobs.map((b) => ({ x: b.x0, y: b.y0, w: b.x1 - b.x0, h: b.y1 - b.y0 }));
}
