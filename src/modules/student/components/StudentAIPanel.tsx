import { useState, useRef, useEffect } from 'react';
import { listClassroomAgents, queryAgent, answerGeneral, saveToContext, getQueryHistory, getWeakAreas, generateTest, searchAndAdd } from '../../../services/backendApi';
import TestModal from './TestModal';
import {
  Bot, Loader, Send, User, FileText, BookOpen, BarChart2,
  Globe, BookmarkPlus, Check, ArrowLeft, AlertTriangle, FlaskConical, Lightbulb, Search,
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
      <div className="flex flex-col flex-1 min-w-0 border-r border-gray-200">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 bg-white shrink-0">
          <button
            onClick={onBack}
            className="text-gray-400 hover:text-indigo-600 transition-colors"
            title="Back to agents"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="p-1.5 bg-indigo-50 rounded-lg">
            <Bot className="h-4 w-4 text-indigo-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">{agent.name}</p>
            <p className="text-xs text-gray-400">Ask anything about your course material</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-gray-50">
          {historyLoading && (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 space-y-2">
              <Loader className="h-6 w-6 text-indigo-300 animate-spin" />
              <p className="text-xs">Loading conversation history…</p>
            </div>
          )}

          {!historyLoading && messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 space-y-2">
              <Bot className="h-10 w-10 text-indigo-200" />
              <p className="text-sm font-medium">Ask the agent a question</p>
              <p className="text-xs">Answers come from your course documents.</p>
            </div>
          )}

          {!historyLoading &&
            messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'agent' && (
                  <div className="p-1.5 bg-indigo-100 rounded-full h-7 w-7 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="h-3.5 w-3.5 text-indigo-600" />
                  </div>
                )}

                <div className="max-w-[75%] space-y-1">
                  <div
                    className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed
                      ${msg.role === 'user'
                        ? 'bg-indigo-600 text-white rounded-br-sm whitespace-pre-wrap'
                        : msg.out_of_scope
                          ? 'bg-amber-50 border border-amber-200 text-gray-800 rounded-bl-sm shadow-sm'
                          : msg.general_knowledge
                            ? 'bg-blue-50 border border-blue-200 text-gray-800 rounded-bl-sm shadow-sm'
                            : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm'
                      }`}
                  >
                    {msg.role === 'user' ? (
                      msg.text
                    ) : (
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
                          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                          em: ({ children }) => <em className="italic">{children}</em>,
                          ul: ({ children }) => <ul className="list-disc list-inside space-y-0.5 my-1">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal list-inside space-y-0.5 my-1">{children}</ol>,
                          li: ({ children }) => <li>{children}</li>,
                          code: ({ children }) => (
                            <code className="bg-gray-100 px-1 rounded text-xs font-mono">{children}</code>
                          ),
                        }}
                      >
                        {msg.text}
                      </ReactMarkdown>
                    )}
                  </div>

                  {/* Out-of-scope actions */}
                  {msg.role === 'agent' && msg.out_of_scope && msg.pendingQuestion && (
                    <div className="flex flex-wrap gap-2 pt-1 pl-1">
                      <button
                        onClick={() => handleAnswerGeneral(msg.pendingQuestion!)}
                        disabled={loading}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs rounded-lg hover:bg-indigo-700 disabled:opacity-40 transition-colors"
                      >
                        <Globe className="h-3 w-3" />
                        Answer Anyway
                      </button>
                      {learnedTopics.has(msg.pendingQuestion!) ? (
                        <span className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-200 text-green-600 text-xs rounded-lg">
                          <Check className="h-3 w-3" />
                          Topic added! Try asking again.
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSearchAndAdd(msg.pendingQuestion!)}
                          disabled={loading || learningTopic === msg.pendingQuestion}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-xs rounded-lg hover:bg-emerald-700 disabled:opacity-40 transition-colors"
                        >
                          {learningTopic === msg.pendingQuestion ? (
                            <Loader className="h-3 w-3 animate-spin" />
                          ) : (
                            <Search className="h-3 w-3" />
                          )}
                          {learningTopic === msg.pendingQuestion ? 'Learning…' : 'Search & Add Topic'}
                        </button>
                      )}
                    </div>
                  )}

                  {/* General knowledge disclaimer + save */}
                  {msg.role === 'agent' && msg.general_knowledge && (
                    <div className="flex items-center justify-between pl-1 pt-1">
                      <p className="text-xs text-blue-500">
                        ⚠ General knowledge — may not match your syllabus
                      </p>
                      <button
                        onClick={() => handleSaveToContext(i)}
                        disabled={msg.savedToContext}
                        className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg border transition-colors ${
                          msg.savedToContext
                            ? 'bg-green-50 border-green-200 text-green-600 cursor-default'
                            : 'bg-white border-gray-200 text-gray-600 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-600'
                        }`}
                      >
                        {msg.savedToContext ? (
                          <><Check className="h-3 w-3" /> Saved</>
                        ) : (
                          <><BookmarkPlus className="h-3 w-3" /> Save to Notes</>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Inline confidence + score impact footer */}
                  {msg.role === 'agent' && !msg.out_of_scope && msg.confidence && (() => {
                    const meta = confMeta[msg.confidence] ?? confMeta.Medium;
                    return (
                      <div className="pl-1 pt-1 space-y-1">
                        {/* Confidence pill — always visible */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${meta.pill}`}>
                            {meta.dot} Confidence: {meta.label}
                          </span>
                          {/* Sources link — compact, secondary */}
                          {msg.sources && msg.sources.length > 0 && (
                            <button
                              onClick={() => setSelected(selected === msg ? null : msg)}
                              className="text-xs text-indigo-400 hover:text-indigo-600 font-medium transition-colors"
                            >
                              {selected === msg ? 'Hide sources' : `${msg.sources.length} source${msg.sources.length !== 1 ? 's' : ''} →`}
                            </button>
                          )}
                        </div>

                        {/* Score impact line */}
                        {msg.scoreImpact === 'improved' && (
                          <p className="text-xs font-bold text-green-600 flex items-center gap-1">
                            📈 This improved your understanding score
                          </p>
                        )}
                        {msg.scoreImpact === 'dropped' && (
                          <p className="text-xs font-bold text-red-500 flex items-center gap-1">
                            📉 Confidence dropped — try reviewing this topic
                          </p>
                        )}
                        {msg.scoreImpact === 'same' && msg.confidence === 'High' && (
                          <p className="text-xs font-bold text-green-500 flex items-center gap-1">
                            ✅ Staying strong — consistent high confidence
                          </p>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {msg.role === 'user' && (
                  <div className="p-1.5 bg-gray-200 rounded-full h-7 w-7 flex items-center justify-center shrink-0 mt-0.5">
                    <User className="h-3.5 w-3.5 text-gray-600" />
                  </div>
                )}
              </div>
            ))}

          {loading && (
            <div className="flex gap-2.5 justify-start">
              <div className="p-1.5 bg-indigo-100 rounded-full h-7 w-7 flex items-center justify-center shrink-0">
                <Bot className="h-3.5 w-3.5 text-indigo-600" />
              </div>
              <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                <div className="flex gap-1 items-center">
                  <span className="h-1.5 w-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0ms]" />
                  <span className="h-1.5 w-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:150ms]" />
                  <span className="h-1.5 w-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t border-gray-200 bg-white shrink-0">
          <div className="flex items-end gap-2 bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 focus-within:border-indigo-400 focus-within:ring-1 focus-within:ring-indigo-300 transition">
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a question… (Enter to send)"
              className="flex-1 resize-none bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none max-h-32"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
            >
              {loading ? (
                <Loader className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1.5 pl-1">Shift+Enter for new line</p>
        </div>
      </div>

      {/* ── Right: details + weak areas panel ───────────────────── */}
      <div className="w-72 shrink-0 flex flex-col bg-white overflow-hidden">
        {/* Tab bar */}
        <div className="flex border-b border-gray-200 shrink-0">
          <button
            onClick={() => setTab('chat')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-colors ${
              tab === 'chat'
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" /> Details
          </button>
          <button
            onClick={() => { setTab('weak'); if (weakAreas.length === 0) loadWeakAreas(); }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-colors ${
              tab === 'weak'
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <AlertTriangle className="h-3.5 w-3.5" /> Weak Areas
          </button>
        </div>

        {/* ── Details tab ── */}
        {tab === 'chat' && (
          <>
            {!selected ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center px-4 text-gray-400 space-y-2">
                <BookOpen className="h-8 w-8 text-gray-200" />
                <p className="text-xs">Click "View sources & confidence" on any agent reply to see details here.</p>
              </div>
            ) : (
              <div className="p-4 space-y-5 overflow-y-auto">
                {selected.confidence && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <BarChart2 className="h-3.5 w-3.5 text-gray-400" />
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Confidence</span>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${confidenceColor[selected.confidence] ?? 'text-gray-600 bg-gray-50 border-gray-200'}`}>
                      {selected.confidence}
                    </span>
                  </div>
                )}

                {selected.explanation && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <Lightbulb className="h-3.5 w-3.5 text-yellow-400" />
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Why this answer?</span>
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
                      {selected.explanation}
                    </p>
                  </div>
                )}

                {selected.sources && selected.sources.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <FileText className="h-3.5 w-3.5 text-gray-400" />
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Sources ({selected.sources.length})</span>
                    </div>
                    <ul className="space-y-2">
                      {selected.sources.map((s, i) => (
                        <li key={i} className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                          <p className="text-xs font-medium text-gray-700 truncate" title={s.file}>{s.file}</p>
                          <p className="text-xs text-gray-400 mt-0.5">Page {s.page}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {(!selected.sources || selected.sources.length === 0) && !selected.confidence && !selected.explanation && (
                  <p className="text-xs text-gray-400 text-center">No details available for this response.</p>
                )}
              </div>
            )}
          </>
        )}

        {/* ── Weak Areas tab ── */}
        {tab === 'weak' && (
          <div className="flex-1 flex flex-col overflow-y-auto p-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Your Weak Topics</p>
              <button onClick={loadWeakAreas} className="text-xs text-indigo-500 hover:text-indigo-700">Refresh</button>
            </div>

            {weakLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader className="h-5 w-5 animate-spin text-indigo-400" />
              </div>
            ) : weakAreas.length === 0 ? (
              <div className="text-center py-8 text-gray-400 space-y-1">
                <AlertTriangle className="h-8 w-8 mx-auto text-gray-200" />
                <p className="text-xs">No weak areas detected yet. Keep asking questions!</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {weakAreas.map((w, i) => (
                  <li key={i} className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-semibold text-gray-800 capitalize">{w.topic}</p>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        w.weak_score >= 70 ? 'bg-red-100 text-red-600' :
                        w.weak_score >= 40 ? 'bg-yellow-100 text-yellow-600' :
                        'bg-green-100 text-green-600'
                      }`}>
                        {w.weak_score}%
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">{w.total_queries} queries · {w.low_confidence_count} low confidence</p>
                  </li>
                ))}
              </ul>
            )}

            {/* Generate Test */}
            <div className="pt-2 border-t border-gray-100">
              <button
                onClick={handleGenerateTest}
                disabled={testLoading || weakAreas.length === 0}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {testLoading ? <Loader className="h-3.5 w-3.5 animate-spin" /> : <FlaskConical className="h-3.5 w-3.5" />}
                Generate Test
              </button>
            </div>

            {/* Test History */}
            {testHistory.length > 0 && (
              <div className="pt-2 border-t border-gray-100 space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Test History</p>
                <ul className="space-y-2">
                  {testHistory.map((t, i) => {
                    const pct = Math.round((t.score / t.total) * 100);
                    return (
                      <li key={i} className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-semibold text-gray-800 capitalize truncate max-w-[120px]">{t.topic}</p>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            pct === 100 ? 'bg-green-100 text-green-600' :
                            pct >= 60  ? 'bg-yellow-100 text-yellow-600' :
                                          'bg-red-100 text-red-600'
                          }`}>
                            {t.score}/{t.total}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5 mb-1">
                          <div
                            className={`h-1.5 rounded-full ${
                              pct === 100 ? 'bg-green-500' : pct >= 60 ? 'bg-yellow-400' : 'bg-red-400'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-400">{t.date}</p>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

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
      <div className="p-6 sm:p-10 space-y-8">
        {/* Agent header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSelectedAgent(null)}
            className="px-4 py-2 border-2 border-black rounded-full font-bold text-sm hover:bg-black hover:text-white transition-colors"
          >
            &larr; Back
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-extrabold text-black truncate">{selectedAgent.name}</h2>
            <p className="text-sm font-medium text-gray-500 mt-0.5 truncate">
              {selectedAgent.description}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-[2rem] border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
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
    <div className="p-6 sm:p-10 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4 bg-white p-6 rounded-[2rem] border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <div className="p-3 bg-[#FF6B57]/10 rounded-xl border-2 border-black">
          <Bot className="h-6 w-6 text-black" />
        </div>
        <div>
          <h2 className="text-2xl font-extrabold text-black">AI Assistants</h2>
          <p className="text-sm font-medium text-gray-500 mt-0.5">
            Ask questions about{' '}
            <span className="font-bold text-black">{classroomName}</span> content
          </p>
        </div>
      </div>

      {/* Agent cards */}
      {agentsLoading ? (
        <div className="flex items-center justify-center py-20 gap-3 text-gray-400">
          <Loader className="h-6 w-6 animate-spin" />
          <span className="font-bold">Loading assistants…</span>
        </div>
      ) : visibleAgents.length === 0 ? (
        <div className="text-center py-20 bg-[#FAFAFA] rounded-[2rem] border-2 border-black border-dashed">
          <Bot className="h-14 w-14 text-gray-300 mx-auto mb-4" />
          <p className="text-xl font-extrabold text-black">No AI assistants yet</p>
          <p className="text-gray-500 font-medium mt-1">
            Your teacher hasn't set up any agents for this classroom.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          {visibleAgents.map((a) => (
            <div
              key={a.agent_id}
              className="bg-white rounded-[2rem] border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-8 flex flex-col gap-5 hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-[#FF6B57]/10 rounded-xl border-2 border-black shrink-0">
                  <Bot className="h-6 w-6 text-black" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-extrabold text-black truncate">{a.name}</h3>
                  <p className="text-sm font-medium text-gray-500 mt-1 line-clamp-2">
                    {a.description}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedAgent(a)}
                className="mt-auto flex items-center justify-center gap-2 px-4 py-3 bg-black text-white border-2 border-black rounded-full font-bold text-sm hover:bg-gray-800 transition-colors shadow-[4px_4px_0px_0px_rgba(255,107,87,1)]"
              >
                <Bot className="h-4 w-4" />
                Start Chat
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
