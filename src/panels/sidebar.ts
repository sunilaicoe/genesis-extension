import * as vscode from 'vscode';
import { WorkflowService } from '../services/workflowService';

export interface SidebarCallbacks {
    onOpenSettings: () => void;
    onOpenHome: () => void;
    onOpenWorkflow: () => void;
    onOpenWorkflowDetail: (workflowId: string, name: string) => void;
    onBackToWorkflows: () => void;
    onNewProject: () => void;
}

export class SidebarProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'helloWorldSidebarView';
    private _callbacks: SidebarCallbacks;
    private _webviewView: vscode.WebviewView | undefined;
    private _agentMode: boolean = false;
    private _agentWorkflowName: string = '';
    private _agentWorkflowId: string = '';

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly _service: WorkflowService,
        callbacks: SidebarCallbacks
    ) {
        this._callbacks = callbacks;
        this._service.onEvent(({ type }) => {
            if (type === 'workflows-updated' || type === 'pipeline-status-updated' || type === 'connection-changed' || type === 'user-updated') {
                this._updateWebview();
            }
        });
    }

    resolveWebviewView(webviewView: vscode.WebviewView) {
        this._webviewView = webviewView;
        webviewView.webview.options = { enableScripts: true, localResourceRoots: [this._extensionUri] };
        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'icon.png')).toString());
        if (this._service.getWorkflows().length > 0) this._updateWebview();

        webviewView.webview.onDidReceiveMessage((message) => {
            switch (message.command) {
                case 'home': this._callbacks.onOpenHome(); break;
                case 'workflow': this._callbacks.onOpenWorkflow(); break;
                case 'settings': this._callbacks.onOpenSettings(); break;
                case 'open-workflow': this._callbacks.onOpenWorkflowDetail(message.id, message.name); break;
                case 'back-to-workflows': this._callbacks.onBackToWorkflows(); break;
                case 'new-project': this._callbacks.onNewProject(); break;
            }
        });
    }

    enterAgentMode(workflowName: string, workflowId?: string) {
        this._agentMode = true;
        this._agentWorkflowName = workflowName;
        this._agentWorkflowId = workflowId || '';
        this._updateWebview();
    }

    exitAgentMode() {
        this._agentMode = false;
        this._agentWorkflowName = '';
        this._agentWorkflowId = '';
        this._updateWebview();
    }

    private _updateWebview() {
        if (this._webviewView) {
            const iconUri = this._webviewView.webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'icon.png'));
            this._webviewView.webview.html = this._getHtmlForWebview(iconUri.toString());
        }
    }

    private _escapeHtml(text: string): string {
        return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    private _timeAgo(ts: number): string {
        const d = Date.now() - ts;
        const m = Math.floor(d / 60000);
        if (m < 1) return 'Just now';
        if (m < 60) return `${m}m ago`;
        const h = Math.floor(m / 60);
        if (h < 24) return `${h}h ago`;
        return `${Math.floor(h / 24)}d ago`;
    }

    private _getHtmlForWebview(iconSrc: string): string {
        if (this._agentMode) return this._getAgentSidebarHtml(iconSrc);
        return this._getNormalSidebarHtml(iconSrc);
    }

    private _getNormalSidebarHtml(iconSrc: string): string {
        const workflows = this._service.getWorkflows().slice(0, 5);
        const user = this._service.getUserProfile();
        const connected = this._service.isConnected();

        const wfItemsHtml = workflows.map(wf => {
            const displayName = this._escapeHtml(wf.productName || wf.workflowName || 'Untitled');
            const safeId = this._escapeHtml(wf._id);
            const safeName = this._escapeHtml(wf.workflowName || 'Untitled');
            const statusHtml = wf.status === 'running' ? '<div class="wf-status-running"></div>' :
                wf.status === 'completed' ? '<div class="wf-status-completed"><span class="material-symbols-outlined">check_circle</span></div>' :
                wf.status === 'failed' ? '<div class="wf-status-failed"><span class="material-symbols-outlined">error</span></div>' :
                '<div class="wf-status-pending"></div>';
            const pct = wf.totalSteps > 0 ? Math.round((wf.currentStep / wf.totalSteps) * 100) : 0;
            const statusText = wf.status.charAt(0).toUpperCase() + wf.status.slice(1);
            const progressHtml = wf.status === 'running' ? `<div class="wf-mini-progress"><div class="wf-mini-fill" style="width:${pct}%"></div></div>` : '';
            return `
            <div class="workflow-item" onclick="handleClick('open-workflow','${safeId}','${safeName}')">
                <div class="wf-top"><span class="wf-name">${displayName}</span>${statusHtml}</div>
                <div class="wf-bottom"><span>${statusText}${wf.status === 'running' ? ` · ${pct}%` : ''}</span><span>${this._timeAgo(wf.createdAt)}</span></div>
                ${progressHtml}
            </div>`;
        }).join('');

        return /*html*/ `
        <!DOCTYPE html>
        <html class="dark" lang="en">
        <head>
            <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Genesis Sidebar</title>
            <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
            <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet">
            <style>
                *{margin:0;padding:0;box-sizing:border-box}
                .material-symbols-outlined{font-variation-settings:'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24}
                body{background-color:#131313;color:#e5e2e1;font-family:'Inter',sans-serif;display:flex;flex-direction:column;height:100vh;overflow:hidden}
                ::-webkit-scrollbar{width:4px;height:4px}
                ::-webkit-scrollbar-track{background:transparent}
                ::-webkit-scrollbar-thumb{background:#404752;border-radius:10px}
                ::-webkit-scrollbar-thumb:hover{background:#505866}
                .sidebar{display:flex;flex-direction:column;height:100%;background-color:#1B1B1C;font-size:.75rem;letter-spacing:tight}
                .sidebar-header{padding:24px 20px;display:flex;align-items:center;gap:12px;border-bottom:1px solid rgba(64,71,82,.1)}
                .header-logo{width:32px;height:32px;border-radius:8px;overflow:hidden;flex-shrink:0}
                .header-logo img{width:100%;height:100%;object-fit:contain}
                .header-text h1{font-family:'Space Grotesk',sans-serif;font-size:1.125rem;font-weight:700;letter-spacing:-.02em;color:#A3C9FF;line-height:1}
                .header-text p{font-size:10px;text-transform:uppercase;letter-spacing:.15em;color:#C0C7D4;opacity:.6;margin-top:2px}
                .cta-section{padding:20px 20px}
                .cta-button{width:100%;padding:10px 0;background-color:#0078D4;color:#fff;font-family:'Inter',sans-serif;font-size:.75rem;font-weight:500;border:none;border-radius:4px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;transition:all .15s ease}
                .cta-button:hover{filter:brightness(1.15)}
                .cta-button:active{transform:scale(.97)}
                .cta-button .material-symbols-outlined{font-size:18px}
                .nav-section{flex:1;overflow-y:auto;padding:0 8px}
                .nav-group{margin-bottom:16px}
                .nav-item{display:flex;align-items:center;gap:12px;padding:8px 16px;color:#9ca3af;opacity:.7;cursor:pointer;transition:all .15s ease;position:relative;border:none;background:none;width:100%;text-align:left;font-family:'Inter',sans-serif;font-size:.75rem}
                .nav-item::before{content:'';position:absolute;left:0;top:50%;transform:translateY(-50%);width:2px;height:0;background-color:#A3C9FF;border-radius:9999px;transition:height .15s ease}
                .nav-item:hover{background-color:#353535;color:#fff;opacity:1}
                .nav-item.active{color:#A3C9FF;opacity:1}
                .nav-item.active::before{height:16px}
                .nav-item:active{transform:scale(.97)}
                .nav-item .material-symbols-outlined{font-size:20px}
                .section-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.15em;color:#C0C7D4;padding:16px 16px 12px 16px}
                .workflow-section{padding:16px 16px 12px;border-top:1px solid rgba(64,71,82,.1);margin:0 8px}
                .workflow-item{cursor:pointer;padding:8px 0;transition:all .15s ease}
                .workflow-item:hover .wf-name{color:#A3C9FF}
                .wf-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:4px}
                .wf-name{font-size:.75rem;font-weight:500;color:#e5e2e1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;transition:color .15s ease}
                .wf-status-running{width:8px;height:8px;border-radius:50%;background-color:#61dac1;box-shadow:0 0 8px rgba(97,218,193,.5);flex-shrink:0}
                .wf-status-completed{display:flex;align-items:center;justify-content:center;width:14px;height:14px;flex-shrink:0}
                .wf-status-completed .material-symbols-outlined{font-size:14px;color:#777677}
                .wf-status-pending{width:8px;height:8px;border-radius:50%;border:1px solid rgba(192,199,212,.4);flex-shrink:0}
                .wf-status-failed{display:flex;align-items:center;justify-content:center;width:14px;height:14px;flex-shrink:0}
                .wf-status-failed .material-symbols-outlined{font-size:14px;color:#ffb4ab}
                .wf-mini-progress{height:2px;background:#202020;border-radius:9999px;overflow:hidden;margin-top:6px}
                .wf-mini-fill{height:100%;background:linear-gradient(90deg,#61dac1,#A3C9FF);border-radius:9999px;transition:width .5s ease}
                .wf-bottom{display:flex;align-items:center;justify-content:space-between;font-size:10px;color:rgba(192,199,212,.6)}
                .actions-section{padding:16px;border-top:1px solid rgba(64,71,82,.1);margin:0 8px}
                .action-button{display:flex;align-items:center;gap:12px;padding:8px 12px;background-color:rgba(53,53,53,.3);border:none;border-radius:4px;color:#C0C7D4;font-family:'Inter',sans-serif;font-size:11px;cursor:pointer;transition:all .15s ease;width:100%;margin-bottom:8px}
                .action-button:last-child{margin-bottom:0}
                .action-button:hover{color:#fff;background-color:#353535}
                .action-button .material-symbols-outlined{font-size:16px}
                .sidebar-footer{padding:12px 16px;border-top:1px solid rgba(64,71,82,.1);margin:0 8px;display:flex;flex-direction:column;gap:4px}
                .user-profile{display:flex;align-items:center;gap:12px;padding:8px;border-radius:4px;cursor:pointer;transition:all .15s ease}
                .user-profile:hover{background-color:#353535}
                .avatar{width:32px;height:32px;border-radius:50%;background:linear-gradient(180deg,#A3C9FF 0%,#0078D4 100%);display:flex;align-items:center;justify-content:center;flex-shrink:0;position:relative}
                .avatar .material-symbols-outlined{font-size:18px;color:#131313}
                .status-dot{position:absolute;bottom:-1px;right:-1px;width:10px;height:10px;background-color:#61dac1;border-radius:50%;border:2px solid #1B1B1C;box-shadow:0 0 6px rgba(97,218,193,.5)}
                .status-dot.off{background-color:#8a919e;box-shadow:none}
                .user-info{display:flex;flex-direction:column;flex:1;min-width:0}
                .user-name{font-size:.75rem;font-weight:500;color:#e5e2e1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
                .user-email{font-size:10px;color:#C0C7D4;opacity:.6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
            </style>
        </head>
        <body>
            <div class="sidebar">
                <div class="sidebar-header">
                    <div class="header-logo"><img src="${iconSrc}" alt="Genesis AI" /></div>
                    <div class="header-text"><h1>Genesis</h1><p>AI SDLC Architect</p></div>
                </div>
                <div class="cta-section">
                    <button class="cta-button" onclick="handleClick('new-project')"><span class="material-symbols-outlined">add</span>New Project</button>
                </div>
                <div class="nav-section">
                    <div class="nav-group">
                        <button class="nav-item active" onclick="handleClick('home',this)"><span class="material-symbols-outlined">home</span><span>Home</span></button>
                        <button class="nav-item" onclick="handleClick('workflow',this)"><span class="material-symbols-outlined">account_tree</span><span>My Workflows</span></button>
                        <button class="nav-item" onclick="handleClick('settings',this)"><span class="material-symbols-outlined">settings</span><span>Settings</span></button>
                    </div>
                    <div class="workflow-section">
                        <div class="section-label">Workflows</div>
                        ${wfItemsHtml || '<div style="padding:8px 16px;font-size:.6875rem;color:#8a919e">No workflows yet</div>'}
                    </div>
                    <div class="actions-section">
                        <div class="section-label">Quick Actions</div>
                        <button class="action-button" onclick="handleClick('new-project')"><span class="material-symbols-outlined">add</span>New Workflow</button>
                        <button class="action-button" onclick="handleClick('workflow')"><span class="material-symbols-outlined">folder_open</span>View All</button>
                        <button class="action-button" onclick="handleClick('settings')"><span class="material-symbols-outlined">vpn_key</span>API Key</button>
                    </div>
                </div>
                <div class="sidebar-footer">
                    <div class="user-profile" onclick="handleClick('settings')">
                        <div class="avatar"><span class="material-symbols-outlined">person</span><div class="status-dot ${connected ? '' : 'off'}"></div></div>
                        <div class="user-info">
                            <span class="user-name">${user?.name || 'Not Connected'}</span>
                            <span class="user-email">${user?.email || 'Open Settings'}</span>
                        </div>
                    </div>
                </div>
            </div>
            <script>
                const vscode=acquireVsCodeApi();
                function handleClick(command,element){
                    if(command==='open-workflow'){
                        vscode.postMessage({command:command,id:element,name:arguments[2]});
                        return;
                    }
                    vscode.postMessage({command:command});
                    if(element&&element.classList.contains('nav-item')){
                        document.querySelectorAll('.nav-item').forEach(i=>{i.classList.remove('active')});
                        element.classList.add('active');
                    }
                }
            </script>
        </body>
        </html>`;
    }

    private _getAgentSidebarHtml(iconSrc: string): string {
        const wfId = this._agentWorkflowId;
        const wf = wfId ? this._service.getWorkflowById(wfId) : null;
        const status = wf?.pipelineStatus;
        const pct = status?.progress?.percentage || (wf ? Math.round((wf.currentStep / wf.totalSteps) * 100) : 0);
        const executions = status?.executions || [];
        const completedDocs = executions.filter(e => e.status === 'completed');
        const runningDocs = executions.filter(e => e.status === 'running');
        const wfStatus = wf?.status || 'pending';

        const completedList = completedDocs.map(e => {
            const name = e.agentId.replace('agent-', '').replace(/\d{2}-/, '').replace(/([A-Z])/g, ' $1').trim();
            return `<div style="display:flex;align-items:center;gap:8px;padding:4px 0"><div style="width:6px;height:6px;border-radius:50%;background:#61dac1;flex-shrink:0"></div><span style="font-size:.6875rem;color:#C0C7D4">${name.charAt(0).toUpperCase() + name.slice(1)}</span></div>`;
        }).join('');
        const runningList = runningDocs.map(e => {
            const name = e.agentId.replace('agent-', '').replace(/\d{2}-/, '').replace(/([A-Z])/g, ' $1').trim();
            return `<div style="display:flex;align-items:center;gap:8px;padding:4px 0"><div style="width:6px;height:6px;border-radius:50%;background:#A3C9FF;animation:blink 2s infinite;flex-shrink:0"></div><span style="font-size:.6875rem;color:#A3C9FF">${name.charAt(0).toUpperCase() + name.slice(1)}</span></div>`;
        }).join('');

        const statusCls = wfStatus === 'running' ? 'running' : wfStatus === 'completed' ? 'completed' : 'pending';

        return /*html*/ `
        <!DOCTYPE html>
        <html class="dark" lang="en">
        <head>
            <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Agent</title>
            <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
            <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet">
            <style>
                @keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}
                *{margin:0;padding:0;box-sizing:border-box}
                .material-symbols-outlined{font-variation-settings:'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24}
                body{background-color:#131313;color:#e5e2e1;font-family:'Inter',sans-serif;display:flex;flex-direction:column;height:100vh;overflow:hidden}
                ::-webkit-scrollbar{width:4px;height:4px}
                ::-webkit-scrollbar-track{background:transparent}
                ::-webkit-scrollbar-thumb{background:#404752;border-radius:10px}
                .sidebar{display:flex;flex-direction:column;height:100%;background-color:#1B1B1C}
                .agent-header{padding:16px 20px;border-bottom:1px solid rgba(64,71,82,.1)}
                .back-btn{display:flex;align-items:center;gap:6px;padding:6px 12px;background:#202020;border:1px solid rgba(64,71,82,.15);border-radius:6px;color:#C0C7D4;font-size:.6875rem;font-weight:600;cursor:pointer;transition:all .15s ease;font-family:'Inter',sans-serif;margin-bottom:12px}
                .back-btn:hover{background:#353535;color:#e5e2e1}
                .back-btn .material-symbols-outlined{font-size:16px}
                .agent-title{display:flex;align-items:center;gap:12px}
                .agent-avatar{width:32px;height:32px;border-radius:8px;overflow:hidden;flex-shrink:0}
                .agent-avatar img{width:100%;height:100%;object-fit:contain}
                .agent-info{flex:1;min-width:0}
                .agent-info h2{font-family:'Space Grotesk',sans-serif;font-size:.8125rem;font-weight:700;color:#e5e2e1}
                .agent-info p{font-size:.5625rem;color:#8a919e}
                .agent-badge{display:flex;align-items:center;gap:6px;padding:4px 12px;border-radius:9999px}
                .agent-badge.running{background:rgba(97,218,193,.08);border:1px solid rgba(97,218,193,.15)}
                .agent-badge.completed{background:rgba(163,201,255,.08);border:1px solid rgba(163,201,255,.15)}
                .agent-badge.pending{background:rgba(192,199,212,.08);border:1px solid rgba(192,199,212,.15)}
                .agent-dot{width:6px;height:6px;border-radius:50%}
                .agent-badge.running .agent-dot{background:#61dac1;animation:blink 2s infinite}
                .agent-badge.completed .agent-dot{background:#A3C9FF}
                .agent-badge.pending .agent-dot{background:#8a919e}
                .agent-badge span{font-size:.5625rem;font-weight:700;text-transform:uppercase;letter-spacing:.04em}
                .agent-badge.running span{color:#61dac1}.agent-badge.completed span{color:#A3C9FF}.agent-badge.pending span{color:#8a919e}

                .agent-stats{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:14px 20px}
                .agent-stat{background:#131313;border-radius:6px;padding:12px 14px}
                .agent-stat-label{font-size:.5625rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#8a919e}
                .agent-stat-value{font-family:'Space Grotesk',sans-serif;font-size:1.25rem;font-weight:700;margin-top:4px}
                .agent-stat-value.blue{color:#A3C9FF}
                .agent-stat-value.green{color:#61dac1}

                .progress-section{padding:0 20px 12px}
                .progress-info{display:flex;justify-content:space-between;font-size:.5625rem;color:#8a919e;margin-bottom:4px}
                .progress-bar{height:4px;background:#202020;border-radius:9999px;overflow:hidden}
                .progress-fill{height:100%;background:linear-gradient(90deg,#A3C9FF,#0078D4);border-radius:9999px;transition:width .5s ease}

                .docs-section{flex:1;overflow-y:auto;padding:0 20px 20px}
                .docs-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.15em;color:#C0C7D4;padding:8px 0}
            </style>
        </head>
        <body>
            <div class="sidebar">
                <div class="agent-header">
                    <button class="back-btn" onclick="handleClick('back-to-workflows')"><span class="material-symbols-outlined">arrow_back</span> Back</button>
                    <div class="agent-title">
                        <div class="agent-avatar"><img src="${iconSrc}" alt="Genesis AI" /></div>
                        <div class="agent-info">
                            <h2>Genesis Agent</h2>
                            <p>${this._agentWorkflowName}</p>
                        </div>
                        <div class="agent-badge ${statusCls}">
                            <div class="agent-dot"></div>
                            <span>${wfStatus}</span>
                        </div>
                    </div>
                </div>
                <div class="agent-stats">
                    <div class="agent-stat">
                        <div class="agent-stat-label">Progress</div>
                        <div class="agent-stat-value blue">${pct}%</div>
                    </div>
                    <div class="agent-stat">
                        <div class="agent-stat-label">Documents</div>
                        <div class="agent-stat-value green">${completedDocs.length}/${wf?.totalSteps || 20}</div>
                    </div>
                </div>
                <div class="progress-section">
                    <div class="progress-info">
                        <span>${status?.progress?.currentAgent || 'Waiting...'}</span>
                        <span>${pct}%</span>
                    </div>
                    <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
                </div>
                <div class="docs-section">
                    <div class="docs-label">Documents</div>
                    ${completedList}
                    ${runningList}
                    ${completedDocs.length === 0 && runningDocs.length === 0 ? '<span style="font-size:.6875rem;color:#8a919e">Waiting to start...</span>' : ''}
                </div>
            </div>
            <script>const vscode=acquireVsCodeApi();function handleClick(c){vscode.postMessage({command:c})}</script>
        </body>
        </html>`;
    }
}
