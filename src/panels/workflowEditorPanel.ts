import * as vscode from 'vscode';

export class WorkflowEditorPanel {
    public static currentPanel: WorkflowEditorPanel | undefined;
    private _panel: vscode.WebviewPanel;
    private static _onViewDocument: ((wfName: string, docName: string) => void) | undefined;
    private static _onExport: ((name: string) => void) | undefined;

    public static setOnViewDocument(cb: (wfName: string, docName: string) => void) { WorkflowEditorPanel._onViewDocument = cb; }
    public static setOnExport(cb: (name: string) => void) { WorkflowEditorPanel._onExport = cb; }

    private constructor(panel: vscode.WebviewPanel, name: string) {
        this._panel = panel;
        panel.webview.html = this._getHtml(name);
        this._panel.onDidDispose(() => { WorkflowEditorPanel.currentPanel = undefined; });
        this._panel.webview.onDidReceiveMessage(message => {
            switch (message.command) {
                case 'back': this._panel.dispose(); break;
                case 'view-document': if (WorkflowEditorPanel._onViewDocument) WorkflowEditorPanel._onViewDocument(name, message.doc); break;
                case 'export': if (WorkflowEditorPanel._onExport) WorkflowEditorPanel._onExport(name); break;
                case 'run': vscode.window.showInformationMessage('Pipeline started for ' + name); break;
                case 'save': vscode.window.showInformationMessage('Workflow saved!'); break;
            }
        });
    }

    public static open(extensionUri: vscode.Uri, name: string) {
        if (WorkflowEditorPanel.currentPanel) { WorkflowEditorPanel.currentPanel._panel.reveal(); return; }
        const panel = vscode.window.createWebviewPanel('genesis-workflow-editor', 'Editor: ' + name, vscode.ViewColumn.One, {
            enableScripts: true, retainContextWhenHidden: true, localResourceRoots: [extensionUri]
        });
        WorkflowEditorPanel.currentPanel = new WorkflowEditorPanel(panel, name);
    }

    private _getHtml(name: string): string {
        return /*html*/ `
        <!DOCTYPE html>
        <html class="dark" lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Editor - ${name}</title>
            <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&family=Fira+Code:wght@400;500&display=swap" rel="stylesheet">
            <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet">
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&family=Fira+Code:wght@400;500&display=swap');
                @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');
                *{margin:0;padding:0;box-sizing:border-box}
                .material-symbols-outlined{font-variation-settings:'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24;font-family:'Material Symbols Outlined'}
                body{font-family:'Inter',sans-serif;background-color:#131313;color:#e5e2e1;margin:0;height:100vh;display:flex;flex-direction:column;overflow:hidden}
                ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:#353535;border-radius:10px}::-webkit-scrollbar-thumb:hover{background:#404751}

                /* BREADCRUMB HEADER */
                .breadcrumb-bar{height:56px;border-bottom:1px solid rgba(64,71,82,.1);display:flex;align-items:center;justify-content:space-between;padding:0 24px;background:#1B1B1C;flex-shrink:0}
                .bc-left{display:flex;align-items:center;gap:16px}
                .bc-back{display:flex;align-items:center;gap:6px;padding:6px 12px;background:#202020;border:1px solid rgba(64,71,82,.15);border-radius:6px;color:#C0C7D4;font-size:.6875rem;font-weight:600;cursor:pointer;transition:all .15s ease;font-family:'Inter',sans-serif}
                .bc-back:hover{background:#353535;color:#e5e2e1}
                .bc-back .material-symbols-outlined{font-size:16px}
                .bc-path{display:flex;align-items:center;gap:6px;font-size:.6875rem;font-weight:600;color:#C0C7D4;text-transform:uppercase;letter-spacing:.08em}
                .bc-path span{color:#8a919e}
                .bc-path .bc-active{color:#A3C9FF}
                .bc-editable{display:flex;align-items:center;gap:6px}
                .bc-editable input{background:transparent;border:none;outline:none;color:#e5e2e1;font-family:'Space Grotesk',sans-serif;font-weight:600;font-size:.8125rem;width:280px}
                .bc-editable .material-symbols-outlined{font-size:14px;color:#8a919e}
                .bc-right{display:flex;align-items:center;gap:8px}
                .btn-run{display:flex;align-items:center;gap:6px;padding:8px 18px;background:linear-gradient(180deg,#A3C9FF,#0078D4);border:none;border-radius:6px;color:#fff;font-size:.6875rem;font-weight:700;cursor:pointer;transition:all .15s ease;font-family:'Inter',sans-serif;box-shadow:0 4px 12px rgba(0,120,212,.3)}
                .btn-run:hover{filter:brightness(1.1)}
                .btn-run:active{transform:scale(.97)}
                .btn-run .material-symbols-outlined{font-size:14px}
                .btn-sec{display:flex;align-items:center;gap:6px;padding:8px 16px;background:#2a2a2a;border:1px solid rgba(64,71,82,.15);border-radius:6px;color:#C0C7D4;font-size:.6875rem;font-weight:700;cursor:pointer;transition:all .15s ease;font-family:'Inter',sans-serif}
                .btn-sec:hover{background:#353535;color:#e5e2e1}
                .btn-sec .material-symbols-outlined{font-size:14px}

                /* SPLIT LAYOUT */
                .split{flex:1;display:flex;overflow:hidden}

                /* LEFT PANEL */
                .left-panel{width:50%;display:flex;flex-direction:column;border-right:1px solid rgba(64,71,82,.1);background:#131313}
                .panel-tabs{display:flex;border-bottom:1px solid rgba(64,71,82,.1)}
                .panel-tab{padding:12px 24px;font-size:.6875rem;font-weight:600;cursor:pointer;border-bottom:2px solid transparent;color:#C0C7D4;transition:all .15s ease;display:flex;align-items:center;gap:8px}
                .panel-tab.active{color:#A3C9FF;border-bottom-color:#A3C9FF;background:#131313}
                .panel-tab:hover{color:#e5e2e1}
                .panel-tab .material-symbols-outlined{font-size:14px}
                .input-area{flex:1;padding:20px;display:flex;flex-direction:column;gap:12px}
                .input-area textarea{flex:1;background:#0E0E0E;border:1px solid rgba(64,71,82,.1);border-radius:8px;padding:20px;font-family:'Fira Code',monospace;font-size:.8125rem;line-height:1.7;color:#C0C7D4;resize:none;outline:none;transition:border-color .15s ease}
                .input-area textarea:focus{border-color:rgba(163,201,255,.3)}
                .input-actions{display:flex;align-items:center;justify-content:space-between}
                .input-actions-left{display:flex;gap:8px}
                .ia-btn{display:flex;align-items:center;gap:6px;padding:8px 14px;background:#2a2a2a;border:1px solid rgba(64,71,82,.15);border-radius:6px;color:#C0C7D4;font-size:.6875rem;font-weight:600;cursor:pointer;transition:all .15s ease;font-family:'Inter',sans-serif}
                .ia-btn:hover{background:#353535;color:#e5e2e1}
                .ia-btn .material-symbols-outlined{font-size:14px}

                /* RIGHT PANEL */
                .right-panel{width:50%;display:flex;flex-direction:column;background:#0E0E0E}
                .right-header{padding:14px 24px;border-bottom:1px solid rgba(64,71,82,.1);display:flex;justify-content:space-between;align-items:center;flex-shrink:0}
                .right-header h3{font-size:.625rem;font-weight:700;text-transform:uppercase;letter-spacing:.2em;color:#8a919e}
                .right-header h3 span{color:#A3C9FF}
                .doc-dots{display:flex;gap:4px}
                .doc-dot{width:6px;height:6px;border-radius:50%}
                .dd-done{background:#61dac1}
                .dd-active{background:#A3C9FF;animation:blink 2s infinite}
                @keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}
                .dd-pending{background:rgba(64,71,82,.3)}
                .right-content{flex:1;overflow-y:auto;padding:20px;display:flex;flex-direction:column;gap:10px}

                /* DOCUMENT CARDS */
                .doc-card{display:flex;align-items:center;justify-content:space-between;padding:16px;background:#202020;border:1px solid rgba(64,71,82,.1);border-radius:10px;cursor:pointer;transition:all .15s ease}
                .doc-card:hover{border-color:rgba(97,218,193,.3);background:#252525}
                .doc-card.active{border-color:rgba(163,201,255,.4);background:rgba(163,201,255,.04);box-shadow:0 4px 16px rgba(163,201,255,.08)}
                .doc-card.pending{opacity:.6;border-style:dashed}
                .dc-left{display:flex;align-items:center;gap:14px}
                .dc-icon{width:40px;height:40px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
                .dc-icon .material-symbols-outlined{font-size:18px}
                .di-done{background:rgba(97,218,193,.12);color:#61dac1}
                .di-active{background:rgba(163,201,255,.12);color:#A3C9FF}
                .di-pending{background:#353535;color:#8a919e}
                .dc-info h4{font-size:.8125rem;font-weight:600;color:#e5e2e1}
                .dc-info p{font-size:.6875rem;color:#8a919e;margin-top:2px}
                .doc-card.active .dc-info p{color:rgba(163,201,255,.8)}
                .dc-right{display:flex;align-items:center;gap:10px}
                .dc-status{font-family:'Fira Code',monospace;font-size:.5625rem;text-transform:uppercase;font-weight:700}
                .dc-status.green{color:#61dac1}
                .dc-status.blue{color:#A3C9FF;animation:blink 2s infinite}
                .dc-status.gray{color:#8a919e}
                .dc-check{color:#61dac1;font-size:18px}
                .dc-spinner{width:18px;height:18px;border:2px solid #A3C9FF;border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite}
                @keyframes spin{to{transform:rotate(360deg)}}
                .dc-pending-icon{color:#8a919e;font-size:18px}
            </style>
        </head>
        <body>
            <!-- BREADCRUMB BAR -->
            <div class="breadcrumb-bar">
                <div class="bc-left">
                    <button class="bc-back" onclick="handleAction('back')"><span class="material-symbols-outlined">arrow_back</span> Back</button>
                    <div class="bc-path"><span>Projects</span> / <span class="bc-active">${name}</span></div>
                    <div style="width:1px;height:16px;background:rgba(64,71,82,.2)"></div>
                    <div class="bc-editable">
                        <input type="text" value="Workflow: ${name}">
                        <span class="material-symbols-outlined">edit</span>
                    </div>
                </div>
                <div class="bc-right">
                    <button class="btn-run" onclick="handleAction('run')"><span class="material-symbols-outlined" style="font-variation-settings:'FILL' 1">play_arrow</span> Run</button>
                    <button class="btn-sec" onclick="handleAction('save')"><span class="material-symbols-outlined">save</span> Save</button>
                    <button class="btn-sec" onclick="handleAction('export')"><span class="material-symbols-outlined">ios_share</span> Export</button>
                </div>
            </div>

            <!-- SPLIT LAYOUT -->
            <div class="split">
                <!-- LEFT: INPUT -->
                <div class="left-panel">
                    <div class="panel-tabs">
                        <div class="panel-tab active"><span class="material-symbols-outlined">subject</span> Text Input</div>
                        <div class="panel-tab"><span class="material-symbols-outlined">upload_file</span> Upload Document</div>
                    </div>
                    <div class="input-area">
                        <textarea placeholder="Describe your workflow logic here...">Rewrite legacy PHP monolith to microservices.
Ensure event-driven architecture using Kafka.
Target GCP Cloud Run for deployment.
Apply Domain Driven Design (DDD) principles.

Required Outputs:
1. System Context Diagram
2. Data Flow Analysis
3. Infrastructure as Code (Terraform) templates
4. API Gateway Configuration
5. Service Mesh Networking</textarea>
                        <div class="input-actions">
                            <div class="input-actions-left">
                                <button class="ia-btn"><span class="material-symbols-outlined">attach_file</span> Attach File</button>
                                <button class="ia-btn"><span class="material-symbols-outlined">delete_sweep</span> Clear</button>
                            </div>
                            <button class="ia-btn"><span class="material-symbols-outlined">auto_awesome_motion</span> Templates</button>
                        </div>
                    </div>
                </div>

                <!-- RIGHT: DOCUMENTS -->
                <div class="right-panel">
                    <div class="right-header">
                        <h3>Documents <span>(4/20)</span></h3>
                        <div class="doc-dots"><div class="doc-dot dd-done"></div><div class="doc-dot dd-done"></div><div class="doc-dot dd-done"></div><div class="doc-dot dd-done"></div><div class="doc-dot dd-active"></div><div class="doc-dot dd-active"></div><div class="doc-dot dd-pending"></div></div>
                    </div>
                    <div class="right-content">
                        <div class="doc-card" onclick="handleAction('view-document','Vision & Strategy')">
                            <div class="dc-left">
                                <div class="dc-icon di-done"><span class="material-symbols-outlined">lightbulb</span></div>
                                <div class="dc-info"><h4>Vision & Strategy</h4><p>Strategic alignment & business goals</p></div>
                            </div>
                            <div class="dc-right"><span class="dc-status green">Done</span><span class="material-symbols-outlined dc-check" style="font-variation-settings:'FILL' 1">check_circle</span></div>
                        </div>
                        <div class="doc-card" onclick="handleAction('view-document','User Personas')">
                            <div class="dc-left">
                                <div class="dc-icon di-done"><span class="material-symbols-outlined">groups</span></div>
                                <div class="dc-info"><h4>User Personas</h4><p>Target audience definitions</p></div>
                            </div>
                            <div class="dc-right"><span class="dc-status green">Done</span><span class="material-symbols-outlined dc-check" style="font-variation-settings:'FILL' 1">check_circle</span></div>
                        </div>
                        <div class="doc-card" onclick="handleAction('view-document','Product Roadmap')">
                            <div class="dc-left">
                                <div class="dc-icon di-done"><span class="material-symbols-outlined">map</span></div>
                                <div class="dc-info"><h4>Product Roadmap</h4><p>Phase-wise delivery plan</p></div>
                            </div>
                            <div class="dc-right"><span class="dc-status green">Done</span><span class="material-symbols-outlined dc-check" style="font-variation-settings:'FILL' 1">check_circle</span></div>
                        </div>
                        <div class="doc-card" onclick="handleAction('view-document','GTM Strategy')">
                            <div class="dc-left">
                                <div class="dc-icon di-done"><span class="material-symbols-outlined">trending_up</span></div>
                                <div class="dc-info"><h4>GTM Strategy</h4><p>Go-to-market positioning</p></div>
                            </div>
                            <div class="dc-right"><span class="dc-status green">Done</span><span class="material-symbols-outlined dc-check" style="font-variation-settings:'FILL' 1">check_circle</span></div>
                        </div>
                        <div class="doc-card active" onclick="handleAction('view-document','Strategic Use Cases')">
                            <div class="dc-left">
                                <div class="dc-icon di-active"><span class="material-symbols-outlined">account_tree</span></div>
                                <div class="dc-info"><h4>Strategic Use Cases</h4><p>Generating functional requirements...</p></div>
                            </div>
                            <div class="dc-right"><span class="dc-status blue">Running</span><div class="dc-spinner"></div></div>
                        </div>
                        <div class="doc-card active" onclick="handleAction('view-document','UI Flows & Navigation')">
                            <div class="dc-left">
                                <div class="dc-icon di-active"><span class="material-symbols-outlined">route</span></div>
                                <div class="dc-info"><h4>UI Flows & Navigation</h4><p>Generating navigation flows...</p></div>
                            </div>
                            <div class="dc-right"><span class="dc-status blue">Running</span><div class="dc-spinner"></div></div>
                        </div>
                        <div class="doc-card pending">
                            <div class="dc-left">
                                <div class="dc-icon di-pending"><span class="material-symbols-outlined">dataset</span></div>
                                <div class="dc-info"><h4 style="color:#C0C7D4">Synthetic Data Schema</h4><p>Data models & relationships</p></div>
                            </div>
                            <div class="dc-right"><span class="dc-status gray">Pending</span><span class="material-symbols-outlined dc-pending-icon">radio_button_unchecked</span></div>
                        </div>
                        <div class="doc-card pending">
                            <div class="dc-left">
                                <div class="dc-icon di-pending"><span class="material-symbols-outlined">description</span></div>
                                <div class="dc-info"><h4 style="color:#C0C7D4">Product Requirements Doc</h4><p>PRD with feature specifications</p></div>
                            </div>
                            <div class="dc-right"><span class="dc-status gray">Pending</span><span class="material-symbols-outlined dc-pending-icon">radio_button_unchecked</span></div>
                        </div>
                        <div class="doc-card pending">
                            <div class="dc-left">
                                <div class="dc-icon di-pending"><span class="material-symbols-outlined">architecture</span></div>
                                <div class="dc-info"><h4 style="color:#C0C7D4">Technical Architecture</h4><p>System design & components</p></div>
                            </div>
                            <div class="dc-right"><span class="dc-status gray">Pending</span><span class="material-symbols-outlined dc-pending-icon">radio_button_unchecked</span></div>
                        </div>
                        <div class="doc-card pending">
                            <div class="dc-left">
                                <div class="dc-icon di-pending"><span class="material-symbols-outlined">database</span></div>
                                <div class="dc-info"><h4 style="color:#C0C7D4">Database Design</h4><p>Entity relationship diagrams</p></div>
                            </div>
                            <div class="dc-right"><span class="dc-status gray">Pending</span><span class="material-symbols-outlined dc-pending-icon">radio_button_unchecked</span></div>
                        </div>
                        <div class="doc-card pending">
                            <div class="dc-left">
                                <div class="dc-icon di-pending"><span class="material-symbols-outlined">api</span></div>
                                <div class="dc-info"><h4 style="color:#C0C7D4">API Specifications</h4><p>REST/GraphQL endpoint specs</p></div>
                            </div>
                            <div class="dc-right"><span class="dc-status gray">Pending</span><span class="material-symbols-outlined dc-pending-icon">radio_button_unchecked</span></div>
                        </div>
                        <div class="doc-card pending">
                            <div class="dc-left">
                                <div class="dc-icon di-pending"><span class="material-symbols-outlined">security</span></div>
                                <div class="dc-info"><h4 style="color:#C0C7D4">Security Specification</h4><p>Auth, encryption & compliance</p></div>
                            </div>
                            <div class="dc-right"><span class="dc-status gray">Pending</span><span class="material-symbols-outlined dc-pending-icon">radio_button_unchecked</span></div>
                        </div>
                        <div class="doc-card pending">
                            <div class="dc-left">
                                <div class="dc-icon di-pending"><span class="material-symbols-outlined">bug_report</span></div>
                                <div class="dc-info"><h4 style="color:#C0C7D4">Testing Strategy</h4><p>Test plans & coverage matrix</p></div>
                            </div>
                            <div class="dc-right"><span class="dc-status gray">Pending</span><span class="material-symbols-outlined dc-pending-icon">radio_button_unchecked</span></div>
                        </div>
                        <div class="doc-card pending">
                            <div class="dc-left">
                                <div class="dc-icon di-pending"><span class="material-symbols-outlined">cloud</span></div>
                                <div class="dc-info"><h4 style="color:#C0C7D4">DevOps & Infrastructure</h4><p>CI/CD, containers & hosting</p></div>
                            </div>
                            <div class="dc-right"><span class="dc-status gray">Pending</span><span class="material-symbols-outlined dc-pending-icon">radio_button_unchecked</span></div>
                        </div>
                        <div class="doc-card pending">
                            <div class="dc-left">
                                <div class="dc-icon di-pending"><span class="material-symbols-outlined">layers</span></div>
                                <div class="dc-info"><h4 style="color:#C0C7D4">Interactive Mockup</h4><p>Clickable UI prototype</p></div>
                            </div>
                            <div class="dc-right"><span class="dc-status gray">Pending</span><span class="material-symbols-outlined dc-pending-icon">radio_button_unchecked</span></div>
                        </div>
                        <div class="doc-card pending">
                            <div class="dc-left">
                                <div class="dc-icon di-pending"><span class="material-symbols-outlined">palette</span></div>
                                <div class="dc-info"><h4 style="color:#C0C7D4">Brand Style Guide</h4><p>Colors, typography & assets</p></div>
                            </div>
                            <div class="dc-right"><span class="dc-status gray">Pending</span><span class="material-symbols-outlined dc-pending-icon">radio_button_unchecked</span></div>
                        </div>
                        <div class="doc-card pending">
                            <div class="dc-left">
                                <div class="dc-icon di-pending"><span class="material-symbols-outlined">business_center</span></div>
                                <div class="dc-info"><h4 style="color:#C0C7D4">Business Requirements Doc</h4><p>Stakeholder requirements</p></div>
                            </div>
                            <div class="dc-right"><span class="dc-status gray">Pending</span><span class="material-symbols-outlined dc-pending-icon">radio_button_unchecked</span></div>
                        </div>
                        <div class="doc-card pending">
                            <div class="dc-left">
                                <div class="dc-icon di-pending"><span class="material-symbols-outlined">fact_check</span></div>
                                <div class="dc-info"><h4 style="color:#C0C7D4">Functional Requirements</h4><p>Feature-level specifications</p></div>
                            </div>
                            <div class="dc-right"><span class="dc-status gray">Pending</span><span class="material-symbols-outlined dc-pending-icon">radio_button_unchecked</span></div>
                        </div>
                        <div class="doc-card pending">
                            <div class="dc-left">
                                <div class="dc-icon di-pending"><span class="material-symbols-outlined">inventory_2</span></div>
                                <div class="dc-info"><h4 style="color:#C0C7D4">Bill of Materials</h4><p>Infrastructure cost estimation</p></div>
                            </div>
                            <div class="dc-right"><span class="dc-status gray">Pending</span><span class="material-symbols-outlined dc-pending-icon">radio_button_unchecked</span></div>
                        </div>
                        <div class="doc-card pending">
                            <div class="dc-left">
                                <div class="dc-icon di-pending"><span class="material-symbols-outlined">rocket_launch</span></div>
                                <div class="dc-info"><h4 style="color:#C0C7D4">Implementation Plan</h4><p>Sprint plan & milestones</p></div>
                            </div>
                            <div class="dc-right"><span class="dc-status gray">Pending</span><span class="material-symbols-outlined dc-pending-icon">radio_button_unchecked</span></div>
                        </div>
                    </div>
                </div>
            </div>
            <script>
                const vscode=acquireVsCodeApi();
                function handleAction(c,d){vscode.postMessage(d?{command:c,doc:d}:{command:c})}
                document.querySelectorAll('.panel-tab').forEach(tab=>{
                    tab.addEventListener('click',()=>{
                        document.querySelectorAll('.panel-tab').forEach(t=>t.classList.remove('active'));
                        tab.classList.add('active');
                    });
                });
            </script>
        </body>
        </html>`;
    }
}

// ==================== EXPORT DIALOG MODAL ====================
