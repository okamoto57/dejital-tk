import { describe, expect, it } from "vitest";
import { detectBackgroundIsBright, otsuThreshold, segmentRegions } from "./receipt-segment";

describe("otsuThreshold", () => {
  it("finds a threshold between two well-separated clusters", () => {
    const values = [...Array(50).fill(20), ...Array(50).fill(230)];
    const t = otsuThreshold(values);
    expect(t).toBeGreaterThan(20);
    expect(t).toBeLessThan(230);
  });
});

describe("detectBackgroundIsBright", () => {
  function makeGrid(width: number, height: number, fill: number, dark: { x0: number; y0: number; x1: number; y1: number }) {
    const grid = new Array(width * height).fill(fill);
    for (let y = dark.y0; y < dark.y1; y++) {
      for (let x = dark.x0; x < dark.x1; x++) grid[y * width + x] = 30;
    }
    return grid;
  }

  it("detects a bright (white desk) background when corners are bright", () => {
    const width = 40;
    const height = 40;
    const grid = makeGrid(width, height, 240, { x0: 10, y0: 10, x1: 30, y1: 30 });
    expect(detectBackgroundIsBright(width, height, grid, otsuThreshold(grid))).toBe(true);
  });

  it("detects a dark (wood floor) background when corners are dark", () => {
    const width = 40;
    const height = 40;
    const grid = new Array(width * height).fill(60);
    for (let y = 10; y < 30; y++) {
      for (let x = 10; x < 30; x++) grid[y * width + x] = 230;
    }
    expect(detectBackgroundIsBright(width, height, grid, otsuThreshold(grid))).toBe(false);
  });
});

describe("segmentRegions", () => {
  function makeGrid(width: number, height: number, bg: number, blocks: Array<{ x0: number; y0: number; x1: number; y1: number }>, fill = 250) {
    const grid = new Array(width * height).fill(bg);
    for (const b of blocks) {
      for (let y = b.y0; y < b.y1; y++) {
        for (let x = b.x0; x < b.x1; x++) grid[y * width + x] = fill;
      }
    }
    return grid;
  }

  it("returns the full image as one region when nothing separates", () => {
    const width = 40;
    const height = 40;
    const grid = new Array(width * height).fill(200);
    const regions = segmentRegions(width, height, grid, { minContent: 4 });
    expect(regions).toEqual([{ x: 0, y: 0, w: width, h: height }]);
  });

  it("splits two receipts placed side by side on a bright background", () => {
    const width = 60;
    const height = 30;
    const grid = makeGrid(width, height, 30, [
      { x0: 0, y0: 2, x1: 20, y1: 28 },
      { x0: 40, y0: 2, x1: 60, y1: 28 },
    ]);
    const regions = segmentRegions(width, height, grid, { minContent: 5 });
    expect(regions).toHaveLength(2);
    // dilation intentionally fuzzes boundaries by a pixel or two, so check
    // approximate position rather than the exact pre-dilation coordinates
    const xs = regions.map((r) => r.x).sort((a, b) => a - b);
    expect(xs[0]).toBeLessThanOrEqual(2);
    expect(xs[1]).toBeGreaterThanOrEqual(37);
  });

  it("splits two receipts stacked vertically into two regions", () => {
    const width = 30;
    const height = 60;
    const grid = makeGrid(width, height, 30, [
      { x0: 2, y0: 0, x1: 28, y1: 20 },
      { x0: 2, y0: 40, x1: 28, y1: 60 },
    ]);
    const regions = segmentRegions(width, height, grid, { minContent: 5 });
    expect(regions).toHaveLength(2);
    const ys = regions.map((r) => r.y).sort((a, b) => a - b);
    expect(ys[0]).toBeLessThanOrEqual(2);
    expect(ys[1]).toBeGreaterThanOrEqual(37);
  });

  it("splits receipts laid on a dark surface (e.g. a wood floor), not just a bright desk", () => {
    const width = 60;
    const height = 30;
    const grid = makeGrid(
      width,
      height,
      70,
      [
        { x0: 0, y0: 2, x1: 20, y1: 28 },
        { x0: 40, y0: 2, x1: 60, y1: 28 },
      ],
      235
    );
    const regions = segmentRegions(width, height, grid, { minContent: 5 });
    expect(regions).toHaveLength(2);
    const xs = regions.map((r) => r.x).sort((a, b) => a - b);
    expect(xs[0]).toBeLessThanOrEqual(2);
    expect(xs[1]).toBeGreaterThanOrEqual(37);
  });

  it("separates receipts of different sizes staggered in two loose rows, not aligned to a grid", () => {
    // Mirrors a real photo: a tall receipt in the top row overlaps in y with
    // the bottom row, so no row is ever fully background across the whole
    // width — a row-then-column projection would fail to split this, but
    // blob detection (2D, not row/column) still separates all 5.
    const width = 300;
    const height = 200;
    const grid = makeGrid(width, height, 40, [
      { x0: 10, y0: 10, x1: 70, y1: 90 }, // top-left, short
      { x0: 100, y0: 10, x1: 160, y1: 90 }, // top-middle, short
      { x0: 190, y0: 10, x1: 250, y1: 150 }, // top-right, TALL — overlaps bottom row's y-range
      { x0: 10, y0: 110, x1: 70, y1: 190 }, // bottom-left
      { x0: 100, y0: 110, x1: 160, y1: 190 }, // bottom-middle
    ]);
    const regions = segmentRegions(width, height, grid, { minContent: 10 });
    expect(regions).toHaveLength(5);
  });
});
