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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-50 rounded-lg">
              <Bot className="h-4 w-4 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">Add to Agent</p>
              <p className="text-xs text-gray-400 truncate max-w-[260px]">{materialTitle}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-3">
          {success ? (
            <div className="flex items-start gap-2 text-green-600 bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
              <CheckCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{success}</span>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-600">Select an agent to feed this document into:</p>

              {agentsLoading ? (
                <div className="flex items-center gap-2 text-sm text-gray-400 py-4 justify-center">
                  <Loader className="h-4 w-4 animate-spin" /> Loading agents…
                </div>
              ) : agents.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">
                  No agents yet. Create one from the AI Agent tab first.
                </p>
              ) : (
                <ul className="space-y-2 max-h-56 overflow-y-auto">
                  {agents.map((a) => (
                    <li key={a.id}>
                      <button
                        onClick={() => setSelected(a.id)}
                        className={`w-full text-left px-4 py-3 rounded-xl border transition-colors
                          ${selected === a.id
                            ? 'border-indigo-500 bg-indigo-50'
                            : 'border-gray-200 bg-gray-50 hover:border-indigo-300 hover:bg-indigo-50/50'
                          }`}
                      >
                        <p className="text-sm font-semibold text-gray-800">{a.name}</p>
                        <p className="text-xs text-gray-400 truncate">{a.description}</p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {error && (
                <div className="flex items-start gap-2 text-red-600 bg-red-50 border border-red-200 rounded-lg p-3 text-sm">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-100">
          {success ? (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Done
            </button>
          ) : (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={!selected || uploading || agents.length === 0}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {uploading ? (
                  <><Loader className="h-4 w-4 animate-spin" /> Adding…</>
                ) : (
                  'Add to Agent'
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
