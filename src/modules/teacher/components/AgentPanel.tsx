import { useState, useRef, useEffect, useCallback } from 'react';
import { createAgent, listAgents, listDocuments, addDocument, deleteDocument, deleteAgent } from '../../../services/backendApi';
import {
  Bot, Plus, CheckCircle, AlertCircle, Loader,
  UploadCloud, FileText, Trash2, RefreshCw, MessageSquare, ArrowLeft, X, Eye, EyeOff
} from 'lucide-react';
import AgentChat from './AgentChat';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../../../config/firebase';

interface Agent {
  agent_id: string;
  name: string;
  description: string;
  bot_type?: string | null;
}

interface Doc {
  doc_id: string;
  filename: string;
  chunks: number;
}

export default function AgentPanel({
  classroomName,
  classroomId,
  firestoreId,
  visibleAgentIds = [],
}: {
  classroomName: string;
  classroomId: string;   // short join code — used for backend agent creation & lookup
  firestoreId: string;   // Firestore doc ID — used for visibility toggle writes
  visibleAgentIds?: string[];
}) {
  const [existingAgents, setExistingAgents] = useState<Agent[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(true);

  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');

  const [agent, setAgent] = useState<Agent | null>(null);
  const [view, setView] = useState<'manage' | 'chat'>('manage');

  const [docs, setDocs] = useState<Doc[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [docsError, setDocsError] = useState('');
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [deletingAgentId, setDeletingAgentId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleDeleteAgent = async (agentId: string) => {
    setDeletingAgentId(agentId);
    try {
      await deleteAgent(agentId);
      setExistingAgents(prev => prev.filter(a => a.agent_id !== agentId));
      setConfirmDeleteId(null);
    } catch (err: any) {
      alert(err.message || 'Failed to delete agent');
    } finally {
      setDeletingAgentId(null);
    }
  };

  const handleToggleVisibility = async (agentId: string) => {
    const isVisible = visibleAgentIds.includes(agentId);
    const classroomRef = doc(db, 'classrooms', firestoreId);
    await updateDoc(classroomRef, {
      visibleAgentIds: isVisible ? arrayRemove(agentId) : arrayUnion(agentId),
    });
  };

  useEffect(() => {
    listAgents()
      .then((agents) => setExistingAgents(agents.map(a => ({ agent_id: a.id, name: a.name, description: a.description, bot_type: a.bot_type ?? null }))))
      .catch(() => {})
      .finally(() => setAgentsLoading(false));
  }, []);

  const fetchDocs = useCallback(async (agentId: string) => {
    setDocsLoading(true);
    setDocsError('');
    try {
      const result = await listDocuments(agentId);
      setDocs(result);
    } catch (err: any) {
      setDocsError(err.message || 'Failed to load documents');
    } finally {
      setDocsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (agent) fetchDocs(agent.agent_id);
  }, [agent, fetchDocs]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    setCreateLoading(true);
    try {
      const result = await createAgent(name.trim(), description.trim(), classroomId);
      const newAgent: Agent = { agent_id: result.agent_id, name: name.trim(), description: description.trim() };
      setExistingAgents(prev => [newAgent, ...prev]);
      setAgent(newAgent);
      setName('');
      setDescription('');
      setShowCreate(false);
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create agent');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleUpload = async (file: File) => {
    if (!agent) return;
    if (!file.name.endsWith('.pdf')) { setUploadError('Only PDF files are allowed.'); return; }
    if (file.size > 10 * 1024 * 1024) { setUploadError('File too large (max 10 MB).'); return; }
    setUploadError('');
    setUploadSuccess('');
    setUploadLoading(true);
    try {
      await addDocument(agent.agent_id, file);
      setUploadSuccess(`"${file.name}" uploaded successfully.`);
      await fetchDocs(agent.agent_id);
    } catch (err: any) {
      setUploadError(err.message || 'Upload failed');
    } finally {
      setUploadLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  };

  const handleDelete = async (filename: string) => {
    if (!agent) return;
    setDeletingId(filename);
    setDocsError('');
    try {
      await deleteDocument(agent.agent_id, filename);
      await fetchDocs(agent.agent_id);
    } catch (err: any) {
      setDocsError(err.message || 'Delete failed');
    } finally {
      setDeletingId(null);
    }
  };

  const handleBack = () => {
    setAgent(null);
    setDocs([]);
    setUploadSuccess('');
    setUploadError('');
    setDocsError('');
    setView('manage');
  };

  // ── Agent detail view ────────────────────────────────────────────────────
  if (agent) {
    return (
      <div className="p-6 sm:p-10 space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={handleBack}
            className="px-4 py-2 border-2 border-black rounded-full font-bold text-sm hover:bg-black hover:text-white transition-colors"
          >
            &larr; Back
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-extrabold text-black truncate">{agent.name}</h2>
            <p className="text-sm font-medium text-gray-500 mt-0.5 truncate">{agent.description}</p>
          </div>
          {/* View toggle */}
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => setView('manage')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full border-2 border-black font-bold text-sm transition-all
                ${view === 'manage'
                  ? 'bg-black text-white shadow-[4px_4px_0px_0px_rgba(255,107,87,1)]'
                  : 'bg-white text-black hover:bg-gray-100 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'}`}
            >
              <FileText className="h-4 w-4" />
              Documents
            </button>
            <button
              onClick={() => setView('chat')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full border-2 border-black font-bold text-sm transition-all
                ${view === 'chat'
                  ? 'bg-black text-white shadow-[4px_4px_0px_0px_rgba(255,107,87,1)]'
                  : 'bg-white text-black hover:bg-gray-100 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'}`}
            >
              <MessageSquare className="h-4 w-4" />
              Chat
            </button>
          </div>
        </div>

        {/* Chat view */}
        {view === 'chat' && (
          <div className="bg-white rounded-[2rem] border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
            <AgentChat
              agentId={agent.agent_id}
              agentName={agent.name}
              onBack={() => setView('manage')}
            />
          </div>
        )}

        {/* Documents view */}
        {view === 'manage' && (
          <div className="space-y-6">
            {/* Upload zone */}
            <div className="bg-white rounded-[2rem] border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-extrabold text-black">Knowledge Documents</h3>
                <button
                  onClick={() => fetchDocs(agent.agent_id)}
                  disabled={docsLoading}
                  className="flex items-center gap-2 px-4 py-2 border-2 border-black rounded-full text-sm font-bold hover:bg-black hover:text-white transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 ${docsLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>

              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed border-black rounded-[1.5rem] p-10 flex flex-col items-center justify-center cursor-pointer transition-all
                  ${dragOver
                    ? 'bg-[#FF6B57]/10 border-[#FF6B57] shadow-[4px_4px_0px_0px_rgba(255,107,87,1)]'
                    : 'bg-[#FAFAFA] hover:bg-[#FF6B57]/5 hover:border-[#FF6B57]'}`}
              >
                <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handleFileInput} />
                {uploadLoading
                  ? <Loader className="h-10 w-10 text-black animate-spin mb-3" />
                  : <UploadCloud className="h-10 w-10 text-black mb-3" />
                }
                <p className="text-base font-extrabold text-black">
                  {uploadLoading ? 'Uploading…' : 'Drop a PDF here or click to browse'}
                </p>
                <p className="text-sm font-medium text-gray-500 mt-1">PDF only · max 10 MB</p>
              </div>

              {uploadError && (
                <div className="mt-4 flex items-start gap-3 bg-red-50 border-2 border-red-400 rounded-[1rem] p-4">
                  <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                  <span className="text-sm font-bold text-red-600">{uploadError}</span>
                </div>
              )}
              {uploadSuccess && (
                <div className="mt-4 flex items-start gap-3 bg-green-50 border-2 border-green-400 rounded-[1rem] p-4">
                  <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                  <span className="text-sm font-bold text-green-700">{uploadSuccess}</span>
                </div>
              )}
            </div>

            {/* Document list */}
            {docsError && (
              <div className="flex items-start gap-3 bg-red-50 border-2 border-red-400 rounded-[1rem] p-4">
                <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                <span className="text-sm font-bold text-red-600">{docsError}</span>
              </div>
            )}

            {docsLoading && docs.length === 0 ? (
              <div className="flex items-center justify-center py-16 text-gray-400 gap-3">
                <Loader className="h-6 w-6 animate-spin" />
                <span className="font-bold">Loading documents…</span>
              </div>
            ) : docs.length === 0 ? (
              <div className="text-center py-16 bg-[#FAFAFA] rounded-[2rem] border-2 border-black border-dashed">
                <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-xl font-extrabold text-black">No documents yet</p>
                <p className="text-gray-500 font-medium mt-1">Upload a PDF to feed this agent.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {docs.map((doc) => (
                  <div
                    key={doc.doc_id}
                    className="bg-white rounded-[1.5rem] border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] px-6 py-5 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="p-3 bg-[#FF6B57]/10 rounded-xl border-2 border-black shrink-0">
                        <FileText className="h-5 w-5 text-black" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-extrabold text-black truncate">{doc.filename}</p>
                        <p className="text-sm font-medium text-gray-500 mt-0.5">
                          {doc.chunks} chunk{doc.chunks !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(doc.filename)}
                      disabled={deletingId === doc.filename}
                      className="p-2.5 bg-red-500 text-white rounded-full border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-red-600 transition-colors disabled:opacity-50 shrink-0"
                      title="Delete document"
                    >
                      {deletingId === doc.filename
                        ? <Loader className="h-4 w-4 animate-spin" />
                        : <Trash2 className="h-4 w-4" />
                      }
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── Agent list view ──────────────────────────────────────────────────────
  return (
    <div className="p-6 sm:p-10 space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center bg-white p-6 rounded-[2rem] border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-[#FF6B57]/10 rounded-xl border-2 border-black">
            <Bot className="h-6 w-6 text-black" />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold text-black">AI Agents</h2>
            <p className="text-sm font-medium text-gray-500 mt-0.5">
              Manage agents for <span className="font-bold text-black">{classroomName}</span>
            </p>
          </div>
        </div>
        <button
          onClick={() => { setShowCreate(!showCreate); setCreateError(''); }}
          className={`flex items-center gap-2 px-6 py-3 rounded-full border-2 border-black font-bold text-sm transition-all
            ${showCreate
              ? 'bg-white text-black hover:bg-gray-100 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
              : 'bg-black text-white hover:bg-gray-800 shadow-[4px_4px_0px_0px_rgba(255,107,87,1)]'}`}
        >
          {showCreate ? <><X className="h-4 w-4" /> Cancel</> : <><Plus className="h-4 w-4" /> New Agent</>}
        </button>
      </div>

      {/* Create Agent form */}
      {showCreate && (
        <div className="bg-[#FAFAFA] p-8 rounded-[2rem] border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          <h3 className="text-xl font-extrabold text-black mb-6">Create New Agent</h3>
          <form onSubmit={handleCreate} className="space-y-5">
            <div className="space-y-2">
              <label className="block text-sm font-bold text-black uppercase tracking-wider">Agent Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={`e.g. ${classroomName} Assistant`}
                className="w-full px-5 py-4 border-2 border-black rounded-[1rem] focus:outline-none focus:border-[#FF6B57] transition-colors bg-white font-bold text-lg placeholder-gray-400"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-bold text-black uppercase tracking-wider">Description</label>
              <textarea
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Describe what this agent will help students with..."
                className="w-full px-5 py-4 border-2 border-black rounded-[1rem] focus:outline-none focus:border-[#FF6B57] transition-colors bg-white font-bold placeholder-gray-400 resize-none"
              />
            </div>

            {createError && (
              <div className="flex items-start gap-3 bg-red-50 border-2 border-red-400 rounded-[1rem] p-4">
                <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                <span className="text-sm font-bold text-red-600">{createError}</span>
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={createLoading || !name.trim() || !description.trim()}
                className="bg-[#FF6B57] text-black px-10 py-4 rounded-full font-bold border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-[#FF8A7A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {createLoading ? <><Loader className="h-4 w-4 animate-spin" /> Creating…</> : <><Plus className="h-4 w-4" /> Create Agent</>}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Agent cards */}
      {agentsLoading ? (
        <div className="flex items-center justify-center py-20 gap-3 text-gray-400">
          <Loader className="h-6 w-6 animate-spin" />
          <span className="font-bold">Loading agents…</span>
        </div>
      ) : existingAgents.length === 0 ? (
        <div className="text-center py-20 bg-[#FAFAFA] rounded-[2rem] border-2 border-black border-dashed">
          <Bot className="h-14 w-14 text-gray-300 mx-auto mb-4" />
          <p className="text-xl font-extrabold text-black">No agents yet</p>
          <p className="text-gray-500 font-medium mt-1">Create your first AI agent to get started.</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          {existingAgents.map((a) => (
            <div
              key={a.agent_id}
              className="bg-white rounded-[2rem] border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-8 flex flex-col gap-5 hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all"
            >
              {/* Card top */}
              <div className="flex items-start gap-4">
                <div className="p-3 bg-[#FF6B57]/10 rounded-xl border-2 border-black shrink-0">
                  <Bot className="h-6 w-6 text-black" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-extrabold text-black truncate">{a.name}</h3>
                  <p className="text-sm font-medium text-gray-500 mt-1 line-clamp-2">{a.description}</p>
                </div>
              </div>

              {/* Card ID */}
              <div className="bg-[#FAFAFA] rounded-xl border-2 border-black px-4 py-2">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">Agent ID</p>
                <code className="text-xs font-mono text-black truncate block">{a.agent_id}</code>
              </div>

              {/* Visibility toggle */}
              <button
                onClick={() => handleToggleVisibility(a.agent_id)}
                className={`flex items-center justify-between w-full px-4 py-3 rounded-full border-2 border-black font-bold text-sm transition-all
                  ${visibleAgentIds.includes(a.agent_id)
                    ? 'bg-[#FF6B57]/10 text-black shadow-[2px_2px_0px_0px_rgba(255,107,87,1)]'
                    : 'bg-gray-100 text-gray-500 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'}`}
              >
                <span className="flex items-center gap-2">
                  {visibleAgentIds.includes(a.agent_id)
                    ? <><Eye className="h-4 w-4" /> Visible to students</>
                    : <><EyeOff className="h-4 w-4" /> Hidden from students</>}
                </span>
                {/* pill indicator */}
                <span className={`w-8 h-4 rounded-full border-2 border-black relative transition-colors ${visibleAgentIds.includes(a.agent_id) ? 'bg-black' : 'bg-gray-300'}`}>
                  <span className={`absolute top-0.5 w-2 h-2 rounded-full bg-white border border-black transition-all ${visibleAgentIds.includes(a.agent_id) ? 'left-4' : 'left-0.5'}`} />
                </span>
              </button>

              {/* Actions */}
              <div className="flex gap-3 mt-auto">
                <button
                  onClick={() => { setAgent(a); setView('manage'); }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white border-2 border-black rounded-full font-bold text-sm hover:bg-black hover:text-white transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                >
                  <FileText className="h-4 w-4" />
                  Documents
                </button>
                <button
                  onClick={() => { setAgent(a); setView('chat'); }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-black text-white border-2 border-black rounded-full font-bold text-sm hover:bg-gray-800 transition-colors shadow-[4px_4px_0px_0px_rgba(255,107,87,1)]"
                >
                  <MessageSquare className="h-4 w-4" />
                  Chat
                </button>
                {!a.bot_type && (
                  <button
                    onClick={() => setConfirmDeleteId(a.agent_id)}
                    className="p-3 bg-white border-2 border-black rounded-full text-red-500 hover:bg-red-500 hover:text-white transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                    title="Delete agent"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Confirm delete — only for non-default agents */}
              {!a.bot_type && confirmDeleteId === a.agent_id && (
                <div className="bg-red-50 border-2 border-red-400 rounded-[1.5rem] p-4 flex flex-col gap-3">
                  <p className="text-sm font-bold text-red-700">Delete this agent? This removes all its documents and chat history permanently.</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDeleteAgent(a.agent_id)}
                      disabled={deletingAgentId === a.agent_id}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-500 text-white border-2 border-black rounded-full font-bold text-sm hover:bg-red-600 transition-colors disabled:opacity-50"
                    >
                      {deletingAgentId === a.agent_id ? <><Loader className="h-4 w-4 animate-spin" /> Deleting…</> : <><Trash2 className="h-4 w-4" /> Yes, Delete</>}
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="flex-1 px-4 py-2 bg-white border-2 border-black rounded-full font-bold text-sm hover:bg-gray-100 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
