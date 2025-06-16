#!/usr/bin/env node

const contentstack = require('./index.js');

class ContentstackMCPServer {
    constructor() {
        this.server = null;
        this.Server = null;
        this.StdioServerTransport = null;
        this.CallToolRequestSchema = null;
        this.ErrorCode = null;
        this.ListToolsRequestSchema = null;
        this.McpError = null;
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
                    tools: {},
                },
            }
        );

        this.setupToolHandlers();
        this.setupErrorHandling();
    }

    setupToolHandlers() {
        this.server.setRequestHandler(this.ListToolsRequestSchema, async () => {
            return {
                tools: [
                    {
                        name: 'contentstack_get_content_types',
                        description: 'Get all content types from Contentstack',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                region: {
                                    type: 'string',
                                    description: 'Contentstack region (NA, EU, AZURE_NA, AZURE_EU, GCP_NA, GCP_EU)',
                                    enum: ['NA', 'EU', 'AZURE_NA', 'AZURE_EU', 'GCP_NA', 'GCP_EU']
                                }
                            }
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
                                },
                                region: {
                                    type: 'string',
                                    description: 'Contentstack region',
                                    enum: ['NA', 'EU', 'AZURE_NA', 'AZURE_EU', 'GCP_NA', 'GCP_EU']
                                }
                            },
                            required: ['uid']
                        }
                    },
                    {
                        name: 'contentstack_get_entries',
                        description: 'Get entries for a content type',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                contentTypeUid: {
                                    type: 'string',
                                    description: 'Content type UID'
                                },
                                query: {
                                    type: 'object',
                                    description: 'Query parameters (limit, skip, environment, etc.)',
                                    properties: {
                                        limit: { type: 'number' },
                                        skip: { type: 'number' },
                                        environment: { type: 'string' },
                                        locale: { type: 'string' },
                                        include_count: { type: 'boolean' }
                                    }
                                },
                                region: {
                                    type: 'string',
                                    description: 'Contentstack region',
                                    enum: ['NA', 'EU', 'AZURE_NA', 'AZURE_EU', 'GCP_NA', 'GCP_EU']
                                }
                            },
                            required: ['contentTypeUid']
                        }
                    },
                    {
                        name: 'contentstack_get_entry',
                        description: 'Get a specific entry by UID',
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
                                },
                                region: {
                                    type: 'string',
                                    description: 'Contentstack region',
                                    enum: ['NA', 'EU', 'AZURE_NA', 'AZURE_EU', 'GCP_NA', 'GCP_EU']
                                }
                            },
                            required: ['contentTypeUid', 'entryUid']
                        }
                    },
                    {
                        name: 'contentstack_create_entry',
                        description: 'Create a new entry',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                contentTypeUid: {
                                    type: 'string',
                                    description: 'Content type UID'
                                },
                                data: {
                                    type: 'object',
                                    description: 'Entry data'
                                },
                                options: {
                                    type: 'object',
                                    description: 'Options for environment, locale, and other parameters',
                                    properties: {
                                        environment: { type: 'string' },
                                        locale: { type: 'string' }
                                    }
                                },
                                region: {
                                    type: 'string',
                                    description: 'Contentstack region',
                                    enum: ['NA', 'EU', 'AZURE_NA', 'AZURE_EU', 'GCP_NA', 'GCP_EU']
                                }
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
                                    description: 'Updated entry data'
                                },
                                options: {
                                    type: 'object',
                                    description: 'Options for environment, locale, and other parameters',
                                    properties: {
                                        environment: { type: 'string' },
                                        locale: { type: 'string' }
                                    }
                                },
                                region: {
                                    type: 'string',
                                    description: 'Contentstack region',
                                    enum: ['NA', 'EU', 'AZURE_NA', 'AZURE_EU', 'GCP_NA', 'GCP_EU']
                                }
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
                                region: {
                                    type: 'string',
                                    description: 'Contentstack region',
                                    enum: ['NA', 'EU', 'AZURE_NA', 'AZURE_EU', 'GCP_NA', 'GCP_EU']
                                }
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
                                region: {
                                    type: 'string',
                                    description: 'Contentstack region',
                                    enum: ['NA', 'EU', 'AZURE_NA', 'AZURE_EU', 'GCP_NA', 'GCP_EU']
                                }
                            }
                        }
                    },
                    {
                        name: 'contentstack_get_environments',
                        description: 'Get all environments from Contentstack',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                region: {
                                    type: 'string',
                                    description: 'Contentstack region',
                                    enum: ['NA', 'EU', 'AZURE_NA', 'AZURE_EU', 'GCP_NA', 'GCP_EU']
                                }
                            }
                        }
                    },
                    {
                        name: 'contentstack_publish_entry',
                        description: 'Publish an entry',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                data: {
                                    type: 'object',
                                    description: 'Publish data with entry and environments'
                                },
                                options: {
                                    type: 'object',
                                    description: 'Options for environment, locale, and other parameters',
                                    properties: {
                                        environment: { type: 'string' },
                                        locale: { type: 'string' }
                                    }
                                },
                                region: {
                                    type: 'string',
                                    description: 'Contentstack region',
                                    enum: ['NA', 'EU', 'AZURE_NA', 'AZURE_EU', 'GCP_NA', 'GCP_EU']
                                }
                            },
                            required: ['data']
                        }
                    },
                    {
                        name: 'contentstack_unpublish_entry',
                        description: 'Unpublish an entry',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                data: {
                                    type: 'object',
                                    description: 'Unpublish data with entry and environments'
                                },
                                options: {
                                    type: 'object',
                                    description: 'Options for environment, locale, and other parameters',
                                    properties: {
                                        environment: { type: 'string' },
                                        locale: { type: 'string' }
                                    }
                                },
                                region: {
                                    type: 'string',
                                    description: 'Contentstack region',
                                    enum: ['NA', 'EU', 'AZURE_NA', 'AZURE_EU', 'GCP_NA', 'GCP_EU']
                                }
                            },
                            required: ['data']
                        }
                    }
                ]
            };
        });

        this.server.setRequestHandler(this.CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;

            try {
                const config = args.region ? { region: args.region } : {};
                const cs = contentstack.initialize(config);

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
                        const publishResult = await cs.publishEntry(args.data, args.options || {});
                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: JSON.stringify(publishResult, null, 2)
                                }
                            ]
                        };

                    case 'contentstack_unpublish_entry':
                        const unpublishResult = await cs.unpublishEntry(args.data, args.options || {});
                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: JSON.stringify(unpublishResult, null, 2)
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
                throw new this.McpError(
                    this.ErrorCode.InternalError,
                    `Error executing ${name}: ${error.message}`
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