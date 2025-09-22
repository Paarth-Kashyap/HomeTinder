# OData Filter Cheatsheet for AMP RESO Web API

This cheatsheet provides ready-to-paste `$filter` fragments and full URL templates compatible with your replication pattern in `Misc/web-api-replicate.mjs`.

Notes
- Always include `$orderby=ModificationTimestamp,ListingKey` (or `MediaKey` for Media) with the incremental pattern.
- Use the timestamp+key tie-breaker in $filter:
  - Property: `(ModificationTimestamp gt @lastTimestampValue or (ModificationTimestamp eq @lastTimestampValue and ListingKey gt '@lastKeyValue'))`
  - Media: `(ModificationTimestamp gt @lastTimestampValue or (ModificationTimestamp eq @lastTimestampValue and MediaKey gt '@lastKeyValue'))`
- URL-encode values in production.

Property examples
1) Available residential only
$filter=ContractStatus eq 'Available' and PropertyType eq 'Residential' and (ModificationTimestamp gt @lastTimestampValue or (ModificationTimestamp eq @lastTimestampValue and ListingKey gt '@lastKeyValue'))

2) Status and price band
$filter=StandardStatus eq 'Active' and ListPrice ge 500000 and ListPrice le 1000000 and (ModificationTimestamp gt @lastTimestampValue or (ModificationTimestamp eq @lastTimestampValue and ListingKey gt '@lastKeyValue'))

3) Beds, baths, detached freehold
$filter=BedroomsTotal ge 3 and BathroomsTotalInteger ge 2 and PropertyType eq 'Residential' and PropertySubType eq 'Single Family Residence' and (ModificationTimestamp gt @lastTimestampValue or (ModificationTimestamp eq @lastTimestampValue and ListingKey gt '@lastKeyValue'))

4) City or postal prefix
$filter=(City eq 'Toronto' or startswith(PostalCode,'M5')) and (ModificationTimestamp gt @lastTimestampValue or (ModificationTimestamp eq @lastTimestampValue and ListingKey gt '@lastKeyValue'))

5) Recent major changes only (uses MajorChangeTimestamp)
$filter=MajorChangeTimestamp ge 2025-09-01T00:00:00Z and (MajorChangeTimestamp gt @lastTimestampValue or (MajorChangeTimestamp eq @lastTimestampValue and ListingKey gt '@lastKeyValue'))
$orderby=MajorChangeTimestamp,ListingKey

6) Photos/documents changed since date (use Property timestamps that mirror Media)
$filter=PhotosChangeTimestamp ge 2025-09-01T00:00:00Z or DocumentsChangeTimestamp ge 2025-09-01T00:00:00Z
$orderby=ListingKey

7) With open house upcoming (if OpenHouse resources/fields are modeled; fallback via Showing/Availability fields if present)
$filter=OpenHouseDate ge 2025-09-21T00:00:00Z and (ModificationTimestamp gt @lastTimestampValue or (ModificationTimestamp eq @lastTimestampValue and ListingKey gt '@lastKeyValue'))

8) Geo bounding box (if Lat/Long fields are present)
$filter=Latitude ge 43.6 and Latitude le 43.9 and Longitude ge -79.6 and Longitude le -79.2 and (ModificationTimestamp gt @lastTimestampValue or (ModificationTimestamp eq @lastTimestampValue and ListingKey gt '@lastKeyValue'))

9) New construction and year built
$filter=YearBuilt ge 2015 and ConstructionMaterials has 'New Construction' and (ModificationTimestamp gt @lastTimestampValue or (ModificationTimestamp eq @lastTimestampValue and ListingKey gt '@lastKeyValue'))

10) Waterfront via PropertyLandmark (join approach)
- First fetch ListingKeys from PropertyLandmark:
  /odata/PropertyLandmark?$select=ListingKey&$filter=LandmarkType eq 'Waterbody' and Distance le 100
- Then filter Property by ListingKey in (...) batch queries.

Media examples
11) Media incremental (all property media)
$filter=ResourceName eq 'Property' and (ModificationTimestamp gt @lastTimestampValue or (ModificationTimestamp eq @lastTimestampValue and MediaKey gt '@lastKeyValue'))
$orderby=ModificationTimestamp,MediaKey

12) Only images of a given size
$filter=ResourceName eq 'Property' and ImageSizeDescription eq 'Large' and (ModificationTimestamp gt @lastTimestampValue or (ModificationTimestamp eq @lastTimestampValue and MediaKey gt '@lastKeyValue'))

13) Media for a specific listing
$filter=ResourceRecordKey eq '123456' and ResourceName eq 'Property'
$orderby=ModificationTimestamp,MediaKey

14) Only active media (exclude deleted)
$filter=MediaStatus ne 'Deleted' and ResourceName eq 'Property' and (ModificationTimestamp gt @lastTimestampValue or (ModificationTimestamp eq @lastTimestampValue and MediaKey gt '@lastKeyValue'))

Metadata helpers
15) Explore fields for a resource
/odata/Field?$filter=ResourceName eq 'Property'

16) Explore lookups (enumerations)
/odata/Lookup?$filter=LookupName eq 'PropertyType'

Full URL templates
Property
https://query.ampre.ca/odata/Property?$select=ListingKey,ModificationTimestamp,ListPrice,StandardStatus,PropertyType,City&$filter=StandardStatus eq 'Active' and ListPrice ge 500000 and ListPrice le 1000000 and (ModificationTimestamp gt @lastTimestampValue or (ModificationTimestamp eq @lastTimestampValue and ListingKey gt '@lastKeyValue'))&$orderby=ModificationTimestamp,ListingKey&$top=100

Media
https://query.ampre.ca/odata/Media?$select=MediaKey,ModificationTimestamp,ResourceRecordKey,ImageSizeDescription,MediaURL&$filter=ResourceName eq 'Property' and ImageSizeDescription eq 'Large' and (ModificationTimestamp gt @lastTimestampValue or (ModificationTimestamp eq @lastTimestampValue and MediaKey gt '@lastKeyValue'))&$orderby=ModificationTimestamp,MediaKey&$top=500

Caveats
- Field names vary by MLS; confirm via `/odata/Field?$filter=ResourceName eq 'Property'`.
- startswith/substringof semantics follow OData v4; use `startswith(Field,'X')` and `contains(Field,'X')` if supported.
- For media-triggered changes, prefer Property.PhotosChangeTimestamp/DocumentsChangeTimestamp/MediaChangeTimestamp rather than Property.ModificationTimestamp.
