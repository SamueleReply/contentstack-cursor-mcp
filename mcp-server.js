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
                    },
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
                description: 'Get all content types from Contentstack',
                inputSchema: {
                    type: 'object',
                    properties: {}
                }
            },
            {
                name: 'mcp_list_tools',
                description: 'List available Contentstack tools with input schemas',
                inputSchema: {
                    type: 'object',
                    properties: {}
                }
            },
            {
                name: 'contentstack_get_content_type',
                description: 'Get a specific content type by UID',
                inputSchema: {
                    type: 'object',
                    properties: {
                        uid: {
                            type: 'string',
                            description: 'Content type UID'
                        }
                    },
                    required: ['uid']
                }
            },
            {
                name: 'contentstack_get_entries',
                description: 'This tool is used to get all entries for a content type. You can filter entries by content fields (like title, description, etc.) and also use standard query parameters (limit, skip, environment, etc.). Content filtering fields are automatically JSON-encoded as the "query" parameter while standard parameters are passed as regular URL parameters.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        contentTypeUid: {
                            type: 'string',
                            description: 'Content type UID'
                        },
                        query: {
                            type: 'object',
                            description: 'Query parameters - can include, in the query parameter field both content filtering fields (title, description, etc.) and standard parameters (limit, skip, environment, etc.). Content fields are automatically JSON-encoded while standard parameters are passed normally.',
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
                description: 'This tool is used to get a specific entry by uid, you need to provide the content type uid and the entry uid, to get the entry uid you can use the contentstack_get_entries tool',
                inputSchema: {
                    type: 'object',
                    properties: {
                        contentTypeUid: {
                            type: 'string',
                            description: 'Content type UID'
                        },
                        entryUid: {
                            type: 'string',
                            description: 'Entry UID'
                        },
                        options: {
                            type: 'object',
                            description: 'Options for environment, locale, and other parameters',
                            properties: {
                                environment: { type: 'string' },
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
                description: 'This tool is used to create a new entry in a content type, you need to provide the content type uid and the entry data',
                inputSchema: {
                    type: 'object',
                    properties: {
                        contentTypeUid: {
                            type: 'string',
                            description: 'Content type UID'
                        },
                        data: {
                            type: 'object',
                            description: 'Entry data',
                            properties: {
                                entry: {
                                    type: 'object',
                                    description: 'Entry data'
                                }
                            },
                            required: ['entry']
                        },
                        options: {
                            type: 'object',
                            description: 'Options for environment, locale, and other parameters',
                            properties: {
                                environment: { type: 'string' },
                                locale: { type: 'string' }
                            }
                        },

                    },
                    required: ['contentTypeUid', 'data']
                }
            },
            {
                name: 'contentstack_update_entry',
                description: 'Update an existing entry',
                inputSchema: {
                    type: 'object',
                    properties: {
                        contentTypeUid: {
                            type: 'string',
                            description: 'Content type UID'
                        },
                        entryUid: {
                            type: 'string',
                            description: 'Entry UID'
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
                                environment: { type: 'string' },
                                locale: { type: 'string' }
                            }
                        },

                    },
                    required: ['contentTypeUid', 'entryUid', 'data']
                }
            },
            {
                name: 'contentstack_delete_entry',
                description: 'Delete an entry',
                inputSchema: {
                    type: 'object',
                    properties: {
                        contentTypeUid: {
                            type: 'string',
                            description: 'Content type UID'
                        },
                        entryUid: {
                            type: 'string',
                            description: 'Entry UID'
                        },
                        options: {
                            type: 'object',
                            description: 'Options for environment, locale, and other parameters',
                            properties: {
                                environment: { type: 'string' },
                                locale: { type: 'string' }
                            }
                        },

                    },
                    required: ['contentTypeUid', 'entryUid']
                }
            },
            {
                name: 'contentstack_get_assets',
                description: 'Get assets from Contentstack',
                inputSchema: {
                    type: 'object',
                    properties: {
                        query: {
                            type: 'object',
                            description: 'Query parameters',
                            properties: {
                                limit: { type: 'number' },
                                skip: { type: 'number' },
                                environment: { type: 'string' },
                                include_folders: { type: 'boolean' }
                            }
                        },

                    }
                }
            },
            {
                name: 'contentstack_get_environments',
                description: 'Get all environments from Contentstack',
                inputSchema: {
                    type: 'object',
                    properties: {

                    }
                }
            },
            {
                name: 'contentstack_publish_entry',
                description: 'Publish an entry',
                inputSchema: {
                    type: 'object',
                    properties: {
                        contentTypeUid: {
                            type: 'string',
                            description: 'Content type UID'
                        },
                        entryUid: {
                            type: 'string',
                            description: 'Entry UID to publish'
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
                    required: ['contentTypeUid', 'entryUid', 'entry', 'locale', 'version']
                }
            },
            {
                name: 'contentstack_unpublish_entry',
                description: 'Unpublish an entry',
                inputSchema: {
                    type: 'object',
                    properties: {
                        contentTypeUid: {
                            type: 'string',
                            description: 'Content type UID'
                        },
                        entryUid: {
                            type: 'string',
                            description: 'Entry UID to unpublish'
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
                description: 'Get all languages (locales) available in the stack',
                inputSchema: {
                    type: 'object',
                    properties: {

                    }
                }
            },
            {
                name: 'contentstack_localize_entry',
                description: 'Localize an entry to a specific locale',
                inputSchema: {
                    type: 'object',
                    properties: {
                        contentTypeUid: {
                            type: 'string',
                            description: 'Content type UID'
                        },
                        entryUid: {
                            type: 'string',
                            description: 'Entry UID to localize'
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
                        },

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
                    region: process.env.CONTENTSTACK_REGION || 'NA'
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
                        const publishResult = await cs.publishEntry(args.contentTypeUid, args.entryUid, publishData, args.options || {});
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