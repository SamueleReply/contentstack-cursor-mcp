export type Region = 'NA' | 'EU' | 'AZURE_NA' | 'AZURE_EU' | 'GCP_NA' | 'GCP_EU';

export interface ContentstackConfig {
    region?: Region;
    apiKey?: string;
    managementToken?: string;
    deliveryToken?: string;
}

export interface ContentstackClient {
    // Content Types
    getContentTypes(): Promise<any>;
    getContentType(uid: string): Promise<any>;
    createContentType(data: any): Promise<any>;

    // Entries
    getEntries(contentTypeUid: string, query?: Record<string, unknown>): Promise<any>;
    getEntry(
        contentTypeUid: string,
        entryUid: string,
        options?: Record<string, unknown>
    ): Promise<any>;
    createEntry(
        contentTypeUid: string,
        data: any,
        options?: Record<string, unknown>
    ): Promise<any>;
    updateEntry(
        contentTypeUid: string,
        entryUid: string,
        data: any,
        options?: Record<string, unknown>
    ): Promise<any>;
    deleteEntry(
        contentTypeUid: string,
        entryUid: string,
        options?: Record<string, unknown>
    ): Promise<any>;

    // Assets
    getAssets(query?: Record<string, unknown>): Promise<any>;
    getAsset(assetUid: string): Promise<any>;
    uploadAsset(data: any): Promise<any>;

    // Environments
    getEnvironments(): Promise<any>;
    getEnvironment(uid: string): Promise<any>;

    // Publish
    publishEntry(data: any, options?: Record<string, unknown>): Promise<any>;
    unpublishEntry(data: any, options?: Record<string, unknown>): Promise<any>;

    // Languages
    getLanguages(): Promise<any>;

    // Localization
    localizeEntry(
        contentTypeUid: string,
        entryUid: string,
        data: any,
        options?: Record<string, unknown>
    ): Promise<any>;
}

declare const contentstack: {
    initialize(config?: ContentstackConfig): ContentstackClient;
};

export default contentstack;