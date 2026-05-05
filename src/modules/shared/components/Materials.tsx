import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { useAuth } from '../../../contexts/AuthContext';
import { uploadFile } from '../../../services/storageService';
import { sendNotification } from '../../../services/notificationService';
import { format } from 'date-fns';
import { FileText, Image, Video, Link as LinkIcon, File, Trash2, Download, ExternalLink, Bot, ChevronDown, Plus, Clock, Loader } from 'lucide-react';
import { deleteDoc, doc } from 'firebase/firestore';
import { downloadFile, openFile } from '../../../utils/downloadHelper';
import AddToAgentModal from './AddToAgentModal';

export default function Materials({ classroomId, isTeacher }: { classroomId: string, isTeacher: boolean }) {
  const { user, userData } = useAuth();
  const [materials, setMaterials] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [link, setLink] = useState('');
  const [type, setType] = useState('pdf');
  const [loading, setLoading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [agentModal, setAgentModal] = useState<{ title: string; url: string } | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, `classrooms/${classroomId}/materials`),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const mats = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMaterials(mats);
    });

    return () => unsubscribe();
  }, [classroomId]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !user) return;
    if (type !== 'link' && !file) return;
    if (type === 'link' && !link.trim()) return;

    setLoading(true);
    try {
      let cloudinaryUrl = '';

      if (type !== 'link' && file) {
        cloudinaryUrl = await uploadFile(file, 'materials');
      } else {
        cloudinaryUrl = link;
      }

      await addDoc(collection(db, `classrooms/${classroomId}/materials`), {
        title,
        type,
        cloudinaryUrl,
        uploadedBy: user.uid,
        uploaderName: userData?.name || 'Teacher',
        timestamp: serverTimestamp()
      });

      // Send Notification
      await sendNotification(
        classroomId,
        'New Material Uploaded',
        `${userData?.name || 'Teacher'} uploaded a new ${type}: ${title}`,
        'material_uploaded'
      );

      setTitle('');
      setFile(null);
      setLink('');
      setShowUpload(false);
    } catch (error) {
      console.error("Error uploading material:", error);
      alert("Failed to upload material. Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (matId: string) => {
    if (!window.confirm("Are you sure you want to delete this material?")) return;
    try {
      await deleteDoc(doc(db, `classrooms/${classroomId}/materials`, matId));
    } catch (error) {
      console.error("Error deleting material:", error);
      alert("Failed to delete material.");
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'pdf': return <FileText className="h-8 w-8 text-red-500" />;
      case 'image': return <Image className="h-8 w-8 text-blue-500" />;
      case 'video': return <Video className="h-8 w-8 text-purple-500" />;
      case 'link': return <LinkIcon className="h-8 w-8 text-green-500" />;
      default: return <File className="h-8 w-8 text-gray-500" />;
    }
  };

  return (
    <div className="p-4 sm:p-8 lg:p-12 space-y-10">
      {isTeacher && (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 bg-white p-6 sm:p-8 rounded-[2.5rem] border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center shadow-[3px_3px_0px_0px_rgba(255,107,87,1)]">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-xl sm:text-2xl lg:text-3xl font-black text-black uppercase tracking-tight">Course Materials</h3>
          </div>
          <button
            onClick={() => setShowUpload(!showUpload)}
            className={`w-full sm:w-auto px-8 py-4 rounded-2xl font-black uppercase tracking-widest border-4 border-black transition-all shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1 ${
              showUpload ? 'bg-white text-black' : 'bg-black text-white hover:bg-gray-800 shadow-[6px_6px_0px_0px_rgba(255,107,87,1)]'
            }`}
          >
            {showUpload ? 'Close Upload' : 'Upload Material'}
          </button>
        </div>
      )}

      {showUpload && isTeacher && (
        <div className="bg-[#FAFAFA] p-6 sm:p-10 rounded-[3rem] border-4 border-black shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] animate-in slide-in-from-top-4 duration-300">
          <form onSubmit={handleUpload} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="block text-xs font-black text-black uppercase tracking-[0.2em] ml-2">Title</label>
                <input
                  type="text"
                  required
                  className="w-full px-6 py-5 border-4 border-black rounded-[1.5rem] focus:outline-none focus:ring-0 focus:border-[#FF6B57] transition-all bg-white font-black text-lg placeholder-gray-300 shadow-inner"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Quantum Mechanics Notes"
                />
              </div>
              <div className="space-y-3">
                <label className="block text-xs font-black text-black uppercase tracking-[0.2em] ml-2">Type</label>
                <div className="relative">
                  <select
                    className="w-full px-6 py-5 border-4 border-black rounded-[1.5rem] focus:outline-none focus:ring-0 focus:border-[#FF6B57] transition-all bg-white font-black text-lg appearance-none cursor-pointer"
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                  >
                    <option value="pdf">PDF Document</option>
                    <option value="link">Study Link / URL</option>
                  </select>
                  <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 h-6 w-6 pointer-events-none" />
                </div>
              </div>
            </div>

            {type === 'link' ? (
              <div className="space-y-3">
                <label className="block text-xs font-black text-black uppercase tracking-[0.2em] ml-2">Link URL</label>
                <div className="relative group">
                  <LinkIcon className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-[#FF6B57]" />
                  <input
                    type="url"
                    required
                    className="w-full pl-16 pr-6 py-5 border-4 border-black rounded-[1.5rem] focus:outline-none focus:ring-0 focus:border-[#FF6B57] transition-all bg-white font-black text-lg shadow-inner"
                    value={link}
                    onChange={(e) => setLink(e.target.value)}
                    placeholder="https://example.com/notes"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <label className="block text-xs font-black text-black uppercase tracking-[0.2em] ml-2">File (PDF Only)</label>
                <div className="group relative">
                  <div className="absolute inset-0 bg-[#FF6B57] rounded-[1.5rem] border-4 border-black translate-x-1 translate-y-1 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
                  <input
                    type="file"
                    accept=".pdf"
                    required
                    className="w-full relative z-10 block text-sm text-black border-4 border-black rounded-[1.5rem] bg-white px-6 py-5 file:mr-6 file:py-2.5 file:px-6 file:rounded-xl file:border-2 file:border-black file:text-xs file:font-black file:bg-[#FF6B57] file:text-black file:uppercase file:tracking-widest hover:file:bg-black hover:file:text-white transition-all cursor-pointer"
                    onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={loading}
                className="group flex items-center gap-3 bg-[#FF6B57] text-black px-12 py-5 rounded-2xl font-black uppercase tracking-widest border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:bg-[#FF8A7A] focus:outline-none transition-all active:shadow-none active:translate-x-1 active:translate-y-1 disabled:opacity-50"
              >
                {loading ? <Loader className="h-6 w-6 animate-spin" /> : <Plus className="h-6 w-6" />}
                <span>{loading ? 'Processing...' : 'Add Material'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8 sm:gap-10">
        {materials.length === 0 ? (
          <div className="col-span-full text-center py-24 bg-white rounded-[3rem] border-4 border-black border-dashed opacity-60">
             <div className="w-24 h-24 bg-gray-50 border-4 border-dashed border-black/10 rounded-full flex items-center justify-center mx-auto mb-8">
               <File className="h-12 w-12 text-gray-300" />
             </div>
             <p className="text-2xl font-black text-black uppercase tracking-tight mb-2">No materials available</p>
             <p className="text-gray-400 font-bold uppercase tracking-wide text-sm">Course resources will appear here once uploaded.</p>
          </div>
        ) : (
          materials.map((mat) => {
            const finalUrl = mat.cloudinaryUrl;

            return (
              <div key={mat.id} className="group relative bg-white rounded-[2.5rem] border-4 border-black shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-2 hover:shadow-[14px_14px_0px_0px_rgba(0,0,0,1)] transition-all duration-300 overflow-hidden flex flex-col">
                
                {/* Delete button (Teacher only) */}
                {isTeacher && (
                  <div className="absolute top-6 right-6 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleDelete(mat.id)}
                      className="w-10 h-10 bg-red-500 text-white rounded-xl border-2 border-black flex items-center justify-center hover:bg-black transition-colors shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                      title="Delete Material"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                )}

                {/* Card Content */}
                <div
                  onClick={() => openFile(finalUrl)}
                  className="p-8 cursor-pointer flex-1 flex flex-col"
                >
                  <div className="flex items-start justify-between mb-8">
                    <div className="w-16 h-16 rounded-[1.25rem] border-4 border-black bg-gray-50 flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] group-hover:bg-[#FF6B57]/10 transition-colors">
                      {getIcon(mat.type)}
                    </div>
                    <span className="text-[10px] font-black px-4 py-2 rounded-full uppercase tracking-[0.2em] border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] bg-[#FF6B57] text-black">
                      {mat.type}
                    </span>
                  </div>

                  <h4 className="text-xl sm:text-2xl font-black text-black group-hover:text-[#FF6B57] transition-colors leading-tight uppercase tracking-tight line-clamp-2 mb-3">
                    {mat.title}
                  </h4>
                  <div className="flex items-center gap-2 mt-auto">
                    <Clock className="h-3.5 w-3.5 text-[#FF6B57]" />
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em]">
                      {mat.timestamp?.toDate ? format(mat.timestamp.toDate(), 'MMMM d, yyyy') : 'Just Added'}
                    </p>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="px-8 py-6 bg-gray-50/50 border-t-4 border-black flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center shrink-0 shadow-[2px_2px_0px_0px_rgba(255,107,87,1)]">
                       <span className="text-white text-[10px] font-black">{mat.uploaderName?.[0] || 'I'}</span>
                    </div>
                    <span className="text-[10px] font-black text-black uppercase tracking-widest truncate">{mat.uploaderName || 'Instructor'}</span>
                  </div>
                  
                  <div className="flex items-center gap-2.5">
                    {isTeacher && mat.type === 'pdf' && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setAgentModal({ title: mat.title, url: finalUrl });
                        }}
                        className="w-10 h-10 bg-white text-black rounded-xl border-2 border-black flex items-center justify-center hover:bg-[#FF6B57] transition-all shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-0.5 active:translate-y-0.5"
                        title="Add to AI Agent"
                      >
                        <Bot className="h-5 w-5" />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        openFile(finalUrl);
                      }}
                      className="w-10 h-10 bg-white text-black rounded-xl border-2 border-black flex items-center justify-center hover:bg-gray-100 transition-all shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-0.5 active:translate-y-0.5"
                      title="View Document"
                    >
                      <ExternalLink className="h-5 w-5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        downloadFile(finalUrl, mat.title || 'material');
                      }}
                      className="w-10 h-10 bg-black text-white rounded-xl border-2 border-black flex items-center justify-center hover:bg-gray-800 transition-all shadow-[3px_3px_0px_0px_rgba(255,107,87,1)] active:shadow-none active:translate-x-0.5 active:translate-y-0.5"
                      title="Download"
                    >
                      <Download className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {agentModal && (
        <AddToAgentModal
          materialTitle={agentModal.title}
          fileUrl={agentModal.url}
          onClose={() => setAgentModal(null)}
        />
      )}
    </div>
  );
}
