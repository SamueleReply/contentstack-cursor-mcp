# Contentstack Content Management API MCP

This Multi-Command Plugin (MCP) provides a set of tools to interact with Contentstack's Content Management API.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the root directory with your Contentstack credentials:
```
CONTENTSTACK_API_KEY=your_api_key
CONTENTSTACK_MANAGEMENT_TOKEN=your_management_token
```

## Region Support

The MCP supports multiple Contentstack regions. By default, it uses the North America (NA) region. You can specify a different region for each API call.

Available regions:
- `NA` - North America (default)
- `EU` - Europe
- `AZURE_NA` - Azure North America
- `AZURE_EU` - Azure Europe
- `GCP_NA` - GCP North America
- `GCP_EU` - GCP Europe

## Available Tools

### Content Types
- `getContentTypes(region = 'NA')` - Get all content types
- `getContentType(uid, region = 'NA')` - Get a specific content type
- `createContentType(data, region = 'NA')` - Create a new content type

### Entries
- `getEntries(contentTypeUid, query, region = 'NA')` - Get all entries of a content type
- `getEntry(contentTypeUid, entryUid, region = 'NA')` - Get a specific entry
- `createEntry(contentTypeUid, data, region = 'NA')` - Create a new entry
- `updateEntry(contentTypeUid, entryUid, data, region = 'NA')` - Update an existing entry
- `deleteEntry(contentTypeUid, entryUid, region = 'NA')` - Delete an entry

### Assets
- `getAssets(query, region = 'NA')` - Get all assets
- `getAsset(assetUid, region = 'NA')` - Get a specific asset
- `uploadAsset(data, region = 'NA')` - Upload a new asset

### Environments
- `getEnvironments(region = 'NA')` - Get all environments
- `getEnvironment(uid, region = 'NA')` - Get a specific environment

### Publishing
- `publishEntry(data, region = 'NA')` - Publish an entry
- `unpublishEntry(data, region = 'NA')` - Unpublish an entry

## Usage Example

```javascript
const contentstack = require('./index');

// Get all content types from North America region (default)
async function exampleNA() {
    try {
        const contentTypes = await contentstack.getContentTypes();
        console.log(contentTypes);
    } catch (error) {
        console.error(error);
    }
}

// Get all content types from Europe region
async function exampleEU() {
    try {
        const contentTypes = await contentstack.getContentTypes('EU');
        console.log(contentTypes);
    } catch (error) {
        console.error(error);
    }
}
```

## Error Handling

All API calls are wrapped in try-catch blocks and will throw errors with meaningful messages if something goes wrong. The error message will include the specific error message from the Contentstack API if available.

## Authentication

The MCP uses the following headers for authentication:
- `api_key`: Your Contentstack API key
- `authorization`: Your Contentstack Management token

Make sure to set these values in your `.env` file before using the MCP. 