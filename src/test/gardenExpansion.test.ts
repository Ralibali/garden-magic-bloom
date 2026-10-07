import { describe, expect, it } from "vitest";
import { clampLayout, cropFamily, rotationWarnings } from "@/lib/gardenPlanner";
import { seedTasks } from "@/lib/seedTasks";
import { wateringAdvice } from "@/lib/wateringAdvice";
describe("Garden planner", () => {
  it("keeps beds inside the map including invalid numeric input", () => {
    expect(
      clampLayout({
        bed_id: "b",
        x: 98,
        y: -8,
        width: 20,
        height: 15,
        kind: "raised",
      }),
    ).toMatchObject({ x: 80, y: 0 });
    expect(
      clampLayout({
        bed_id: "b",
        x: NaN,
        y: 0,
        width: NaN,
        height: 15,
        kind: "bed",
      }).width,
    ).toBe(20);
  });
  it("uses botanical families and the same bed and previous year", () => {
    expect(cropFamily("Vitlök").family).not.toBe(cropFamily("Morot").family);
    expect(
      rotationWarnings("Broccoli", "b", 2027, [{
        bed_id: "b",
        variety: "Grönkål",
        year: 2026,
      }])[0],
    ).toContain("stod här i fjol");
    expect(
      rotationWarnings("Broccoli", "b", 2027, [{
        bed_id: "other",
        variety: "Grönkål",
        year: 2026,
      }]),
    ).toEqual([]);
    expect(
      rotationWarnings("Broccoli", "b", 2027, [{
        bed_id: "b",
        variety: "Grönkål",
        year: 2026,
        planned: true,
      }])[0],
    ).toContain("var planerad");
  });
});
describe("Seed tasks and watering", () => {
  it("never invents a zone, crop match or age", () => {
    expect(seedTasks([{ id: "s", variety: "Okänd sort" }], 3, "2026-03-20"))
      .toEqual([]);
    expect(seedTasks([{ id: "s", variety: "Tomat" }], null, "2026-03-20"))
      .toEqual([]);
    expect(
      seedTasks(
        [{ id: "s", variety: "Tomat", expiry_date: "2025-12-31" }],
        null,
        "2026-03-20",
      )[0].title,
    ).toContain("Groningstesta");
  });
  it("finds the sowing window without changing inventory or logging a sowing", () => {
    const seeds = [{ id: "s", variety: "Tomat" }];
    const before = JSON.stringify(seeds);
    expect(seedTasks(seeds, 3, "2026-03-20").some((t) => t.type === "sowing"))
      .toBe(true);
    expect(JSON.stringify(seeds)).toBe(before);
  });
  it("does not treat missing rain or regional forecasts as local observations", () => {
    expect(wateringAdvice(undefined, 22).title).toContain("Känn");
    expect(
      wateringAdvice({
        dryDays: 4,
        totalPrecipitation: 0,
        lastThreeDays: 0,
        location_source: "zone",
      }, 25).title,
    ).toContain("Ange plats");
    expect(
      wateringAdvice({
        dryDays: 0,
        totalPrecipitation: 12,
        lastThreeDays: 12,
        location_source: "saved",
      }, 21).detail,
    ).toContain("12 mm");
    expect(
      wateringAdvice({
        dryDays: 4,
        totalPrecipitation: 0,
        lastThreeDays: 0,
        location_source: "saved",
      }, 25).title,
    ).toContain("Vattna i dag");
  });
});
