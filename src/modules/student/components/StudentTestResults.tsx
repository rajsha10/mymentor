import { useState, useEffect } from 'react';
import {
  getStudentTest, getStudentTestResult,
  type StudentTestDetail, type SubmitTestResult,
} from '../../../services/backendApi';
import { X, Loader, CheckCircle, XCircle, Trophy, AlertTriangle } from 'lucide-react';

interface Props {
  testId: number;
  topic: string;
  onClose: () => void;
}

export default function StudentTestResults({ testId, topic, onClose }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [result, setResult] = useState<SubmitTestResult | null>(null);
  const [test, setTest] = useState<StudentTestDetail | null>(null);

  useEffect(() => {
    Promise.all([getStudentTest(testId), getStudentTestResult(testId)])
      .then(([testData, resultData]) => {
        setTest(testData);
        setResult(resultData);
      })
      .catch(err => setError(err.message || 'Failed to load results'))
      .finally(() => setLoading(false));
  }, [testId]);

  const scoreColor = (pct: number) =>
    pct >= 80 ? 'text-green-600' : pct >= 60 ? 'text-yellow-600' : 'text-red-600';

  const scoreBg = (pct: number) =>
    pct >= 80 ? 'bg-green-50 border-green-400' : pct >= 60 ? 'bg-yellow-50 border-yellow-400' : 'bg-red-50 border-red-400';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-[2rem] border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] w-full max-w-2xl max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b-2 border-black shrink-0">
          <div>
            <h2 className="text-lg font-extrabold text-black capitalize">{topic}</h2>
            <p className="text-xs text-gray-500 mt-0.5">Results &amp; Answer Review</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading && (
            <div className="flex flex-col items-center justify-center h-40 gap-3 text-gray-400">
              <Loader className="h-6 w-6 animate-spin" />
              <p className="text-sm font-medium">Loading results…</p>
            </div>
          )}

          {!loading && error && (
            <div className="flex flex-col items-center justify-center h-40 gap-3 text-red-500">
              <AlertTriangle className="h-6 w-6" />
              <p className="text-sm font-bold">{error}</p>
            </div>
          )}

          {!loading && !error && result && (
            <div className="space-y-6">
              {/* Score banner */}
              <div className={`rounded-2xl border-2 p-5 flex items-center gap-4 ${scoreBg(result.score_pct)}`}>
                <Trophy className={`h-8 w-8 shrink-0 ${scoreColor(result.score_pct)}`} />
                <div>
                  <p className={`text-3xl font-extrabold ${scoreColor(result.score_pct)}`}>
                    {result.score.toFixed(1)} / {result.max_score}
                  </p>
                  <p className="text-sm font-bold text-gray-600">
                    {result.score_pct}% ·{' '}
                    {result.score_pct >= 80
                      ? 'Excellent work!'
                      : result.score_pct >= 60
                      ? 'Good effort — review weak areas.'
                      : 'Keep practicing — focus on weak areas.'}
                  </p>
                </div>
              </div>

              {/* Weak areas */}
              {result.weak_areas.length > 0 && (
                <div className="border-2 border-yellow-400 bg-yellow-50 rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    <p className="text-sm font-extrabold text-yellow-800">Weak Areas</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {result.weak_areas.map(a => (
                      <span key={a} className="text-xs font-bold px-2 py-1 bg-yellow-100 border border-yellow-400 rounded-full text-yellow-800 capitalize">
                        {a}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Per-question breakdown */}
              <div className="space-y-3">
                <h3 className="font-extrabold text-sm text-gray-700 uppercase tracking-wide">Answer Review</h3>
                {result.breakdown.map((b, i) => {
                  const origQ = test?.questions[i];
                  const optMap: Record<string, string> = {};
                  if (origQ?.options) {
                    origQ.options.forEach(opt => {
                      const letter = opt.trim()[0]?.toUpperCase();
                      if (letter) optMap[letter] = opt.trim();
                    });
                  }
                  const studentLabel = b.type === 'mcq'
                    ? (optMap[b.student_answer?.toUpperCase()] ?? b.student_answer ?? '(blank)')
                    : (b.student_answer || '(blank)');
                  const correctLabel = b.type === 'mcq'
                    ? (optMap[b.correct_answer?.toUpperCase()] ?? b.correct_answer)
                    : b.correct_answer;

                  return (
                    <div
                      key={i}
                      className={`rounded-xl border-2 px-4 py-3 text-sm ${
                        b.correct ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="font-bold text-gray-800 flex-1">Q{i + 1}. {b.question}</p>
                        {b.correct
                          ? <CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                          : <XCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                        }
                      </div>
                      <p className="text-gray-600">
                        <span className="font-bold">Your answer: </span>
                        <span className={b.correct ? 'text-green-700' : 'text-red-600'}>{studentLabel}</span>
                      </p>
                      {!b.correct && (
                        <p className="text-gray-600 mt-0.5">
                          <span className="font-bold">Correct: </span>{correctLabel}
                        </p>
                      )}
                      {b.type !== 'mcq' && (
                        <p className="text-xs text-gray-400 mt-1">Score: {Math.round(b.points * 100)}%</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t-2 border-black shrink-0">
          <button
            onClick={onClose}
            className="w-full py-3 bg-black text-white font-extrabold rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(99,102,241,0.4)] hover:bg-gray-800 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
