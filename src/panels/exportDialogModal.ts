import * as vscode from 'vscode';
import { WorkflowService } from '../services/workflowService';
import { DOCUMENT_TYPES } from '../api/genesisApi';

export class ExportDialogModal {
    public static currentPanel: ExportDialogModal | undefined;
    private _panel: vscode.WebviewPanel;
    private _service: WorkflowService;
    private _workflowId: string;
    private _workflowName: string;

    constructor(panel: vscode.WebviewPanel, service: WorkflowService, workflowId: string, wfName: string) {
        this._panel = panel;
        this._service = service;
        this._workflowId = workflowId;
        this._workflowName = wfName;
        panel.webview.html = this._getHtml();
        this._panel.onDidDispose(() => { ExportDialogModal.currentPanel = undefined; });
        this._panel.webview.onDidReceiveMessage(message => {
            switch (message.command) {
                case 'cancel': this._panel.dispose(); break;
                case 'export': this._handleExport(message); break;
            }
        });
    }

    private async _handleExport(message: any) {
        const format = message.format || 'markdown';
        const selectedTypes: string[] = message.selectedTypes || [];

        if (selectedTypes.length === 0) {
            vscode.window.showWarningMessage('No documents selected for export.');
            return;
        }

        try {
            await this._service.exportAllDocuments(this._workflowId, this._workflowName, selectedTypes, format as 'json' | 'markdown');
            this._panel.dispose();
        } catch (e: any) {
            vscode.window.showErrorMessage(`Export failed: ${e.message}`);
        }
    }

    public static open(extensionUri: vscode.Uri, service: WorkflowService, workflowId: string, wfName: string) {
        if (ExportDialogModal.currentPanel) { ExportDialogModal.currentPanel._panel.reveal(); return; }
        const panel = vscode.window.createWebviewPanel('genesis-export', 'Export Documents', vscode.ViewColumn.One, {
            enableScripts: true, retainContextWhenHidden: false, localResourceRoots: [extensionUri]
        });
        ExportDialogModal.currentPanel = new ExportDialogModal(panel, service, workflowId, wfName);
    }

    private _getHtml(): string {
        const docStatuses = this._service.getDocumentStatuses(this._workflowId);
        const completedDocs = docStatuses.filter(d => d.status === 'completed');

        const docListHtml = completedDocs.map(d => {
            const docInfo = DOCUMENT_TYPES.find(dt => dt.type === d.type);
            const icon = docInfo?.icon || 'description';
            const title = docInfo?.title || d.type;
            return `
            <div class="doc-row" data-type="${d.type}" onclick="toggleCheck(this)">
                <div class="custom-cb checked"></div>
                <span class="material-symbols-outlined" style="font-size:16px;color:#61dac1">${icon}</span>
                <span class="doc-name">${title}</span>
            </div>`;
        }).join('');

        const pendingDocs = docStatuses.filter(d => d.status !== 'completed');
        const pendingHtml = pendingDocs.map(d => {
            const docInfo = DOCUMENT_TYPES.find(dt => dt.type === d.type);
            const icon = docInfo?.icon || 'description';
            const title = docInfo?.title || d.type;
            return `
            <div class="doc-row" style="opacity:.4">
                <div class="custom-cb"></div>
                <span class="material-symbols-outlined" style="font-size:16px;color:#8a919e">${icon}</span>
                <span class="doc-name">${title}</span>
            </div>`;
        }).join('');

        return /*html*/ `
        <!DOCTYPE html>
        <html class="dark" lang="en">
        <head>
            <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Export Documents</title>
            <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&family=Fira+Code:wght@400;500&display=swap" rel="stylesheet">
            <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet">
            <style>
                *{margin:0;padding:0;box-sizing:border-box}
                .material-symbols-outlined{font-variation-settings:'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24}
                body{font-family:'Inter',sans-serif;background-color:#131313;color:#e5e2e1;margin:0;height:100vh;display:flex;align-items:center;justify-content:center}
                .overlay{position:fixed;inset:0;background:rgba(0,0,0,.7);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:20px}
                .modal{width:100%;max-width:680px;background:rgba(53,53,53,.85);backdrop-filter:blur(20px);border-radius:12px;border:1px solid rgba(64,71,82,.15);box-shadow:0 16px 48px rgba(0,0,0,.5);overflow:hidden;display:flex;flex-direction:column}
                .modal-header{padding:32px 32px 24px;border-bottom:1px solid rgba(64,71,82,.1)}
                .modal-header-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
                .modal-header h2{font-family:'Space Grotesk',sans-serif;font-size:1.5rem;font-weight:700;color:#e5e2e1;letter-spacing:-.02em}
                .close-btn{width:32px;height:32px;border-radius:6px;background:rgba(53,53,53,.5);border:1px solid rgba(64,71,82,.2);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .15s ease;color:#C0C7D4}
                .close-btn:hover{background:#353535;color:#e5e2e1}
                .close-btn .material-symbols-outlined{font-size:18px}
                .modal-header p{font-size:.8125rem;color:#C0C7D4}
                .modal-body{padding:28px 32px;display:flex;flex-direction:column;gap:24px;overflow-y:auto;max-height:60vh}
                .section-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.15em;color:#C0C7D4;padding:16px 16px 12px 16px;margin:0 -32px;padding-left:32px;padding-right:32px}
                .format-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
                .format-card{display:flex;flex-direction:column;align-items:center;gap:8px;padding:14px;background:rgba(14,14,14,.8);border:1px solid rgba(64,71,82,.2);border-radius:8px;cursor:pointer;transition:all .15s ease}
                .format-card:hover{border-color:rgba(64,71,82,.4);background:#2a2a2a}
                .format-card.selected{border-color:rgba(163,201,255,.4);background:rgba(163,201,255,.06)}
                .format-card .material-symbols-outlined{font-size:22px;color:#A3C9FF}
                .format-card span{font-size:.75rem;font-weight:500;color:#e5e2e1}
                .selection-header{display:flex;align-items:center;justify-content:space-between}
                .custom-cb{width:16px;height:16px;border-radius:3px;border:2px solid rgba(64,71,82,.5);display:flex;align-items:center;justify-content:center;flex-shrink:0;cursor:pointer;transition:all .15s ease}
                .custom-cb.checked{background:#0078D4;border-color:#0078D4}
                .custom-cb.checked::after{content:'✓';font-size:10px;color:#fff;font-weight:700}
                .doc-list{display:flex;flex-direction:column;gap:1px;background:rgba(64,71,82,.12);border-radius:8px;overflow:hidden}
                .doc-row{display:flex;align-items:center;gap:12px;padding:12px 16px;background:#1B1B1C;cursor:pointer;transition:background .15s ease}
                .doc-row:hover{background:#202020}
                .doc-name{font-size:.75rem;color:#e5e2e1;flex:1}
                .modal-footer{padding:20px 32px;border-top:1px solid rgba(64,71,82,.1);display:flex;justify-content:flex-end;gap:12px}
                .btn{padding:10px 24px;font-family:'Inter',sans-serif;font-size:.8125rem;font-weight:600;border:none;border-radius:6px;cursor:pointer;transition:all .15s ease;display:flex;align-items:center;gap:8px}
                .btn:active{transform:scale(.97)}
                .btn-ghost{background:transparent;color:#C0C7D4;border:1px solid rgba(64,71,82,.2)}
                .btn-ghost:hover{background:rgba(53,53,53,.5);color:#e5e2e1}
                .btn-primary{background:linear-gradient(180deg,#A3C9FF,#0078D4);color:#fff;box-shadow:0 4px 12px rgba(0,120,212,.3)}
                .btn-primary:hover{filter:brightness(1.1)}
                .btn .material-symbols-outlined{font-size:18px}
                .progress-section{width:100%}
                .progress-row{display:flex;justify-content:space-between;font-size:.6875rem;color:#8a919e;margin-bottom:6px}
                .progress-bar{width:100%;height:4px;background:#0E0E0E;border-radius:9999px;overflow:hidden}
                .progress-fill{height:100%;background:linear-gradient(90deg,#A3C9FF,#0078D4);border-radius:9999px;transition:width .5s ease}
            </style>
        </head>
        <body>
            <div class="overlay">
                <div class="modal">
                    <div class="modal-header">
                        <div class="modal-header-top">
                            <h2>Export Documents</h2>
                            <button class="close-btn" onclick="handleAction('cancel')"><span class="material-symbols-outlined">close</span></button>
                        </div>
                        <p>${this._workflowName} — ${completedDocs.length} of ${docStatuses.length} documents ready to export as ZIP</p>
                    </div>
                    <div class="modal-body">
                        <div>
                            <div class="section-label" style="padding:0 0 12px 0">Export Format</div>
                            <div class="format-grid">
                                <div class="format-card selected" onclick="selectFormat(this)"><span class="material-symbols-outlined">picture_as_pdf</span><span>PDF</span></div>
                                <div class="format-card" onclick="selectFormat(this)"><span class="material-symbols-outlined">markdown</span><span>Markdown</span></div>
                                <div class="format-card" onclick="selectFormat(this)"><span class="material-symbols-outlined">html</span><span>HTML</span></div>
                                <div class="format-card" onclick="selectFormat(this)"><span class="material-symbols-outlined">library_add_check</span><span>JSON</span></div>
                            </div>
                        </div>
                        <div class="selection-header">
                            <div class="section-label" style="padding:0 0 12px 0;margin:0">Selection List (${completedDocs.length} available)</div>
                            <div class="custom-cb checked" onclick="toggleAll(this)"></div>
                        </div>
                        <div class="doc-list">
                            ${docListHtml}
                            ${pendingHtml}
                        </div>
                    </div>
                    <div class="modal-footer">
                        <div class="progress-section">
                            <div class="progress-row"><span>Export Status</span><span>Waiting...</span></div>
                            <div class="progress-bar"><div class="progress-fill" id="export-progress" style="width:0%"></div></div>
                        </div>
                        <div style="display:flex;gap:12px">
                            <button class="btn btn-ghost" onclick="handleAction('cancel')">Cancel</button>
                            <button class="btn btn-primary" onclick="startExport()"><span class="material-symbols-outlined">folder_zip</span> Export ZIP</button>
                        </div>
                    </div>
                </div>
            </div>
            <script>
                const vscode=acquireVsCodeApi();
                var selectedFormat='markdown';
                function handleAction(c){vscode.postMessage({command:c})}
                function selectFormat(el){
                    document.querySelectorAll('.format-card').forEach(c=>c.classList.remove('selected'));
                    el.classList.add('selected');
                    var label=el.querySelector('span:last-child').textContent.trim().toLowerCase();
                    if(label==='pdf')selectedFormat='markdown';
                    else if(label==='html')selectedFormat='markdown';
                    else if(label==='json')selectedFormat='json';
                    else selectedFormat='markdown';
                }
                function toggleCheck(row){var cb=row.querySelector('.custom-cb');if(cb)cb.classList.toggle('checked')}
                function toggleAll(el){var isChecked=el.classList.contains('checked');el.classList.toggle('checked');document.querySelectorAll('.doc-row .custom-cb').forEach(function(cb){if(!cb.closest('.doc-row').style.opacity){if(isChecked)cb.classList.remove('checked');else cb.classList.add('checked')}})}
                function startExport(){
                    var selected=[];
                    document.querySelectorAll('.doc-row').forEach(function(row){
                        var cb=row.querySelector('.custom-cb');
                        if(cb&&cb.classList.contains('checked')){
                            var t=row.getAttribute('data-type');
                            if(t)selected.push(t);
                        }
                    });
                    vscode.postMessage({command:'export',format:selectedFormat,selectedTypes:selected});
                    var fill=document.getElementById('export-progress');
                    if(fill)fill.style.width='100%';
                }
            </script>
        </body>
        </html>`;
    }
}
