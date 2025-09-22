// MIT License

// Copyright (c) 2023 AMP Systems, LLC.

// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

// Node.js versions prior to 18: Uncomment the following line and run `npm
// install undici` to use undici instead of Node's built-in fetch.
// import { fetch } from 'undici';
import { mkdir, writeFile } from 'node:fs/promises';

// Set to true to log all requests.
const debug = false;

// Headers to send with each request.
const headers = {
  Authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ2ZW5kb3IvdHJyZWIvOTE0OCIsImF1ZCI6IkFtcFVzZXJzUHJkIiwicm9sZXMiOlsiQW1wVmVuZG9yIl0sImlzcyI6InByb2QuYW1wcmUuY2EiLCJleHAiOjI1MzQwMjMwMDc5OSwiaWF0IjoxNzU3NjAzMTk0LCJzdWJqZWN0VHlwZSI6InZlbmRvciIsInN1YmplY3RLZXkiOiI5MTQ4IiwianRpIjoiNDcyMmViNjAwOGY3OTFkYyIsImN1c3RvbWVyTmFtZSI6InRycmViIn0.xhuNipH-aE6XQTVIt8OzB7eTE1CjHSpds5979tnOmvo'
};

// Inputs to replicate. Each input will be fetched in series. Each input can be
// configured with the following properties:
//   name: Name of the input. Used for logging.
//   enabled: Whether to run this input. Defaults to false.
//   url: URL to fetch. Can include @lastTimestampValue and/or @lastKeyValue
//     placeholders. Don't use a $top, $skip, or $count query option, as these
//     will be added automatically.
//   headers: HTTP headers to send with each request.
//   batchSize: Number of records to fetch per request. Defaults to 100.
//   keyField: Field to use as the unique key for each record.
//   timestampField: Field to use as the timestamp for each record.
//   lastTimestampValue: Timestamp to use for the first request. Defaults to
//     1970-01-01T00:00:00Z.
//   lastKeyValue: Key value to use for the first request. Defaults to
//     '0'.
//   writePath: Path to write each record to. If not specified, records will
//     not be written to disk.
const inputs = [
  {
    // Fetch all available listings
    name: 'property',
    enabled: true,
    url: `https://query.ampre.ca/odata/Property?$filter=ContractStatus eq 'Available' and PropertyType eq 'Residential' and (ModificationTimestamp gt @lastTimestampValue or (ModificationTimestamp eq @lastTimestampValue and ListingKey gt '@lastKeyValue'))&$orderby=ModificationTimestamp,ListingKey`,
    headers,
    batchSize: 1000,
    keyField: 'ListingKey',
    timestampField: 'ModificationTimestamp',
    lastTimestampValue: '2024-01-01T00:00:00Z',
    lastKeyValue: '0',
    writePath: './data/property'
  },
  {
    // Fetch media from past 24 hours
    name: 'media',
    enabled: true,
    url: `https://query.ampre.ca/odata/Media?$filter=ModificationTimestamp gt @lastTimestampValue or (ModificationTimestamp eq @lastTimestampValue and MediaKey gt '@lastKeyValue')&$orderby=ModificationTimestamp,MediaKey`,
    headers,
    batchSize: 500,
    keyField: 'MediaKey',
    timestampField: 'ModificationTimestamp',
    lastTimestampValue: new Date(
      Date.now() - 1000 * 60 * 60 * 24
    ).toISOString(),
    lastKeyValue: '0',
    writePath: './data/media'
  }
];

// Start the run, log any exceptions, and exit with an error code if an error occurs.
run().catch((err) => {
  console.error(err);
  process.exit(1);
});

// Initiate a run for each input in series.
async function run() {
  const start = new Date();

  for (const input of inputs) {
    if (!input.enabled) continue;

    await runInput(input);
  }

  console.log(`[run  ] Total time: ${(new Date() - start) / 1000}s`);
}

// Run all of the batches for an input.
// This function will fetch the total number of records, then fetch
// batches of records in a series until all records have been received.
// Each batch will be written to disk if a writePath is specified.
// The last timestamp value will be read from the final record of each batch
// and used in the query for the next batch.
async function runInput(input) {
  const { name, batchSize, keyField, timestampField, writePath } = input;

  let lastTimestampValue = input.lastTimestampValue ?? '1970-01-01T00:00:00Z';
  let lastKeyValue = input.lastKeyValue ?? '0';

  console.log(`[input] Running input: ${name}`);

  const start = new Date();

  // Fetch the total number of records.
  const count = await fetchCount(input, lastTimestampValue, lastKeyValue);

  let lastCount = batchSize ?? 100;
  let totalCount = 0;

  const recordKeys = {};

  // Fetch batches of records until all records have been received.
  while (lastCount >= batchSize) {
    // Fetch a batch of records.
    const records = await fetchBatch(
      input,
      timestampField,
      lastTimestampValue,
      keyField,
      lastKeyValue
    );

    // Process each record.
    for (const record of records) {
      const key = record[keyField];
      const timestamp = record[timestampField];

      totalCount++;

      // If the key has already been seen, log the duplicate.
      if (recordKeys[key] === true) {
        console.log(`[input] duplicate key: ${key}`);
      } else {
        // Mark the key as seen.
        recordKeys[key] = true;
      }

      // Write the record to disk if a writePath is specified.
      if (writePath != null) {
        await writeRecord(input, record);
      }

      // Update the last timestamp value.
      lastTimestampValue = timestamp;
      lastKeyValue = key;
    }

    lastCount = records.length;
  }

  const unique = Object.keys(recordKeys).length;

  console.log(
    `[input] Expected ${count}. Fetched ${unique} unique, ${totalCount} total records in ${
      (new Date() - start) / 1000
    }s`
  );
}

// Fetch the total number of records.
async function fetchCount({ url, headers }, lastTimestampValue, lastKeyValue) {
  url = `${url
    .replace(/@lastTimestampValue/g, lastTimestampValue)
    .replace(/@lastKeyValue/g, lastKeyValue)}&$top=0&$count=true`;

  url = encodeURI(url);

  if (debug) console.log(url);

  const res = await fetch(url, { headers });

  if (res.status !== 200)
    throw new Error(`Error: ${res.status} ${res.statusText}`);

  const json = await res.json();

  console.log(`[count] status: ${res.status} total: ${json['@odata.count']}`);

  return json['@odata.count'];
}

// Fetch a batch of records.
async function fetchBatch(
  { url, headers, batchSize },
  timestampField,
  lastTimestampValue,
  keyField,
  lastKeyValue
) {
  // Replace the last timestamp value in the URL with the last timestamp value
  url = `${url
    .replace(/@lastTimestampValue/g, lastTimestampValue)
    .replace(/@lastKeyValue/g, lastKeyValue)}&$top=${batchSize}`;

  // Encode the URL using percent-encoding
  // https://developer.mozilla.org/en-US/docs/Glossary/Percent-encoding
  url = encodeURI(url);

  if (debug) console.log(url);

  const res = await fetch(url, { headers });

  if (res.status !== 200)
    throw new Error(`Error: ${res.status} ${res.statusText}`);

  const json = await res.json();

  console.log(
    `[batch] ${timestampField}: ${lastTimestampValue} ${keyField}: ${lastKeyValue} top: ${batchSize} status: ${res.status} records: ${json.value.length}`
  );

  return json.value;
}

// Write a record to disk.
async function writeRecord({ keyField, writePath }, record) {
  const key = record[keyField];
  await mkdir(writePath, { recursive: true });
  const filepath = `${writePath}/${key}.json`;

  await writeFile(filepath, JSON.stringify(record));
}
