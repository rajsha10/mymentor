import { useState } from 'react';
import { X, CheckCircle, XCircle, Trophy } from 'lucide-react';

interface MCQ {
  question: string;
  options: string[];
  answer: string;
}

interface Props {
  topic: string;
  questions: MCQ[];
  onClose: (score?: number, total?: number) => void;
}

export default function TestModal({ topic, questions, onClose }: Props) {
  const [selected, setSelected] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const score = submitted
    ? questions.filter((q, i) => selected[i] === q.answer).length
    : 0;

  const handleSubmit = () => {
    if (Object.keys(selected).length < questions.length) {
      alert('Please answer all questions before submitting.');
      return;
    }
    setSubmitted(true);
  };

  const optionStyle = (qi: number, opt: string) => {
    const letter = opt[0]; // "A", "B", etc.
    if (!submitted) {
      return selected[qi] === letter
        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
        : 'border-gray-200 bg-white text-gray-700 hover:border-indigo-300 hover:bg-indigo-50';
    }
    const correct = questions[qi].answer;
    if (letter === correct) return 'border-green-500 bg-green-50 text-green-700';
    if (letter === selected[qi]) return 'border-red-400 bg-red-50 text-red-600';
    return 'border-gray-200 bg-white text-gray-400';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b-2 border-black shrink-0">
          <div>
            <h2 className="text-lg font-extrabold text-black capitalize">
              Test: {topic}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">{questions.length} questions · Select one option per question</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Score banner */}
        {submitted && (
          <div className={`flex items-center gap-3 px-6 py-3 shrink-0 border-b-2 border-black ${
            score === questions.length ? 'bg-green-50' : score >= questions.length / 2 ? 'bg-yellow-50' : 'bg-red-50'
          }`}>
            <Trophy className={`h-5 w-5 ${
              score === questions.length ? 'text-green-600' : score >= questions.length / 2 ? 'text-yellow-600' : 'text-red-500'
            }`} />
            <p className="font-extrabold text-black text-sm">
              You scored {score} / {questions.length}
              {score === questions.length && ' — Perfect! 🎉'}
              {score >= questions.length / 2 && score < questions.length && ' — Good job!'}
              {score < questions.length / 2 && ' — Keep practicing!'}
            </p>
          </div>
        )}

        {/* Questions */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-7">
          {questions.map((q, qi) => (
            <div key={qi}>
              <p className="text-sm font-bold text-gray-800 mb-3">
                {qi + 1}. {q.question}
              </p>
              <div className="space-y-2">
                {q.options.map((opt, oi) => {
                  const letter = opt[0];
                  return (
                    <button
                      key={oi}
                      disabled={submitted}
                      onClick={() => setSelected((prev) => ({ ...prev, [qi]: letter }))}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border-2 text-sm text-left transition-all ${optionStyle(qi, opt)}`}
                    >
                      {submitted && letter === q.answer && (
                        <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                      )}
                      {submitted && letter === selected[qi] && letter !== q.answer && (
                        <XCircle className="h-4 w-4 text-red-400 shrink-0" />
                      )}
                      {(!submitted || (letter !== q.answer && letter !== selected[qi])) && (
                        <span className={`h-4 w-4 rounded-full border-2 shrink-0 ${
                          selected[qi] === letter ? 'border-indigo-500 bg-indigo-500' : 'border-gray-300'
                        }`} />
                      )}
                      <span>{opt}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t-2 border-black shrink-0 flex gap-3">
          {!submitted ? (
            <button
              onClick={handleSubmit}
              className="flex-1 py-2.5 bg-black text-white font-bold text-sm rounded-xl hover:bg-gray-800 transition-colors shadow-[4px_4px_0px_0px_rgba(99,102,241,1)]"
            >
              Submit Answers
            </button>
          ) : (
            <button
              onClick={() => onClose(score, questions.length)}
              className="flex-1 py-2.5 bg-black text-white font-bold text-sm rounded-xl hover:bg-gray-800 transition-colors shadow-[4px_4px_0px_0px_rgba(99,102,241,1)]"
            >
              End Test
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
