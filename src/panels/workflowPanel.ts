import * as vscode from 'vscode';

export class WorkflowPanel {
    public static currentPanel: WorkflowPanel | undefined;
    private _panel: vscode.WebviewPanel;
    private static _openDetail: ((name: string) => void) | undefined;
    private static _newWorkflow: (() => void) | undefined;

    public static setOpenDetail(cb: (name: string) => void) { WorkflowPanel._openDetail = cb; }
    public static setNewWorkflow(cb: () => void) { WorkflowPanel._newWorkflow = cb; }

    private constructor(panel: vscode.WebviewPanel) {
        this._panel = panel;
        panel.webview.html = this._getHtml();
        panel.iconPath = vscode.Uri.joinPath(vscode.Uri.file('/tmp'), 'media', 'icon.svg');
        this._panel.onDidDispose(() => { WorkflowPanel.currentPanel = undefined; });
        this._panel.webview.onDidReceiveMessage(message => {
            switch (message.command) {
                case 'open-workflow': if (WorkflowPanel._openDetail) WorkflowPanel._openDetail(message.name); break;
                case 'new-workflow': if (WorkflowPanel._newWorkflow) WorkflowPanel._newWorkflow(); break;
                case 'delete-workflow': vscode.window.showWarningMessage('Delete workflow: ' + message.name + '?'); break;
            }
        });
    }

    public static open(extensionUri: vscode.Uri) {
        if (WorkflowPanel.currentPanel) { WorkflowPanel.currentPanel._panel.reveal(); return; }
        const panel = vscode.window.createWebviewPanel('genesis-workflow', 'My Workflows', vscode.ViewColumn.One, {
            enableScripts: true, retainContextWhenHidden: true, localResourceRoots: [extensionUri]
        });
        WorkflowPanel.currentPanel = new WorkflowPanel(panel);
    }

    private _update() { this._panel.webview.html = this._getHtml(); }

    private _getHtml(): string {
        return /*html*/ `
        <!DOCTYPE html>
        <html class="dark" lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>My Workflows</title>
            <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&family=Fira+Code:wght@400;500&display=swap" rel="stylesheet">
            <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet">
            <style>
                *{margin:0;padding:0;box-sizing:border-box}
                .material-symbols-outlined{font-variation-settings:'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24}
                body{font-family:'Inter',sans-serif;background-color:#131313;color:#e5e2e1;margin:0;height:100vh;display:flex;flex-direction:column}
                ::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:#353535;border-radius:10px}::-webkit-scrollbar-thumb:hover{background:#404751}
                .page{flex:1;display:flex;flex-direction:column;gap:12px;padding:16px 20px;overflow-y:auto}

                /* WELCOME STRIP */
                .welcome-strip{display:flex;align-items:center;justify-content:space-between;padding:14px 20px;background:#1B1B1C;border-radius:8px;border:1px solid rgba(64,71,82,.08);flex-shrink:0}
                .ws-left{display:flex;align-items:center;gap:14px}
                .ws-icon{width:38px;height:38px;border-radius:8px;background:linear-gradient(135deg,rgba(163,201,255,.15),rgba(0,120,212,.15));display:flex;align-items:center;justify-content:center;flex-shrink:0}
                .ws-icon .material-symbols-outlined{font-size:20px;color:#A3C9FF}
                .ws-text h1{font-family:'Space Grotesk',sans-serif;font-size:1rem;font-weight:700;color:#e5e2e1;line-height:1.2}
                .ws-text p{font-size:.6875rem;color:#8a919e}
                .ws-right{display:flex;align-items:center;gap:10px}
                .btn-new{display:flex;align-items:center;gap:6px;padding:8px 18px;background:linear-gradient(180deg,#A3C9FF 0%,#0078D4 100%);border:none;border-radius:6px;color:#fff;font-size:.6875rem;font-weight:700;cursor:pointer;transition:all .15s ease;text-transform:uppercase;letter-spacing:.04em}
                .btn-new:hover{opacity:.9;transform:translateY(-1px)}
                .btn-new .material-symbols-outlined{font-size:16px}
                .btn-filter{display:flex;align-items:center;gap:6px;padding:8px 14px;background:#202020;border:1px solid rgba(64,71,82,.15);border-radius:6px;color:#C0C7D4;font-size:.6875rem;font-weight:600;cursor:pointer;transition:all .15s ease}
                .btn-filter:hover{background:#353535;color:#e5e2e1}
                .btn-filter .material-symbols-outlined{font-size:14px}

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

                /* FILTER TABS */
                .filter-tabs{display:flex;align-items:center;gap:2px;background:#1B1B1C;border-radius:8px;padding:4px;flex-shrink:0;border:1px solid rgba(64,71,82,.08)}
                .ftab{padding:7px 16px;border-radius:6px;font-size:.6875rem;font-weight:600;color:#8a919e;cursor:pointer;transition:all .15s ease;border:none;background:transparent}
                .ftab:hover{color:#e5e2e1}
                .ftab.active{background:#202020;color:#e5e2e1}
                .ftab .count{margin-left:6px;padding:1px 7px;background:rgba(53,53,53,.6);border-radius:9999px;font-size:.5625rem;font-weight:700}
                .ftab.active .count{background:rgba(163,201,255,.12);color:#A3C9FF}

                /* WORKFLOW LIST */
                .wf-list{display:flex;flex-direction:column;gap:1px;background:rgba(64,71,82,.12);border-radius:8px;overflow:hidden;border:1px solid rgba(64,71,82,.12)}
                .wf-row{display:flex;align-items:center;gap:16px;padding:16px 20px;background:#1B1B1C;cursor:pointer;transition:background .15s ease}
                .wf-row:hover{background:#202020}
                .wf-icon{width:40px;height:40px;border-radius:8px;background:#202020;display:flex;align-items:center;justify-content:center;flex-shrink:0;border:1px solid rgba(64,71,82,.15)}
                .wf-icon .material-symbols-outlined{font-size:20px;color:#A3C9FF}
                .wf-info{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}
                .wf-name{font-size:.8125rem;font-weight:600;color:#e5e2e1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
                .wf-desc{font-size:.625rem;color:#8a919e;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
                .wf-meta{display:flex;align-items:center;gap:16px;flex-shrink:0}
                .wf-phases{display:flex;align-items:center;gap:6px}
                .wf-phase-dot{width:8px;height:8px;border-radius:50%}
                .wpd-done{background:#61dac1;box-shadow:0 0 4px rgba(97,218,193,.4)}
                .wpd-active{background:#A3C9FF;box-shadow:0 0 4px rgba(163,201,255,.4);animation:blink 2s infinite}
                @keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}
                .wpd-pending{background:#353535}
                .wf-phase-label{font-size:.5625rem;color:#8a919e;white-space:nowrap}
                .wf-progress{width:80px;height:4px;background:#353535;border-radius:9999px;overflow:hidden}
                .wf-progress-fill{height:100%;border-radius:9999px}
                .wpf-blue{background:linear-gradient(90deg,#A3C9FF,#0078D4)}
                .wpf-green{background:linear-gradient(90deg,#80f7dc,#008672)}
                .wpf-gray{background:#404752}
                .wf-pct{font-family:'Fira Code',monospace;font-size:.6875rem;font-weight:600;color:#C0C7D4;width:36px;text-align:right}
                .wf-badge{font-size:.5rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;padding:3px 10px;border-radius:9999px}
                .b-run{background:rgba(97,218,193,.12);color:#61dac1}
                .b-done{background:rgba(163,201,255,.1);color:#A3C9FF}
                .b-pend{background:rgba(192,199,212,.08);color:#8a919e}
                .b-err{background:rgba(255,180,171,.1);color:#ffb4ab}
                .wf-time{font-size:.625rem;color:#8a919e;white-space:nowrap}
                .wf-actions{display:flex;align-items:center;gap:4px;opacity:0;transition:opacity .15s ease}
                .wf-row:hover .wf-actions{opacity:1}
                .wf-act-btn{width:28px;height:28px;display:flex;align-items:center;justify-content:center;border-radius:6px;color:#8a919e;cursor:pointer;transition:all .12s ease;border:none;background:transparent}
                .wf-act-btn:hover{background:rgba(53,53,53,.5);color:#e5e2e1}
                .wf-act-btn .material-symbols-outlined{font-size:16px}
                .wf-act-btn.delete:hover{background:rgba(255,180,171,.1);color:#ffb4ab}

                /* QUICK ACTIONS ROW */
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
                <!-- WELCOME STRIP -->
                <div class="welcome-strip">
                    <div class="ws-left">
                        <div class="ws-icon"><span class="material-symbols-outlined">account_tree</span></div>
                        <div class="ws-text">
                            <h1>My Workflows</h1>
                            <p>Manage and monitor all your AI-powered SDLC pipelines</p>
                        </div>
                    </div>
                    <div class="ws-right">
                        <button class="btn-filter" onclick="handleAction('filter')"><span class="material-symbols-outlined">filter_list</span>Filter</button>
                        <button class="btn-new" onclick="handleAction('new-workflow')"><span class="material-symbols-outlined">add</span>New Workflow</button>
                    </div>
                </div>

                <!-- STATS -->
                <div class="stats-row">
                    <div class="stat-card"><div class="stat-icon si-blue"><span class="material-symbols-outlined">account_tree</span></div><div><div class="stat-val">6</div><div class="stat-lbl">Total Workflows</div></div></div>
                    <div class="stat-card"><div class="stat-icon si-green"><span class="material-symbols-outlined">sync</span></div><div><div class="stat-val">1</div><div class="stat-lbl">Running</div></div></div>
                    <div class="stat-card"><div class="stat-icon si-blue"><span class="material-symbols-outlined">check_circle</span></div><div><div class="stat-val">3</div><div class="stat-lbl">Completed</div></div></div>
                    <div class="stat-card"><div class="stat-icon si-purple"><span class="material-symbols-outlined">schedule</span></div><div><div class="stat-val">2</div><div class="stat-lbl">Pending</div></div></div>
                </div>

                <!-- FILTER TABS -->
                <div class="filter-tabs">
                    <button class="ftab active">All <span class="count">6</span></button>
                    <button class="ftab">Running <span class="count">1</span></button>
                    <button class="ftab">Completed <span class="count">3</span></button>
                    <button class="ftab">Pending <span class="count">2</span></button>
                    <button class="ftab">Failed <span class="count">0</span></button>
                </div>

                <!-- WORKFLOW LIST -->
                <div class="wf-list">
                    <!-- 1. E-Commerce Re-platform (Running) -->
                    <div class="wf-row" onclick="handleAction('open-workflow','E-Commerce Re-platform')">
                        <div class="wf-icon"><span class="material-symbols-outlined">shopping_cart</span></div>
                        <div class="wf-info">
                            <div class="wf-name">E-Commerce Re-platform</div>
                            <div class="wf-desc">Micro-frontend migration with real-time inventory management system</div>
                        </div>
                        <div class="wf-meta">
                            <div class="wf-phases">
                                <div class="wf-phase-dot wpd-done"></div>
                                <div class="wf-phase-dot wpd-active"></div>
                                <div class="wf-phase-dot wpd-pending"></div>
                                <div class="wf-phase-dot wpd-pending"></div>
                                <span class="wf-phase-label">2/4 phases</span>
                            </div>
                            <div class="wf-progress"><div class="wf-progress-fill wpf-blue" style="width:45%"></div></div>
                            <span class="wf-pct">45%</span>
                            <span class="wf-badge b-run">● Running</span>
                            <span class="wf-time">2h ago</span>
                        </div>
                        <div class="wf-actions">
                            <button class="wf-act-btn" title="Open"><span class="material-symbols-outlined">open_in_new</span></button>
                            <button class="wf-act-btn delete" title="Delete" onclick="event.stopPropagation();handleAction('delete-workflow','E-Commerce Re-platform')"><span class="material-symbols-outlined">delete</span></button>
                        </div>
                    </div>

                    <!-- 2. FinTech Wallet API (Completed) -->
                    <div class="wf-row" onclick="handleAction('open-workflow','FinTech Wallet API')">
                        <div class="wf-icon"><span class="material-symbols-outlined">account_balance</span></div>
                        <div class="wf-info">
                            <div class="wf-name">FinTech Wallet API</div>
                            <div class="wf-desc">Payment processing and ledger management system</div>
                        </div>
                        <div class="wf-meta">
                            <div class="wf-phases">
                                <div class="wf-phase-dot wpd-done"></div>
                                <div class="wf-phase-dot wpd-done"></div>
                                <div class="wf-phase-dot wpd-done"></div>
                                <div class="wf-phase-dot wpd-done"></div>
                                <span class="wf-phase-label">4/4 phases</span>
                            </div>
                            <div class="wf-progress"><div class="wf-progress-fill wpf-green" style="width:100%"></div></div>
                            <span class="wf-pct">100%</span>
                            <span class="wf-badge b-done">✓ Done</span>
                            <span class="wf-time">Yesterday</span>
                        </div>
                        <div class="wf-actions">
                            <button class="wf-act-btn" title="Open"><span class="material-symbols-outlined">open_in_new</span></button>
                            <button class="wf-act-btn delete" title="Delete" onclick="event.stopPropagation();handleAction('delete-workflow','FinTech Wallet API')"><span class="material-symbols-outlined">delete</span></button>
                        </div>
                    </div>

                    <!-- 3. Patient Portal v2 (Pending) -->
                    <div class="wf-row" onclick="handleAction('open-workflow','Patient Portal v2')">
                        <div class="wf-icon"><span class="material-symbols-outlined">local_hospital</span></div>
                        <div class="wf-info">
                            <div class="wf-name">Patient Portal v2</div>
                            <div class="wf-desc">HIPAA-compliant patient management dashboard</div>
                        </div>
                        <div class="wf-meta">
                            <div class="wf-phases">
                                <div class="wf-phase-dot wpd-pending"></div>
                                <div class="wf-phase-dot wpd-pending"></div>
                                <div class="wf-phase-dot wpd-pending"></div>
                                <div class="wf-phase-dot wpd-pending"></div>
                                <span class="wf-phase-label">0/4 phases</span>
                            </div>
                            <div class="wf-progress"><div class="wf-progress-fill wpf-gray" style="width:0%"></div></div>
                            <span class="wf-pct">0%</span>
                            <span class="wf-badge b-pend">◎ Pending</span>
                            <span class="wf-time">3d ago</span>
                        </div>
                        <div class="wf-actions">
                            <button class="wf-act-btn" title="Open"><span class="material-symbols-outlined">open_in_new</span></button>
                            <button class="wf-act-btn delete" title="Delete" onclick="event.stopPropagation();handleAction('delete-workflow','Patient Portal v2')"><span class="material-symbols-outlined">delete</span></button>
                        </div>
                    </div>

                    <!-- 4. Supply Chain Tracker (Completed) -->
                    <div class="wf-row" onclick="handleAction('open-workflow','Supply Chain Tracker')">
                        <div class="wf-icon"><span class="material-symbols-outlined">local_shipping</span></div>
                        <div class="wf-info">
                            <div class="wf-name">Supply Chain Tracker</div>
                            <div class="wf-desc">Real-time logistics and inventory tracking platform</div>
                        </div>
                        <div class="wf-meta">
                            <div class="wf-phases">
                                <div class="wf-phase-dot wpd-done"></div>
                                <div class="wf-phase-dot wpd-done"></div>
                                <div class="wf-phase-dot wpd-done"></div>
                                <div class="wf-phase-dot wpd-done"></div>
                                <span class="wf-phase-label">4/4 phases</span>
                            </div>
                            <div class="wf-progress"><div class="wf-progress-fill wpf-green" style="width:100%"></div></div>
                            <span class="wf-pct">100%</span>
                            <span class="wf-badge b-done">✓ Done</span>
                            <span class="wf-time">5d ago</span>
                        </div>
                        <div class="wf-actions">
                            <button class="wf-act-btn" title="Open"><span class="material-symbols-outlined">open_in_new</span></button>
                            <button class="wf-act-btn delete" title="Delete" onclick="event.stopPropagation();handleAction('delete-workflow','Supply Chain Tracker')"><span class="material-symbols-outlined">delete</span></button>
                        </div>
                    </div>

                    <!-- 5. Learning Management System (Pending) -->
                    <div class="wf-row" onclick="handleAction('open-workflow','Learning Management System')">
                        <div class="wf-icon"><span class="material-symbols-outlined">school</span></div>
                        <div class="wf-info">
                            <div class="wf-name">Learning Management System</div>
                            <div class="wf-desc">Course authoring, progress tracking & certification engine</div>
                        </div>
                        <div class="wf-meta">
                            <div class="wf-phases">
                                <div class="wf-phase-dot wpd-pending"></div>
                                <div class="wf-phase-dot wpd-pending"></div>
                                <div class="wf-phase-dot wpd-pending"></div>
                                <div class="wf-phase-dot wpd-pending"></div>
                                <span class="wf-phase-label">0/4 phases</span>
                            </div>
                            <div class="wf-progress"><div class="wf-progress-fill wpf-gray" style="width:0%"></div></div>
                            <span class="wf-pct">0%</span>
                            <span class="wf-badge b-pend">◎ Pending</span>
                            <span class="wf-time">1w ago</span>
                        </div>
                        <div class="wf-actions">
                            <button class="wf-act-btn" title="Open"><span class="material-symbols-outlined">open_in_new</span></button>
                            <button class="wf-act-btn delete" title="Delete" onclick="event.stopPropagation();handleAction('delete-workflow','Learning Management System')"><span class="material-symbols-outlined">delete</span></button>
                        </div>
                    </div>

                    <!-- 6. DevOps Dashboard (Completed) -->
                    <div class="wf-row" onclick="handleAction('open-workflow','DevOps Dashboard')">
                        <div class="wf-icon"><span class="material-symbols-outlined">monitoring</span></div>
                        <div class="wf-info">
                            <div class="wf-name">DevOps Dashboard</div>
                            <div class="wf-desc">CI/CD monitoring, deployment metrics & alerting system</div>
                        </div>
                        <div class="wf-meta">
                            <div class="wf-phases">
                                <div class="wf-phase-dot wpd-done"></div>
                                <div class="wf-phase-dot wpd-done"></div>
                                <div class="wf-phase-dot wpd-done"></div>
                                <div class="wf-phase-dot wpd-done"></div>
                                <span class="wf-phase-label">4/4 phases</span>
                            </div>
                            <div class="wf-progress"><div class="wf-progress-fill wpf-green" style="width:100%"></div></div>
                            <span class="wf-pct">100%</span>
                            <span class="wf-badge b-done">✓ Done</span>
                            <span class="wf-time">2w ago</span>
                        </div>
                        <div class="wf-actions">
                            <button class="wf-act-btn" title="Open"><span class="material-symbols-outlined">open_in_new</span></button>
                            <button class="wf-act-btn delete" title="Delete" onclick="event.stopPropagation();handleAction('delete-workflow','DevOps Dashboard')"><span class="material-symbols-outlined">delete</span></button>
                        </div>
                    </div>
                </div>

                <!-- QUICK ACTIONS -->
                <div class="qa-grid">
                    <div class="qa" onclick="handleAction('new-workflow')">
                        <div class="qa-icon qi-primary"><span class="material-symbols-outlined">add_circle</span></div>
                        <div><div class="qa-label">New Workflow</div><div class="qa-desc">Create a new AI-powered pipeline</div></div>
                    </div>
                    <div class="qa" onclick="handleAction('import-workflow')">
                        <div class="qa-icon qi-tertiary"><span class="material-symbols-outlined">upload_file</span></div>
                        <div><div class="qa-label">Import Workflow</div><div class="qa-desc">Import from file or template</div></div>
                    </div>
                    <div class="qa" onclick="handleAction('view-logs')">
                        <div class="qa-icon qi-amber"><span class="material-symbols-outlined">terminal</span></div>
                        <div><div class="qa-label">View Logs</div><div class="qa-desc">Open terminal output</div></div>
                    </div>
                </div>
            </div>

            <script>
                const vscode=acquireVsCodeApi();
                function handleAction(c,v){vscode.postMessage(v?{command:c,name:v}:{command:c})}
                document.querySelectorAll('.ftab').forEach(tab=>{
                    tab.addEventListener('click',()=>{
                        document.querySelectorAll('.ftab').forEach(t=>t.classList.remove('active'));
                        tab.classList.add('active');
                    });
                });
            </script>
        </body>
        </html>`;
    }
}


