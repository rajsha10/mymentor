import { useState, useRef, useEffect } from 'react';
import { listClassroomAgents, queryAgent, answerGeneral, saveToContext, getQueryHistory, getWeakAreas, generateTest, searchAndAdd } from '../../../services/backendApi';
import TestModal from './TestModal';
import {
  Bot, Loader, Send, User, FileText, BookOpen, BarChart2,
  Globe, BookmarkPlus, Check, ArrowLeft, AlertTriangle, FlaskConical, Lightbulb, Search, Sparkles, Trophy, Activity,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface Agent {
  agent_id: string;
  name: string;
  description: string;
}

interface Source {
  file: string;
  page: number;
}

interface Message {
  role: 'user' | 'agent';
  text: string;
  sources?: Source[];
  confidence?: string;
  explanation?: string;
  out_of_scope?: boolean;
  general_knowledge?: boolean;
  pendingQuestion?: string;
  savedToContext?: boolean;
  scoreImpact?: 'improved' | 'dropped' | 'same' | null;
}

const confRank: Record<string, number> = { High: 3, Medium: 2, Low: 1 };

const confMeta: Record<string, { dot: string; pill: string; label: string }> = {
  High:   { dot: '🟢', pill: 'bg-green-50 border-green-300 text-green-700',   label: 'High'   },
  Medium: { dot: '🟡', pill: 'bg-yellow-50 border-yellow-300 text-yellow-700', label: 'Medium' },
  Low:    { dot: '🔴', pill: 'bg-red-50 border-red-300 text-red-600',          label: 'Low'    },
};

interface WeakArea {
  topic: string;
  total_queries: number;
  low_confidence_count: number;
  weak_score: number;
}

const confidenceColor: Record<string, string> = {
  High:   'text-green-600 bg-green-50 border-green-200',
  Medium: 'text-yellow-600 bg-yellow-50 border-yellow-200',
  Low:    'text-red-600 bg-red-50 border-red-200',
};

// ── Chat view ──────────────────────────────────────────────────────────────
function AgentChatView({
  agent,
  onBack,
}: {
  agent: Agent;
  onBack: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [selected, setSelected] = useState<Message | null>(null);
  const [tab, setTab] = useState<'chat' | 'weak'>('chat');
  const [weakAreas, setWeakAreas] = useState<WeakArea[]>([]);
  const [weakLoading, setWeakLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ topic: string; weak_score: number; test: { question: string; options: string[]; answer: string }[] } | null>(null);
  const [testLoading, setTestLoading] = useState(false);
  const [testHistory, setTestHistory] = useState<{ topic: string; score: number; total: number; date: string }[]>([]);
  const [learnedTopics, setLearnedTopics] = useState<Set<string>>(new Set());
  const [learningTopic, setLearningTopic] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const lastConfRef = useRef<string | null>(null);

  useEffect(() => {
    setHistoryLoading(true);
    lastConfRef.current = null;
    getQueryHistory(agent.agent_id)
      .then((rows) => {
        const hydrated: Message[] = rows.flatMap((row) => [
          { role: 'user' as const, text: row.question },
          { role: 'agent' as const, text: row.answer },
        ]);
        setMessages(hydrated);
      })
      .catch(() => {})
      .finally(() => setHistoryLoading(false));
  }, [agent.agent_id]);

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
      const res = await queryAgent(q, agent.agent_id);
      const isOutOfScope = res.out_of_scope === true;

      // Compare to last answer's confidence to compute score impact
      let scoreImpact: Message['scoreImpact'] = null;
      if (!isOutOfScope && res.confidence) {
        const prev = lastConfRef.current;
        if (prev) {
          const delta = confRank[res.confidence] - confRank[prev];
          scoreImpact = delta > 0 ? 'improved' : delta < 0 ? 'dropped' : 'same';
        }
        lastConfRef.current = res.confidence;
      }

      const agentMsg: Message = {
        role: 'agent',
        text: res.answer,
        sources: res.sources,
        confidence: res.confidence,
        explanation: res.explanation,
        out_of_scope: isOutOfScope,
        pendingQuestion: isOutOfScope ? q : undefined,
        scoreImpact,
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
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleAnswerGeneral = async (question: string) => {
    setLoading(true);
    try {
      const res = await answerGeneral(question, agent.agent_id);
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
      setMessages((prev) => [
        ...prev,
        { role: 'agent', text: `Error: ${err.message || 'Something went wrong'}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToContext = async (msgIndex: number) => {
    const msg = messages[msgIndex];
    if (!msg || msg.savedToContext) return;
    try {
      await saveToContext(agent.agent_id, msg.pendingQuestion!, msg.text);
      setMessages((prev) =>
        prev.map((m, i) => (i === msgIndex ? { ...m, savedToContext: true } : m))
      );
    } catch (err: any) {
      alert(`Failed to save: ${err.message}`);
    }
  };

  const handleSearchAndAdd = async (topic: string) => {
    setLearningTopic(topic);
    try {
      await searchAndAdd(agent.agent_id, topic);
      setLearnedTopics((prev) => new Set(prev).add(topic));
      setMessages((prev) => [
        ...prev,
        {
          role: 'agent',
          text: `Topic added to your notes! You can now ask about **${topic}** and I'll have context for it.`,
        },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { role: 'agent', text: `Failed to add topic: ${err.message}` },
      ]);
    } finally {
      setLearningTopic(null);
    }
  };

  const loadWeakAreas = async () => {
    setWeakLoading(true);
    try {
      const data = await getWeakAreas(agent.agent_id);
      setWeakAreas(data.weak_areas);
    } catch {
      setWeakAreas([]);
    } finally {
      setWeakLoading(false);
    }
  };

  const handleGenerateTest = async () => {
    setTestLoading(true);
    setTestResult(null);
    try {
      const data = await generateTest(agent.agent_id);
      setTestResult(data);
    } catch (err: any) {
      alert(`Failed to generate test: ${err.message}`);
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <>
    <div className="flex h-[600px] overflow-hidden">
      {/* ── Left: chat ───────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 border-r-2 border-black">
        {/* Header (Secondary) */}
        <div className="flex items-center gap-2.5 px-4 py-3 border-b-2 border-black bg-gray-50/50 shrink-0">
          <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(255,107,87,1)]">
            <Bot className="h-4 w-4 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-black text-black uppercase tracking-tight truncate">{agent.name}</p>
            <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest">Assistant Live</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-[#FAFAFA] custom-scrollbar">
          {historyLoading && (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-3">
              <div className="relative">
                <div className="w-9 h-9 bg-black rounded-lg animate-spin shadow-[3px_3px_0px_0px_rgba(255,107,87,1)]" />
                <Loader className="absolute inset-0 m-auto h-4 w-4 text-white" />
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Restoring conversation…</p>
            </div>
          )}

          {!historyLoading && messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-3">
              <div className="w-14 h-14 bg-gray-100 border-2 border-dashed border-black/10 rounded-2xl flex items-center justify-center">
                <Bot className="h-7 w-7 text-gray-300" />
              </div>
              <div>
                <p className="text-sm font-black uppercase tracking-tight">Ready to Help!</p>
                <p className="text-xs text-gray-400 font-bold max-w-[180px] mx-auto">Ask anything about your course material to get started.</p>
              </div>
            </div>
          )}

          {!historyLoading &&
            messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'agent' && (
                  <div className="w-7 h-7 bg-black border-2 border-black rounded-lg flex items-center justify-center shrink-0 mt-1 shadow-[2px_2px_0px_0px_rgba(255,107,87,1)]">
                    <Bot className="h-3.5 w-3.5 text-white" />
                  </div>
                )}

                <div className={`max-w-[85%] sm:max-w-[70%] space-y-1.5`}>
                  <div
                    className={`px-4 py-3 rounded-2xl text-xs leading-relaxed border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]
                      ${msg.role === 'user'
                        ? 'bg-[#FF6B57] text-black font-bold rounded-tr-sm'
                        : msg.out_of_scope
                          ? 'bg-amber-50 text-gray-800 rounded-tl-sm'
                          : msg.general_knowledge
                            ? 'bg-blue-50 text-gray-800 rounded-tl-sm'
                            : 'bg-white text-gray-800 rounded-tl-sm'
                      }`}
                  >
                    {msg.role === 'user' ? (
                      msg.text
                    ) : (
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => <p className="mb-2 last:mb-0 font-medium">{children}</p>,
                          strong: ({ children }) => <strong className="font-black text-black">{children}</strong>,
                          em: ({ children }) => <em className="italic">{children}</em>,
                          ul: ({ children }) => <ul className="list-disc pl-5 space-y-1 my-2 font-medium">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal pl-5 space-y-1 my-2 font-medium">{children}</ol>,
                          li: ({ children }) => <li className="leading-snug">{children}</li>,
                          code: ({ children }) => (
                            <code className="bg-black/5 px-1.5 py-0.5 rounded font-bold text-xs font-mono">{children}</code>
                          ),
                        }}
                      >
                        {msg.text}
                      </ReactMarkdown>
                    )}
                  </div>

                  {/* Out-of-scope actions */}
                  {msg.role === 'agent' && msg.out_of_scope && msg.pendingQuestion && (
                    <div className="flex flex-wrap gap-3 pt-1">
                      <button
                        onClick={() => handleAnswerGeneral(msg.pendingQuestion!)}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-black text-white text-xs font-black rounded-full hover:bg-gray-800 disabled:opacity-40 transition-all shadow-[3px_3px_0px_0px_rgba(255,107,87,1)] active:shadow-none active:translate-x-0.5 active:translate-y-0.5"
                      >
                        <Globe className="h-4 w-4" />
                        ANSWER ANYWAY
                      </button>
                      {learnedTopics.has(msg.pendingQuestion!) ? (
                        <div className="flex items-center gap-2 px-4 py-2 bg-green-100 border-2 border-black text-green-700 text-xs font-black rounded-full">
                          <Check className="h-4 w-4" />
                          TOPIC ADDED!
                        </div>
                      ) : (
                        <button
                          onClick={() => handleSearchAndAdd(msg.pendingQuestion!)}
                          disabled={loading || learningTopic === msg.pendingQuestion}
                          className="flex items-center gap-2 px-4 py-2 bg-emerald-100 border-2 border-black text-black text-xs font-black rounded-full hover:bg-emerald-200 disabled:opacity-40 transition-all shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-0.5 active:translate-y-0.5"
                        >
                          {learningTopic === msg.pendingQuestion ? (
                            <Loader className="h-4 w-4 animate-spin" />
                          ) : (
                            <Search className="h-4 w-4" />
                          )}
                          {learningTopic === msg.pendingQuestion ? 'LEARNING…' : 'SEARCH & ADD TOPIC'}
                        </button>
                      )}
                    </div>
                  )}

                  {/* General knowledge disclaimer + save */}
                  {msg.role === 'agent' && msg.general_knowledge && (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                      <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-1.5">
                        <AlertTriangle className="h-3 w-3" /> General Knowledge
                      </p>
                      <button
                        onClick={() => handleSaveToContext(i)}
                        disabled={msg.savedToContext}
                        className={`flex items-center justify-center gap-2 px-4 py-2 text-xs font-black rounded-full border-2 border-black transition-all shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-0.5 active:translate-y-0.5 ${
                          msg.savedToContext
                            ? 'bg-green-100 text-green-700 cursor-default'
                            : 'bg-white text-black hover:bg-gray-50'
                        }`}
                      >
                        {msg.savedToContext ? (
                          <><Check className="h-4 w-4" /> SAVED</>
                        ) : (
                          <><BookmarkPlus className="h-4 w-4" /> SAVE TO NOTES</>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Inline confidence + score impact footer */}
                  {msg.role === 'agent' && !msg.out_of_scope && msg.confidence && (() => {
                    const meta = confMeta[msg.confidence] ?? confMeta.Medium;
                    return (
                      <div className="pt-2 space-y-3">
                        {/* Confidence pill */}
                        <div className="flex flex-wrap items-center gap-3">
                          <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border-2 border-black shadow-[2px_2px_0_0_rgba(0,0,0,1)] ${meta.pill}`}>
                            {meta.dot} {meta.label} CONFIDENCE
                          </span>
                          
                          {msg.sources && msg.sources.length > 0 && (
                            <button
                              onClick={() => setSelected(selected === msg ? null : msg)}
                              className="text-[10px] font-black uppercase tracking-widest text-indigo-500 hover:text-black transition-colors"
                            >
                              {selected === msg ? 'Hide sources' : `${msg.sources.length} sources →`}
                            </button>
                          )}
                        </div>

                        {/* Score impact messages */}
                        <div className="flex flex-col gap-1">
                          {msg.scoreImpact === 'improved' && (
                            <p className="text-[10px] font-black text-green-600 uppercase tracking-widest flex items-center gap-2">
                              <span className="flex w-1.5 h-1.5 bg-green-500 rounded-full" />
                              Improved Understanding Score
                            </p>
                          )}
                          {msg.scoreImpact === 'dropped' && (
                            <p className="text-[10px] font-black text-red-500 uppercase tracking-widest flex items-center gap-2">
                              <span className="flex w-1.5 h-1.5 bg-red-500 rounded-full" />
                              Review recommended for this topic
                            </p>
                          )}
                          {msg.scoreImpact === 'same' && msg.confidence === 'High' && (
                            <p className="text-[10px] font-black text-green-500 uppercase tracking-widest flex items-center gap-2">
                              <span className="flex w-1.5 h-1.5 bg-green-500 rounded-full" />
                              Consistent Mastery Maintained
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {msg.role === 'user' && (
                  <div className="w-7 h-7 bg-[#FF6B57] border-2 border-black rounded-lg flex items-center justify-center shrink-0 mt-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    <User className="h-3.5 w-3.5 text-black" />
                  </div>
                )}
              </div>
            ))}

          {loading && (
            <div className="flex gap-3 justify-start">
              <div className="w-7 h-7 bg-black border-2 border-black rounded-lg flex items-center justify-center shrink-0 shadow-[2px_2px_0px_0px_rgba(255,107,87,1)]">
                <Bot className="h-3.5 w-3.5 text-white" />
              </div>
              <div className="bg-white border-2 border-black rounded-2xl rounded-tl-sm px-4 py-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                <div className="flex gap-1.5 items-center">
                  <span className="h-1.5 w-1.5 bg-black rounded-full animate-bounce [animation-delay:0ms]" />
                  <span className="h-1.5 w-1.5 bg-black rounded-full animate-bounce [animation-delay:150ms]" />
                  <span className="h-1.5 w-1.5 bg-black rounded-full animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input area */}
        <div className="px-4 py-3 border-t-2 border-black bg-white shrink-0">
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-[#FF6B57] rounded-2xl blur opacity-0 group-focus-within:opacity-20 transition duration-500" />
            <div className="relative flex items-end gap-2 bg-white border-2 border-black rounded-2xl p-2 transition-all focus-within:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask your assistant anything..."
                className="flex-1 resize-none bg-transparent py-1.5 px-2 text-sm font-bold text-black placeholder-gray-400 outline-none max-h-32 min-h-[36px] custom-scrollbar"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || loading}
                className="w-9 h-9 bg-black text-white rounded-xl flex items-center justify-center hover:bg-[#FF6B57] hover:text-black disabled:opacity-20 disabled:cursor-not-allowed transition-all shrink-0 shadow-[3px_3px_0px_0px_rgba(255,107,87,1)] active:shadow-none active:translate-x-0.5 active:translate-y-0.5"
              >
                {loading ? (
                  <Loader className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
          <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mt-2 text-center">
            Shift + Enter for new line • <span className="text-black">Enter to send</span>
          </p>
        </div>
      </div>

      {/* ── Right: details + weak areas panel ───────────────────── */}
      <div className="w-64 shrink-0 flex flex-col bg-white overflow-hidden">
        {/* Tab bar */}
        <div className="flex border-b-2 border-black shrink-0 bg-gray-50/50">
          {[
            { id: 'chat', label: 'Details', icon: BookOpen },
            { id: 'weak', label: 'Weak Areas', icon: AlertTriangle },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id as any); if (t.id === 'weak' && weakAreas.length === 0) loadWeakAreas(); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-[9px] font-black uppercase tracking-[0.15em] transition-all relative ${
                tab === t.id ? 'text-black' : 'text-gray-400 hover:text-black'
              }`}
            >
              <t.icon className={`h-4 w-4 ${tab === t.id ? 'text-[#FF6B57]' : 'text-gray-300'}`} />
              {t.label}
              {tab === t.id && <div className="absolute bottom-0 left-0 right-0 h-1 bg-black" />}
            </button>
          ))}
        </div>

        {/* ── Details tab ── */}
        {tab === 'chat' && (
          <div className="flex-1 flex flex-col custom-scrollbar overflow-y-auto">
            {!selected ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-5 text-gray-300 space-y-3">
                <div className="w-12 h-12 bg-gray-50 border-2 border-dashed border-gray-100 rounded-2xl flex items-center justify-center">
                  <BookOpen className="h-6 w-6" />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-wider leading-relaxed">Select a response to view source & confidence details</p>
              </div>
            ) : (
              <div className="p-4 space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                {selected.confidence && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <BarChart2 className="h-3.5 w-3.5 text-[#FF6B57]" />
                      <span className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">Confidence Score</span>
                    </div>
                    <div className={`inline-flex items-center px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border-2 border-black shadow-[2px_2px_0_0_rgba(0,0,0,1)] ${confidenceColor[selected.confidence]}`}>
                      {selected.confidence} Level
                    </div>
                  </div>
                )}

                {selected.explanation && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <Lightbulb className="h-3.5 w-3.5 text-yellow-500" />
                      <span className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">Assistant's Reasoning</span>
                    </div>
                    <div className="bg-yellow-50/50 border-2 border-black rounded-xl p-3 shadow-[3px_3px_0_0_rgba(0,0,0,1)]">
                      <p className="text-[10px] font-bold text-gray-800 leading-relaxed">
                        {selected.explanation}
                      </p>
                    </div>
                  </div>
                )}

                {selected.sources && selected.sources.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5 text-indigo-500" />
                      <span className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">Sources ({selected.sources.length})</span>
                    </div>
                    <div className="space-y-2">
                      {selected.sources.map((s, i) => (
                        <div key={i} className="bg-white border-2 border-black rounded-xl p-3 hover:shadow-[3px_3px_0_0_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-all group">
                          <p className="text-[10px] font-black text-black truncate uppercase tracking-tight" title={s.file}>{s.file}</p>
                          <div className="flex items-center justify-between mt-1">
                            <p className="text-[9px] font-black text-[#FF6B57] uppercase tracking-widest">Page {s.page}</p>
                            <div className="w-5 h-5 bg-gray-50 rounded flex items-center justify-center border border-black/10 group-hover:bg-black group-hover:text-white transition-colors">
                              <ArrowLeft className="h-2.5 w-2.5 rotate-180" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Weak Areas tab ── */}
        {tab === 'weak' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="px-4 py-2.5 border-b-2 border-black/5 bg-gray-50/30 flex items-center justify-between">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">Performance Tracking</p>
              <button onClick={loadWeakAreas} className="text-[9px] font-black text-[#FF6B57] uppercase tracking-widest hover:underline">Refresh</button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
              {weakLoading ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-3">
                  <Loader className="h-5 w-5 animate-spin text-black" />
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Analyzing patterns…</p>
                </div>
              ) : weakAreas.length === 0 ? (
                <div className="text-center py-8 px-4 space-y-3">
                  <div className="w-12 h-12 bg-gray-100 border-2 border-dashed border-black/10 rounded-xl mx-auto flex items-center justify-center">
                    <Check className="h-6 w-6 text-gray-300" />
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-tight">Mastery achieved!</p>
                    <p className="text-[10px] font-bold text-gray-400 mt-0.5">Keep asking questions to discover new insights.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {weakAreas.map((w, i) => (
                    <div key={i} className="bg-white border-2 border-black rounded-xl p-3 hover:shadow-[3px_3px_0_0_rgba(0,0,0,1)] transition-all">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] font-black uppercase tracking-tight text-black truncate pr-2">{w.topic}</p>
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded border-2 border-black shadow-[1px_1px_0_0_rgba(0,0,0,1)] ${
                          w.weak_score >= 70 ? 'bg-red-100 text-red-700' :
                          w.weak_score >= 40 ? 'bg-yellow-100 text-yellow-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {w.weak_score}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1 mb-2 overflow-hidden border border-black/5">
                        <div className={`h-full transition-all duration-1000 ${
                          w.weak_score >= 70 ? 'bg-red-500' : w.weak_score >= 40 ? 'bg-yellow-400' : 'bg-green-500'
                        }`} style={{ width: `${w.weak_score}%` }} />
                      </div>
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.1em]">{w.total_queries} Queries • {w.low_confidence_count} Review Needed</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-1">
                <button
                  onClick={handleGenerateTest}
                  disabled={testLoading || weakAreas.length === 0}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-black text-white font-black text-[10px] uppercase tracking-[0.15em] rounded-xl hover:bg-[#FF6B57] hover:text-black disabled:opacity-20 disabled:cursor-not-allowed transition-all shadow-[4px_4px_0px_0px_rgba(255,107,87,1)] active:shadow-none active:translate-x-0.5 active:translate-y-0.5"
                >
                  {testLoading ? <Loader className="h-3.5 w-3.5 animate-spin" /> : <FlaskConical className="h-3.5 w-3.5" />}
                  GENERATE MASTERY TEST
                </button>
              </div>

              {/* Test History */}
              {testHistory.length > 0 && (
                <div className="pt-6 border-t-2 border-black/5 space-y-4">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Syllabus Progress</p>
                  <div className="space-y-3 pb-4">
                    {testHistory.map((t, i) => {
                      const pct = Math.round((t.score / t.total) * 100);
                      return (
                        <div key={i} className="bg-gray-50/50 border-2 border-black rounded-2xl p-4 transition-all hover:bg-white">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-[10px] font-black uppercase tracking-tight text-black truncate max-w-[140px]">{t.topic}</p>
                            <span className="text-[10px] font-black text-black">{t.score}/{t.total}</span>
                          </div>
                          <div className="w-full bg-white rounded-full h-1.5 border border-black/5 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-1000 ${
                                pct === 100 ? 'bg-green-500' : pct >= 60 ? 'bg-yellow-400' : 'bg-red-400'
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>

    {testResult && testResult.test.length > 0 && (
      <TestModal
        topic={testResult.topic}
        questions={testResult.test}
        onClose={(score, total) => {
          if (score !== undefined && total !== undefined) {
            setTestHistory((prev) => [
              { topic: testResult.topic, score, total, date: new Date().toLocaleDateString() },
              ...prev,
            ]);
          }
          setTestResult(null);
        }}
      />
    )}
    </>
  );
}

// ── Main panel ─────────────────────────────────────────────────────────────
export default function StudentAIPanel({
  classroomName,
  classroomId,
  visibleAgentIds = [],
}: {
  classroomName: string;
  classroomId: string;
  visibleAgentIds?: string[];
}) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  useEffect(() => {
    listClassroomAgents(classroomId)
      .then((list) =>
        setAgents(list.map((a) => ({ agent_id: a.id, name: a.name, description: a.description })))
      )
      .catch(() => {})
      .finally(() => setAgentsLoading(false));
  }, [classroomId]);

  const visibleAgents = agents.filter((a) => visibleAgentIds.includes(a.agent_id));

  // ── Chat view ──────────────────────────────────────────────────────────
  if (selectedAgent) {
    return (
      <div className="p-3 sm:p-5 lg:p-6 space-y-4 animate-in fade-in duration-500">
        {/* Agent header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <button
            onClick={() => setSelectedAgent(null)}
            className="group flex items-center justify-center gap-2 px-4 py-2 bg-white border-2 border-black rounded-xl font-black text-xs uppercase tracking-widest hover:bg-black hover:text-white transition-all shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-0.5 active:translate-y-0.5 shrink-0"
          >
            <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
            Go Back
          </button>
          <div className="flex-1 min-w-0 bg-white p-4 rounded-2xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.05)]">
            <h2 className="text-base font-black text-black uppercase tracking-tight truncate">{selectedAgent.name}</h2>
            <p className="text-xs font-bold text-gray-400 mt-0.5 truncate uppercase tracking-wide">
              {selectedAgent.description}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
          <AgentChatView
            agent={selectedAgent}
            onBack={() => setSelectedAgent(null)}
          />
        </div>
      </div>
    );
  }

  // ── Agent list view ────────────────────────────────────────────────────
  return (
    <div className="p-3 sm:p-5 lg:p-6 space-y-5 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center gap-4 bg-black p-5 sm:p-6 rounded-2xl border-2 border-black shadow-[6px_6px_0px_0px_rgba(255,107,87,1)] relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none"
             style={{ backgroundImage: 'radial-gradient(#FF6B57 1.5px, transparent 1.5px)', backgroundSize: '24px 24px' }} />

        <div className="relative z-10 p-3 bg-[#FF6B57] rounded-2xl border-2 border-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] shrink-0 self-start md:self-auto">
          <Bot className="h-7 w-7 text-black" />
        </div>
        <div className="relative z-10 flex-1 min-w-0">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-[#FF6B57] text-black border border-black rounded-full text-[9px] font-black uppercase tracking-[0.2em] mb-2">
            AI Assistance Active
          </div>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-white uppercase tracking-tighter leading-none mb-1">AI Assistants</h2>
          <p className="text-gray-400 text-xs sm:text-sm font-bold uppercase tracking-wide">
            Ask specific questions about{' '}
            <span className="text-[#FF6B57]">{classroomName}</span>
          </p>
        </div>
      </div>

      {/* Agent cards */}
      {agentsLoading ? (
        <div className="flex flex-col items-center justify-center py-16 space-y-4 text-gray-400">
          <div className="relative">
            <div className="w-10 h-10 bg-black rounded-xl animate-spin shadow-[4px_4px_0px_0px_rgba(255,107,87,1)]" />
            <Bot className="absolute inset-0 m-auto h-5 w-5 text-white" />
          </div>
          <span className="text-xs font-black uppercase tracking-[0.3em]">Summoning Assistants…</span>
        </div>
      ) : visibleAgents.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border-2 border-black border-dashed opacity-50">
          <div className="w-16 h-16 bg-gray-50 border-2 border-dashed border-black/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Bot className="h-8 w-8 text-gray-300" />
          </div>
          <p className="text-base font-black uppercase tracking-tight text-black mb-1">No AI Assistants Yet</p>
          <p className="text-gray-400 font-bold max-w-xs mx-auto uppercase tracking-wide text-xs">
            Your teacher hasn't deployed any AI agents for this classroom yet.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {visibleAgents.map((a) => (
            <div
              key={a.agent_id}
              className="group bg-white rounded-2xl border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-5 flex flex-col gap-4 hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-gray-50 border-2 border-black rounded-xl shrink-0 group-hover:bg-[#FF6B57] transition-colors">
                  <Bot className="h-6 w-6 text-black" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-black text-black uppercase tracking-tight truncate mb-1">{a.name}</h3>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wide line-clamp-2 leading-relaxed">
                    {a.description}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedAgent(a)}
                className="mt-auto flex items-center justify-center gap-2 px-5 py-3 bg-black text-white border-2 border-black rounded-xl font-black text-xs uppercase tracking-[0.15em] hover:bg-[#FF6B57] hover:text-black transition-all shadow-[4px_4px_0px_0px_rgba(255,107,87,1)] active:shadow-none active:translate-x-0.5 active:translate-y-0.5"
              >
                <Bot className="h-4 w-4" />
                START LEARNING
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
