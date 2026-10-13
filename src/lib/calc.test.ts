import { describe, expect, it } from "vitest";
import { appTotal, parseHours, parseMoney, sumDays, weekStartOf, type Day } from "@/lib/calc";

describe("parseHours", () => {
  it.each([
    ["7h30", 7.5],
    ["7:30", 7.5],
    ["7,5", 7.5],
    ["7.5", 7.5],
    ["8h", 8],
    ["", 0],
  ])("parses %s as %s hours", (input, expected) => {
    expect(parseHours(input)).toBe(expected);
  });

  it("rejects impossible minute values", () => {
    expect(parseHours("7:75")).toBe(0);
  });
});

describe("parseMoney", () => {
  it.each([
    ["123,45", 123.45],
    ["1.234,56", 1234.56],
    ["123.45", 123.45],
    ["", 0],
  ])("parses %s as %s", (input, expected) => {
    expect(parseMoney(input)).toBe(expected);
  });
});

describe("day totals", () => {
  const day: Day = {
    id: "day-1",
    date: "2026-10-12",
    km: 250,
    maintenance: 30,
    equipment: 10,
    pass: 5,
    food: 15,
    other: 2,
    notes: null,
    day_platforms: [
      { platform_id: "uber", total: 300, cash: 100, card: 180, tips: 20, trips: 18, hours: 6 },
      { platform_id: "ifood", total: 0, cash: 0, card: 40, tips: 10, trips: 2, hours: 2 },
    ],
    fuelings: [{ amount: 40, liters: 6.45 }],
  };

  it("uses explicit platform total, otherwise adds cash, card and tips", () => {
    expect(appTotal(day.day_platforms[0])).toBe(300);
    expect(appTotal(day.day_platforms[1])).toBe(50);
  });

  it("calculates operational profit, remaining balance, and unit metrics", () => {
    const totals = sumDays([day]);
    expect(totals.ganhos).toBe(350);
    expect(totals.combustivel).toBe(40);
    expect(totals.lucroOp).toBe(280);
    expect(totals.total).toBe(265);
    expect(totals.sobra).toBe(248);
    expect(totals.despesas).toBe(102);
    expect(totals.porHora).toBe(35);
    expect(totals.porKm).toBe(1.12);
    expect(totals.corridas).toBe(20);
  });

  it("uses the configured first weekday", () => {
    expect(weekStartOf("2026-10-13", 1)).toBe("2026-10-12");
    expect(weekStartOf("2026-10-13", 0)).toBe("2026-10-11");
  });
});
