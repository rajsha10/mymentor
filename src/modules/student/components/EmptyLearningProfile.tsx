import { MessageSquare, TrendingUp, Trophy, Zap } from 'lucide-react';

const steps = [
  {
    icon: MessageSquare,
    color: 'bg-black',
    iconColor: 'text-white',
    title: 'Ask your first question',
    desc: 'Open any classroom and chat with an AI agent.',
  },
  {
    icon: TrendingUp,
    color: 'bg-[#FF6B57]',
    iconColor: 'text-black',
    title: 'Build your score',
    desc: 'Every answer is tracked — engagement, understanding, consistency.',
  },
  {
    icon: Trophy,
    color: 'bg-yellow-400',
    iconColor: 'text-black',
    title: 'Climb the leaderboard',
    desc: 'See how you rank against your classmates.',
  },
];

type Props = { name?: string };

export default function EmptyLearningProfile({ name }: Props) {
  return (
    <div className="rounded-[2rem] border-2 border-black shadow-[6px_6px_0px_0px_rgba(255,107,87,1)] overflow-hidden">
      {/* Top band */}
      <div className="bg-black px-8 py-6 flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-[#FF6B57] border-2 border-white flex items-center justify-center shrink-0 shadow-[3px_3px_0px_0px_rgba(255,255,255,0.3)]">
          <Zap className="h-6 w-6 text-black" />
        </div>
        <div>
          <p className="text-white text-xl font-extrabold leading-tight">
            {name ? `Hey ${name}, your learning profile is empty.` : 'Your learning profile is empty.'}
          </p>
          <p className="text-gray-400 text-sm font-medium mt-0.5">
            Start asking questions to build your learning profile.
          </p>
        </div>
      </div>

      {/* Steps */}
      <div className="bg-white px-8 py-7">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {steps.map(({ icon: Icon, color, iconColor, title, desc }, i) => (
            <div key={i} className="flex items-start gap-4">
              {/* Step number + icon stack */}
              <div className="relative shrink-0">
                <div className={`w-10 h-10 rounded-full border-2 border-black flex items-center justify-center shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] ${color}`}>
                  <Icon className={`h-5 w-5 ${iconColor}`} />
                </div>
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-white border-2 border-black rounded-full text-[9px] font-extrabold flex items-center justify-center text-black">
                  {i + 1}
                </span>
              </div>
              <div className="min-w-0">
                <p className="font-extrabold text-black text-sm leading-tight">{title}</p>
                <p className="text-xs text-gray-500 font-medium mt-1 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Progress bar — empty state */}
        <div className="mt-7 pt-6 border-t-2 border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-extrabold text-black uppercase tracking-widest">Profile Completion</p>
            <p className="text-xs font-bold text-gray-400">0%</p>
          </div>
          <div className="w-full h-3 bg-gray-100 rounded-full border-2 border-black overflow-hidden">
            <div className="h-full w-0 bg-black rounded-full" />
          </div>
          <p className="text-xs text-gray-400 font-medium mt-2">
            Ask your first question to start filling this in.
          </p>
        </div>
      </div>
    </div>
  );
}
