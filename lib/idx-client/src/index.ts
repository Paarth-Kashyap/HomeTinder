const RESIDENTIAL_SUBTYPES = [
  'Residential',
  'Residential Detached',
  'Single Family Residence',
  'Detached',
  'Townhouse',
  'Att/Row/Townhouse',
  'Duplex',
  'Triplex',
  'Quadruplex',
  'Multi Family',
  'Condominium',
  'Condo Apt',
  'Co-Ownership',
  'Own Your Own',
  'Stock Cooperative',
  'Apartment'
] as const;

type ResidentialSubtype = typeof RESIDENTIAL_SUBTYPES[number];

export interface IdxProperty {
  ListingKey: string;
  UnparsedAddress: string;
  City: string;
  ListPrice: number;
  BedroomsTotal?: number;
  BathroomsTotalInteger?: number;
  PropertyType?: string | null;
  PropertySubType?: string | null;
  ModificationTimestamp: string;
}

export interface IdxMedia {
  MediaKey: string;
  ResourceRecordKey: string;
  MediaURL: string;
  Order?: number;
  ImageSizeDescription?: string;
  MediaCategory?: string;
}

const PROPERTY_MAP: Record<string, string> = {
  'Residential': 'Detached',
  'Residential Detached': 'Detached',
  'Single Family Residence': 'Detached',
  'Detached': 'Detached',
  'Townhouse': 'Townhouse',
  'Att/Row/Townhouse': 'Townhouse',
  'Duplex': 'Multi-Family',
  'Triplex': 'Multi-Family',
  'Quadruplex': 'Multi-Family',
  'Multi Family': 'Multi-Family',
  'Condominium': 'Condo',
  'Condo Apt': 'Condo',
  'Co-Ownership': 'Condo',
  'Own Your Own': 'Condo',
  'Stock Cooperative': 'Condo',
  'Apartment': 'Condo',
  'Cabin': 'Specialty Residential',
  'Ranch': 'Specialty Residential',
  'Farm': 'Rural Residential',
  'Agriculture': 'Rural Residential',
  default: 'Other'
};

const DEFAULT_BASE_URL = 'https://query.ampre.ca/odata';
const DEFAULT_TIMESTAMP = '1970-01-01T00:00:00Z';
const DEFAULT_KEY = '0';

const filterClauses = RESIDENTIAL_SUBTYPES.map((value) => {
  const escaped = value.replace(/'/g, "''");
  return `(PropertySubType eq '${escaped}' or PropertyType eq '${escaped}')`;
}).join(' or ');

const RESIDENTIAL_FILTER = `ContractStatus eq 'Available' and (${filterClauses})`;

export interface FetchResidentialPropertiesOptions {
  accessToken: string;
  baseUrl?: string;
  batchSize?: number;
  lastTimestamp?: string;
  lastKey?: string;
  logger?: (message: string) => void;
}

export interface FetchListingMediaOptions {
  accessToken: string;
  listingKey: string;
  baseUrl?: string;
  limit?: number;
  sizeDescription?: string;
}

function applyCursor(template: string, timestamp: string, key: string): string {
  return template
    .replace(/@lastTimestampValue/g, timestamp)
    .replace(/@lastKeyValue/g, key);
}

export function normalizePropertyType(subType?: string | null, type?: string | null): string {
  const normalized = (subType ?? type ?? '').trim();
  if (!normalized) return PROPERTY_MAP.default;
  return PROPERTY_MAP[normalized] ?? PROPERTY_MAP.default;
}

export function validatePrice(value: unknown): number | null {
  const price = Number(value);
  if (!Number.isFinite(price) || price <= 0) return null;
  return price;
}

export async function fetchResidentialProperties({
  accessToken,
  baseUrl = DEFAULT_BASE_URL,
  batchSize = 200,
  lastTimestamp = DEFAULT_TIMESTAMP,
  lastKey = DEFAULT_KEY,
  logger
}: FetchResidentialPropertiesOptions): Promise<IdxProperty[]> {
  const all: IdxProperty[] = [];
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/json'
  };

  let cursorTimestamp = lastTimestamp;
  let cursorKey = lastKey;

  while (true) {
    const rawUrl = `${baseUrl}/Property?$filter=${RESIDENTIAL_FILTER} and (ModificationTimestamp gt @lastTimestampValue or (ModificationTimestamp eq @lastTimestampValue and ListingKey gt '@lastKeyValue'))&$orderby=ModificationTimestamp,ListingKey&$top=${batchSize}`;
    const url = encodeURI(applyCursor(rawUrl, cursorTimestamp, cursorKey));

    const res = await fetch(url, { headers });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`IDX property fetch failed: ${res.status} ${res.statusText} ${text}`);
    }

    const json = await res.json() as { value: IdxProperty[] };
    const { value } = json;
    if (!Array.isArray(value) || value.length === 0) {
      break;
    }

    all.push(...value);
    cursorTimestamp = value[value.length - 1].ModificationTimestamp;
    cursorKey = value[value.length - 1].ListingKey;

    logger?.(`[idx] batch ${value.length} records, next cursor ${cursorTimestamp} / ${cursorKey}`);

    if (value.length < batchSize) {
      break;
    }
  }

  return all;
}

export async function fetchListingMedia({
  accessToken,
  listingKey,
  baseUrl = DEFAULT_BASE_URL,
  limit = 5,
  sizeDescription
}: FetchListingMediaOptions): Promise<IdxMedia[]> {
  if (!listingKey) return [];

  const escapedKey = listingKey.replace(/'/g, "''");
  const filters = [`ResourceRecordKey eq '${escapedKey}'`];
  if (sizeDescription) {
    const escapedSize = sizeDescription.replace(/'/g, "''");
    filters.push(`ImageSizeDescription eq '${escapedSize}'`);
  }

  const rawUrl = `${baseUrl}/Media?$filter=${filters.join(' and ')}&$orderby=Order&$top=${limit}`;
  const url = encodeURI(rawUrl);

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json'
    }
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`IDX media fetch failed: ${res.status} ${res.statusText} ${text}`);
  }

  const json = await res.json() as { value: IdxMedia[] };
  return Array.isArray(json.value) ? json.value : [];
}

export function isResidentialSubtype(value?: string | null): value is ResidentialSubtype {
  return Boolean(value && RESIDENTIAL_SUBTYPES.includes(value as ResidentialSubtype));
}

export { RESIDENTIAL_SUBTYPES, PROPERTY_MAP };
