import React, { useState } from 'react';
import { X, Send, Bot, Loader2 } from 'lucide-react';
import { askAiAssistant } from '../services/geminiService';

interface AiModalProps {
  isOpen: boolean;
  onClose: () => void;
  contextData: string;
}

const AiModal: React.FC<AiModalProps> = ({ isOpen, onClose, contextData }) => {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleAsk = async () => {
    if (!query.trim()) return;
    setLoading(true);
    const answer = await askAiAssistant(query, contextData);
    setResponse(answer);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gradient-to-r from-indigo-600 to-purple-600">
          <div className="flex items-center text-white">
            <Bot className="w-6 h-6 mr-2" />
            <h3 className="font-bold">FTI AI Assistant</h3>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 h-80 overflow-y-auto bg-gray-50 dark:bg-gray-900/50">
          {!response && !loading && (
            <p className="text-gray-500 text-center text-sm mt-10">
              Ask me about room availability, lab rules, or help drafting a booking request.
            </p>
          )}
          
          {query && response && (
            <div className="mb-4 text-right">
              <span className="inline-block bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100 rounded-t-2xl rounded-bl-2xl px-4 py-2 text-sm">
                {query}
              </span>
            </div>
          )}

          {loading && (
             <div className="flex justify-start mb-4">
                <div className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 rounded-t-2xl rounded-br-2xl px-4 py-3">
                   <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
                </div>
             </div>
          )}

          {response && !loading && (
            <div className="flex justify-start mb-4">
               <div className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 rounded-t-2xl rounded-br-2xl px-4 py-3 text-sm text-gray-800 dark:text-gray-200">
                 {response}
               </div>
            </div>
          )}
        </div>

        <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex space-x-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
            placeholder="Type your question..."
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-full focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
          />
          <button 
            onClick={handleAsk}
            disabled={loading}
            className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full transition-colors disabled:opacity-50"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AiModal;
