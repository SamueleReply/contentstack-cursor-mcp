# Contentstack Content Management API MCP

This Multi-Command Plugin (MCP) provides a set of tools to interact with Contentstack's Content Management API directly from Cursor IDE.

## Installation

### NPM Package
```bash
npm install contentstack-cursor-mcp
```

### Manual Installation
1. Clone the repository:
```bash
git clone https://github.com/SamueleReply/contentstack-cursor-mcp.git
cd contentstack-cursor-mcp
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with your Contentstack credentials:
```
CONTENTSTACK_API_KEY=your_api_key
CONTENTSTACK_MANAGEMENT_TOKEN=your_management_token
CONTENTSTACK_DELIVERY_TOKEN=your_delivery_token
CONTENTSTACK_REGION=NA  # Optional, defaults to NA
```

## MCP Server Configuration

To use this package as an MCP server in Cursor, add the following configuration to your `.cursor/mcp.json` file:

```json
{
    "mcpServers": {
        "contentstack": {
            "command": "npx",
            "args": [
                "contentstack-cursor-mcp@latest"
            ],
            "env": {
                "CONTENTSTACK_API_KEY": "your_api_key",
                "CONTENTSTACK_MANAGEMENT_TOKEN": "your_management_token",
                "CONTENTSTACK_REGION": "NA",
                "CONTENTSTACK_DELIVERY_TOKEN": "your_delivery_token"
            }
        }
    }
}
```

Replace the environment variables with your actual Contentstack credentials.

### Available MCP Tools

When configured as an MCP server, the following tools are available in Cursor:

- `contentstack_get_content_types` - Get all content types
- `contentstack_get_content_type` - Get a specific content type
- `contentstack_create_content_type` - Create a new content type with custom schema
- `contentstack_update_content_type` - Update an existing content type schema
- `contentstack_get_entries` - Get entries for a content type
- `contentstack_get_entry` - Get a specific entry (supports environment and locale)
- `contentstack_create_entry` - Create a new entry (supports environment and locale)
- `contentstack_update_entry` - Update an entry (supports environment and locale)
- `contentstack_delete_entry` - Delete an entry (supports environment and locale)
- `contentstack_get_assets` - Get assets
- `contentstack_get_environments` - Get all environments
- `contentstack_publish_entry` - Publish an entry (supports environment and locale)
- `contentstack_unpublish_entry` - Unpublish an entry (supports environment and locale)
- `contentstack_get_languages` - Get all languages (locales) available in the stack
- `contentstack_localize_entry` - Localize an entry to a specific locale

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
- `getContentTypes(config)` - Get all content types
- `getContentType(uid, config)` - Get a specific content type
- `createContentType(data, config)` - Create a new content type
- `updateContentType(uid, data, config)` - Update an existing content type

### Entries
- `getEntries(contentTypeUid, query, config)` - Get all entries of a content type
- `getEntry(contentTypeUid, entryUid, options, config)` - Get a specific entry
- `createEntry(contentTypeUid, data, options, config)` - Create a new entry
- `updateEntry(contentTypeUid, entryUid, data, options, config)` - Update an existing entry
- `deleteEntry(contentTypeUid, entryUid, options, config)` - Delete an entry

### Assets
- `getAssets(query, config)` - Get all assets
- `getAsset(assetUid, config)` - Get a specific asset
- `uploadAsset(data, config)` - Upload a new asset

### Environments
- `getEnvironments(config)` - Get all environments
- `getEnvironment(uid, config)` - Get a specific environment

### Publishing
- `publishEntry(data, options, config)` - Publish an entry
- `unpublishEntry(data, options, config)` - Unpublish an entry

### Languages and Localization
- `getLanguages(config)` - Get all languages (locales) available in the stack
- `localizeEntry(contentTypeUid, entryUid, data, options, config)` - Localize an entry to a specific locale

## Environment and Locale Support

Entry operations (`getEntry`, `createEntry`, `updateEntry`, `deleteEntry`) and publishing operations (`publishEntry`, `unpublishEntry`) now support environment and locale parameters through an `options` object:

```javascript
// Get an entry with specific environment and locale
const entry = await cs.getEntry('content_type_uid', 'entry_uid', {
    environment: 'development',
    locale: 'en-us'
});

// Create an entry with environment and locale
const newEntry = await cs.createEntry('content_type_uid', entryData, {
    environment: 'development',
    locale: 'en-us'
});

// Update an entry with environment and locale
const updatedEntry = await cs.updateEntry('content_type_uid', 'entry_uid', updateData, {
    environment: 'development',
    locale: 'en-us'
});

// Delete an entry with environment and locale
await cs.deleteEntry('content_type_uid', 'entry_uid', {
    environment: 'development',
    locale: 'en-us'
});

// Publish an entry with environment and locale
const publishResult = await cs.publishEntry({
    entry: {
        uid: 'entry_uid',
        content_type: 'content_type_uid',
        version: 1
    },
    environments: ['development']
}, {
    environment: 'development',
    locale: 'en-us'
});

// Unpublish an entry with environment and locale
const unpublishResult = await cs.unpublishEntry({
    entry: {
        uid: 'entry_uid',
        content_type: 'content_type_uid'
    },
    environments: ['development']
}, {
    environment: 'development',
    locale: 'en-us'
});
```

The `options` parameter supports:
- `environment`: Target environment name
- `locale`: Target locale code (e.g., 'en-us', 'fr-fr')
- Any other query parameters supported by the Contentstack API

## Content Type Management

### Creating Content Types

You can create content types with various field types including text, number, select fields, JSON RTE, custom asset fields, and taxonomy fields.

#### Basic Content Type Example

```javascript
const newContentType = await cs.createContentType({
    content_type: {
        title: "Blog Post",
        uid: "blog_post",
        description: "Blog posts for the website",
        schema: [
            {
                display_name: "Title",
                uid: "title",
                data_type: "text",
                mandatory: true,
                unique: true,
                field_metadata: {
                    _default: true
                }
            },
            {
                display_name: "Content",
                uid: "content",
                data_type: "text",
                field_metadata: {
                    multiline: true
                }
            },
            {
                display_name: "Publish Date",
                uid: "publish_date",
                data_type: "isodate",
                mandatory: true
            }
        ]
    }
});
```

#### Content Type with Select Field (Simple Values)

```javascript
const contentTypeWithSelect = await cs.createContentType({
    content_type: {
        title: "Product",
        uid: "product",
        schema: [
            {
                display_name: "Title",
                uid: "title",
                data_type: "text",
                mandatory: true,
                unique: true
            },
            {
                display_name: "Priority",
                uid: "priority",
                data_type: "text",
                field_metadata: {
                    description: "Product priority level"
                },
                enum: {
                    advanced: false,
                    choices: [
                        { value: "1" },
                        { value: "2" },
                        { value: "3" }
                    ]
                }
            }
        ]
    }
});
```

#### Content Type with Select Field (Key-Value Pairs)

```javascript
const contentTypeWithAdvancedSelect = await cs.createContentType({
    content_type: {
        title: "Location",
        uid: "location",
        schema: [
            {
                display_name: "Title",
                uid: "title",
                data_type: "text",
                mandatory: true,
                unique: true
            },
            {
                display_name: "Region",
                uid: "region",
                data_type: "text",
                enum: {
                    advanced: true,
                    choices: [
                        { key: "New York", value: "NY" },
                        { key: "India", value: "IN" },
                        { key: "Australia", value: "AUS" }
                    ]
                }
            }
        ]
    }
});
```

#### Content Type with JSON RTE (Rich Text Editor)

```javascript
const contentTypeWithRTE = await cs.createContentType({
    content_type: {
        title: "Article",
        uid: "article",
        schema: [
            {
                display_name: "Title",
                uid: "title",
                data_type: "text",
                mandatory: true,
                unique: true
            },
            {
                data_type: "json",
                display_name: "JSON RTE Content",
                uid: "json_rte_content",
                field_metadata: {
                    allow_json_rte: true,
                    rich_text_type: "advanced",
                    description: "Rich text content with embedded entries",
                    default_value: ""
                },
                reference_to: [
                    "blog_post",
                    "product"
                ],
                non_localizable: false,
                multiple: false,
                mandatory: false,
                unique: false
            }
        ]
    }
});
```

#### Content Type with Custom Asset Field

```javascript
const contentTypeWithAsset = await cs.createContentType({
    content_type: {
        title: "Media Gallery",
        uid: "media_gallery",
        schema: [
            {
                display_name: "Title",
                uid: "title",
                data_type: "text",
                mandatory: true,
                unique: true
            },
            {
                display_name: "Gallery Images",
                uid: "gallery_images",
                data_type: "file",
                multiple: true,
                mandatory: false
            }
        ]
    }
});
```

#### Content Type with Taxonomy Fields

```javascript
const contentTypeWithTaxonomy = await cs.createContentType({
    content_type: {
        title: "Categorized Content",
        uid: "categorized_content",
        schema: [
            {
                display_name: "Title",
                uid: "title",
                data_type: "text",
                mandatory: true,
                unique: true
            },
            {
                uid: "taxonomies",
                taxonomies: [
                    {
                        taxonomy_uid: "taxonomy_1",
                        max_terms: 5,
                        mandatory: true,
                        non_localizable: false
                    },
                    {
                        taxonomy_uid: "taxonomy_2",
                        max_terms: 10,
                        mandatory: false,
                        non_localizable: false
                    }
                ],
                multiple: true
            }
        ]
    }
});
```

#### Content Type with Field Visibility Rules

```javascript
const contentTypeWithRules = await cs.createContentType({
    content_type: {
        title: "Conditional Form",
        uid: "conditional_form",
        schema: [
            {
                display_name: "Title",
                uid: "title",
                data_type: "text",
                mandatory: true,
                unique: true
            },
            {
                display_name: "Show Details",
                uid: "show_details",
                data_type: "boolean",
                mandatory: false
            },
            {
                display_name: "Details",
                uid: "details",
                data_type: "text",
                mandatory: false
            }
        ],
        field_rules: [
            {
                conditions: [
                    {
                        operand_field: "show_details",
                        operator: "equals",
                        value: true
                    }
                ],
                match_type: "all",
                actions: [
                    {
                        action: "show",
                        target_field: "details"
                    }
                ]
            }
        ]
    }
});
```

### Updating Content Types

To update a content type, you must provide the complete schema including all existing fields plus any new fields:

```javascript
// First, get the existing content type
const existingContentType = await cs.getContentType('blog_post');

// Modify the schema (add a new field, for example)
existingContentType.content_type.schema.push({
    display_name: "Author",
    uid: "author",
    data_type: "text",
    mandatory: false
});

// Update the content type
const updatedContentType = await cs.updateContentType('blog_post', {
    content_type: existingContentType.content_type
});
```

#### Field Visibility Rule Operators by Data Type

When creating field visibility rules, use these operators based on the operand field's data type:

- **Text**: `matches`, `does_not_match`, `starts_with`, `ends_with`, `contains`
- **Number**: `equals`, `not_equals`, `less_than`, `greater_than`, `less_than_or_equals`, `greater_than_or_equals`
- **Date**: `equals`, `not_equals`, `before_date`, `after_date` (use ISO format)
- **Boolean**: `is`, `is_not`
- **Select**: `is`, `is_not`
- **Reference**: `is`, `is_not`

## Usage Example

### As a Node.js Library

```javascript
const contentstack = require('contentstack-cursor-mcp');

// Initialize with default configuration from .env
const cs = contentstack.initialize();

// Or initialize with custom configuration
const csCustom = contentstack.initialize({
    region: 'EU',
    apiKey: 'your_api_key',
    managementToken: 'your_management_token',
    deliveryToken: 'your_delivery_token'
});

// Get all content types
async function example() {
    try {
        const contentTypes = await cs.getContentTypes();
        console.log(contentTypes);
    } catch (error) {
        console.error(error);
    }
}

// Get entries with query parameters
async function getEntriesExample() {
    try {
        const entries = await cs.getEntries('content_type_uid', {
            limit: 10,
            skip: 0,
            environment: 'production'
        });
        console.log(entries);
    } catch (error) {
        console.error(error);
    }
}

// Get entry with environment and locale
async function getEntryWithOptions() {
    try {
        const entry = await cs.getEntry('content_type_uid', 'entry_uid', {
            environment: 'development',
            locale: 'en-us',
            include_schema: true
        });
        console.log(entry);
    } catch (error) {
        console.error(error);
    }
}

// Get all available languages/locales
async function getLanguagesExample() {
    try {
        const languages = await cs.getLanguages();
        console.log('Available languages:', languages);
    } catch (error) {
        console.error(error);
    }
}

// Localize an entry to a specific locale
async function localizeEntryExample() {
    try {
        const localizedEntry = await cs.localizeEntry('content_type_uid', 'entry_uid', {
            entry: {
                title: 'Titre localisé',
                description: 'Description en français'
            }
        }, {
            locale: 'fr-fr'
        });
        console.log('Localized entry:', localizedEntry);
    } catch (error) {
        console.error(error);
    }
}
```

### As an MCP Server in Cursor

Once configured in your `.cursor/mcp.json`, you can use the Contentstack tools directly in Cursor by asking questions like:

- "Get all content types from Contentstack"
- "Show me entries for the 'blog_post' content type"
- "Get the entry with UID 'xyz123' from content type 'product' in the development environment"
- "Create a new blog post entry with title 'My New Post'"
- "Create a new content type called 'Product' with fields for title, description, price, and category"
- "Update the 'blog_post' content type to add an 'author' field"
- "Add field visibility rules to the 'contact_form' content type"
- "Create a content type with a select field for product categories"
- "Get all available languages in the stack"
- "Localize the entry 'xyz123' from content type 'blog_post' to French locale"

## Configuration

Each API call accepts an optional configuration object with the following properties:
- `region`: Contentstack region (NA, EU, AZURE_NA, AZURE_EU, GCP_NA, GCP_EU)
- `apiKey`: Contentstack API Key
- `managementToken`: Contentstack Management Token
- `deliveryToken`: Contentstack Delivery Token

## Error Handling

All API calls are wrapped in try-catch blocks and will throw errors with meaningful messages if something goes wrong. The error message will include the specific error message from the Contentstack API if available.

## Testing

Run the test suite to verify your configuration:

```bash
npm test
```

This will test various API endpoints and verify that your credentials and configuration are working correctly.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details. 