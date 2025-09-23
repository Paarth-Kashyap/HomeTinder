// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'

// IDX/RESO Web API Configuration
const IDX_API_BASE_URL = 'https://query.ampre.ca/odata'
const IDX_ACCESS_TOKEN = Deno.env.get('TREB_ACCESS_TOKEN') // Using same env var name

const isProd = Deno.env.get('IS_PROD') === 'true'
let supabaseUrl: string
let supabaseServiceKey: string
let supabaseAnonKey: string
let apiUrl: string
// Supabase Configuration
if (isProd) {
  supabaseUrl = Deno.env.get('DB_URL_PROD')!
  supabaseServiceKey = Deno.env.get('DB_SERVICE_ROLE_KEY_PROD')!
  supabaseAnonKey = Deno.env.get('DB_ANON_KEY_PROD')!
}else{
  supabaseUrl = Deno.env.get('DB_URL_DEV')!
  supabaseServiceKey = Deno.env.get('DB_SERVICE_ROLE_KEY_DEV')!
  supabaseAnonKey = Deno.env.get('DB_ANON_KEY_DEV')!
}

console.log("DB_URL:", supabaseUrl)
console.log("DB_SERVICE_ROLE_KEY present?", !!supabaseServiceKey)
console.log("DB_ANON_KEY present?", !!supabaseAnonKey)

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Property interface matching your database schema
interface Property {
  mls_number: string
  address: string
  city: string
  price: number
  bedrooms: number
  bathrooms: number
  property_type: string
  image_url?: string
}

// IDX/RESO OData API response interfaces
interface IdxProperty {
  ListingKey: string
  UnparsedAddress: string
  City: string
  StateOrProvince: string
  PostalCode: string
  ListPrice: number
  BedroomsTotal: number
  BathroomsTotalInteger: number
  PropertyType: string
  PropertySubType: string
  PublicRemarks: string
  ModificationTimestamp: string
  ContractStatus: string
}

interface IdxMedia {
  MediaURL: string
  Order: number
  ImageSizeDescription: string
}

interface ODataResponse<T> {
  value: T[]
  '@odata.count'?: number
}

const PROPERTY_MAP: Record<string, string> = {
  // Detached / Single-Family
  "Single Family Residence": "Detached",
  "Detached": "Detached",

  // Attached Homes
  "Townhouse": "Townhouse",
  "Att/Row/Townhouse": "Townhouse",
  "Duplex": "Multi-Family",
  "Triplex": "Multi-Family",
  "Quadruplex": "Multi-Family",
  "Multi Family": "Multi-Family",

  // Condos / Apartments
  "Condominium": "Condo",
  "Condo Apt": "Condo",
  "Co-Ownership": "Condo",
  "Own Your Own": "Condo",
  "Stock Cooperative": "Condo",
  "Apartment": "Condo",

  // Specialty Residential
  "Cabin": "Specialty Residential",
  "Ranch": "Specialty Residential",
  "Farm": "Rural Residential",
  "Agriculture": "Rural Residential",

  // fallback
  "default": "Other"
}


// Function to fetch property images from Media endpoint
async function fetchPropertyImages(listingKey: string): Promise<string | undefined> {
  if (!IDX_ACCESS_TOKEN) {
    return undefined
  }

  try {
    const mediaUrl = `${IDX_API_BASE_URL}/Media?$filter=ResourceRecordKey eq '${listingKey}' and ImageSizeDescription eq 'Largest'&$select=MediaURL,Order&$orderby=Order asc&$top=1`
    
    const response = await fetch(mediaUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${IDX_ACCESS_TOKEN}`,
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      console.warn(`Failed to fetch media for listing ${listingKey}: ${response.status}`)
      return undefined
    }

    const data: ODataResponse<IdxMedia> = await response.json()
    return data.value?.[0]?.MediaURL || undefined
  } catch (error) {
    console.warn("IDX_ACCESS_TOKEN exists?", !!IDX_ACCESS_TOKEN)

    console.warn(`Error fetching media for listing ${listingKey}:`, error)
    return undefined
  }
}

// Function to transform IDX property to our database format
async function transformIdxProperty(idxProp: IdxProperty): Promise<Property> {
  function normalizePropertyType(idxProp: IdxProperty): string {
    const rawType = (idxProp.PropertySubType || idxProp.PropertyType || "").trim()
    return PROPERTY_MAP[rawType] || PROPERTY_MAP["default"] 
  }
  // price filtering sanity check
  const price = Number(idxProp.ListPrice)
  if (!Number.isFinite(price) || price <= 0 || !Number.isInteger(price)) {
    console.warn(`Skipping property ${idxProp.ListingKey} due to invalid price:`, idxProp.ListPrice)
    return null
  }
  // Fetch the first image for this property
  const imageUrl = await fetchPropertyImages(idxProp.ListingKey)

  return {
    mls_number: idxProp.ListingKey,
    address: idxProp.UnparsedAddress,
    city: idxProp.City,
    price,
    bedrooms: idxProp.BedroomsTotal,
    bathrooms: idxProp.BathroomsTotalInteger,
    property_type: normalizePropertyType(idxProp),
    image_url: imageUrl
  }
}

// Function to fetch properties from IDX/RESO API
async function fetchIdxProperties(): Promise<IdxProperty[]> {
  if (!IDX_ACCESS_TOKEN) throw new Error("TREB_ACCESS_TOKEN not set");

  let all: IdxProperty[] = [];
  let lastTimestamp = "2025-09-20T00:00:00Z";
  let lastKey = "0";
  const batchSize = 100;

  while (true) {
    // exact replication URL pattern
    let url = `${IDX_API_BASE_URL}/Property` +
      `?$filter=ContractStatus eq 'Available' and PropertyType eq 'Residential' and (` +
      `ModificationTimestamp gt @lastTimestampValue or (` +
      `ModificationTimestamp eq @lastTimestampValue and ListingKey gt '@lastKeyValue'))` +
      `&$orderby=ModificationTimestamp,ListingKey&$top=${batchSize}`;

    // substitute placeholders with actual values
    url = url
      .replace(/@lastTimestampValue/g, lastTimestamp)
      .replace(/@lastKeyValue/g, lastKey);

    console.log("Fetching:", url);

    const response = await fetch(encodeURI(url), {
      headers: {
        Authorization: `Bearer ${IDX_ACCESS_TOKEN}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`IDX API error: ${response.status} ${errorText}`);
    }

    const data: ODataResponse<IdxProperty> = await response.json();
    console.log(`[batch] got ${data.value.length}`);
    
    

    if (data.value.length === 0) break;

    all.push(...data.value);

    // update placeholders from the last record
    const last = data.value[data.value.length - 1];
    lastTimestamp = last.ModificationTimestamp;
    lastKey = last.ListingKey;
    console.log(`[cursor] last ListingKey=${last.ListingKey}, lastTimestamp=${last.ModificationTimestamp}`);
    if (data.value.length < batchSize) break; // finished
  }

  console.log(`[done] total properties fetched: ${all.length}`);
  return all;
}

// Function to insert properties into Supabase
async function insertProperties(properties: Property[]): Promise<void> {
  try {

    // 🔍 Debug log: raw payload
    console.log("=== Insert Payload ===")
    console.log(JSON.stringify(properties, null, 2))
    console.log("======================")

    const { error } = await supabase
      .from('properties')
      .upsert(properties, { 
        onConflict: 'mls_number',
        ignoreDuplicates: true 
      })

    if (error) {
      throw error
    }

    console.log(`Successfully inserted/updated ${properties.length} properties`)
  } catch (error) {
    console.error('Error inserting properties:', error)
    throw error
  }
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })
  }

  try {
    console.log('Starting IDX/RESO property load...')
    
    // Get limit from request body or use default
    const body = await req.json().catch(() => ({}))
    const limit = body.limit || 50

    let idxProperties: IdxProperty[] = []

    
    idxProperties = await fetchIdxProperties()
     
    console.log(`Fetched ${idxProperties.length} properties from IDX/RESO API`)
    
    if (idxProperties.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No properties found in IDX/RESO API response',
          count: 0 
        }),
        { 
          status: 200,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          } 
        }
      )
    }

    // Transform properties to match our database schema (with image fetching)
    console.log('Transforming properties and fetching images...')
    const transformedProperties = (
      await Promise.all(idxProperties.map(transformIdxProperty))
    ).filter((p): p is Property => p !== null)

    // Insert properties into database
    await insertProperties(transformedProperties)
    console.log("apiURL: ", apiUrl)
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Successfully loaded ${transformedProperties.length} properties`,
        count: transformedProperties.length,
        limit: limit
      }),
      { 
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        } 
      }
    )

  } catch (error) {
    console.error('Error in loadTreb function:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        } 
      }
    )
  }
})
