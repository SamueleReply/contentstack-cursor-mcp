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
        const mergedConfig = { ...config };
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
            const errorData = response.data;
            let errorMessage = `Request failed with status ${response.status}`;

            // Extract detailed error information from Contentstack API response
            if (errorData) {
                if (errorData.error_message) {
                    errorMessage = errorData.error_message;
                } else if (errorData.error) {
                    errorMessage = errorData.error;
                } else if (errorData.errors && Array.isArray(errorData.errors) && errorData.errors.length > 0) {
                    // Handle array of errors
                    const errorMessages = errorData.errors.map(err =>
                        err.message || err.error_message || err.toString()
                    );
                    errorMessage = errorMessages.join('; ');
                } else if (errorData.message) {
                    errorMessage = errorData.message;
                }

                // Add additional context for specific status codes
                switch (response.status) {
                    case 404:
                        if (errorMessage.includes('Request failed with status 404')) {
                            errorMessage = 'Resource not found. This could be due to an invalid UID, non-existent environment, or missing permissions.';
                        }
                        break;
                    case 401:
                        errorMessage = `Authentication failed: ${errorMessage}. Please check your API key and management token.`;
                        break;
                    case 403:
                        errorMessage = `Access forbidden: ${errorMessage}. Please check your permissions for this resource.`;
                        break;
                    case 422:
                        errorMessage = `Validation error: ${errorMessage}`;
                        break;
                }
            }

            // Create enhanced error with additional context
            const error = new Error(errorMessage);
            error.status = response.status;
            error.responseData = errorData;
            throw error;
        }

        return response.data;
    } catch (error) {
        // If this is our custom error from above, re-throw it
        if (error.status && error.responseData !== undefined) {
            throw error;
        }

        if (error.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx (this shouldn't happen now due to validateStatus)
            const errorData = error.response.data;
            let errorMessage = `Request failed with status ${error.response.status}`;

            if (errorData) {
                if (errorData.error_message) {
                    errorMessage = errorData.error_message;
                } else if (errorData.error) {
                    errorMessage = errorData.error;
                } else if (errorData.errors && Array.isArray(errorData.errors) && errorData.errors.length > 0) {
                    const errorMessages = errorData.errors.map(err =>
                        err.message || err.error_message || err.toString()
                    );
                    errorMessage = errorMessages.join('; ');
                } else if (errorData.message) {
                    errorMessage = errorData.message;
                }
            }

            const enhancedError = new Error(errorMessage);
            enhancedError.status = error.response.status;
            enhancedError.responseData = errorData;
            throw enhancedError;
        } else if (error.request) {
            // The request was made but no response was received
            throw new Error('No response received from Contentstack server. Please check your network connection and Contentstack service status.');
        } else {
            // Something happened in setting up the request that triggered an Error
            throw new Error(`Request setup error: ${error.message}`);
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
    const queryParams = new URLSearchParams();

    // Handle complex query objects by JSON encoding them as the 'query' parameter
    if (query && Object.keys(query).length > 0) {
        // Check if this looks like a content filtering query (has fields like title, content, etc.)
        const isContentQuery = Object.keys(query).some(key =>
            !['limit', 'skip', 'environment', 'locale', 'include_count', 'include_schema', 'include_workflow', 'order_by'].includes(key)
        );

        if (isContentQuery) {
            // For content filtering, we need to JSON encode the query object
            const contentQuery = {};
            const standardParams = {};

            // Separate content query fields from standard parameters
            Object.entries(query).forEach(([key, value]) => {
                if (['limit', 'skip', 'environment', 'locale', 'include_count', 'include_schema', 'include_workflow', 'order_by'].includes(key)) {
                    standardParams[key] = value;
                } else {
                    contentQuery[key] = value;
                }
            });

            // Add the JSON-encoded content query as the 'query' parameter
            if (Object.keys(contentQuery).length > 0) {
                queryParams.append('query', JSON.stringify(contentQuery));
            }

            // Add standard parameters normally
            Object.entries(standardParams).forEach(([key, value]) => {
                queryParams.append(key, value);
            });
        } else {
            // For standard parameters only, use the original approach
            Object.entries(query).forEach(([key, value]) => {
                queryParams.append(key, value);
            });
        }
    }

    const queryString = queryParams.toString();
    return makeRequest('GET', `/content_types/${contentTypeUid}/entries${queryString ? '?' + queryString : ''}`, null, config);
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
const publishEntry = async (contentTypeUid, entryUid, data, options = {}, config = {}) => {
    const endpoint = `content_types/${contentTypeUid}/entries/${entryUid}/publish`;
    return makeRequest('POST', endpoint, data, config);
};

const unpublishEntry = async (contentTypeUid, entryUid, data, options = {}, config = {}) => {
    const endpoint = `content_types/${contentTypeUid}/entries/${entryUid}/unpublish`;
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
    const mergedConfig = { ...config };
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
        publishEntry: (contentTypeUid, entryUid, data, options) => publishEntry(contentTypeUid, entryUid, data, options, mergedConfig),
        unpublishEntry: (contentTypeUid, entryUid, data, options) => unpublishEntry(contentTypeUid, entryUid, data, options, mergedConfig),
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