import * as vscode from 'vscode';
import * as https from 'https';

const DEFAULT_BASE_URL = 'https://jovial-marmot-891.convex.site/api';

export type InputType = 'voice' | 'document' | 'text' | 'mixed';

export interface Workflow {
    _id: string;
    _creationTime: number;
    createdAt: number;
    updatedAt: number;
    userId: string;
    userEmail: string;
    workflowName: string;
    productName: string;
    description?: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    currentStep: number;
    totalSteps: number;
    inputType?: InputType;
    artifactCount?: number;
    duration?: number | null;
    currentAgentName?: string | null;
    uploadedDocumentName?: string;
    uploadedDocumentText?: string;
    contextId?: string;
    workflowGroupId?: string;
    completedAt?: number;
    startedAt?: number;
}

export interface AgentExecution {
    _id: string;
    agentId: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    startedAt?: number;
    completedAt?: number;
    duration?: number;
    error?: string | null;
    validationPassed?: boolean;
    artifactId?: string;
}

export interface PipelineStatus {
    success: boolean;
    workflow: {
        _id: string;
        status: string;
        productName: string;
        createdAt: number;
        updatedAt: number;
    };
    progress: {
        percentage: number;
        currentStep: number;
        totalSteps: number;
        currentAgent: string;
        message: string;
        updatedAt: number;
    };
    executions: AgentExecution[];
    documentSummary: Record<string, { status: string; artifactId?: string }>;
    isComplete: boolean;
    isRunning: boolean;
}

export interface Artifact {
    _id: string;
    workflowId: string;
    type: string;
    title: string;
    content: string;
    workflowVersionNumber: number;
    documentVersion: number;
    createdAt: number;
    updatedAt: number;
    isCurrent: boolean;
    agentId: string;
}

export interface UserProfile {
    userId: string;
    email: string;
    name: string;
    role: string;
    hasCompletedOnboarding: boolean;
    organisation?: string;
    jobTitle?: string;
    createdAt: number;
    lastSeen: number;
}

export interface ApiKeyInfo {
    _id: string;
    userId: string;
    name: string;
    key: string;
    createdAt: number;
    expiresAt?: number;
    lastUsedAt?: number;
    isRevoked: boolean;
    isExpired: boolean;
}

const DOCUMENT_TYPES = [
    { type: 'vision', title: 'Vision & Strategy', icon: 'lightbulb', agentId: 'agent-01-vision' },
    { type: 'personas', title: 'User Personas', icon: 'groups', agentId: 'agent-02-personas' },
    { type: 'useCases', title: 'Strategic Use Cases', icon: 'account_tree', agentId: 'agent-03-useCases' },
    { type: 'roadmap', title: 'Product Roadmap', icon: 'map', agentId: 'agent-04-roadmap' },
    { type: 'gtm', title: 'GTM Strategy', icon: 'trending_up', agentId: 'agent-05-gtm' },
    { type: 'uiFlows', title: 'UI Flows & Navigation', icon: 'route', agentId: 'agent-06-uiFlows' },
    { type: 'syntheticData', title: 'Synthetic Data Schema', icon: 'dataset', agentId: 'agent-07-syntheticData' },
    { type: 'prd', title: 'Product Requirements Doc', icon: 'description', agentId: 'agent-08-prd' },
    { type: 'techArchitecture', title: 'Technical Architecture', icon: 'architecture', agentId: 'agent-09-techArchitecture' },
    { type: 'databaseDesign', title: 'Database Design', icon: 'database', agentId: 'agent-10-databaseDesign' },
    { type: 'apiDesign', title: 'API Specifications', icon: 'api', agentId: 'agent-11-apiDesign' },
    { type: 'securitySpec', title: 'Security Specification', icon: 'security', agentId: 'agent-12-securitySpec' },
    { type: 'devops', title: 'DevOps & Infrastructure', icon: 'cloud', agentId: 'agent-13-devops' },
    { type: 'testingStrategy', title: 'Testing Strategy', icon: 'bug_report', agentId: 'agent-14-testingStrategy' },
    { type: 'mockup', title: 'Interactive Mockup', icon: 'layers', agentId: 'agent-15-mockup' },
    { type: 'styleGuide', title: 'Brand Style Guide', icon: 'palette', agentId: 'agent-16-styleGuide' },
    { type: 'brd', title: 'Business Requirements', icon: 'business_center', agentId: 'agent-17-brd' },
    { type: 'functionalRequirements', title: 'Functional Requirements', icon: 'fact_check', agentId: 'agent-18-functionalRequirements' },
    { type: 'bom', title: 'Bill of Materials', icon: 'inventory_2', agentId: 'agent-19-bom' },
    { type: 'implementationPlan', title: 'Implementation Plan', icon: 'rocket_launch', agentId: 'agent-20-implementationPlan' },
];

export { DOCUMENT_TYPES };

export class GenesisApi {
    private baseUrl: string;
    private apiKey: string = '';

    constructor(secretStorage: vscode.SecretStorage) {
        this.baseUrl = DEFAULT_BASE_URL;
        this.loadApiKey(secretStorage);
    }

    private async loadApiKey(secretStorage: vscode.SecretStorage): Promise<void> {
        const key = await secretStorage.get('genesis.apiKey');
        if (key) {
            this.apiKey = key;
        }
    }

    async setApiKey(secretStorage: vscode.SecretStorage, key: string): Promise<void> {
        this.apiKey = key;
        await secretStorage.store('genesis.apiKey', key);
    }

    async getApiKey(): Promise<string> {
        return this.apiKey;
    }

    isAuthenticated(): boolean {
        return this.apiKey.length > 0;
    }

    private async request<T>(
        method: string,
        path: string,
        body?: any
    ): Promise<T> {
        if (!this.apiKey) {
            throw new Error('No API key configured. Please set your API key in Settings.');
        }

        const url = new URL(path, this.baseUrl);
        const postData = body ? JSON.stringify(body) : undefined;

        const options: https.RequestOptions = {
            hostname: url.hostname,
            port: url.port || 443,
            path: url.pathname + url.search,
            method: method,
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
            },
        };

        return new Promise<T>((resolve, reject) => {
            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => { data += chunk; });
                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(data);
                        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                            resolve(parsed);
                        } else {
                            reject(new Error(parsed.error || `HTTP ${res.statusCode}: ${data}`));
                        }
                    } catch (e) {
                        reject(new Error(`Failed to parse response: ${data}`));
                    }
                });
            });

            req.on('error', (e) => {
                reject(new Error(`Network error: ${e.message}`));
            });

            if (postData) {
                req.write(postData);
            }
            req.end();
        });
    }

    // ==================== VALIDATION ====================

    async validateKey(apiKey: string): Promise<{ valid: boolean; userId?: string; userEmail?: string; userName?: string }> {
        // Use the provided key for both auth and body validation
        const savedKey = this.apiKey;
        this.apiKey = apiKey;
        try {
            const result = await this.request<{ valid: boolean; userId?: string; userEmail?: string; userName?: string }>('POST', '/api/validate-key', { apiKey });
            return result;
        } finally {
            this.apiKey = savedKey;
        }
    }

    // ==================== USER ====================

    async getUserProfile(): Promise<{ success: boolean; user: UserProfile }> {
        return this.request('GET', '/api/users/profile');
    }

    // ==================== WORKFLOWS ====================

    async listWorkflows(): Promise<{ success: boolean; workflows: Workflow[] }> {
        return this.request('GET', '/api/workflows');
    }

    async getWorkflow(workflowId: string): Promise<{ success: boolean; workflow: Workflow }> {
        return this.request('GET', `/api/workflows?workflowId=${encodeURIComponent(workflowId)}`);
    }

    async createWorkflow(workflowName: string, productName: string, selectedArtifactTypes?: string[]): Promise<{ success: boolean; workflowId: string; workflowName: string; message: string }> {
        const body: any = { workflowName, productName };
        if (selectedArtifactTypes && selectedArtifactTypes.length > 0) {
            body.selectedArtifactTypes = selectedArtifactTypes;
        }
        return this.request('POST', '/api/workflows/create', body);
    }

    async updateTranscript(workflowId: string, transcript: string): Promise<{ success: boolean; message: string }> {
        return this.request('POST', '/api/workflows/update-transcript', { workflowId, transcript });
    }

    async updateDocument(workflowId: string, documentText: string, documentName?: string): Promise<{ success: boolean; message: string }> {
        const body: any = { workflowId, documentText };
        if (documentName) body.documentName = documentName;
        return this.request('POST', '/api/workflows/update-document', body);
    }

    async updateWorkflowStatus(workflowId: string, status: string, currentStep?: number): Promise<{ success: boolean; message: string }> {
        const body: any = { workflowId, status };
        if (currentStep !== undefined) body.currentStep = currentStep;
        return this.request('POST', '/api/workflows/update-status', body);
    }

    async updateWorkflowDetails(workflowId: string, workflowName?: string, description?: string): Promise<{ success: boolean; message: string }> {
        const body: any = { workflowId };
        if (workflowName !== undefined) body.workflowName = workflowName;
        if (description !== undefined) body.description = description;
        return this.request('POST', '/api/workflows/update-details', body);
    }

    async searchWorkflows(query: string, status?: string, limit?: number): Promise<{ success: boolean; workflows: Workflow[]; total: number }> {
        let path = `/api/workflows/search?q=${encodeURIComponent(query)}`;
        if (status) path += `&status=${encodeURIComponent(status)}`;
        if (limit) path += `&limit=${limit}`;
        return this.request('GET', path);
    }

    async deleteWorkflow(workflowId: string): Promise<{ success: boolean; message: string }> {
        return this.request('POST', '/api/workflows/delete', { workflowId });
    }

    // ==================== PIPELINE ====================

    async startPipeline(workflowId: string, contextId?: string): Promise<{ success: boolean; message: string; workflowId: string }> {
        const body: any = { workflowId };
        if (contextId) body.contextId = contextId;
        return this.request('POST', '/api/pipeline/start', body);
    }

    async getPipelineStatus(workflowId: string): Promise<PipelineStatus> {
        return this.request('GET', `/api/pipeline/status?workflowId=${encodeURIComponent(workflowId)}`);
    }

    async resetPipeline(workflowId: string): Promise<{ success: boolean; message: string }> {
        return this.request('POST', '/api/pipeline/reset', { workflowId });
    }

    // ==================== DOCUMENTS ====================

    async generateDocument(workflowId: string, type: string): Promise<{ success: boolean; message: string; workflowId: string; type: string }> {
        return this.request('POST', '/api/documents/generate', { workflowId, type });
    }

    async continueWorkflow(workflowId: string, changeSummary: string, createdBy?: string): Promise<any> {
        const body: any = { workflowId, changeSummary };
        if (createdBy) body.createdBy = createdBy;
        return this.request('POST', '/api/documents/continue', body);
    }

    async exportDocuments(workflowId: string, format: 'json' | 'markdown' = 'markdown', type?: string): Promise<any> {
        let path = `/api/documents/export?workflowId=${encodeURIComponent(workflowId)}&format=${format}`;
        if (type) path += `&type=${encodeURIComponent(type)}`;
        // Markdown format returns raw text, not JSON
        if (format === 'markdown') {
            if (!this.apiKey) {
                throw new Error('No API key configured.');
            }
            const url = new URL(path, this.baseUrl);
            return new Promise((resolve, reject) => {
                const options: https.RequestOptions = {
                    hostname: url.hostname,
                    port: 443,
                    path: url.pathname + url.search,
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                    },
                };
                const req = https.request(options, (res) => {
                    let data = '';
                    res.on('data', (chunk) => { data += chunk; });
                    res.on('end', () => {
                        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                            resolve({ success: true, format: 'markdown', content: data } as any);
                        } else {
                            reject(new Error(`HTTP ${res.statusCode}`));
                        }
                    });
                });
                req.on('error', (e) => reject(new Error(`Network error: ${e.message}`)));
                req.end();
            });
        }
        return this.request('GET', path);
    }

    // ==================== ARTIFACTS ====================

    async listArtifacts(workflowId: string, versionNumber?: number): Promise<{ success: boolean; artifacts: Artifact[] }> {
        let path = `/api/artifacts/list?workflowId=${encodeURIComponent(workflowId)}`;
        if (versionNumber !== undefined) path += `&versionNumber=${versionNumber}`;
        return this.request('GET', path);
    }

    async getArtifact(workflowId: string, type: string): Promise<{ success: boolean; artifact: Artifact }> {
        return this.request('GET', `/api/artifacts/get?workflowId=${encodeURIComponent(workflowId)}&type=${encodeURIComponent(type)}`);
    }

    async saveArtifact(workflowId: string, type: string, content: string, title: string, workflowVersionNumber?: number): Promise<{ success: boolean; artifactId: string; message: string }> {
        const body: any = { workflowId, type, content, title };
        if (workflowVersionNumber !== undefined) body.workflowVersionNumber = workflowVersionNumber;
        return this.request('POST', '/api/artifacts/save', body);
    }

    async updateArtifact(workflowId: string, type: string, content: string, title?: string): Promise<{ success: boolean; message: string }> {
        const body: any = { workflowId, type, content };
        if (title) body.title = title;
        return this.request('POST', '/api/artifacts/update', body);
    }

    async getArtifactVersions(workflowId: string, type: string): Promise<{ success: boolean; versions: any[] }> {
        return this.request('GET', `/api/artifacts/versions?workflowId=${encodeURIComponent(workflowId)}&type=${encodeURIComponent(type)}`);
    }

    async deleteArtifact(artifactId: string): Promise<{ success: boolean; message: string }> {
        return this.request('POST', '/api/artifacts/delete', { artifactId });
    }

    // ==================== API KEYS ====================

    async listApiKeys(): Promise<{ success: boolean; apiKeys: ApiKeyInfo[] }> {
        return this.request('GET', '/api/keys');
    }

    async createApiKey(name: string, expiresInDays?: number): Promise<{ success: boolean; message: string; apiKey: string }> {
        const body: any = { name };
        if (expiresInDays) body.expiresInDays = expiresInDays;
        return this.request('POST', '/api/keys/create', body);
    }

    async revokeApiKey(apiKeyId: string): Promise<{ success: boolean; message: string }> {
        return this.request('POST', '/api/keys/revoke', { apiKeyId });
    }

    // ==================== SHARING ====================

    async createShareLink(workflowId: string, artifactTypes?: string[], expiresInDays?: number, createdBy?: string): Promise<{ success: boolean; token: string; url: string; message: string }> {
        const body: any = { workflowId };
        if (artifactTypes) body.artifactTypes = artifactTypes;
        if (expiresInDays) body.expiresInDays = expiresInDays;
        if (createdBy) body.createdBy = createdBy;
        return this.request('POST', '/api/share/create', body);
    }
}
