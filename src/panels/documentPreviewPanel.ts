import * as vscode from 'vscode';

export class DocumentPreviewPanel {
    public static currentPanel: DocumentPreviewPanel | undefined;
    private _panel: vscode.WebviewPanel;
    private static _onBack: (() => void) | undefined;
    private static _onExport: ((name: string) => void) | undefined;
    private static _onViewDocument: ((wfName: string, docName: string) => void) | undefined;

    public static setOnBack(cb: () => void) { DocumentPreviewPanel._onBack = cb; }
    public static setOnExport(cb: (name: string) => void) { DocumentPreviewPanel._onExport = cb; }
    public static setOnViewDocument(cb: (wfName: string, docName: string) => void) { DocumentPreviewPanel._onViewDocument = cb; }

    private constructor(panel: vscode.WebviewPanel, wfName: string, docName: string) {
        this._panel = panel;
        panel.webview.html = this._getHtml(wfName, docName);
        this._panel.onDidDispose(() => { DocumentPreviewPanel.currentPanel = undefined; });
        this._panel.webview.onDidReceiveMessage(message => {
            switch (message.command) {
                case 'back': this._panel.dispose(); break;
                case 'view-document': if (DocumentPreviewPanel._onViewDocument) DocumentPreviewPanel._onViewDocument(wfName, message.doc); break;
                case 'export': if (DocumentPreviewPanel._onExport) DocumentPreviewPanel._onExport(wfName); break;
                case 'open-editor': vscode.window.showInformationMessage('Opening in editor...'); break;
                case 'regenerate': vscode.window.showInformationMessage('Regenerating document with latest AI model...'); break;
            }
        });
    }

    public static open(extensionUri: vscode.Uri, wfName: string, docName: string) {
        if (DocumentPreviewPanel.currentPanel) { DocumentPreviewPanel.currentPanel._panel.dispose(); }
        const panel = vscode.window.createWebviewPanel('genesis-doc-preview', docName, vscode.ViewColumn.One, {
            enableScripts: true, retainContextWhenHidden: true, localResourceRoots: [extensionUri]
        });
        DocumentPreviewPanel.currentPanel = new DocumentPreviewPanel(panel, wfName, docName);
    }

    private _getHtml(wfName: string, activeDoc: string): string {
        const tabs = [
            { name: 'Vision & Strategy', icon: 'lightbulb', status: 'done' },
            { name: 'User Personas', icon: 'groups', status: 'done' },
            { name: 'Product Roadmap', icon: 'map', status: 'done' },
            { name: 'GTM Strategy', icon: 'trending_up', status: 'done' },
            { name: 'Strategic Use Cases', icon: 'account_tree', status: 'active' },
            { name: 'UI Flows & Navigation', icon: 'route', status: 'active' },
            { name: 'Synthetic Data Schema', icon: 'dataset', status: 'pending' },
            { name: 'Product Requirements Doc', icon: 'description', status: 'pending' },
            { name: 'Technical Architecture', icon: 'architecture', status: 'pending' },
            { name: 'Database Design', icon: 'database', status: 'pending' },
            { name: 'API Specifications', icon: 'api', status: 'pending' },
            { name: 'Security Specification', icon: 'security', status: 'pending' },
            { name: 'Testing Strategy', icon: 'bug_report', status: 'pending' },
            { name: 'DevOps & Infrastructure', icon: 'cloud', status: 'pending' },
            { name: 'Interactive Mockup', icon: 'layers', status: 'pending' },
            { name: 'Brand Style Guide', icon: 'palette', status: 'pending' },
            { name: 'Business Requirements', icon: 'business_center', status: 'pending' },
            { name: 'Functional Requirements', icon: 'fact_check', status: 'pending' },
            { name: 'Bill of Materials', icon: 'inventory_2', status: 'pending' },
            { name: 'Implementation Plan', icon: 'rocket_launch', status: 'pending' },
        ];
        const tabHtml = tabs.map(t =>
            `<div class="doc-tab ${t.name === activeDoc ? 'active' : ''}" onclick="handleAction('view-document','${t.name}')">${t.name}${t.status === 'active' ? '<span class="tab-spinner"></span>' : t.status === 'done' ? ' ✓' : ''}</div>`
        ).join('');

        return /*html*/ `
        <!DOCTYPE html>
        <html class="dark" lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${activeDoc}</title>
            <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&family=Fira+Code:wght@400;500&display=swap" rel="stylesheet">
            <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet">
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&family=Fira+Code:wght@400;500&display=swap');
                @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');
                *{margin:0;padding:0;box-sizing:border-box}
                .material-symbols-outlined{font-variation-settings:'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24;font-family:'Material Symbols Outlined'}
                body{font-family:'Inter',sans-serif;background-color:#131313;color:#e5e2e1;margin:0;height:100vh;display:flex;flex-direction:column}
                ::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:#353535;border-radius:10px}::-webkit-scrollbar-thumb:hover{background:#404751}

                /* HEADER BAR */
                .topbar{display:flex;align-items:center;justify-content:space-between;padding:0 20px;height:44px;background:#131313;border-bottom:1px solid rgba(64,71,82,.1);flex-shrink:0}
                .topbar-left{display:flex;align-items:center;gap:16px}
                .back-btn{display:flex;align-items:center;gap:6px;padding:6px 12px;background:#202020;border:1px solid rgba(64,71,82,.15);border-radius:6px;color:#C0C7D4;font-size:.6875rem;font-weight:600;cursor:pointer;transition:all .15s ease;font-family:'Inter',sans-serif}
                .back-btn:hover{background:#353535;color:#e5e2e1}
                .back-btn .material-symbols-outlined{font-size:16px}
                .topbar-title{font-family:'Space Grotesk',sans-serif;font-size:.8125rem;font-weight:700;color:#A3C9FF}
                .topbar-right{display:flex;align-items:center;gap:6px}
                .tb-btn{display:flex;align-items:center;gap:6px;padding:6px 14px;background:#2a2a2a;border:none;border-radius:6px;color:#C0C7D4;font-size:.6875rem;font-weight:600;cursor:pointer;transition:all .15s ease;font-family:'Inter',sans-serif}
                .tb-btn:hover{background:#353535;color:#e5e2e1}
                .tb-btn .material-symbols-outlined{font-size:14px}
                .tb-btn.tb-accent{background:rgba(163,201,255,.1);color:#A3C9FF;border:1px solid rgba(163,201,255,.2)}
                .tb-btn.tb-accent:hover{background:rgba(163,201,255,.15)}

                /* TABS */
                .tabs-bar{display:flex;align-items:center;background:#1B1B1C;height:40px;padding:0 16px;gap:0;border-bottom:1px solid rgba(64,71,82,.1);flex-shrink:0;overflow-x:auto}
                .doc-tab{padding:10px 16px;font-size:.6875rem;font-weight:500;color:#C0C7D4;cursor:pointer;transition:all .15s ease;border-bottom:2px solid transparent;white-space:nowrap;display:flex;align-items:center;gap:8px}
                .doc-tab:hover{color:#e5e2e1;background:rgba(53,53,53,.3)}
                .doc-tab.active{color:#A3C9FF;border-bottom-color:#A3C9FF;background:#202020}
                .tab-spinner{width:8px;height:8px;border-radius:50%;background:#A3C9FF;animation:blink 2s infinite}
                @keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}

                /* CONTEXT TOOLBAR */
                .ctx-toolbar{display:flex;align-items:center;justify-content:space-between;padding:10px 20px;background:#131313;border-bottom:1px solid rgba(64,71,82,.05);flex-shrink:0}
                .ctx-breadcrumb{display:flex;align-items:center;gap:6px;font-size:.6875rem;color:#8a919e}
                .ctx-breadcrumb span{color:#C0C7D4}
                .ctx-actions{display:flex;gap:6px}

                /* DOCUMENT CONTENT */
                .doc-content{flex:1;overflow-y:auto;background:#131313;padding:40px 0;display:flex;justify-content:center}
                .doc-paper{max-width:720px;width:100%;background:#1E1E1E;padding:48px;box-shadow:0 8px 32px rgba(0,0,0,.4);border-radius:2px;border:1px solid rgba(64,71,82,.05);margin:0 20px 40px}
                .doc-paper h1{font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:2rem;margin-bottom:1.5rem;color:#e5e2e1;letter-spacing:-.02em;line-height:1.2}
                .doc-paper h2{font-family:'Space Grotesk',sans-serif;font-weight:600;font-size:1.375rem;margin-top:2rem;margin-bottom:1rem;color:#A3C9FF;border-bottom:1px solid rgba(64,71,82,.15);padding-bottom:.5rem}
                .doc-paper h3{font-family:'Space Grotesk',sans-serif;font-weight:600;font-size:1rem;margin-top:1.5rem;margin-bottom:.75rem;color:#e5e2e1}
                .doc-paper p{line-height:1.7;color:#C0C7D4;margin-bottom:1rem;font-size:.875rem}
                .doc-paper ul{list-style:none;padding-left:0;margin-bottom:1.5rem}
                .doc-paper li{position:relative;padding-left:1.5rem;margin-bottom:.5rem;color:#C0C7D4;font-size:.875rem;line-height:1.6}
                .doc-paper li::before{content:'';position:absolute;left:0;top:.625rem;width:.5rem;height:1px;background:#A3C9FF}
                .code-block{font-family:'Fira Code',monospace;background:#0E0E0E;border-radius:4px;padding:16px;margin:1.5rem 0;font-size:.8125rem;border:1px solid rgba(64,71,82,.15);color:#A3C9FF;overflow-x:auto;position:relative}
                .code-block .code-lang{position:absolute;top:8px;right:12px;font-size:.5rem;color:#8a919e;text-transform:uppercase;letter-spacing:.1em}
                .flow-diagram{margin:2rem 0;padding:24px;background:#0E0E0E;border-radius:8px;border:1px solid rgba(64,71,82,.1)}
                .flow-node{padding:12px 24px;border:1px solid #0078D4;border-radius:4px;text-align:center;font-family:'Fira Code',monospace;font-size:.75rem;color:#A3C9FF;margin:0 auto;width:fit-content}
                .flow-node.primary-node{background:rgba(163,201,255,.08);border-color:#A3C9FF}
                .flow-arrow{text-align:center;color:#0078D4;padding:8px 0}
                .flow-grid{display:flex;gap:16px;justify-content:center;padding:8px 0}
                .flow-grid .flow-node{width:120px;padding:10px 8px;font-size:.625rem;background:#2a2a2a;border-color:rgba(64,71,82,.3);color:#C0C7D4}

                /* FOOTER */
                .doc-footer{display:flex;align-items:center;justify-content:space-between;padding:0 20px;height:28px;background:#0E0E0E;border-top:1px solid rgba(64,71,82,.1);font-family:'Fira Code',monospace;font-size:.5625rem;color:#8a919e;text-transform:uppercase;letter-spacing:.08em;flex-shrink:0}
                .footer-left{display:flex;align-items:center;gap:16px}
                .footer-right{display:flex;align-items:center;gap:12px}
            </style>
        </head>
        <body>
            <!-- TOP BAR -->
            <div class="topbar">
                <div class="topbar-left">
                    <button class="back-btn" onclick="handleAction('back')"><span class="material-symbols-outlined">arrow_back</span> Back</button>
                    <span class="topbar-title">${activeDoc}</span>
                </div>
                <div class="topbar-right">
                    <div style="display:flex;align-items:center;gap:2px;margin-right:8px">
                        <div style="width:6px;height:6px;border-radius:50%;background:#61dac1;box-shadow:0 0 6px rgba(97,218,193,.5)"></div>
                        <span style="font-size:.5625rem;color:#61dac1;font-weight:700;text-transform:uppercase">Live</span>
                    </div>
                    <button class="tb-btn" onclick="handleAction('open-editor')"><span class="material-symbols-outlined">edit</span> Open in Editor</button>
                    <button class="tb-btn" onclick="handleAction('export')"><span class="material-symbols-outlined">download</span> Export</button>
                    <button class="tb-btn tb-accent" onclick="handleAction('regenerate')"><span class="material-symbols-outlined">refresh</span> Regenerate</button>
                </div>
            </div>

            <!-- TABS -->
            <div class="tabs-bar">${tabHtml}</div>

            <!-- CONTEXT TOOLBAR -->
            <div class="ctx-toolbar">
                <div class="ctx-breadcrumb">
                    <span class="material-symbols-outlined" style="font-size:14px">folder_open</span>
                    <span>Projects</span> / <span>${wfName}</span> / <span style="color:#A3C9FF">${activeDoc}</span>
                </div>
            </div>

            <!-- DOCUMENT CONTENT -->
            <div class="doc-content">
                <div class="doc-paper">
                    <h1>Vision & Strategy - ${wfName}</h1>
                    <h2>1. Executive Summary</h2>
                    <p>This document outlines the migration of the legacy monolith architecture to a distributed ecosystem. The strategic goal is to reduce technical debt while increasing market responsiveness by 40% over the next two fiscal quarters.</p>
                    <h3>1.1 Goals</h3>
                    <ul>
                        <li>High availability (99.99% uptime) with zero-downtime deployments</li>
                        <li>API-first architecture for omnichannel expansion</li>
                        <li>Automated CI/CD pipelines with Genesis AI integration</li>
                        <li>Event-driven communication using message brokers</li>
                    </ul>
                    <h2>2. System Architecture</h2>
                    <p>The transition utilizes a strangler fig pattern to slowly decouple modules without interrupting existing revenue streams. The architecture follows Domain-Driven Design principles.</p>
                    <div class="flow-diagram">
                        <div class="flow-node primary-node">Client (Web/App)</div>
                        <div class="flow-arrow"><span class="material-symbols-outlined">arrow_downward</span></div>
                        <div class="flow-node" style="border-color:#0078D4;background:rgba(0,120,212,.08)">API Gateway</div>
                        <div class="flow-grid">
                            <div class="flow-node">Auth Service</div>
                            <div class="flow-node">Cart Service</div>
                            <div class="flow-node">Search Service</div>
                        </div>
                    </div>
                    <h2>3. Technical Configuration</h2>
                    <p>The infrastructure configuration is defined declaratively using Terraform modules for reproducible deployments across environments.</p>
                    <div class="code-block">
                        <span class="code-lang">json</span>
<pre>{
  "project": "${wfName}",
  "arch": "microservices",
  "deployment": {
    "provider": "Genesis Cloud",
    "region": "us-east-1",
    "scaling": "auto"
  },
  "services": ["auth", "cart", "catalog", "order"],
  "security": "OAuth2-OIDC"
}</pre>
                    </div>
                    <h2>4. Success Metrics</h2>
                    <ul>
                        <li>Reduce deployment time from 4 hours to 15 minutes</li>
                        <li>Achieve 99.99% uptime SLA across all critical services</li>
                        <li>Improve developer productivity by 35% through AI-assisted SDLC</li>
                        <li>Maintain PCI-DSS compliance throughout migration</li>
                    </ul>
                </div>
            </div>

            <!-- FOOTER -->
            <div class="doc-footer">
                <div class="footer-left">
                    <span>v1.0.4 - Connected to Genesis Cloud</span>
                </div>
                <div class="footer-right">
                    <span>1,240 Words</span>
                    <span>|</span>
                    <span>4 Sections</span>
                    <span>|</span>
                    <span><span class="material-symbols-outlined" style="font-size:10px;vertical-align:middle">schedule</span> Generated: 2 mins ago</span>
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

// ==================== WORKFLOW EDITOR PANEL ====================
