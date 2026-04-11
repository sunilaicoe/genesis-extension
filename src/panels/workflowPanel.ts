import * as vscode from 'vscode';
import { WorkflowService } from '../services/workflowService';
import { InputType } from '../api/genesisApi';

export class WorkflowPanel {
    public static currentPanel: WorkflowPanel | undefined;
    private _panel: vscode.WebviewPanel;
    private static _openDetail: ((workflowId: string, name: string) => void) | undefined;
    private static _newWorkflow: (() => void) | undefined;
    private _service: WorkflowService;

    public static setOpenDetail(cb: (workflowId: string, name: string) => void) { WorkflowPanel._openDetail = cb; }
    public static setNewWorkflow(cb: () => void) { WorkflowPanel._newWorkflow = cb; }

    constructor(panel: vscode.WebviewPanel, service: WorkflowService) {
        this._panel = panel;
        this._service = service;
        panel.webview.html = this._getHtml();
        this._panel.onDidDispose(() => { WorkflowPanel.currentPanel = undefined; });
        this._panel.webview.onDidReceiveMessage(message => {
            switch (message.command) {
                case 'open-workflow':
                    if (WorkflowPanel._openDetail) WorkflowPanel._openDetail(message.id, message.name);
                    break;
                case 'new-workflow':
                    if (WorkflowPanel._newWorkflow) WorkflowPanel._newWorkflow();
                    break;
                case 'delete-workflow':
                    vscode.window.showWarningMessage(`Delete "${message.name}" permanently?`, { modal: true }, 'Delete').then(s => {
                        if (s === 'Delete') this._service.deleteWorkflow(message.id);
                    });
                    break;
                case 'start-pipeline':
                    this._service.startPipeline(message.id);
                    break;
                case 'refresh':
                    this._service.fetchWorkflows();
                    break;
            }
        });
        const eventSub = service.onEvent(({ type }) => {
            if (type === 'workflows-updated' || type === 'pipeline-status-updated') {
                this._update();
            }
        });
        this._panel.onDidDispose(() => { eventSub.dispose(); });
    }

    public static open(extensionUri: vscode.Uri, service: WorkflowService) {
        if (WorkflowPanel.currentPanel) {
            WorkflowPanel.currentPanel._panel.reveal();
            service.fetchWorkflows();
            return;
        }
        const panel = vscode.window.createWebviewPanel('genesis-workflow', 'My Workflows', vscode.ViewColumn.One, {
            enableScripts: true, retainContextWhenHidden: true, localResourceRoots: [extensionUri]
        });
        WorkflowPanel.currentPanel = new WorkflowPanel(panel, service);
    }

    private _update() { this._panel.webview.html = this._getHtml(); }

    private _timeAgo(ts: number): string {
        const d = Date.now() - ts;
        const m = Math.floor(d / 60000);
        if (m < 1) return 'Just now';
        if (m < 60) return `${m}m ago`;
        const h = Math.floor(m / 60);
        if (h < 24) return `${h}h ago`;
        if (h < 48) return 'Yesterday';
        return `${Math.floor(h / 24)}d ago`;
    }

    private _formatDuration(ms: number | null): string {
        if (!ms) return '';
        const secs = Math.floor(ms / 1000);
        const mins = Math.floor(secs / 60);
        return mins < 1 ? `${secs}s` : `${mins}m ${secs % 60}s`;
    }

    private _getInputIcon(type: InputType): { icon: string; color: string } {
        switch (type) {
            case 'voice': return { icon: 'mic', color: '#61dac1' };
            case 'document': return { icon: 'description', color: '#A3C9FF' };
            case 'text': return { icon: 'title', color: '#a855f7' };
            case 'mixed': return { icon: 'layers', color: '#fbbf24' };
            default: return { icon: 'mic', color: '#8a919e' };
        }
    }

    private _getInputLabel(type: InputType): string {
        return { voice: 'Voice', document: 'Document', text: 'Text', mixed: 'Mixed' }[type] || 'Voice';
    }

    private _getHtml(): string {
        const workflows = this._service.getWorkflows();
        const total = workflows.length;

        const wfCardsHtml = workflows.map(wf => {
            const safeName = wf.workflowName.replace(/'/g, "\\'").replace(/"/g, '&quot;');
            const isRunning = wf.status === 'running';
            const isFailed = wf.status === 'failed';
            const isPending = wf.status === 'pending';
            const isCompleted = wf.status === 'completed';

            const badgeCls = isRunning ? 'b-run' : isCompleted ? 'b-done' : isFailed ? 'b-err' : 'b-pend';
            const badgeText = isRunning ? '● Running' : isCompleted ? '✓ Completed' : isFailed ? '✕ Failed' : '◎ Pending';
            const inputIcon = this._getInputIcon(wf.inputType || 'voice');
            const inputLabel = this._getInputLabel(wf.inputType || 'voice');

            return `
            <div class="wf-card" data-status="${wf.status}" data-search="${(wf.workflowName + ' ' + (wf.productName || '') + ' ' + (wf.description || '')).toLowerCase()}" data-input="${wf.inputType || 'voice'}">
                ${isRunning ? '<div class="wf-progress-strip"><div class="wf-progress-strip-fill"></div></div>' : ''}
                <div class="wf-card-inner" onclick="handleAction('open-workflow','${wf._id}','${safeName}')">
                    <div class="wf-card-top">
                        <div class="wf-input-icon" style="background:${inputIcon.color}15;color:${inputIcon.color}"><span class="material-symbols-outlined">${inputIcon.icon}</span></div>
                        <div class="wf-card-info">
                            <div class="wf-card-name-row">
                                <h3 class="wf-card-name">${wf.productName || wf.workflowName}</h3>
                                <span class="wf-badge ${badgeCls}">${isRunning ? '<span class="wf-badge-spinner"></span>' : ''}${badgeText}</span>
                            </div>
                            ${wf.description ? `<p class="wf-card-desc">${wf.description}</p>` : ''}
                            <div class="wf-card-meta">
                                <span class="wf-meta-time">${this._timeAgo(wf.createdAt)}</span>
                                <span class="wf-meta-tag">${inputLabel}</span>
                                <span class="wf-meta-artifacts">📄 ${wf.artifactCount || 0}/20</span>
                                ${wf.duration ? `<span class="wf-meta-duration">⏱ ${this._formatDuration(wf.duration)}</span>` : ''}
                                ${isRunning && wf.currentAgentName ? `<span class="wf-meta-agent"><span class="wf-agent-spinner"></span>${wf.currentAgentName}</span>` : ''}
                            </div>
                        </div>
                    </div>
                    <div class="wf-card-actions">
                        <button class="wf-act-open" title="Open" onclick="event.stopPropagation();handleAction('open-workflow','${wf._id}','${safeName}')"><span class="material-symbols-outlined">open_in_new</span> Open</button>
                        ${isFailed ? `<button class="wf-act-retry" title="Retry" onclick="event.stopPropagation();handleAction('start-pipeline','${wf._id}')"><span class="material-symbols-outlined">refresh</span> Retry</button>` : ''}
                        ${isPending ? `<button class="wf-act-start" title="Start" onclick="event.stopPropagation();handleAction('start-pipeline','${wf._id}')"><span class="material-symbols-outlined">play_arrow</span> Start</button>` : ''}
                        <button class="wf-act-delete" title="Delete" onclick="event.stopPropagation();handleAction('delete-workflow','${wf._id}','${safeName}')"><span class="material-symbols-outlined">delete</span></button>
                    </div>
                </div>
            </div>`;
        }).join('');

        return /*html*/ `
        <!DOCTYPE html>
        <html class="dark" lang="en">
        <head>
            <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>My Workflows</title>
            <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&family=Fira+Code:wght@400;500&display=swap" rel="stylesheet">
            <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet">
            <style>
                *{margin:0;padding:0;box-sizing:border-box}
                .material-symbols-outlined{font-variation-settings:'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24}
                body{font-family:'Inter',sans-serif;background-color:#131313;color:#e5e2e1;margin:0;height:100vh;display:flex;flex-direction:column}
                ::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:#353535;border-radius:10px}::-webkit-scrollbar-thumb:hover{background:#404751}
                .page{flex:1;display:flex;flex-direction:column;gap:12px;padding:16px 20px;overflow-y:auto}

                /* PAGE HEADER */
                .page-header{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;background:#1B1B1C;border-radius:8px;border:1px solid rgba(64,71,82,.08);flex-shrink:0}
                .ph-left{display:flex;align-items:center;gap:14px}
                .ph-icon{width:38px;height:38px;border-radius:8px;background:linear-gradient(135deg,rgba(163,201,255,.15),rgba(0,120,212,.15));display:flex;align-items:center;justify-content:center;flex-shrink:0}
                .ph-icon .material-symbols-outlined{font-size:20px;color:#A3C9FF}
                .ph-text h1{font-family:'Space Grotesk',sans-serif;font-size:1rem;font-weight:700;color:#e5e2e1;line-height:1.2}
                .ph-text p{font-size:.6875rem;color:#8a919e}
                .ph-right{display:flex;align-items:center;gap:10px}
                .btn-new{display:flex;align-items:center;gap:6px;padding:8px 18px;background:linear-gradient(180deg,#A3C9FF 0%,#0078D4 100%);border:none;border-radius:6px;color:#fff;font-size:.6875rem;font-weight:700;cursor:pointer;transition:all .15s ease;text-transform:uppercase;letter-spacing:.04em}
                .btn-new:hover{opacity:.9;transform:translateY(-1px)}
                .btn-new .material-symbols-outlined{font-size:16px}

                /* FILTER BAR */
                .filter-bar{display:flex;align-items:center;gap:10px;flex-shrink:0}
                .search-box{position:relative;flex:1;max-width:320px}
                .search-box .material-symbols-outlined{position:absolute;left:10px;top:50%;transform:translateY(-50%);font-size:16px;color:#8a919e;pointer-events:none}
                .search-box input{width:100%;padding:8px 12px 8px 34px;background:#1B1B1C;border:1px solid rgba(64,71,82,.15);border-radius:6px;color:#e5e2e1;font-size:.75rem;font-family:'Inter',sans-serif;outline:none;transition:border-color .15s ease}
                .search-box input:focus{border-color:rgba(163,201,255,.4)}
                .search-box input::placeholder{color:#8a919e}
                .filter-select{position:relative}
                .filter-select select{appearance:none;padding:8px 30px 8px 12px;background:#1B1B1C;border:1px solid rgba(64,71,82,.15);border-radius:6px;color:#C0C7D4;font-size:.6875rem;font-family:'Inter',sans-serif;outline:none;cursor:pointer;transition:border-color .15s ease}
                .filter-select select:focus{border-color:rgba(163,201,255,.4)}
                .filter-select::after{content:'expand_more';font-family:'Material Symbols Outlined';position:absolute;right:8px;top:50%;transform:translateY(-50%);font-size:14px;color:#8a919e;pointer-events:none}
                .filter-count{font-size:.6875rem;color:#8a919e;font-weight:500;white-space:nowrap}

                /* WORKFLOW CARDS */
                .wf-cards{display:flex;flex-direction:column;gap:3px}
                .wf-card{background:#1B1B1C;border:1px solid rgba(64,71,82,.08);border-radius:10px;overflow:hidden;transition:all .15s ease}
                .wf-card:hover{border-color:rgba(64,71,82,.2)}
                .wf-progress-strip{height:3px;background:#202020;overflow:hidden}
                .wf-progress-strip-fill{height:100%;width:30%;background:linear-gradient(90deg,#A3C9FF,#0078D4);animation:progressSlide 1.5s ease-in-out infinite}
                @keyframes progressSlide{0%{transform:translateX(-100%)}100%{transform:translateX(400%)}}
                .wf-card-inner{padding:16px 20px}
                .wf-card-top{display:flex;align-items:flex-start;gap:14px}
                .wf-input-icon{width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;border:1px solid rgba(64,71,82,.1)}
                .wf-input-icon .material-symbols-outlined{font-size:16px}
                .wf-card-info{flex:1;min-width:0}
                .wf-card-name-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
                .wf-card-name{font-size:.8125rem;font-weight:600;color:#e5e2e1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
                .wf-badge{display:inline-flex;align-items:center;gap:4px;font-size:.5rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;padding:2px 10px;border-radius:9999px;flex-shrink:0}
                .wf-badge-spinner{width:6px;height:6px;border-radius:50%;background:#61dac1;display:inline-block;animation:badgeSpin 2s infinite}
                @keyframes badgeSpin{0%,100%{opacity:1}50%{opacity:.3}}
                .b-run{background:rgba(97,218,193,.12);color:#61dac1}
                .b-done{background:rgba(163,201,255,.1);color:#A3C9FF}
                .b-pend{background:rgba(192,199,212,.08);color:#8a919e}
                .b-err{background:rgba(255,180,171,.1);color:#ffb4ab}
                .wf-card-desc{font-size:.6875rem;color:#8a919e;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
                .wf-card-meta{display:flex;align-items:center;gap:10px;margin-top:6px;flex-wrap:wrap}
                .wf-meta-time{font-size:.6875rem;color:#8a919e}
                .wf-meta-tag{font-size:.5625rem;color:#C0C7D4;background:#202020;padding:1px 8px;border-radius:9999px}
                .wf-meta-artifacts{font-size:.6875rem;color:#8a919e}
                .wf-meta-duration{font-size:.6875rem;color:#8a919e}
                .wf-meta-agent{font-size:.6875rem;color:#A3C9FF;display:flex;align-items:center;gap:4px}
                .wf-agent-spinner{width:10px;height:10px;border:2px solid rgba(163,201,255,.3);border-top-color:#A3C9FF;border-radius:50%;animation:spin .8s linear infinite}
                @keyframes spin{to{transform:rotate(360deg)}}
                .wf-card-actions{display:flex;align-items:center;justify-content:space-between;margin-top:12px;padding-top:10px;border-top:1px solid rgba(64,71,82,.08)}
                .wf-act-left{display:flex;align-items:center;gap:8px}
                .wf-act-open{display:flex;align-items:center;gap:5px;padding:6px 14px;background:#202020;border:1px solid rgba(64,71,82,.15);border-radius:6px;color:#C0C7D4;font-size:.6875rem;font-weight:600;cursor:pointer;transition:all .12s ease}
                .wf-act-open:hover{background:#353535;color:#e5e2e1}
                .wf-act-open .material-symbols-outlined{font-size:14px}
                .wf-act-retry{display:flex;align-items:center;gap:5px;padding:6px 14px;background:rgba(255,180,171,.08);border:1px solid rgba(255,180,171,.15);border-radius:6px;color:#ffb4ab;font-size:.6875rem;font-weight:600;cursor:pointer;transition:all .12s ease}
                .wf-act-retry:hover{background:rgba(255,180,171,.15)}
                .wf-act-retry .material-symbols-outlined{font-size:14px}
                .wf-act-start{display:flex;align-items:center;gap:5px;padding:6px 14px;background:rgba(163,201,255,.1);border:1px solid rgba(163,201,255,.2);border-radius:6px;color:#A3C9FF;font-size:.6875rem;font-weight:600;cursor:pointer;transition:all .12s ease}
                .wf-act-start:hover{background:rgba(163,201,255,.15)}
                .wf-act-start .material-symbols-outlined{font-size:14px}
                .wf-act-delete{padding:6px;border-radius:6px;color:#8a919e;cursor:pointer;transition:all .12s ease;background:none;border:none}
                .wf-act-delete:hover{background:rgba(255,180,171,.1);color:#ffb4ab}
                .wf-act-delete .material-symbols-outlined{font-size:16px}

                /* EMPTY */
                .empty{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:64px;text-align:center}
                .empty-icon{width:56px;height:56px;border-radius:12px;background:#202020;border:1px solid rgba(64,71,82,.15);display:flex;align-items:center;justify-content:center;margin-bottom:16px}
                .empty-icon .material-symbols-outlined{font-size:28px;color:#8a919e}
                .empty h3{font-size:.875rem;font-weight:600;color:#e5e2e1;margin-bottom:4px}
                .empty p{font-size:.75rem;color:#8a919e}
                .empty-filter{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:48px;text-align:center}
                .empty-filter h3{font-size:.875rem;font-weight:600;color:#e5e2e1;margin-bottom:4px}
                .empty-filter p{font-size:.75rem;color:#8a919e}

                /* QUICK ACTIONS */
                .qa-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;flex-shrink:0}
                .qa{background:#1B1B1C;border-radius:8px;padding:18px 16px;border:1px solid rgba(64,71,82,.08);cursor:pointer;transition:all .15s ease;display:flex;align-items:center;gap:14px}
                .qa:hover{background:#202020;border-color:rgba(64,71,82,.2);transform:translateY(-1px)}
                .qa:active{transform:scale(.98)}
                .qa-icon{width:40px;height:40px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
                .qa-icon .material-symbols-outlined{font-size:18px}
                .qi-primary{background:linear-gradient(135deg,rgba(163,201,255,.15),rgba(0,120,212,.15));color:#A3C9FF}
                .qi-tertiary{background:rgba(97,218,193,.1);color:#61dac1}
                .qi-amber{background:rgba(251,191,36,.1);color:#fbbf24}
                .qa-label{font-size:.75rem;font-weight:600;color:#e5e2e1}
                .qa-desc{font-size:.5625rem;color:#8a919e;line-height:1.4;margin-top:2px}
            </style>
        </head>
        <body>
            <div class="page">
                <!-- PAGE HEADER -->
                <div class="page-header">
                    <div class="ph-left">
                        <div class="ph-icon"><span class="material-symbols-outlined">account_tree</span></div>
                        <div class="ph-text">
                            <h1>My Workflows</h1>
                            <p>All your product discovery sessions</p>
                        </div>
                    </div>
                    <div class="ph-right">
                        <button class="btn-new" onclick="handleAction('new-workflow')"><span class="material-symbols-outlined">add</span> New Session</button>
                    </div>
                </div>

                <!-- FILTER BAR -->
                <div class="filter-bar">
                    <div class="search-box">
                        <span class="material-symbols-outlined">search</span>
                        <input type="text" id="search-input" placeholder="Search sessions..." oninput="applyFilters()">
                    </div>
                    <div class="filter-select">
                        <select id="status-filter" onchange="applyFilters()">
                            <option value="all">All Status</option>
                            <option value="running">Running</option>
                            <option value="completed">Completed</option>
                            <option value="failed">Failed</option>
                            <option value="pending">Pending</option>
                        </select>
                    </div>
                    <div class="filter-select">
                        <select id="input-filter" onchange="applyFilters()">
                            <option value="all">All Types</option>
                            <option value="voice">🎤 Voice</option>
                            <option value="document">📄 Document</option>
                            <option value="text">📝 Text</option>
                            <option value="mixed">📦 Mixed</option>
                        </select>
                    </div>
                    <span class="filter-count" id="filter-count">${total} session${total !== 1 ? 's' : ''}</span>
                </div>

                <!-- WORKFLOW CARDS -->
                ${workflows.length > 0 ? `
                <div class="wf-cards">
                    ${wfCardsHtml}
                </div>
                ` : `
                <div class="empty">
                    <div class="empty-icon"><span class="material-symbols-outlined">layers</span></div>
                    <h3>No sessions yet</h3>
                    <p>Start your first voice session to generate your SDLC documents.</p>
                    <button class="btn-new" style="margin-top:20px" onclick="handleAction('new-workflow')"><span class="material-symbols-outlined">add</span> New Session</button>
                </div>
                `}

                <!-- QUICK ACTIONS -->
                <div class="qa-grid">
                    <div class="qa" onclick="handleAction('new-workflow')"><div class="qa-icon qi-primary"><span class="material-symbols-outlined">add_circle</span></div><div><div class="qa-label">New Workflow</div><div class="qa-desc">Create a new AI-powered pipeline</div></div></div>
                    <div class="qa" onclick="handleAction('refresh')"><div class="qa-icon qi-tertiary"><span class="material-symbols-outlined">refresh</span></div><div><div class="qa-label">Refresh</div><div class="qa-desc">Sync with Genesis Cloud</div></div></div>
                    <div class="qa"><div class="qa-icon qi-amber"><span class="material-symbols-outlined">settings</span></div><div><div class="qa-label">Settings</div><div class="qa-desc">Manage API keys & config</div></div></div>
                </div>
            </div>
            <script>
                const vscode=acquireVsCodeApi();
                function handleAction(c,id,name){vscode.postMessage(id?{command:c,id:id,name:name}:{command:c})}
                function applyFilters(){
                    const search=document.getElementById('search-input').value.toLowerCase();
                    const status=document.getElementById('status-filter').value;
                    const input=document.getElementById('input-filter').value;
                    let count=0;
                    document.querySelectorAll('.wf-card').forEach(card=>{
                        const matchSearch=!search||card.dataset.search.includes(search);
                        const matchStatus=status==='all'||card.dataset.status===status;
                        const matchInput=input==='all'||card.dataset.input===input;
                        const show=matchSearch&&matchStatus&&matchInput;
                        card.style.display=show?'':'none';
                        if(show)count++;
                    });
                    document.getElementById('filter-count').textContent=count+' session'+(count!==1?'s':'');
                }
            </script>
        </body>
        </html>`;
    }
}
