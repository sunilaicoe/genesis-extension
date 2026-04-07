import * as vscode from 'vscode';

export class HomePage {
    public static currentPanel: HomePage | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private static _onOpenSettings: (() => void) | undefined;

    public static setOnOpenSettings(cb: () => void) { HomePage._onOpenSettings = cb; }

    private constructor(panel: vscode.WebviewPanel) {
        this._panel = panel;
        this._update();
        this._panel.onDidDispose(() => { HomePage.currentPanel = undefined; });
        this._panel.webview.onDidReceiveMessage((message) => {
            switch (message.command) {
                case 'new-project': vscode.window.showInformationMessage('New Project clicked!'); break;
                case 'run-pipeline': vscode.window.showInformationMessage('Run Pipeline clicked!'); break;
                case 'open-project': vscode.window.showInformationMessage('Open project: ' + message.name); break;
                case 'open-settings': if (HomePage._onOpenSettings) HomePage._onOpenSettings(); break;
            }
        });
    }

    public static open(extensionUri: vscode.Uri) {
        if (HomePage.currentPanel) { HomePage.currentPanel._panel.reveal(); return; }
        const panel = vscode.window.createWebviewPanel('genesis-home', 'Genesis Home', vscode.ViewColumn.One, {
            enableScripts: true, retainContextWhenHidden: true, localResourceRoots: [extensionUri]
        });
        HomePage.currentPanel = new HomePage(panel);
    }

    private _update() { this._panel.webview.html = this._getHtml(); }

    private _getHtml(): string {
        return /*html*/ `
        <!DOCTYPE html>
        <html class="dark" lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Genesis Home</title>
            <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&family=Fira+Code:wght@400;500&display=swap" rel="stylesheet">
            <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet">
            <style>
                *{margin:0;padding:0;box-sizing:border-box}
                .material-symbols-outlined{font-variation-settings:'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24}
                body{font-family:'Inter',sans-serif;background-color:#131313;color:#e5e2e1;margin:0;overflow-y:auto;height:100vh;display:flex;flex-direction:column}
                ::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:#353535;border-radius:10px}::-webkit-scrollbar-thumb:hover{background:#404751}
                .font-hl{font-family:'Space Grotesk',sans-serif}
                .page{flex:1;display:flex;flex-direction:column;gap:12px;padding:16px 20px}

                /* ROW LAYOUTS */
                .row{display:flex;gap:12px;min-height:0}
                .row-main{flex:1;min-height:0}
                .col{display:flex;flex-direction:column;gap:12px;min-height:0;flex:1}
                .col-narrow{flex:0 0 260px}
                .col-wide{flex:0 0 340px}

                /* CARDS */
                .card{background:#1B1B1C;border-radius:8px;border:1px solid rgba(64,71,82,.08);overflow:hidden;display:flex;flex-direction:column}
                .card-head{display:flex;align-items:center;justify-content:space-between;padding:14px 18px 10px;flex-shrink:0}
                .card-head h2{font-family:'Space Grotesk',sans-serif;font-size:.6875rem;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:#e5e2e1}
                .card-head .material-symbols-outlined{font-size:16px;color:#8a919e;cursor:pointer;transition:color .15s ease}
                .card-head .material-symbols-outlined:hover{color:#e5e2e1}
                .card-body{flex:1;overflow-y:auto;padding:0 12px 12px;min-height:0}

                /* WELCOME STRIP */
                .welcome-strip{display:flex;align-items:center;justify-content:space-between;padding:14px 20px;background:#1B1B1C;border-radius:8px;border:1px solid rgba(64,71,82,.08);flex-shrink:0}
                .welcome-left{display:flex;align-items:center;gap:16px}
                .welcome-avatar{width:36px;height:36px;border-radius:50%;background:linear-gradient(180deg,#A3C9FF 0%,#0078D4 100%);display:flex;align-items:center;justify-content:center;flex-shrink:0;position:relative}
                .welcome-avatar .material-symbols-outlined{font-size:18px;color:#131313}
                .welcome-avatar .w-dot{position:absolute;bottom:-1px;right:-1px;width:10px;height:10px;border-radius:50%;background:#61dac1;border:2px solid #1B1B1C;box-shadow:0 0 6px rgba(97,218,193,.5)}
                .welcome-text h1{font-family:'Space Grotesk',sans-serif;font-size:1rem;font-weight:700;color:#e5e2e1;line-height:1.2}
                .welcome-text p{font-size:.6875rem;color:#8a919e}
                .welcome-right{display:flex;align-items:center;gap:20px}
                .welcome-clock{text-align:right}
                .welcome-clock .time{font-family:'Fira Code',monospace;font-size:.8125rem;color:#e5e2e1;font-weight:500}
                .welcome-clock .date{font-size:.5625rem;color:#8a919e;text-transform:uppercase;letter-spacing:.08em}
                .conn-badge{display:flex;align-items:center;gap:6px;padding:6px 14px;background:rgba(97,218,193,.08);border-radius:9999px;border:1px solid rgba(97,218,193,.15)}
                .conn-dot{width:6px;height:6px;border-radius:50%;background:#61dac1;animation:blink 2s infinite}
                @keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}
                .conn-badge span{font-size:.625rem;color:#61dac1;font-weight:600;text-transform:uppercase;letter-spacing:.05em}

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

                /* PROJECT ITEM */
                .proj{display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:6px;cursor:pointer;transition:background .15s ease}
                .proj:hover{background:rgba(53,53,53,.4)}
                .proj-icon{width:34px;height:34px;border-radius:6px;background:#202020;display:flex;align-items:center;justify-content:center;flex-shrink:0;border:1px solid rgba(64,71,82,.15)}
                .proj-icon .material-symbols-outlined{font-size:16px;color:#A3C9FF}
                .proj-info{flex:1;min-width:0}
                .proj-name{font-size:.75rem;font-weight:600;color:#e5e2e1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
                .proj-desc{font-size:.5625rem;color:#8a919e;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
                .proj-right{display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0}
                .proj-badge{font-size:.5rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;padding:2px 8px;border-radius:9999px}
                .b-run{background:rgba(97,218,193,.12);color:#61dac1}
                .b-done{background:rgba(163,201,255,.1);color:#A3C9FF}
                .b-pend{background:rgba(192,199,212,.08);color:#8a919e}
                .proj-time{font-size:.5625rem;color:#8a919e}
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

                /* RESOURCE BAR */
                .res-item{display:flex;align-items:center;gap:12px;padding:8px 0}
                .res-label{font-size:.6875rem;color:#C0C7D4;width:70px;flex-shrink:0}
                .res-bar{flex:1;height:6px;background:#0E0E0E;border-radius:9999px;overflow:hidden}
                .res-fill{height:100%;border-radius:9999px;transition:width .6s ease}
                .rf-blue{background:linear-gradient(90deg,#A3C9FF,#0078D4)}
                .rf-green{background:linear-gradient(90deg,#80f7dc,#008672)}
                .rf-amber{background:linear-gradient(90deg,#fde68a,#f59e0b)}
                .rf-purple{background:linear-gradient(90deg,#c4b5fd,#7c3aed)}
                .res-val{font-family:'Fira Code',monospace;font-size:.625rem;color:#C0C7D4;width:40px;text-align:right;flex-shrink:0}

                /* DOCUMENT ROW */
                .doc{display:flex;align-items:center;gap:12px;padding:8px 12px;border-radius:6px;cursor:pointer;transition:background .15s ease}
                .doc:hover{background:rgba(53,53,53,.3)}
                .doc-icon .material-symbols-outlined{font-size:16px;color:#8a919e}
                .doc-info{flex:1;min-width:0}
                .doc-name{font-size:.6875rem;color:#e5e2e1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
                .doc-meta{font-size:.5625rem;color:#8a919e}
                .doc-status{width:20px;height:20px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
                .doc-status .material-symbols-outlined{font-size:14px}
                .ds-done{color:#61dac1}
                .ds-run{color:#A3C9FF}
                .ds-lock{color:#404752}

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
                        <div class="welcome-avatar"><span class="material-symbols-outlined">person</span><div class="w-dot"></div></div>
                        <div class="welcome-text">
                            <h1>Welcome back, John</h1>
                            <p>Here's your Genesis workspace overview</p>
                        </div>
                    </div>
                    <div class="welcome-right">
                        <div class="welcome-clock">
                            <div class="time" id="clock-time">--:--:--</div>
                            <div class="date" id="clock-date">---</div>
                        </div>
                        <div class="conn-badge"><div class="conn-dot"></div><span>Ollama Connected</span></div>
                    </div>
                </div>

                <!-- ROW 2: Stats -->
                <div class="stats-row">
                    <div class="stat-card"><div class="stat-icon si-blue"><span class="material-symbols-outlined">folder</span></div><div><div class="stat-val">3</div><div class="stat-lbl">Active Projects</div></div></div>
                    <div class="stat-card"><div class="stat-icon si-green"><span class="material-symbols-outlined">sync</span></div><div><div class="stat-val">1</div><div class="stat-lbl">Running Pipelines</div></div></div>
                    <div class="stat-card"><div class="stat-icon si-amber"><span class="material-symbols-outlined">smart_toy</span></div><div><div class="stat-val">4</div><div class="stat-lbl">AI Models</div></div></div>
                    <div class="stat-card"><div class="stat-icon si-purple"><span class="material-symbols-outlined">description</span></div><div><div class="stat-val">18</div><div class="stat-lbl">SDLC Documents</div></div></div>
                </div>

                <!-- ROW 3: Projects + Activity + Pipeline -->
                <div class="row row-main">
                    <!-- Col 1: Projects -->
                    <div class="col col-wide">
                        <div class="card" style="flex:1">
                            <div class="card-head"><h2>Recent Projects</h2><span class="material-symbols-outlined">arrow_outward</span></div>
                            <div class="card-body">
                                <div class="proj" onclick="handleAction('open-project','E-Commerce Re-platform')">
                                    <div class="proj-icon"><span class="material-symbols-outlined">shopping_cart</span></div>
                                    <div class="proj-info"><div class="proj-name">E-Commerce Re-platform</div><div class="proj-desc">Micro-frontend migration with real-time inventory</div></div>
                                    <div class="proj-right"><span class="proj-badge b-run">● Running</span><span class="proj-time">2h ago</span></div>
                                    <span class="material-symbols-outlined proj-arrow">chevron_right</span>
                                </div>
                                <div class="proj" onclick="handleAction('open-project','FinTech Wallet API')">
                                    <div class="proj-icon"><span class="material-symbols-outlined">account_balance</span></div>
                                    <div class="proj-info"><div class="proj-name">FinTech Wallet API</div><div class="proj-desc">Payment processing & ledger management</div></div>
                                    <div class="proj-right"><span class="proj-badge b-done">✓ Done</span><span class="proj-time">Yesterday</span></div>
                                    <span class="material-symbols-outlined proj-arrow">chevron_right</span>
                                </div>
                                <div class="proj" onclick="handleAction('open-project','Patient Portal v2')">
                                    <div class="proj-icon"><span class="material-symbols-outlined">local_hospital</span></div>
                                    <div class="proj-info"><div class="proj-name">Patient Portal v2</div><div class="proj-desc">HIPAA-compliant patient dashboard</div></div>
                                    <div class="proj-right"><span class="proj-badge b-pend">◎ Pending</span><span class="proj-time">3d ago</span></div>
                                    <span class="material-symbols-outlined proj-arrow">chevron_right</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Col 2: Activity -->
                    <div class="col col-narrow">
                        <div class="card" style="flex:1">
                            <div class="card-head"><h2>Activity</h2><span class="material-symbols-outlined">more_horiz</span></div>
                            <div class="card-body">
                                <div class="act"><div class="act-dots"><div class="act-dot ad-green"></div><div class="act-line"></div></div><div class="act-info"><div class="act-title"><strong>Pipeline started</strong> for E-Commerce</div><div class="act-time">2 hours ago</div></div></div>
                                <div class="act"><div class="act-dots"><div class="act-dot ad-blue"></div><div class="act-line"></div></div><div class="act-info"><div class="act-title"><strong>AI generated</strong> Architecture Doc</div><div class="act-time">3 hours ago</div></div></div>
                                <div class="act"><div class="act-dots"><div class="act-dot ad-blue"></div><div class="act-line"></div></div><div class="act-info"><div class="act-title"><strong>Exported</strong> FinTech docs to PDF</div><div class="act-time">Yesterday</div></div></div>
                                <div class="act"><div class="act-dots"><div class="act-dot ad-green"></div><div class="act-line"></div></div><div class="act-info"><div class="act-title"><strong>Completed</strong> FinTech pipeline</div><div class="act-time">Yesterday</div></div></div>
                                <div class="act"><div class="act-dots"><div class="act-dot ad-amber"></div><div class="act-line"></div></div><div class="act-info"><div class="act-title"><strong>Model updated</strong> to Codellama 13B</div><div class="act-time">2 days ago</div></div></div>
                                <div class="act"><div class="act-dots"><div class="act-dot ad-gray"></div></div><div class="act-info"><div class="act-title"><strong>Created</strong> Patient Portal v2</div><div class="act-time">3 days ago</div></div></div>
                            </div>
                        </div>
                    </div>

                    <!-- Col 3: Pipeline + Resources -->
                    <div class="col col-narrow">
                        <div class="card">
                            <div class="card-head"><h2>Live Pipeline</h2><span class="material-symbols-outlined" style="color:#61dac1">insights</span></div>
                            <div class="card-body">
                                <div class="pipe-item"><div class="pipe-bar pb-green"></div><div class="pipe-info"><div class="pipe-name">Requirement Parsing</div><div class="pipe-desc">124 nodes analyzed</div></div><span class="pipe-status ps-done">Done</span></div>
                                <div class="pipe-item"><div class="pipe-bar pb-blue"></div><div class="pipe-info"><div class="pipe-name">UML Generation</div><div class="pipe-desc">85% remaining</div></div><span class="pipe-status ps-run">Active</span></div>
                                <div class="pipe-item"><div class="pipe-bar pb-gray"></div><div class="pipe-info"><div class="pipe-name">Draft Documentation</div><div class="pipe-desc">Waiting...</div></div><span class="pipe-status ps-wait">Queued</span></div>
                            </div>
                        </div>
                        <div class="card">
                            <div class="card-head"><h2>System Resources</h2></div>
                            <div class="card-body" style="padding-top:8px">
                                <div class="res-item"><span class="res-label">CPU</span><div class="res-bar"><div class="res-fill rf-amber" style="width:72%"></div></div><span class="res-val">72%</span></div>
                                <div class="res-item"><span class="res-label">Memory</span><div class="res-bar"><div class="res-fill rf-blue" style="width:58%"></div></div><span class="res-val">58%</span></div>
                                <div class="res-item"><span class="res-label">GPU</span><div class="res-bar"><div class="res-fill rf-green" style="width:34%"></div></div><span class="res-val">34%</span></div>
                                <div class="res-item"><span class="res-label">Disk</span><div class="res-bar"><div class="res-fill rf-purple" style="width:45%"></div></div><span class="res-val">45%</span></div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- ROW 4: Quick Actions -->
                <div class="card">
                    <div class="card-head"><h2>Quick Actions</h2></div>
                    <div class="card-body" style="padding-top:4px">
                        <div class="qa-grid">
                            <div class="qa" onclick="handleAction('new-project')"><div class="qa-icon qi-primary"><span class="material-symbols-outlined">add_circle</span></div><div class="qa-label">New Project</div><div class="qa-desc">Start a new AI-powered workflow</div></div>
                            <div class="qa" onclick="handleAction('run-pipeline')"><div class="qa-icon qi-secondary"><span class="material-symbols-outlined">play_circle</span></div><div class="qa-label">Run Pipeline</div><div class="qa-desc">Execute SDLC generation</div></div>
                            <div class="qa" onclick="handleAction('export-all')"><div class="qa-icon qi-tertiary"><span class="material-symbols-outlined">ios_share</span></div><div class="qa-label">Export All</div><div class="qa-desc">Export docs & artifacts</div></div>
                            <div class="qa" onclick="handleAction('view-logs')"><div class="qa-icon qi-amber"><span class="material-symbols-outlined">terminal</span></div><div class="qa-label">View Logs</div><div class="qa-desc">Open terminal output</div></div>
                        </div>
                    </div>
                </div>

                <!-- ROW 5: Documents + Logs -->
                <div class="row row-main">
                    <!-- Recent Documents -->
                    <div class="col">
                        <div class="card" style="flex:1">
                            <div class="card-head"><h2>Recent Documents</h2><span class="material-symbols-outlined">folder_open</span></div>
                            <div class="card-body">
                                <div class="doc"><div class="doc-icon"><span class="material-symbols-outlined">description</span></div><div class="doc-info"><div class="doc-name">Software Requirements Specification</div><div class="doc-meta">E-Commerce · Updated 2h ago</div></div><div class="doc-status"><span class="material-symbols-outlined ds-done" style="font-variation-settings:'FILL' 1">check_circle</span></div></div>
                                <div class="doc"><div class="doc-icon"><span class="material-symbols-outlined">schema</span></div><div class="doc-info"><div class="doc-name">Architecture Design Document</div><div class="doc-meta">E-Commerce · Generating...</div></div><div class="doc-status"><span class="material-symbols-outlined ds-run">sync</span></div></div>
                                <div class="doc"><div class="doc-icon"><span class="material-symbols-outlined">database</span></div><div class="doc-info"><div class="doc-name">Data Schema Definition</div><div class="doc-meta">FinTech · Yesterday</div></div><div class="doc-status"><span class="material-symbols-outlined ds-done" style="font-variation-settings:'FILL' 1">check_circle</span></div></div>
                                <div class="doc"><div class="doc-icon"><span class="material-symbols-outlined">api</span></div><div class="doc-info"><div class="doc-name">API Documentation (Swagger)</div><div class="doc-meta">FinTech · Locked</div></div><div class="doc-status"><span class="material-symbols-outlined ds-lock">lock</span></div></div>
                                <div class="doc"><div class="doc-icon"><span class="material-symbols-outlined">security</span></div><div class="doc-info"><div class="doc-name">Security Audit Trail</div><div class="doc-meta">FinTech · Locked</div></div><div class="doc-status"><span class="material-symbols-outlined ds-lock">lock</span></div></div>
                                <div class="doc"><div class="doc-icon"><span class="material-symbols-outlined">fact_check</span></div><div class="doc-info"><div class="doc-name">Test Plan & Coverage Report</div><div class="doc-meta">FinTech · Locked</div></div><div class="doc-status"><span class="material-symbols-outlined ds-lock">lock</span></div></div>
                                <div class="doc"><div class="doc-icon"><span class="material-symbols-outlined">rocket_launch</span></div><div class="doc-info"><div class="doc-name">Deployment Configuration</div><div class="doc-meta">FinTech · Locked</div></div><div class="doc-status"><span class="material-symbols-outlined ds-lock">lock</span></div></div>
                            </div>
                        </div>
                    </div>

                    <!-- Terminal Logs -->
                    <div class="col col-narrow">
                        <div class="card" style="flex:1">
                            <div class="card-head"><h2>Terminal Output</h2><span class="material-symbols-outlined">terminal</span></div>
                            <div class="card-body" style="background:#0E0E0E;border-radius:0 0 6px 6px;margin:0 -12px -12px;padding:8px 12px">
                                <div class="log"><span class="log-ts">14:02:44</span><span class="log-tag lt-ok">OK</span><span class="log-msg">Generated Swagger-UI definitions</span></div>
                                <div class="log"><span class="log-ts">14:02:38</span><span class="log-tag lt-ok">OK</span><span class="log-msg">Schema validation passed (0 errors)</span></div>
                                <div class="log"><span class="log-ts">14:02:31</span><span class="log-tag lt-info">INFO</span><span class="log-msg">Parsing OpenAPI spec for core v2.0.1</span></div>
                                <div class="log"><span class="log-ts">14:01:55</span><span class="log-tag lt-warn">WARN</span><span class="log-msg">Deprecated field: payment.v1.type</span></div>
                                <div class="log"><span class="log-ts">14:01:42</span><span class="log-tag lt-ok">OK</span><span class="log-msg">Connected to Genesis Cloud</span></div>
                                <div class="log"><span class="log-ts">14:01:30</span><span class="log-tag lt-info">INFO</span><span class="log-msg">Initializing Ollama model: codellama:13b</span></div>
                                <div class="log"><span class="log-ts">14:01:15</span><span class="log-tag lt-ok">OK</span><span class="log-msg">Pipeline resumed from checkpoint</span></div>
                                <div class="log"><span class="log-ts">14:00:58</span><span class="log-tag lt-info">INFO</span><span class="log-msg">Loading workspace configuration</span></div>
                            </div>
                        </div>
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
                    if(de)de.textContent=n.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',year:'numeric'});
                }
                updateClock();setInterval(updateClock,1000);
                function handleAction(c,v){vscode.postMessage(v?{command:c,name:v}:{command:c})}
            </script>
        </body>
        </html>`;
    }
}

// ==================== SETTINGS PANEL ====================
