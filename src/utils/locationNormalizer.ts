// City → country mapping for grouping
export const CITY_COUNTRY: Record<string, string> = {
  "New York": "United States", "San Francisco": "United States", "Los Angeles": "United States",
  "Seattle": "United States", "Chicago": "United States", "Austin": "United States",
  "Boston": "United States", "Denver": "United States", "Washington DC": "United States",
  "San Diego": "United States", "Miami": "United States", "Atlanta": "United States",
  "Dallas": "United States", "Portland": "United States", "Phoenix": "United States",
  "Minneapolis": "United States", "Detroit": "United States", "Philadelphia": "United States",
  "Pittsburgh": "United States", "San Jose": "United States", "Palo Alto": "United States",
  "Mountain View": "United States", "Sunnyvale": "United States", "Menlo Park": "United States",
  "Cupertino": "United States", "Redmond": "United States", "Bellevue": "United States",
  "Raleigh": "United States", "Nashville": "United States", "Salt Lake City": "United States",
  "London": "United Kingdom", "Manchester": "United Kingdom", "Edinburgh": "United Kingdom",
  "Dublin": "Ireland", "Paris": "France", "Berlin": "Germany", "Munich": "Germany",
  "Hamburg": "Germany", "Amsterdam": "Netherlands", "Stockholm": "Sweden",
  "Copenhagen": "Denmark", "Oslo": "Norway", "Helsinki": "Finland",
  "Zurich": "Switzerland", "Geneva": "Switzerland", "Milan": "Italy", "Rome": "Italy",
  "Madrid": "Spain", "Barcelona": "Spain", "Lisbon": "Portugal",
  "Tokyo": "Japan", "Singapore": "Singapore", "Sydney": "Australia",
  "Melbourne": "Australia", "Toronto": "Canada", "Vancouver": "Canada",
  "Montreal": "Canada", "São Paulo": "Brazil", "Tel Aviv": "Israel",
  "Bangalore": "India", "Mumbai": "India", "Hyderabad": "India",
  "New Delhi": "India", "Seoul": "South Korea", "Taipei": "Taiwan",
  "Hong Kong": "Hong Kong", "Shanghai": "China", "Beijing": "China",
  "Warsaw": "Poland", "Prague": "Czech Republic", "Budapest": "Hungary",
  "Bucharest": "Romania", "Riyadh": "Saudi Arabia", "Dubai": "UAE",
};

// Aliases: lowercase → canonical city
const CITY_ALIASES: Record<string, string> = {
  "nyc": "New York", "ny": "New York", "new york": "New York",
  "new york city": "New York", "manhattan": "New York", "brooklyn": "New York",
  "sf": "San Francisco", "san francisco": "San Francisco", "bay area": "San Francisco",
  "san francisco bay area": "San Francisco",
  "la": "Los Angeles", "los angeles": "Los Angeles",
  "seattle": "Seattle", "chicago": "Chicago", "austin": "Austin",
  "boston": "Boston", "denver": "Denver",
  "dc": "Washington DC", "washington dc": "Washington DC", "washington d.c.": "Washington DC",
  "london": "London", "dublin": "Dublin", "paris": "Paris", "berlin": "Berlin",
  "munich": "Munich", "amsterdam": "Amsterdam", "stockholm": "Stockholm",
  "milan": "Milan", "rome": "Rome", "madrid": "Madrid", "barcelona": "Barcelona",
  "tokyo": "Tokyo", "singapore": "Singapore", "sydney": "Sydney",
  "toronto": "Toronto", "vancouver": "Vancouver", "montreal": "Montreal",
  "sao paulo": "São Paulo", "são paulo": "São Paulo",
  "tel aviv": "Tel Aviv", "bangalore": "Bangalore", "mumbai": "Mumbai",
  "hyderabad": "Hyderabad", "new delhi": "New Delhi",
  "san diego": "San Diego", "miami": "Miami", "atlanta": "Atlanta",
  "dallas": "Dallas", "portland": "Portland",
  "palo alto": "Palo Alto", "mountain view": "Mountain View",
  "sunnyvale": "Sunnyvale", "menlo park": "Menlo Park",
  "cupertino": "Cupertino", "redmond": "Redmond", "bellevue": "Bellevue",
  "remote": "Remote", "anywhere": "Remote", "worldwide": "Remote", "global": "Remote",
  "hybrid": "Hybrid",
};

function isValidLocation(s: string): boolean {
  if (!s || s.length < 3) return false;
  if (/^\d+\s/.test(s)) return false;
  if (/^\d+$/.test(s)) return false;
  if (/other\s*location/i.test(s) || /multiple/i.test(s)) return false;
  if (/\b(travel|friendly|flexible|competitive|tbd|n\/a|various)\b/i.test(s)) return false;
  if (s.length > 40) return false;
  return true;
}

function normalizeCityToken(raw: string): string | null {
  if (!raw) return null;
  let s = raw.trim();
  s = s.replace(/\s*\(.*?\)\s*/g, "").trim();
  if (!s || !isValidLocation(s)) return null;

  const lower = s.toLowerCase().replace(/['']/g, "'");
  if (CITY_ALIASES[lower]) return CITY_ALIASES[lower];

  const stateStripped = s.replace(/,\s*(Alabama|Alaska|Arizona|Arkansas|California|Colorado|Connecticut|Delaware|Florida|Georgia|Hawaii|Idaho|Illinois|Indiana|Iowa|Kansas|Kentucky|Louisiana|Maine|Maryland|Massachusetts|Michigan|Minnesota|Mississippi|Missouri|Montana|Nebraska|Nevada|New Hampshire|New Jersey|New Mexico|New York|North Carolina|North Dakota|Ohio|Oklahoma|Oregon|Pennsylvania|Rhode Island|South Carolina|South Dakota|Tennessee|Texas|Utah|Vermont|Virginia|Washington|West Virginia|Wisconsin|Wyoming|[A-Z]{2})$/i, "").trim();
  const strippedLower = stateStripped.toLowerCase();
  if (CITY_ALIASES[strippedLower]) return CITY_ALIASES[strippedLower];

  const countryStripped = s.replace(/,\s*\w[\w\s]*$/, "").trim();
  const countryStrippedLower = countryStripped.toLowerCase();
  if (CITY_ALIASES[countryStrippedLower]) return CITY_ALIASES[countryStrippedLower];

  if (CITY_COUNTRY[stateStripped]) return stateStripped;
  if (CITY_COUNTRY[countryStripped]) return countryStripped;

  if (isValidLocation(stateStripped) && stateStripped.length >= 3) return stateStripped;
  return null;
}

export function getJobLocations(loc: string | null): string[] {
  if (!loc) return [];
  const parts = loc
    .split(/[;|]/)
    .flatMap(p => p.split(/\bor\b/i))
    .flatMap(p => p.split(/\s*[-–—\/&]\s*/))
    .flatMap(p => p.split(/\s*\+\s*/))
    .flatMap(p => {
      const trimmed = p.trim();
      if (!trimmed) return [];
      if (/^[^,]+,\s*([A-Z]{2}|[A-Z][a-z]+(\s[A-Z][a-z]+)?)$/.test(trimmed)) {
        return [trimmed];
      }
      if ((trimmed.match(/,/g) || []).length > 1) {
        return trimmed.split(",").map(s => s.trim()).filter(Boolean);
      }
      return [trimmed];
    })
    .filter(Boolean);
  const normalized = new Set(parts.map(normalizeCityToken).filter(Boolean) as string[]);
  return [...normalized];
}

export interface LocationGroup {
  group: string;
  cities: { label: string; count: number }[];
}

export function buildLocationGroups(jobs: { location: string | null }[]): LocationGroup[] {
  const counts = new Map<string, number>();
  jobs.forEach(j => {
    for (const loc of getJobLocations(j.location)) {
      counts.set(loc, (counts.get(loc) || 0) + 1);
    }
  });

  const groups = new Map<string, { label: string; count: number }[]>();
  for (const [loc, count] of counts) {
    if (loc === "Remote" || loc === "Hybrid") {
      if (!groups.has(loc)) groups.set(loc, []);
      groups.get(loc)!.push({ label: loc, count });
    } else {
      const country = CITY_COUNTRY[loc] || "Other";
      if (!groups.has(country)) groups.set(country, []);
      groups.get(country)!.push({ label: loc, count });
    }
  }

  for (const cities of groups.values()) {
    cities.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  }

  const groupOrder: LocationGroup[] = [];
  if (groups.has("Remote")) { groupOrder.push({ group: "Remote", cities: groups.get("Remote")! }); groups.delete("Remote"); }
  if (groups.has("Hybrid")) { groupOrder.push({ group: "Hybrid", cities: groups.get("Hybrid")! }); groups.delete("Hybrid"); }

  const sortedCountries = [...groups.entries()]
    .map(([group, cities]) => ({ group, cities, total: cities.reduce((s, c) => s + c.count, 0) }))
    .sort((a, b) => b.total - a.total || a.group.localeCompare(b.group));

  for (const { group, cities } of sortedCountries) {
    groupOrder.push({ group, cities });
  }

  return groupOrder;
}
