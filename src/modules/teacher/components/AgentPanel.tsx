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
      <div className="p-8 sm:p-12 space-y-10 bg-white min-h-screen">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b-4 border-black pb-8">
          <div className="flex items-center gap-6">
            <button
              onClick={handleBack}
              className="group flex items-center justify-center w-12 h-12 border-2 border-black rounded-2xl hover:bg-black hover:text-white transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none bg-white"
            >
              <ArrowLeft className="h-5 w-5 group-hover:-translate-x-0.5 transition-transform" />
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3">
                <h2 className="text-3xl font-black text-black truncate tracking-tight">{agent.name}</h2>
                <span className="px-3 py-1 bg-gray-50 border-2 border-black rounded-lg text-[9px] font-black uppercase tracking-widest text-gray-400">
                  ID: {agent.agent_id.slice(0, 8)}...
                </span>
              </div>
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest mt-1.5 truncate max-w-xl">
                {agent.description}
              </p>
            </div>
          </div>
          
          {/* View toggle switch */}
          <div className="flex p-1.5 bg-gray-50 border-4 border-black rounded-[1.5rem] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <button
              onClick={() => setView('manage')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all
                ${view === 'manage'
                  ? 'bg-black text-white shadow-[2px_2px_0px_0px_rgba(255,107,87,1)]'
                  : 'text-gray-400 hover:text-black'}`}
            >
              <FileText className="h-4 w-4" />
              Repository
            </button>
            <button
              onClick={() => setView('chat')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all
                ${view === 'chat'
                  ? 'bg-black text-white shadow-[2px_2px_0px_0px_rgba(255,107,87,1)]'
                  : 'text-gray-400 hover:text-black'}`}
            >
              <MessageSquare className="h-4 w-4" />
              Intelligence
            </button>
          </div>
        </div>

        {/* Chat view */}
        {view === 'chat' && (
          <div className="bg-[#FDFDFD] rounded-[3rem] border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
            <AgentChat
              agentId={agent.agent_id}
              agentName={agent.name}
              onBack={() => setView('manage')}
            />
          </div>
        )}

        {/* Documents view */}
        {view === 'manage' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* Left Col: Knowledge Repository */}
            <div className="lg:col-span-7 space-y-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-5 bg-brand-coral rounded-full" />
                  <h3 className="text-xs font-black text-black uppercase tracking-[0.3em]">Knowledge Base</h3>
                </div>
                <button
                  onClick={() => fetchDocs(agent.agent_id)}
                  disabled={docsLoading}
                  className="flex items-center gap-2 px-4 py-2 border-2 border-black rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black hover:text-white transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50"
                >
                  <RefreshCw className={`h-3 w-3 ${docsLoading ? 'animate-spin' : ''}`} />
                  Sync
                </button>
              </div>

              {docsLoading && docs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 border-2 border-black border-dashed rounded-[2.5rem] bg-gray-50/30 gap-4">
                  <Loader className="h-8 w-8 animate-spin text-black" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Indexing knowledge repository…</span>
                </div>
              ) : docs.length === 0 ? (
                <div className="text-center py-20 bg-gray-50/50 rounded-[3rem] border-4 border-black border-dashed">
                  <div className="w-16 h-16 bg-white border-2 border-black rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <FileText className="h-8 w-8 text-gray-200" />
                  </div>
                  <p className="text-xl font-black text-black uppercase tracking-tight">Empty Knowledge Base</p>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-2">Initialize this agent by uploading source materials.</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {docs.map((doc) => (
                    <div
                      key={doc.doc_id}
                      className="group bg-white rounded-[1.5rem] border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] px-6 py-5 flex items-center justify-between gap-4 hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all"
                    >
                      <div className="flex items-center gap-5 min-w-0">
                        <div className="w-12 h-12 bg-gray-50 rounded-xl border-2 border-black flex items-center justify-center shrink-0 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] group-hover:bg-brand-coral group-hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all">
                          <FileText className="h-5 w-5 text-black" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-black text-black truncate uppercase tracking-tight">{doc.filename}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 px-2 py-0.5 border border-gray-200 rounded-md">
                              {doc.chunks} Information Nodes
                            </span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete(doc.filename)}
                        disabled={deletingId === doc.filename}
                        className="w-10 h-10 bg-white text-black rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-red-500 hover:text-white hover:border-red-500 transition-all disabled:opacity-50 shrink-0 flex items-center justify-center active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                        title="Evict document"
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

            {/* Right Col: Upload & Stats */}
            <div className="lg:col-span-5 space-y-10">
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-1.5 h-5 bg-blue-500 rounded-full" />
                  <h3 className="text-xs font-black text-black uppercase tracking-[0.3em]">Material Intake</h3>
                </div>
                
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-4 border-dashed border-black rounded-[2.5rem] p-10 flex flex-col items-center justify-center cursor-pointer transition-all min-h-[300px] text-center
                    ${dragOver
                      ? 'bg-brand-coral/5 border-brand-coral shadow-[8px_8px_0px_0px_rgba(255,107,87,1)]'
                      : 'bg-[#FDFDFD] hover:bg-gray-50 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]'}`}
                >
                  <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handleFileInput} />
                  <div className="w-16 h-16 bg-white border-2 border-black rounded-2xl flex items-center justify-center mb-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    {uploadLoading
                      ? <Loader className="h-8 w-8 text-black animate-spin" />
                      : <UploadCloud className="h-8 w-8 text-black" />
                    }
                  </div>
                  <p className="text-xl font-black text-black uppercase tracking-tight">
                    {uploadLoading ? 'Processing Intelligence…' : 'Ingest Document'}
                  </p>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mt-3">
                    Supported: PDF (MAX 10MB)
                  </p>
                </div>

                {(uploadError || uploadSuccess) && (
                  <div className={`mt-6 flex items-start gap-4 p-5 rounded-2xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] animate-in fade-in slide-in-from-top-2
                    ${uploadError ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
                    {uploadError ? <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" /> : <CheckCircle className="h-5 w-5 shrink-0 mt-0.5" />}
                    <span className="text-[10px] font-black uppercase tracking-widest leading-relaxed">
                      {uploadError || uploadSuccess}
                    </span>
                  </div>
                )}
              </section>

              {/* Status Section */}
              <section className="bg-black rounded-[2.5rem] p-8 text-white shadow-[8px_8px_0px_0px_rgba(255,107,87,1)]">
                <div className="flex items-center gap-3 mb-6">
                  <Activity className="h-4 w-4 text-brand-coral" />
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em]">Agent Operational Status</h3>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-3 border-b border-white/10">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Visibility</span>
                    <span className={`text-[10px] font-black uppercase tracking-widest ${visibleAgentIds.includes(agent.agent_id) ? 'text-green-400' : 'text-yellow-400'}`}>
                      {visibleAgentIds.includes(agent.agent_id) ? 'Live for Cohort' : 'Faculty Access Only'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-white/10">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Document Count</span>
                    <span className="text-xl font-black">{docs.length}</span>
                  </div>
                  <div className="flex justify-between items-center py-3">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Intelligence Nodes</span>
                    <span className="text-xl font-black">{docs.reduce((acc, d) => acc + d.chunks, 0)}</span>
                  </div>
                </div>
              </section>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Agent list view ──────────────────────────────────────────────────────
  return (
    <div className="p-8 sm:p-12 space-y-12 bg-white min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b-4 border-black pb-8">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-purple-50 rounded-[1.5rem] border-4 border-black flex items-center justify-center shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] rotate-[-3deg]">
            <Bot className="h-8 w-8 text-black" />
          </div>
          <div>
            <h2 className="text-4xl font-black text-black leading-none tracking-tight text-nowrap">AI Command Center</h2>
            <div className="flex items-center gap-3 mt-3">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] bg-gray-50 px-3 py-1 border-2 border-black rounded-lg">
                Agent Orchestration
              </span>
              <div className="h-1 w-1 bg-gray-300 rounded-full" />
              <p className="text-xs font-black text-black uppercase tracking-widest">{classroomName}</p>
            </div>
          </div>
        </div>
        
        <button
          onClick={() => { setShowCreate(!showCreate); setCreateError(''); }}
          className={`flex items-center gap-2 px-8 py-4 rounded-2xl border-4 border-black text-[10px] font-black uppercase tracking-[0.2em] transition-all
            ${showCreate
              ? 'bg-white text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'
              : 'bg-black text-white shadow-[6px_6px_0px_0px_rgba(255,107,87,1)] hover:translate-y-[-2px] hover:shadow-[8px_8px_0px_0px_rgba(255,107,87,1)]'}`}
        >
          {showCreate ? <><X className="h-4 w-4" /> Abort Creation</> : <><Plus className="h-4 w-4" /> Initialize New Agent</>}
        </button>
      </div>

      {/* Create Agent form */}
      {showCreate && (
        <div className="bg-[#FDFDFD] p-10 rounded-[3rem] border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] animate-in zoom-in-95 duration-200">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-1.5 h-6 bg-brand-coral rounded-full" />
            <h3 className="text-xl font-black text-black uppercase tracking-tight">Agent Specification</h3>
          </div>
          <form onSubmit={handleCreate} className="space-y-8">
            <div className="space-y-3">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.4em]">Strategic Identity (Name)</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={`e.g. ${classroomName} Specialist`}
                className="w-full px-6 py-5 border-4 border-black rounded-2xl focus:outline-none focus:border-brand-coral transition-all bg-white font-black text-xl placeholder-gray-200 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.05)]"
              />
            </div>
            <div className="space-y-3">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.4em]">Functional Mandate (Description)</label>
              <textarea
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Define the pedagogical purpose of this agent..."
                className="w-full px-6 py-5 border-4 border-black rounded-2xl focus:outline-none focus:border-brand-coral transition-all bg-white font-black placeholder-gray-200 resize-none shadow-[4px_4px_0px_0px_rgba(0,0,0,0.05)]"
              />
            </div>

            {createError && (
              <div className="flex items-start gap-4 bg-red-50 border-2 border-black p-5 rounded-2xl text-red-600 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                <span className="text-[10px] font-black uppercase tracking-widest leading-relaxed">{createError}</span>
              </div>
            )}

            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={createLoading || !name.trim() || !description.trim()}
                className="bg-brand-coral text-black px-12 py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-4px] hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
              >
                {createLoading ? <><Loader className="h-4 w-4 animate-spin" /> Finalizing Specification…</> : <><Plus className="h-5 w-5" /> Deploy Agent</>}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Agent cards */}
      {agentsLoading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-6">
          <Loader className="h-10 w-10 animate-spin text-black" />
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-400">Syncing Intelligence Network…</span>
        </div>
      ) : existingAgents.length === 0 ? (
        <div className="text-center py-32 bg-gray-50/50 rounded-[3rem] border-4 border-black border-dashed">
          <Bot className="h-20 w-20 text-gray-200 mx-auto mb-8" />
          <p className="text-2xl font-black text-black uppercase tracking-tight">No Active Intelligence Detected</p>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mt-3">Initiate your first deployment to begin augmentation.</p>
        </div>
      ) : (
        <div className="grid gap-10 sm:grid-cols-2">
          {existingAgents.map((a) => (
            <div
              key={a.agent_id}
              className="group relative bg-white rounded-[3rem] border-4 border-black shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] p-10 flex flex-col gap-8 hover:translate-y-[-6px] hover:shadow-[16px_16px_0px_0px_rgba(255,107,87,1)] transition-all overflow-hidden"
            >
              {/* Card top */}
              <div className="flex items-start gap-6">
                <div className="w-16 h-16 bg-gray-50 rounded-2xl border-4 border-black flex items-center justify-center shrink-0 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] group-hover:bg-brand-coral transition-all">
                  <Bot className="h-8 w-8 text-black" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xl font-black text-black truncate tracking-tight uppercase">{a.name}</h3>
                  <p className="text-xs font-bold text-gray-400 mt-2 line-clamp-2 leading-relaxed">{a.description}</p>
                </div>
              </div>

              {/* Status Bar */}
              <div className="flex items-center gap-3 bg-gray-50 p-4 border-2 border-black rounded-2xl">
                <div className={`w-3 h-3 rounded-full border border-black ${visibleAgentIds.includes(a.agent_id) ? 'bg-green-400' : 'bg-yellow-400'}`} />
                <span className="text-[9px] font-black text-black uppercase tracking-widest">
                  {visibleAgentIds.includes(a.agent_id) ? 'Status: Active for cohort' : 'Status: Restricted Access'}
                </span>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-4 mt-auto">
                <button
                  onClick={() => { setAgent(a); setView('manage'); }}
                  className="flex items-center justify-center gap-2 px-4 py-4 bg-white border-2 border-black rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-black hover:text-white transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                >
                  <FileText className="h-4 w-4" />
                  Repository
                </button>
                <button
                  onClick={() => { setAgent(a); setView('chat'); }}
                  className="flex items-center justify-center gap-2 px-4 py-4 bg-black text-white border-2 border-black rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-brand-coral hover:text-black hover:border-brand-coral transition-all shadow-[4px_4px_0px_0px_rgba(255,107,87,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                >
                  <MessageSquare className="h-4 w-4" />
                  Interact
                </button>
              </div>

              {/* Visibility & Delete Controls */}
              <div className="flex items-center justify-between pt-4 border-t-2 border-black/5">
                <button
                  onClick={() => handleToggleVisibility(a.agent_id)}
                  className="text-[9px] font-black uppercase tracking-widest text-gray-400 hover:text-black flex items-center gap-2 transition-colors"
                >
                  {visibleAgentIds.includes(a.agent_id) ? <><EyeOff className="h-3 w-3" /> Hide from Students</> : <><Eye className="h-3 w-3" /> Grant Student Access</>}
                </button>
                {!a.bot_type && (
                  <button
                    onClick={() => setConfirmDeleteId(a.agent_id)}
                    className="text-[9px] font-black uppercase tracking-widest text-red-400 hover:text-red-600 flex items-center gap-2 transition-colors"
                  >
                    <Trash2 className="h-3 w-3" /> Decommission
                  </button>
                )}
              </div>

              {/* Confirm delete overlay */}
              {!a.bot_type && confirmDeleteId === a.agent_id && (
                <div className="absolute inset-0 bg-white/95 backdrop-blur-sm p-10 flex flex-col justify-center items-center text-center z-10 animate-in fade-in duration-200">
                  <div className="w-16 h-16 bg-red-50 border-4 border-red-500 rounded-[1.5rem] flex items-center justify-center mb-6">
                    <AlertCircle className="h-8 w-8 text-red-500" />
                  </div>
                  <h4 className="text-xl font-black text-black uppercase tracking-tight mb-2">Confirm Decommission</h4>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest max-w-[240px] leading-relaxed">This will permanently purge the agent's knowledge base and neural weights.</p>
                  <div className="flex gap-4 mt-8 w-full">
                    <button
                      onClick={() => handleDeleteAgent(a.agent_id)}
                      disabled={deletingAgentId === a.agent_id}
                      className="flex-1 px-6 py-4 bg-red-500 text-white border-2 border-black rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-red-600 transition-all"
                    >
                      {deletingAgentId === a.agent_id ? 'Purging…' : 'Purge Agent'}
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="flex-1 px-6 py-4 bg-white text-black border-2 border-black rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-gray-50 transition-all"
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
