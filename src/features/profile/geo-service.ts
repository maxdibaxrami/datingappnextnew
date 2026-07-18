import 'server-only';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export interface CountryGeo {
  code: string;
  name: string;
  emoji_flag: string | null;
}

export interface CityGeo {
  id: string;
  name: string;
  country_code: string;
  admin1_name: string | null;
  latitude: number | null;
  longitude: number | null;
}

const DEFAULT_CITY_LIMIT = 500;
const MAX_CITY_LIMIT = 1_000;

function cleanSearchQuery(value?: string): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) {
    return undefined;
  }
  return trimmed.replace(/[%_]/g, '\\$&');
}

/**
 * Fetches active countries from the database.
 */
export async function getActiveCountries(searchQuery?: string): Promise<CountryGeo[]> {
  const admin = getSupabaseAdmin();
  const cleanQuery = cleanSearchQuery(searchQuery);
  let query = admin.from('countries')
    .select('code, name, emoji_flag')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (cleanQuery) {
    query = query.or(`name.ilike.%${cleanQuery}%,code.ilike.%${cleanQuery}%`);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Failed to fetch countries:', error);
    throw new Error('Could not fetch countries');
  }

  return (data || []).map((row) => ({
    code: row.code,
    name: row.name,
    emoji_flag: row.emoji_flag
  }));
}

/**
 * Fetches cities belonging to a country.
 */
export async function getCitiesOfCountry(
  countryCode: string,
  searchQuery?: string,
  options?: { limit?: number; offset?: number },
): Promise<CityGeo[]> {
  const admin = getSupabaseAdmin();
  const cleanQuery = cleanSearchQuery(searchQuery);
  const limit = Math.min(Math.max(options?.limit ?? DEFAULT_CITY_LIMIT, 1), MAX_CITY_LIMIT);
  const offset = Math.max(options?.offset ?? 0, 0);
  let query = admin.from('cities')
    .select('id, name, country_code, admin1_name, latitude, longitude')
    .eq('country_code', countryCode.toUpperCase())
    .eq('is_active', true)
    .order('name', { ascending: true })
    .range(offset, offset + limit - 1);

  if (cleanQuery) {
    query = query.or(`name.ilike.%${cleanQuery}%,ascii_name.ilike.%${cleanQuery}%,admin1_name.ilike.%${cleanQuery}%`);
  }

  const { data, error } = await query;
  if (error) {
    console.error(`Failed to fetch cities for ${countryCode}:`, error);
    throw new Error('Could not fetch cities');
  }

  return (data || []).map((row) => ({
    id: row.id,
    name: row.name,
    country_code: row.country_code,
    admin1_name: row.admin1_name,
    latitude: row.latitude,
    longitude: row.longitude
  }));
}

/**
 * Resolves the closest city to coordinates using a bounding box approach.
 */
export async function getClosestCity(lat: number, lng: number): Promise<{ city: CityGeo; country: CountryGeo } | null> {
  const admin = getSupabaseAdmin();
  
  // Try bounding boxes of increasing sizes to find the closest city
  const boxSizes = [0.5, 1.5, 5.0, 15.0, 45.0, 90.0, 180.0];
  let cities: CityGeo[] = [];
  
  for (const boxSize of boxSizes) {
    const { data, error } = await admin.from('cities')
      .select('id, name, country_code, admin1_name, latitude, longitude')
      .eq('is_active', true)
      .gte('latitude', lat - boxSize)
      .lte('latitude', lat + boxSize)
      .gte('longitude', lng - boxSize)
      .lte('longitude', lng + boxSize)
      .limit(5_000);

    if (error) {
      console.error('Failed to query cities inside bounding box:', error);
      throw new Error('Could not locate nearest city');
    }

    if (data && data.length > 0) {
      cities = data;
      break;
    }
  }

  // If still no cities found, sample active cities with coordinates as a last resort.
  if (cities.length === 0) {
    const { data, error } = await admin.from('cities')
      .select('id, name, country_code, admin1_name, latitude, longitude')
      .eq('is_active', true)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .limit(200);
      
    if (error || !data) {
      return null;
    }
    cities = data;
  }

  // Calculate exact distances using Haversine approximation
  let closestCity: CityGeo | null = null;
  let minDistance = Infinity;

  for (const city of cities) {
    if (city.latitude === null || city.longitude === null) continue;
    
    // Quick Euclidean distance
    const dLat = city.latitude - lat;
    const dLng = city.longitude - lng;
    const distSq = dLat * dLat + dLng * dLng;
    
    if (distSq < minDistance) {
      minDistance = distSq;
      closestCity = city;
    }
  }

  if (!closestCity) return null;

  // Retrieve country details
  const { data: countryData } = await admin.from('countries')
    .select('code, name, emoji_flag')
    .eq('code', closestCity.country_code.toUpperCase())
    .maybeSingle();

  return {
    city: {
      id: closestCity.id,
      name: closestCity.name,
      country_code: closestCity.country_code,
      admin1_name: closestCity.admin1_name,
      latitude: closestCity.latitude,
      longitude: closestCity.longitude
    },
    country: countryData ? {
      code: countryData.code,
      name: countryData.name,
      emoji_flag: countryData.emoji_flag
    } : {
      code: closestCity.country_code,
      name: closestCity.country_code,
      emoji_flag: null
    }
  };
}
