export interface KenyaDestination {
  slug: string;
  title: string;
  metaDescription: string;
  intro: string;
  highlights: string[];
  exploreHref: string;
  exploreLabel: string;
}

export const KENYA_DESTINATIONS: KenyaDestination[] = [
  {
    slug: "mt-kenya-treks",
    title: "Mt Kenya treks",
    metaDescription:
      "Book vetted local guides for Mt Kenya treks with Guidemate. Escrow-protected payments and same-day M-Pesa payouts for Kenyan mountain guides.",
    intro:
      "Mt Kenya is Africa's second-highest peak and one of the most rewarding multi-day hikes in East Africa. On Guidemate you book independent, vetted guides who know the routes, porters, and park logistics—not anonymous listings.",
    highlights: [
      "Day hikes and multi-day summit approaches with guides who live in the region.",
      "Clear pricing upfront; trip funds stay in escrow until you confirm completion.",
      "Combine a trek with Nairobi city experiences or safari add-ons on the same platform.",
    ],
    exploreHref: "/explore?category=Wildlife%20%26%20Safari",
    exploreLabel: "Browse safari and outdoor experiences",
  },
  {
    slug: "nairobi-city-walks",
    title: "Nairobi city walks",
    metaDescription:
      "Discover Nairobi with local guides: street food, markets, museums, and culture walks. Book instantly on Guidemate with escrow and live streams.",
    intro:
      "Nairobi rewards walking—if you know where to go. Guidemate guides lead food crawls, museum tours, street-art walks, and neighbourhood deep dives, often after you have watched them go live from the same streets.",
    highlights: [
      "Food & Drink, Art & Culture, and market experiences from guides who host them daily.",
      "Watch a guide live before you book an in-person walk.",
      "Pay through escrow; release payment only when you end the trip with PIN or QR.",
    ],
    exploreHref: "/explore?category=Food%20%26%20Drink",
    exploreLabel: "Explore Nairobi food and culture tours",
  },
  {
    slug: "aberdare-ranges",
    title: "Aberdare ranges",
    metaDescription:
      "Plan Aberdare forest and moorland trips with local guides on Guidemate. Secure escrow bookings and M-Pesa-friendly payouts.",
    intro:
      "The Aberdares offer misty forest, waterfalls, and wildlife without the long drive to more distant parks. Guidemate connects you with guides who run day trips and overnight experiences in and around the range.",
    highlights: [
      "Forest walks, birding, and lodge-adjacent safari prep with regional specialists.",
      "Vetted guide applications and ratings tied to completed trips.",
      "One marketplace for live streams, bookings, and guide payouts.",
    ],
    exploreHref: "/explore?category=Wildlife%20%26%20Safari",
    exploreLabel: "See wildlife and safari listings",
  },
  {
    slug: "kakamega-forest",
    title: "Kakamega Forest",
    metaDescription:
      "Book Kakamega Forest nature walks with trusted local guides. Guidemate escrow protects your payment until the hike is complete.",
    intro:
      "Kakamega is Kenya's last major tropical rainforest—rich in birds, primates, and guided trail knowledge you cannot get from a generic tour operator brochure.",
    highlights: [
      "Nature-focused guides for half-day and full-day forest walks.",
      "Transparent USDC pricing with KES display at checkout.",
      "Ideal for birders and eco-travelers building a western Kenya itinerary.",
    ],
    exploreHref: "/explore",
    exploreLabel: "Browse all published experiences",
  },
];

export function getKenyaDestination(slug: string): KenyaDestination | undefined {
  return KENYA_DESTINATIONS.find((d) => d.slug === slug);
}
