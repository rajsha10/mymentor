import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import {
  createAgent, listAgents, listDocuments, addDocument,
  deleteDocument, deleteAgent, queryAgent, answerGeneral,
  saveToContext, getQueryHistory, toggleAgentPublic, listPublicAgents, searchAndAdd,
} from '../../../services/backendApi';
import ReactMarkdown from 'react-markdown';
import {
  Bot, Plus, Loader, UploadCloud, FileText, Trash2, RefreshCw,
  MessageSquare, X, AlertCircle, CheckCircle, Send, User,
  ArrowLeft, BarChart2, BookOpen, Globe, BookmarkPlus, Check,
  Sparkles, Settings, Lock, Unlock, Users, Eye, EyeOff, Search,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────

interface Agent {
  agent_id: string;
  name: string;
  description: string;
  is_public?: boolean;
}

interface PublicAgent {
  agent_id: string;
  name: string;
  description: string;
  user_id: string;
}

interface Doc {
  doc_id: string;
  filename: string;
  chunks: number;
}

interface Message {
  role: 'user' | 'agent';
  text: string;
  sources?: { file: string; page: number }[];
  confidence?: string;
  out_of_scope?: boolean;
  general_knowledge?: boolean;
  pendingQuestion?: string;
  savedToContext?: boolean;
}

type PanelTab = 'my-agents' | 'discover';

const confidenceColor: Record<string, string> = {
  High:   'text-green-700 bg-green-50 border-green-300',
  Medium: 'text-yellow-700 bg-yellow-50 border-yellow-300',
  Low:    'text-red-700 bg-red-50 border-red-300',
};

function personalClassroomId(uid: string) {
  return `personal_${uid}`;
}

// ── Agent Chat View ────────────────────────────────────────────────────────

function AgentChatView({
  agent,
  onBack,
  readOnly = false,
}: {
  agent: Agent | PublicAgent;
  onBack: () => void;
  readOnly?: boolean;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [selected, setSelected] = useState<Message | null>(null);
  const [learnedTopics, setLearnedTopics] = useState<Set<string>>(new Set());
  const [learningTopic, setLearningTopic] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const agentId = agent.agent_id;

  useEffect(() => {
    setHistoryLoading(true);
    getQueryHistory(agentId)
      .then((rows) => {
        const hydrated: Message[] = rows.flatMap((row) => [
          { role: 'user' as const, text: row.question },
          { role: 'agent' as const, text: row.answer },
        ]);
        setMessages(hydrated);
      })
      .catch(() => {})
      .finally(() => setHistoryLoading(false));
  }, [agentId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async () => {
    const q = input.trim();
    if (!q || loading) return;
    setMessages((prev) => [...prev, { role: 'user', text: q }]);
    setInput('');
    setLoading(true);
    try {
      const res = await queryAgent(q, agentId);
      const isOutOfScope = res.out_of_scope === true;
      const agentMsg: Message = {
        role: 'agent',
        text: res.answer,
        sources: res.sources,
        confidence: res.confidence,
        out_of_scope: isOutOfScope,
        pendingQuestion: isOutOfScope ? q : undefined,
      };
      setMessages((prev) => [...prev, agentMsg]);
      setSelected(agentMsg);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { role: 'agent', text: `Error: ${err.message || 'Something went wrong'}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleAnswerGeneral = async (question: string) => {
    setLoading(true);
    try {
      const res = await answerGeneral(question, agentId);
      const agentMsg: Message = {
        role: 'agent',
        text: res.answer,
        sources: [],
        confidence: res.confidence,
        general_knowledge: true,
        pendingQuestion: question,
        savedToContext: false,
      };
      setMessages((prev) => [...prev, agentMsg]);
      setSelected(agentMsg);
    } catch (err: any) {
      setMessages((prev) => [...prev, { role: 'agent', text: `Error: ${err.message || 'Something went wrong'}` }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchAndAdd = async (topic: string) => {
    setLearningTopic(topic);
    try {
      await searchAndAdd(agentId, topic);
      setLearnedTopics((prev) => new Set(prev).add(topic));
      setMessages((prev) => [
        ...prev,
        { role: 'agent', text: `Topic added to your notes! You can now ask about **${topic}** and I'll have context for it.` },
      ]);
    } catch (err: any) {
      setMessages((prev) => [...prev, { role: 'agent', text: `Failed to add topic: ${err.message}` }]);
    } finally {
      setLearningTopic(null);
    }
  };

  const handleSaveToContext = async (msgIndex: number) => {
    const msg = messages[msgIndex];
    if (!msg || msg.savedToContext) return;
    try {
      await saveToContext(agentId, msg.pendingQuestion!, msg.text);
      setMessages((prev) => prev.map((m, i) => (i === msgIndex ? { ...m, savedToContext: true } : m)));
    } catch (err: any) {
      alert(`Failed to save: ${err.message}`);
    }
  };

  return (
    <div className="flex h-[720px] overflow-hidden">
      {/* Left: chat */}
      <div className="flex flex-col flex-1 min-w-0 border-r-2 border-black">

        {/* Chat header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b-2 border-black bg-white shrink-0">
          <button
            onClick={onBack}
            className="p-2 rounded-full border-2 border-black hover:bg-black hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="p-2 bg-[#FF6B57]/15 rounded-xl border-2 border-black">
            <Bot className="h-4 w-4 text-black" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-extrabold text-black truncate">{agent.name}</p>
            <p className="text-xs font-medium text-gray-500 truncate">{agent.description}</p>
          </div>
          {readOnly && (
            <span className="flex items-center gap-1.5 px-3 py-1 bg-[#FAFAFA] border-2 border-black rounded-full text-xs font-bold text-gray-500 shrink-0">
              <Users className="h-3 w-3" />
              Public
            </span>
          )}
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4 bg-[#FAFAFA]">
          {historyLoading && (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-3">
              <Loader className="h-6 w-6 animate-spin text-gray-400" />
              <p className="text-xs font-bold text-gray-400">Loading conversation history…</p>
            </div>
          )}

          {!historyLoading && messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
              <div className="w-16 h-16 bg-white border-2 border-black rounded-full flex items-center justify-center shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                <Sparkles className="h-7 w-7 text-[#FF6B57]" />
              </div>
              <div>
                <p className="text-sm font-extrabold text-black mb-1">Ask this agent a question</p>
                <p className="text-xs font-medium text-gray-500 max-w-xs">Answers come from the documents uploaded to this agent.</p>
              </div>
            </div>
          )}

          {!historyLoading && messages.map((msg, i) => (
            <div key={i} className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'agent' && (
                <div className="p-1.5 bg-[#FF6B57]/15 rounded-full h-7 w-7 flex items-center justify-center shrink-0 mt-0.5 border-2 border-black">
                  <Bot className="h-3.5 w-3.5 text-black" />
                </div>
              )}

              <div className="max-w-[75%] space-y-1.5">
                <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]
                  ${msg.role === 'user'
                    ? 'bg-black text-white rounded-br-sm'
                    : msg.out_of_scope
                      ? 'bg-[#FFF9C4] text-black rounded-bl-sm'
                      : msg.general_knowledge
                        ? 'bg-blue-50 text-black rounded-bl-sm'
                        : 'bg-white text-black rounded-bl-sm'
                  }`}
                >
                  {msg.role === 'user' ? (
                    <span className="whitespace-pre-wrap">{msg.text}</span>
                  ) : (
                    <ReactMarkdown
                      components={{
                        p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
                        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                        ul: ({ children }) => <ul className="list-disc pl-5 space-y-1 my-1">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal pl-5 space-y-1 my-1">{children}</ol>,
                        li: ({ children }) => <li className="leading-snug">{children}</li>,
                        code: ({ children }) => <code className="bg-gray-100 px-1 rounded text-xs font-mono">{children}</code>,
                      }}
                    >
                      {msg.text}
                    </ReactMarkdown>
                  )}
                </div>

                {msg.role === 'agent' && msg.out_of_scope && msg.pendingQuestion && (
                  <div className="flex flex-wrap gap-2 pt-0.5 pl-1">
                    <button
                      onClick={() => handleAnswerGeneral(msg.pendingQuestion!)}
                      disabled={loading}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FF6B57] text-black text-xs font-bold border-2 border-black rounded-full shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-[#FF8A7A] disabled:opacity-40 transition-colors"
                    >
                      <Globe className="h-3 w-3" />
                      Answer Anyway
                    </button>
                    {learnedTopics.has(msg.pendingQuestion!) ? (
                      <span className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border-2 border-black text-green-700 text-xs font-bold rounded-full shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                        <Check className="h-3 w-3" />
                        Topic added! Try asking again.
                      </span>
                    ) : (
                      <button
                        onClick={() => handleSearchAndAdd(msg.pendingQuestion!)}
                        disabled={loading || learningTopic === msg.pendingQuestion}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-black text-white text-xs font-bold border-2 border-black rounded-full shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-gray-800 disabled:opacity-40 transition-colors"
                      >
                        {learningTopic === msg.pendingQuestion
                          ? <Loader className="h-3 w-3 animate-spin" />
                          : <Search className="h-3 w-3" />}
                        {learningTopic === msg.pendingQuestion ? 'Learning…' : 'Search & Add Topic'}
                      </button>
                    )}
                  </div>
                )}

                {msg.role === 'agent' && msg.general_knowledge && (
                  <div className="flex items-center justify-between pl-1 pt-0.5">
                    <p className="text-xs font-bold text-blue-500">⚠ General knowledge — may not match documents</p>
                    <button
                      onClick={() => handleSaveToContext(i)}
                      disabled={msg.savedToContext}
                      className={`flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-full border-2 border-black transition-colors shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] ${
                        msg.savedToContext
                          ? 'bg-green-100 text-green-700 cursor-default'
                          : 'bg-white text-black hover:bg-[#FF6B57]'
                      }`}
                    >
                      {msg.savedToContext
                        ? <><Check className="h-3 w-3" /> Saved</>
                        : <><BookmarkPlus className="h-3 w-3" /> Save to Notes</>}
                    </button>
                  </div>
                )}

                {msg.role === 'agent' && !msg.out_of_scope && (msg.sources?.length || msg.confidence) && (
                  <button
                    onClick={() => setSelected(selected === msg ? null : msg)}
                    className="text-xs font-bold text-[#FF6B57] hover:text-black pl-1 transition-colors"
                  >
                    {selected === msg ? 'Hide details' : 'View sources & confidence →'}
                  </button>
                )}
              </div>

              {msg.role === 'user' && (
                <div className="p-1.5 bg-gray-100 rounded-full h-7 w-7 flex items-center justify-center shrink-0 mt-0.5 border-2 border-black">
                  <User className="h-3.5 w-3.5 text-black" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-2.5 justify-start">
              <div className="p-1.5 bg-[#FF6B57]/15 rounded-full h-7 w-7 flex items-center justify-center shrink-0 border-2 border-black">
                <Bot className="h-3.5 w-3.5 text-black" />
              </div>
              <div className="bg-white border-2 border-black rounded-2xl rounded-bl-sm px-4 py-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <div className="flex gap-1 items-center">
                  <span className="h-2 w-2 bg-[#FF6B57] rounded-full animate-bounce [animation-delay:0ms]" />
                  <span className="h-2 w-2 bg-[#FF6B57] rounded-full animate-bounce [animation-delay:150ms]" />
                  <span className="h-2 w-2 bg-[#FF6B57] rounded-full animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input bar */}
        <div className="px-4 py-3 border-t-2 border-black bg-white shrink-0">
          <div className="flex items-end gap-2 bg-[#FAFAFA] border-2 border-black rounded-[1rem] px-4 py-2.5 focus-within:border-[#FF6B57] transition-colors">
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question… (Enter to send)"
              className="flex-1 resize-none bg-transparent text-sm text-black placeholder-gray-400 outline-none max-h-32 font-medium"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="p-2.5 bg-black text-white rounded-full border-2 border-black hover:bg-[#FF6B57] hover:border-black disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
            >
              {loading ? <Loader className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
          <p className="text-[10px] font-medium text-gray-400 mt-1.5 pl-1">Shift+Enter for new line</p>
        </div>
      </div>

      {/* Right: source & confidence panel */}
      <div className="w-64 shrink-0 flex flex-col bg-white overflow-y-auto">
        <div className="px-5 py-4 border-b-2 border-black shrink-0 bg-[#FAFAFA]">
          <p className="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest">Response Details</p>
        </div>
        {!selected ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-5 text-gray-400 space-y-3">
            <BookOpen className="h-9 w-9 text-gray-200" />
            <p className="text-xs font-medium leading-relaxed">Click "View sources & confidence" on any agent reply to see details here.</p>
          </div>
        ) : (
          <div className="p-5 space-y-5">
            {selected.confidence && (
              <div>
                <div className="flex items-center gap-1.5 mb-2.5">
                  <BarChart2 className="h-3.5 w-3.5 text-gray-400" />
                  <span className="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest">Confidence</span>
                </div>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-extrabold border-2 ${confidenceColor[selected.confidence] ?? 'text-gray-600 bg-gray-50 border-gray-200'}`}>
                  {selected.confidence}
                </span>
              </div>
            )}
            {selected.sources && selected.sources.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2.5">
                  <FileText className="h-3.5 w-3.5 text-gray-400" />
                  <span className="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest">Sources ({selected.sources.length})</span>
                </div>
                <ul className="space-y-2">
                  {selected.sources.map((s, i) => (
                    <li key={i} className="bg-[#FAFAFA] border-2 border-black rounded-[0.75rem] px-3 py-2.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                      <p className="text-xs font-bold text-black truncate" title={s.file}>{s.file}</p>
                      <p className="text-xs font-medium text-gray-500 mt-0.5">Page {s.page}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {(!selected.sources || selected.sources.length === 0) && !selected.confidence && (
              <p className="text-xs font-medium text-gray-400 text-center">No details available.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Agent Docs View ────────────────────────────────────────────────────────

function AgentDocsView({ agent, onBack, onChat }: { agent: Agent; onBack: () => void; onChat: () => void }) {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [docsError, setDocsError] = useState('');
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDocs = useCallback(async () => {
    setDocsLoading(true);
    setDocsError('');
    try {
      setDocs(await listDocuments(agent.agent_id));
    } catch (err: any) {
      setDocsError(err.message || 'Failed to load documents');
    } finally {
      setDocsLoading(false);
    }
  }, [agent.agent_id]);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  const handleUpload = async (file: File) => {
    if (!file.name.endsWith('.pdf')) { setUploadError('Only PDF files are allowed.'); return; }
    if (file.size > 10 * 1024 * 1024) { setUploadError('File too large (max 10 MB).'); return; }
    setUploadError(''); setUploadSuccess(''); setUploadLoading(true);
    try {
      await addDocument(agent.agent_id, file);
      setUploadSuccess(`"${file.name}" uploaded successfully.`);
      await fetchDocs();
    } catch (err: any) {
      setUploadError(err.message || 'Upload failed');
    } finally {
      setUploadLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (filename: string) => {
    setDeletingId(filename); setDocsError('');
    try {
      await deleteDocument(agent.agent_id, filename);
      await fetchDocs();
    } catch (err: any) {
      setDocsError(err.message || 'Delete failed');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-[2rem] border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
        <div className="h-1.5 bg-[#FF6B57]" />
        <div className="p-7 flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2.5 border-2 border-black rounded-full font-bold text-sm hover:bg-black hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="p-3 bg-[#FF6B57]/15 rounded-xl border-2 border-black">
            <Bot className="h-5 w-5 text-black" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-extrabold text-black truncate">{agent.name}</h2>
            <p className="text-sm font-medium text-gray-500 mt-0.5 truncate">{agent.description}</p>
          </div>
          <button
            onClick={onChat}
            className="flex items-center gap-2 px-6 py-3 bg-black text-white rounded-full border-2 border-black font-extrabold text-sm hover:bg-gray-800 transition-colors shadow-[4px_4px_0px_0px_rgba(255,107,87,1)] shrink-0"
          >
            <MessageSquare className="h-4 w-4" />
            Chat
          </button>
        </div>
      </div>

      {/* Upload card */}
      <div className="bg-white rounded-[2rem] border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-8">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-extrabold text-black">Knowledge Documents</h3>
          <button
            onClick={fetchDocs}
            disabled={docsLoading}
            className="flex items-center gap-2 px-4 py-2 border-2 border-black rounded-full text-sm font-bold hover:bg-black hover:text-white transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${docsLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) handleUpload(f); }}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed border-black rounded-[1.5rem] p-12 flex flex-col items-center justify-center cursor-pointer transition-all
            ${dragOver ? 'bg-[#FF6B57]/10 border-[#FF6B57] shadow-[4px_4px_0px_0px_rgba(255,107,87,1)]' : 'bg-[#FAFAFA] hover:bg-[#FF6B57]/5 hover:border-[#FF6B57]'}`}
        >
          <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }} />
          {uploadLoading
            ? <Loader className="h-10 w-10 text-black animate-spin mb-4" />
            : <UploadCloud className="h-10 w-10 text-black mb-4" />}
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
        <div className="text-center py-16 bg-[#FAFAFA] rounded-[2rem] border-2 border-dashed border-black">
          <FileText className="h-12 w-12 text-gray-200 mx-auto mb-3" />
          <p className="text-xl font-extrabold text-black">No documents yet</p>
          <p className="text-gray-500 font-medium mt-1">Upload a PDF to give this agent knowledge.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {docs.map((d) => (
            <div key={d.doc_id} className="bg-white rounded-[1.5rem] border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] px-6 py-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <div className="p-3 bg-[#FF6B57]/15 rounded-xl border-2 border-black shrink-0">
                  <FileText className="h-5 w-5 text-black" />
                </div>
                <div className="min-w-0">
                  <p className="font-extrabold text-black truncate">{d.filename}</p>
                  <p className="text-sm font-medium text-gray-500 mt-0.5">{d.chunks} chunk{d.chunks !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <button
                onClick={() => handleDelete(d.filename)}
                disabled={deletingId === d.filename}
                className="p-2.5 bg-red-500 text-white rounded-full border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-red-600 transition-colors disabled:opacity-50 shrink-0"
              >
                {deletingId === d.filename ? <Loader className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Discover Tab ───────────────────────────────────────────────────────────

function DiscoverTab() {
  const [publicAgents, setPublicAgents] = useState<PublicAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [chatAgent, setChatAgent] = useState<PublicAgent | null>(null);

  useEffect(() => {
    listPublicAgents()
      .then((agents) =>
        setPublicAgents(agents.map((a) => ({ agent_id: a.id, name: a.name, description: a.description, user_id: a.user_id })))
      )
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (chatAgent) {
    return (
      <div className="bg-white rounded-[2rem] border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
        <AgentChatView agent={chatAgent} onBack={() => setChatAgent(null)} readOnly />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Section header */}
      <div className="bg-white rounded-[2rem] border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
        <div className="h-1.5 bg-[#FF6B57]" />
        <div className="p-7 flex items-center gap-5">
          <div className="p-4 bg-[#FF6B57]/15 rounded-2xl border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
            <Users className="h-7 w-7 text-black" />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold text-black">Discover Agents</h2>
            <p className="text-sm font-medium text-gray-500 mt-0.5">
              Chat with public study agents shared by other students.
            </p>
          </div>
          {!loading && publicAgents.length > 0 && (
            <span className="ml-auto px-3 py-1.5 bg-[#FF6B57] border-2 border-black rounded-full text-sm font-extrabold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              {publicAgents.length} available
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24 gap-3 text-gray-400">
          <Loader className="h-6 w-6 animate-spin" />
          <span className="font-bold">Loading public agents…</span>
        </div>
      ) : publicAgents.length === 0 ? (
        <div className="text-center py-24 bg-white rounded-[2rem] border-2 border-dashed border-black">
          <div className="w-20 h-20 bg-[#FAFAFA] border-2 border-black rounded-full flex items-center justify-center mx-auto mb-5">
            <Users className="h-9 w-9 text-gray-200" />
          </div>
          <p className="text-2xl font-extrabold text-black mb-2">No Public Agents Yet</p>
          <p className="text-gray-500 font-medium max-w-sm mx-auto text-sm">
            Be the first to share — go to My Agents and flip any agent to Public.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {publicAgents.map((a) => (
            <div
              key={a.agent_id}
              className="bg-white rounded-[2rem] border-2 border-black shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] overflow-hidden flex flex-col hover:-translate-y-1 hover:shadow-[7px_7px_0px_0px_rgba(0,0,0,1)] transition-all"
            >
              <div className="h-1.5 bg-[#FF6B57]" />
              <div className="p-7 flex flex-col gap-4 flex-1">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-[#FF6B57]/15 rounded-xl border-2 border-black shrink-0">
                    <Bot className="h-6 w-6 text-black" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-lg font-extrabold text-black truncate">{a.name}</h3>
                    <p className="text-sm font-medium text-gray-500 mt-1 line-clamp-2">{a.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 px-3 py-2 bg-[#FAFAFA] border-2 border-black rounded-xl">
                  <Eye className="h-3.5 w-3.5 text-[#FF6B57] shrink-0" />
                  <span className="text-xs font-bold text-black">Shared by a student</span>
                </div>

                <button
                  onClick={() => setChatAgent(a)}
                  className="mt-auto flex items-center justify-center gap-2 px-4 py-3 bg-black text-white border-2 border-black rounded-full font-extrabold text-sm hover:bg-gray-800 transition-colors shadow-[3px_3px_0px_0px_rgba(255,107,87,1)]"
                >
                  <MessageSquare className="h-4 w-4" />
                  Start Chat
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── My Agents Tab ──────────────────────────────────────────────────────────

type InnerView = 'list' | 'docs' | 'chat';

function MyAgentsTab() {
  const { user } = useAuth();

  const [agents, setAgents] = useState<Agent[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(true);

  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');

  const [activeAgent, setActiveAgent] = useState<Agent | null>(null);
  const [innerView, setInnerView] = useState<InnerView>('list');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const classroomId = user ? personalClassroomId(user.uid) : '';

  useEffect(() => {
    if (!user) return;
    listAgents()
      .then((all) => {
        const personal = all.filter((a) => !a.bot_type);
        setAgents(personal.map((a) => ({
          agent_id: a.id,
          name: a.name,
          description: a.description,
          is_public: (a as any).is_public ?? false,
        })));
      })
      .catch(() => {})
      .finally(() => setAgentsLoading(false));
  }, [user]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    setCreateLoading(true);
    try {
      const result = await createAgent(name.trim(), description.trim(), classroomId);
      const newAgent: Agent = {
        agent_id: result.agent_id,
        name: name.trim(),
        description: description.trim(),
        is_public: false,
      };
      setAgents((prev) => [newAgent, ...prev]);
      setName('');
      setDescription('');
      setShowCreate(false);
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create agent');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDeleteAgent = async (agentId: string) => {
    setDeletingId(agentId);
    try {
      await deleteAgent(agentId);
      setAgents((prev) => prev.filter((a) => a.agent_id !== agentId));
      setConfirmDeleteId(null);
    } catch (err: any) {
      alert(err.message || 'Failed to delete agent');
    } finally {
      setDeletingId(null);
    }
  };

  const handleTogglePublic = async (agentId: string, currentIsPublic: boolean) => {
    setTogglingId(agentId);
    try {
      await toggleAgentPublic(agentId, !currentIsPublic);
      setAgents((prev) =>
        prev.map((a) => a.agent_id === agentId ? { ...a, is_public: !currentIsPublic } : a)
      );
    } catch (err: any) {
      alert(err.message || 'Failed to update visibility');
    } finally {
      setTogglingId(null);
    }
  };

  if (activeAgent && innerView === 'chat') {
    return (
      <div className="bg-white rounded-[2rem] border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
        <AgentChatView agent={activeAgent} onBack={() => setInnerView('docs')} />
      </div>
    );
  }

  if (activeAgent && innerView === 'docs') {
    return (
      <AgentDocsView
        agent={activeAgent}
        onBack={() => { setActiveAgent(null); setInnerView('list'); }}
        onChat={() => setInnerView('chat')}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero header */}
      <div className="bg-white rounded-[2rem] border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
        <div className="h-1.5 bg-[#FF6B57]" />
        <div className="p-7 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
          <div className="flex items-center gap-5">
            <div className="p-4 bg-[#FF6B57]/15 rounded-2xl border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
              <Sparkles className="h-7 w-7 text-black" />
            </div>
            <div>
              <h2 className="text-2xl font-extrabold text-black">My Study Agents</h2>
              <p className="text-sm font-medium text-gray-500 mt-0.5">
                Create AI agents, feed them your notes, and get personalized help.
              </p>
            </div>
          </div>
          <button
            onClick={() => { setShowCreate(!showCreate); setCreateError(''); }}
            className={`flex items-center gap-2 px-6 py-3 rounded-full border-2 border-black font-extrabold text-sm transition-all shrink-0
              ${showCreate
                ? 'bg-white text-black hover:bg-gray-100 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                : 'bg-black text-white hover:bg-gray-800 shadow-[4px_4px_0px_0px_rgba(255,107,87,1)]'}`}
          >
            {showCreate ? <><X className="h-4 w-4" /> Cancel</> : <><Plus className="h-4 w-4" /> New Agent</>}
          </button>
        </div>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="bg-[#FAFAFA] rounded-[2rem] border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
          <div className="px-8 py-5 border-b-2 border-black bg-white flex items-center gap-3">
            <div className="w-8 h-8 bg-[#FF6B57] border-2 border-black rounded-lg flex items-center justify-center">
              <Plus className="h-4 w-4 text-black" />
            </div>
            <h3 className="text-lg font-extrabold text-black">Create New Agent</h3>
          </div>
          <form onSubmit={handleCreate} className="p-8 space-y-5">
            <div className="space-y-2">
              <label className="block text-xs font-extrabold text-black uppercase tracking-widest">Agent Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. My Physics Study Bot"
                className="w-full px-5 py-4 border-2 border-black rounded-[1rem] focus:outline-none focus:border-[#FF6B57] transition-colors bg-white font-bold text-base placeholder-gray-300"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-extrabold text-black uppercase tracking-widest">What will this agent help with?</label>
              <textarea
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="e.g. Answering questions from my physics lecture notes…"
                className="w-full px-5 py-4 border-2 border-black rounded-[1rem] focus:outline-none focus:border-[#FF6B57] transition-colors bg-white font-bold placeholder-gray-300 resize-none"
              />
            </div>

            {createError && (
              <div className="flex items-start gap-3 bg-red-50 border-2 border-red-400 rounded-[1rem] p-4">
                <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                <span className="text-sm font-bold text-red-600">{createError}</span>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={createLoading || !name.trim() || !description.trim()}
                className="flex items-center gap-2 px-8 py-3.5 bg-[#FF6B57] text-black rounded-full font-extrabold border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-[#FF8A7A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createLoading
                  ? <><Loader className="h-4 w-4 animate-spin" /> Creating…</>
                  : <><Sparkles className="h-4 w-4" /> Create Agent</>}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Agent cards */}
      {agentsLoading ? (
        <div className="flex items-center justify-center py-24 gap-3 text-gray-400">
          <Loader className="h-6 w-6 animate-spin" />
          <span className="font-bold">Loading your agents…</span>
        </div>
      ) : agents.length === 0 ? (
        <div className="text-center py-24 bg-white rounded-[2rem] border-2 border-dashed border-black">
          <div className="w-20 h-20 bg-[#FAFAFA] border-2 border-black rounded-full flex items-center justify-center mx-auto mb-5 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
            <Sparkles className="h-9 w-9 text-[#FF6B57]" />
          </div>
          <p className="text-2xl font-extrabold text-black mb-2">No Agents Yet</p>
          <p className="text-gray-500 font-medium max-w-sm mx-auto text-sm mb-6">
            Create your first agent, upload study notes, and start getting personalized answers.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-8 py-3 bg-black text-white rounded-full border-2 border-black font-extrabold shadow-[4px_4px_0px_0px_rgba(255,107,87,1)] hover:bg-gray-800 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Create Your First Agent
          </button>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map((a) => (
            <div
              key={a.agent_id}
              className="bg-white rounded-[2rem] border-2 border-black shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] overflow-hidden flex flex-col hover:-translate-y-1 hover:shadow-[7px_7px_0px_0px_rgba(0,0,0,1)] transition-all"
            >
              {/* Top accent */}
              <div className={`h-1.5 ${a.is_public ? 'bg-[#FF6B57]' : 'bg-gray-300'}`} />

              <div className="p-6 flex flex-col gap-4 flex-1">
                {/* Agent identity */}
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-[#FF6B57]/15 rounded-xl border-2 border-black shrink-0">
                    <Bot className="h-6 w-6 text-black" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-extrabold text-black truncate">{a.name}</h3>
                    <p className="text-sm font-medium text-gray-500 mt-0.5 line-clamp-2">{a.description}</p>
                  </div>
                </div>

                {/* Public/Private toggle */}
                <button
                  onClick={() => handleTogglePublic(a.agent_id, a.is_public ?? false)}
                  disabled={togglingId === a.agent_id}
                  className={`flex items-center justify-between w-full px-4 py-3 rounded-full border-2 border-black font-bold text-sm transition-all
                    ${a.is_public
                      ? 'bg-[#FF6B57]/10 text-black shadow-[2px_2px_0px_0px_rgba(255,107,87,1)]'
                      : 'bg-gray-100 text-gray-600 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'}`}
                >
                  <span className="flex items-center gap-2">
                    {togglingId === a.agent_id ? (
                      <Loader className="h-4 w-4 animate-spin" />
                    ) : a.is_public ? (
                      <><Unlock className="h-4 w-4" /> Public — anyone can chat</>
                    ) : (
                      <><Lock className="h-4 w-4" /> Private — only you</>
                    )}
                  </span>
                  <span className={`w-9 h-5 rounded-full border-2 border-black relative transition-colors shrink-0 ${a.is_public ? 'bg-black' : 'bg-gray-300'}`}>
                    <span className={`absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white border border-black transition-all ${a.is_public ? 'left-[18px]' : 'left-0.5'}`} />
                  </span>
                </button>

                {/* Visibility hint */}
                <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 border-black text-xs font-bold
                  ${a.is_public ? 'bg-[#FF6B57]/5 text-black' : 'bg-[#FAFAFA] text-gray-500'}`}
                >
                  {a.is_public
                    ? <><Eye className="h-3.5 w-3.5 text-[#FF6B57] shrink-0" /> Visible in Discover for all students</>
                    : <><EyeOff className="h-3.5 w-3.5 shrink-0" /> Only visible to you</>}
                </div>

                {/* Action buttons */}
                <div className="flex gap-2.5 mt-auto">
                  <button
                    onClick={() => { setActiveAgent(a); setInnerView('docs'); }}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-white border-2 border-black rounded-full font-bold text-sm hover:bg-black hover:text-white transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                  >
                    <Settings className="h-3.5 w-3.5" />
                    Manage
                  </button>
                  <button
                    onClick={() => { setActiveAgent(a); setInnerView('chat'); }}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-black text-white border-2 border-black rounded-full font-bold text-sm hover:bg-gray-800 transition-colors shadow-[3px_3px_0px_0px_rgba(255,107,87,1)]"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    Chat
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(a.agent_id)}
                    className="p-2.5 bg-white border-2 border-black rounded-full text-red-500 hover:bg-red-500 hover:text-white transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                    title="Delete agent"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Confirm delete */}
                {confirmDeleteId === a.agent_id && (
                  <div className="bg-red-50 border-2 border-red-400 rounded-[1.5rem] p-4 flex flex-col gap-3">
                    <p className="text-sm font-bold text-red-700">Delete this agent? All documents and chat history will be permanently removed.</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDeleteAgent(a.agent_id)}
                        disabled={deletingId === a.agent_id}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-500 text-white border-2 border-black rounded-full font-bold text-sm hover:bg-red-600 transition-colors disabled:opacity-50"
                      >
                        {deletingId === a.agent_id
                          ? <><Loader className="h-4 w-4 animate-spin" /> Deleting…</>
                          : <><Trash2 className="h-4 w-4" /> Yes, Delete</>}
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Root Page ──────────────────────────────────────────────────────────────

export default function PersonalAgentPanel() {
  const [tab, setTab] = useState<PanelTab>('my-agents');

  return (
    <div className="space-y-6">
      {/* Tab switcher */}
      <div className="flex items-center gap-2 bg-white border-2 border-black rounded-full p-1.5 w-fit shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
        <button
          onClick={() => setTab('my-agents')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-full border-2 font-extrabold text-sm transition-all
            ${tab === 'my-agents'
              ? 'bg-black text-white border-black shadow-[2px_2px_0px_0px_rgba(255,107,87,1)]'
              : 'bg-transparent text-gray-500 border-transparent hover:bg-[#FAFAFA] hover:text-black'}`}
        >
          <Sparkles className="h-4 w-4" />
          My Agents
        </button>
        <button
          onClick={() => setTab('discover')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-full border-2 font-extrabold text-sm transition-all
            ${tab === 'discover'
              ? 'bg-black text-white border-black shadow-[2px_2px_0px_0px_rgba(255,107,87,1)]'
              : 'bg-transparent text-gray-500 border-transparent hover:bg-[#FAFAFA] hover:text-black'}`}
        >
          <Users className="h-4 w-4" />
          Discover
        </button>
      </div>

      {tab === 'my-agents' ? <MyAgentsTab /> : <DiscoverTab />}
    </div>
  );
}
