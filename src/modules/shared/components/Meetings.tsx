import { useState, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { signInWithPopup, linkWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { db, auth, googleProvider } from '../../../config/firebase';
import { useAuth } from '../../../contexts/AuthContext';
import { sendNotification } from '../../../services/notificationService';
import { Video } from 'lucide-react';

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
    <div className="p-6 sm:p-10 flex flex-col items-center justify-center min-h-[500px] bg-white rounded-[2rem] border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] m-6">
      <Video className="h-20 w-20 text-black mb-6" />
      
      {!userData?.googleConnected ? (
        <div className="text-center space-y-6 max-w-md bg-[#FAFAFA] p-8 rounded-[1rem] border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <h3 className="text-2xl font-extrabold text-black">Connect Your Google Account</h3>
          <p className="text-gray-600 font-bold leading-relaxed">To participate in live classes and automatically create meetings, you need to connect your Google account first.</p>
          <button
            onClick={handleConnectGoogle}
            disabled={loading}
            className="w-full inline-flex justify-center items-center px-8 py-4 bg-white text-black text-lg font-extrabold rounded-full border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50 transition-all"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-6 h-6 mr-3" />
            Connect Google
          </button>
        </div>
      ) : (
        <>
          {classroom.meetingActive ? (
            <div className="text-center space-y-8 w-full max-w-lg bg-[#FAFAFA] p-10 rounded-[1.5rem] border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <div>
                <h3 className="text-3xl font-black text-black mb-4 uppercase tracking-wider">Meeting is Live!</h3>
                <div className="text-5xl font-extrabold text-black bg-[#FF6B57] py-4 px-8 rounded-[1rem] inline-block border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  {timer}
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 justify-center mt-6">
                <a
                  href={classroom.meetingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex justify-center items-center px-8 py-4 text-black bg-[#FF6B57] text-lg font-extrabold rounded-full border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
                >
                  Join Meeting
                </a>
                
                {isTeacher && (
                  <button
                    onClick={handleEndMeeting}
                    disabled={loading}
                    className="inline-flex justify-center items-center px-8 py-4 text-white bg-black text-lg font-extrabold rounded-full border-2 border-black shadow-[2px_2px_0px_0px_rgba(255,107,87,1)] hover:bg-gray-800 transition-all disabled:opacity-50"
                  >
                    End Meeting
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center w-full max-w-md bg-[#FAFAFA] p-10 rounded-[1.5rem] border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <h3 className="text-2xl font-extrabold text-black mb-4">No Active Meeting</h3>
              <p className="text-gray-500 font-bold text-lg mb-8">The instructor hasn't started a live session yet.</p>
              
              {isTeacher && (
                <button
                  onClick={handleStartMeeting}
                  disabled={loading}
                  className="w-full inline-flex justify-center items-center px-8 py-4 text-white bg-black text-lg font-extrabold rounded-full border-2 border-black shadow-[4px_4px_0px_0px_rgba(255,107,87,1)] hover:-translate-y-1 transition-all disabled:opacity-50"
                >
                  <Video className="w-6 h-6 mr-3" />
                  Start Live Meeting
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
