import * as vscode from 'vscode';
import {
    GenesisApi,
    Workflow,
    PipelineStatus,
    Artifact,
    UserProfile,
    DOCUMENT_TYPES,
} from '../api/genesisApi';

export interface WorkflowWithStatus extends Workflow {
    pipelineStatus?: PipelineStatus;
    artifactMap?: Record<string, Artifact>;
}

// Multi-listener event emitter for UI updates
class GenesisEventEmitter {
    private _listeners: Set<(e: { type: string; data?: any }) => void> = new Set();
    get event(): vscode.Event<{ type: string; data?: any }> {
        return (listener) => {
            this._listeners.add(listener);
            return { dispose: () => { this._listeners.delete(listener); } };
        };
    }
    fire(type: string, data?: any) {
        const event = { type, data };
        const toRemove: Array<(e: { type: string; data?: any }) => void> = [];
        for (const listener of this._listeners) {
            try { listener(event); } catch (err: any) {
                // Webview disposed errors are expected — remove stale listener silently
                if (err?.message?.includes('disposed') || err?.message?.includes('is disposed')) {
                    toRemove.push(listener);
                } else {
                    console.error('Event listener error:', err);
                }
            }
        }
        // Clean up listeners whose webviews were disposed
        for (const listener of toRemove) { this._listeners.delete(listener); }
    }
    dispose() { this._listeners.clear(); }
}

export class WorkflowService {
    private api: GenesisApi;
    private _workflows: WorkflowWithStatus[] = [];
    private _currentWorkflowId: string | null = null;
    private _pollTimer: ReturnType<typeof setInterval> | null = null;
    private _userProfile: UserProfile | null = null;
    private _isConnected = false;

    readonly events = new GenesisEventEmitter();
    readonly onEvent = this.events.event;

    constructor(secretStorage: vscode.SecretStorage) {
        this.api = new GenesisApi(secretStorage);
    }

    getApi(): GenesisApi { return this.api; }

    isAuthenticated(): boolean { return this.api.isAuthenticated(); }
    isConnected(): boolean { return this._isConnected; }
    getWorkflows(): WorkflowWithStatus[] { return this._workflows; }
    getCurrentWorkflowId(): string | null { return this._currentWorkflowId; }
    getUserProfile(): UserProfile | null { return this._userProfile; }

    async setApiKey(secretStorage: vscode.SecretStorage, key: string): Promise<boolean> {
        try {
            const result = await this.api.validateKey(key);
            if (result.valid) {
                await this.api.setApiKey(secretStorage, key);
                this._isConnected = true;
                this.events.fire('connection-changed', { connected: true });
                return true;
            }
            throw new Error('Invalid API key');
        } catch (e: any) {
            this._isConnected = false;
            this.events.fire('connection-changed', { connected: false, error: e.message });
            return false;
        }
    }

    async loadApiKey(_secretStorage?: vscode.SecretStorage): Promise<boolean> {
        const key = await this.api.getApiKey();
        if (key) {
            try {
                const result = await this.api.validateKey(key);
                if (result.valid) {
                    this._isConnected = true;
                    this.events.fire('connection-changed', { connected: true });
                    return true;
                }
            } catch {
                this._isConnected = false;
            }
        }
        return false;
    }

    async fetchUser(): Promise<UserProfile | null> {
        try {
            const res = await this.api.getUserProfile();
            if (res.success && res.user) {
                this._userProfile = res.user;
                this.events.fire('user-updated', this._userProfile);
                return this._userProfile;
            }
        } catch (e: any) {
            console.error('Failed to fetch user:', e.message);
        }
        return null;
    }

    async fetchWorkflows(): Promise<WorkflowWithStatus[]> {
        try {
            const res = await this.api.listWorkflows();
            if (res.success && res.workflows) {
                // Preserve existing pipelineStatus and artifactMap when refreshing list
                const oldMap = new Map<string, { pipelineStatus?: PipelineStatus; artifactMap?: Record<string, Artifact> }>();
                for (const wf of this._workflows) {
                    if (wf.pipelineStatus || (wf.artifactMap && Object.keys(wf.artifactMap).length > 0)) {
                        oldMap.set(wf._id, {
                            pipelineStatus: wf.pipelineStatus,
                            artifactMap: wf.artifactMap,
                        });
                    }
                }
                this._workflows = res.workflows.map(wf => ({
                    ...wf,
                    workflowName: wf.workflowName || 'Untitled',
                    productName: wf.productName || wf.workflowName || 'Untitled',
                    status: wf.status || 'pending',
                    totalSteps: wf.totalSteps || 20,
                    currentStep: wf.currentStep || 0,
                    inputType: wf.inputType || 'voice',
                    artifactCount: wf.artifactCount || 0,
                    duration: wf.duration ?? null,
                    currentAgentName: wf.currentAgentName ?? null,
                    description: wf.description || '',
                    // Restore preserved pipeline data
                    ...(oldMap.has(wf._id) ? oldMap.get(wf._id)! : {}),
                }));
                this.events.fire('workflows-updated', this._workflows);
                return this._workflows;
            }
        } catch (e: any) {
            console.error('Failed to fetch workflows:', e.message);
        }
        return [];
    }

    async createWorkflow(workflowName: string, productName: string, transcript: string, autoStart: boolean = true): Promise<{ workflowId: string } | null> {
        try {
            // Step 1: Create workflow
            const createRes = await this.api.createWorkflow(workflowName, productName);
            if (!createRes.success) throw new Error(createRes.message || 'Failed to create workflow');
            const workflowId = createRes.workflowId;

            // Step 2: Set transcript (required)
            if (transcript && transcript.length > 0) {
                await this.api.updateTranscript(workflowId, transcript);
            }

            // Step 3: Optionally start pipeline
            if (autoStart) {
                await this.api.startPipeline(workflowId);
            }

            // Refresh workflows list
            await this.fetchWorkflows();
            return { workflowId };
        } catch (e: any) {
            vscode.window.showErrorMessage(`Failed to create workflow: ${e.message}`);
            return null;
        }
    }

    async deleteWorkflow(workflowId: string): Promise<boolean> {
        try {
            const res = await this.api.deleteWorkflow(workflowId);
            if (res.success) {
                if (this._currentWorkflowId === workflowId) {
                    this.stopPolling();
                    this._currentWorkflowId = null;
                }
                await this.fetchWorkflows();
                return true;
            }
        } catch (e: any) {
            vscode.window.showErrorMessage(`Failed to delete workflow: ${e.message}`);
        }
        return false;
    }

    async fetchPipelineStatus(workflowId: string): Promise<PipelineStatus | null> {
        try {
            const status = await this.api.getPipelineStatus(workflowId);
            // Upsert: update workflow in our local list, or add it if missing
            let wfIndex = this._workflows.findIndex(w => w._id === workflowId);
            if (wfIndex === -1 && status.workflow) {
                // Workflow not in list yet — create entry from pipeline response
                const wfEntry: WorkflowWithStatus = {
                    _id: workflowId,
                    _creationTime: status.workflow.createdAt,
                    userId: '',
                    userEmail: '',
                    workflowName: status.workflow.productName || 'Untitled',
                    productName: status.workflow.productName || 'Untitled',
                    status: (status.workflow.status as any) || 'pending',
                    currentStep: status.progress?.currentStep || 0,
                    totalSteps: status.progress?.totalSteps || 20,
                    createdAt: status.workflow.createdAt,
                    updatedAt: status.workflow.updatedAt,
                    pipelineStatus: status,
                    artifactMap: {},
                };
                this._workflows.push(wfEntry);
                wfIndex = this._workflows.length - 1;
            }
            if (wfIndex !== -1) {
                this._workflows[wfIndex].pipelineStatus = status;
                this._workflows[wfIndex].status = (status.workflow?.status as any) || this._workflows[wfIndex].status;
                if (status.progress) {
                    this._workflows[wfIndex].currentStep = status.progress.currentStep;
                    this._workflows[wfIndex].totalSteps = status.progress.totalSteps;
                }
            }
            this.events.fire('pipeline-status-updated', { workflowId, status });
            return status;
        } catch (e: any) {
            console.error('Failed to fetch pipeline status:', e.message);
            return null;
        }
    }

    async fetchArtifacts(workflowId: string): Promise<Record<string, Artifact>> {
        try {
            const res = await this.api.listArtifacts(workflowId);
            const map: Record<string, Artifact> = {};
            if (res.success && res.artifacts) {
                for (const artifact of res.artifacts) {
                    if (artifact.isCurrent) {
                        map[artifact.type] = artifact;
                    }
                }
            }
            // Upsert: create workflow entry if missing so artifacts get stored
            let wfIndex = this._workflows.findIndex(w => w._id === workflowId);
            if (wfIndex === -1) {
                this._workflows.push({
                    _id: workflowId,
                    _creationTime: Date.now(),
                    userId: '',
                    userEmail: '',
                    workflowName: 'Untitled',
                    productName: 'Untitled',
                    status: 'pending',
                    currentStep: 0,
                    totalSteps: 20,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    artifactMap: map,
                });
                wfIndex = this._workflows.length - 1;
            }
            this._workflows[wfIndex].artifactMap = map;
            this.events.fire('artifacts-updated', { workflowId, artifacts: map });
            return map;
        } catch (e: any) {
            console.error('Failed to fetch artifacts:', e.message);
            return {};
        }
    }

    async fetchArtifact(workflowId: string, type: string): Promise<Artifact | null> {
        try {
            const res = await this.api.getArtifact(workflowId, type);
            if (res.success && res.artifact) {
                return res.artifact;
            }
        } catch (e: any) {
            console.error(`Failed to fetch artifact ${type}:`, e.message);
        }
        return null;
    }

    async startPipeline(workflowId: string): Promise<boolean> {
        try {
            const res = await this.api.startPipeline(workflowId);
            if (res.success) {
                vscode.window.showInformationMessage('Pipeline started! Polling for progress...');
                this.startPolling(workflowId);
                return true;
            }
        } catch (e: any) {
            vscode.window.showErrorMessage(`Failed to start pipeline: ${e.message}`);
        }
        return false;
    }

    async regenerateDocument(workflowId: string, type: string): Promise<boolean> {
        try {
            const res = await this.api.generateDocument(workflowId, type);
            if (res.success) {
                vscode.window.showInformationMessage(`Regenerating ${type} document...`);
                this.startPolling(workflowId);
                return true;
            }
        } catch (e: any) {
            vscode.window.showErrorMessage(`Failed to generate document: ${e.message}`);
        }
        return false;
    }

    async continueWorkflow(workflowId: string, changeSummary: string): Promise<boolean> {
        try {
            const res = await this.api.continueWorkflow(workflowId, changeSummary);
            if (res.success) {
                vscode.window.showInformationMessage('Workflow continuation started!');
                this.startPolling(workflowId);
                return true;
            }
        } catch (e: any) {
            vscode.window.showErrorMessage(`Failed to continue workflow: ${e.message}`);
        }
        return false;
    }

    async exportAllDocuments(workflowId: string, workflowName: string, selectedTypes: string[], format: 'json' | 'markdown' = 'markdown'): Promise<string | null> {
        try {
            const safeName = (workflowName || 'export').replace(/[^a-zA-Z0-9_\-.]/g, '_');

            // Pick a folder to save all documents into
            const folderUri = await vscode.window.showOpenDialog({
                canSelectFiles: false,
                canSelectFolders: true,
                canSelectMany: false,
                openLabel: 'Select folder to export documents',
                title: 'Export Documents — Select Destination Folder',
            });
            if (!folderUri || folderUri.length === 0) { return null; }
            const destFolder = folderUri[0];

            let exported = 0;
            let failed = 0;

            for (const docType of selectedTypes) {
                try {
                    const docInfo = DOCUMENT_TYPES.find(d => d.type === docType);
                    const docTitle = docInfo?.title || docType;
                    const safeDocName = docTitle.replace(/[^a-zA-Z0-9_\-.]/g, '_');

                    const artifact = await this.fetchArtifact(workflowId, docType);
                    if (!artifact || !artifact.content) {
                        failed++;
                        continue;
                    }

                    const ext = format === 'json' ? 'json' : 'md';
                    const fileName = `${safeName}_${safeDocName}.${ext}`;
                    const fileUri = vscode.Uri.joinPath(destFolder, fileName);

                    let fileContent: string;
                    if (format === 'json') {
                        fileContent = JSON.stringify(artifact, null, 2);
                    } else {
                        fileContent = artifact.content;
                    }

                    await vscode.workspace.fs.writeFile(fileUri, Buffer.from(fileContent, 'utf-8'));
                    exported++;
                } catch (err: any) {
                    console.error(`Failed to export ${docType}:`, err.message);
                    failed++;
                }
            }

            if (exported > 0) {
                const msg = failed > 0
                    ? `Exported ${exported} of ${selectedTypes.length} documents to ${destFolder.fsPath} (${failed} failed)`
                    : `Exported ${exported} documents to ${destFolder.fsPath}`;
                vscode.window.showInformationMessage(msg);
                // Reveal the folder in the OS file explorer
                vscode.commands.executeCommand('revealFileInOS', destFolder);
            } else {
                vscode.window.showWarningMessage('No documents could be exported. Ensure documents are generated before exporting.');
            }
            return destFolder.fsPath;
        } catch (e: any) {
            vscode.window.showErrorMessage(`Export failed: ${e.message}`);
        }
        return null;
    }

    async exportDocuments(workflowId: string, format: 'json' | 'markdown' = 'markdown'): Promise<string | null> {
        try {
            const res = await this.api.exportDocuments(workflowId, format);
            if (res.success) {
                const wf = this._workflows.find(w => w._id === workflowId);
                const name = wf?.workflowName || 'export';
                const ext = format === 'markdown' ? 'md' : 'json';
                const uri = await vscode.window.showSaveDialog({
                    defaultUri: vscode.Uri.file(`${name}_Documents.${ext}`),
                    filters: { [ext.toUpperCase()]: [ext] },
                });
                if (uri) {
                    let content: string;
                    if (format === 'markdown') {
                        content = res.content || res;
                    } else {
                        content = JSON.stringify(res, null, 2);
                    }
                    await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf-8'));
                    vscode.window.showInformationMessage(`Documents exported to ${uri.fsPath}`);
                    return uri.fsPath;
                }
            }
        } catch (e: any) {
            vscode.window.showErrorMessage(`Export failed: ${e.message}`);
        }
        return null;
    }

    async createShareLink(workflowId: string, artifactTypes?: string[]): Promise<string | null> {
        try {
            const res = await this.api.createShareLink(workflowId, artifactTypes);
            if (res.success && res.url) {
                await vscode.env.clipboard.writeText(res.url);
                vscode.window.showInformationMessage(`Share link copied to clipboard! ${res.url}`);
                return res.url;
            }
        } catch (e: any) {
            vscode.window.showErrorMessage(`Failed to create share link: ${e.message}`);
        }
        return null;
    }

    startPolling(workflowId: string, intervalMs: number = 5000) {
        this._currentWorkflowId = workflowId;
        this.stopPolling();
        // Do immediate fetch and artifacts load, then start interval polling
        this._initialFetch(workflowId);
        this._pollTimer = setInterval(async () => {
            const status = await this.fetchPipelineStatus(workflowId);
            if (status && status.isComplete) {
                this.stopPolling();
                await this.fetchArtifacts(workflowId);
                await this.fetchWorkflows();
            }
        }, intervalMs);
    }

    private async _initialFetch(workflowId: string) {
        const status = await this.fetchPipelineStatus(workflowId);
        if (status) {
            await this.fetchArtifacts(workflowId);
            // If already complete, stop polling and refresh list
            if (status.isComplete) {
                this.stopPolling();
                await this.fetchWorkflows();
            }
        }
    }

    stopPolling() {
        if (this._pollTimer) {
            clearInterval(this._pollTimer);
            this._pollTimer = null;
        }
    }

    getWorkflowById(workflowId: string): WorkflowWithStatus | undefined {
        return this._workflows.find(w => w._id === workflowId);
    }

    getDocumentStatuses(workflowId: string): { type: string; title: string; icon: string; status: string }[] {
        const wf = this._workflows.find(w => w._id === workflowId);
        const executions = wf?.pipelineStatus?.executions || [];

        return DOCUMENT_TYPES.map(doc => {
            const exec = executions.find(e => e.agentId === doc.agentId);
            const artifact = wf?.artifactMap?.[doc.type];
            let status = 'pending';
            if (exec?.status === 'completed' || artifact) status = 'completed';
            else if (exec?.status === 'running') status = 'running';
            else if (exec?.status === 'failed') status = 'failed';
            return {
                type: doc.type,
                title: doc.title,
                icon: doc.icon,
                status,
            };
        });
    }

    dispose() {
        this.stopPolling();
        this.events.dispose();
    }
}
