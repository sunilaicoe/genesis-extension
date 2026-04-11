import * as vscode from 'vscode';
import { WorkflowService } from '../services/workflowService';
import { Artifact, DOCUMENT_TYPES } from '../api/genesisApi';

export class DocumentPreviewPanel {
    public static currentPanel: DocumentPreviewPanel | undefined;
    private _panel: vscode.WebviewPanel;
    private _service: WorkflowService;
    private _workflowId: string;
    private _workflowName: string;
    private _docType: string;
    private _artifact: Artifact | null = null;

    constructor(panel: vscode.WebviewPanel, service: WorkflowService, workflowId: string, wfName: string, docType: string) {
        this._panel = panel;
        this._service = service;
        this._workflowId = workflowId;
        this._workflowName = wfName;
        this._docType = docType;
        this._update(true);
        this._panel.onDidDispose(() => { DocumentPreviewPanel.currentPanel = undefined; });
        this._panel.webview.onDidReceiveMessage(message => {
            switch (message.command) {
                case 'back': this._panel.dispose(); break;
                case 'view-document':
                    this._docType = message.doc;
                    this._artifact = null;
                    this._update(true);
                    break;
                case 'export':
                    this._service.exportDocuments(this._workflowId);
                    break;
                case 'regenerate':
                    this._service.regenerateDocument(this._workflowId, this._docType);
                    this._update(true);
                    break;
                case 'open-editor':
                    vscode.workspace.openTextDocument({
                        content: this._artifact?.content || 'Document content not available yet.',
                        language: 'markdown',
                    }).then(doc => vscode.window.showTextDocument(doc));
                    break;
            }
        });
        // Fetch document content
        this._fetchDocument();
    }

    private async _fetchDocument() {
        try {
            const artifact = await this._service.fetchArtifact(this._workflowId, this._docType);
            this._artifact = artifact;
            this._update();
        } catch {
            this._update();
        }
    }

    public static open(extensionUri: vscode.Uri, service: WorkflowService, workflowId: string, wfName: string, docType: string) {
        if (DocumentPreviewPanel.currentPanel) { DocumentPreviewPanel.currentPanel._panel.dispose(); }
        const docInfo = DOCUMENT_TYPES.find(d => d.type === docType);
        const title = docInfo?.title || docType;
        const panel = vscode.window.createWebviewPanel('genesis-doc-preview', title, vscode.ViewColumn.One, {
            enableScripts: true, retainContextWhenHidden: true, localResourceRoots: [extensionUri]
        });
        DocumentPreviewPanel.currentPanel = new DocumentPreviewPanel(panel, service, workflowId, wfName, docType);
    }

    private _update(loading: boolean = false) { this._panel.webview.html = this._getHtml(loading); }

    private _getHtml(loading: boolean): string {
        const activeDoc = DOCUMENT_TYPES.find(d => d.type === this._docType);
        const title = activeDoc?.title || this._docType;
        const content = this._artifact?.content || '';
        const docStatuses = this._service.getDocumentStatuses(this._workflowId);

        const tabsHtml = docStatuses.map(d => {
            const isActive = d.type === this._docType;
            const statusIcon = d.status === 'completed' ? ' ✓' : d.status === 'running' ? '<span class="tab-spinner"></span>' : '';
            const clickDisabled = d.status === 'pending' ? '' : `onclick="handleAction('view-document','${d.type}')"`;
            return `<div class="doc-tab ${isActive ? 'active' : ''}" ${clickDisabled} style="cursor:${d.status === 'pending' ? 'default' : 'pointer'};opacity:${d.status === 'pending' ? '.4' : '1'}">${d.title}${statusIcon}</div>`;
        }).join('');

        const renderedContent = loading
            ? '<div style="display:flex;align-items:center;justify-content:center;height:300px;color:#8a919e"><div style="text-align:center"><span class="material-symbols-outlined" style="font-size:40px;animation:spin 1s linear infinite;display:block;margin-bottom:12px">sync</span>Loading document...</div></div>'
            : content
                ? `<div class="doc-content-rendered">${this._renderMarkdown(content)}</div>`
                : '<div style="display:flex;align-items:center;justify-content:center;height:300px;color:#8a919e"><div style="text-align:center"><span class="material-symbols-outlined" style="font-size:40px;display:block;margin-bottom:12px">description</span>Document not yet generated.<br><small>Start the pipeline to generate this document.</small></div></div>';

        const wordCount = content ? content.split(/\s+/).length : 0;
        const updatedAt = this._artifact?.updatedAt ? new Date(this._artifact.updatedAt).toLocaleString() : 'N/A';

        return /*html*/ `
        <!DOCTYPE html>
        <html class="dark" lang="en">
        <head>
            <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${title}</title>
            <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&family=Fira+Code:wght@400;500&display=swap" rel="stylesheet">
            <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet">
            <style>
                @keyframes spin{to{transform:rotate(360deg)}}
                @keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}
                *{margin:0;padding:0;box-sizing:border-box}
                .material-symbols-outlined{font-variation-settings:'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24}
                body{font-family:'Inter',sans-serif;background-color:#131313;color:#e5e2e1;margin:0;height:100vh;display:flex;flex-direction:column}
                ::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:#353535;border-radius:10px}
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
                .tabs-bar{display:flex;align-items:center;background:#1B1B1C;height:40px;padding:0 16px;gap:0;border-bottom:1px solid rgba(64,71,82,.1);flex-shrink:0;overflow-x:auto}
                .doc-tab{padding:10px 16px;font-size:.6875rem;font-weight:500;color:#C0C7D4;cursor:pointer;transition:all .15s ease;border-bottom:2px solid transparent;white-space:nowrap;display:flex;align-items:center;gap:8px}
                .doc-tab:hover{color:#e5e2e1;background:rgba(53,53,53,.3)}
                .doc-tab.active{color:#A3C9FF;border-bottom-color:#A3C9FF;background:#202020}
                .tab-spinner{width:8px;height:8px;border-radius:50%;background:#A3C9FF;animation:blink 2s infinite}
                .ctx-toolbar{display:flex;align-items:center;justify-content:space-between;padding:10px 20px;background:#131313;border-bottom:1px solid rgba(64,71,82,.05);flex-shrink:0}
                .ctx-breadcrumb{display:flex;align-items:center;gap:6px;font-size:.6875rem;color:#8a919e}
                .ctx-breadcrumb span{color:#C0C7D4}
                .doc-content{flex:1;overflow-y:auto;background:#131313;padding:40px 0;display:flex;justify-content:center}
                .doc-paper{max-width:720px;width:100%;background:#1E1E1E;padding:48px;box-shadow:0 8px 32px rgba(0,0,0,.4);border-radius:2px;border:1px solid rgba(64,71,82,.05);margin:0 20px 40px}
                .doc-content-rendered{line-height:1.7;color:#C0C7D4;font-size:.875rem}
                .doc-content-rendered h1{font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:2rem;margin:0 0 1.5rem;color:#e5e2e1;letter-spacing:-.02em;line-height:1.2}
                .doc-content-rendered h2{font-family:'Space Grotesk',sans-serif;font-weight:600;font-size:1.375rem;margin:2rem 0 1rem;color:#A3C9FF;border-bottom:1px solid rgba(64,71,82,.15);padding-bottom:.5rem}
                .doc-content-rendered h3{font-family:'Space Grotesk',sans-serif;font-weight:600;font-size:1rem;margin:1.5rem 0 .75rem;color:#e5e2e1}
                .doc-content-rendered p{margin-bottom:1rem}
                .doc-content-rendered ul,.doc-content-rendered ol{padding-left:1.5rem;margin-bottom:1rem}
                .doc-content-rendered li{margin-bottom:.5rem}
                .doc-content-rendered code{font-family:'Fira Code',monospace;font-size:.8125rem;background:#0E0E0E;padding:2px 6px;border-radius:3px;color:#A3C9FF}
                .doc-content-rendered pre{background:#0E0E0E;border-radius:6px;padding:16px;margin:1rem 0;overflow-x:auto;border:1px solid rgba(64,71,82,.15)}
                .doc-content-rendered pre code{background:transparent;padding:0}
                .doc-content-rendered strong{color:#e5e2e1;font-weight:600}
                .doc-content-rendered blockquote{border-left:3px solid #0078D4;padding-left:1rem;margin:1rem 0;color:#8a919e;font-style:italic}
                .doc-content-rendered table{width:100%;border-collapse:collapse;margin:1rem 0}
                .doc-content-rendered th,.doc-content-rendered td{border:1px solid rgba(64,71,82,.2);padding:8px 12px;text-align:left;font-size:.8125rem}
                .doc-content-rendered th{background:#202020;font-weight:600;color:#e5e2e1}
                .doc-footer{display:flex;align-items:center;justify-content:space-between;padding:0 20px;height:28px;background:#0E0E0E;border-top:1px solid rgba(64,71,82,.1);font-family:'Fira Code',monospace;font-size:.5625rem;color:#8a919e;text-transform:uppercase;letter-spacing:.08em;flex-shrink:0}
            </style>
        </head>
        <body>
            <div class="topbar">
                <div class="topbar-left">
                    <button class="back-btn" onclick="handleAction('back')"><span class="material-symbols-outlined">arrow_back</span> Back</button>
                    <span class="topbar-title">${title}</span>
                </div>
                <div class="topbar-right">
                    <button class="tb-btn" onclick="handleAction('open-editor')"><span class="material-symbols-outlined">edit</span> Open as Markdown</button>
                    <button class="tb-btn" onclick="handleAction('export')"><span class="material-symbols-outlined">download</span> Export</button>
                    <button class="tb-btn tb-accent" onclick="handleAction('regenerate')"><span class="material-symbols-outlined">refresh</span> Regenerate</button>
                </div>
            </div>
            <div class="tabs-bar">${tabsHtml}</div>
            <div class="ctx-toolbar">
                <div class="ctx-breadcrumb">
                    <span class="material-symbols-outlined" style="font-size:14px">folder_open</span>
                    <span>Workflows</span> / <span>${this._workflowName}</span> / <span style="color:#A3C9FF">${title}</span>
                </div>
            </div>
            <div class="doc-content">
                <div class="doc-paper">${renderedContent}</div>
            </div>
            <div class="doc-footer">
                <div><span>v${this._artifact?.documentVersion || 1} · Connected to Genesis Cloud</span></div>
                <div><span>${wordCount} Words</span><span>|</span><span>Updated: ${updatedAt}</span></div>
            </div>
            <script>
                const vscode=acquireVsCodeApi();
                function handleAction(c,d){vscode.postMessage(d?{command:c,doc:d}:{command:c})}
            </script>
        </body>
        </html>`;
    }

    private _renderMarkdown(content: string): string {
        // Simple markdown to HTML conversion
        let html = content
            // Escape HTML first
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            // Restore code blocks
            .replace(/```(\w*)\n([\s\S]*?)```/g, (_m, lang, code) => {
                return `<pre><code class="language-${lang}">${code.trim()}</code></pre>`;
            })
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            // Headers
            .replace(/^### (.+)$/gm, '<h3>$1</h3>')
            .replace(/^## (.+)$/gm, '<h2>$1</h2>')
            .replace(/^# (.+)$/gm, '<h1>$1</h1>')
            // Bold and italic
            .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.+?)\*/g, '<em>$1</em>')
            // Links
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color:#A3C9FF">$1</a>')
            // Lists
            .replace(/^[-*] (.+)$/gm, '<li>$1</li>')
            .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
            // Blockquotes
            .replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>')
            // Horizontal rules
            .replace(/^---$/gm, '<hr style="border:none;border-top:1px solid rgba(64,71,82,.2);margin:1.5rem 0">')
            // Paragraphs - wrap lines that aren't already in block elements
            .replace(/^(?!<[a-z])((?!<\/)[^\n]+)$/gm, (match) => {
                if (match.trim().startsWith('<')) return match;
                return `<p>${match}</p>`;
            });

        // Clean up empty paragraphs
        html = html.replace(/<p>\s*<\/p>/g, '');
        // Wrap consecutive li elements in ul
        html = html.replace(/((?:<li>.*?<\/li>\s*)+)/g, '<ul>$1</ul>');

        return html;
    }
}
