import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { useAuth } from '../../../contexts/AuthContext';
import { uploadFile } from '../../../services/storageService';
import { sendNotification } from '../../../services/notificationService';
import { format } from 'date-fns';
import { FileText, Image, Video, Link as LinkIcon, File, Trash2, Download, ExternalLink, Bot } from 'lucide-react';
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
    <div className="p-6 sm:p-10 space-y-8">
      {isTeacher && (
        <div className="flex justify-between items-center bg-white p-6 rounded-[2rem] border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <h3 className="text-2xl font-extrabold text-black">Course Materials</h3>
          <button
            onClick={() => setShowUpload(!showUpload)}
            className="bg-black text-white px-8 py-3 rounded-full font-bold hover:bg-gray-800 transition-colors shadow-[2px_2px_0px_0px_rgba(255,107,87,1)]"
          >
            {showUpload ? 'Cancel' : 'Upload Material'}
          </button>
        </div>
      )}

      {showUpload && isTeacher && (
        <div className="bg-[#FAFAFA] p-8 rounded-[2rem] border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          <form onSubmit={handleUpload} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-bold text-black uppercase tracking-wider">Title</label>
                <input
                  type="text"
                  required
                  className="w-full px-5 py-4 border-2 border-black rounded-[1rem] focus:outline-none focus:ring-0 focus:border-[#FF6B57] transition-colors bg-white font-bold"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Mathematics - Chapter 1"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-bold text-black uppercase tracking-wider">Type</label>
                <select
                  className="w-full px-5 py-4 border-2 border-black rounded-[1rem] focus:outline-none focus:ring-0 focus:border-[#FF6B57] transition-colors bg-white font-bold"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                >
                  <option value="pdf">PDF Document</option>
                  <option value="link">Study Link / URL</option>
                </select>
              </div>
            </div>

            {type === 'link' ? (
              <div className="space-y-2">
                <label className="block text-sm font-bold text-black uppercase tracking-wider">Link URL</label>
                <input
                  type="url"
                  required
                  className="w-full px-5 py-4 border-2 border-black rounded-[1rem] focus:outline-none focus:ring-0 focus:border-[#FF6B57] transition-colors bg-white font-bold"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  placeholder="https://..."
                />
              </div>
            ) : (
              <div className="space-y-2">
                <label className="block text-sm font-bold text-black uppercase tracking-wider">File (PDF Only)</label>
                <input
                  type="file"
                  accept=".pdf"
                  required
                  className="w-full block text-sm text-black file:mr-4 file:py-3 file:px-6 file:rounded-full file:border-2 file:border-black file:text-sm file:font-bold file:bg-[#FF6B57] file:text-black hover:file:bg-[#FF8A7A] transition-colors cursor-pointer"
                  onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
                />
              </div>
            )}

            <div className="flex justify-end mt-4">
              <button
                type="submit"
                disabled={loading}
                className="bg-[#FF6B57] text-black px-10 py-4 rounded-full font-bold border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-[#FF8A7A] focus:outline-none transition-colors disabled:opacity-50"
              >
                {loading ? 'Adding...' : 'Add Material'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8">
        {materials.length === 0 ? (
          <div className="col-span-full text-center py-16 bg-[#FAFAFA] rounded-[2rem] border-2 border-black border-dashed">
            <p className="text-xl font-bold text-black mb-2">No materials available</p>
            <p className="text-gray-500 font-medium">Resources will appear here once uploaded.</p>
          </div>
        ) : (
          materials.map((mat) => {
            const finalUrl = mat.cloudinaryUrl;

            return (
              <div key={mat.id} className="group relative bg-white rounded-[2rem] border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all duration-300 overflow-hidden flex flex-col">
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  {isTeacher && (
                    <button
                      onClick={() => handleDelete(mat.id)}
                      className="p-2 bg-red-500 text-white rounded-full border-2 border-black hover:bg-red-600 transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                      title="Delete"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  )}
                </div>

                <div
                  onClick={() => openFile(finalUrl)}
                  style={{ cursor: 'pointer' }}
                  className="p-6 flex-1 flex flex-col"
                >
                  <div className="flex items-start justify-between mb-6">
                    <div className="p-4 rounded-[1rem] border-2 border-black bg-[#FAFAFA] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                      {getIcon(mat.type)}
                    </div>
                    <span className="text-xs font-black px-3 py-1.5 rounded-full uppercase tracking-widest border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] bg-[#FF6B57] text-black">
                      {mat.type}
                    </span>
                  </div>

                  <h4 className="text-xl font-extrabold text-black group-hover:text-[#FF6B57] transition-colors line-clamp-2 mb-2 flex-1">
                    {mat.title}
                  </h4>
                  <p className="text-sm text-gray-500 font-bold uppercase tracking-wider mt-auto">
                    {mat.timestamp?.toDate ? format(mat.timestamp.toDate(), 'MMMM d, yyyy') : 'Recently Added'}
                  </p>
                </div>

                <div className="px-6 py-4 bg-[#FAFAFA] border-t-2 border-black flex items-center justify-between">
                  <div className="flex items-center text-[10px] text-black font-extrabold uppercase tracking-widest">
                    <div className="w-2 h-2 rounded-full border border-black bg-[#FF6B57] mr-2 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"></div>
                    {mat.uploaderName || 'Instructor'}
                  </div>
                  <div className="flex items-center space-x-3">
                    {isTeacher && mat.type === 'pdf' && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setAgentModal({ title: mat.title, url: finalUrl });
                        }}
                        className="flex items-center space-x-1 px-4 py-2 bg-white text-black text-xs font-bold rounded-full border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-[#FF6B57] transition-all active:scale-95"
                        title="Add to AI Agent"
                      >
                        <Bot className="h-4 w-4" />
                        <span>Add to Agent</span>
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        openFile(finalUrl);
                      }}
                      className="flex items-center space-x-1 px-4 py-2 bg-white text-black text-xs font-bold rounded-full border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-gray-100 transition-all active:scale-95"
                    >
                      <ExternalLink className="h-4 w-4" />
                      <span>View</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        downloadFile(finalUrl, mat.title || 'material');
                      }}
                      className="flex items-center space-x-1 px-4 py-2 bg-black text-white text-xs font-bold rounded-full border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-gray-800 transition-all active:scale-95"
                    >
                      <Download className="h-4 w-4" />
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
