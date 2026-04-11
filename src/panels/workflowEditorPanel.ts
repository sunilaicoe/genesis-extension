import * as vscode from 'vscode';
import { WorkflowService } from '../services/workflowService';
import { DOCUMENT_TYPES } from '../api/genesisApi';

export class WorkflowEditorPanel {
    public static currentPanel: WorkflowEditorPanel | undefined;
    private _panel: vscode.WebviewPanel;
    private _service: WorkflowService;
    private _workflowId: string;
    private _workflowName: string;
    private static _onViewDocument: ((wfName: string, wfId: string, docType: string) => void) | undefined;
    private static _onExport: ((wfId: string, wfName: string) => void) | undefined;

    public static setOnViewDocument(cb: (wfName: string, wfId: string, docType: string) => void) { WorkflowEditorPanel._onViewDocument = cb; }
    public static setOnExport(cb: (wfId: string, wfName: string) => void) { WorkflowEditorPanel._onExport = cb; }

    constructor(panel: vscode.WebviewPanel, service: WorkflowService, workflowId: string, name: string) {
        this._panel = panel;
        this._service = service;
        this._workflowId = workflowId;
        this._workflowName = name;
        panel.webview.html = this._getHtml();
        this._panel.onDidDispose(() => { WorkflowEditorPanel.currentPanel = undefined; });
        this._panel.webview.onDidReceiveMessage(message => {
            switch (message.command) {
                case 'back': this._panel.dispose(); break;
                case 'view-document':
                    if (WorkflowEditorPanel._onViewDocument) WorkflowEditorPanel._onViewDocument(name, workflowId, message.doc);
                    break;
                case 'export':
                    if (WorkflowEditorPanel._onExport) WorkflowEditorPanel._onExport(workflowId, name);
                    break;
                case 'run': this._service.startPipeline(workflowId); break;
                case 'update-transcript': {
                    const transcript = message.transcript || '';
                    if (transcript.length >= 50) {
                        this._service.getApi().updateTranscript(workflowId, transcript).then(() => {
                            vscode.window.showInformationMessage('Transcript updated successfully!');
                        });
                    } else {
                        vscode.window.showErrorMessage('Transcript must be at least 50 characters.');
                    }
                    break;
                }
                case 'continue-workflow': {
                    const changeSummary = message.changeSummary || '';
                    if (changeSummary.length > 10) {
                        this._service.continueWorkflow(workflowId, changeSummary);
                    }
                    break;
                }
            }
        });
        const eventSub = service.onEvent(({ type }) => {
            if (type === 'pipeline-status-updated' || type === 'artifacts-updated') {
                this._update();
            }
        });
        this._panel.onDidDispose(() => { eventSub.dispose(); });
    }

    public static open(extensionUri: vscode.Uri, service: WorkflowService, workflowId: string, name: string) {
        if (WorkflowEditorPanel.currentPanel) { WorkflowEditorPanel.currentPanel._panel.reveal(); return; }
        const panel = vscode.window.createWebviewPanel('genesis-workflow-editor', 'Editor: ' + name, vscode.ViewColumn.One, {
            enableScripts: true, retainContextWhenHidden: true, localResourceRoots: [extensionUri]
        });
        WorkflowEditorPanel.currentPanel = new WorkflowEditorPanel(panel, service, workflowId, name);
    }

    private _update() { this._panel.webview.html = this._getHtml(); }

    private _getHtml(): string {
        const wf = this._service.getWorkflowById(this._workflowId);
        const transcript = wf?.uploadedDocumentText || '';
        const docStatuses = this._service.getDocumentStatuses(this._workflowId);

        const docCardsHtml = docStatuses.map(d => {
            const isActive = d.status === 'running';
            const isDone = d.status === 'completed';
            const statusClass = isDone ? 'done' : isActive ? 'active' : 'pending';
            const cardClass = isDone ? '' : isActive ? 'active' : 'pending';
            const clickable = isDone ? `onclick="handleAction('view-document','${d.type}')"` : '';
            const docInfo = DOCUMENT_TYPES.find(dt => dt.type === d.type);
            const icon = docInfo?.icon || 'description';
            const title = docInfo?.title || d.type;

            return `
            <div class="doc-card ${cardClass}" ${clickable} style="cursor:${isDone ? 'pointer' : 'default'}">
                <div class="dc-left">
                    <div class="dc-icon di-${statusClass}"><span class="material-symbols-outlined">${icon}</span></div>
                    <div class="dc-info"><h4>${title}</h4><p>${isDone ? 'Click to view' : isActive ? 'Generating...' : 'Queued'}</p></div>
                </div>
                <div class="dc-right">
                    ${isDone ? `<span class="dc-status green">Done</span><span class="material-symbols-outlined dc-check" style="font-variation-settings:'FILL' 1;color:#61dac1;font-size:18px">check_circle</span>` :
                      isActive ? `<span class="dc-status blue">Running</span><div class="dc-spinner"></div>` :
                      `<span class="dc-status gray">Pending</span><span class="material-symbols-outlined dc-pending-icon" style="color:#8a919e;font-size:18px">radio_button_unchecked</span>`}
                </div>
            </div>`;
        }).join('');

        const completedCount = docStatuses.filter(d => d.status === 'completed').length;

        return /*html*/ `
        <!DOCTYPE html>
        <html class="dark" lang="en">
        <head>
            <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Editor - ${this._workflowName}</title>
            <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&family=Fira+Code:wght@400;500&display=swap" rel="stylesheet">
            <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet">
            <style>
                *{margin:0;padding:0;box-sizing:border-box}
                .material-symbols-outlined{font-variation-settings:'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24}
                body{font-family:'Inter',sans-serif;background-color:#131313;color:#e5e2e1;margin:0;height:100vh;display:flex;flex-direction:column;overflow:hidden}
                ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:#353535;border-radius:10px}
                @keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}
                @keyframes spin{to{transform:rotate(360deg)}}
                .breadcrumb-bar{height:56px;border-bottom:1px solid rgba(64,71,82,.1);display:flex;align-items:center;justify-content:space-between;padding:0 24px;background:#1B1B1C;flex-shrink:0}
                .bc-left{display:flex;align-items:center;gap:16px}
                .bc-back{display:flex;align-items:center;gap:6px;padding:6px 12px;background:#202020;border:1px solid rgba(64,71,82,.15);border-radius:6px;color:#C0C7D4;font-size:.6875rem;font-weight:600;cursor:pointer;transition:all .15s ease;font-family:'Inter',sans-serif}
                .bc-back:hover{background:#353535;color:#e5e2e1}
                .bc-back .material-symbols-outlined{font-size:16px}
                .bc-path{display:flex;align-items:center;gap:6px;font-size:.6875rem;font-weight:600;color:#C0C7D4;text-transform:uppercase;letter-spacing:.08em}
                .bc-path span{color:#8a919e}
                .bc-path .bc-active{color:#A3C9FF}
                .bc-right{display:flex;align-items:center;gap:8px}
                .btn-run{display:flex;align-items:center;gap:6px;padding:8px 18px;background:linear-gradient(180deg,#A3C9FF,#0078D4);border:none;border-radius:6px;color:#fff;font-size:.6875rem;font-weight:700;cursor:pointer;transition:all .15s ease;font-family:'Inter',sans-serif;box-shadow:0 4px 12px rgba(0,120,212,.3)}
                .btn-run:hover{filter:brightness(1.1)}
                .btn-run .material-symbols-outlined{font-size:14px}
                .btn-sec{display:flex;align-items:center;gap:6px;padding:8px 16px;background:#2a2a2a;border:1px solid rgba(64,71,82,.15);border-radius:6px;color:#C0C7D4;font-size:.6875rem;font-weight:700;cursor:pointer;transition:all .15s ease;font-family:'Inter',sans-serif}
                .btn-sec:hover{background:#353535;color:#e5e2e1}
                .btn-sec .material-symbols-outlined{font-size:14px}
                .split{flex:1;display:flex;overflow:hidden}
                .left-panel{width:50%;display:flex;flex-direction:column;border-right:1px solid rgba(64,71,82,.1);background:#131313}
                .panel-tabs{display:flex;border-bottom:1px solid rgba(64,71,82,.1)}
                .panel-tab{padding:12px 24px;font-size:.6875rem;font-weight:600;cursor:pointer;border-bottom:2px solid transparent;color:#C0C7D4;transition:all .15s ease;display:flex;align-items:center;gap:8px}
                .panel-tab.active{color:#A3C9FF;border-bottom-color:#A3C9FF;background:#131313}
                .panel-tab .material-symbols-outlined{font-size:14px}
                .input-area{flex:1;padding:20px;display:flex;flex-direction:column;gap:12px}
                .input-area textarea{flex:1;background:#0E0E0E;border:1px solid rgba(64,71,82,.1);border-radius:8px;padding:20px;font-family:'Fira Code',monospace;font-size:.8125rem;line-height:1.7;color:#C0C7D4;resize:none;outline:none;transition:border-color .15s ease}
                .input-area textarea:focus{border-color:rgba(163,201,255,.3)}
                .input-actions{display:flex;align-items:center;justify-content:space-between}
                .right-panel{width:50%;display:flex;flex-direction:column;background:#0E0E0E}
                .right-header{padding:14px 24px;border-bottom:1px solid rgba(64,71,82,.1);display:flex;justify-content:space-between;align-items:center;flex-shrink:0}
                .right-header h3{font-size:.625rem;font-weight:700;text-transform:uppercase;letter-spacing:.2em;color:#8a919e}
                .right-header h3 span{color:#A3C9FF}
                .right-content{flex:1;overflow-y:auto;padding:20px;display:flex;flex-direction:column;gap:10px}
                .doc-card{display:flex;align-items:center;justify-content:space-between;padding:16px;background:#202020;border:1px solid rgba(64,71,82,.1);border-radius:10px;cursor:pointer;transition:all .15s ease}
                .doc-card:hover{border-color:rgba(97,218,193,.3);background:#252525}
                .doc-card.active{border-color:rgba(163,201,255,.4);background:rgba(163,201,255,.04);box-shadow:0 4px 16px rgba(163,201,255,.08)}
                .doc-card.pending{opacity:.6;border-style:dashed}
                .dc-left{display:flex;align-items:center;gap:14px}
                .dc-icon{width:40px;height:40px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
                .dc-icon .material-symbols-outlined{font-size:18px}
                .di-done{background:rgba(97,218,193,.12);color:#61dac1}.di-active{background:rgba(163,201,255,.12);color:#A3C9FF}.di-pending{background:#353535;color:#8a919e}
                .dc-info{flex:1;min-width:0}
                .dc-info h4{font-size:.8125rem;font-weight:600;color:#e5e2e1}
                .dc-info p{font-size:.6875rem;color:#8a919e;margin-top:2px}
                .dc-right{display:flex;align-items:center;gap:10px}
                .dc-status{font-family:'Fira Code',monospace;font-size:.5625rem;text-transform:uppercase;font-weight:700}
                .dc-status.green{color:#61dac1}.dc-status.blue{color:#A3C9FF;animation:blink 2s infinite}.dc-status.gray{color:#8a919e}
                .dc-spinner{width:18px;height:18px;border:2px solid #A3C9FF;border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite}
                .ia-btn{display:flex;align-items:center;gap:6px;padding:8px 14px;background:#2a2a2a;border:1px solid rgba(64,71,82,.15);border-radius:6px;color:#C0C7D4;font-size:.6875rem;font-weight:600;cursor:pointer;transition:all .15s ease;font-family:'Inter',sans-serif}
                .ia-btn:hover{background:#353535;color:#e5e2e1}
                .ia-btn .material-symbols-outlined{font-size:14px}
            </style>
        </head>
        <body>
            <div class="breadcrumb-bar">
                <div class="bc-left">
                    <button class="bc-back" onclick="handleAction('back')"><span class="material-symbols-outlined">arrow_back</span> Back</button>
                    <div class="bc-path"><span>Workflows</span> / <span class="bc-active">${this._workflowName}</span></div>
                </div>
                <div class="bc-right">
                    <button class="btn-sec" onclick="handleAction('export')"><span class="material-symbols-outlined">ios_share</span> Export</button>
                    <button class="btn-run" onclick="handleAction('run')"><span class="material-symbols-outlined" style="font-variation-settings:'FILL' 1">play_arrow</span> Run Pipeline</button>
                </div>
            </div>
            <div class="split">
                <div class="left-panel">
                    <div class="panel-tabs">
                        <div class="panel-tab active"><span class="material-symbols-outlined">subject</span> Transcript / Requirements</div>
                    </div>
                    <div class="input-area">
                        <textarea id="transcript-input" placeholder="Edit your meeting transcript or project requirements here. This content is used by AI agents to generate all 20 SDLC documents...

Tip: Save changes to update the transcript, then use 'Continue Workflow' to regenerate documents with updated requirements.">${transcript}</textarea>
                        <div class="input-actions">
                            <div style="display:flex;gap:8px">
                                <button class="ia-btn" onclick="saveTranscript()"><span class="material-symbols-outlined">save</span> Save Transcript</button>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="right-panel">
                    <div class="right-header">
                        <h3>Documents <span>(${completedCount}/20)</span></h3>
                    </div>
                    <div class="right-content">${docCardsHtml}</div>
                </div>
            </div>
            <script>
                const vscode=acquireVsCodeApi();
                function handleAction(c,d){vscode.postMessage(d?{command:c,doc:d}:{command:c})}
                function saveTranscript(){
                    var t=document.getElementById('transcript-input').value;
                    vscode.postMessage({command:'update-transcript',transcript:t});
                }
            </script>
        </body>
        </html>`;
    }
}
