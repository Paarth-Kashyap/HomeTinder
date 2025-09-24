// import 'dotenv/config'; // Uncomment this line if running locally and using a .env file
import { createClient } from "@supabase/supabase-js";
import pLimit from "p-limit";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TREB_API_KEY = process.env.TREB_API_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const headers = {
  Authorization: `Bearer ${TREB_API_KEY}`
};

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
  "or (PropertySubType eq 'Apartment' or PropertyType eq 'Apartment')) " +
  "and (ModificationTimestamp gt @lastTimestampValue " +
  "or (ModificationTimestamp eq @lastTimestampValue and ListingKey gt '@lastKeyValue'))" +
  "&$orderby=ModificationTimestamp,ListingKey";

const limit = pLimit(20); // max 20 parallel inserts

// ---------------- Get Last Processed Record ----------------
async function getCheckpointFromDB() {
  const { data, error } = await supabase
    .from("properties")
    .select("last_timestamp,last_key")
    .order("last_timestamp", { ascending: false })
    .order("last_key", { ascending: false })
    .limit(1);

  if (error) {
    console.error("Error fetching checkpoint:", error);
    return { lastTimestamp: "2024-01-01T00:00:00Z", lastKey: "0" };
  }

  if (data && data.length > 0) {
    return {
      lastTimestamp: data[0].last_timestamp || "2024-01-01T00:00:00Z",
      lastKey: data[0].last_key || "0"
    };
  }

  // Empty table → start fresh
  return { lastTimestamp: "2024-01-01T00:00:00Z", lastKey: "0" };
}

// ---------------- TREB Fetch Functions ----------------
async function fetchCount(input, lastTimestampValue, lastKeyValue) {
  let url = input.url
    .replace(/@lastTimestampValue/g, lastTimestampValue)
    .replace(/@lastKeyValue/g, lastKeyValue) + `&$top=0&$count=true`;

  const res = await fetch(encodeURI(url), { headers });
  if (!res.ok) throw new Error(`Count fetch failed: ${res.status}`);
  const json = await res.json();
  return json['@odata.count'];
}

async function fetchBatch(url, headers, batchSize, tsField, tsValue, keyField, keyValue) {
  let fetchUrl = url
    .replace(/@lastTimestampValue/g, tsValue)
    .replace(/@lastKeyValue/g, keyValue) + `&$top=${batchSize}`;

  const res = await fetch(encodeURI(fetchUrl), { headers });
  if (!res.ok) throw new Error(`Batch fetch failed: ${res.status}`);
  const json = await res.json();
  return json.value;
}

async function fetchMediaForMLS(mlsNumber) {
  const url = `https://query.ampre.ca/odata/Media?$filter=ResourceRecordKey eq '${mlsNumber}'&$orderby=Order`;
  const res = await fetch(encodeURI(url), { headers });
  if (!res.ok) {
    console.error(`Media fetch failed for MLS ${mlsNumber}: ${res.status}`);
    return [];
  }
  const json = await res.json();
  const media = json.value;

  // Deduplicate by Order
  const uniqueMedia = [];
  const seen = new Set();

  for (const m of media) {
    if (!seen.has(m.Order)) {
      seen.add(m.Order);
      uniqueMedia.push(m);
    }
  }

  // Return URLs sorted by Order, with duplicates removed
  return uniqueMedia.map(m => m.MediaURL);
}

// ---------------- Insert Property + Media ----------------
async function insertPropertyAndMedia(record) {
  const mlsNumber = record.ListingKey;
  const mediaUrls = await fetchMediaForMLS(mlsNumber);

  // Insert property
  const { error: propError } = await supabase.from("properties").upsert({
    mls_number: mlsNumber,
    address: record.UnparsedAddress,
    city: record.City,
    price: record.ListPrice,
    bedrooms: record.BedroomsTotal,
    bathrooms: record.BathroomsTotalInteger,
    property_type: record.PropertyType,
    last_timestamp: record.ModificationTimestamp,
    last_key: record.ListingKey,
    is_active: "true"
  }, { onConflict: "mls_number" });

  if (propError) console.error("Property insert error:", propError);

  // Insert media
  if (mediaUrls.length > 0) {
    const { error: mediaError } = await supabase.from("media").upsert({
      mls_number: mlsNumber,
      image_urls: mediaUrls
    }, { onConflict: "mls_number" });

    if (mediaError) console.error("Media insert error:", mediaError);
  }
}

// ---------------- Main Replication Loop ----------------
export async function runReplication() {
  const input = {
    url: queryPropertyURL,
    headers,
    batchSize: 1000,
    keyField: "ListingKey",
    timestampField: "ModificationTimestamp"
  };

  const { lastTimestamp, lastKey } = await getCheckpointFromDB();
  let lastTimestampValue = lastTimestamp;
  let lastKeyValue = lastKey;

  const totalCount = await fetchCount(input, lastTimestampValue, lastKeyValue);
  console.log(`Starting replication. Total new records: ${totalCount}`);

  let lastCount = input.batchSize;
  let processed = 0;

  while (lastCount >= input.batchSize) {
    const records = await fetchBatch(
      input.url,
      headers,
      input.batchSize,
      input.timestampField,
      lastTimestampValue,
      input.keyField,
      lastKeyValue
    );

    await Promise.all(records.map(r => limit(() => insertPropertyAndMedia(r))));

    processed += records.length;
    console.log(`Processed ${processed}/${totalCount}`);

    if (records.length > 0) {
      lastTimestampValue = records[records.length - 1][input.timestampField];
      lastKeyValue = records[records.length - 1][input.keyField];
    }

    lastCount = records.length;
  }

  console.log(`Replication completed. Total processed: ${processed}`);
}
