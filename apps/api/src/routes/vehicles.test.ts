import { describe, expect, test } from "bun:test";
import { app } from "../app";

interface VehicleListEnvelope {
  data: Array<{
    slug: string;
    manufacturer: string;
    manufacturerCode: string;
  }>;
  meta: {
    total?: number;
  };
}

interface VehicleDetailEnvelope {
  data: {
    slug: string;
    buyAt?: string;
    pledgeStoreUrl?: string;
  };
}

describe("vehicles routes", () => {
  test("company filter matches derived manufacturer codes when manufacturer rows have no name_code", async () => {
    const response = await app.request("http://sc-site.test/vehicles?company=ANVL&limit=10&offset=0");
    expect(response.status).toBe(200);

    const body = (await response.json()) as VehicleListEnvelope;
    expect(body.meta.total).toBeGreaterThan(0);
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.data.every((ship) => ship.manufacturer === "Anvil Aerospace")).toBe(true);
    expect(body.data.every((ship) => ship.manufacturerCode === "ANVL")).toBe(true);
  });

  test("pledge-only ships expose the RSI pledge URL without pretending to have an in-game shop", async () => {
    const response = await app.request("http://sc-site.test/vehicles/600i-executive-edition");
    expect(response.status).toBe(200);

    const body = (await response.json()) as VehicleDetailEnvelope;
    expect(body.data.slug).toBe("600i-executive-edition");
    expect(body.data.buyAt).toBeUndefined();
    expect(body.data.pledgeStoreUrl).toContain("robertsspaceindustries.com");
    expect(body.data.pledgeStoreUrl).toContain("/pledge/ships/600i/");
  });

  test("ships with both data sources keep the in-game shop and the RSI pledge URL separately", async () => {
    const response = await app.request("http://sc-site.test/vehicles/avenger-titan");
    expect(response.status).toBe(200);

    const body = (await response.json()) as VehicleDetailEnvelope;
    expect(body.data.slug).toBe("avenger-titan");
    expect(body.data.buyAt).toBe("Teasa Spaceport - New Deal");
    expect(body.data.pledgeStoreUrl).toContain("robertsspaceindustries.com");
    expect(body.data.pledgeStoreUrl).toContain("/pledge/ships/aegis-avenger/avenger-titan");
  });
});
