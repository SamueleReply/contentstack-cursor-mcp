const contentstack = require('./index');

// Initialize with default configuration from .env
const cs = contentstack.initialize();

// Test function to demonstrate various MCP tools
async function testMCP() {
    try {
        // 1. Get all content types
        console.log('Getting all content types...');
        const contentTypes = await cs.getContentTypes();
        console.log('Content Types:', JSON.stringify(contentTypes, null, 2));

        // 2. Get all environments
        console.log('\nGetting all environments...');
        const environments = await cs.getEnvironments();
        console.log('Environments:', JSON.stringify(environments, null, 2));

        // Get the first environment name
        const environmentName = environments?.environments?.[0]?.name || 'development';

        // 3. Get all assets with proper query parameters
        console.log('\nGetting all assets...');
        const assets = await cs.getAssets({
            limit: 5,
            skip: 0,
            include_folders: true,
            environment: environmentName
        });
        console.log('Assets:', JSON.stringify(assets, null, 2));

        // If you have a specific content type, you can test these functions
        if (contentTypes && contentTypes.content_types && contentTypes.content_types.length > 0) {
            const contentTypeUid = contentTypes.content_types[0].uid;

            // 4. Get entries for the first content type with proper query parameters
            console.log(`\nGetting entries for content type: ${contentTypeUid}...`);
            const entries = await cs.getEntries(contentTypeUid, {
                limit: 5,
                skip: 0,
                //environment: environmentName,
                include_count: true
            });
            console.log('Entries:', JSON.stringify(entries, null, 2));

            if (entries && entries.entries && entries.entries.length > 0) {
                const entryUid = entries.entries[0].uid;

                // 5. Get specific entry (old way - backward compatibility)
                console.log(`\nGetting specific entry (old way): ${entryUid}...`);
                const entry = await cs.getEntry(contentTypeUid, entryUid);
                console.log('Entry (old way):', JSON.stringify(entry, null, 2));

                // 6. Get specific entry with environment and locale options (new way)
                console.log(`\nGetting specific entry with options: ${entryUid}...`);
                const entryWithOptions = await cs.getEntry(contentTypeUid, entryUid, {
                    environment: environmentName,
                    locale: 'en',
                    include_schema: true
                });
                console.log('Entry (with options):', JSON.stringify(entryWithOptions, null, 2));

                // 7. Test create entry with options (commented out to avoid creating test data)
                /*
                console.log(`\nTesting create entry with options...`);
                const newEntryData = {
                    entry: {
                        title: 'Test Entry',
                        // Add other required fields based on your content type
                    }
                };
                const newEntry = await cs.createEntry(contentTypeUid, newEntryData, {
                    environment: environmentName,
                    locale: 'en-us'
                });
                console.log('New Entry:', JSON.stringify(newEntry, null, 2));
                */

                // 8. Test publish entry with options (commented out to avoid publishing)
                /*
                console.log(`\nTesting publish entry with options...`);
                const publishData = {
                    entry: {
                        uid: entryUid,
                        content_type: contentTypeUid,
                        version: 1
                    },
                    environments: [environmentName]
                };
                const publishResult = await cs.publishEntry(publishData, {
                    environment: environmentName,
                    locale: 'en-us'
                });
                console.log('Publish Result:', JSON.stringify(publishResult, null, 2));
                */
            }
        }

        // 9. Test region-specific configuration
        console.log('\nTesting region-specific configuration...');
        const csEU = contentstack.initialize({
            region: 'EU',
            apiKey: process.env.CONTENTSTACK_API_KEY,
            managementToken: process.env.CONTENTSTACK_MANAGEMENT_TOKEN
        });

        try {
            const euContentTypes = await csEU.getContentTypes();
            console.log('EU Content Types:', JSON.stringify(euContentTypes, null, 2));
        } catch (error) {
            console.log('EU region test failed (expected if not configured for EU):', error.message);
        }

        // 10. Test get languages functionality
        console.log('\nTesting get languages...');
        try {
            const languages = await cs.getLanguages();
            console.log('Languages:', JSON.stringify(languages, null, 2));
        } catch (error) {
            console.error('Get languages test failed:', error.message);
        }

        // 11. Test localize entry functionality (commented out to avoid creating test data)
        /*
        if (contentTypes && contentTypes.content_types && contentTypes.content_types.length > 0) {
            const contentTypeUid = contentTypes.content_types[0].uid;
            const entries = await cs.getEntries(contentTypeUid, { limit: 1 });

            if (entries && entries.entries && entries.entries.length > 0) {
                const entryUid = entries.entries[0].uid;

                console.log('\nTesting localize entry...');
                try {
                    const localizeData = {
                        entry: {
                            title: 'Titre localisé',
                            // Add other localized fields based on your content type
                        }
                    };
                    const localizedEntry = await cs.localizeEntry(contentTypeUid, entryUid, localizeData, {
                        locale: 'fr-fr'
                    });
                    console.log('Localized Entry:', JSON.stringify(localizedEntry, null, 2));
                } catch (error) {
                    console.error('Localize entry test failed:', error.message);
                }
            }
        }
        */

    } catch (error) {
        console.error('Error testing MCP:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
            console.error('Response status:', error.response.status);
            console.error('Response headers:', error.response.headers);
        }
    }
}

// Test backward compatibility
async function testBackwardCompatibility() {
    console.log('\n=== Testing Backward Compatibility ===');
    try {
        // Test that old function signatures still work
        const contentTypes = await cs.getContentTypes();
        if (contentTypes && contentTypes.content_types && contentTypes.content_types.length > 0) {
            const contentTypeUid = contentTypes.content_types[0].uid;
            const entries = await cs.getEntries(contentTypeUid, { limit: 1 });

            if (entries && entries.entries && entries.entries.length > 0) {
                const entryUid = entries.entries[0].uid;

                // Old way should still work
                const entry = await cs.getEntry(contentTypeUid, entryUid);
                console.log('Backward compatibility test passed - old signature works');
            }
        }
    } catch (error) {
        console.error('Backward compatibility test failed:', error.message);
    }
}

// Run the tests
console.log('=== Running Contentstack MCP Tests ===');
testMCP().then(() => {
    return testBackwardCompatibility();
}).then(() => {
    console.log('\n=== All tests completed ===');
}).catch((error) => {
    console.error('Test suite failed:', error);
}); 