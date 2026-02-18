
export const getApiBaseUrl = (): string => {
    if (typeof window === 'undefined') return '';

    const hostname = window.location.hostname;
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';

    if (isLocal) {
        return 'http://localhost:4000';
    }

    // Explicitly handle production backend URL
    if (hostname === 'buildxdesigner.site') {
        return 'https://buildxdesigner.duckdns.org';
    }

    // Default to relative if unknown
    return '';
};

