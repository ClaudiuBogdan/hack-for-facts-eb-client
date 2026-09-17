import { describe, expect, it } from "vitest";
import {
  entityInsDatasetGroups,
  entityInsDetailModel,
  entityInsDerivedIndicators,
} from "./entity-ins-dashboard";
import { observation } from "../test/native-landing-fixtures";
describe("native entity INS presentation adapter", () => {
  it("groups native human-readable breadcrumbs under the original root cards", () => {
    const dataset = {
      id: "POP107D",
      code: "POP107D", periodicity: [], has_uat_data:true, has_county_data:true, has_siruta:true,
      context_path:
        "A. STATISTICA SOCIALA > POPULATIE SI STRUCTURA DEMOGRAFICA > POPULATIA DUPA DOMICILIU",
    };
    expect(entityInsDatasetGroups([dataset], "en")).toMatchObject([
      {
        code: "1",
        shortLabel: "A",
        sections: [
          { label: "POPULATIE SI STRUCTURA DEMOGRAFICA", datasets: [dataset] },
        ],
      },
    ]);
    expect(entityInsDetailModel(dataset, "en").rootContextCode).toBe("1");
    expect(
      entityInsDatasetGroups([{ ...dataset, context_path: null }], "en")[0]
        .code,
    ).toBe("other");
  });
  it("keeps source scale and requires matching unqualified annual population", () => {
    const population = observation("54975", 2025, "1000");
    const births = observation("54975", 2025, "20", 10, "POP201D");
    expect(entityInsDerivedIndicators([population, births])).toMatchObject([
      {
        id: "birth-rate",
        value: "20,00",
        // The source's counting symbol is generic, so the curated short form wins.
        unitLabel: "pers. / 1,000 inhabitants",
      },
    ]);
    expect(
      entityInsDerivedIndicators([
        { ...population, unit: { code: "x", name_ro: "Mii persoane" } },
        births,
      ]),
    ).toEqual([]);
    expect(
      entityInsDerivedIndicators([
        { ...population, value_status: "p" },
        births,
      ]),
    ).toEqual([]);
    expect(
      entityInsDerivedIndicators([
        population,
        {
          ...births,
          time_period: {
            ...births.time_period,
            iso_period: "2024",
            year: 2024,
          },
        },
      ]),
    ).toEqual([]);
  });
  it("does not subtract different source measurement units", () => {
    const population = observation("54975", 2025, "1000");
    const births = observation("54975", 2025, "20", 10, "POP201D");
    const deaths = {
      ...observation("54975", 2025, "2", 10, "POP206D"),
      unit: { code: "different", name_ro: "Mii persoane" },
    };
    expect(
      entityInsDerivedIndicators([population, births, deaths]).some(
        (row) => row.id === "natural-increase-rate",
      ),
    ).toBe(false);
  });
});
