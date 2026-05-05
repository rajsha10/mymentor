import { useState, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { db, auth, googleProvider } from '../../../config/firebase';
import { useAuth } from '../../../contexts/AuthContext';
import { sendNotification } from '../../../services/notificationService';
import { Video, Loader } from 'lucide-react';

export default function Meetings({ classroom, isTeacher }: { classroom: any, isTeacher: boolean }) {
  const { user, userData } = useAuth();
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState('00:00:00');

  // Timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (classroom.meetingActive && classroom.meetingStartTime) {
      interval = setInterval(() => {
        const start = new Date(classroom.meetingStartTime).getTime();
        const now = new Date().getTime();
        const diff = now - start;
        
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        setTimer(
          `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        );
      }, 1000);
    } else {
      setTimer('00:00:00');
    }

    return () => clearInterval(interval);
  }, [classroom.meetingActive, classroom.meetingStartTime]);

  const [googleToken, setGoogleToken] = useState<string | null>(null);

  // Sync google connection status if provider matches
  useEffect(() => {
    if (user && !userData?.googleConnected) {
      const isLinked = user.providerData.some(p => p.providerId === 'google.com');
      if (isLinked) {
        updateDoc(doc(db, 'users', user.uid), { googleConnected: true });
      }
    }
  }, [user, userData?.googleConnected]);

  const handleConnectGoogle = async () => {
    try {
      setLoading(true);
      const result = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken;
      
      if (token) {
        setGoogleToken(token);
      }
      
      if (user) {
        await updateDoc(doc(db, 'users', user.uid), {
          googleConnected: true
        });
      }
    } catch (error) {
      console.error("Error connecting Google:", error);
      alert("Failed to connect Google account.");
    } finally {
      setLoading(false);
    }
  };

  const handleStartMeeting = async () => {
    try {
      setLoading(true);
      
      let token = googleToken;

      // 1. Get/Refresh Google Access Token (Only if not already in state)
      if (!token) {
        // Trigger popup only once to get the token, then we reuse it
        const result = await signInWithPopup(auth, googleProvider);
        const credential = GoogleAuthProvider.credentialFromResult(result);
        token = credential?.accessToken || null;
        
        if (token) {
          setGoogleToken(token);
        }
      }

      if (!token) {
        throw new Error("Failed to get Google Access Token. Please make sure Google is connected.");
      }

      // 2. Create Meeting via Google Calendar API
      const event = {
        summary: `Classroom Meeting: ${classroom.name}`,
        description: `Live class for ${classroom.name} on MyMentor platform.`,
        start: {
          dateTime: new Date().toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        end: {
          dateTime: new Date(Date.now() + 3600000).toISOString(), // 1 hour duration
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        conferenceData: {
          createRequest: {
            requestId: Math.random().toString(36).substring(2, 12),
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        },
      };

      const response = await fetch(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(event),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Google Calendar API Error:", errorData);
        throw new Error(`Google Calendar API Error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const meetingLink = data.hangoutLink;

      if (!meetingLink) {
        throw new Error("Failed to generate Google Meet link. Make sure Google Calendar API is enabled and scopes are granted.");
      }

      // 3. Update Firestore
      await updateDoc(doc(db, 'classrooms', classroom.id), {
        meetingActive: true,
        meetingLink: meetingLink,
        meetingStartTime: new Date().toISOString()
      });

      // 4. Notify Students
      await sendNotification(
        classroom.id,
        'Live Class Started',
        `Teacher started a meeting: ${meetingLink}`,
        'meeting_started'
      );

      // 5. Open in new tab for teacher
      window.open(meetingLink, '_blank');

    } catch (error: any) {
      console.error("Error starting meeting:", error);
      
      // Check if it's the "API not enabled" error
      if (error.message?.includes("not been used") || error.message?.includes("disabled")) {
        const confirmEnable = window.confirm(
          "Google Calendar API is not enabled for your project. You need to enable it in the Google Cloud Console for automatic meeting creation to work.\n\nWould you like to open the console now?"
        );
        if (confirmEnable) {
          window.open(`https://console.developers.google.com/apis/api/calendar-json.googleapis.com/overview?project=${classroom.classroomId || '403788837753'}`, '_blank');
        }
      } else {
        alert(error.message || "Failed to start meeting. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEndMeeting = async () => {
    try {
      setLoading(true);
      await updateDoc(doc(db, 'classrooms', classroom.id), {
        meetingActive: false,
        meetingLink: '',
        meetingStartTime: null
      });
    } catch (error) {
      console.error("Error ending meeting:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 min-h-[400px] flex items-center justify-center">
      <div className="w-full max-w-lg bg-white rounded-2xl border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6 sm:p-8 relative overflow-hidden flex flex-col items-center">

        {/* Decorative background icon */}
        <div className="absolute -top-4 -right-4 opacity-5 pointer-events-none rotate-12">
          <Video className="h-28 w-28" />
        </div>

        <div className="w-14 h-14 bg-[#FF6B57]/10 rounded-2xl border-2 border-black flex items-center justify-center mb-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] relative z-10">
          <Video className="h-7 w-7 text-black" />
        </div>

        {!userData?.googleConnected ? (
          <div className="text-center space-y-5 relative z-10 w-full">
            <div>
              <h3 className="text-xl sm:text-2xl font-black text-black uppercase tracking-tight mb-2 leading-none">Connect Google</h3>
              <p className="text-gray-400 font-bold text-xs sm:text-sm leading-relaxed max-w-sm mx-auto uppercase tracking-wide">
                To create and join live meetings automatically, please connect your Google account.
              </p>
            </div>

            <button
              onClick={handleConnectGoogle}
              disabled={loading}
              className="group w-full inline-flex justify-center items-center gap-3 px-6 py-3 bg-white text-black text-sm font-black uppercase tracking-widest rounded-xl border-2 border-black shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] disabled:opacity-30 transition-all active:shadow-none active:translate-x-0.5 active:translate-y-0.5"
            >
              {loading ? (
                <Loader className="h-4 w-4 animate-spin" />
              ) : (
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="" className="w-4 h-4 group-hover:scale-110 transition-transform" />
              )}
              <span>{loading ? 'CONNECTING...' : 'CONNECT ACCOUNT'}</span>
            </button>
          </div>
        ) : (
          <div className="w-full relative z-10">
            {classroom.meetingActive ? (
              <div className="text-center space-y-5 animate-in fade-in duration-500">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#FF6B57] text-black border-2 border-black rounded-full text-[9px] font-black uppercase tracking-widest shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] animate-pulse">
                  <div className="w-1.5 h-1.5 bg-black rounded-full" />
                  Session Active
                </div>

                <div>
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.3em] mb-2">Duration</h3>
                  <div className="text-3xl sm:text-4xl font-black text-black bg-gray-50 py-4 px-8 rounded-2xl border-2 border-black shadow-[6px_6px_0px_0px_rgba(255,107,87,1)] inline-block tabular-nums">
                    {timer}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <a
                    href={classroom.meetingLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex justify-center items-center px-6 py-3 text-black bg-[#FF6B57] text-xs font-black uppercase tracking-widest rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all active:shadow-none active:translate-x-0.5 active:translate-y-0.5"
                  >
                    JOIN SESSION NOW
                  </a>

                  {isTeacher && (
                    <button
                      onClick={handleEndMeeting}
                      disabled={loading}
                      className="flex-1 inline-flex justify-center items-center px-6 py-3 text-white bg-black text-xs font-black uppercase tracking-widest rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(255,107,87,1)] hover:bg-red-600 transition-all disabled:opacity-30 active:shadow-none active:translate-x-0.5 active:translate-y-0.5"
                    >
                      {loading ? <Loader className="h-4 w-4 animate-spin" /> : 'END MEETING'}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center space-y-5">
                <div>
                  <h3 className="text-xl font-black text-black uppercase tracking-tight mb-2">No Active Meeting</h3>
                  <p className="text-gray-400 font-bold uppercase tracking-widest text-xs max-w-xs mx-auto">
                    The instructor hasn't started a live session yet. Check back soon!
                  </p>
                </div>

                {isTeacher && (
                  <button
                    onClick={handleStartMeeting}
                    disabled={loading}
                    className="w-full inline-flex justify-center items-center gap-3 px-6 py-3 bg-[#FF6B57] text-black text-sm font-black uppercase tracking-widest rounded-xl border-2 border-black shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] disabled:opacity-30 transition-all active:shadow-none active:translate-x-0.5 active:translate-y-0.5"
                  >
                    {loading ? (
                      <Loader className="h-4 w-4 animate-spin" />
                    ) : (
                      <Video className="w-4 h-4" />
                    )}
                    <span>{loading ? 'PREPARING...' : 'START LIVE CLASS'}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
