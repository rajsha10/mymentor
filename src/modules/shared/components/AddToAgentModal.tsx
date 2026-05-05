import { useState, useEffect } from 'react';
import { listAgents, addDocument } from '../../../services/backendApi';
import { Bot, Loader, CheckCircle, AlertCircle, X } from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  description: string;
}

interface Props {
  materialTitle: string;
  fileUrl: string;
  onClose: () => void;
}

export default function AddToAgentModal({ materialTitle, fileUrl, onClose }: Props) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    listAgents()
      .then(setAgents)
      .catch(() => setError('Failed to load agents.'))
      .finally(() => setAgentsLoading(false));
  }, []);

  const handleConfirm = async () => {
    if (!selected) return;
    setError('');
    setUploading(true);
    try {
      // Fetch the file from Cloudinary as a blob
      const res = await fetch(fileUrl);
      if (!res.ok) throw new Error('Failed to fetch the file from storage.');
      const blob = await res.blob();

      // Derive a filename from the URL or fall back to title
      const urlParts = fileUrl.split('/');
      const rawName = urlParts[urlParts.length - 1].split('?')[0];
      const filename = rawName.endsWith('.pdf') ? rawName : `${materialTitle}.pdf`;

      const file = new File([blob], filename, { type: 'application/pdf' });
      await addDocument(selected, file);
      setSuccess(`"${materialTitle}" added to agent successfully.`);
    } catch (err: any) {
      setError(err.message || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-[2.5rem] border-4 border-black shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] w-full max-w-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b-4 border-black bg-[#FF6B57]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
              <Bot className="h-6 w-6 text-[#FF6B57]" />
            </div>
            <div>
              <p className="text-xl font-black text-black uppercase tracking-tight">Feed AI Agent</p>
              <p className="text-[10px] font-black text-black/60 uppercase tracking-widest truncate max-w-[200px]">{materialTitle}</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-10 h-10 bg-white border-2 border-black rounded-xl flex items-center justify-center hover:bg-black hover:text-white transition-all shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-0.5 active:translate-y-0.5"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-8 py-8 space-y-6">
          {success ? (
            <div className="flex flex-col items-center justify-center py-6 text-center animate-in zoom-in duration-300">
              <div className="w-20 h-20 bg-emerald-100 border-4 border-emerald-500 rounded-full flex items-center justify-center mb-6 shadow-[8px_8px_0px_0px_rgba(16,185,129,0.1)]">
                <CheckCircle className="h-10 w-10 text-emerald-600" />
              </div>
              <p className="text-xl font-black text-emerald-950 uppercase tracking-tight mb-2">Success!</p>
              <p className="text-emerald-700 font-bold max-w-xs">{success}</p>
            </div>
          ) : (
            <>
              <p className="text-sm font-black text-black uppercase tracking-widest ml-1">Select recipient agent:</p>

              {agentsLoading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <div className="relative">
                     <div className="w-12 h-12 bg-black rounded-xl animate-spin" />
                     <Loader className="absolute inset-0 m-auto h-6 w-6 text-white" />
                  </div>
                  <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Listing Agents…</p>
                </div>
              ) : agents.length === 0 ? (
                <div className="py-12 px-6 border-4 border-dashed border-black/5 rounded-[2rem] text-center">
                   <p className="text-sm font-black text-gray-400 uppercase tracking-widest leading-relaxed">
                     No agents found in your registry. Please create an AI Agent first.
                   </p>
                </div>
              ) : (
                <ul className="space-y-4 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                  {agents.map((a) => (
                    <li key={a.id}>
                      <button
                        onClick={() => setSelected(a.id)}
                        className={`w-full text-left p-5 rounded-2xl border-4 border-black transition-all group
                          ${selected === a.id
                            ? 'bg-black text-white shadow-[6px_6px_0px_0px_rgba(255,107,87,1)] -translate-y-1'
                            : 'bg-white text-black hover:bg-[#FF6B57]/5 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'
                          }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                           <p className="text-lg font-black uppercase tracking-tight">{a.name}</p>
                           {selected === a.id && <CheckCircle className="h-5 w-5 text-[#FF6B57]" />}
                        </div>
                        <p className={`text-xs font-bold leading-relaxed line-clamp-1 uppercase tracking-wide ${selected === a.id ? 'text-white/60' : 'text-gray-400'}`}>
                           {a.description}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {error && (
                <div className="flex items-start gap-4 text-red-700 bg-red-50 border-4 border-red-500 rounded-2xl p-5 shadow-[6px_6px_0px_0px_rgba(239,68,68,0.1)]">
                  <AlertCircle className="h-6 w-6 mt-0.5 shrink-0" />
                  <div>
                     <p className="font-black uppercase text-xs tracking-widest mb-1">Transmission Error</p>
                     <p className="text-sm font-bold leading-relaxed">{error}</p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-4 px-8 py-6 border-t-4 border-black bg-gray-50">
          {success ? (
            <button
              onClick={onClose}
              className="w-full bg-black text-white py-4 rounded-2xl font-black uppercase tracking-[0.2em] border-4 border-black shadow-[6px_6px_0px_0px_rgba(255,107,87,1)] hover:bg-[#FF6B57] hover:text-black transition-all active:shadow-none active:translate-x-1 active:translate-y-1"
            >
              MISSION COMPLETE
            </button>
          ) : (
            <>
              <button
                onClick={onClose}
                className="px-8 py-4 text-xs font-black text-black uppercase tracking-widest hover:underline"
              >
                Abort
              </button>
              <button
                onClick={handleConfirm}
                disabled={!selected || uploading || agents.length === 0}
                className="flex-1 flex items-center justify-center gap-3 bg-black text-white py-4 rounded-2xl font-black uppercase tracking-[0.2em] border-4 border-black shadow-[6px_6px_0px_0px_rgba(255,107,87,1)] hover:bg-[#FF6B57] hover:text-black disabled:opacity-20 disabled:cursor-not-allowed transition-all active:shadow-none active:translate-x-1 active:translate-y-1"
              >
                {uploading ? (
                  <><Loader className="h-5 w-5 animate-spin" /> FEEDING…</>
                ) : (
                  'CONFIRM TRANSMISSION'
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
