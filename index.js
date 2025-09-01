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

        const requestConfig = {
            method,
            url: `${baseURL}${endpoint}`,
            headers,
            validateStatus: function (status) {
                return status >= 200 && status < 500; // Accept all status codes less than 500
            }
        };

        // Only add data for POST/PUT requests
        if (data && (method === 'POST' || method === 'PUT')) {
            requestConfig.data = data;
        }

        const response = await axios(requestConfig);

        // Handle error responses
        if (response.status >= 400) {
            throw new Error(
                response.data?.error_message ||
                response.data?.error ||
                `Request failed with status ${response.status}`
            );
        }

        return response.data;
    } catch (error) {
        if (error.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            throw new Error(
                error.response.data?.error_message ||
                error.response.data?.error ||
                `Request failed with status ${error.response.status}`
            );
        } else if (error.request) {
            // The request was made but no response was received
            throw new Error('No response received from server');
        } else {
            // Something happened in setting up the request that triggered an Error
            throw new Error(error.message);
        }
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

const getEntry = async (contentTypeUid, entryUid, options = {}, config = {}) => {
    const { environment, locale, ...otherOptions } = options;
    const queryParams = new URLSearchParams();

    if (environment) queryParams.append('environment', environment);
    if (locale) queryParams.append('locale', locale);

    // Add any other query parameters
    Object.entries(otherOptions).forEach(([key, value]) => {
        queryParams.append(key, value);
    });

    const queryString = queryParams.toString();
    const endpoint = `/content_types/${contentTypeUid}/entries/${entryUid}${queryString ? `?${queryString}` : ''}`;
    return makeRequest('GET', endpoint, null, config);
};

const createEntry = async (contentTypeUid, data, options = {}, config = {}) => {
    const { environment, locale, ...otherOptions } = options;
    const queryParams = new URLSearchParams();

    if (environment) queryParams.append('environment', environment);
    if (locale) queryParams.append('locale', locale);

    // Add any other query parameters
    Object.entries(otherOptions).forEach(([key, value]) => {
        queryParams.append(key, value);
    });

    const queryString = queryParams.toString();
    const endpoint = `/content_types/${contentTypeUid}/entries${queryString ? `?${queryString}` : ''}`;
    return makeRequest('POST', endpoint, data, config);
};

const updateEntry = async (contentTypeUid, entryUid, data, options = {}, config = {}) => {
    const { environment, locale, ...otherOptions } = options;
    const queryParams = new URLSearchParams();

    if (environment) queryParams.append('environment', environment);
    if (locale) queryParams.append('locale', locale);

    // Add any other query parameters
    Object.entries(otherOptions).forEach(([key, value]) => {
        queryParams.append(key, value);
    });

    const queryString = queryParams.toString();
    const endpoint = `/content_types/${contentTypeUid}/entries/${entryUid}${queryString ? `?${queryString}` : ''}`;
    return makeRequest('PUT', endpoint, data, config);
};

const deleteEntry = async (contentTypeUid, entryUid, options = {}, config = {}) => {
    const { environment, locale, ...otherOptions } = options;
    const queryParams = new URLSearchParams();

    if (environment) queryParams.append('environment', environment);
    if (locale) queryParams.append('locale', locale);

    // Add any other query parameters
    Object.entries(otherOptions).forEach(([key, value]) => {
        queryParams.append(key, value);
    });

    const queryString = queryParams.toString();
    const endpoint = `/content_types/${contentTypeUid}/entries/${entryUid}${queryString ? `?${queryString}` : ''}`;
    return makeRequest('DELETE', endpoint, null, config);
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
const publishEntry = async (data, options = {}, config = {}) => {
    const { environment, locale, ...otherOptions } = options;
    const queryParams = new URLSearchParams();

    if (environment) queryParams.append('environment', environment);
    if (locale) queryParams.append('locale', locale);

    // Add any other query parameters
    Object.entries(otherOptions).forEach(([key, value]) => {
        queryParams.append(key, value);
    });

    const queryString = queryParams.toString();
    const endpoint = `/publish${queryString ? `?${queryString}` : ''}`;
    return makeRequest('POST', endpoint, data, config);
};

const unpublishEntry = async (data, options = {}, config = {}) => {
    const { environment, locale, ...otherOptions } = options;
    const queryParams = new URLSearchParams();

    if (environment) queryParams.append('environment', environment);
    if (locale) queryParams.append('locale', locale);

    // Add any other query parameters
    Object.entries(otherOptions).forEach(([key, value]) => {
        queryParams.append(key, value);
    });

    const queryString = queryParams.toString();
    const endpoint = `/unpublish${queryString ? `?${queryString}` : ''}`;
    return makeRequest('POST', endpoint, data, config);
};

// Languages
const getLanguages = async (config = {}) => {
    return makeRequest('GET', '/locales', null, config);
};

// Localize Entry
const localizeEntry = async (contentTypeUid, entryUid, data, options = {}, config = {}) => {
    const { locale, ...otherOptions } = options;
    const queryParams = new URLSearchParams();

    if (locale) queryParams.append('locale', locale);

    // Add any other query parameters
    Object.entries(otherOptions).forEach(([key, value]) => {
        queryParams.append(key, value);
    });

    const queryString = queryParams.toString();
    const endpoint = `/content_types/${contentTypeUid}/entries/${entryUid}/localize${queryString ? `?${queryString}` : ''}`;
    return makeRequest('POST', endpoint, data, config);
};

// Initialize function to create a configured instance
const initialize = (config = {}) => {
    const mergedConfig = { ...defaultConfig, ...config };
    return {
        getContentTypes: () => getContentTypes(mergedConfig),
        getContentType: (uid) => getContentType(uid, mergedConfig),
        createContentType: (data) => createContentType(data, mergedConfig),
        getEntries: (contentTypeUid, query) => getEntries(contentTypeUid, query, mergedConfig),
        getEntry: (contentTypeUid, entryUid, options) => getEntry(contentTypeUid, entryUid, options, mergedConfig),
        createEntry: (contentTypeUid, data, options) => createEntry(contentTypeUid, data, options, mergedConfig),
        updateEntry: (contentTypeUid, entryUid, data, options) => updateEntry(contentTypeUid, entryUid, data, options, mergedConfig),
        deleteEntry: (contentTypeUid, entryUid, options) => deleteEntry(contentTypeUid, entryUid, options, mergedConfig),
        getAssets: (query) => getAssets(query, mergedConfig),
        getAsset: (assetUid) => getAsset(assetUid, mergedConfig),
        uploadAsset: (data) => uploadAsset(data, mergedConfig),
        getEnvironments: () => getEnvironments(mergedConfig),
        getEnvironment: (uid) => getEnvironment(uid, mergedConfig),
        publishEntry: (data, options) => publishEntry(data, options, mergedConfig),
        unpublishEntry: (data, options) => unpublishEntry(data, options, mergedConfig),
        getLanguages: () => getLanguages(mergedConfig),
        localizeEntry: (contentTypeUid, entryUid, data, options) => localizeEntry(contentTypeUid, entryUid, data, options, mergedConfig)
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
    unpublishEntry,
    getLanguages,
    localizeEntry
}; 