import { describe, expect, test } from "bun:test";
import { app } from "../app";

const STANTON_SYSTEM_REFERENCE = "c9c137cf-c520-47ee-9e6d-5d653dfbe201";

interface LocationsEnvelope {
  data: Array<{
    reference: string;
    name: string;
    parent: string | null;
  }>;
  meta: {
    count?: number;
    total?: number;
  };
}

describe("locations routes", () => {
  test("system fallback uses the star children total so pagination remains truthful", async () => {
    const firstPageResponse = await app.request(
      `http://sc-site.test/locations?parent=${STANTON_SYSTEM_REFERENCE}&limit=5&offset=0`,
    );
    expect(firstPageResponse.status).toBe(200);
    const firstPage = (await firstPageResponse.json()) as LocationsEnvelope;

    expect(firstPage.data.length).toBe(5);
    expect(firstPage.meta.count).toBe(5);
    expect(firstPage.meta.total).toBeDefined();
    const total = firstPage.meta.total as number;
    expect(total).toBeGreaterThan(firstPage.data.length);

    const secondPageResponse = await app.request(
      `http://sc-site.test/locations?parent=${STANTON_SYSTEM_REFERENCE}&limit=5&offset=5`,
    );
    expect(secondPageResponse.status).toBe(200);
    const secondPage = (await secondPageResponse.json()) as LocationsEnvelope;

    expect(secondPage.data.length).toBe(5);
    expect(secondPage.meta.count).toBe(5);
    expect(secondPage.meta.total).toBe(total);
  });
});
