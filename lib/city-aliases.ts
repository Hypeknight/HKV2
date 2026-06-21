export const cityAliases: Record<string, string[]> = {
  'kansas city': ['kc', 'kcmo', 'kck', 'kansas city'],
  'st louis': ['stl', 'saint louis', 'st louis'],
  chicago: ['chi', 'chi town', 'chitown', 'chicago'],
  'new york': ['ny', 'nyc', 'new york city', 'new york'],
  atlanta: ['atl', 'atlanta'],
  houston: ['htx', 'houston'],
  'las vegas': ['vegas', 'lv', 'las vegas'],
};

export function expandCitySearch(value: string) {
  const query = value.trim().toLowerCase();

  if (!query) return [];

  const matches = new Set<string>([query]);

  for (const [city, aliases] of Object.entries(cityAliases)) {
    if (city.includes(query) || aliases.includes(query)) {
      matches.add(city);
      aliases.forEach((alias) => matches.add(alias));
    }
  }

  return Array.from(matches);
}