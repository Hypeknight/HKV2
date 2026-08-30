export type HypeKnightLocation = {
  city: string;
  state: string;
  latitude?: number | null;
  longitude?: number | null;
  source: 'device' | 'manual' | 'profile';
};

export const LOCATION_STORAGE_KEY = 'hk_location_v2';
