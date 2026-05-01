import React, { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { useAuth } from '../../../contexts/AuthContext';

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
    <div className="flex flex-col h-[600px] border-2 border-black rounded-[2rem] bg-[#FAFAFA] shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] m-4 sm:m-8 overflow-hidden">
      <div className="bg-white p-6 border-b-2 border-black flex justify-between items-center">
        <h3 className="text-2xl font-black text-black">Class Chat</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-10 font-bold uppercase tracking-wider">No messages yet. Start the conversation!</div>
        ) : (
          messages.map((msg, index) => {
            const isMe = msg.senderId === user?.uid;
            
            // Check if the previous message was from the same sender to group them visually (optional enhancement for space, but skipping to keep simple)
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] sm:max-w-[70%] border-2 border-black px-6 py-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${
                  isMe 
                    ? 'bg-[#FF6B57] text-black rounded-[2rem] rounded-br-none' 
                    : 'bg-white text-black rounded-[2rem] rounded-bl-none'
                }`}>
                  {!isMe && <p className="text-xs font-black text-gray-500 mb-2 uppercase tracking-widest">{msg.senderName}</p>}
                  <p className="text-base font-bold whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="p-4 bg-white border-t-2 border-black">
        <form onSubmit={handleSend} className="flex space-x-3 max-w-4xl mx-auto">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 border-2 border-black rounded-full px-6 py-4 focus:outline-none focus:ring-0 focus:border-[#FF6B57] bg-[#FAFAFA] text-lg font-bold transition-colors"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="bg-black text-white rounded-full px-8 py-4 font-black border-2 border-black shadow-[4px_4px_0px_0px_rgba(255,107,87,1)] hover:bg-gray-800 focus:outline-none transition-all disabled:opacity-50 uppercase tracking-widest text-sm active:scale-95 transform"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
