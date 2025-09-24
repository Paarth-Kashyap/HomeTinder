import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TREB_API_KEY = process.env.TREB_API_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const headers = { Authorization: `Bearer ${TREB_API_KEY}` };

// Same query URL as replicator for only valid listings
const queryPropertyURL =
  "https://query.ampre.ca/odata/Property?$filter=ContractStatus eq 'Available' " +
  "and ((PropertySubType eq 'Residential' or PropertyType eq 'Residential') " +
  "or (PropertySubType eq 'Residential Detached' or PropertyType eq 'Residential Detached') " +
  "or (PropertySubType eq 'Single Family Residence' or PropertyType eq 'Single Family Residence') " +
  "or (PropertySubType eq 'Detached' or PropertyType eq 'Detached') " +
  "or (PropertySubType eq 'Townhouse' or PropertyType eq 'Townhouse') " +
  "or (PropertySubType eq 'Att/Row/Townhouse' or PropertyType eq 'Att/Row/Townhouse') " +
  "or (PropertySubType eq 'Duplex' or PropertyType eq 'Duplex') " +
  "or (PropertySubType eq 'Triplex' or PropertyType eq 'Triplex') " +
  "or (PropertySubType eq 'Quadruplex' or PropertyType eq 'Quadruplex') " +
  "or (PropertySubType eq 'Multi Family' or PropertyType eq 'Multi Family') " +
  "or (PropertySubType eq 'Condominium' or PropertyType eq 'Condominium') " +
  "or (PropertySubType eq 'Condo Apt' or PropertyType eq 'Condo Apt') " +
  "or (PropertySubType eq 'Co-Ownership' or PropertyType eq 'Co-Ownership') " +
  "or (PropertySubType eq 'Own Your Own' or PropertyType eq 'Own Your Own') " +
  "or (PropertySubType eq 'Stock Cooperative' or PropertyType eq 'Stock Cooperative') " +
  "or (PropertySubType eq 'Apartment' or PropertyType eq 'Apartment'))" +
  "&$orderby=ListingKey";

/**
 * Fetch all active MLS numbers from TREB in batches using the same filter as replicator
 */
async function fetchAllActiveMLS() {
  let allMLS = [];
  let skip = 0;
  const batchSize = 1000;

  while (true) {
    const url = `${queryPropertyURL}&$top=${batchSize}&$skip=${skip}`;
    const res = await fetch(encodeURI(url), { headers });
    if (!res.ok) throw new Error(`TREB fetch failed: ${res.status}`);
    const json = await res.json();

    if (json.value.length === 0) break;
    allMLS.push(...json.value.map(r => r.ListingKey));

    skip += batchSize;
  }

  return new Set(allMLS);
}

/**
 * Main inactive sync logic
 */
export async function runInactiveSync() {
  console.log("Running inactive sync...");

  // 1. Get all MLS in TREB feed
  const activeMLS = await fetchAllActiveMLS();
  console.log(`Fetched ${activeMLS.size} active listings from TREB.`);

  // 2. Get all active MLS in Supabase
  const { data: dbData, error } = await supabase
    .from("properties")
    .select("mls_number")
    .eq("is_active", true);

  if (error) {
    console.error("Error fetching Supabase data:", error);
    return;
  }

  const dbMLS = new Set(dbData.map(d => d.mls_number));

  // 3. Find missing ones
  const missingMLS = [...dbMLS].filter(mls => !activeMLS.has(mls));

  if (missingMLS.length > 0) {
    console.log(`Marking ${missingMLS.length} listings inactive...`);
    const { error: updateError } = await supabase
      .from("properties")
      .update({ is_active: false })
      .in("mls_number", missingMLS);

    if (updateError) console.error("Update error:", updateError);
  } else {
    console.log("No inactive listings found.");
  }

  console.log("Inactive sync complete.");
}