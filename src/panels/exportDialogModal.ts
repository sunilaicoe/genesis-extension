import * as vscode from 'vscode';

export class ExportDialogModal {
    public static currentPanel: ExportDialogModal | undefined;
    private _panel: vscode.WebviewPanel;
    private static _onBack: (() => void) | undefined;

    public static setOnBack(cb: () => void) { ExportDialogModal._onBack = cb; }

    private constructor(panel: vscode.WebviewPanel, wfName: string) {
        this._panel = panel;
        panel.webview.html = this._getHtml(wfName);
        this._panel.onDidDispose(() => { ExportDialogModal.currentPanel = undefined; });
        this._panel.webview.onDidReceiveMessage(message => {
            switch (message.command) {
                case 'cancel': this._panel.dispose(); break;
                case 'export': vscode.window.showInformationMessage('Exporting documents for ' + wfName + '...'); break;
                case 'browse':
                    vscode.window.showOpenDialog({ canSelectFiles: false, canSelectFolders: true }).then(uris => {
                        if (uris && uris.length > 0) this._panel.webview.postMessage({ command: 'update-path', value: uris[0].fsPath });
                    });
                    break;
            }
        });
    }

    public static open(extensionUri: vscode.Uri, name: string) {
        if (ExportDialogModal.currentPanel) { ExportDialogModal.currentPanel._panel.reveal(); return; }
        const panel = vscode.window.createWebviewPanel('genesis-export', 'Export Documents', vscode.ViewColumn.One, {
            enableScripts: true, retainContextWhenHidden: false, localResourceRoots: [extensionUri]
        });
        ExportDialogModal.currentPanel = new ExportDialogModal(panel, name);
    }

    private _getHtml(wfName: string): string {
        return /*html*/ `
        <!DOCTYPE html>
        <html class="dark" lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Export Documents</title>
            <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&family=Fira+Code:wght@400;500&display=swap" rel="stylesheet">
            <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet">
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&family=Fira+Code:wght@400;500&display=swap');
                @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');
                *{margin:0;padding:0;box-sizing:border-box}
                .material-symbols-outlined{font-variation-settings:'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24;font-family:'Material Symbols Outlined'}
                body{font-family:'Inter',sans-serif;background-color:#131313;color:#e5e2e1;margin:0;height:100vh;display:flex;align-items:center;justify-content:center}
                .overlay{position:fixed;inset:0;background:rgba(0,0,0,.8);backdrop-filter:blur(12px);display:flex;align-items:center;justify-content:center;padding:24px}
                .modal{width:100%;max-width:640px;background:rgba(53,53,53,.8);backdrop-filter:blur(20px);border-radius:12px;border:1px solid rgba(64,71,82,.15);box-shadow:0 16px 48px rgba(0,0,0,.5);overflow:hidden;display:flex;flex-direction:column}

                /* HEADER */
                .modal-header{padding:32px 32px 24px;border-bottom:1px solid rgba(64,71,82,.1)}
                .modal-header-top{display:flex;justify-content:space-between;align-items:flex-start}
                .modal-header h2{font-family:'Space Grotesk',sans-serif;font-size:1.5rem;font-weight:700;color:#e5e2e1;letter-spacing:-.02em}
                .modal-header p{font-size:.8125rem;color:#C0C7D4;margin-top:6px}
                .close-btn{color:#8a919e;cursor:pointer;transition:color .15s ease;background:none;border:none;padding:4px}
                .close-btn:hover{color:#e5e2e1}
                .close-btn .material-symbols-outlined{font-size:20px}

                /* BODY */
                .modal-body{padding:28px 32px;display:flex;flex-direction:column;gap:28px;overflow-y:auto;max-height:55vh}
                .section-label{font-family:'Space Grotesk',sans-serif;font-size:.6875rem;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:#A3C9FF;margin-bottom:12px}

                /* FORMAT GRID */
                .format-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
                .format-card{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:16px 12px;background:rgba(14,14,14,.8);border:1px solid rgba(64,71,82,.15);border-radius:6px;cursor:pointer;transition:all .15s ease;gap:8px}
                .format-card:hover{background:rgba(53,53,53,.4)}
                .format-card.selected{border-color:#A3C9FF;background:rgba(163,201,255,.05)}
                .format-card .material-symbols-outlined{font-size:22px;color:#C0C7D4}
                .format-card.selected .material-symbols-outlined{color:#A3C9FF}
                .format-card span{font-size:.6875rem;font-weight:500;color:#e5e2e1}

                /* OUTPUT PATH */
                .path-row{display:flex;gap:8px}
                .path-input{flex:1;background:rgba(14,14,14,.8);padding:10px 16px;border-radius:6px;border:1px solid rgba(64,71,82,.15);display:flex;align-items:center;overflow:hidden}
                .path-input span{font-family:'Fira Code',monospace;font-size:.8125rem;color:#C0C7D4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
                .browse-btn{padding:10px 16px;background:#2a2a2a;border:1px solid rgba(64,71,82,.15);border-radius:6px;color:#e5e2e1;font-size:.8125rem;font-weight:500;cursor:pointer;transition:all .15s ease;display:flex;align-items:center;gap:8px;font-family:'Inter',sans-serif;flex-shrink:0}
                .browse-btn:hover{background:#353535}
                .browse-btn .material-symbols-outlined{font-size:16px}

                /* SELECTION LIST */
                .selection-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
                .selection-header label{display:flex;align-items:center;gap:8px;cursor:pointer}
                .selection-header label span{font-size:.6875rem;font-weight:500;color:#C0C7D4}
                .custom-cb{width:16px;height:16px;border-radius:3px;background:rgba(14,14,14,.8);border:1px solid rgba(64,71,82,.3);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0}
                .custom-cb.checked{background:#0078D4;border-color:#0078D4}
                .custom-cb.checked::after{content:'✓';font-size:11px;color:#fff}
                .doc-list{background:rgba(14,14,14,.8);border-radius:6px;border:1px solid rgba(64,71,82,.15);overflow:hidden}
                .doc-row{display:flex;align-items:center;gap:14px;padding:12px 16px;transition:background .15s ease;cursor:pointer}
                .doc-row:hover{background:rgba(53,53,53,.3)}
                .doc-row+.doc-row{border-top:1px solid rgba(64,71,82,.08)}
                .doc-row .material-symbols-outlined{font-size:18px;color:#C0C7D4}

                /* FOOTER */
                .modal-footer{padding:24px 32px;border-top:1px solid rgba(64,71,82,.1);display:flex;flex-direction:column;gap:16px}
                .progress-section{}
                .progress-row{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
                .progress-row span{font-size:.5625rem;font-family:'Fira Code',monospace;text-transform:uppercase;letter-spacing:.1em;color:#8a919e}
                .progress-bar{height:4px;background:#353535;border-radius:9999px;overflow:hidden}
                .progress-fill{height:100%;background:#0078D4;border-radius:9999px;transition:width .5s ease}
                .footer-actions{display:flex;justify-content:flex-end;gap:12px}
                .btn{padding:10px 24px;font-family:'Inter',sans-serif;font-size:.8125rem;font-weight:600;border:none;border-radius:6px;cursor:pointer;transition:all .15s ease;display:flex;align-items:center;gap:8px}
                .btn:active{transform:scale(.97)}
                .btn-ghost{background:transparent;color:#C0C7D4}
                .btn-ghost:hover{color:#e5e2e1;background:rgba(53,53,53,.3)}
                .btn-primary{background:linear-gradient(180deg,#A3C9FF,#0078D4);color:#fff;box-shadow:0 4px 12px rgba(0,120,212,.3)}
                .btn-primary:hover{filter:brightness(1.1)}
                .btn .material-symbols-outlined{font-size:16px}
            </style>
        </head>
        <body>
            <div class="overlay">
                <div class="modal">
                    <div class="modal-header">
                        <div class="modal-header-top">
                            <div>
                                <h2>Export Documents</h2>
                                <p>Select format and source files for the architectural package.</p>
                            </div>
                            <button class="close-btn" onclick="handleAction('cancel')"><span class="material-symbols-outlined">close</span></button>
                        </div>
                    </div>
                    <div class="modal-body">
                        <!-- FORMAT -->
                        <div>
                            <div class="section-label">Export Format</div>
                            <div class="format-grid">
                                <div class="format-card selected" onclick="selectFormat(this)">
                                    <span class="material-symbols-outlined">picture_as_pdf</span><span>PDF</span>
                                </div>
                                <div class="format-card" onclick="selectFormat(this)">
                                    <span class="material-symbols-outlined">markdown</span><span>Markdown</span>
                                </div>
                                <div class="format-card" onclick="selectFormat(this)">
                                    <span class="material-symbols-outlined">html</span><span>HTML</span>
                                </div>
                                <div class="format-card" onclick="selectFormat(this)">
                                    <span class="material-symbols-outlined">library_add_check</span><span>All</span>
                                </div>
                            </div>
                        </div>
                        <!-- OUTPUT PATH -->
                        <div>
                            <div class="section-label">Output Path</div>
                            <div class="path-row">
                                <div class="path-input"><span>/Users/user/Desktop/Genesis_Exports/${wfName}</span></div>
                                <button class="browse-btn" onclick="handleAction('browse')"><span class="material-symbols-outlined">folder_open</span> Browse</button>
                            </div>
                        </div>
                        <!-- SELECTION LIST -->
                        <div>
                            <div class="selection-header">
                                <div class="section-label" style="margin-bottom:0">Selection List</div>
                                <label>
                                    <div class="custom-cb checked" onclick="this.classList.toggle('checked')"></div>
                                    <span>All Documents</span>
                                </label>
                            </div>
                            <div class="doc-list">
                                <div class="doc-row" onclick="toggleCheck(this)">
                                    <div class="custom-cb checked"></div>
                                    <span class="material-symbols-outlined">lightbulb</span>
                                    <span style="font-size:.8125rem;font-weight:500">Vision & Strategy</span>
                                </div>
                                <div class="doc-row" onclick="toggleCheck(this)">
                                    <div class="custom-cb checked"></div>
                                    <span class="material-symbols-outlined">groups</span>
                                    <span style="font-size:.8125rem;font-weight:500">User Personas</span>
                                </div>
                                <div class="doc-row" onclick="toggleCheck(this)">
                                    <div class="custom-cb checked"></div>
                                    <span class="material-symbols-outlined">map</span>
                                    <span style="font-size:.8125rem;font-weight:500">Product Roadmap</span>
                                </div>
                                <div class="doc-row" onclick="toggleCheck(this)">
                                    <div class="custom-cb checked"></div>
                                    <span class="material-symbols-outlined">trending_up</span>
                                    <span style="font-size:.8125rem;font-weight:500">GTM Strategy</span>
                                </div>
                                <div class="doc-row" onclick="toggleCheck(this)">
                                    <div class="custom-cb checked"></div>
                                    <span class="material-symbols-outlined">account_tree</span>
                                    <span style="font-size:.8125rem;font-weight:500">Strategic Use Cases</span>
                                </div>
                                <div class="doc-row" onclick="toggleCheck(this)">
                                    <div class="custom-cb"></div>
                                    <span class="material-symbols-outlined">route</span>
                                    <span style="font-size:.8125rem;font-weight:500">UI Flows & Navigation</span>
                                </div>
                                <div class="doc-row" onclick="toggleCheck(this)">
                                    <div class="custom-cb"></div>
                                    <span class="material-symbols-outlined">dataset</span>
                                    <span style="font-size:.8125rem;font-weight:500">Synthetic Data Schema</span>
                                </div>
                                <div class="doc-row" onclick="toggleCheck(this)">
                                    <div class="custom-cb"></div>
                                    <span class="material-symbols-outlined">description</span>
                                    <span style="font-size:.8125rem;font-weight:500">Product Requirements Document</span>
                                </div>
                                <div class="doc-row" onclick="toggleCheck(this)">
                                    <div class="custom-cb"></div>
                                    <span class="material-symbols-outlined">architecture</span>
                                    <span style="font-size:.8125rem;font-weight:500">Technical Architecture</span>
                                </div>
                                <div class="doc-row" onclick="toggleCheck(this)">
                                    <div class="custom-cb"></div>
                                    <span class="material-symbols-outlined">database</span>
                                    <span style="font-size:.8125rem;font-weight:500">Database Design</span>
                                </div>
                                <div class="doc-row" onclick="toggleCheck(this)">
                                    <div class="custom-cb"></div>
                                    <span class="material-symbols-outlined">api</span>
                                    <span style="font-size:.8125rem;font-weight:500">API Specifications</span>
                                </div>
                                <div class="doc-row" onclick="toggleCheck(this)">
                                    <div class="custom-cb"></div>
                                    <span class="material-symbols-outlined">security</span>
                                    <span style="font-size:.8125rem;font-weight:500">Security Specification</span>
                                </div>
                                <div class="doc-row" onclick="toggleCheck(this)">
                                    <div class="custom-cb"></div>
                                    <span class="material-symbols-outlined">bug_report</span>
                                    <span style="font-size:.8125rem;font-weight:500">Testing Strategy</span>
                                </div>
                                <div class="doc-row" onclick="toggleCheck(this)">
                                    <div class="custom-cb"></div>
                                    <span class="material-symbols-outlined">cloud</span>
                                    <span style="font-size:.8125rem;font-weight:500">DevOps & Infrastructure</span>
                                </div>
                                <div class="doc-row" onclick="toggleCheck(this)">
                                    <div class="custom-cb"></div>
                                    <span class="material-symbols-outlined">layers</span>
                                    <span style="font-size:.8125rem;font-weight:500">Interactive Mockup</span>
                                </div>
                                <div class="doc-row" onclick="toggleCheck(this)">
                                    <div class="custom-cb"></div>
                                    <span class="material-symbols-outlined">palette</span>
                                    <span style="font-size:.8125rem;font-weight:500">Brand Style Guide</span>
                                </div>
                                <div class="doc-row" onclick="toggleCheck(this)">
                                    <div class="custom-cb"></div>
                                    <span class="material-symbols-outlined">business_center</span>
                                    <span style="font-size:.8125rem;font-weight:500">Business Requirements Document</span>
                                </div>
                                <div class="doc-row" onclick="toggleCheck(this)">
                                    <div class="custom-cb"></div>
                                    <span class="material-symbols-outlined">fact_check</span>
                                    <span style="font-size:.8125rem;font-weight:500">Functional Requirements</span>
                                </div>
                                <div class="doc-row" onclick="toggleCheck(this)">
                                    <div class="custom-cb"></div>
                                    <span class="material-symbols-outlined">inventory_2</span>
                                    <span style="font-size:.8125rem;font-weight:500">Bill of Materials</span>
                                </div>
                                <div class="doc-row" onclick="toggleCheck(this)">
                                    <div class="custom-cb"></div>
                                    <span class="material-symbols-outlined">rocket_launch</span>
                                    <span style="font-size:.8125rem;font-weight:500">Implementation Plan</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <div class="progress-section">
                            <div class="progress-row"><span>Export Status</span><span>Waiting...</span></div>
                            <div class="progress-bar"><div class="progress-fill" id="export-progress" style="width:0%"></div></div>
                        </div>
                        <div class="footer-actions">
                            <button class="btn btn-ghost" onclick="handleAction('cancel')">Cancel</button>
                            <button class="btn btn-primary" onclick="startExport()"><span class="material-symbols-outlined">ios_share</span> Export</button>
                        </div>
                    </div>
                </div>
            </div>
            <script>
                const vscode=acquireVsCodeApi();
                function handleAction(c){vscode.postMessage({command:c})}
                function selectFormat(el){document.querySelectorAll('.format-card').forEach(c=>c.classList.remove('selected'));el.classList.add('selected')}
                function toggleCheck(row){var cb=row.querySelector('.custom-cb');if(cb)cb.classList.toggle('checked')}
                function startExport(){
                    var bar=document.getElementById('export-progress');
                    if(bar){bar.style.width='0%';var p=0;var iv=setInterval(function(){p+=Math.random()*15;if(p>=100){p=100;clearInterval(iv)}bar.style.width=p+'%'},200)}
                    vscode.postMessage({command:'export'});
                }
                window.addEventListener('message',function(e){if(e.data.command==='update-path'){var el=document.querySelector('.path-input span');if(el)el.textContent=e.data.value}});
            </script>
        </body>
        </html>`;
    }
}
