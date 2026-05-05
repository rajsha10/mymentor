import React, { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { useAuth } from '../../../contexts/AuthContext';
import { MessageSquare, Send } from 'lucide-react';
import { format } from 'date-fns';

export default function GroupChat({ classroomId }: { classroomId: string }) {
  const { user, userData } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query(
      collection(db, `classrooms/${classroomId}/messages`),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMessages(msgs);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    });

    return () => unsubscribe();
  }, [classroomId]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    try {
      await addDoc(collection(db, `classrooms/${classroomId}/messages`), {
        text: newMessage,
        senderId: user.uid,
        senderName: userData?.name || 'Unknown User',
        timestamp: serverTimestamp()
      });
      setNewMessage('');
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  return (
    <div className="flex flex-col h-[560px] border-2 border-black rounded-2xl bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] m-3 sm:m-4 overflow-hidden animate-in fade-in duration-500">

      {/* Chat Header */}
      <div className="bg-[#FF6B57] px-4 py-3 border-b-2 border-black flex justify-between items-center relative overflow-hidden shrink-0">
        <div className="absolute top-0 right-0 p-2 opacity-10 pointer-events-none rotate-12 translate-x-4">
          <MessageSquare className="h-14 w-14" />
        </div>
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-8 h-8 bg-black rounded-xl flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">
            <MessageSquare className="h-4 w-4 text-[#FF6B57]" />
          </div>
          <div>
            <h3 className="text-sm font-black text-black uppercase tracking-tight">Class Discussion</h3>
            <p className="text-[9px] font-black text-black/60 uppercase tracking-widest">Real-time collaborative chat</p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-[#FAFAFA] custom-scrollbar">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full opacity-30 select-none">
            <div className="w-14 h-14 bg-gray-200 border-2 border-dashed border-black/10 rounded-full flex items-center justify-center mb-3">
              <Send className="h-7 w-7 text-gray-400" />
            </div>
            <p className="text-sm font-black text-black uppercase tracking-widest text-center max-w-xs">Start the conversation with your classmates!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === user?.uid;
            return (
              <div key={msg.id} className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}>
                {!isMe && (
                  <div className="w-7 h-7 rounded-lg border-2 border-black bg-[#FF6B57] flex items-center justify-center text-black font-black text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] shrink-0 mb-1">
                    {msg.senderName?.[0]?.toUpperCase()}
                  </div>
                )}
                <div className={`max-w-[85%] sm:max-w-[70%] border-2 border-black px-4 py-2.5 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] relative transition-transform hover:-translate-y-0.5 ${
                  isMe
                    ? 'bg-[#FF6B57] text-black rounded-2xl rounded-br-sm'
                    : 'bg-white text-black rounded-2xl rounded-bl-sm'
                }`}>
                  {!isMe && (
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{msg.senderName}</span>
                      <div className="w-1 h-1 rounded-full bg-gray-200" />
                      <span className="text-[8px] font-black text-gray-300 uppercase tracking-widest">
                        {msg.timestamp?.toDate ? format(msg.timestamp.toDate(), 'p') : 'NOW'}
                      </span>
                    </div>
                  )}
                  <p className="text-xs font-bold whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                  {isMe && (
                    <p className="text-[8px] font-black text-black/30 uppercase tracking-widest mt-1 text-right">
                      {msg.timestamp?.toDate ? format(msg.timestamp.toDate(), 'p') : 'NOW'}
                    </p>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="px-4 py-3 bg-white border-t-2 border-black shrink-0">
        <form onSubmit={handleSend}>
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-[#FF6B57] rounded-full blur opacity-0 group-focus-within:opacity-20 transition duration-500" />
            <div className="relative flex items-center gap-2 bg-[#FAFAFA] border-2 border-black rounded-full p-1.5 pl-4 transition-all focus-within:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus-within:bg-white">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message to the class..."
                className="flex-1 bg-transparent border-none focus:ring-0 text-black text-sm font-bold placeholder-gray-300 py-1.5"
              />
              <button
                type="submit"
                disabled={!newMessage.trim()}
                className="bg-black text-white w-9 h-9 rounded-full flex items-center justify-center border-2 border-black shadow-[3px_3px_0px_0px_rgba(255,107,87,1)] hover:bg-[#FF6B57] hover:text-black transition-all disabled:opacity-20 active:shadow-none active:translate-x-0.5 active:translate-y-0.5 shrink-0"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1.5 text-center">Press Enter to send</p>
        </form>
      </div>
    </div>
  );
}
