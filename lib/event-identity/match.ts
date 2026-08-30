export type EventIdentityCandidate = {
  id: string;
  source: 'hypeknight' | 'external';
  name: string | null;
  venueName?: string | null;
  city?: string | null;
  state?: string | null;
  startAt?: string | null;
  provider?: string | null;
  url?: string | null;
  slug?: string | null;
};

export type EventIdentityInput = {
  name: string;
  venueName?: string | null;
  city?: string | null;
  state?: string | null;
  startAt?: string | null;
};

export type EventIdentityMatch = EventIdentityCandidate & {
  score: number;
  confidence: 'strong' | 'possible' | 'weak';
  reasons: string[];
};

function clean(value: string | null | undefined) {
  return String(value || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function tokens(value: string | null | undefined) {
  return new Set(clean(value).split(' ').filter((token) => token.length > 1));
}

function similarity(left: string | null | undefined, right: string | null | undefined) {
  const a = clean(left);
  const b = clean(right);
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.88;

  const aTokens = tokens(a);
  const bTokens = tokens(b);
  const union = new Set([...aTokens, ...bTokens]);
  if (!union.size) return 0;
  let intersection = 0;
  aTokens.forEach((token) => {
    if (bTokens.has(token)) intersection += 1;
  });
  return intersection / union.size;
}

function sameDay(left?: string | null, right?: string | null) {
  if (!left || !right) return false;
  const a = new Date(left);
  const b = new Date(right);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return false;
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function timeDistanceHours(left?: string | null, right?: string | null) {
  if (!left || !right) return null;
  const a = new Date(left).getTime();
  const b = new Date(right).getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.abs(a - b) / 3_600_000;
}

export function scoreEventIdentity(input: EventIdentityInput, candidate: EventIdentityCandidate): EventIdentityMatch {
  let score = 0;
  const reasons: string[] = [];

  const nameScore = similarity(input.name, candidate.name);
  if (nameScore >= 0.9) {
    score += 45;
    reasons.push('Very similar event name');
  } else if (nameScore >= 0.65) {
    score += 32;
    reasons.push('Similar event name');
  } else if (nameScore >= 0.45) {
    score += 18;
    reasons.push('Partially similar event name');
  }

  const cityMatch = clean(input.city) && clean(input.city) === clean(candidate.city);
  const stateMatch = clean(input.state) && clean(input.state) === clean(candidate.state);
  if (cityMatch && stateMatch) {
    score += 18;
    reasons.push('Same city and state');
  } else if (stateMatch) {
    score += 6;
  }

  const venueScore = similarity(input.venueName, candidate.venueName);
  if (venueScore >= 0.85) {
    score += 18;
    reasons.push('Same or very similar venue');
  } else if (venueScore >= 0.55) {
    score += 10;
    reasons.push('Similar venue');
  }

  const hours = timeDistanceHours(input.startAt, candidate.startAt);
  if (hours !== null && hours <= 2) {
    score += 19;
    reasons.push('Nearly identical date and time');
  } else if (sameDay(input.startAt, candidate.startAt)) {
    score += 14;
    reasons.push('Same event date');
  } else if (hours !== null && hours <= 24) {
    score += 8;
    reasons.push('Within one day');
  }

  score = Math.min(100, score);
  return {
    ...candidate,
    score,
    confidence: score >= 75 ? 'strong' : score >= 50 ? 'possible' : 'weak',
    reasons,
  };
}

export function rankEventIdentityMatches(input: EventIdentityInput, candidates: EventIdentityCandidate[], minimumScore = 50) {
  return candidates
    .map((candidate) => scoreEventIdentity(input, candidate))
    .filter((candidate) => candidate.score >= minimumScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
}
