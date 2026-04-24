import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { WorkflowService } from '../services/workflowService';
import { LocalWorkflow } from '../services/localStorageService';
import { DOCUMENT_TYPES } from '../api/genesisApi';

/* ─── PHASE DEFINITIONS ──────────────────────────────────────────────────── */
const PHASES = [
    {
        id: 'strategic', label: 'Phase 01', name: 'Strategic Foundation',
        icon: 'flag', types: ['vision', 'personas', 'roadmap', 'gtm'],
    },
    {
        id: 'planning', label: 'Phase 02', name: 'Architectural Planning',
        icon: 'account_tree', types: ['useCases', 'uiFlows', 'syntheticData', 'prd', 'brd', 'functionalRequirements', 'bom', 'implementationPlan'],
    },
    {
        id: 'technical', label: 'Phase 03', name: 'Technical Implementation',
        icon: 'dns', types: ['techArchitecture', 'databaseDesign', 'apiDesign', 'securitySpec', 'devops', 'testingStrategy'],
    },
    {
        id: 'design', label: 'Phase 04', name: 'Design & Delivery',
        icon: 'palette', types: ['mockup', 'styleGuide'],
    },
];

/* ─── PANEL ──────────────────────────────────────────────────────────────── */
export class WorkflowDetailPanel {
    public static currentPanel: WorkflowDetailPanel | undefined;
    private _panel: vscode.WebviewPanel;
    private _service: WorkflowService;
    private _workflowId: string;
    private _workflowName: string;
    private static _onBack: (() => void) | undefined;
    private static _onViewDocument: ((wfName: string, wfId: string, docType: string) => void) | undefined;
    private static _onOpenEditor: ((wfId: string, wfName: string) => void) | undefined;
    private static _onExport: ((wfId: string, wfName: string) => void) | undefined;
    private static _onNewProject: (() => void) | undefined;

    public static setOnBack(cb: () => void) { WorkflowDetailPanel._onBack = cb; }
    public static setOnViewDocument(cb: (wfName: string, wfId: string, docType: string) => void) { WorkflowDetailPanel._onViewDocument = cb; }
    public static setOnOpenEditor(cb: (wfId: string, wfName: string) => void) { WorkflowDetailPanel._onOpenEditor = cb; }
    public static setOnExport(cb: (wfId: string, wfName: string) => void) { WorkflowDetailPanel._onExport = cb; }
    public static setOnNewProject(cb: () => void) { WorkflowDetailPanel._onNewProject = cb; }

    private _isLocal: boolean = false;

    constructor(panel: vscode.WebviewPanel, service: WorkflowService, workflowId: string, name: string) {
        this._panel = panel;
        this._service = service;
        this._workflowId = workflowId;
        this._workflowName = name;
        this._isLocal = service.isLocalWorkflow(workflowId);
        panel.webview.html = this._getHtml();
        this._panel.onDidDispose(() => { WorkflowDetailPanel.currentPanel = undefined; this._service.stopPolling(); });
        this._panel.webview.onDidReceiveMessage(async message => {
            switch (message.command) {
                case 'back-to-workflows': this._confirmBack(); break;
                case 'view-document': this._handleViewDocument(message.doc, message.format); break;
                case 'open-editor': if (WorkflowDetailPanel._onOpenEditor) WorkflowDetailPanel._onOpenEditor(workflowId, this._workflowName); break;
                case 'export': this._handleExport(); break;
                case 'new-project': if (WorkflowDetailPanel._onNewProject) WorkflowDetailPanel._onNewProject(); break;
                case 'run-pipeline': this._handleRunPipeline(); break;
                case 'regenerate': this._handleRegenerate(message.doc); break;
                case 'reset-pipeline': this._handleResetPipeline(); break;
                case 'continue-workflow': this._handleContinueWorkflow(); break;
                case 'save-name':
                    if (message.name && message.name.trim()) {
                        this._workflowName = message.name.trim();
                        if (!this._isLocal) {
                            await this._service.getApi().updateWorkflowDetails(workflowId, this._workflowName, undefined);
                        }
                        vscode.window.showInformationMessage('Name updated');
                    }
                    break;
                case 'save-desc':
                    if (!this._isLocal) {
                        const newDesc = (message.desc || '').trim();
                        await this._service.getApi().updateWorkflowDetails(workflowId, undefined, newDesc);
                    }
                    vscode.window.showInformationMessage('Description updated');
                    break;
                case 'open-folder':
                    this._service.openLocalWorkflowFolder(workflowId);
                    break;
            }
        });

        if (this._isLocal) {
            // Subscribe to local workflow events
            const eventSub = service.onEvent(({ type }) => {
                if (type === 'local-workflow-updated' || type === 'local-workflow-completed') {
                    this._update();
                }
            });
            this._panel.onDidDispose(() => { eventSub.dispose(); });
        } else {
            this._service.startPolling(workflowId);
            this._service.fetchArtifacts(workflowId);
            const eventSub = service.onEvent(({ type }) => {
                if (type === 'pipeline-status-updated' || type === 'artifacts-updated' || type === 'workflows-updated') {
                    this._update();
                }
            });
            this._panel.onDidDispose(() => { eventSub.dispose(); });
        }
    }

    private _handleViewDocument(docType: string, format?: string) {
        if (this._isLocal) {
            // For local workflows, open the file in VS Code
            const fmt = (format as 'markdown' | 'json' | 'html') || 'markdown';
            this._service.openLocalDocument(this._workflowId, docType, fmt);
        } else {
            if (WorkflowDetailPanel._onViewDocument) {
                WorkflowDetailPanel._onViewDocument(this._workflowName, this._workflowId, docType);
            }
        }
    }

    private _handleExport() {
        if (this._isLocal) {
            this._service.openLocalWorkflowFolder(this._workflowId);
            vscode.window.showInformationMessage('Documents are already saved locally in the output folder!');
        } else {
            if (WorkflowDetailPanel._onExport) WorkflowDetailPanel._onExport(this._workflowId, this._workflowName);
        }
    }

    private _handleRunPipeline() {
        if (this._isLocal) {
            vscode.window.showInformationMessage('This workflow\'s documents were generated by the AI pipeline and saved locally. Create a new workflow to regenerate.');
        } else {
            this._service.startPipeline(this._workflowId);
        }
    }

    private _handleRegenerate(docType: string) {
        if (this._isLocal) {
            vscode.window.showInformationMessage('Documents were generated by the AI pipeline and saved locally. Create a new workflow to regenerate.');
        } else {
            this._service.regenerateDocument(this._workflowId, docType);
        }
    }

    private _handleResetPipeline() {
        if (this._isLocal) {
            vscode.window.showInformationMessage('Documents were generated by the AI pipeline and saved locally. Create a new workflow to regenerate.');
        } else {
            this._service.getApi().resetPipeline(this._workflowId).then(() => this._service.startPolling(this._workflowId));
        }
    }

    private _handleContinueWorkflow() {
        vscode.window.showInputBox({ prompt: 'Describe the changes you want to make:', placeHolder: 'e.g. Add authentication section, update the pricing model...' }).then(summary => {
            if (summary) {
                if (this._isLocal) {
                    vscode.window.showInformationMessage('Documents were saved locally. Create a new workflow with updated requirements to regenerate.');
                } else {
                    this._service.continueWorkflow(this._workflowId, summary);
                }
            }
        });
    }

    public static open(extensionUri: vscode.Uri, service: WorkflowService, workflowId: string, name: string) {
        if (WorkflowDetailPanel.currentPanel) { WorkflowDetailPanel.currentPanel._panel.dispose(); }
        const panel = vscode.window.createWebviewPanel('genesis-workflow-detail', name, vscode.ViewColumn.One, {
            enableScripts: true, retainContextWhenHidden: true, localResourceRoots: [extensionUri]
        });
        WorkflowDetailPanel.currentPanel = new WorkflowDetailPanel(panel, service, workflowId, name);
    }

    public static close() {
        if (WorkflowDetailPanel.currentPanel) WorkflowDetailPanel.currentPanel._panel.dispose();
    }

    private _confirmBack() {
        vscode.window.showWarningMessage('Go back to Workflows list?', { modal: true }, 'Yes', 'No').then(s => {
            if (s === 'Yes') { this._panel.dispose(); if (WorkflowDetailPanel._onBack) WorkflowDetailPanel._onBack(); }
        });
    }

    private _update() { this._panel.webview.html = this._getHtml(); }

    private _getHtml(): string {
        // Check if local workflow
        if (this._isLocal) {
            return this._getLocalHtml();
        }
        return this._getCloudHtml();
    }

    private _getLocalHtml(): string {
        const localWf = this._service.getLocalWorkflow(this._workflowId);
        if (!localWf) {
            return '<html><body style="background:#131313;color:#e5e2e1;display:flex;align-items:center;justify-content:center;height:100vh;font-family:Inter,sans-serif"><p>Workflow not found</p></body></html>';
        }

        const pct = localWf.totalSteps > 0 ? Math.round((localWf.currentStep / localWf.totalSteps) * 100) : 0;
        const wfStatus = localWf.status;
        const wfName = localWf.productName || localWf.workflowName;
        const wfDescription = localWf.description || '';
        const documents = localWf.documents;
        const completedCount = documents.filter(d => d.status === 'completed').length;
        const runningCount = documents.filter(d => d.status === 'running').length;
        const failedCount = documents.filter(d => d.status === 'failed').length;
        const totalDocs = localWf.totalSteps;
        const progressMsg = wfStatus === 'completed' ? 'All documents generated!' : wfStatus === 'running' ? 'Generating documents...' : 'Ready to generate';
        const currentRunning = documents.find(d => d.status === 'running');
        const currentAgentDisplay = currentRunning ? currentRunning.title : '';

        const badgeClass = wfStatus === 'running' ? 'running' : wfStatus === 'completed' ? 'completed' : wfStatus === 'failed' ? 'failed' : 'pending';
        const badgeText = wfStatus === 'running' ? 'Running' : wfStatus === 'completed' ? 'Completed' : wfStatus === 'failed' ? 'Failed' : 'Pending';

        // Build phase cards
        const phaseCardsHtml = PHASES.map(phase => {
            const phaseDocs = phase.types.map(type => DOCUMENT_TYPES.find(d => d.type === type)!).filter(Boolean);
            const phaseExecs = phaseDocs.map(doc => {
                const docStatus = documents.find(d => d.type === doc.type);
                return { doc, done: docStatus?.status === 'completed', active: docStatus?.status === 'running', failed: docStatus?.status === 'failed' };
            });
            const doneCount = phaseExecs.filter(p => p.done).length;
            const activeCount = phaseExecs.filter(p => p.active).length;
            const total = phaseExecs.length;
            const phasePct = total > 0 ? Math.round((doneCount / total) * 100) : 0;

            let phaseState: string, phaseIconState: string, phaseProgressClass: string, phaseFillClass: string;
            if (doneCount === total && total > 0) {
                phaseState = 'done'; phaseIconState = 'pi-done'; phaseProgressClass = 'ppr-done'; phaseFillClass = 'pf-done';
            } else if (activeCount > 0) {
                phaseState = 'active'; phaseIconState = 'pi-active'; phaseProgressClass = 'ppr-active'; phaseFillClass = 'pf-active';
            } else if (phasePct > 0) {
                phaseState = 'done'; phaseIconState = 'pi-done'; phaseProgressClass = 'ppr-done'; phaseFillClass = 'pf-done';
            } else {
                phaseState = 'pending'; phaseIconState = ''; phaseProgressClass = 'ppr-pending'; phaseFillClass = 'pf-pending';
            }

            const subItemsHtml = phaseDocs.map(doc => {
                const item = phaseExecs.find(p => p.doc.type === doc.type);
                if (!item) return '';
                const siClass = item.done ? 'si-done' : item.active ? 'si-active' : item.failed ? 'si-failed' : 'si-pending';
                return `
                <div class="sub-item ${siClass}" onclick="event.stopPropagation();${item.done ? `handleAction('view-document','${doc.type}')` : ''}" title="${doc.title}" style="cursor:${item.done ? 'pointer' : 'help'}">
                    <span class="material-symbols-outlined">${doc.icon}</span>
                    <span>${doc.title.split(' ').pop()}</span>
                </div>`;
            }).join('');

            return `
            <div class="phase-card" title="${phase.name} — ${doneCount}/${total} complete">
                <div>
                    <div class="phase-top">
                        <div><div class="phase-label">${phase.label}</div><div class="phase-name">${phase.name}</div></div>
                        <span class="material-symbols-outlined phase-icon ${phaseIconState}" style="font-variation-settings:'FILL' ${phaseState === 'done' ? '1' : '0'}">
                            ${phaseState === 'done' ? 'check_circle' : phaseState === 'active' ? 'sync' : phaseState === 'failed' ? 'error' : 'hourglass_empty'}
                        </span>
                    </div>
                    <div class="sub-grid">${subItemsHtml}</div>
                </div>
                <div class="phase-bottom">
                    <div class="phase-progress-row ${phaseProgressClass}">
                        <span>Status: ${phaseState === 'done' ? 'Complete' : phaseState === 'active' ? 'Orchestrating...' : phaseState === 'failed' ? 'Has Failures' : 'Queued'}</span>
                        <span>${phasePct}%</span>
                    </div>
                    <div class="phase-bar"><div class="phase-fill ${phaseFillClass}" style="width:${phasePct}%"></div></div>
                </div>
            </div>`;
        }).join('');

        // Build document cards
        const docCardsHtml = DOCUMENT_TYPES.map(doc => {
            const docStatus = documents.find(d => d.type === doc.type);
            let docSt: string, statusClass: string, statusText: string, descText: string;

            if (docStatus?.status === 'completed') {
                docSt = 'done'; statusClass = 'dc-done'; statusText = 'Done';
                descText = docStatus.duration ? formatDuration(docStatus.duration) : 'Generated';
            } else if (docStatus?.status === 'running') {
                docSt = 'active'; statusClass = 'dc-active'; statusText = 'Running';
                descText = 'Generating...';
            } else if (docStatus?.status === 'failed') {
                docSt = 'failed'; statusClass = 'dc-failed'; statusText = 'Failed';
                descText = docStatus?.error ? docStatus.error.substring(0, 40) : 'Error occurred';
            } else {
                docSt = 'pending'; statusClass = 'dc-pending'; statusText = 'Pending';
                descText = 'Queued';
            }

            const clickable = docStatus?.status === 'completed' ? `onclick="handleAction('view-document','${doc.type}')"` : '';

            // File type indicators for completed docs
            const fileIndicators = docStatus?.status === 'completed' ? `
                <div class="dc-files">
                    <span class="dc-file-tag" onclick="event.stopPropagation();openFile('${doc.type}','markdown')">.md</span>
                    <span class="dc-file-tag" onclick="event.stopPropagation();openFile('${doc.type}','json')">.json</span>
                    <span class="dc-file-tag" onclick="event.stopPropagation();openFile('${doc.type}','html')">.html</span>
                    <span class="dc-file-tag" onclick="event.stopPropagation();openFile('${doc.type}','pdf')">.pdf</span>
                </div>` : '';

            return `
            <div class="doc-card" ${clickable} style="cursor:${clickable ? 'pointer' : 'default'}">
                <div class="dc-icon ${statusClass}"><span class="material-symbols-outlined">${doc.icon}</span></div>
                <div class="dc-info">
                    <div class="dc-name">${doc.title}</div>
                    <div class="dc-desc">${descText}</div>
                    ${fileIndicators}
                </div>
                <span class="dc-status ds-${docSt === 'done' ? 'green' : docSt === 'active' ? 'blue' : docSt === 'failed' ? 'red' : 'gray'}">${statusText}</span>
            </div>`;
        }).join('');

        // Build the full HTML (reusing the same CSS from the cloud version)
        return this._getFullPageHtml({
            wfName, wfDescription, wfStatus, badgeClass, badgeText, pct,
            completedCount, runningCount, failedCount, totalDocs, progressMsg,
            currentAgentDisplay, phaseCardsHtml, docCardsHtml,
            isLocal: true, outputFolder: localWf.outputFolder,
            inputInfo: { icon: 'text_fields', label: 'Text', color: '#a855f7' },
        });
    }

    private _getCloudHtml(): string {
        const wf = this._service.getWorkflowById(this._workflowId);
        const status = wf?.pipelineStatus;
        const pct = status?.progress?.percentage || (wf ? Math.round((wf.currentStep / wf.totalSteps) * 100) : 0);
        const wfStatus = wf?.status || 'pending';
        const wfName = wf?.productName || wf?.workflowName || this._workflowName;
        const wfDescription = wf?.description || '';
        const wfInputType = wf?.inputType || 'voice';
        const executions = status?.executions || [];
        const progressMsg = status?.progress?.message || (wfStatus === 'completed' ? 'Pipeline completed!' : wfStatus === 'running' ? 'Pipeline running...' : 'Pipeline not started');
        const completedCount = executions.filter(e => e.status === 'completed').length;
        const runningCount = executions.filter(e => e.status === 'running').length;
        const failedCount = executions.filter(e => e.status === 'failed').length;
        const totalDocs = wf?.totalSteps || 20;

        const badgeClass = wfStatus === 'running' ? 'running' : wfStatus === 'completed' ? 'completed' : wfStatus === 'failed' ? 'failed' : 'pending';
        const badgeText = wfStatus === 'running' ? 'Running' : wfStatus === 'completed' ? 'Completed' : wfStatus === 'failed' ? 'Failed' : 'Pending';

        const inputIcons: Record<string, { icon: string; label: string; color: string }> = {
            voice: { icon: 'mic', label: 'Voice', color: '#61dac1' },
            document: { icon: 'description', label: 'Document', color: '#A3C9FF' },
            text: { icon: 'title', label: 'Text', color: '#a855f7' },
            mixed: { icon: 'layers', label: 'Mixed', color: '#fbbf24' },
        };
        const inputInfo = inputIcons[wfInputType] || inputIcons.voice;

        // ── Build phase cards ──
        const phaseCardsHtml = PHASES.map(phase => {
            const phaseDocs = phase.types.map(type => DOCUMENT_TYPES.find(d => d.type === type)!).filter(Boolean);
            const phaseExecs = phaseDocs.map(doc => {
                const exec = executions.find(e => e.agentId === doc.agentId);
                const artifact = wf?.artifactMap?.[doc.type];
                return { doc, exec, artifact, done: !!(exec?.status === 'completed' || artifact), active: exec?.status === 'running', failed: exec?.status === 'failed' };
            });
            const doneCount = phaseExecs.filter(p => p.done).length;
            const activeCount = phaseExecs.filter(p => p.active).length;
            const total = phaseExecs.length;
            const phasePct = total > 0 ? Math.round((doneCount / total) * 100) : 0;

            let phaseState: string, phaseIconState: string, phaseProgressClass: string, phaseFillClass: string;
            if (doneCount === total && total > 0) {
                phaseState = 'done'; phaseIconState = 'pi-done'; phaseProgressClass = 'ppr-done'; phaseFillClass = 'pf-done';
            } else if (activeCount > 0) {
                phaseState = 'active'; phaseIconState = 'pi-active'; phaseProgressClass = 'ppr-active'; phaseFillClass = 'pf-active';
            } else if (phasePct > 0) {
                phaseState = 'done'; phaseIconState = 'pi-done'; phaseProgressClass = 'ppr-done'; phaseFillClass = 'pf-done';
            } else {
                phaseState = 'pending'; phaseIconState = ''; phaseProgressClass = 'ppr-pending'; phaseFillClass = 'pf-pending';
            }

            const subItemsHtml = phaseDocs.map(doc => {
                const item = phaseExecs.find(p => p.doc.type === doc.type);
                if (!item) return '';
                const siClass = item.done ? 'si-done' : item.active ? 'si-active' : item.failed ? 'si-failed' : 'si-pending';
                return `
                <div class="sub-item ${siClass}" onclick="event.stopPropagation();${item.done ? `handleAction('view-document','${doc.type}')` : ''}" title="${doc.title}${item.exec?.duration ? ' — ' + formatDuration(item.exec.duration) : ''}" style="cursor:${item.done ? 'pointer' : 'help'}">
                    <span class="material-symbols-outlined">${doc.icon}</span>
                    <span>${doc.title.split(' ').pop()}</span>
                </div>`;
            }).join('');

            return `
            <div class="phase-card" title="${phase.name} — ${doneCount}/${total} complete">
                <div>
                    <div class="phase-top">
                        <div><div class="phase-label">${phase.label}</div><div class="phase-name">${phase.name}</div></div>
                        <span class="material-symbols-outlined phase-icon ${phaseIconState}" style="font-variation-settings:'FILL' ${phaseState === 'done' ? '1' : '0'}">
                            ${phaseState === 'done' ? 'check_circle' : phaseState === 'active' ? 'sync' : phaseState === 'failed' ? 'error' : 'hourglass_empty'}
                        </span>
                    </div>
                    <div class="sub-grid">${subItemsHtml}</div>
                </div>
                <div class="phase-bottom">
                    <div class="phase-progress-row ${phaseProgressClass}">
                        <span>Status: ${phaseState === 'done' ? 'Complete' : phaseState === 'active' ? 'Orchestrating...' : phaseState === 'failed' ? 'Has Failures' : 'Queued'}</span>
                        <span>${phasePct}%</span>
                    </div>
                    <div class="phase-bar"><div class="phase-fill ${phaseFillClass}" style="width:${phasePct}%"></div></div>
                </div>
            </div>`;
        }).join('');

        // ── Build 20 document cards ──
        const docCardsHtml = DOCUMENT_TYPES.map(doc => {
            const exec = executions.find(e => e.agentId === doc.agentId);
            const artifact = wf?.artifactMap?.[doc.type];
            let docStatus: string, statusClass: string, statusText: string, descText: string;

            if (exec?.status === 'completed' || artifact) {
                docStatus = 'done'; statusClass = 'dc-done'; statusText = 'Done';
                descText = exec?.duration ? formatDuration(exec.duration) : 'Generated';
            } else if (exec?.status === 'running') {
                docStatus = 'active'; statusClass = 'dc-active'; statusText = 'Running';
                descText = 'Generating...';
            } else if (exec?.status === 'failed') {
                docStatus = 'failed'; statusClass = 'dc-failed'; statusText = 'Failed';
                descText = exec?.error ? exec.error.substring(0, 40) : 'Error occurred';
            } else {
                docStatus = 'pending'; statusClass = 'dc-pending'; statusText = 'Pending';
                descText = 'Queued';
            }

            const clickable = (exec?.status === 'completed' || artifact) ? `onclick="handleAction('view-document','${doc.type}')"` : '';
            const regenBtn = (exec?.status === 'completed' || artifact) ? `<span class="material-symbols-outlined dc-regen" onclick="event.stopPropagation();handleAction('regenerate','${doc.type}')" title="Regenerate">refresh</span>` : '';
            const retryBtn = exec?.status === 'failed' ? `<span class="material-symbols-outlined dc-regen" onclick="event.stopPropagation();handleAction('regenerate','${doc.type}')" title="Retry">refresh</span>` : '';

            return `
            <div class="doc-card" ${clickable} style="cursor:${clickable ? 'pointer' : 'default'}">
                <div class="dc-icon ${statusClass}"><span class="material-symbols-outlined">${doc.icon}</span></div>
                <div class="dc-info">
                    <div class="dc-name">${doc.title}</div>
                    <div class="dc-desc">${descText}</div>
                </div>
                <span class="dc-status ds-${docStatus === 'done' ? 'green' : docStatus === 'active' ? 'blue' : docStatus === 'failed' ? 'red' : 'gray'}">${statusText}</span>
                ${regenBtn || retryBtn}
            </div>`;
        }).join('');

        const currentAgent = status?.progress?.currentAgent || '';
        const agentDisplay = currentAgent ? currentAgent.replace('agent-', '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '';

        return this._getFullPageHtml({
            wfName, wfDescription, wfStatus, badgeClass, badgeText, pct,
            completedCount, runningCount, failedCount, totalDocs, progressMsg,
            currentAgentDisplay: agentDisplay, phaseCardsHtml, docCardsHtml,
            isLocal: false, outputFolder: '', inputInfo,
        });
    }

    // ─── SHARED HTML TEMPLATE ────────────────────────────────────────────

    private _getFullPageHtml(params: {
        wfName: string; wfDescription: string; wfStatus: string;
        badgeClass: string; badgeText: string; pct: number;
        completedCount: number; runningCount: number; failedCount: number;
        totalDocs: number; progressMsg: string; currentAgentDisplay: string;
        phaseCardsHtml: string; docCardsHtml: string;
        isLocal: boolean; outputFolder: string;
        inputInfo: { icon: string; label: string; color: string };
    }): string {
        const { wfName, wfDescription, wfStatus, badgeClass, badgeText, pct,
            completedCount, runningCount, failedCount, totalDocs, progressMsg,
            currentAgentDisplay, phaseCardsHtml, docCardsHtml,
            isLocal, outputFolder, inputInfo } = params;

        return /*html*/ `
        <!DOCTYPE html>
        <html class="dark" lang="en">
        <head>
            <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${wfName}</title>
            <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&family=Fira+Code:wght@400;500&display=swap" rel="stylesheet">
            <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet">
            <style>
                *{margin:0;padding:0;box-sizing:border-box}
                .material-symbols-outlined{font-variation-settings:'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24}
                body{font-family:'Inter',sans-serif;background-color:#131313;color:#e5e2e1;margin:0;height:100vh;display:flex;flex-direction:column}
                ::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:#353535;border-radius:10px}::-webkit-scrollbar-thumb:hover{background:#404751}
                .page{flex:1;display:flex;flex-direction:column;gap:16px;padding:16px 20px;overflow-y:auto;min-height:0}

                /* ── HEADER ── */
                .header{display:flex;align-items:center;gap:14px;padding:16px 20px;background:#1B1B1C;border-radius:8px;border:1px solid rgba(64,71,82,.08);flex-shrink:0}
                .back-btn{display:flex;align-items:center;gap:6px;padding:6px 14px;background:#202020;border:1px solid rgba(64,71,82,.15);border-radius:6px;color:#C0C7D4;font-size:.6875rem;font-weight:600;cursor:pointer;transition:all .15s ease;font-family:'Inter',sans-serif}
                .back-btn:hover{background:#353535;color:#e5e2e1}
                .back-btn .material-symbols-outlined{font-size:16px}
                .header-info{flex:1;min-width:0}
                .header-name-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
                .editable-name{display:flex;align-items:center;gap:4px;cursor:pointer}
                .editable-name h1{font-family:'Space Grotesk',sans-serif;font-size:1rem;font-weight:700;color:#e5e2e1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:400px}
                .editable-name .edit-icon{font-size:13px;color:#555;opacity:0;transition:opacity .15s ease}
                .editable-name:hover .edit-icon{opacity:1}
                .input-type-badge{display:flex;align-items:center;gap:4px;padding:3px 10px;border-radius:9999px;background:${inputInfo.color}15;border:1px solid ${inputInfo.color}30}
                .input-type-badge .material-symbols-outlined{font-size:12px;color:${inputInfo.color}}
                .input-type-badge span{font-size:.5625rem;font-weight:700;color:${inputInfo.color};text-transform:uppercase;letter-spacing:.06em}
                .status-badge{display:flex;align-items:center;gap:6px;padding:6px 14px;border-radius:9999px}
                .status-badge.running{background:rgba(97,218,193,.08);border:1px solid rgba(97,218,193,.15)}
                .status-badge.completed{background:rgba(163,201,255,.08);border:1px solid rgba(163,201,255,.15)}
                .status-badge.failed{background:rgba(255,180,171,.08);border:1px solid rgba(255,180,171,.15)}
                .status-badge.pending{background:rgba(192,199,212,.06);border:1px solid rgba(192,199,212,.1)}
                .badge-dot{width:8px;height:8px;border-radius:50%}
                .badge-dot.running{background:#61dac1;animation:blink 2s infinite}
                .badge-dot.completed{background:#A3C9FF}
                .badge-dot.failed{background:#ffb4ab}
                .badge-dot.pending{background:#8a919e}
                @keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}
                .status-badge span{font-size:.625rem;font-weight:700;text-transform:uppercase;letter-spacing:.04em}
                .status-badge.running span{color:#61dac1}.status-badge.completed span{color:#A3C9FF}.status-badge.failed span{color:#ffb4ab}.status-badge.pending span{color:#8a919e}
                .continue-btn{display:flex;align-items:center;gap:5px;padding:6px 14px;background:#202020;color:#e5e2e1;border:1px solid rgba(64,71,82,.15);border-radius:6px;font-size:.6875rem;font-weight:600;cursor:pointer;transition:all .15s ease;font-family:'Inter',sans-serif}
                .continue-btn:hover{background:#353535;border-color:rgba(64,71,82,.3)}
                .continue-btn .material-symbols-outlined{font-size:14px}
                .header-desc{font-size:.6875rem;color:#8a919e;margin-top:4px;cursor:pointer;display:flex;align-items:center;gap:4px}
                .header-desc .edit-icon{font-size:12px;color:#555;opacity:0;transition:opacity .15s ease}
                .header-desc:hover .edit-icon{opacity:1}

                /* ── GLOBAL PROGRESS ── */
                .progress-section{display:flex;justify-content:space-between;align-items:flex-end;flex-shrink:0}
                .progress-left p{font-size:.6875rem;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#A3C9FF;margin-bottom:4px}
                .progress-left h2{font-family:'Space Grotesk',sans-serif;font-size:1.5rem;font-weight:700;color:#e5e2e1}
                .progress-right{text-align:right}
                .progress-pct{font-family:'Fira Code',monospace;font-size:1.75rem;font-weight:700;color:#A3C9FF}
                .progress-label{font-size:.625rem;color:#8a919e;text-transform:uppercase}
                .global-bar{height:6px;background:#202020;border-radius:9999px;overflow:hidden;flex-shrink:0}
                .global-fill{height:100%;background:linear-gradient(90deg,#A3C9FF,#0078D4);border-radius:9999px;transition:width 1s ease}
                ${wfStatus === 'running' ? '.global-fill{background:linear-gradient(90deg,#61dac1,#0078D4,#A3C9FF);background-size:200% 100%;animation:shimmer 2s linear infinite}@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}' : ''}

                /* ── PHASE GRID (2×2 bento) ── */
                .phase-grid{display:grid;grid-template-columns:1fr 1fr;gap:1px;background:rgba(64,71,82,.2);border-radius:8px;overflow:visible;border:1px solid rgba(64,71,82,.2)}
                .phase-card{background:#202020;padding:24px;display:flex;flex-direction:column;justify-content:space-between;min-height:260px;cursor:pointer;transition:background .15s ease}
                .phase-card:hover{background:#252525}
                .phase-top{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px}
                .phase-label{font-size:.625rem;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:#8a919e;margin-bottom:4px}
                .phase-name{font-size:.9375rem;font-weight:700;color:#e5e2e1}
                .phase-icon{font-size:22px;color:#8a919e}
                .phase-icon.pi-done{color:#61dac1}
                .phase-icon.pi-active{color:#A3C9FF;animation:pulse 2s infinite}
                .phase-icon.pi-failed{color:#ffb4ab}
                @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}

                /* ── SUB-ITEMS (agent icons in each phase) ── */
                .sub-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:24px}
                .sub-item{aspect-ratio:1;background:#2a2a2a;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:8px;border:1px solid transparent;border-radius:4px;transition:all .15s ease;cursor:help}
                .sub-item:hover{border-color:rgba(163,201,255,.4)}
                .sub-item .material-symbols-outlined{font-size:18px;color:#8a919e;margin-bottom:4px}
                .sub-item.si-done .material-symbols-outlined{color:#61dac1}
                .sub-item.si-active{border-color:rgba(163,201,255,.4);background:rgba(163,201,255,.05)}
                .sub-item.si-active .material-symbols-outlined{color:#A3C9FF}
                .sub-item.si-pending{opacity:.4}
                .sub-item.si-failed .material-symbols-outlined{color:#ffb4ab}
                .sub-item span{font-size:.5rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#8a919e}
                .sub-item.si-done span{color:#61dac1}
                .sub-item.si-active span{color:#A3C9FF}

                /* ── PHASE PROGRESS BAR ── */
                .phase-bottom{}
                .phase-progress-row{display:flex;justify-content:space-between;font-size:.625rem;font-weight:700;text-transform:uppercase;margin-bottom:6px}
                .phase-progress-row.ppr-done{color:#C0C7D4}
                .phase-progress-row.ppr-active .ppr-status{color:#A3C9FF}
                .phase-progress-row.ppr-pending{color:#8a919e}
                .phase-progress-row.ppr-active{color:#8a919e}
                .phase-bar{height:4px;background:#353535;border-radius:9999px;overflow:hidden}
                .phase-fill{height:100%;border-radius:9999px}
                .pf-done{background:#61dac1}
                .pf-active{background:linear-gradient(90deg,#A3C9FF,#0078D4)}
                .pf-pending{background:#353535}

                /* ── SUMMARY ROW ── */
                .summary-row{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;flex-shrink:0}
                .summary-card{background:#202020;padding:18px;border-left:2px solid #0078D4;border-radius:0 6px 6px 0}
                .summary-card .sc-label{font-size:.5625rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#8a919e;margin-bottom:6px}
                .summary-card .sc-value{font-family:'Space Grotesk',sans-serif;font-size:1.25rem;font-weight:700;color:#e5e2e1}
                .summary-card .sc-value.green{color:#61dac1}
                .summary-card .sc-value.blue{color:#A3C9FF}
                .summary-card .sc-value.red{color:#ffb4ab}
                .summary-card .sc-sub{font-size:.5625rem;color:#8a919e;margin-top:2px}

                /* ── DOCUMENTS SECTION ── */
                .docs-section{flex-shrink:0}
                .docs-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
                .docs-header h2{font-family:'Space Grotesk',sans-serif;font-size:.75rem;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:#e5e2e1}
                .docs-header .material-symbols-outlined{font-size:16px;color:#8a919e;cursor:pointer}
                .docs-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:8px}
                .doc-card{background:#1B1B1C;border:1px solid rgba(64,71,82,.08);border-radius:8px;padding:14px;display:flex;align-items:center;gap:12px;transition:all .15s ease}
                .doc-card:hover{background:#202020;border-color:rgba(64,71,82,.2);transform:translateY(-1px)}
                .doc-card .dc-icon{width:36px;height:36px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
                .doc-card .dc-icon .material-symbols-outlined{font-size:18px}
                .dc-done{background:rgba(97,218,193,.12);color:#61dac1}
                .dc-active{background:rgba(163,201,255,.12);color:#A3C9FF}
                .dc-pending{background:rgba(53,53,53,.5);color:#8a919e}
                .dc-failed{background:rgba(255,180,171,.08);color:#ffb4ab}
                .dc-info{flex:1;min-width:0}
                .dc-name{font-size:.6875rem;font-weight:600;color:#e5e2e1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
                .dc-desc{font-size:.5rem;color:#8a919e;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
                .dc-status{font-size:.5rem;font-weight:700;text-transform:uppercase;flex-shrink:0}
                .dc-regen{font-size:14px;color:#555;cursor:pointer;flex-shrink:0;transition:color .15s}
                .dc-regen:hover{color:#A3C9FF}
                .ds-green{color:#61dac1}.ds-blue{color:#A3C9FF}.ds-gray{color:#8a919e}.ds-red{color:#ffb4ab}

                /* ── ACTION BAR ── */
                .action-bar{display:flex;gap:10px;flex-shrink:0;padding-top:4px;flex-wrap:wrap}
                .act-btn{display:flex;align-items:center;gap:8px;padding:10px 20px;border-radius:6px;font-size:.75rem;font-weight:600;cursor:pointer;transition:all .15s ease;font-family:'Inter',sans-serif;border:none}
                .act-btn:hover{transform:translateY(-1px)}
                .act-btn:active{transform:scale(.97)}
                .act-btn .material-symbols-outlined{font-size:16px}
                .ab-primary{background:linear-gradient(180deg,#A3C9FF,#0078D4);color:#fff;box-shadow:0 4px 12px rgba(0,120,212,.3)}
                .ab-secondary{background:#202020;color:#C0C7D4;border:1px solid rgba(64,71,82,.15)}
                .ab-secondary:hover{background:#353535;color:#e5e2e1}
                .ab-danger{background:rgba(255,180,171,.08);color:#ffb4ab;border:1px solid rgba(255,180,171,.15)}
                .ab-danger:hover{background:rgba(255,180,171,.15)}
                .ab-new{background:rgba(163,201,255,.1);color:#A3C9FF;border:1px solid rgba(163,201,255,.2)}
                .ab-new:hover{background:rgba(163,201,255,.15)}
                .dc-files{display:flex;gap:3px;margin-top:3px}
                .dc-file-tag{display:inline-flex;align-items:center;padding:1px 6px;background:rgba(97,218,193,.08);border:1px solid rgba(97,218,193,.15);border-radius:3px;font-size:.5rem;font-weight:700;color:#61dac1;cursor:pointer;transition:all .15s ease;font-family:'Fira Code',monospace}
                .dc-file-tag:hover{background:rgba(97,218,193,.15);border-color:rgba(97,218,193,.3)}
                .local-folder-bar{display:flex;align-items:center;justify-content:space-between;padding:10px 16px;background:rgba(97,218,193,.06);border:1px solid rgba(97,218,193,.15);border-radius:6px;flex-shrink:0}
                .local-folder-info{display:flex;align-items:center;gap:8px;font-size:.6875rem;color:#61dac1;font-family:'Fira Code',monospace}
                .local-folder-info .material-symbols-outlined{font-size:16px}
                .local-folder-btn{display:flex;align-items:center;gap:4px;padding:4px 12px;background:rgba(97,218,193,.1);border:1px solid rgba(97,218,193,.2);border-radius:4px;color:#61dac1;font-size:.625rem;font-weight:700;cursor:pointer;transition:all .15s ease;text-transform:uppercase;letter-spacing:.04em;font-family:'Inter',sans-serif}
                .local-folder-btn:hover{background:rgba(97,218,193,.15)}
                .local-folder-btn .material-symbols-outlined{font-size:12px}
            </style>
        </head>
        <body>
            <div class="page">
                <!-- HEADER -->
                <div class="header">
                    <button class="back-btn" onclick="handleAction('back-to-workflows')">
                        <span class="material-symbols-outlined">arrow_back</span> Back
                    </button>
                    <div class="header-info">
                        <div class="header-name-row">
                            <div class="editable-name" onclick="editName()">
                                <h1 id="wf-name">${wfName}</h1>
                                <span class="material-symbols-outlined edit-icon">edit</span>
                            </div>
                            <div class="input-type-badge">
                                <span class="material-symbols-outlined">${inputInfo.icon}</span>
                                <span>${inputInfo.label}</span>
                            </div>
                            <div class="status-badge ${badgeClass}"><div class="badge-dot ${badgeClass}"></div><span>${badgeText}</span></div>
                            ${(wfStatus === 'completed' || wfStatus === 'failed') ? `<button class="continue-btn" onclick="handleAction('continue-workflow')"><span class="material-symbols-outlined">chat_add_on</span> Continue</button>` : ''}
                        </div>
                        <div class="header-desc" onclick="editDesc()">
                            <span id="wf-desc">${wfDescription || 'Click to add a description...'}</span>
                            <span class="material-symbols-outlined edit-icon">edit</span>
                        </div>
                    </div>
                </div>

                ${isLocal ? `
                <div class="local-folder-bar">
                    <div class="local-folder-info">
                        <span class="material-symbols-outlined">folder</span>
                        <span>${outputFolder}</span>
                    </div>
                    <button class="local-folder-btn" onclick="handleAction('open-folder')">
                        <span class="material-symbols-outlined">open_in_new</span> Open Folder
                    </button>
                </div>
                ` : ''}

                <!-- GLOBAL PROGRESS -->
                <div class="progress-section">
                    <div class="progress-left">
                        <p>${isLocal ? 'Genesis AI Local Generation' : 'Genesis AI Orchestration'}</p>
                        <h2>${wfStatus === 'running' ? (currentAgentDisplay ? `Active: ${currentAgentDisplay}` : progressMsg) : progressMsg}</h2>
                    </div>
                    <div class="progress-right">
                        <div class="progress-pct">${pct}%</div>
                        <div class="progress-label">${completedCount} / ${totalDocs} Documents</div>
                    </div>
                </div>
                <div class="global-bar"><div class="global-fill" style="width:${pct}%"></div></div>

                <!-- 4-PHASE BENTO GRID -->
                <div class="phase-grid">${phaseCardsHtml}</div>

                <!-- SUMMARY ROW -->
                <div class="summary-row">
                    <div class="summary-card">
                        <div class="sc-label">Completed</div>
                        <div class="sc-value green">${completedCount}</div>
                        <div class="sc-sub">of ${totalDocs} documents</div>
                    </div>
                    <div class="summary-card">
                        <div class="sc-label">In Progress</div>
                        <div class="sc-value blue">${runningCount}${failedCount > 0 ? `<span style="color:#ffb4ab"> +${failedCount} failed</span>` : ''}</div>
                        <div class="sc-sub">${runningCount > 0 ? 'agents active' : failedCount > 0 ? 'has failures' : 'no active agents'}</div>
                    </div>
                    <div class="summary-card">
                        <div class="sc-label">Pipeline Status</div>
                        <div class="sc-value ${wfStatus === 'completed' ? 'green' : wfStatus === 'failed' ? 'red' : wfStatus === 'running' ? 'blue' : ''}" style="${wfStatus === 'failed' ? 'color:#ffb4ab' : ''}">${wfStatus.charAt(0).toUpperCase() + wfStatus.slice(1)}</div>
                        <div class="sc-sub">${progressMsg}</div>
                    </div>
                </div>

                <!-- 20 DOCUMENT CARDS -->
                <div class="docs-section">
                    <div class="docs-header">
                        <h2>Generated Documents <span style="color:#8a919e;font-weight:400;font-size:.625rem;letter-spacing:0;text-transform:none">(${completedCount}/${totalDocs})</span></h2>
                        <span class="material-symbols-outlined" onclick="handleAction('export')" title="Export All">ios_share</span>
                    </div>
                    <div class="docs-grid">${docCardsHtml}</div>
                </div>

                <!-- ACTION BAR -->
                <div class="action-bar">
                    ${wfStatus === 'pending' ? `<button class="act-btn ab-primary" onclick="handleAction('run-pipeline')"><span class="material-symbols-outlined" style="font-variation-settings:'FILL' 1">play_arrow</span> Start Pipeline</button>` : ''}
                    ${wfStatus === 'completed' ? `<button class="act-btn ab-primary" onclick="handleAction('export')"><span class="material-symbols-outlined">${isLocal ? 'folder_open' : 'ios_share'}</span> ${isLocal ? 'Open Folder' : 'Export Documents'}</button>` : ''}
                    <button class="act-btn ab-secondary" onclick="handleAction('export')"><span class="material-symbols-outlined">${isLocal ? 'folder_open' : 'ios_share'}</span> ${isLocal ? 'Open Folder' : 'Export'}</button>
                    <button class="act-btn ab-secondary" onclick="handleAction('open-editor')"><span class="material-symbols-outlined">edit_note</span> Editor</button>
                    ${wfStatus === 'failed' ? `<button class="act-btn ab-danger" onclick="handleAction('reset-pipeline')"><span class="material-symbols-outlined">refresh</span> Retry Failed</button>` : ''}
                    <button class="act-btn ab-new" onclick="handleAction('new-project')" style="margin-left:auto"><span class="material-symbols-outlined">add</span> New Workflow</button>
                </div>
            </div>
            <script>
                const vscode=acquireVsCodeApi();
                function handleAction(c,d){vscode.postMessage(d?{command:c,doc:d}:{command:c})}
                function openFile(docType,format){
                    // For local workflows, this will open the file in VS Code
                    vscode.postMessage({command:'view-document',doc:docType,format:format});
                }

                function editName(){
                    var nameEl=document.getElementById('wf-name');
                    var current=nameEl.textContent;
                    var input=document.createElement('input');
                    input.type='text';input.value=current;
                    input.style.cssText='font-family:Space Grotesk,sans-serif;font-size:1rem;font-weight:700;color:#e5e2e1;background:#0E0E0E;border:1px solid rgba(163,201,255,.4);border-radius:6px;padding:4px 10px;outline:none;max-width:400px';
                    nameEl.replaceWith(input);input.focus();input.select();
                    function commit(){
                        var val=input.value.trim();
                        if(val&&val!==current)vscode.postMessage({command:'save-name',name:val});
                        var h1=document.createElement('h1');h1.id='wf-name';h1.textContent=val||current;
                        h1.style.cssText=nameEl.style.cssText;
                        input.replaceWith(h1);
                    }
                    input.addEventListener('blur',commit);
                    input.addEventListener('keydown',function(e){if(e.key==='Enter')commit();if(e.key==='Escape'){input.value=current;commit()}});
                }

                function editDesc(){
                    var descEl=document.getElementById('wf-desc');
                    var current=descEl.textContent;
                    if(current==='Click to add a description...')current='';
                    var input=document.createElement('input');
                    input.type='text';input.value=current;input.placeholder='Add a description...';
                    input.style.cssText='font-size:.6875rem;color:#C0C7D4;background:#0E0E0E;border:1px solid rgba(163,201,255,.4);border-radius:6px;padding:4px 10px;outline:none;flex:1;min-width:200px';
                    descEl.replaceWith(input);input.focus();input.select();
                    function commit(){
                        var val=input.value.trim();
                        if(val!==current)vscode.postMessage({command:'save-desc',desc:val});
                        var span=document.createElement('span');span.id='wf-desc';span.textContent=val||'Click to add a description...';
                        span.style.cssText=val?'color:#8a919e':'color:#8a919e;font-style:italic';
                        input.replaceWith(span);
                    }
                    input.addEventListener('blur',commit);
                    input.addEventListener('keydown',function(e){if(e.key==='Enter')commit();if(e.key==='Escape'){input.value=current;commit()}});
                }

                function formatDuration(ms){
                    if(!ms)return'';
                    var s=Math.floor(ms/1000),m=Math.floor(s/60);s=s%60;
                    return m>0?m+'m '+s+'s':s+'s';
                }
            </script>
        </body>
        </html>`;
    }
}

function formatDuration(ms: number): string {
    if (!ms) return '';
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}
