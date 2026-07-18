/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const { Country, City, State } = require('country-state-city');

// Load environment variables manually
function loadEnv() {
  const envPath = path.resolve(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const match = line.match(/^\s*([\w\.\-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let val = match[2] || '';
        if (val.startsWith('"') && val.endsWith('"')) {
          val = val.substring(1, val.length - 1);
        } else if (val.startsWith("'") && val.endsWith("'")) {
          val = val.substring(1, val.length - 1);
        }
        process.env[key] = val;
      }
    }
  }
}

loadEnv();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not found in .env file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Deterministic UUID v4-like hash
function getDeterministicUUID(str) {
  const hash = crypto.createHash('sha256').update(str).digest('hex');
  const g1 = hash.substring(0, 8);
  const g2 = hash.substring(8, 12);
  const g3 = '4' + hash.substring(12, 15);
  const g4 = ((parseInt(hash.substring(15, 17), 16) & 0x3f) | 0x80).toString(16).padStart(2, '0') + hash.substring(17, 19);
  const g5 = hash.substring(19, 31);
  return `${g1}-${g2}-${g3}-${g4}-${g5}`;
}

async function seed() {
  console.log('Fetching countries...');
  const allCountries = Country.getAllCountries();
  console.log(`Found ${allCountries.length} countries.`);

  const countriesData = allCountries.map((c) => ({
    code: c.isoCode.toUpperCase(),
    name: c.name,
    emoji_flag: c.emoji || null,
    is_active: true,
    sort_order: 10
  }));

  console.log('Seeding countries table (upsert)...');
  const countryBatches = chunk(countriesData, 50);
  for (let i = 0; i < countryBatches.length; i++) {
    const { error } = await supabase.from('countries').upsert(countryBatches[i], { onConflict: 'code' });
    if (error) {
      console.error(`Error seeding country batch ${i}:`, error.message);
      process.exit(1);
    }
    console.log(`Seed country batch ${i + 1}/${countryBatches.length} complete.`);
  }

  console.log('Fetching cities...');
  const allCities = City.getAllCities();
  console.log(`Found ${allCities.length} cities total.`);

  const citiesData = allCities.map((city) => {
    const uniqueString = `${city.countryCode}:${city.name}:${city.stateCode || ''}`;
    const id = getDeterministicUUID(uniqueString);
    const lat = parseFloat(city.latitude);
    const lng = parseFloat(city.longitude);
    const state = city.stateCode
      ? State.getStateByCodeAndCountry(city.stateCode, city.countryCode)
      : null;

    return {
      id,
      name: city.name,
      ascii_name: city.name.normalize('NFD').replace(/[\u0300-\u036f]/g, ''),
      country_code: city.countryCode.toUpperCase(),
      admin1_code: city.stateCode || null,
      admin1_name: state?.name || null,
      is_active: true,
      latitude: isNaN(lat) ? null : lat,
      longitude: isNaN(lng) ? null : lng,
      search_keywords: [
        city.name.toLowerCase(),
        state?.name?.toLowerCase(),
        city.stateCode?.toLowerCase(),
      ].filter(Boolean),
      timezone: null,
      population: null
    };
  });

  console.log('Seeding cities table in batches of 2000 (upsert)...');
  const cityBatches = chunk(citiesData, 2000);
  for (let i = 0; i < cityBatches.length; i++) {
    const { error } = await supabase.from('cities').upsert(cityBatches[i], { onConflict: 'id' });
    if (error) {
      console.error(`Error seeding city batch ${i}:`, error.message);
      process.exit(1);
    }
    if ((i + 1) % 10 === 0 || i === cityBatches.length - 1) {
      console.log(`Seeded city batch ${i + 1}/${cityBatches.length} (${Math.round((i + 1) / cityBatches.length * 100)}%)`);
    }
  }

  console.log('Seeding completed successfully!');
}

function chunk(arr, size) {
  const result = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

seed().catch((err) => {
  console.error('Unhandled error during seed:', err);
  process.exit(1);
});
