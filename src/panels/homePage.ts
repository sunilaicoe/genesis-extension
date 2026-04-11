import * as vscode from 'vscode';
import { WorkflowService, WorkflowWithStatus } from '../services/workflowService';

export class HomePage {
    public static currentPanel: HomePage | undefined;
    private _panel: vscode.WebviewPanel;
    private _service: WorkflowService;
    private static _onOpenSettings: (() => void) | undefined;

    public static setOnOpenSettings(cb: () => void) { HomePage._onOpenSettings = cb; }

    constructor(panel: vscode.WebviewPanel, service: WorkflowService) {
        this._panel = panel;
        this._service = service;
        this._update();
        this._panel.onDidDispose(() => { HomePage.currentPanel = undefined; });
        this._panel.webview.onDidReceiveMessage((message) => {
            switch (message.command) {
                case 'new-project': vscode.commands.executeCommand('genesis.newWorkflow'); break;
                case 'open-project': {
                    const wfId = message.id;
                    if (wfId) vscode.commands.executeCommand('genesis.openWorkflowDetail', wfId, message.name);
                    break;
                }
                case 'open-settings': if (HomePage._onOpenSettings) HomePage._onOpenSettings(); break;
                case 'open-workflows': vscode.commands.executeCommand('genesis.showWorkflows'); break;
                case 'refresh': service.fetchWorkflows(); break;
            }
        });
        const eventSub = service.onEvent(({ type }) => {
            if (type === 'workflows-updated' || type === 'user-updated' || type === 'connection-changed') {
                this._update();
            }
        });
        this._panel.onDidDispose(() => { eventSub.dispose(); });
    }

    public static open(extensionUri: vscode.Uri, service: WorkflowService) {
        if (HomePage.currentPanel) { HomePage.currentPanel._panel.reveal(); return; }
        const panel = vscode.window.createWebviewPanel('genesis-home', 'Genesis Home', vscode.ViewColumn.One, {
            enableScripts: true, retainContextWhenHidden: true, localResourceRoots: [extensionUri]
        });
        HomePage.currentPanel = new HomePage(panel, service);
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

    private _getHtml(): string {
        const workflows = this._service.getWorkflows();
        const user = this._service.getUserProfile();
        const connected = this._service.isConnected();
        const firstName = user?.name ? user.name.split(' ')[0] : null;
        const isAdmin = user?.role === 'admin';
        const total = workflows.length;
        const running = workflows.filter((w: WorkflowWithStatus) => w.status === 'running').length;
        const completed = workflows.filter((w: WorkflowWithStatus) => w.status === 'completed').length;
        const recent = workflows.slice(0, 4);

        const projHtml = recent.map((wf: WorkflowWithStatus) => {
            const badgeCls = wf.status === 'running' ? 'b-run' : wf.status === 'completed' ? 'b-done' : wf.status === 'failed' ? 'b-err' : 'b-pend';
            const badgeText = wf.status === 'running' ? '● Running' : wf.status === 'completed' ? '✓ Done' : wf.status === 'failed' ? '✕ Failed' : '◎ Pending';
            const inputIcon = wf.inputType === 'voice' ? 'mic' : wf.inputType === 'document' ? 'description' : wf.inputType === 'text' ? 'title' : wf.inputType === 'mixed' ? 'layers' : 'mic';
            const inputColor = wf.inputType === 'voice' ? '#61dac1' : wf.inputType === 'document' ? '#A3C9FF' : wf.inputType === 'text' ? '#a855f7' : wf.inputType === 'mixed' ? '#fbbf24' : '#8a919e';
            return `
            <div class="proj" onclick="handleAction('open-project','${wf._id}','${wf.workflowName.replace(/'/g, "\\'")}')">
                <div class="proj-icon" style="color:${inputColor}"><span class="material-symbols-outlined">${inputIcon}</span></div>
                <div class="proj-info">
                    <div class="proj-name">${wf.workflowName}</div>
                    <div class="proj-desc">${wf.productName || wf.description || 'No description'}</div>
                    <div class="proj-meta">
                        <span class="proj-meta-time">${this._timeAgo(wf.createdAt)}</span>
                        ${wf.artifactCount ? `<span class="proj-meta-docs">📄 ${wf.artifactCount}/20</span>` : ''}
                        ${wf.duration ? `<span class="proj-meta-dur">⏱ ${this._formatDuration(wf.duration)}</span>` : ''}
                    </div>
                </div>
                <div class="proj-right">
                    <span class="proj-badge ${badgeCls}">${badgeText}</span>
                    <span class="proj-arrow">chevron_right</span>
                </div>
            </div>`;
        }).join('');

        const runningWf = workflows.find((w: WorkflowWithStatus) => w.status === 'running');
        const hasRunning = !!runningWf;

        return /*html*/ `
        <!DOCTYPE html>
        <html class="dark" lang="en">
        <head>
            <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Genesis Home</title>
            <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&family=Fira+Code:wght@400;500&display=swap" rel="stylesheet">
            <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet">
            <style>
                *{margin:0;padding:0;box-sizing:border-box}
                .material-symbols-outlined{font-variation-settings:'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24}
                body{font-family:'Inter',sans-serif;background-color:#131313;color:#e5e2e1;margin:0;overflow-y:auto;height:100vh;display:flex;flex-direction:column}
                ::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:#353535;border-radius:10px}::-webkit-scrollbar-thumb:hover{background:#404751}
                .page{flex:1;display:flex;flex-direction:column;gap:12px;padding:16px 20px}

                /* WELCOME STRIP */
                .welcome-strip{display:flex;align-items:center;justify-content:space-between;padding:14px 20px;background:#1B1B1C;border-radius:8px;border:1px solid rgba(64,71,82,.08);flex-shrink:0}
                .welcome-left{display:flex;align-items:center;gap:16px}
                .welcome-avatar{width:36px;height:36px;border-radius:50%;background:linear-gradient(180deg,#A3C9FF 0%,#0078D4 100%);display:flex;align-items:center;justify-content:center;flex-shrink:0;position:relative}
                .welcome-avatar .material-symbols-outlined{font-size:18px;color:#131313}
                .welcome-avatar .w-dot{position:absolute;bottom:-1px;right:-1px;width:10px;height:10px;border-radius:50%;background:#61dac1;border:2px solid #1B1B1C;box-shadow:0 0 6px rgba(97,218,193,.5)}
                .welcome-avatar .w-dot.off{background:#8a919e;box-shadow:none}
                .welcome-text h1{font-family:'Space Grotesk',sans-serif;font-size:1.125rem;font-weight:700;color:#e5e2e1;line-height:1.2}
                .welcome-text p{font-size:.6875rem;color:#8a919e;margin-top:2px}
                .welcome-right{display:flex;align-items:center;gap:16px}
                .welcome-clock{text-align:right}
                .welcome-clock .time{font-family:'Fira Code',monospace;font-size:.8125rem;color:#e5e2e1;font-weight:500}
                .welcome-clock .date{font-size:.5625rem;color:#8a919e;text-transform:uppercase;letter-spacing:.08em}
                .admin-badge{display:flex;align-items:center;gap:5px;padding:5px 12px;background:rgba(163,201,255,.08);border:1px solid rgba(163,201,255,.15);border-radius:9999px}
                .admin-badge .material-symbols-outlined{font-size:12px;color:#A3C9FF}
                .admin-badge span{font-size:.625rem;color:#A3C9FF;font-weight:700;text-transform:uppercase;letter-spacing:.05em}
                .conn-badge{display:flex;align-items:center;gap:6px;padding:6px 14px;background:rgba(97,218,193,.08);border-radius:9999px;border:1px solid rgba(97,218,193,.15)}
                .conn-badge.off{background:rgba(255,180,171,.08);border-color:rgba(255,180,171,.15)}
                .conn-dot{width:6px;height:6px;border-radius:50%;background:#61dac1;animation:blink 2s infinite}
                .conn-badge.off .conn-dot{background:#ffb4ab;animation:none}
                @keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}
                .conn-badge span{font-size:.625rem;color:#61dac1;font-weight:600;text-transform:uppercase;letter-spacing:.05em}
                .conn-badge.off span{color:#ffb4ab}

                /* STATS ROW */
                .stats-row{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;flex-shrink:0}
                .stat-card{background:#1B1B1C;border-radius:8px;padding:16px 18px;border:1px solid rgba(64,71,82,.08);display:flex;align-items:center;gap:14px;transition:background .15s ease;cursor:default}
                .stat-card:hover{background:#202020}
                .stat-icon{width:38px;height:38px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
                .stat-icon .material-symbols-outlined{font-size:18px}
                .si-blue{background:rgba(0,120,212,.15);color:#A3C9FF}
                .si-green{background:rgba(97,218,193,.12);color:#61dac1}
                .si-amber{background:rgba(251,191,36,.12);color:#fbbf24}
                .si-purple{background:rgba(168,85,247,.12);color:#a855f7}
                .stat-val{font-family:'Space Grotesk',sans-serif;font-size:1.5rem;font-weight:700;color:#e5e2e1;line-height:1}
                .stat-lbl{font-size:.625rem;color:#8a919e;text-transform:uppercase;letter-spacing:.05em;margin-top:2px}

                /* NEW SESSION CARDS (from GitHub) */
                .section-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px}
                .section-header h2{font-family:'Space Grotesk',sans-serif;font-size:.875rem;font-weight:700;color:#e5e2e1}
                .section-header p{font-size:.6875rem;color:#8a919e;margin-top:2px}
                .section-badge{font-family:'Fira Code',monospace;font-size:.5625rem;color:#8a919e;background:#202020;padding:4px 10px;border-radius:9999px}
                .session-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;flex-shrink:0}
                .session-card{display:flex;flex-direction:column;padding:20px;background:#1B1B1C;border-radius:10px;border:1px solid rgba(64,71,82,.08);cursor:pointer;transition:all .2s ease}
                .session-card:hover{border-color:rgba(64,71,82,.25);transform:translateY(-1px)}
                .sc-icon{width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;margin-bottom:12px}
                .sc-icon .material-symbols-outlined{font-size:20px}
                .sc-voice .sc-icon{background:rgba(97,218,193,.1);color:#61dac1}
                .sc-voice:hover{border-color:rgba(97,218,193,.25)}
                .sc-upload .sc-icon{background:rgba(163,201,255,.1);color:#A3C9FF}
                .sc-upload:hover{border-color:rgba(163,201,255,.25)}
                .sc-text .sc-icon{background:rgba(168,85,247,.1);color:#a855f7}
                .sc-text:hover{border-color:rgba(168,85,247,.25)}
                .sc-title{font-size:.8125rem;font-weight:600;color:#e5e2e1;margin-bottom:4px}
                .sc-desc{font-size:.6875rem;color:#8a919e;line-height:1.5;flex:1}
                .sc-footer{display:flex;align-items:center;justify-content:space-between;margin-top:12px}
                .sc-badge{font-size:.5625rem;font-weight:600;color:#8a919e;background:#202020;padding:2px 8px;border-radius:9999px}
                .sc-arrow{color:#404752;transition:all .15s ease;font-size:16px}
                .session-card:hover .sc-arrow{color:#e5e2e1;transform:translateX(3px)}

                /* HOW IT WORKS */
                .how-section{padding:20px;background:rgba(27,27,28,.6);border-radius:8px;border:1px solid rgba(64,71,82,.08)}
                .how-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;margin-top:16px}
                .how-step{display:flex;gap:14px}
                .how-num-col{display:flex;flex-direction:column;align-items:center;flex-shrink:0}
                .how-icon{width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
                .how-icon .material-symbols-outlined{font-size:16px}
                .hi-1{background:rgba(97,218,193,.1);color:#61dac1}
                .hi-2{background:rgba(163,201,255,.1);color:#A3C9FF}
                .hi-3{background:rgba(168,85,247,.1);color:#a855f7}
                .how-connector{width:1px;flex:1;background:rgba(64,71,82,.2);margin-top:8px}
                .how-content span{font-family:'Fira Code',monospace;font-size:.5625rem;font-weight:700;color:#8a919e;letter-spacing:.1em}
                .how-content h3{font-size:.8125rem;font-weight:600;color:#e5e2e1;margin-top:4px}
                .how-content p{font-size:.6875rem;color:#8a919e;line-height:1.5;margin-top:4px}

                /* ROW LAYOUTS */
                .row{display:flex;gap:12px;min-height:0;flex:1}
                .col{display:flex;flex-direction:column;gap:12px;min-height:0;flex:1}
                .col-narrow{flex:0 0 260px}

                /* CARDS */
                .card{background:#1B1B1C;border-radius:8px;border:1px solid rgba(64,71,82,.08);overflow:hidden;display:flex;flex-direction:column}
                .card-head{display:flex;align-items:center;justify-content:space-between;padding:14px 18px 10px;flex-shrink:0}
                .card-head h2{font-family:'Space Grotesk',sans-serif;font-size:.6875rem;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:#e5e2e1}
                .card-head .material-symbols-outlined{font-size:16px;color:#8a919e;cursor:pointer;transition:color .15s ease}
                .card-head .material-symbols-outlined:hover{color:#e5e2e1}
                .card-body{flex:1;overflow-y:auto;padding:0 12px 12px;min-height:0}

                /* PROJECT ITEM */
                .proj{display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:6px;cursor:pointer;transition:background .15s ease}
                .proj:hover{background:rgba(53,53,53,.4)}
                .proj-icon{width:34px;height:34px;border-radius:50%;background:#202020;display:flex;align-items:center;justify-content:center;flex-shrink:0;border:1px solid rgba(64,71,82,.15)}
                .proj-icon .material-symbols-outlined{font-size:16px}
                .proj-info{flex:1;min-width:0}
                .proj-name{font-size:.75rem;font-weight:600;color:#e5e2e1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
                .proj-desc{font-size:.5625rem;color:#8a919e;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
                .proj-meta{display:flex;align-items:center;gap:8px;margin-top:2px}
                .proj-meta-time{font-size:.5625rem;color:#8a919e}
                .proj-meta-docs{font-size:.5625rem;color:#8a919e}
                .proj-meta-dur{font-size:.5625rem;color:#8a919e}
                .proj-right{display:flex;align-items:center;gap:8px;flex-shrink:0}
                .proj-badge{font-size:.5rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;padding:2px 8px;border-radius:9999px}
                .b-run{background:rgba(97,218,193,.12);color:#61dac1}
                .b-done{background:rgba(163,201,255,.1);color:#A3C9FF}
                .b-pend{background:rgba(192,199,212,.08);color:#8a919e}
                .b-err{background:rgba(255,180,171,.1);color:#ffb4ab}
                .proj-arrow{color:#404752;transition:color .15s ease;font-size:14px}
                .proj:hover .proj-arrow{color:#C0C7D4}

                /* ACTIVITY */
                .act{display:flex;gap:12px;padding:8px 12px;border-radius:6px;transition:background .15s ease}
                .act:hover{background:rgba(53,53,53,.3)}
                .act-dots{display:flex;flex-direction:column;align-items:center;gap:2px;padding-top:4px;flex-shrink:0}
                .act-dot{width:7px;height:7px;border-radius:50%}
                .ad-green{background:#61dac1;box-shadow:0 0 5px rgba(97,218,193,.4)}
                .ad-blue{background:#A3C9FF;box-shadow:0 0 5px rgba(163,201,255,.4)}
                .ad-amber{background:#fbbf24;box-shadow:0 0 5px rgba(251,191,36,.4)}
                .ad-gray{background:#404752}
                .act-line{width:1px;height:16px;background:rgba(64,71,82,.2)}
                .act-info{flex:1;min-width:0}
                .act-title{font-size:.6875rem;color:#e5e2e1;line-height:1.35}
                .act-title strong{font-weight:600}
                .act-time{font-size:.5625rem;color:#8a919e;margin-top:2px}

                /* PIPELINE STEPS */
                .pipe-item{display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:6px}
                .pipe-bar{width:4px;height:40px;border-radius:9999px;flex-shrink:0}
                .pb-green{background:#61dac1}
                .pb-blue{background:#0078D4;animation:pulse-bar 2s infinite}
                @keyframes pulse-bar{0%,100%{opacity:1}50%{opacity:.4}}
                .pb-gray{background:#353535}
                .pipe-info{flex:1;min-width:0}
                .pipe-name{font-size:.6875rem;color:#e5e2e1;font-weight:500}
                .pipe-desc{font-size:.5625rem;color:#8a919e;margin-top:1px}
                .pipe-status{font-size:.5rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;padding:2px 8px;border-radius:9999px;flex-shrink:0}
                .ps-done{background:rgba(97,218,193,.1);color:#61dac1}
                .ps-run{background:rgba(0,120,212,.12);color:#A3C9FF}
                .ps-wait{background:rgba(53,53,53,.5);color:#8a919e}

                /* QUICK ACTIONS */
                .qa-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
                .qa{background:#1B1B1C;border-radius:8px;padding:16px 12px;border:1px solid rgba(64,71,82,.08);cursor:pointer;transition:all .15s ease;display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center}
                .qa:hover{background:#202020;border-color:rgba(64,71,82,.2);transform:translateY(-1px)}
                .qa:active{transform:scale(.98)}
                .qa-icon{width:36px;height:36px;border-radius:8px;display:flex;align-items:center;justify-content:center}
                .qa-icon .material-symbols-outlined{font-size:18px}
                .qi-primary{background:linear-gradient(135deg,rgba(163,201,255,.15),rgba(0,120,212,.15));color:#A3C9FF}
                .qi-secondary{background:rgba(53,53,53,.4);color:#C0C7D4}
                .qi-tertiary{background:rgba(97,218,193,.1);color:#61dac1}
                .qi-amber{background:rgba(251,191,36,.1);color:#fbbf24}
                .qa-label{font-size:.6875rem;font-weight:600;color:#e5e2e1}
                .qa-desc{font-size:.5625rem;color:#8a919e;line-height:1.4}

                /* LOG LINE */
                .log{display:flex;align-items:center;gap:10px;padding:6px 12px;font-family:'Fira Code',monospace;font-size:.5625rem;border-radius:4px}
                .log:hover{background:rgba(53,53,53,.2)}
                .log-ts{color:#8a919e;flex-shrink:0;width:62px}
                .log-tag{padding:1px 6px;border-radius:3px;font-weight:700;text-transform:uppercase;flex-shrink:0;width:56px;text-align:center}
                .lt-ok{background:rgba(97,218,193,.1);color:#61dac1}
                .lt-info{background:rgba(163,201,255,.08);color:#A3C9FF}
                .lt-warn{background:rgba(251,191,36,.1);color:#fbbf24}
                .log-msg{color:#C0C7D4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
            </style>
        </head>
        <body>
            <div class="page">
                <!-- ROW 1: Welcome + Connection -->
                <div class="welcome-strip">
                    <div class="welcome-left">
                        <div class="welcome-avatar"><span class="material-symbols-outlined">person</span><div class="w-dot ${connected ? '' : 'off'}"></div></div>
                        <div class="welcome-text">
                            <h1>${firstName ? 'Good to see you, ' + firstName + ' 👋' : 'Welcome to Genesis'}</h1>
                            <p>${connected ? 'Here\'s your Genesis workspace overview' : 'Connect your API key in Settings to get started'}</p>
                        </div>
                    </div>
                    <div class="welcome-right">
                        ${isAdmin ? '<div class="admin-badge"><span class="material-symbols-outlined">shield</span><span>Admin</span></div>' : ''}
                        <div class="welcome-clock">
                            <div class="time" id="clock-time">--:--:--</div>
                            <div class="date" id="clock-date">---</div>
                        </div>
                        <div class="conn-badge ${connected ? '' : 'off'}"><div class="conn-dot"></div><span>${connected ? 'Cloud Connected' : 'Offline'}</span></div>
                    </div>
                </div>

                <!-- ROW 2: Stats -->
                <div class="stats-row">
                    <div class="stat-card"><div class="stat-icon si-blue"><span class="material-symbols-outlined">folder</span></div><div><div class="stat-val">${total}</div><div class="stat-lbl">Total Workflows</div></div></div>
                    <div class="stat-card"><div class="stat-icon si-green"><span class="material-symbols-outlined">sync</span></div><div><div class="stat-val">${running}</div><div class="stat-lbl">Running</div></div></div>
                    <div class="stat-card"><div class="stat-icon si-blue"><span class="material-symbols-outlined">check_circle</span></div><div><div class="stat-val">${completed}</div><div class="stat-lbl">Completed</div></div></div>
                    <div class="stat-card"><div class="stat-icon si-purple"><span class="material-symbols-outlined">description</span></div><div><div class="stat-val">20</div><div class="stat-lbl">SDLC Documents</div></div></div>
                </div>

                <!-- ROW 3: Start a New Session (from GitHub design) -->
                <div>
                    <div class="section-header">
                        <div>
                            <h2>Start a New Session</h2>
                            <p>Choose how you want to provide your product requirements</p>
                        </div>
                        <span class="section-badge">20 AI agents → 20 documents</span>
                    </div>
                    <div class="session-grid">
                        <div class="session-card sc-voice" onclick="handleAction('new-project')">
                            <div class="sc-icon"><span class="material-symbols-outlined">mic</span></div>
                            <div class="sc-title">Voice Session</div>
                            <div class="sc-desc">Describe your product idea in a 5-minute conversation with our AI interviewer.</div>
                            <div class="sc-footer">
                                <span class="sc-badge">Most popular</span>
                                <span class="material-symbols-outlined sc-arrow">arrow_forward</span>
                            </div>
                        </div>
                        <div class="session-card sc-upload" onclick="handleAction('new-project')">
                            <div class="sc-icon"><span class="material-symbols-outlined">upload_file</span></div>
                            <div class="sc-title">Upload Document</div>
                            <div class="sc-desc">Upload a PDF or DOCX with your existing requirements or specifications.</div>
                            <div class="sc-footer">
                                <span class="sc-badge">PDF & DOCX</span>
                                <span class="material-symbols-outlined sc-arrow">arrow_forward</span>
                            </div>
                        </div>
                        <div class="session-card sc-text" onclick="handleAction('new-project')">
                            <div class="sc-icon"><span class="material-symbols-outlined">text_fields</span></div>
                            <div class="sc-title">Text / Paste</div>
                            <div class="sc-desc">Type or paste your product description, notes, or requirements directly.</div>
                            <div class="sc-footer">
                                <span class="sc-badge">Quick start</span>
                                <span class="material-symbols-outlined sc-arrow">arrow_forward</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- ROW 4: How It Works (from GitHub design) -->
                <div class="how-section">
                    <h2>How It Works</h2>
                    <div class="how-grid">
                        <div class="how-step">
                            <div class="how-num-col">
                                <div class="how-icon hi-1"><span class="material-symbols-outlined">mic</span></div>
                                <div class="how-connector"></div>
                            </div>
                            <div class="how-content">
                                <span>STEP 01</span>
                                <h3>Describe your vision</h3>
                                <p>Use voice, upload a document, or paste text — any format works.</p>
                            </div>
                        </div>
                        <div class="how-step">
                            <div class="how-num-col">
                                <div class="how-icon hi-2"><span class="material-symbols-outlined">bolt</span></div>
                                <div class="how-connector"></div>
                            </div>
                            <div class="how-content">
                                <span>STEP 02</span>
                                <h3>20 agents process it</h3>
                                <p>Our specialised AI swarm runs in parallel — Vision, BRD, PRD, Architecture and more.</p>
                            </div>
                        </div>
                        <div class="how-step">
                            <div class="how-num-col">
                                <div class="how-icon hi-3"><span class="material-symbols-outlined">inventory_2</span></div>
                            </div>
                            <div class="how-content">
                                <span>STEP 03</span>
                                <h3>Download your SDLC pack</h3>
                                <p>20 professional documents ready to share with your team or stakeholders.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- ROW 5: Projects + Activity + Pipeline -->
                <div class="row">
                    <!-- Col 1: Recent Sessions -->
                    <div class="col">
                        <div class="card" style="flex:1">
                            <div class="card-head">
                                <h2>Recent Sessions</h2>
                                <span class="material-symbols-outlined" onclick="handleAction('open-workflows')" style="cursor:pointer">arrow_outward</span>
                            </div>
                            <div class="card-body">
                                ${projHtml || '<div style="padding:24px;text-align:center;color:#8a919e;font-size:.75rem">No workflows yet.<br><small>Start your first session above.</small></div>'}
                            </div>
                        </div>
                    </div>

                    <!-- Col 2: Activity Feed -->
                    <div class="col col-narrow">
                        <div class="card" style="flex:1">
                            <div class="card-head"><h2>Activity</h2><span class="material-symbols-outlined">more_horiz</span></div>
                            <div class="card-body">
                                ${hasRunning ? `
                                <div class="act"><div class="act-dots"><div class="act-dot ad-green"></div><div class="act-line"></div></div><div class="act-info"><div class="act-title"><strong>Pipeline running</strong> for ${runningWf.workflowName}</div><div class="act-time">Active now</div></div></div>
                                ` : ''}
                                ${recent.slice(0, 5).map((wf: WorkflowWithStatus) => {
                                    const dotCls = wf.status === 'completed' ? 'ad-green' : wf.status === 'running' ? 'ad-blue' : wf.status === 'failed' ? 'ad-amber' : 'ad-gray';
                                    return `<div class="act"><div class="act-dots"><div class="act-dot ${dotCls}"></div><div class="act-line"></div></div><div class="act-info"><div class="act-title"><strong>${wf.status === 'running' ? 'Pipeline started' : wf.status === 'completed' ? 'Pipeline completed' : wf.status === 'failed' ? 'Pipeline failed' : 'Created'}</strong> ${wf.workflowName}</div><div class="act-time">${this._timeAgo(wf.createdAt)}</div></div></div>`;
                                }).join('')}
                            </div>
                        </div>
                    </div>

                    <!-- Col 3: Pipeline + System -->
                    <div class="col col-narrow">
                        ${hasRunning ? `
                        <div class="card">
                            <div class="card-head"><h2>Live Pipeline</h2><span class="material-symbols-outlined" style="color:#61dac1">insights</span></div>
                            <div class="card-body">
                                <div class="pipe-item"><div class="pipe-bar pb-green"></div><div class="pipe-info"><div class="pipe-name">Requirement Parsing</div><div class="pipe-desc">${runningWf.workflowName}</div></div><span class="pipe-status ps-done">Done</span></div>
                                <div class="pipe-item"><div class="pipe-bar pb-blue"></div><div class="pipe-info"><div class="pipe-name">Document Generation</div><div class="pipe-desc">${runningWf.currentStep}/${runningWf.totalSteps} steps</div></div><span class="pipe-status ps-run">Active</span></div>
                                <div class="pipe-item"><div class="pipe-bar pb-gray"></div><div class="pipe-info"><div class="pipe-name">Final Review</div><div class="pipe-desc">Waiting...</div></div><span class="pipe-status ps-wait">Queued</span></div>
                            </div>
                        </div>` : ''}
                        <div class="card" ${hasRunning ? '' : 'style="flex:1"'}>
                            <div class="card-head"><h2>System</h2></div>
                            <div class="card-body" style="padding-top:8px">
                                <div class="pipe-item"><div class="pipe-bar ${connected ? 'pb-green' : 'pb-gray'}"></div><div class="pipe-info"><div class="pipe-name">API Connection</div><div class="pipe-desc">${connected ? 'Connected to Genesis Cloud' : 'Not connected'}</div></div><span class="pipe-status ${connected ? 'ps-done' : 'ps-wait'}">${connected ? 'Online' : 'Offline'}</span></div>
                                <div class="pipe-item"><div class="pipe-bar pb-green"></div><div class="pipe-info"><div class="pipe-name">Pipeline Engine</div><div class="pipe-desc">20 AI agents ready</div></div><span class="pipe-status ps-done">Ready</span></div>
                                <div class="pipe-item"><div class="pipe-bar pb-green"></div><div class="pipe-info"><div class="pipe-name">Document Types</div><div class="pipe-desc">Vision, PRD, Architecture & 17 more</div></div><span class="pipe-status ps-done">Ready</span></div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- ROW 6: Quick Actions -->
                <div class="card">
                    <div class="card-head"><h2>Quick Actions</h2></div>
                    <div class="card-body" style="padding-top:4px">
                        <div class="qa-grid">
                            <div class="qa" onclick="handleAction('new-project')"><div class="qa-icon qi-primary"><span class="material-symbols-outlined">add_circle</span></div><div class="qa-label">New Project</div><div class="qa-desc">Start a new AI workflow</div></div>
                            <div class="qa" onclick="handleAction('open-workflows')"><div class="qa-icon qi-secondary"><span class="material-symbols-outlined">folder_open</span></div><div class="qa-label">My Workflows</div><div class="qa-desc">View all pipelines</div></div>
                            <div class="qa" onclick="handleAction('open-settings')"><div class="qa-icon qi-amber"><span class="material-symbols-outlined">settings</span></div><div class="qa-label">Settings</div><div class="qa-desc">API key & config</div></div>
                        </div>
                    </div>
                </div>

                <!-- ROW 7: Terminal Logs -->
                <div class="card">
                    <div class="card-head"><h2>Terminal Output</h2><span class="material-symbols-outlined">terminal</span></div>
                    <div class="card-body" style="background:#0E0E0E;border-radius:0 0 6px 6px;margin:0 -12px -12px;padding:8px 12px">
                        <div class="log"><span class="log-ts">${new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).substring(0,8)}</span><span class="log-tag ${connected ? 'lt-ok' : 'lt-warn'}">${connected ? 'OK' : 'WARN'}</span><span class="log-msg">${connected ? 'Connected to Genesis Cloud API' : 'API key not configured — open Settings'}</span></div>
                        ${recent.slice(0, 3).map((wf: WorkflowWithStatus) => {
                            const tag = wf.status === 'completed' ? 'lt-ok' : wf.status === 'running' ? 'lt-info' : 'lt-info';
                            return `<div class="log"><span class="log-ts">${this._timeAgo(wf.createdAt)}</span><span class="log-tag ${tag}">${wf.status === 'completed' ? 'OK' : wf.status === 'running' ? 'INFO' : 'INFO'}</span><span class="log-msg">${wf.workflowName} — ${wf.status}</span></div>`;
                        }).join('')}
                    </div>
                </div>
            </div>
            <script>
                const vscode=acquireVsCodeApi();
                function updateClock(){
                    const n=new Date();
                    const te=document.getElementById('clock-time');
                    const de=document.getElementById('clock-date');
                    if(te)te.textContent=n.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
                    if(de)de.textContent=n.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'});
                }
                updateClock();setInterval(updateClock,1000);
                function handleAction(c,id,name){vscode.postMessage(id?{command:c,id:id,name:name}:{command:c})}
            </script>
        </body>
        </html>`;
    }
}
