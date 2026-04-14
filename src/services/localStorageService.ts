import * as fs from 'fs';
import * as path from 'path';
import { LocalDocumentGenerator, LocalDocument } from './localDocumentGenerator';
import { DOCUMENT_TYPES } from '../api/genesisApi';

export interface LocalWorkflow {
    id: string;
    workflowName: string;
    productName: string;
    description: string;
    transcript: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    currentStep: number;
    totalSteps: number;
    createdAt: number;
    updatedAt: number;
    outputFolder: string;
    documents: LocalDocumentStatus[];
    /** ID of the cloud workflow that generated these artifacts (if sourced from cloud pipeline) */
    cloudWorkflowId?: string;
}

export interface LocalDocumentStatus {
    type: string;
    title: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    startedAt?: number;
    completedAt?: number;
    duration?: number;
    error?: string;
    filePaths?: {
        markdown?: string;
        json?: string;
        html?: string;
        pdf?: string;
    };
}

export class LocalStorageService {
    private _workflows: Map<string, LocalWorkflow> = new Map();
    private _storageRoot: string;
    private _generationTimers: Map<string, NodeJS.Timeout> = new Map();

    constructor() {
        // Store metadata in extension globalStorage - will be set per workflow
        this._storageRoot = '';
    }

    /**
     * Create a new local workflow with folder structure.
     */
    async createLocalWorkflow(
        workflowName: string,
        productName: string,
        transcript: string,
        outputFolder: string
    ): Promise<LocalWorkflow> {
        const id = `local_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        const safeName = workflowName.replace(/[^a-zA-Z0-9_\-. ]/g, '_');
        const workflowFolder = path.join(outputFolder, safeName);

        // Create folder structure
        const folders = [
            workflowFolder,
            path.join(workflowFolder, 'markdown'),
            path.join(workflowFolder, 'json'),
            path.join(workflowFolder, 'html'),
            path.join(workflowFolder, 'pdf'),
        ];

        for (const folder of folders) {
            fs.mkdirSync(folder, { recursive: true });
        }

        const workflow: LocalWorkflow = {
            id,
            workflowName,
            productName,
            description: '',
            transcript,
            status: 'pending',
            currentStep: 0,
            totalSteps: DOCUMENT_TYPES.length,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            outputFolder: workflowFolder,
            documents: DOCUMENT_TYPES.map(doc => ({
                type: doc.type,
                title: doc.title,
                status: 'pending',
            })),
        };

        // Save workflow metadata
        this._workflows.set(id, workflow);
        await this._saveWorkflowMetadata(workflow);

        return workflow;
    }

    /**
     * Start generating documents one by one.
     * Calls onProgress callback as each document completes.
     */
    startGeneration(
        workflowId: string,
        onProgress: (workflow: LocalWorkflow) => void,
        onComplete: (workflow: LocalWorkflow) => void
    ): void {
        const workflow = this._workflows.get(workflowId);
        if (!workflow) { return; }

        workflow.status = 'running';
        workflow.updatedAt = Date.now();

        let currentIndex = 0;
        const documents = workflow.documents;

        const generateNext = () => {
            if (currentIndex >= documents.length) {
                // All done
                workflow.status = 'completed';
                workflow.updatedAt = Date.now();
                this._saveWorkflowMetadata(workflow);
                onComplete(workflow);
                return;
            }

            const docStatus = documents[currentIndex];
            const docInfo = DOCUMENT_TYPES.find(d => d.type === docStatus.type);

            // Mark as running
            docStatus.status = 'running';
            docStatus.startedAt = Date.now();
            workflow.currentStep = currentIndex + 1;
            workflow.updatedAt = Date.now();
            onProgress(workflow);

            // Simulate generation time (1-3 seconds per document)
            const delay = 1000 + Math.random() * 2000;
            const timer = setTimeout(async () => {
                try {
                    // Generate document content
                    const doc = LocalDocumentGenerator.generate(
                        docStatus.type,
                        workflow.transcript,
                        workflow.workflowName,
                        workflow.productName
                    );

                    // Save files to local folders
                    const filePaths = await this._saveDocumentFiles(workflow, docStatus, doc);
                    docStatus.filePaths = filePaths;

                    // Mark as completed
                    docStatus.status = 'completed';
                    docStatus.completedAt = Date.now();
                    docStatus.duration = docStatus.completedAt - docStatus.startedAt!;

                    workflow.updatedAt = Date.now();
                    await this._saveWorkflowMetadata(workflow);
                    onProgress(workflow);

                } catch (err: any) {
                    docStatus.status = 'failed';
                    docStatus.error = err.message;
                    workflow.updatedAt = Date.now();
                    onProgress(workflow);
                }

                currentIndex++;
                generateNext();
            }, delay);

            this._generationTimers.set(workflowId + '_' + currentIndex, timer);
        };

        generateNext();
    }

    /**
     * Stop any running generation.
     */
    stopGeneration(workflowId: string): void {
        // Clear all timers for this workflow
        for (const [key, timer] of this._generationTimers.entries()) {
            if (key.startsWith(workflowId)) {
                clearTimeout(timer);
                this._generationTimers.delete(key);
            }
        }
        const workflow = this._workflows.get(workflowId);
        if (workflow) {
            workflow.status = 'completed';
            workflow.updatedAt = Date.now();
            this._saveWorkflowMetadata(workflow);
        }
    }

    /**
     * Get workflow by ID.
     */
    getWorkflow(workflowId: string): LocalWorkflow | undefined {
        return this._workflows.get(workflowId);
    }

    /**
     * Load a workflow from disk.
     */
    async loadWorkflow(workflowId: string): Promise<LocalWorkflow | undefined> {
        if (this._workflows.has(workflowId)) {
            return this._workflows.get(workflowId);
        }
        // Try to find workflow metadata file
        // Not needed for now as workflows are in-memory
        return undefined;
    }

    /**
     * Read a document file from disk.
     */
    readDocumentFile(workflowId: string, docType: string, format: 'markdown' | 'json' | 'html'): string | null {
        const workflow = this._workflows.get(workflowId);
        if (!workflow) { return null; }

        const doc = workflow.documents.find(d => d.type === docType);
        if (!doc?.filePaths) { return null; }

        const filePath = doc.filePaths[format];
        if (!filePath) { return null; }

        try {
            return fs.readFileSync(filePath, 'utf-8');
        } catch {
            return null;
        }
    }

    /**
     * Get all local workflows.
     */
    getAllWorkflows(): LocalWorkflow[] {
        return Array.from(this._workflows.values());
    }

    /**
     * Delete a local workflow.
     */
    async deleteWorkflow(workflowId: string): Promise<boolean> {
        const workflow = this._workflows.get(workflowId);
        if (!workflow) { return false; }

        this.stopGeneration(workflowId);

        try {
            // Remove the entire workflow folder
            if (workflow.outputFolder && fs.existsSync(workflow.outputFolder)) {
                fs.rmSync(workflow.outputFolder, { recursive: true, force: true });
            }
        } catch (err: any) {
            console.error('Failed to delete workflow folder:', err.message);
        }

        this._workflows.delete(workflowId);
        return true;
    }

    // ─── PRIVATE HELPERS ──────────────────────────────────────────────

    private async _saveDocumentFiles(
        workflow: LocalWorkflow,
        docStatus: LocalDocumentStatus,
        doc: LocalDocument
    ): Promise<LocalDocumentStatus['filePaths']> {
        const safeTitle = docStatus.title.replace(/[^a-zA-Z0-9_\-.]/g, '_');
        const folder = workflow.outputFolder;

        const paths: LocalDocumentStatus['filePaths'] = {};

        // Save markdown file
        const mdPath = path.join(folder, 'markdown', `${safeTitle}.md`);
        fs.writeFileSync(mdPath, doc.content, 'utf-8');
        paths.markdown = mdPath;

        // Save JSON file
        const jsonPath = path.join(folder, 'json', `${safeTitle}.json`);
        fs.writeFileSync(jsonPath, JSON.stringify(doc.json, null, 2), 'utf-8');
        paths.json = jsonPath;

        // Save HTML file
        const htmlPath = path.join(folder, 'html', `${safeTitle}.html`);
        fs.writeFileSync(htmlPath, doc.html, 'utf-8');
        paths.html = htmlPath;

        // Save PDF-friendly HTML in pdf folder
        const pdfHtmlPath = path.join(folder, 'pdf', `${safeTitle}_print.html`);
        const pdfHtml = doc.html.replace('</head>', `
    <style>
        @media print {
            body { padding: 20px; }
            h1 { page-break-before: always; }
            h1:first-child { page-break-before: avoid; }
            pre { page-break-inside: avoid; }
            table { page-break-inside: avoid; }
        }
        @page { margin: 1.5cm; size: A4; }
    </style>
</head>`);
        fs.writeFileSync(pdfHtmlPath, pdfHtml, 'utf-8');
        paths.pdf = pdfHtmlPath;

        return paths;
    }

    private async _saveWorkflowMetadata(workflow: LocalWorkflow): Promise<void> {
        try {
            const metadataPath = path.join(workflow.outputFolder, 'workflow.json');
            fs.writeFileSync(metadataPath, JSON.stringify(workflow, null, 2), 'utf-8');
        } catch (err: any) {
            console.error('Failed to save workflow metadata:', err.message);
        }
    }

    // ─── CLOUD POLLING HELPERS ────────────────────────────────────────────

    /**
     * Create a pending local workflow that will be populated from cloud output later.
     * Returns immediately with status='running' so the detail panel can open.
     */
    async createPendingCloudWorkflow(
        workflowName: string,
        productName: string,
        outputFolder: string,
        cloudWorkflowId: string
    ): Promise<LocalWorkflow> {
        const id = `local_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        const safeName = workflowName.replace(/[^a-zA-Z0-9_\-. ]/g, '_');
        const workflowFolder = path.join(outputFolder, safeName);

        // Create folder structure upfront
        const folders = [
            workflowFolder,
            path.join(workflowFolder, 'markdown'),
            path.join(workflowFolder, 'json'),
            path.join(workflowFolder, 'html'),
            path.join(workflowFolder, 'pdf'),
        ];
        for (const folder of folders) {
            fs.mkdirSync(folder, { recursive: true });
        }

        const workflow: LocalWorkflow = {
            id,
            workflowName,
            productName,
            description: 'Waiting for cloud pipeline to complete...',
            transcript: '',
            status: 'running',
            currentStep: 0,
            totalSteps: DOCUMENT_TYPES.length,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            outputFolder: workflowFolder,
            documents: DOCUMENT_TYPES.map(doc => ({
                type: doc.type,
                title: doc.title,
                status: 'pending' as const,
            })),
            cloudWorkflowId,
        };

        this._workflows.set(id, workflow);
        await this._saveWorkflowMetadata(workflow);
        return workflow;
    }

    /**
     * Update the local workflow progress during cloud polling.
     * Marks documents as running/completed based on pipeline progress.
     */
    updateCloudPollProgress(
        localWorkflowId: string,
        currentStep: number,
        totalSteps: number,
        currentAgentName: string
    ): void {
        const workflow = this._workflows.get(localWorkflowId);
        if (!workflow) return;

        workflow.currentStep = currentStep;
        workflow.totalSteps = totalSteps;
        workflow.updatedAt = Date.now();

        // Mark documents as running/completed based on step
        for (let i = 0; i < workflow.documents.length; i++) {
            const doc = workflow.documents[i];
            if (i < currentStep - 1) {
                // Already completed by a previous agent
                if (doc.status !== 'completed') {
                    doc.status = 'completed';
                    doc.startedAt = doc.startedAt || Date.now();
                    doc.completedAt = Date.now();
                    doc.duration = doc.completedAt - doc.startedAt;
                }
            } else if (i === currentStep - 1) {
                // Currently running
                doc.status = 'running';
                doc.startedAt = doc.startedAt || Date.now();
            } else {
                // Still pending
                if (doc.status !== 'failed') {
                    doc.status = 'pending';
                }
            }
        }

        workflow.description = `Cloud pipeline running: Agent ${currentStep}/${totalSteps} — ${currentAgentName}`;
    }

    /**
     * Update overall workflow status (e.g. 'failed').
     */
    updateCloudPollStatus(localWorkflowId: string, status: 'running' | 'completed' | 'failed'): void {
        const workflow = this._workflows.get(localWorkflowId);
        if (!workflow) return;
        workflow.status = status;
        workflow.updatedAt = Date.now();
        if (status === 'failed') {
            workflow.description = 'Cloud pipeline failed.';
        } else if (status === 'completed') {
            workflow.description = 'All documents generated by AI pipeline.';
        }
    }

    // ─── SAVE CLOUD ARTIFACTS TO LOCAL FOLDERS ─────────────────────────

    /**
     * Save cloud-generated artifacts to the local folder structure.
     * Creates markdown/, json/, html/ subfolders and writes each artifact.
     * Returns the updated LocalWorkflow with filePaths.
     */
    /**
     * Save a SINGLE cloud artifact to the local folder immediately.
     * Called as each agent completes — no need to wait for all 20.
     * Returns true if saved successfully.
     */
    saveSingleCloudArtifact(
        localWorkflowId: string,
        artifact: { type: string; title: string; content: string }
    ): boolean {
        const workflow = this._workflows.get(localWorkflowId);
        if (!workflow) return false;

        const docStatus = workflow.documents.find(d => d.type === artifact.type);
        if (!docStatus) return false;

        // Skip if already saved
        if (docStatus.status === 'completed' && docStatus.filePaths?.markdown) {
            return true;
        }

        const workflowFolder = workflow.outputFolder;
        const safeTitle = docStatus.title.replace(/[^a-zA-Z0-9_\-.]/g, '_');

        try {
            // Ensure subfolders exist
            for (const sub of ['markdown', 'json', 'html', 'pdf']) {
                fs.mkdirSync(path.join(workflowFolder, sub), { recursive: true });
            }

            const filePaths: LocalDocumentStatus['filePaths'] = {};

            // Markdown — exact cloud output
            const mdPath = path.join(workflowFolder, 'markdown', `${safeTitle}.md`);
            fs.writeFileSync(mdPath, artifact.content, 'utf-8');
            filePaths.markdown = mdPath;

            // JSON
            const jsonPath = path.join(workflowFolder, 'json', `${safeTitle}.json`);
            fs.writeFileSync(jsonPath, JSON.stringify({
                type: artifact.type,
                title: artifact.title,
                content: artifact.content,
                productName: workflow.productName,
                generatedAt: new Date().toISOString(),
                source: 'genesis-cloud-pipeline',
            }, null, 2), 'utf-8');
            filePaths.json = jsonPath;

            // HTML
            const htmlContent = this._markdownToHtml(artifact.content, docStatus.title);
            const htmlPath = path.join(workflowFolder, 'html', `${safeTitle}.html`);
            fs.writeFileSync(htmlPath, htmlContent, 'utf-8');
            filePaths.html = htmlPath;

            // PDF-friendly HTML
            const pdfHtmlPath = path.join(workflowFolder, 'pdf', `${safeTitle}_print.html`);
            fs.writeFileSync(pdfHtmlPath, htmlContent, 'utf-8');
            filePaths.pdf = pdfHtmlPath;

            docStatus.filePaths = filePaths;
            docStatus.status = 'completed';
            docStatus.completedAt = Date.now();
            docStatus.startedAt = docStatus.startedAt || Date.now();
            docStatus.duration = docStatus.completedAt - docStatus.startedAt;
            workflow.updatedAt = Date.now();

            // Update overall step count
            const doneCount = workflow.documents.filter(d => d.status === 'completed').length;
            workflow.currentStep = doneCount;
            if (doneCount === workflow.totalSteps) {
                workflow.status = 'completed';
                workflow.description = `All ${workflow.totalSteps} documents generated by AI pipeline.`;
            }

            this._saveWorkflowMetadata(workflow).catch(() => {});
            return true;
        } catch (err: any) {
            docStatus.status = 'failed';
            docStatus.error = err.message;
            return false;
        }
    }

    /**
     * Save ALL remaining cloud artifacts into an EXISTING pending local workflow.
     * Used as a final sweep after pipeline completes to catch anything missed.
     */
    async saveCloudArtifactsToLocal(
        localWorkflowId: string,
        artifacts: { type: string; title: string; content: string }[]
    ): Promise<LocalWorkflow | null> {
        const workflow = this._workflows.get(localWorkflowId);
        if (!workflow) {
            console.error('saveCloudArtifactsToLocal: workflow not found:', localWorkflowId);
            return null;
        }

        const workflowFolder = workflow.outputFolder;

        // Ensure subfolders exist
        for (const sub of ['markdown', 'json', 'html', 'pdf']) {
            fs.mkdirSync(path.join(workflowFolder, sub), { recursive: true });
        }

        // Update each document with cloud content and write files
        for (let i = 0; i < artifacts.length; i++) {
            const artifact = artifacts[i];
            // Find the matching document in the existing workflow
            const docStatus = workflow.documents.find(d => d.type === artifact.type);
            if (!docStatus) {
                continue; // Skip unknown artifact types
            }

            const safeTitle = docStatus.title.replace(/[^a-zA-Z0-9_\-.]/g, '_');

            docStatus.status = 'running';
            docStatus.startedAt = docStatus.startedAt || Date.now();
            workflow.currentStep = i + 1;

            try {
                const filePaths: LocalDocumentStatus['filePaths'] = {};

                // Markdown — write the EXACT cloud output
                const mdPath = path.join(workflowFolder, 'markdown', `${safeTitle}.md`);
                fs.writeFileSync(mdPath, artifact.content, 'utf-8');
                filePaths.markdown = mdPath;

                // JSON
                const jsonPath = path.join(workflowFolder, 'json', `${safeTitle}.json`);
                fs.writeFileSync(jsonPath, JSON.stringify({
                    type: artifact.type,
                    title: artifact.title,
                    content: artifact.content,
                    productName: workflow.productName,
                    generatedAt: new Date().toISOString(),
                    source: 'genesis-cloud-pipeline',
                }, null, 2), 'utf-8');
                filePaths.json = jsonPath;

                // HTML – render markdown as styled HTML
                const htmlContent = this._markdownToHtml(artifact.content, docStatus.title);
                const htmlPath = path.join(workflowFolder, 'html', `${safeTitle}.html`);
                fs.writeFileSync(htmlPath, htmlContent, 'utf-8');
                filePaths.html = htmlPath;

                // PDF-friendly HTML
                const pdfHtmlPath = path.join(workflowFolder, 'pdf', `${safeTitle}_print.html`);
                fs.writeFileSync(pdfHtmlPath, htmlContent, 'utf-8');
                filePaths.pdf = pdfHtmlPath;

                docStatus.filePaths = filePaths;
                docStatus.status = 'completed';
                docStatus.completedAt = Date.now();
                docStatus.duration = docStatus.completedAt - docStatus.startedAt!;
            } catch (err: any) {
                docStatus.status = 'failed';
                docStatus.error = err.message;
            }

            workflow.updatedAt = Date.now();
        }

        // Mark workflow complete
        const allDone = workflow.documents.every(d => d.status === 'completed');
        workflow.status = allDone ? 'completed' : 'failed';
        workflow.description = allDone
            ? `All ${workflow.documents.length} documents generated by AI pipeline.`
            : 'Some documents failed to generate.';
        workflow.currentStep = workflow.totalSteps;
        workflow.updatedAt = Date.now();
        await this._saveWorkflowMetadata(workflow);

        return workflow;
    }

    /**
     * Convert markdown content to a styled HTML document.
     */
    private _markdownToHtml(markdown: string, title: string): string {
        // Simple markdown → HTML conversion
        let html = markdown;
        // Headers
        html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
        html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
        html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
        // Bold & italic
        html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
        // Code blocks
        html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="$1">$2</code></pre>');
        html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
        // Lists
        html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
        html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
        // Paragraphs (lines not already wrapped in tags)
        html = html.replace(/^(?!<[hublop]|<li|<\/|<pre|<code)(.+)$/gm, '<p>$1</p>');
        // Tables
        html = html.replace(/\|(.+)\|/g, (match) => {
            const cells = match.split('|').filter(c => c.trim() && !c.match(/^[-:\s]+$/));
            if (cells.length === 0) return '';
            const tds = cells.map(c => `<td>${c.trim()}</td>`).join('');
            return `<tr>${tds}</tr>`;
        });
        html = html.replace(/(<tr>.*<\/tr>\s*)+/g, '<table border="1" cellpadding="8" cellspacing="0">$&</table>');
        // Horizontal rules
        html = html.replace(/^---$/gm, '<hr>');

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 900px; margin: 0 auto; padding: 40px 24px; color: #1a1a1a; line-height: 1.7; }
        h1 { color: #005a9e; border-bottom: 2px solid #005a9e; padding-bottom: 8px; margin-top: 32px; }
        h2 { color: #106ebe; margin-top: 28px; }
        h3 { color: #2b88d8; margin-top: 24px; }
        table { border-collapse: collapse; width: 100%; margin: 16px 0; }
        td, th { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
        tr:nth-child(even) { background: #f8f8f8; }
        code { background: #f0f0f0; padding: 2px 6px; border-radius: 3px; font-size: 0.9em; }
        pre { background: #1e1e1e; color: #d4d4d4; padding: 16px; border-radius: 6px; overflow-x: auto; }
        pre code { background: none; padding: 0; color: inherit; }
        blockquote { border-left: 4px solid #005a9e; margin: 16px 0; padding: 8px 20px; background: #f0f8ff; }
        hr { border: none; border-top: 1px solid #ddd; margin: 24px 0; }
        @media print { body { padding: 20px; } h1 { page-break-before: always; } h1:first-child { page-break-before: avoid; } pre { page-break-inside: avoid; } table { page-break-inside: avoid; } }
        @page { margin: 1.5cm; size: A4; }
    </style>
</head>
<body>
${html}
</body>
</html>`;
    }

    dispose(): void {
        // Clear all timers
        for (const timer of this._generationTimers.values()) {
            clearTimeout(timer);
        }
        this._generationTimers.clear();
    }
}
