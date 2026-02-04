/**
 * Standalone API Client for Second Brain
 * 
 * Simple fetch-based API client without framework dependencies
 */
class ApiClient {
    constructor(baseUrl = '/api/brain', options = {}) {
        this.baseUrl = baseUrl;
        this.options = {
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };
    }
    
    async get(endpoint = '') {
        return this.request(endpoint, 'GET');
    }
    
    async post(endpoint = '', body) {
        return this.request(endpoint, 'POST', body);
    }
    
    async put(endpoint = '', body) {
        return this.request(endpoint, 'PUT', body);
    }
    
    async delete(endpoint = '') {
        return this.request(endpoint, 'DELETE');
    }
    
    async request(endpoint, method, body = null) {
        const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;
        const options = {
            ...this.options,
            method
        };
        
        if (body) {
            options.body = JSON.stringify(body);
        }
        
        try {
            const res = await fetch(url, options);
            
            // Handle JSON Parsing
            const text = await res.text();
            let data;
            try {
                data = JSON.parse(text);
            } catch (e) {
                throw new Error(`Server Error (Not JSON): ${text.substring(0, 100)}`);
            }
            
            if (!res.ok) {
                throw new Error(data.error || `API Error: ${res.status}`);
            }
            
            return data;
        } catch (e) {
            console.error(`API Call Failed [${method} ${url}]:`, e);
            throw e;
        }
    }
}

export default ApiClient;
