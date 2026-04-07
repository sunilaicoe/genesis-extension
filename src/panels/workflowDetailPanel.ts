import * as vscode from 'vscode';

export class WorkflowDetailPanel {
    public static currentPanel: WorkflowDetailPanel | undefined;
    private _panel: vscode.WebviewPanel;
    private static _onBack: (() => void) | undefined;
    private static _onViewDocument: ((wfName: string, docName: string) => void) | undefined;
    private static _onOpenEditor: ((name: string) => void) | undefined;
    private static _onExport: ((name: string) => void) | undefined;
    private static _onNewProject: (() => void) | undefined;

    public static setOnBack(cb: () => void) { WorkflowDetailPanel._onBack = cb; }
    public static setOnViewDocument(cb: (wfName: string, docName: string) => void) { WorkflowDetailPanel._onViewDocument = cb; }
    public static setOnOpenEditor(cb: (name: string) => void) { WorkflowDetailPanel._onOpenEditor = cb; }
    public static setOnExport(cb: (name: string) => void) { WorkflowDetailPanel._onExport = cb; }
    public static setOnNewProject(cb: () => void) { WorkflowDetailPanel._onNewProject = cb; }

    private constructor(panel: vscode.WebviewPanel, name: string) {
        this._panel = panel;
        panel.webview.html = this._getHtml(name);
        this._panel.onDidDispose(() => { WorkflowDetailPanel.currentPanel = undefined; });
        this._panel.webview.onDidReceiveMessage(message => {
            switch (message.command) {
                case 'back-to-workflows': this._confirmBack(); break;
                case 'view-document': if (WorkflowDetailPanel._onViewDocument) WorkflowDetailPanel._onViewDocument(name, message.doc); break;
                case 'open-editor': if (WorkflowDetailPanel._onOpenEditor) WorkflowDetailPanel._onOpenEditor(name); break;
                case 'export': if (WorkflowDetailPanel._onExport) WorkflowDetailPanel._onExport(name); break;
                case 'new-project': if (WorkflowDetailPanel._onNewProject) WorkflowDetailPanel._onNewProject(); break;
                case 'run-pipeline': vscode.window.showInformationMessage('Pipeline started for ' + name); break;
                case 'pause-pipeline': vscode.window.showInformationMessage('Pipeline paused'); break;
                case 'stop-pipeline': vscode.window.showWarningMessage('Stop pipeline?', { modal: true }, 'Stop', 'Cancel').then(s => { if (s === 'Stop') vscode.window.showInformationMessage('Pipeline stopped'); }); break;
            }
        });
    }

    public static open(extensionUri: vscode.Uri, name: string) {
        if (WorkflowDetailPanel.currentPanel) { WorkflowDetailPanel.currentPanel._panel.dispose(); }
        const panel = vscode.window.createWebviewPanel('genesis-workflow-detail', name, vscode.ViewColumn.One, {
            enableScripts: true, retainContextWhenHidden: true, localResourceRoots: [extensionUri]
        });
        WorkflowDetailPanel.currentPanel = new WorkflowDetailPanel(panel, name);
    }

    public static close() {
        if (WorkflowDetailPanel.currentPanel) { WorkflowDetailPanel.currentPanel._panel.dispose(); }
    }

    private _confirmBack() {
        vscode.window.showWarningMessage('Go back to Workflows list? Unsaved changes may be lost.', { modal: true }, 'Yes', 'No').then(s => {
            if (s === 'Yes') { this._panel.dispose(); if (WorkflowDetailPanel._onBack) WorkflowDetailPanel._onBack(); }
        });
    }

    private _getHtml(name: string): string {
        return /*html*/ `
        <!DOCTYPE html>
        <html class="dark" lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${name}</title>
            <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&family=Fira+Code:wght@400;500&display=swap" rel="stylesheet">
            <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet">
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&family=Fira+Code:wght@400;500&display=swap');
                @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');
                *{margin:0;padding:0;box-sizing:border-box}
                .material-symbols-outlined{font-variation-settings:'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24;font-family:'Material Symbols Outlined'}
                body{font-family:'Inter',sans-serif;background-color:#131313;color:#e5e2e1;margin:0;height:100vh;display:flex;flex-direction:column}
                ::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:#353535;border-radius:10px}::-webkit-scrollbar-thumb:hover{background:#404751}
                .page{flex:1;display:flex;flex-direction:column;gap:16px;padding:16px 20px;overflow-y:auto;min-height:0}

                /* HEADER */
                .header{display:flex;align-items:center;gap:14px;padding:16px 20px;background:#1B1B1C;border-radius:8px;border:1px solid rgba(64,71,82,.08);flex-shrink:0}
                .back-btn{display:flex;align-items:center;gap:6px;padding:6px 14px;background:#202020;border:1px solid rgba(64,71,82,.15);border-radius:6px;color:#C0C7D4;font-size:.6875rem;font-weight:600;cursor:pointer;transition:all .15s ease;font-family:'Inter',sans-serif}
                .back-btn:hover{background:#353535;color:#e5e2e1}
                .back-btn .material-symbols-outlined{font-size:16px}
                .header-info{flex:1}
                .header-info h1{font-family:'Space Grotesk',sans-serif;font-size:1rem;font-weight:700;color:#e5e2e1}
                .header-info p{font-size:.6875rem;color:#8a919e}
                .header-badge{display:flex;align-items:center;gap:6px;padding:6px 14px;background:rgba(97,218,193,.08);border:1px solid rgba(97,218,193,.15);border-radius:9999px}
                .header-dot{width:8px;height:8px;border-radius:50%;background:#61dac1;animation:blink 2s infinite}
                @keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}
                .header-badge span{font-size:.625rem;color:#61dac1;font-weight:700;text-transform:uppercase;letter-spacing:.04em}

                /* GLOBAL PROGRESS */
                .progress-section{display:flex;justify-content:space-between;align-items:flex-end;flex-shrink:0}
                .progress-left p{font-size:.6875rem;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#A3C9FF;margin-bottom:4px}
                .progress-left h2{font-family:'Space Grotesk',sans-serif;font-size:1.5rem;font-weight:700;color:#e5e2e1}
                .progress-right{text-align:right}
                .progress-pct{font-family:'Fira Code',monospace;font-size:1.75rem;font-weight:700;color:#A3C9FF}
                .progress-label{font-size:.625rem;color:#8a919e;text-transform:uppercase}
                .global-bar{height:6px;background:#202020;border-radius:9999px;overflow:hidden;flex-shrink:0}
                .global-fill{height:100%;background:linear-gradient(90deg,#A3C9FF,#0078D4);border-radius:9999px;transition:width 1s ease}

                /* PHASE GRID */
                .phase-grid{display:grid;grid-template-columns:1fr 1fr;gap:1px;background:rgba(64,71,82,.2);border-radius:8px;overflow:visible;border:1px solid rgba(64,71,82,.2)}
                .phase-card{background:#202020;padding:24px;display:flex;flex-direction:column;justify-content:space-between;min-height:240px;cursor:pointer;transition:background .15s ease}
                .phase-card:hover{background:#252525}
                .phase-top{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px}
                .phase-label{font-size:.625rem;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:#8a919e;margin-bottom:4px}
                .phase-name{font-size:.9375rem;font-weight:700;color:#e5e2e1}
                .phase-icon{font-size:22px;color:#8a919e}
                .phase-icon.pi-done{color:#61dac1}
                .phase-icon.pi-active{color:#A3C9FF;animation:pulse 2s infinite}
                @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}

                /* SUB-ITEMS */
                .sub-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:24px}
                .sub-item{aspect-ratio:1;background:#2a2a2a;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:8px;border:1px solid transparent;border-radius:4px;transition:all .15s ease;cursor:help}
                .sub-item:hover{border-color:rgba(163,201,255,.4)}
                .sub-item .material-symbols-outlined{font-size:18px;color:#8a919e;margin-bottom:4px}
                .sub-item.si-done .material-symbols-outlined{color:#61dac1}
                .sub-item.si-active{border-color:rgba(163,201,255,.4)}
                .sub-item.si-active .material-symbols-outlined{color:#A3C9FF}
                .sub-item.si-pending{opacity:.4}
                .sub-item span{font-size:.5rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#8a919e}
                .sub-item.si-active span{color:#A3C9FF}

                /* PHASE PROGRESS */
                .phase-bottom{}
                .phase-progress-row{display:flex;justify-content:space-between;font-size:.625rem;font-weight:700;text-transform:uppercase;margin-bottom:6px}
                .phase-progress-row.ppr-done{color:#C0C7D4}
                .phase-progress-row.ppr-active .ppr-status{color:#A3C9FF}
                .phase-progress-row.ppr-pending{color:#8a919e}
                .phase-bar{height:4px;background:#353535;border-radius:9999px;overflow:hidden}
                .phase-fill{height:100%;border-radius:9999px}
                .pf-done{background:#61dac1}
                .pf-active{background:linear-gradient(90deg,#A3C9FF,#0078D4)}
                .pf-pending{background:#353535}

                /* SUMMARY ROW */
                .summary-row{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;flex-shrink:0}
                .summary-card{background:#202020;padding:18px;border-left:2px solid #0078D4;border-radius:0 6px 6px 0}
                .summary-card .sc-label{font-size:.5625rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#8a919e;margin-bottom:6px}
                .summary-card .sc-value{font-family:'Space Grotesk',sans-serif;font-size:1.25rem;font-weight:700;color:#e5e2e1}
                .summary-card .sc-value.green{color:#61dac1}
                .summary-card .sc-value.blue{color:#A3C9FF}
                .summary-card .sc-sub{font-size:.5625rem;color:#8a919e;margin-top:2px}
                .agent-avatars{display:flex;margin-top:4px}
                .agent-avatar{width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:.5625rem;font-weight:700;border:2px solid #202020;margin-left:-6px}
                .agent-avatar:first-child{margin-left:0}
                .aa-v{background:#A3C9FF;color:#131313}
                .aa-p{background:#0078D4;color:#fff}
                .aa-s{background:#393939;color:#e5e2e1}

                /* DOCUMENTS SECTION */
                .docs-section{flex-shrink:0}
                .docs-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
                .docs-header h2{font-family:'Space Grotesk',sans-serif;font-size:.75rem;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:#e5e2e1}
                .docs-header .material-symbols-outlined{font-size:16px;color:#8a919e;cursor:pointer}
                .docs-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:8px}
                .doc-card{background:#1B1B1C;border:1px solid rgba(64,71,82,.08);border-radius:8px;padding:14px;display:flex;align-items:center;gap:12px;cursor:pointer;transition:all .15s ease}
                .doc-card:hover{background:#202020;border-color:rgba(64,71,82,.2);transform:translateY(-1px)}
                .doc-card .dc-icon{width:36px;height:36px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
                .doc-card .dc-icon .material-symbols-outlined{font-size:18px}
                .dc-done{background:rgba(97,218,193,.12);color:#61dac1}
                .dc-active{background:rgba(163,201,255,.12);color:#A3C9FF}
                .dc-pending{background:rgba(53,53,53,.5);color:#8a919e}
                .dc-info{flex:1;min-width:0}
                .dc-name{font-size:.6875rem;font-weight:600;color:#e5e2e1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
                .dc-desc{font-size:.5rem;color:#8a919e}
                .dc-status{font-size:.5rem;font-weight:700;text-transform:uppercase;flex-shrink:0}
                .ds-green{color:#61dac1}
                .ds-blue{color:#A3C9FF}
                .ds-gray{color:#8a919e}

                /* ACTION BAR */
                .action-bar{display:flex;gap:10px;flex-shrink:0;padding-top:4px}
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
                        <h1>${name}</h1>
                        <p>AI-powered SDLC pipeline workflow</p>
                    </div>
                    <div class="header-badge"><div class="header-dot"></div><span>Running</span></div>
                </div>

                <!-- GLOBAL PROGRESS -->
                <div class="progress-section">
                    <div class="progress-left">
                        <p>Genesis AI Orchestration</p>
                        <h2>Active Pipeline: ${name}</h2>
                    </div>
                    <div class="progress-right">
                        <div class="progress-pct">45%</div>
                        <div class="progress-label">Global Completion</div>
                    </div>
                </div>
                <div class="global-bar"><div class="global-fill" style="width:45%"></div></div>

                <!-- PHASE GRID -->
                <div class="phase-grid">
                    <!-- Phase 01: Strategic Foundation -->
                    <div class="phase-card" onclick="handleAction('view-document','Vision Strategy')">
                        <div>
                            <div class="phase-top">
                                <div><div class="phase-label">Phase 01</div><div class="phase-name">Strategic Foundation</div></div>
                                <span class="material-symbols-outlined phase-icon pi-done" style="font-variation-settings:'FILL' 1">check_circle</span>
                            </div>
                            <div class="sub-grid">
                                <div class="sub-item si-done"><span class="material-symbols-outlined">visibility</span><span>Vision</span></div>
                                <div class="sub-item si-done"><span class="material-symbols-outlined">groups</span><span>Persona</span></div>
                                <div class="sub-item si-done"><span class="material-symbols-outlined">query_stats</span><span>Market</span></div>
                                <div class="sub-item si-done"><span class="material-symbols-outlined">psychology</span><span>Logic</span></div>
                            </div>
                        </div>
                        <div class="phase-bottom">
                            <div class="phase-progress-row ppr-done"><span>Status: Complete</span><span>100%</span></div>
                            <div class="phase-bar"><div class="phase-fill pf-done" style="width:100%"></div></div>
                        </div>
                    </div>

                    <!-- Phase 02: Architectural Planning -->
                    <div class="phase-card" onclick="handleAction('view-document','Technical Architecture')">
                        <div>
                            <div class="phase-top">
                                <div><div class="phase-label">Phase 02</div><div class="phase-name">Architectural Planning</div></div>
                                <span class="material-symbols-outlined phase-icon pi-active">sync</span>
                            </div>
                            <div class="sub-grid">
                                <div class="sub-item si-active"><span class="material-symbols-outlined">schema</span><span>Schema</span></div>
                                <div class="sub-item"><span class="material-symbols-outlined">route</span><span>Router</span></div>
                                <div class="sub-item"><span class="material-symbols-outlined">database</span><span>Data</span></div>
                                <div class="sub-item"><span class="material-symbols-outlined">api</span><span>API</span></div>
                            </div>
                        </div>
                        <div class="phase-bottom">
                            <div class="phase-progress-row ppr-active"><span class="ppr-status">Status: Orchestrating...</span><span>78%</span></div>
                            <div class="phase-bar"><div class="phase-fill pf-active" style="width:78%"></div></div>
                        </div>
                    </div>

                    <!-- Phase 03: Technical Implementation -->
                    <div class="phase-card">
                        <div>
                            <div class="phase-top">
                                <div><div class="phase-label">Phase 03</div><div class="phase-name">Technical Implementation</div></div>
                                <span class="material-symbols-outlined phase-icon">hourglass_empty</span>
                            </div>
                            <div class="sub-grid">
                                <div class="sub-item si-pending"><span class="material-symbols-outlined">terminal</span><span>CLI</span></div>
                                <div class="sub-item si-pending"><span class="material-symbols-outlined">javascript</span><span>React</span></div>
                                <div class="sub-item si-pending"><span class="material-symbols-outlined">settings_ethernet</span><span>Socket</span></div>
                                <div class="sub-item si-pending"><span class="material-symbols-outlined">lock</span><span>Auth</span></div>
                            </div>
                        </div>
                        <div class="phase-bottom">
                            <div class="phase-progress-row ppr-pending"><span>Status: Queued</span><span>0%</span></div>
                            <div class="phase-bar"><div class="phase-fill pf-pending" style="width:0%"></div></div>
                        </div>
                    </div>

                    <!-- Phase 04: Design & Delivery -->
                    <div class="phase-card">
                        <div>
                            <div class="phase-top">
                                <div><div class="phase-label">Phase 04</div><div class="phase-name">Design & Delivery</div></div>
                                <span class="material-symbols-outlined phase-icon">pending_actions</span>
                            </div>
                            <div class="sub-grid">
                                <div class="sub-item si-pending"><span class="material-symbols-outlined">palette</span><span>UI</span></div>
                                <div class="sub-item si-pending"><span class="material-symbols-outlined">gesture</span><span>UX</span></div>
                                <div class="sub-item si-pending"><span class="material-symbols-outlined">rocket_launch</span><span>Deploy</span></div>
                                <div class="sub-item si-pending"><span class="material-symbols-outlined">inventory_2</span><span>Assets</span></div>
                            </div>
                        </div>
                        <div class="phase-bottom">
                            <div class="phase-progress-row ppr-pending"><span>Status: Pending</span><span>0%</span></div>
                            <div class="phase-bar"><div class="phase-fill pf-pending" style="width:0%"></div></div>
                        </div>
                    </div>
                </div>

                <!-- SUMMARY ROW -->
                <div class="summary-row">
                    <div class="summary-card">
                        <div class="sc-label">Active Agents</div>
                        <div class="agent-avatars">
                            <div class="agent-avatar aa-v">V</div>
                            <div class="agent-avatar aa-p">P</div>
                            <div class="agent-avatar aa-s">S</div>
                        </div>
                    </div>
                    <div class="summary-card">
                        <div class="sc-label">Tokens Consumed</div>
                        <div class="sc-value blue">124,502 <span style="font-size:.625rem;font-weight:400;opacity:.5">TX</span></div>
                    </div>
                    <div class="summary-card">
                        <div class="sc-label">Estimated Time</div>
                        <div class="sc-value green">04:12 <span style="font-size:.625rem;font-weight:400;opacity:.5">REMAINING</span></div>
                    </div>
                </div>

                <!-- GENERATED DOCUMENTS -->
                <div class="docs-section">
                    <div class="docs-header">
                        <h2>Generated Documents <span style="color:#8a919e;font-weight:400;font-size:.625rem;letter-spacing:0;text-transform:none">(20 total)</span></h2>
                        <span class="material-symbols-outlined" onclick="handleAction('export')">ios_share</span>
                    </div>
                    <div class="docs-grid">
                        <div class="doc-card" onclick="handleAction('view-document','Vision & Strategy')">
                            <div class="dc-icon dc-done"><span class="material-symbols-outlined">lightbulb</span></div>
                            <div class="dc-info"><div class="dc-name">Vision & Strategy</div><div class="dc-desc">Strategic alignment & business goals</div></div>
                            <span class="dc-status ds-green">Done</span>
                        </div>
                        <div class="doc-card" onclick="handleAction('view-document','User Personas')">
                            <div class="dc-icon dc-done"><span class="material-symbols-outlined">groups</span></div>
                            <div class="dc-info"><div class="dc-name">User Personas</div><div class="dc-desc">Target audience definitions</div></div>
                            <span class="dc-status ds-green">Done</span>
                        </div>
                        <div class="doc-card" onclick="handleAction('view-document','Product Roadmap')">
                            <div class="dc-icon dc-done"><span class="material-symbols-outlined">map</span></div>
                            <div class="dc-info"><div class="dc-name">Product Roadmap</div><div class="dc-desc">Phase-wise delivery plan</div></div>
                            <span class="dc-status ds-green">Done</span>
                        </div>
                        <div class="doc-card" onclick="handleAction('view-document','GTM Strategy')">
                            <div class="dc-icon dc-done"><span class="material-symbols-outlined">trending_up</span></div>
                            <div class="dc-info"><div class="dc-name">GTM Strategy</div><div class="dc-desc">Go-to-market positioning</div></div>
                            <span class="dc-status ds-green">Done</span>
                        </div>
                        <div class="doc-card" onclick="handleAction('view-document','Strategic Use Cases')">
                            <div class="dc-icon dc-active"><span class="material-symbols-outlined">account_tree</span></div>
                            <div class="dc-info"><div class="dc-name">Strategic Use Cases</div><div class="dc-desc">Generating requirements...</div></div>
                            <span class="dc-status ds-blue">Running</span>
                        </div>
                        <div class="doc-card" onclick="handleAction('view-document','UI Flows & Navigation')">
                            <div class="dc-icon dc-active"><span class="material-symbols-outlined">route</span></div>
                            <div class="dc-info"><div class="dc-name">UI Flows & Navigation</div><div class="dc-desc">Generating navigation flows...</div></div>
                            <span class="dc-status ds-blue">Running</span>
                        </div>
                        <div class="doc-card">
                            <div class="dc-icon dc-pending"><span class="material-symbols-outlined">dataset</span></div>
                            <div class="dc-info"><div class="dc-name">Synthetic Data Schema</div><div class="dc-desc">Data models & relationships</div></div>
                            <span class="dc-status ds-gray">Pending</span>
                        </div>
                        <div class="doc-card">
                            <div class="dc-icon dc-pending"><span class="material-symbols-outlined">description</span></div>
                            <div class="dc-info"><div class="dc-name">Product Requirements Doc</div><div class="dc-desc">PRD with feature specifications</div></div>
                            <span class="dc-status ds-gray">Pending</span>
                        </div>
                        <div class="doc-card">
                            <div class="dc-icon dc-pending"><span class="material-symbols-outlined">architecture</span></div>
                            <div class="dc-info"><div class="dc-name">Technical Architecture</div><div class="dc-desc">System design & components</div></div>
                            <span class="dc-status ds-gray">Pending</span>
                        </div>
                        <div class="doc-card">
                            <div class="dc-icon dc-pending"><span class="material-symbols-outlined">database</span></div>
                            <div class="dc-info"><div class="dc-name">Database Design</div><div class="dc-desc">Entity relationship diagrams</div></div>
                            <span class="dc-status ds-gray">Pending</span>
                        </div>
                        <div class="doc-card">
                            <div class="dc-icon dc-pending"><span class="material-symbols-outlined">api</span></div>
                            <div class="dc-info"><div class="dc-name">API Specifications</div><div class="dc-desc">REST/GraphQL endpoint specs</div></div>
                            <span class="dc-status ds-gray">Pending</span>
                        </div>
                        <div class="doc-card">
                            <div class="dc-icon dc-pending"><span class="material-symbols-outlined">security</span></div>
                            <div class="dc-info"><div class="dc-name">Security Specification</div><div class="dc-desc">Auth, encryption & compliance</div></div>
                            <span class="dc-status ds-gray">Pending</span>
                        </div>
                        <div class="doc-card">
                            <div class="dc-icon dc-pending"><span class="material-symbols-outlined">bug_report</span></div>
                            <div class="dc-info"><div class="dc-name">Testing Strategy</div><div class="dc-desc">Test plans & coverage matrix</div></div>
                            <span class="dc-status ds-gray">Pending</span>
                        </div>
                        <div class="doc-card">
                            <div class="dc-icon dc-pending"><span class="material-symbols-outlined">cloud</span></div>
                            <div class="dc-info"><div class="dc-name">DevOps & Infrastructure</div><div class="dc-desc">CI/CD, containers & hosting</div></div>
                            <span class="dc-status ds-gray">Pending</span>
                        </div>
                        <div class="doc-card">
                            <div class="dc-icon dc-pending"><span class="material-symbols-outlined">layers</span></div>
                            <div class="dc-info"><div class="dc-name">Interactive Mockup</div><div class="dc-desc">Clickable UI prototype</div></div>
                            <span class="dc-status ds-gray">Pending</span>
                        </div>
                        <div class="doc-card">
                            <div class="dc-icon dc-pending"><span class="material-symbols-outlined">palette</span></div>
                            <div class="dc-info"><div class="dc-name">Brand Style Guide</div><div class="dc-desc">Colors, typography & assets</div></div>
                            <span class="dc-status ds-gray">Pending</span>
                        </div>
                        <div class="doc-card">
                            <div class="dc-icon dc-pending"><span class="material-symbols-outlined">business_center</span></div>
                            <div class="dc-info"><div class="dc-name">Business Requirements Doc</div><div class="dc-desc">Stakeholder requirements</div></div>
                            <span class="dc-status ds-gray">Pending</span>
                        </div>
                        <div class="doc-card">
                            <div class="dc-icon dc-pending"><span class="material-symbols-outlined">fact_check</span></div>
                            <div class="dc-info"><div class="dc-name">Functional Requirements</div><div class="dc-desc">Feature-level specifications</div></div>
                            <span class="dc-status ds-gray">Pending</span>
                        </div>
                        <div class="doc-card">
                            <div class="dc-icon dc-pending"><span class="material-symbols-outlined">inventory_2</span></div>
                            <div class="dc-info"><div class="dc-name">Bill of Materials</div><div class="dc-desc">Infrastructure cost estimation</div></div>
                            <span class="dc-status ds-gray">Pending</span>
                        </div>
                        <div class="doc-card">
                            <div class="dc-icon dc-pending"><span class="material-symbols-outlined">rocket_launch</span></div>
                            <div class="dc-info"><div class="dc-name">Implementation Plan</div><div class="dc-desc">Sprint plan & milestones</div></div>
                            <span class="dc-status ds-gray">Pending</span>
                        </div>
                    </div>
                </div>

                <!-- ACTION BAR -->
                <div class="action-bar">
                    <button class="act-btn ab-primary" onclick="handleAction('run-pipeline')"><span class="material-symbols-outlined" style="font-variation-settings:'FILL' 1">play_arrow</span> Run Pipeline</button>
                    <button class="act-btn ab-secondary" onclick="handleAction('pause-pipeline')"><span class="material-symbols-outlined">pause</span> Pause</button>
                    <button class="act-btn ab-secondary" onclick="handleAction('export')"><span class="material-symbols-outlined">ios_share</span> Export</button>
                    <button class="act-btn ab-secondary" onclick="handleAction('open-editor')"><span class="material-symbols-outlined">edit_note</span> Open Editor</button>
                    <button class="act-btn ab-danger" onclick="handleAction('stop-pipeline')"><span class="material-symbols-outlined">stop</span> Stop</button>
                    <button class="act-btn ab-new" onclick="handleAction('new-project')" style="margin-left:auto"><span class="material-symbols-outlined">add</span> New Workflow</button>
                </div>
            </div>
            <script>
                const vscode=acquireVsCodeApi();
                function handleAction(c,d){vscode.postMessage(d?{command:c,doc:d}:{command:c})}
            </script>
        </body>
        </html>`;
    }
}

// ==================== NEW WORKFLOW MODAL ====================
