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
  latitude: number | null;
  longitude: number | null;
}

/**
 * Fetches active countries from the database.
 */
export async function getActiveCountries(searchQuery?: string): Promise<CountryGeo[]> {
  const admin = getSupabaseAdmin();
  let query = admin.from('countries')
    .select('code, name, emoji_flag')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (searchQuery && searchQuery.trim().length > 0) {
    query = query.or(`name.ilike.%${searchQuery.trim()}%,code.ilike.%${searchQuery.trim()}%`);
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
export async function getCitiesOfCountry(countryCode: string, searchQuery?: string): Promise<CityGeo[]> {
  const admin = getSupabaseAdmin();
  let query = admin.from('cities')
    .select('id, name, country_code, latitude, longitude')
    .eq('country_code', countryCode.toUpperCase())
    .eq('is_active', true)
    .order('name', { ascending: true })
    .limit(200);

  if (searchQuery && searchQuery.trim().length > 0) {
    query = query.ilike('name', `%${searchQuery.trim()}%`);
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
  const boxSizes = [0.5, 1.5, 5.0, 15.0];
  let cities: any[] = [];
  
  for (const boxSize of boxSizes) {
    const { data, error } = await admin.from('cities')
      .select('id, name, country_code, latitude, longitude')
      .eq('is_active', true)
      .gte('latitude', lat - boxSize)
      .lte('latitude', lat + boxSize)
      .gte('longitude', lng - boxSize)
      .lte('longitude', lng + boxSize);

    if (error) {
      console.error('Failed to query cities inside bounding box:', error);
      throw new Error('Could not locate nearest city');
    }

    if (data && data.length > 0) {
      cities = data;
      break;
    }
  }

  // If still no cities found, query top 100 closest globally
  if (cities.length === 0) {
    const { data, error } = await admin.from('cities')
      .select('id, name, country_code, latitude, longitude')
      .eq('is_active', true)
      .limit(200);
      
    if (error || !data) {
      return null;
    }
    cities = data;
  }

  // Calculate exact distances using Haversine approximation
  let closestCity: any = null;
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
