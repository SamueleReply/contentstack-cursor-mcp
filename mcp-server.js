#!/usr/bin/env node

const contentstack = require('./index.js');
const Ajv = require('ajv');

class ContentstackMCPServer {
    constructor() {
        this.server = null;
        this.Server = null;
        this.StdioServerTransport = null;
        this.CallToolRequestSchema = null;
        this.ErrorCode = null;
        this.ListToolsRequestSchema = null;
        this.McpError = null;
        this.ajv = new Ajv({ allErrors: true });
        this.toolSchemas = new Map();
    }

    async initialize() {
        // Dynamic imports for ES modules
        const serverModule = await import('@modelcontextprotocol/sdk/server/index.js');
        const stdioModule = await import('@modelcontextprotocol/sdk/server/stdio.js');
        const typesModule = await import('@modelcontextprotocol/sdk/types.js');

        this.Server = serverModule.Server;
        this.StdioServerTransport = stdioModule.StdioServerTransport;
        this.CallToolRequestSchema = typesModule.CallToolRequestSchema;
        this.ErrorCode = typesModule.ErrorCode;
        this.ListToolsRequestSchema = typesModule.ListToolsRequestSchema;
        this.McpError = typesModule.McpError;

        this.server = new this.Server(
            {
                name: 'contentstack-mcp',
                version: '1.1.0',
            },
            {
                capabilities: {
                    tools: {
                        listChanged: true
                    }
                },
            }
        );

        this.setupToolHandlers();
        this.setupErrorHandling();
    }

    validateToolArguments(toolName, args, inputSchema) {
        // Store the schema for this tool if not already stored
        if (!this.toolSchemas.has(toolName)) {
            this.toolSchemas.set(toolName, this.ajv.compile(inputSchema));
        }

        const validate = this.toolSchemas.get(toolName);
        const isValid = validate(args);

        if (!isValid) {
            const errors = validate.errors || [];
            const errorMessages = errors.map(error => {
                const path = error.instancePath ? `at '${error.instancePath}'` : 'at root';

                switch (error.keyword) {
                    case 'required':
                        return `Missing required field: '${error.params.missingProperty}'`;
                    case 'type':
                        return `Invalid type ${path}: expected ${error.params.type}, got ${typeof error.data}`;
                    case 'properties':
                        return `Invalid property ${path}: ${error.message}`;
                    case 'additionalProperties':
                        return `Unexpected property ${path}: '${error.params.additionalProperty}'`;
                    default:
                        return `Validation error ${path}: ${error.message}`;
                }
            });

            // Create a helpful error message with suggestions
            let helpfulMessage = `Invalid arguments for tool '${toolName}':\n`;
            helpfulMessage += errorMessages.map(msg => `  - ${msg}`).join('\n');

            // Add specific help for common issues
            if (toolName === 'contentstack_create_entry') {
                const hasDataButNoEntry = args.data && !args.data.entry;
                if (hasDataButNoEntry) {
                    helpfulMessage += '\n\nHelpful tip: For creating entries, wrap your content data in an "entry" object:';
                    helpfulMessage += '\n  Example: { "contentTypeUid": "blog", "data": { "entry": { "title": "My Title", "content": "..." } } }';
                }
            }

            if (toolName === 'contentstack_update_entry') {
                const hasDataButNoEntry = args.data && !args.data.entry;
                if (hasDataButNoEntry) {
                    helpfulMessage += '\n\nHelpful tip: For updating entries, wrap your content data in an "entry" object:';
                    helpfulMessage += '\n  Example: { "contentTypeUid": "blog", "entryUid": "entry123", "data": { "entry": { "title": "Updated Title" } } }';
                }
            }

            if (toolName === 'contentstack_publish_entry') {
                helpfulMessage += '\n\nHelpful tip: Publishing requires contentTypeUid, entryUid, entry, locale, and version fields:';
                helpfulMessage += '\n  Example: { "contentTypeUid": "blog", "entryUid": "entry123", "entry": { "environments": ["dev"], "locales": ["en-us"] }, "locale": "en-us", "version": 1 }';
            }

            if (toolName === 'contentstack_create_content_type') {
                const hasDataButNoContentType = args.data && !args.data.content_type;
                if (hasDataButNoContentType) {
                    helpfulMessage += '\n\nHelpful tip: For creating content types, wrap your schema in a "content_type" object:';
                    helpfulMessage += '\n  Example: { "data": { "content_type": { "title": "Blog Post", "uid": "blog_post", "schema": [...] } } }';
                }
            }

            if (toolName === 'contentstack_update_content_type') {
                const hasDataButNoContentType = args.data && !args.data.content_type;
                if (hasDataButNoContentType) {
                    helpfulMessage += '\n\nHelpful tip: For updating content types, wrap your schema in a "content_type" object:';
                    helpfulMessage += '\n  Example: { "uid": "blog_post", "data": { "content_type": { "title": "Blog Post", "schema": [...] } } }';
                }
            }

            return {
                isValid: false,
                error: helpfulMessage
            };
        }

        return { isValid: true };
    }

    setupToolHandlers() {
        const tools = [
            {
                name: 'contentstack_get_content_types',
                description: 'Retrieve all available content types (schemas) from your Contentstack stack. Use this tool first to understand what types of content you can work with (e.g., blog posts, products, pages). Each content type defines the structure and fields available for entries. This is essential for discovering what contentTypeUid values you can use with other tools.',
                inputSchema: {
                    type: 'object',
                    properties: {}
                }
            },
            {
                name: 'mcp_list_tools',
                description: 'Get a comprehensive list of all available Contentstack MCP tools along with their complete input schemas and descriptions. Use this for reference when you need to understand what tools are available and their exact parameter requirements. Helpful for debugging tool usage or exploring capabilities.',
                inputSchema: {
                    type: 'object',
                    properties: {}
                }
            },
            {
                name: 'contentstack_get_content_type',
                description: 'Retrieve detailed schema information for a specific content type. This shows you all available fields, their types, validations, and relationships. Use this when you need to understand the exact structure before creating or updating entries. Essential for knowing what fields are required, optional, or have specific formats.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        uid: {
                            type: 'string',
                            description: 'Content type UID (e.g., "blog_post", "product", "page"). Get this from contentstack_get_content_types first.'
                        }
                    },
                    required: ['uid']
                }
            },
            {
                name: 'contentstack_create_content_type',
                description: 'Create a new content type (schema) in Contentstack. Define the structure and fields for a new type of content. Supports all field types including text, number, boolean, date, select (with simple values or key-value pairs), JSON RTE (rich text editor with embedded entries), reference fields, custom asset fields, taxonomy fields, and field visibility rules. Use this to programmatically build your content models.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        data: {
                            type: 'object',
                            description: 'Content type schema definition wrapped in a "content_type" object. Must include title, uid, and schema array defining all fields.',
                            properties: {
                                content_type: {
                                    type: 'object',
                                    description: 'The content type definition with all its configuration',
                                    properties: {
                                        title: {
                                            type: 'string',
                                            description: 'Display name for the content type (e.g., "Blog Post", "Product")'
                                        },
                                        uid: {
                                            type: 'string',
                                            description: 'Unique identifier using lowercase letters, numbers, and underscores (e.g., "blog_post", "product_catalog")'
                                        },
                                        schema: {
                                            type: 'array',
                                            description: 'Array of field definitions. Each field must have display_name, uid, and data_type. Supports: text, number, boolean, isodate, file (for assets), reference, json (for JSON RTE), group, blocks. See Contentstack docs for complete field schemas.',
                                            items: {
                                                type: 'object',
                                                description: 'Field definition with properties like display_name, uid, data_type, mandatory, unique, multiple, etc.'
                                            }
                                        },
                                        description: {
                                            type: 'string',
                                            description: 'Optional description of what this content type is used for'
                                        },
                                        options: {
                                            type: 'object',
                                            description: 'Additional content type options like singleton, is_page, etc.'
                                        },
                                        field_rules: {
                                            type: 'array',
                                            description: 'Field visibility rules to show/hide fields based on conditions. Each rule has conditions (operand_field, operator, value), match_type (all/any), and actions (show/hide target_field).',
                                            items: {
                                                type: 'object',
                                                properties: {
                                                    conditions: {
                                                        type: 'array',
                                                        description: 'Array of conditions to evaluate'
                                                    },
                                                    match_type: {
                                                        type: 'string',
                                                        description: 'Whether "all" conditions or "any" condition should match'
                                                    },
                                                    actions: {
                                                        type: 'array',
                                                        description: 'Actions to perform when conditions are met (show/hide fields)'
                                                    }
                                                }
                                            }
                                        }
                                    },
                                    required: ['title', 'uid', 'schema']
                                }
                            },
                            required: ['content_type']
                        }
                    },
                    required: ['data']
                }
            },
            {
                name: 'contentstack_update_content_type',
                description: 'Update an existing content type schema. Modify fields, add new fields, change validations, or update field visibility rules. Note: Each update increments the content type version automatically. Be careful when modifying or removing fields that contain data. Use contentstack_get_content_type first to see the current schema.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        uid: {
                            type: 'string',
                            description: 'Content type UID to update (e.g., "blog_post", "product")'
                        },
                        data: {
                            type: 'object',
                            description: 'Updated content type schema wrapped in a "content_type" object. Must include the complete schema definition.',
                            properties: {
                                content_type: {
                                    type: 'object',
                                    description: 'The updated content type definition',
                                    properties: {
                                        title: {
                                            type: 'string',
                                            description: 'Display name for the content type'
                                        },
                                        schema: {
                                            type: 'array',
                                            description: 'Updated array of field definitions. Must include all fields (existing and new) that should be in the content type.',
                                            items: {
                                                type: 'object',
                                                description: 'Field definition'
                                            }
                                        },
                                        description: {
                                            type: 'string',
                                            description: 'Optional description'
                                        },
                                        options: {
                                            type: 'object',
                                            description: 'Content type options'
                                        },
                                        field_rules: {
                                            type: 'array',
                                            description: 'Field visibility rules',
                                            items: {
                                                type: 'object'
                                            }
                                        }
                                    }
                                }
                            },
                            required: ['content_type']
                        }
                    },
                    required: ['uid', 'data']
                }
            },
            {
                name: 'contentstack_get_entries',
                description: 'Retrieve entries (content items) for a specific content type with powerful filtering and pagination options. Use this to find existing content, search by field values, or get lists for display. You can combine content field filters (title="My Post") with system parameters (limit=10). Perfect for building content listings, search functionality, or finding entries to update/publish.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        contentTypeUid: {
                            type: 'string',
                            description: 'Content type UID'
                        },
                        query: {
                            type: 'object',
                            description: 'Flexible query object supporting both content filtering and system parameters. Content field filters (title, description, custom fields) are JSON-encoded automatically. System parameters control pagination and response format. Example: {"title": "My Blog Post", "limit": 5, "skip": 10, "include_count": true}',
                            properties: {
                                // Standard query parameters
                                limit: { type: 'number', description: 'Should be inside the query parameter field, Number of entries to retrieve' },
                                skip: { type: 'number', description: 'Should be inside the query parameter field, Number of entries to skip' },
                                include_count: { type: 'boolean', description: 'Should be inside the query parameter field, Include total count in response' },
                                include_schema: { type: 'boolean', description: 'Should be inside the query parameter field, Include content type schema' },
                                include_workflow: { type: 'boolean', description: 'Should be inside the query parameter field, Include workflow information' },
                                order_by: { type: 'string', description: 'Should be inside the query parameter field, Field to order by' },
                                // Content filtering fields (these will be JSON-encoded)
                                title: { type: 'string', description: 'Should be inside the query parameter field, Filter by title field' },
                                description: { type: 'string', description: 'Should be inside the query parameter field, Filter by description field' },
                                uid: { type: 'string', description: 'Should be inside the query parameter field, Filter by UID' }
                            },
                            additionalProperties: true
                        }
                    },
                    required: ['contentTypeUid']
                }
            },
            {
                name: 'contentstack_get_entry',
                description: 'Retrieve a specific entry by its unique identifier. Use this when you know the exact entry you want to work with. The entry UID can be obtained from contentstack_get_entries results. Perfect for getting full entry details before updating, viewing complete content, or checking current field values.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        contentTypeUid: {
                            type: 'string',
                            description: 'Content type UID'
                        },
                        entryUid: {
                            type: 'string',
                            description: 'Unique entry identifier in format "blt628f856332bafc5d" (starts with "blt" followed by 16 hexadecimal characters). Found in the "uid" field of entries from contentstack_get_entries results.'
                        },
                        options: {
                            type: 'object',
                            description: 'Options for environment, locale, and other parameters',
                            properties: {
                                environment: { type: 'string', description: 'Environment name (e.g., "development", "staging", "production"). Use contentstack_get_environments to get available environment names.' },
                                locale: { type: 'string' },
                                include_schema: { type: 'boolean' },
                                include_workflow: { type: 'boolean' }
                            }
                        }
                    },
                    required: ['contentTypeUid', 'entryUid']
                }
            },
            {
                name: 'contentstack_create_entry',
                description: 'Create a new content entry in Contentstack. The entry data must be wrapped in an "entry" object and match the content type schema. Use contentstack_get_content_type first to understand required fields and their formats. The created entry will be in draft status and can be published later using contentstack_publish_entry.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        contentTypeUid: {
                            type: 'string',
                            description: 'Content type UID'
                        },
                        data: {
                            type: 'object',
                            description: 'Entry creation payload. Must contain an "entry" object with all the content fields defined in your content type schema.',
                            properties: {
                                entry: {
                                    type: 'object',
                                    description: 'The actual entry content matching your content type fields. Example: {"title": "My Blog Post", "content": "Post content here", "author": "John Doe"}'
                                }
                            },
                            required: ['entry']
                        },
                        options: {
                            type: 'object',
                            description: 'Options for environment, locale, and other parameters',
                            properties: {
                                environment: { type: 'string', description: 'Environment name (e.g., "development", "staging", "production"). Use contentstack_get_environments to get available environment names.' },
                                locale: { type: 'string' }
                            }
                        }
                    },
                    required: ['contentTypeUid', 'data']
                }
            },
            {
                name: 'contentstack_update_entry',
                description: 'Update an existing entry with new content. Only provide the fields you want to change - other fields will remain unchanged. The entry data must be wrapped in an "entry" object. Use contentstack_get_entry first to see current values if needed. Updated entries remain in their current publication state.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        contentTypeUid: {
                            type: 'string',
                            description: 'Content type UID'
                        },
                        entryUid: {
                            type: 'string',
                            description: 'Unique entry identifier in format "blt628f856332bafc5d" (starts with "blt" followed by 16 hexadecimal characters). Found in the "uid" field of entries from contentstack_get_entries results.'
                        },
                        data: {
                            type: 'object',
                            description: 'Updated entry data',
                            properties: {
                                entry: {
                                    type: 'object',
                                    description: 'Updated entry data'
                                }
                            },
                            required: ['entry']
                        },
                        options: {
                            type: 'object',
                            description: 'Options for environment, locale, and other parameters',
                            properties: {
                                environment: { type: 'string', description: 'Environment name (e.g., "development", "staging", "production"). Use contentstack_get_environments to get available environment names.' },
                                locale: { type: 'string' }
                            }
                        }
                    },
                    required: ['contentTypeUid', 'entryUid', 'data']
                }
            },
            {
                name: 'contentstack_delete_entry',
                description: 'Permanently delete an entry from Contentstack. This action cannot be undone. The entry will be removed from all environments where it was published. Use with caution and consider unpublishing first if you want to remove from live environments while keeping the draft.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        contentTypeUid: {
                            type: 'string',
                            description: 'Content type UID'
                        },
                        entryUid: {
                            type: 'string',
                            description: 'Unique entry identifier in format "blt628f856332bafc5d" (starts with "blt" followed by 16 hexadecimal characters). Found in the "uid" field of entries from contentstack_get_entries results.'
                        },
                        options: {
                            type: 'object',
                            description: 'Options for environment, locale, and other parameters',
                            properties: {
                                environment: { type: 'string', description: 'Environment name (e.g., "development", "staging", "production"). Use contentstack_get_environments to get available environment names.' },
                                locale: { type: 'string' }
                            }
                        },

                    },
                    required: ['contentTypeUid', 'entryUid']
                }
            },
            {
                name: 'contentstack_get_assets',
                description: 'Retrieve media assets (images, documents, videos) from your Contentstack stack. Use this to find existing assets for referencing in entries, managing media libraries, or checking asset details. Supports filtering and pagination for large asset collections.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        query: {
                            type: 'object',
                            description: 'Query parameters',
                            properties: {
                                limit: { type: 'number' },
                                skip: { type: 'number' },
                                environment: { type: 'string', description: 'Environment name (e.g., "development", "staging", "production"). Use contentstack_get_environments to get available environment names.' },
                                include_folders: { type: 'boolean' }
                            }
                        },

                    }
                }
            },
            {
                name: 'contentstack_get_environments',
                description: 'List all available environments in your Contentstack stack (e.g., development, staging, production). Use this to understand where you can publish content and what environment names to use with publishing tools. Essential for content deployment workflows.',
                inputSchema: {
                    type: 'object',
                    properties: {

                    }
                }
            },
            {
                name: 'contentstack_publish_entry',
                description: 'Publish an entry to make it live on specified environments and locales. This moves content from draft to published state, making it available via the Content Delivery API. Use contentstack_get_environments and contentstack_get_languages first to get valid environment and locale values.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        contentTypeUid: {
                            type: 'string',
                            description: 'Content type UID'
                        },
                        entryUid: {
                            type: 'string',
                            description: 'Unique entry identifier to publish in format "blt628f856332bafc5d" (starts with "blt" followed by 16 hexadecimal characters). Found in the "uid" field of entries from contentstack_get_entries results.'
                        },
                        entry: {
                            type: 'object',
                            description: 'Entry publication details',
                            properties: {
                                environments: {
                                    type: 'array',
                                    items: { type: 'string' },
                                    description: 'List of environments names to publish to'
                                },
                                locales: {
                                    type: 'array',
                                    items: { type: 'string' },
                                    description: 'List of locales codes to publish'
                                }
                            },
                            required: ['environments', 'locales']
                        },
                        locale: {
                            type: 'string',
                            description: 'Primary locale code for the entry'
                        },
                        version: {
                            nullable: true,
                            type: 'number',
                            description: 'Version number of the entry to publish, if not requested, don\'t provide this field, the latest version will be published'
                        }
                    },
                    required: ['contentTypeUid', 'entryUid', 'entry', 'locale']
                }
            },
            {
                name: 'contentstack_unpublish_entry',
                description: 'Remove an entry from published environments, making it unavailable via the Content Delivery API while keeping the draft version intact. Use this to take content offline temporarily or permanently without deleting it. The entry can be republished later.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        contentTypeUid: {
                            type: 'string',
                            description: 'Content type UID'
                        },
                        entryUid: {
                            type: 'string',
                            description: 'Unique entry identifier to unpublish in format "blt628f856332bafc5d" (starts with "blt" followed by 16 hexadecimal characters). Found in the "uid" field of entries from contentstack_get_entries results.'
                        },
                        entry: {
                            type: 'object',
                            description: 'Entry unpublication details',
                            properties: {
                                environments: {
                                    type: 'array',
                                    items: { type: 'string' },
                                    description: 'List of environments names to unpublish from'
                                },
                                locales: {
                                    type: 'array',
                                    items: { type: 'string' },
                                    description: 'List of locales codes to unpublish'
                                }
                            },
                            required: ['environments', 'locales']
                        },
                        locale: {
                            type: 'string',
                            description: 'Primary locale code for the entry'
                        },
                        version: {
                            nullable: true,
                            type: 'number',
                            description: 'Version number of the entry to unpublish, if not requested, don\'t provide this field, the latest version will be unpublished'
                        }
                    },
                    required: ['contentTypeUid', 'entryUid', 'entry', 'locale', 'version']
                }
            },
            {
                name: 'contentstack_get_languages',
                description: 'Retrieve all configured languages/locales in your Contentstack stack (e.g., en-us, fr-fr, es-es). Use this to understand what locales are available for content localization and publishing. Essential for multilingual content management workflows.',
                inputSchema: {
                    type: 'object',
                    properties: {

                    }
                }
            },
            {
                name: 'contentstack_localize_entry',
                description: 'Create or update a localized version of an entry for a specific language/locale. Use this to provide translated content for multilingual websites. The entry must already exist in the master locale. Use contentstack_get_languages to see available locales.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        contentTypeUid: {
                            type: 'string',
                            description: 'Content type UID'
                        },
                        entryUid: {
                            type: 'string',
                            description: 'Unique entry identifier to localize in format "blt628f856332bafc5d" (starts with "blt" followed by 16 hexadecimal characters). Found in the "uid" field of entries from contentstack_get_entries results.'
                        },
                        data: {
                            type: 'object',
                            description: 'Localized entry data',
                            properties: {
                                entry: {
                                    type: 'object',
                                    description: 'Localized entry data'
                                }
                            }
                        },
                        options: {
                            type: 'object',
                            description: 'Options for locale and other parameters',
                            properties: {
                                locale: {
                                    type: 'string',
                                    description: 'Target locale for localization'
                                }
                            }
                        }
                    },
                    required: ['contentTypeUid', 'entryUid', 'data']
                }
            }
        ];

        this.server.setRequestHandler(this.ListToolsRequestSchema, async () => ({ tools }));

        this.server.setRequestHandler(this.CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;

            try {
                const tool = tools.find(t => t.name === name);
                if (!tool) {
                    throw new this.McpError(
                        this.ErrorCode.MethodNotFound,
                        `Tool '${name}' not found`
                    );
                }

                // Validate arguments against schema
                const validation = this.validateToolArguments(name, args, tool.inputSchema);
                if (!validation.isValid) {
                    throw new this.McpError(
                        this.ErrorCode.InvalidParams,
                        validation.error
                    );
                }

                const cs = contentstack.initialize({
                    apiKey: process.env.CONTENTSTACK_API_KEY,
                    managementToken: process.env.CONTENTSTACK_MANAGEMENT_TOKEN,
                    region: process.env.CONTENTSTACK_REGION || 'NA',
                    branch: process.env.CONTENTSTACK_BRANCH || 'main'
                });

                switch (name) {
                    case 'contentstack_get_content_types':
                        const contentTypes = await cs.getContentTypes();
                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: JSON.stringify(contentTypes, null, 2)
                                }
                            ]
                        };

                    case 'contentstack_get_content_type':
                        const contentType = await cs.getContentType(args.uid);
                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: JSON.stringify(contentType, null, 2)
                                }
                            ]
                        };

                    case 'contentstack_create_content_type':
                        const newContentType = await cs.createContentType(args.data);
                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: JSON.stringify(newContentType, null, 2)
                                }
                            ]
                        };

                    case 'contentstack_update_content_type':
                        const updatedContentType = await cs.updateContentType(args.uid, args.data);
                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: JSON.stringify(updatedContentType, null, 2)
                                }
                            ]
                        };

                    case 'mcp_list_tools':
                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: JSON.stringify({ tools }, null, 2)
                                }
                            ]
                        };

                    case 'contentstack_get_entries':
                        const entries = await cs.getEntries(args.contentTypeUid, args.query || {});
                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: JSON.stringify(entries, null, 2)
                                }
                            ]
                        };

                    case 'contentstack_get_entry':
                        const entry = await cs.getEntry(args.contentTypeUid, args.entryUid, args.options || {});
                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: JSON.stringify(entry, null, 2)
                                }
                            ]
                        };

                    case 'contentstack_create_entry':
                        const newEntry = await cs.createEntry(args.contentTypeUid, args.data, args.options || {});
                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: JSON.stringify(newEntry, null, 2)
                                }
                            ]
                        };

                    case 'contentstack_update_entry':
                        const updatedEntry = await cs.updateEntry(args.contentTypeUid, args.entryUid, args.data, args.options || {});
                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: JSON.stringify(updatedEntry, null, 2)
                                }
                            ]
                        };

                    case 'contentstack_delete_entry':
                        const deleteResult = await cs.deleteEntry(args.contentTypeUid, args.entryUid, args.options || {});
                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: JSON.stringify(deleteResult, null, 2)
                                }
                            ]
                        };

                    case 'contentstack_get_assets':
                        const assets = await cs.getAssets(args.query || {});
                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: JSON.stringify(assets, null, 2)
                                }
                            ]
                        };

                    case 'contentstack_get_environments':
                        const environments = await cs.getEnvironments();
                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: JSON.stringify(environments, null, 2)
                                }
                            ]
                        };

                    case 'contentstack_publish_entry':
                        const publishData = {
                            entry: args.entry,
                            locale: args.locale,
                            version: args.version
                        };
                        const publishResult = await cs.publishEntry(args.contentTypeUid, args.entryUid, publishData);
                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: JSON.stringify(publishResult, null, 2)
                                }
                            ]
                        };

                    case 'contentstack_unpublish_entry':
                        const unpublishData = {
                            entry: args.entry,
                            locale: args.locale,
                            version: args.version
                        };
                        const unpublishResult = await cs.unpublishEntry(args.contentTypeUid, args.entryUid, unpublishData, args.options || {});
                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: JSON.stringify(unpublishResult, null, 2)
                                }
                            ]
                        };

                    case 'contentstack_get_languages':
                        const languages = await cs.getLanguages();
                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: JSON.stringify(languages, null, 2)
                                }
                            ]
                        };

                    case 'contentstack_localize_entry':
                        const localizeResult = await cs.localizeEntry(args.contentTypeUid, args.entryUid, args.data, args.options || {});
                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: JSON.stringify(localizeResult, null, 2)
                                }
                            ]
                        };

                    default:
                        throw new this.McpError(
                            this.ErrorCode.MethodNotFound,
                            `Unknown tool: ${name}`
                        );
                }
            } catch (error) {
                let errorMessage = error.message || 'Unknown error occurred';

                const fullErrorMessage = `${errorMessage}`;

                throw new this.McpError(
                    this.ErrorCode.InternalError,
                    fullErrorMessage
                );
            }
        });
    }

    setupErrorHandling() {
        this.server.onerror = (error) => {
            console.error('[MCP Error]', error);
        };

        process.on('SIGINT', async () => {
            await this.server.close();
            process.exit(0);
        });
    }

    async run() {
        await this.initialize();
        const transport = new this.StdioServerTransport();
        await this.server.connect(transport);
        console.error('Contentstack MCP server running on stdio');
    }
}

// Run the server
if (require.main === module) {
    const server = new ContentstackMCPServer();
    server.run().catch((error) => {
        console.error('Failed to run server:', error);
        process.exit(1);
    });
}

module.exports = ContentstackMCPServer; 