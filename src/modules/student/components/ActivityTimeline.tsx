import { useEffect, useState } from 'react';
import { getActivityTimeline } from '../../../services/backendApi';
import { Calendar, TrendingUp, MessageSquare, Flame, Loader, Clock } from 'lucide-react';

type TimelineEvent = {
  date: string;
  topic: string;
  question_count: number;
  confidence: 'High' | 'Medium' | 'Low';
  improved: boolean;
};

type TimelineData = {
  events: TimelineEvent[];
  active_days_this_week: number;
};

const confStyle: Record<string, { dot: string; badge: string }> = {
  High:   { dot: '🟢', badge: 'bg-green-50 border-green-300 text-green-700' },
  Medium: { dot: '🟡', badge: 'bg-yellow-50 border-yellow-300 text-yellow-700' },
  Low:    { dot: '🔴', badge: 'bg-red-50 border-red-300 text-red-700' },
};

function formatDay(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - d.getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function buildEventLine(ev: TimelineEvent): string {
  const verb = ev.question_count === 1 ? 'question' : 'questions';
  if (ev.improved) {
    return `Asked ${ev.question_count} ${verb} on ${ev.topic} — confidence improved!`;
  }
  return `Asked ${ev.question_count} ${verb} on ${ev.topic}`;
}

function ActiveDaysDots({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: 7 }).map((_, i) => (
        <div
          key={i}
          className={`w-3 h-3 rounded-full border-2 border-black transition-colors ${
            i < count ? 'bg-black' : 'bg-gray-200'
          }`}
        />
      ))}
    </div>
  );
}

// Group events by date for the timeline
function groupByDate(events: TimelineEvent[]): { day: string; items: TimelineEvent[] }[] {
  const map = new Map<string, TimelineEvent[]>();
  for (const ev of events) {
    if (!map.has(ev.date)) map.set(ev.date, []);
    map.get(ev.date)!.push(ev);
  }
  return Array.from(map.entries()).map(([day, items]) => ({ day, items }));
}

export default function ActivityTimeline() {
  const [data, setData] = useState<TimelineData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getActivityTimeline()
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  const groups = data ? groupByDate(data.events) : [];
  const activeDays = data?.active_days_this_week ?? 0;
  const isEmpty = !loading && (!data || data.events.length === 0);

  return (
    <div className="bg-white rounded-4xl border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
      {/* Header */}
      <div className="px-8 py-5 border-b-2 border-black bg-brand-light flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-black rounded-full border-2 border-black flex items-center justify-center shrink-0">
            <Calendar className="h-4 w-4 text-white" />
          </div>
          <h3 className="text-base font-extrabold text-black">📅 Recent Activity</h3>
        </div>

        {/* Active days this week */}
        {!loading && data && (
          <div className="flex items-center gap-3 bg-white border-2 border-black rounded-2xl px-4 py-2.5 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
            <Flame className={`h-4 w-4 shrink-0 ${activeDays >= 5 ? 'text-brand-coral' : activeDays >= 3 ? 'text-yellow-500' : 'text-gray-400'}`} />
            <div>
              <p className="text-xs font-bold text-black leading-none">
                Active {activeDays} day{activeDays !== 1 ? 's' : ''} this week
              </p>
              <div className="mt-1.5">
                <ActiveDaysDots count={activeDays} />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="px-8 py-6">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex gap-4">
                <div className="w-2 flex flex-col items-center">
                  <div className="w-2 h-2 rounded-full bg-gray-200 border border-gray-300 mt-1" />
                  <div className="w-0.5 flex-1 bg-gray-100 mt-1" />
                </div>
                <div className="flex-1 pb-4">
                  <div className="h-4 bg-gray-100 rounded-lg animate-pulse w-24 mb-2" />
                  <div className="h-14 bg-gray-100 rounded-2xl animate-pulse border-2 border-gray-200" />
                </div>
              </div>
            ))}
          </div>
        ) : isEmpty ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-gray-400 gap-3">
            <div className="w-14 h-14 rounded-full bg-gray-100 border-2 border-gray-200 flex items-center justify-center">
              <Clock className="h-7 w-7 text-gray-300" />
            </div>
            <div>
              <p className="font-bold text-sm text-black">No activity yet</p>
              <p className="text-xs font-medium mt-1">Your timeline will fill up as you start asking questions.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {groups.map(({ day, items }, groupIdx) => (
              <div key={day} className="flex gap-4">
                {/* Timeline spine */}
                <div className="w-2 flex flex-col items-center shrink-0 pt-1">
                  <div className="w-2 h-2 rounded-full bg-black border-2 border-black shrink-0" />
                  {groupIdx < groups.length - 1 && (
                    <div className="w-0.5 flex-1 bg-gray-200 mt-1 mb-1" />
                  )}
                </div>

                {/* Day block */}
                <div className="flex-1 pb-5 min-w-0">
                  {/* Day label */}
                  <p className="text-xs font-extrabold text-gray-400 uppercase tracking-widest mb-2">
                    {formatDay(day)}
                  </p>

                  {/* Event cards for this day */}
                  <div className="space-y-2">
                    {items.map((ev, i) => {
                      const cs = confStyle[ev.confidence] ?? confStyle.Medium;
                      return (
                        <div
                          key={i}
                          className="flex items-start gap-3 p-4 rounded-2xl border-2 border-black bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-all"
                        >
                          {/* Icon */}
                          <div className={`w-8 h-8 rounded-full border-2 border-black flex items-center justify-center shrink-0 ${ev.improved ? 'bg-brand-coral' : 'bg-gray-100'}`}>
                            {ev.improved
                              ? <TrendingUp className="h-4 w-4 text-black" />
                              : <MessageSquare className="h-4 w-4 text-black" />
                            }
                          </div>

                          {/* Text */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-black leading-snug">
                              {buildEventLine(ev)}
                            </p>
                            {ev.improved && (
                              <p className="text-xs font-bold text-brand-coral mt-0.5">
                                ↑ Confidence improved on this topic
                              </p>
                            )}
                          </div>

                          {/* Confidence badge */}
                          <span className={`shrink-0 text-xs font-bold border px-2.5 py-1 rounded-full ${cs.badge}`}>
                            {cs.dot} {ev.confidence}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
