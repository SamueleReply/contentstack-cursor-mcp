const axios = require('axios');
require('dotenv').config();

// Region mapper for Content Management API endpoints
const REGION_MAPPER = {
    'NA': 'https://api.contentstack.io/v3',
    'EU': 'https://eu-api.contentstack.com/v3',
    'AZURE_NA': 'https://azure-na-api.contentstack.com/v3',
    'AZURE_EU': 'https://azure-eu-api.contentstack.com/v3',
    'GCP_NA': 'https://gcp-na-api.contentstack.com/v3',
    'GCP_EU': 'https://gcp-eu-api.contentstack.com/v3'
};

// Default configuration
const defaultConfig = {
    region: process.env.CONTENTSTACK_REGION || 'NA',
    apiKey: process.env.CONTENTSTACK_API_KEY,
    managementToken: process.env.CONTENTSTACK_MANAGEMENT_TOKEN,
    deliveryToken: process.env.CONTENTSTACK_DELIVERY_TOKEN
};

// Get base URL based on region
const getBaseURL = (region) => {
    const baseURL = REGION_MAPPER[region.toUpperCase()];
    if (!baseURL) {
        throw new Error(`Invalid region: ${region}. Supported regions are: ${Object.keys(REGION_MAPPER).join(', ')}`);
    }
    return baseURL;
};

// Create headers based on config
const createHeaders = (config) => ({
    'api_key': config.apiKey,
    'authorization': config.managementToken,
    'Content-Type': 'application/json'
});

// Helper function to make API requests
const makeRequest = async (method, endpoint, data = null, config = {}) => {
    try {
        const mergedConfig = { ...defaultConfig, ...config };
        const baseURL = getBaseURL(mergedConfig.region);
        const headers = createHeaders(mergedConfig);

        const response = await axios({
            method,
            url: `${baseURL}${endpoint}`,
            headers,
            data
        });
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.error_message || error.message);
    }
};

// Content Types
const getContentTypes = async (config = {}) => {
    return makeRequest('GET', '/content_types', null, config);
};

const getContentType = async (uid, config = {}) => {
    return makeRequest('GET', `/content_types/${uid}`, null, config);
};

const createContentType = async (data, config = {}) => {
    return makeRequest('POST', '/content_types', data, config);
};

// Entries
const getEntries = async (contentTypeUid, query = {}, config = {}) => {
    const queryString = new URLSearchParams(query).toString();
    return makeRequest('GET', `/content_types/${contentTypeUid}/entries?${queryString}`, null, config);
};

const getEntry = async (contentTypeUid, entryUid, config = {}) => {
    return makeRequest('GET', `/content_types/${contentTypeUid}/entries/${entryUid}`, null, config);
};

const createEntry = async (contentTypeUid, data, config = {}) => {
    return makeRequest('POST', `/content_types/${contentTypeUid}/entries`, data, config);
};

const updateEntry = async (contentTypeUid, entryUid, data, config = {}) => {
    return makeRequest('PUT', `/content_types/${contentTypeUid}/entries/${entryUid}`, data, config);
};

const deleteEntry = async (contentTypeUid, entryUid, config = {}) => {
    return makeRequest('DELETE', `/content_types/${contentTypeUid}/entries/${entryUid}`, null, config);
};

// Assets
const getAssets = async (query = {}, config = {}) => {
    const queryString = new URLSearchParams(query).toString();
    return makeRequest('GET', `/assets?${queryString}`, null, config);
};

const getAsset = async (assetUid, config = {}) => {
    return makeRequest('GET', `/assets/${assetUid}`, null, config);
};

const uploadAsset = async (data, config = {}) => {
    return makeRequest('POST', '/assets', data, config);
};

// Environments
const getEnvironments = async (config = {}) => {
    return makeRequest('GET', '/environments', null, config);
};

const getEnvironment = async (uid, config = {}) => {
    return makeRequest('GET', `/environments/${uid}`, null, config);
};

// Publish
const publishEntry = async (data, config = {}) => {
    return makeRequest('POST', '/publish', data, config);
};

const unpublishEntry = async (data, config = {}) => {
    return makeRequest('POST', '/unpublish', data, config);
};

// Initialize function to create a configured instance
const initialize = (config = {}) => {
    const mergedConfig = { ...defaultConfig, ...config };
    return {
        getContentTypes: () => getContentTypes(mergedConfig),
        getContentType: (uid) => getContentType(uid, mergedConfig),
        createContentType: (data) => createContentType(data, mergedConfig),
        getEntries: (contentTypeUid, query) => getEntries(contentTypeUid, query, mergedConfig),
        getEntry: (contentTypeUid, entryUid) => getEntry(contentTypeUid, entryUid, mergedConfig),
        createEntry: (contentTypeUid, data) => createEntry(contentTypeUid, data, mergedConfig),
        updateEntry: (contentTypeUid, entryUid, data) => updateEntry(contentTypeUid, entryUid, data, mergedConfig),
        deleteEntry: (contentTypeUid, entryUid) => deleteEntry(contentTypeUid, entryUid, mergedConfig),
        getAssets: (query) => getAssets(query, mergedConfig),
        getAsset: (assetUid) => getAsset(assetUid, mergedConfig),
        uploadAsset: (data) => uploadAsset(data, mergedConfig),
        getEnvironments: () => getEnvironments(mergedConfig),
        getEnvironment: (uid) => getEnvironment(uid, mergedConfig),
        publishEntry: (data) => publishEntry(data, mergedConfig),
        unpublishEntry: (data) => unpublishEntry(data, mergedConfig)
    };
};

module.exports = {
    REGION_MAPPER,
    initialize,
    getContentTypes,
    getContentType,
    createContentType,
    getEntries,
    getEntry,
    createEntry,
    updateEntry,
    deleteEntry,
    getAssets,
    getAsset,
    uploadAsset,
    getEnvironments,
    getEnvironment,
    publishEntry,
    unpublishEntry
}; 