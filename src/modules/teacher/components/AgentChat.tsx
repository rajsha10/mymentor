import { useState, useRef, useEffect } from 'react';
import { queryAgent, answerGeneral, saveToContext, getQueryHistory, searchAndAdd } from '../../../services/backendApi';
import { Send, Loader, Bot, User, FileText, BookOpen, BarChart2, ArrowLeft, Search, Globe, BookmarkPlus, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface Source {
  file: string;
  page: number;
}

interface Message {
  role: 'user' | 'agent';
  text: string;
  sources?: Source[];
  confidence?: string;
  out_of_scope?: boolean;
  general_knowledge?: boolean;
  pendingQuestion?: string;
  savedToContext?: boolean;
}

interface Props {
  agentId: string;
  agentName: string;
  onBack: () => void;
}

const confidenceColor: Record<string, string> = {
  High:   'text-green-600 bg-green-50 border-green-200',
  Medium: 'text-yellow-600 bg-yellow-50 border-yellow-200',
  Low:    'text-red-600 bg-red-50 border-red-200',
};

export default function AgentChat({ agentId, agentName, onBack }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [selected, setSelected] = useState<Message | null>(null);
  const [learnedTopics, setLearnedTopics] = useState<Set<string>>(new Set());
  const [learningTopic, setLearningTopic] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load persisted message history on mount
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
      .catch(() => {/* silently ignore — chat still works without history */})
      .finally(() => setHistoryLoading(false));
  }, [agentId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async () => {
    const q = input.trim();
    if (!q || loading) return;

    const userMsg: Message = { role: 'user', text: q };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await queryAgent(q, agentId);
      console.log('[AgentChat] response:', JSON.stringify(res));
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
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleAnswerGeneral = async (question: string, msgIndex: number) => {
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
      setMessages((prev) => [
        ...prev,
        { role: 'agent', text: `Error: ${err.message || 'Something went wrong'}` },
      ]);
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

  const handleSaveToContext = async (msgIndex: number) => {
    const msg = messages[msgIndex];
    if (!msg || msg.savedToContext) return;
    try {
      await saveToContext(agentId, msg.pendingQuestion!, msg.text);
      setMessages((prev) =>
        prev.map((m, i) => i === msgIndex ? { ...m, savedToContext: true } : m)
      );
    } catch (err: any) {
      alert(`Failed to save: ${err.message}`);
    }
  };

  return (
    <div className="flex h-[600px] overflow-hidden">
      {/* ── Left: chat ─────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 border-r border-gray-200">
        {/* Chat header */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200 bg-white shrink-0">
          <button
            onClick={onBack}
            className="text-gray-400 hover:text-black transition-colors"
            title="Back to manage"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
          </button>
          <div className="p-1 bg-indigo-50 rounded-lg border border-indigo-100">
            <Bot className="h-3.5 w-3.5 text-indigo-600" />
          </div>
          <div>
            <p className="text-[10px] font-black text-black uppercase tracking-tight leading-none">{agentName}</p>
            <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Knowledge Intelligence Stream</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-gray-50/50">
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
              <p className="text-xs">Answers come from the documents you uploaded.</p>
            </div>
          )}

          {!historyLoading && messages.map((msg, i) => (
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
                  {msg.role === 'user' ? msg.text : (
                    <ReactMarkdown
                      components={{
                        p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
                        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                        em: ({ children }) => <em className="italic">{children}</em>,
                        ul: ({ children }) => <ul className="list-disc list-inside space-y-0.5 my-1">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal list-inside space-y-0.5 my-1">{children}</ol>,
                        li: ({ children }) => <li>{children}</li>,
                        code: ({ children }) => <code className="bg-gray-100 px-1 rounded text-xs font-mono">{children}</code>,
                      }}
                    >
                      {msg.text}
                    </ReactMarkdown>
                  )}
                </div>

                {/* Out of scope action buttons */}
                {msg.role === 'agent' && msg.out_of_scope && msg.pendingQuestion && (
                  <div className="flex flex-wrap gap-2 pt-1 pl-1">
                    <button
                      onClick={() => handleAnswerGeneral(msg.pendingQuestion!, i)}
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

                {/* General knowledge disclaimer + save button */}
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
                      {msg.savedToContext
                        ? <><Check className="h-3 w-3" /> Saved</>
                        : <><BookmarkPlus className="h-3 w-3" /> Save to Notes</>
                      }
                    </button>
                  </div>
                )}

                {/* Click to inspect details */}
                {msg.role === 'agent' && !msg.out_of_scope && (msg.sources?.length || msg.confidence) && (
                  <button
                    onClick={() => setSelected(selected === msg ? null : msg)}
                    className="text-xs text-indigo-500 hover:text-indigo-700 pl-1"
                  >
                    {selected === msg ? 'Hide details' : 'View sources & confidence →'}
                  </button>
                )}
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
        <div className="px-3 py-2 border-t border-gray-200 bg-white shrink-0">
          <div className="flex items-end gap-2 bg-gray-50 border border-gray-300 rounded-xl px-2 py-1.5 focus-within:border-black focus-within:ring-1 focus-within:ring-black/10 transition">
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Query agent…"
              className="flex-1 resize-none bg-transparent text-xs text-gray-800 placeholder-gray-400 outline-none max-h-24"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="p-1 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
            >
              {loading
                ? <Loader className="h-3 w-3 animate-spin" />
                : <Send className="h-3 w-3" />
              }
            </button>
          </div>
        </div>
      </div>

      {/* ── Right: details panel ────────────────────────────────── */}
      <div className="w-56 shrink-0 flex flex-col bg-white overflow-y-auto">
        <div className="px-3 py-2 border-b border-gray-200 shrink-0">
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Inference Details</p>
        </div>

        {!selected ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-4 text-gray-400 space-y-2">
            <BookOpen className="h-8 w-8 text-gray-200" />
            <p className="text-xs">Click "View sources & confidence" on any agent reply to see details here.</p>
          </div>
        ) : (
          <div className="p-4 space-y-5">
            {/* Confidence */}
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

            {/* Sources */}
            {selected.sources && selected.sources.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <FileText className="h-3.5 w-3.5 text-gray-400" />
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Sources ({selected.sources.length})
                  </span>
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

            {(!selected.sources || selected.sources.length === 0) && !selected.confidence && (
              <p className="text-xs text-gray-400 text-center">No details available for this response.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
