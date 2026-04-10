const KNOWN_MANUFACTURER_CODES: Record<string, string> = {
  "Aegis Dynamics": "AEGS",
  "Anvil Aerospace": "ANVL",
  Aopoa: "AOPA",
  "Argo Astronautics": "ARGO",
  "Banu Souli": "BANU",
  "Consolidated Outland": "CNOU",
  "Crusader Industries": "CRUS",
  "Drake Interplanetary": "DRAK",
  "Esperia Incorporation": "ESPR",
  "Gatac Manufacture": "GTAC",
  "Grey&apos;s Market": "GREY",
  "Greycat Industrial": "GRIN",
  "Kruger Intergalactic": "KRUG",
  Mirai: "MRAI",
  "Musashi Industrial and Starflight Concern": "MISC",
  "Origin Jumpworks": "ORIG",
  "Roberts Space Industries": "RSI",
  "Tumbril Land Systems": "TMBL",
  "Vanduul Clans": "VNCL",
};

interface ManufacturerCodeInput {
  nameCode?: string | null | undefined;
  name?: string | null | undefined;
  slug?: string | null | undefined;
}

function fallbackCodeFromSlug(slug: string | null | undefined): string | null {
  if (!slug) return null;

  const words = slug
    .split(/[^a-z0-9]+/i)
    .map((word) => word.trim())
    .filter((word) => word.length > 0);

  if (words.length === 0) return null;

  const first = words[0] ?? "";
  const withoutVowels = first.replace(/[aeiou]/gi, "");
  if (withoutVowels.length >= 4) {
    return withoutVowels.slice(0, 4).toUpperCase();
  }

  return words.join("").slice(0, 4).toUpperCase();
}

export function resolveManufacturerCode(input: ManufacturerCodeInput): string {
  if (input.nameCode && input.nameCode.length > 0) {
    return input.nameCode.toUpperCase();
  }

  if (input.name) {
    const known = KNOWN_MANUFACTURER_CODES[input.name];
    if (known) return known;
  }

  return fallbackCodeFromSlug(input.slug) ?? "UNK";
}

export function manufacturerNamesForCode(code: string): string[] {
  const normalized = code.trim().toUpperCase();
  return Object.entries(KNOWN_MANUFACTURER_CODES)
    .filter(([, knownCode]) => knownCode === normalized)
    .map(([name]) => name);
}
