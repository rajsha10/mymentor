import { useState, useEffect } from 'react';
import { getClassroomLeaderboard } from '../../../services/backendApi';
import { Trophy, Flame, TrendingUp, Loader, ChevronDown, Medal } from 'lucide-react';

type Student = { uid: string; name: string };
type Classroom = { id: string; name: string; subject?: string; students?: Student[] };

type Entry = {
  user_id: string;
  name: string;
  final: number;
  engagement: number;
  understanding: number;
  consistency: number;
  isCurrentUser: boolean;
  badge: 'fire' | 'consistent' | null;
};

function scoreColor(score: number): { dot: string; text: string; ring: string } {
  if (score >= 8) return { dot: '🟢', text: 'text-green-600', ring: 'ring-green-400' };
  if (score >= 5) return { dot: '🟡', text: 'text-yellow-600', ring: 'ring-yellow-400' };
  return              { dot: '🔴', text: 'text-red-500',   ring: 'ring-red-400' };
}

function rankStyle(rank: number) {
  if (rank === 1) return { bg: 'bg-yellow-400', border: 'border-yellow-500', icon: '🥇', shadow: 'shadow-[4px_4px_0px_0px_rgba(202,138,4,1)]' };
  if (rank === 2) return { bg: 'bg-gray-300',   border: 'border-gray-400',   icon: '🥈', shadow: 'shadow-[4px_4px_0px_0px_rgba(156,163,175,1)]' };
  if (rank === 3) return { bg: 'bg-orange-300', border: 'border-orange-400', icon: '🥉', shadow: 'shadow-[4px_4px_0px_0px_rgba(249,115,22,1)]' };
  return            { bg: 'bg-white',          border: 'border-black',       icon: null,  shadow: 'shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' };
}

function Badge({ type }: { type: 'fire' | 'consistent' }) {
  if (type === 'fire') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#FF6B57] border-2 border-black rounded-full text-xs font-extrabold text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
        <Flame className="h-3 w-3" /> Improving
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-black border-2 border-black rounded-full text-xs font-extrabold text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
      <TrendingUp className="h-3 w-3" /> Consistent
    </span>
  );
}

function assignBadge(entry: { engagement: number; consistency: number; understanding: number }): 'fire' | 'consistent' | null {
  if (entry.engagement >= 7 && entry.understanding < entry.engagement) return 'fire';      // asking a lot → improving
  if (entry.consistency >= 7) return 'consistent';
  return null;
}

type Props = {
  classrooms: Classroom[];
  currentUserId: string;
};

export default function Leaderboard({ classrooms, currentUserId }: Props) {
  const [selectedId, setSelectedId] = useState<string>(classrooms[0]?.id ?? '');
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const selectedClassroom = classrooms.find(c => c.id === selectedId);

  useEffect(() => {
    if (!selectedId || !selectedClassroom) return;

    const students = selectedClassroom.students ?? [];
    if (students.length === 0) {
      setEntries([]);
      return;
    }

    setLoading(true);
    setError('');
    setEntries([]);

    const uids = students.map(s => s.uid);

    getClassroomLeaderboard(selectedId, uids)
      .then(data => {
        // Merge backend scores with Firestore student names
        const nameMap = Object.fromEntries(students.map(s => [s.uid, s.name]));
        const merged: Entry[] = data.entries.map(e => ({
          ...e,
          name: nameMap[e.user_id] ?? 'Student',
          isCurrentUser: e.user_id === currentUserId,
          badge: assignBadge(e),
        }));
        setEntries(merged);
      })
      .catch(err => setError(err.message || 'Failed to load leaderboard.'))
      .finally(() => setLoading(false));
  }, [selectedId]);

  const topThree = entries.slice(0, 3);
  const rest = entries.slice(3);

  return (
    <div className="space-y-6">
      {/* Header + classroom picker */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-yellow-400 rounded-full border-2 border-black flex items-center justify-center shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
            <Trophy className="h-5 w-5 text-black" />
          </div>
          <div>
            <h2 className="text-3xl font-extrabold text-black leading-none">🏆 Leaderboard</h2>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Class Rankings</p>
          </div>
        </div>

        {/* Classroom selector */}
        {classrooms.length > 1 && (
          <div className="relative">
            <select
              value={selectedId}
              onChange={e => setSelectedId(e.target.value)}
              className="appearance-none bg-white border-2 border-black rounded-full px-5 py-2.5 pr-10 text-sm font-bold text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] cursor-pointer focus:outline-none"
            >
              {classrooms.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-black pointer-events-none" />
          </div>
        )}
      </div>

      {/* Classroom context pill */}
      {selectedClassroom && (
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white rounded-full text-xs font-bold border-2 border-black">
          <Medal className="h-3.5 w-3.5" />
          {selectedClassroom.name}
          {selectedClassroom.subject && <span className="text-gray-400">· {selectedClassroom.subject}</span>}
          <span className="text-gray-400">· {selectedClassroom.students?.length ?? 0} students</span>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-gray-400">
          <Loader className="h-8 w-8 animate-spin text-black" />
          <p className="font-bold text-sm">Crunching the scores…</p>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="bg-red-50 border-2 border-red-300 rounded-2xl px-6 py-4 text-red-600 font-bold text-sm">
          {error}
        </div>
      )}

      {/* Empty */}
      {!loading && !error && entries.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 border-2 border-black flex items-center justify-center">
            <Trophy className="h-8 w-8 text-gray-300" />
          </div>
          <div>
            <p className="font-extrabold text-black text-lg">No data yet</p>
            <p className="text-gray-500 text-sm font-medium mt-1">Students need to chat with agents before scores appear.</p>
          </div>
        </div>
      )}

      {/* Podium — top 3 */}
      {!loading && !error && topThree.length > 0 && (
        <>
          <div className="grid grid-cols-3 gap-4 items-end">
            {/* Arrange: 2nd | 1st | 3rd */}
            {[topThree[1], topThree[0], topThree[2]].map((entry, podiumIdx) => {
              if (!entry) return <div key={podiumIdx} />;
              const rank = podiumIdx === 0 ? 2 : podiumIdx === 1 ? 1 : 3;
              const rs = rankStyle(rank);
              const sc = scoreColor(entry.final);
              const heightClass = rank === 1 ? 'h-28' : rank === 2 ? 'h-20' : 'h-16';

              return (
                <div key={entry.user_id} className="flex flex-col items-center gap-2">
                  {/* Name + badge */}
                  <div className="text-center">
                    <p className={`text-xs font-extrabold truncate max-w-[80px] ${entry.isCurrentUser ? 'text-[#FF6B57]' : 'text-black'}`}>
                      {entry.isCurrentUser ? 'You' : entry.name.split(' ')[0]}
                    </p>
                    {entry.badge && (
                      <div className="mt-1">
                        <Badge type={entry.badge} />
                      </div>
                    )}
                  </div>

                  {/* Score bubble */}
                  <div className={`w-14 h-14 rounded-full border-2 border-black flex items-center justify-center font-extrabold text-sm ${entry.isCurrentUser ? 'ring-4 ring-offset-1 ' + sc.ring : ''} bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]`}>
                    {entry.final}
                  </div>

                  {/* Podium block */}
                  <div className={`w-full ${heightClass} ${rs.bg} border-2 ${rs.border} rounded-t-2xl flex flex-col items-center justify-center ${rs.shadow}`}>
                    <span className="text-2xl">{rs.icon ?? `#${rank}`}</span>
                    <span className="text-xs font-extrabold text-black mt-0.5">{sc.dot}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Rest of the list */}
          {rest.length > 0 && (
            <div className="space-y-3 mt-2">
              {rest.map((entry, i) => {
                const rank = i + 4;
                const sc = scoreColor(entry.final);
                return (
                  <div
                    key={entry.user_id}
                    className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${
                      entry.isCurrentUser
                        ? 'border-[#FF6B57] bg-[#FFF0EE] shadow-[4px_4px_0px_0px_rgba(255,107,87,1)]'
                        : 'border-black bg-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]'
                    }`}
                  >
                    {/* Rank number */}
                    <span className="w-7 text-center font-extrabold text-lg text-gray-400 shrink-0">#{rank}</span>

                    {/* Avatar initial */}
                    <div className={`w-9 h-9 rounded-full border-2 border-black flex items-center justify-center font-extrabold text-sm shrink-0 ${entry.isCurrentUser ? 'bg-[#FF6B57] text-black' : 'bg-gray-100 text-black'}`}>
                      {entry.name[0]?.toUpperCase()}
                    </div>

                    {/* Name + badge */}
                    <div className="flex-1 min-w-0">
                      <p className={`font-extrabold text-sm truncate ${entry.isCurrentUser ? 'text-[#FF6B57]' : 'text-black'}`}>
                        {entry.isCurrentUser ? `${entry.name} (You)` : entry.name}
                      </p>
                      {entry.badge && (
                        <div className="mt-1">
                          <Badge type={entry.badge} />
                        </div>
                      )}
                    </div>

                    {/* Score */}
                    <div className="text-right shrink-0">
                      <p className={`text-xl font-extrabold ${sc.text}`}>{entry.final}</p>
                      <p className="text-xs text-gray-400 font-bold">/ 10 {sc.dot}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Current user callout — if not in visible entries */}
          {!entries.some(e => e.isCurrentUser) && (
            <div className="border-2 border-dashed border-[#FF6B57] rounded-2xl px-6 py-4 text-center">
              <p className="text-sm font-bold text-[#FF6B57]">You haven't interacted with this classroom's agents yet — start chatting to get ranked!</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
