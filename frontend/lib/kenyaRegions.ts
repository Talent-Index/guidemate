export const ALL_KENYA_REGIONS = "All Kenya";

export interface KenyaRegion {
  id: string;
  label: string;
  keywords: string[];
}

/** Tourist-facing regions for Explore (matched against experience location & copy). */
export const KENYA_EXPLORE_REGIONS: KenyaRegion[] = [
  {
    id: "nairobi",
    label: "Nairobi",
    keywords: [
      "nairobi",
      "westlands",
      "karen",
      "kilimani",
      "cbd",
      "ngong",
      "kasarani",
      "ruaka",
      "lavington",
      "parklands",
      "eastleigh",
      "kileleshwa",
    ],
  },
  {
    id: "mombasa",
    label: "Mombasa & Coast",
    keywords: ["mombasa", "diani", "malindi", "kilifi", "lamu", "kwale", "nyali", "bamburi", "watamu"],
  },
  {
    id: "central",
    label: "Central & Mt Kenya",
    keywords: ["nyeri", "nanyuki", "meru", "murang", "kiambu", "thika", "aberdare", "mt kenya", "mount kenya"],
  },
  {
    id: "rift",
    label: "Rift Valley",
    keywords: ["nakuru", "naivasha", "eldoret", "kericho", "kitale", "narok", "maasai mara", "hell's gate"],
  },
  {
    id: "western",
    label: "Western",
    keywords: ["kisumu", "kakamega", "bungoma", "busia", "vihiga", "kakamega forest"],
  },
  {
    id: "eastern",
    label: "Eastern",
    keywords: ["machakos", "kitui", "embu", "isiolo", "marsabit", "tsavo"],
  },
  {
    id: "north",
    label: "Northern",
    keywords: ["garissa", "wajir", "mandera", "lodwar", "turkana", "samburu"],
  },
];

export function getKenyaRegionById(id: string): KenyaRegion | undefined {
  return KENYA_EXPLORE_REGIONS.find((r) => r.id === id);
}

export function experienceMatchesKenyaRegion(
  exp: {
    location?: string | null;
    title?: string;
    description?: string;
    tags?: string[];
  },
  regionId: string
): boolean {
  if (!regionId || regionId === "all") return true;
  const region = getKenyaRegionById(regionId);
  if (!region) return true;
  const hay = [exp.location, exp.title, exp.description, ...(exp.tags ?? [])]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return region.keywords.some((k) => hay.includes(k.toLowerCase()));
}
