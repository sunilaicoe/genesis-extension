import * as vscode from 'vscode';
import * as zlib from 'zlib';
import * as path from 'path';
import {
    GenesisApi,
    Workflow,
    PipelineStatus,
    Artifact,
    UserProfile,
    DOCUMENT_TYPES,
} from '../api/genesisApi';
import { LocalStorageService, LocalWorkflow } from './localStorageService';

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

    // Local workflow support
    public readonly localStorage: LocalStorageService;
    private _localWorkflows: Map<string, LocalWorkflow> = new Map();
    private _currentLocalWorkflowId: string | null = null;

    readonly events = new GenesisEventEmitter();
    readonly onEvent = this.events.event;

    constructor(secretStorage: vscode.SecretStorage) {
        this.api = new GenesisApi(secretStorage);
        this.localStorage = new LocalStorageService();
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

            // Ask user where to save the ZIP
            const defaultZipName = `${safeName}_Documents.zip`;
            const zipUri = await vscode.window.showSaveDialog({
                defaultUri: vscode.Uri.file(defaultZipName),
                filters: { 'ZIP Archive': ['zip'] },
                title: 'Export Documents — Save ZIP Archive',
            });
            if (!zipUri) { return null; }

            // Collect all document contents
            const files: { name: string; content: Buffer }[] = [];
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
                    const fileName = `${safeDocName}.${ext}`;

                    let fileContent: string;
                    if (format === 'json') {
                        fileContent = JSON.stringify(artifact, null, 2);
                    } else {
                        fileContent = artifact.content;
                    }

                    files.push({ name: fileName, content: Buffer.from(fileContent, 'utf-8') });
                } catch (err: any) {
                    console.error(`Failed to fetch ${docType}:`, err.message);
                    failed++;
                }
            }

            if (files.length === 0) {
                vscode.window.showWarningMessage('No documents could be exported. Ensure documents are generated before exporting.');
                return null;
            }

            // Build ZIP file in memory
            const zipBuffer = await this._createZip(files);

            // Write ZIP to disk
            await vscode.workspace.fs.writeFile(zipUri, zipBuffer);

            const msg = failed > 0
                ? `Exported ${files.length} of ${selectedTypes.length} documents to ${zipUri.fsPath} (${failed} failed)`
                : `Exported ${files.length} documents to ${zipUri.fsPath}`;
            vscode.window.showInformationMessage(msg);
            // Reveal the ZIP file in the OS file explorer
            vscode.commands.executeCommand('revealFileInOS', zipUri);
            return zipUri.fsPath;
        } catch (e: any) {
            vscode.window.showErrorMessage(`Export failed: ${e.message}`);
        }
        return null;
    }

    /**
     * Create a ZIP archive buffer from a list of files using Node.js built-in zlib.
     * No external dependencies required.
     */
    private _createZip(files: { name: string; content: Buffer }[]): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            const localHeaders: Buffer[] = [];
            const centralHeaders: Buffer[] = [];
            let offset = 0;

            const enc = new TextEncoder();
            let pending = files.length;

            if (pending === 0) {
                // Build empty ZIP
                const eocd = Buffer.alloc(22);
                eocd.writeUInt32LE(0x06054b50, 0); // EOCD signature
                resolve(eocd);
                return;
            }

            for (let i = 0; i < files.length; i++) {
                const fileNameBuf = Buffer.from(files[i].name, 'utf-8');
                const rawData = files[i].content;

                zlib.deflateRaw(rawData, (err, compressedResult: Buffer) => {
                    if (err) {
                        // Fallback: store uncompressed
                        compressedResult = rawData;
                    }

                    const crc = crc32(rawData);
                    const method = compressedResult.length < rawData.length ? 8 : 0; // 8=deflate, 0=stored
                    const finalData: Buffer = method === 8 ? compressedResult : rawData;

                    // Local file header (30 + filename)
                    const local = Buffer.alloc(30 + fileNameBuf.length + finalData.length);
                    local.writeUInt32LE(0x04034b50, 0);      // signature
                    local.writeUInt16LE(20, 4);                // version needed
                    local.writeUInt16LE(0, 6);                 // flags
                    local.writeUInt16LE(method, 8);            // compression method
                    local.writeUInt16LE(0, 10);                // mod time
                    local.writeUInt16LE(0, 12);                // mod date
                    local.writeUInt32LE(crc, 14);              // crc32
                    local.writeUInt32LE(finalData.length, 18); // compressed size
                    local.writeUInt32LE(rawData.length, 22);   // uncompressed size
                    local.writeUInt16LE(fileNameBuf.length, 26); // filename length
                    local.writeUInt16LE(0, 28);                // extra field length
                    fileNameBuf.copy(local, 30);               // filename
                    finalData.copy(local, 30 + fileNameBuf.length); // data
                    localHeaders.push(local);

                    // Central directory header (46 + filename)
                    const central = Buffer.alloc(46 + fileNameBuf.length);
                    central.writeUInt32LE(0x02014b50, 0);       // signature
                    central.writeUInt16LE(20, 4);                 // version made by
                    central.writeUInt16LE(20, 6);                 // version needed
                    central.writeUInt16LE(0, 8);                  // flags
                    central.writeUInt16LE(method, 10);            // compression method
                    central.writeUInt16LE(0, 12);                 // mod time
                    central.writeUInt16LE(0, 14);                 // mod date
                    central.writeUInt32LE(crc, 16);               // crc32
                    central.writeUInt32LE(finalData.length, 20);  // compressed size
                    central.writeUInt32LE(rawData.length, 24);    // uncompressed size
                    central.writeUInt16LE(fileNameBuf.length, 28); // filename length
                    central.writeUInt16LE(0, 30);                 // extra field length
                    central.writeUInt16LE(0, 32);                 // file comment length
                    central.writeUInt16LE(0, 34);                 // disk number start
                    central.writeUInt16LE(0, 36);                 // internal file attributes
                    central.writeUInt32LE(0, 38);                 // external file attributes
                    central.writeUInt32LE(offset, 42);            // relative offset of local header
                    fileNameBuf.copy(central, 46);                // filename
                    centralHeaders.push(central);

                    offset += local.length;

                    pending--;
                    if (pending === 0) {
                        // All files processed — assemble final ZIP
                        const centralSize = centralHeaders.reduce((s, b) => s + b.length, 0);
                        const eocd = Buffer.alloc(22);
                        eocd.writeUInt32LE(0x06054b50, 0);           // EOCD signature
                        eocd.writeUInt16LE(0, 4);                     // disk number
                        eocd.writeUInt16LE(0, 6);                     // central dir disk
                        eocd.writeUInt16LE(files.length, 8);          // entries on disk
                        eocd.writeUInt16LE(files.length, 10);         // total entries
                        eocd.writeUInt32LE(centralSize, 12);          // central dir size
                        eocd.writeUInt32LE(offset, 16);               // central dir offset
                        eocd.writeUInt16LE(0, 20);                    // comment length

                        resolve(Buffer.concat([...localHeaders, ...centralHeaders, eocd]));
                    }
                });
            }
        });
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

    // ─── LOCAL WORKFLOW METHODS ────────────────────────────────────────

    /**
     * Create a cloud workflow via the Genesis API pipeline and save
     * all generated documents to a local folder.
     * This is the "best of both worlds" — real AI output saved locally.
     */
/**
     * Create a cloud workflow, start the AI pipeline, open the detail panel
     * immediately with "Waiting for cloud...", then save cloud output locally
     * when done. Returns the local workflow ID right away (status = running).
     *
     * The caller should open WorkflowDetailPanel immediately with the returned ID.
     * The panel will auto-update via events as the pipeline progresses.
     */
    async createCloudToLocalWorkflow(
        workflowName: string,
        productName: string,
        transcript: string,
        outputFolder: string,
        autoStart: boolean = true,
        onProgress?: (step: number, total: number, message: string) => void
    ): Promise<{ workflowId: string } | null> {
        try {
            // ─── Step 1: Create cloud workflow ───────────────────────────────
            onProgress?.(0, 20, 'Creating cloud workflow...');
            const createRes = await this.api.createWorkflow(workflowName, productName);
            if (!createRes.success) throw new Error(createRes.message || 'Failed to create workflow');
            const cloudWorkflowId = createRes.workflowId;

            // ─── Step 2: Upload transcript ───────────────────────────────────
            onProgress?.(0, 20, 'Uploading requirements...');
            if (transcript && transcript.length > 0) {
                await this.api.updateTranscript(cloudWorkflowId, transcript);
            }

            // ─── Step 3: Start the AI pipeline ───────────────────────────────
            if (autoStart) {
                onProgress?.(0, 20, 'Starting AI pipeline...');
                await this.api.startPipeline(cloudWorkflowId);
            }

            // ─── Step 4: Create a local "pending" workflow immediately ───────
            //     This lets us open the detail panel right away.
            const localWf = await this.localStorage.createPendingCloudWorkflow(
                workflowName, productName, outputFolder, cloudWorkflowId
            );
            this._localWorkflows.set(localWf.id, localWf);

            // Fire event so any open detail panel refreshes
            this.events.fire('local-workflow-updated', { workflowId: localWf.id, workflow: localWf });

            // ─── Step 5: Poll the cloud pipeline in the background ──────────
            //     Update the local workflow status as agents complete.
            this._pollCloudPipelineToLocal(
                cloudWorkflowId, localWf.id, outputFolder, workflowName, productName, onProgress
            );

            // Return the local workflow ID immediately — panel opens now
            return { workflowId: localWf.id };

        } catch (e: any) {
            vscode.window.showErrorMessage(`Cloud pipeline failed: ${e.message}`);
            return null;
        }
    }

    /**
     * Background: poll the cloud pipeline, update local workflow status,
     * and when complete download all artifacts and save locally.
     */
    private _pollCloudPipelineToLocal(
        cloudWorkflowId: string,
        localWorkflowId: string,
        outputFolder: string,
        workflowName: string,
        productName: string,
        onProgress?: (step: number, total: number, message: string) => void
    ): void {
        const MAX_POLL_TIME = 10 * 60 * 1000; // 10 minutes
        const POLL_INTERVAL = 5000; // 5 seconds
        const startTime = Date.now();
        // Track which artifact types we've already saved locally
        const savedTypes = new Set<string>();

        const poll = async () => {
            try {
                const status = await this.api.getPipelineStatus(cloudWorkflowId);
                const step = status.progress?.currentStep || 0;
                const total = status.progress?.totalSteps || 20;
                const agentName = status.progress?.currentAgent || '';

                onProgress?.(step, total, step > 0 ? `Agent ${step}/${total}: ${agentName}` : 'Pipeline starting...');

                // ─── Check each execution: if completed, download & save immediately ─
                for (const exec of (status.executions || [])) {
                    if (exec.status !== 'completed' && exec.status !== 'failed') continue;

                    // Map agentId → document type (e.g. "agent-01-vision" → "vision")
                    const docType = exec.agentId.replace(/^agent-\d+-/, '');
                    if (!docType || savedTypes.has(docType)) continue;

                    if (exec.status === 'completed') {
                        // ─── Download THIS artifact from the cloud right now ───────
                        try {
                            const artRes = await this.api.getArtifact(cloudWorkflowId, docType);
                            if (artRes.success && artRes.artifact?.content) {
                                // Save to local disk immediately
                                const saved = this.localStorage.saveSingleCloudArtifact(
                                    localWorkflowId,
                                    { type: docType, title: artRes.artifact.title, content: artRes.artifact.content }
                                );
                                if (saved) {
                                    savedTypes.add(docType);
                                    console.log(`[Genesis] ✅ Saved ${docType} to local disk (${artRes.artifact.content.length} chars)`);
                                }
                            }
                        } catch (downloadErr: any) {
                            console.error(`[Genesis] Failed to download ${docType}:`, downloadErr.message);
                        }
                    } else if (exec.status === 'failed') {
                        // Mark as failed in local workflow
                        const wf = this.localStorage.getWorkflow(localWorkflowId);
                        if (wf) {
                            const doc = wf.documents.find(d => d.type === docType);
                            if (doc && doc.status !== 'completed') {
                                doc.status = 'failed';
                                doc.error = exec.error || 'Agent failed';
                            }
                        }
                        savedTypes.add(docType);
                    }
                }

                // Update the local workflow progress for the panel
                const updatedWf = this.localStorage.getWorkflow(localWorkflowId);
                if (updatedWf) {
                    const doneCount = updatedWf.documents.filter(d => d.status === 'completed').length;
                    updatedWf.currentStep = doneCount;
                    updatedWf.totalSteps = total;
                    updatedWf.description = `Cloud pipeline: ${doneCount}/${total} documents saved locally`;
                    this._localWorkflows.set(localWorkflowId, updatedWf);
                    this.events.fire('local-workflow-updated', { workflowId: localWorkflowId, workflow: updatedWf });
                }

                // ─── Check if pipeline is fully complete ─────────────────────
                if (status.isComplete || status.workflow?.status === 'completed') {
                    // Final sweep: download any artifacts we somehow missed
                    const finalWf = this.localStorage.getWorkflow(localWorkflowId);
                    const missed = finalWf?.documents.filter(d => d.status !== 'completed') || [];
                    if (missed.length > 0) {
                        onProgress?.(total, total, `Fetching ${missed.length} remaining documents...`);
                        try {
                            const allArtifacts = await this.api.listArtifacts(cloudWorkflowId);
                            if (allArtifacts.success && allArtifacts.artifacts) {
                                for (const art of allArtifacts.artifacts) {
                                    if (!savedTypes.has(art.type) && art.content) {
                                        this.localStorage.saveSingleCloudArtifact(
                                            localWorkflowId,
                                            { type: art.type, title: art.title, content: art.content }
                                        );
                                        savedTypes.add(art.type);
                                    }
                                }
                            }
                        } catch (e: any) {
                            console.error('[Genesis] Final artifact sweep failed:', e.message);
                        }
                    }

                    // Mark complete
                    const completedWf = this.localStorage.getWorkflow(localWorkflowId);
                    if (completedWf) {
                        const doneCount = completedWf.documents.filter(d => d.status === 'completed').length;
                        completedWf.status = 'completed';
                        completedWf.currentStep = completedWf.totalSteps;
                        completedWf.description = `All ${doneCount} documents generated by AI pipeline and saved locally.`;
                        // Clear cloud reference — we're fully local now
                        completedWf.cloudWorkflowId = undefined;
                        this._localWorkflows.set(localWorkflowId, completedWf);
                        this.events.fire('local-workflow-completed', { workflowId: localWorkflowId, workflow: completedWf });

                        onProgress?.(total, total, `✅ All ${doneCount} documents saved locally!`);

                        // ─── DELETE CLOUD WORKFLOW FROM CONVEX DB ─────────────
                        // All artifacts are saved locally. Clean up Convex storage.
                        try {
                            await this.api.deleteWorkflow(cloudWorkflowId);
                            console.log(`[Genesis] 🗑️ Deleted cloud workflow ${cloudWorkflowId} from Convex — data is local only.`);
                        } catch (deleteErr: any) {
                            console.warn(`[Genesis] Failed to delete cloud workflow from Convex: ${deleteErr.message}`);
                            // Non-fatal: local files are safe, just cloud data lingers
                        }

                        const notifyFolder = completedWf.outputFolder;
                        vscode.window.showInformationMessage(
                            `✅ ${doneCount} AI-generated documents saved locally: ${notifyFolder}`,
                            'Open Folder'
                        ).then(choice => {
                            if (choice === 'Open Folder') {
                                vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(notifyFolder));
                            }
                        });
                    }

                    return; // Done polling

                } else if (status.workflow?.status === 'failed') {
                    this.localStorage.updateCloudPollStatus(localWorkflowId, 'failed');
                    const failWf = this.localStorage.getWorkflow(localWorkflowId);
                    if (failWf) {
                        failWf.cloudWorkflowId = undefined;
                        this._localWorkflows.set(localWorkflowId, failWf);
                        this.events.fire('local-workflow-updated', { workflowId: localWorkflowId, workflow: failWf });
                    }
                    // Clean up Convex on failure too
                    try {
                        await this.api.deleteWorkflow(cloudWorkflowId);
                        console.log(`[Genesis] 🗑️ Deleted failed cloud workflow ${cloudWorkflowId} from Convex.`);
                    } catch (deleteErr: any) {
                        console.warn(`[Genesis] Failed to delete cloud workflow: ${deleteErr.message}`);
                    }
                    vscode.window.showErrorMessage('Cloud pipeline failed. Documents that were saved locally are still available.');
                    return;
                }

                // Check timeout
                if ((Date.now() - startTime) >= MAX_POLL_TIME) {
                    this.localStorage.updateCloudPollStatus(localWorkflowId, 'failed');
                    vscode.window.showErrorMessage('Cloud pipeline timed out after 10 minutes.');
                    return;
                }

                // Schedule next poll
                setTimeout(poll, POLL_INTERVAL);

            } catch (e: any) {
                console.error('Poll error:', e.message);
                // Don't fail on a single poll error — retry
                if ((Date.now() - startTime) < MAX_POLL_TIME) {
                    setTimeout(poll, POLL_INTERVAL);
                } else {
                    this.localStorage.updateCloudPollStatus(localWorkflowId, 'failed');
                    vscode.window.showErrorMessage(`Pipeline error: ${e.message}`);
                }
            }
        };

        // Start polling after first interval
        setTimeout(poll, 2000); // First poll after 2s for quicker feedback
    }

    /**
     * Create a local workflow that generates and stores documents on the local filesystem.
     */
    async createLocalWorkflow(
        workflowName: string,
        productName: string,
        transcript: string,
        outputFolder: string,
        autoStart: boolean = true
    ): Promise<{ workflowId: string } | null> {
        try {
            const localWf = await this.localStorage.createLocalWorkflow(
                workflowName, productName, transcript, outputFolder
            );

            this._localWorkflows.set(localWf.id, localWf);

            if (autoStart) {
                this.startLocalGeneration(localWf.id);
            }

            return { workflowId: localWf.id };
        } catch (e: any) {
            vscode.window.showErrorMessage(`Failed to create local workflow: ${e.message}`);
            return null;
        }
    }

    /**
     * Start generating documents for a local workflow.
     */
    startLocalGeneration(workflowId: string): void {
        this._currentLocalWorkflowId = workflowId;

        this.localStorage.startGeneration(
            workflowId,
            // onProgress
            (wf) => {
                this.events.fire('local-workflow-updated', { workflowId: wf.id, workflow: wf });
            },
            // onComplete
            (wf) => {
                this.events.fire('local-workflow-completed', { workflowId: wf.id, workflow: wf });
                const folderPath = wf.outputFolder;
                vscode.window.showInformationMessage(
                    `✅ All ${wf.totalSteps} documents generated! Saved to: ${folderPath}`,
                    'Open Folder'
                ).then(choice => {
                    if (choice === 'Open Folder') {
                        vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(folderPath));
                    }
                });
            }
        );
    }

    /**
     * Get a local workflow by ID.
     */
    getLocalWorkflow(workflowId: string): LocalWorkflow | undefined {
        return this._localWorkflows.get(workflowId) || this.localStorage.getWorkflow(workflowId);
    }

    /**
     * Get all local workflows list.
     */
    getLocalWorkflowsList(): LocalWorkflow[] {
        return Array.from(this._localWorkflows.values());
    }

    /**
     * Check if a workflow ID is a local workflow.
     */
    isLocalWorkflow(workflowId: string): boolean {
        return workflowId.startsWith('local_');
    }

    /**
     * Get the content of a local document.
     */
    getLocalDocumentContent(workflowId: string, docType: string): string | null {
        // First try to get markdown content
        const content = this.localStorage.readDocumentFile(workflowId, docType, 'markdown');
        return content;
    }

    /**
     * Read a local document file in any format.
     */
    readLocalDocumentFile(workflowId: string, docType: string, format: 'markdown' | 'json' | 'html'): string | null {
        return this.localStorage.readDocumentFile(workflowId, docType, format);
    }

    /**
     * Delete a local workflow.
     */
    async deleteLocalWorkflow(workflowId: string): Promise<boolean> {
        const result = await this.localStorage.deleteWorkflow(workflowId);
        if (result) {
            this._localWorkflows.delete(workflowId);
            if (this._currentLocalWorkflowId === workflowId) {
                this._currentLocalWorkflowId = null;
            }
        }
        return result;
    }

    /**
     * Open a local document file in VS Code editor.
     */
    async openLocalDocument(workflowId: string, docType: string, format: 'markdown' | 'json' | 'html' = 'markdown'): Promise<void> {
        const wf = this.getLocalWorkflow(workflowId);
        if (!wf) { return; }

        const doc = wf.documents.find(d => d.type === docType);
        if (!doc?.filePaths) { return; }

        const filePath = doc.filePaths[format];
        if (!filePath) { return; }

        try {
            const doc2 = await vscode.workspace.openTextDocument(vscode.Uri.file(filePath));
            await vscode.window.showTextDocument(doc2, vscode.ViewColumn.Beside);
        } catch (e: any) {
            vscode.window.showErrorMessage(`Failed to open document: ${e.message}`);
        }
    }

    /**
     * Open the workflow output folder in the file explorer.
     */
    openLocalWorkflowFolder(workflowId: string): void {
        const wf = this.getLocalWorkflow(workflowId);
        if (!wf) { return; }
        vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(wf.outputFolder));
    }

    dispose() {
        this.stopPolling();
        this.events.dispose();
        this.localStorage.dispose();
    }
}

/**
 * Compute CRC32 checksum (used by ZIP format).
 * Uses a pre-computed lookup table for performance.
 */
function crc32(buf: Buffer): number {
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < buf.length; i++) {
        crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ buf[i]) & 0xFF];
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
}

const CRC_TABLE = (() => {
    const table: number[] = [];
    for (let i = 0; i < 256; i++) {
        let c = i;
        for (let j = 0; j < 8; j++) {
            c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        }
        table.push(c >>> 0);
    }
    return table;
})();
