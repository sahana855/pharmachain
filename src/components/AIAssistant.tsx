import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../lib/auth';
import { getLocalAIResponse, getRoleSuggestions, isAIRestricted } from '../lib/ai';
import {
  Bot, X, Send, Sparkles, Loader2, Brain, Lightbulb, ShieldOff
} from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  actions?: Array<{ label: string; path: string }>;
  timestamp: Date;
}

export default function AIAssistant() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isAllowed = user ? isAIRestricted(user.role) : false;

  useEffect(() => {
    if (isOpen && isAllowed && messages.length === 0) {
      const roleSuggestions = user ? getRoleSuggestions(user.role) : [];
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: `🤖 **Hello ${user?.name}!** I'm PharmaAI, your local AI assistant for ${user?.role} operations.\n\nI can analyze your data in real-time without needing any API key or internet connection.\n\n**Try asking:**\n${roleSuggestions.slice(0, 4).map(s => `• "${s}"`).join('\n')}`,
        timestamp: new Date(),
      }]);
    }
  }, [isOpen, user, isAllowed]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const handleSend = async () => {
    if (!input.trim() || loading || !user) return;
    const userMessage = input.trim();
    setInput('');
    setShowSuggestions(false);

    const newMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, newMsg]);
    setLoading(true);

    try {
      const response = await getLocalAIResponse(userMessage, user.id, user.name, user.role);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.text,
        actions: response.actions,
        timestamp: new Date(),
      }]);
    } catch (error: any) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `❌ **Error:** ${error.message || 'Failed to process request.'}`,
        timestamp: new Date(),
      }]);
    }
    setLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestion = (suggestion: string) => {
    setInput(suggestion);
    setShowSuggestions(false);
    setTimeout(() => handleSend(), 100);
  };

  if (!isAllowed) return null;

  const suggestions = user ? getRoleSuggestions(user.role) : [];

  return (
    <>
      {/* Floating Chat Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-2xl shadow-2xl flex items-center justify-center transition-all duration-300 ${
          isOpen
            ? 'bg-gray-800 rotate-90 scale-90'
            : 'bg-gradient-to-br from-primary-500 to-indigo-600 hover:scale-110 hover:shadow-primary-500/30 animate-glow'
        }`}
        title="Ask PharmaAI"
      >
        {isOpen ? (
          <X size={24} className="text-white" />
        ) : (
          <Bot size={26} className="text-white" />
        )}
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-[380px] max-w-[calc(100vw-2rem)] h-[560px] max-h-[calc(100vh-200px)] glass-card-solid flex flex-col shadow-2xl animate-slide-up overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary-500 to-indigo-600 p-4 text-white flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <Brain size={20} className="text-white" />
              </div>
              <div>
                <h3 className="font-bold text-sm">PharmaAI</h3>
                <p className="text-xs text-white/70 flex items-center gap-1">
                  <Sparkles size={10} />
                  {user?.role === 'manufacturer' ? 'Manufacturer Assistant' :
                   user?.role === 'dealer' ? 'Dealer Assistant' :
                   'Pharmacy Assistant'}
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full ml-1 animate-pulse" />
                </p>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-gray-50/50 to-white">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[90%] rounded-2xl px-4 py-3 ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-r from-primary-500 to-indigo-600 text-white rounded-br-md'
                      : 'bg-white border border-gray-100 shadow-sm rounded-bl-md'
                  }`}
                >
                  {msg.role === 'assistant' ? (
                    <div className="text-sm text-gray-700 leading-relaxed">
                      {msg.content.split('\n').map((line, i) => {
                        if (line.startsWith('⚠') || line.startsWith('🔴') || line.startsWith('❌')) {
                          return <p key={i} className="font-semibold text-red-600">{line}</p>;
                        }
                        if (line.startsWith('✅') || line.startsWith('📊') || line.startsWith('📦')) {
                          return <p key={i} className="font-semibold">{line}</p>;
                        }
                        if (line.startsWith('•') || line.startsWith('  •')) {
                          return <p key={i} className="text-gray-600 ml-2">{line}</p>;
                        }
                        if (line.startsWith('💡') || line.startsWith('📋') || line.startsWith('📚')) {
                          return <p key={i} className="text-gray-500 text-xs mt-1">{line}</p>;
                        }
                        if (line.startsWith('**') && line.endsWith('**')) {
                          return <p key={i} className="font-bold text-gray-800 text-sm">{line.replace(/\*\*/g, '')}</p>;
                        }
                        if (line.trim() === '') return <div key={i} className="h-1" />;
                        return <p key={i} className="text-gray-700">{line}</p>;
                      })}
                      {msg.actions && (
                        <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-gray-100">
                          {msg.actions.map((action, i) => (
                            <button
                              key={i}
                              onClick={() => {
                                const navigate = (window as any).__navigate;
                                if (navigate) navigate(action.path);
                              }}
                              className="text-xs px-2.5 py-1 bg-gradient-to-r from-primary-500 to-indigo-600 text-white rounded-full hover:shadow-md transition"
                            >
                              {action.label} →
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-white">{msg.content}</p>
                  )}
                  <p className={`text-[10px] mt-1.5 ${msg.role === 'user' ? 'text-white/60' : 'text-gray-400'}`}>
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-100 shadow-sm rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Loader2 size={14} className="text-primary-500 animate-spin" />
                    <span className="text-sm text-gray-500">Analyzing your data...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggestions */}
          {showSuggestions && messages.length <= 1 && (
            <div className="px-4 py-2 border-t border-gray-100 bg-gray-50/50">
              <div className="flex items-center gap-1 mb-2">
                <Lightbulb size={12} className="text-yellow-500" />
                <span className="text-xs font-medium text-gray-500">Quick Actions</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {suggestions.slice(0, 4).map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSuggestion(s)}
                    className="text-xs px-2.5 py-1.5 bg-white border border-gray-200 rounded-full text-gray-600 hover:border-primary-300 hover:text-primary-600 transition whitespace-nowrap"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-3 border-t border-gray-100 bg-white flex-shrink-0">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask PharmaAI anything..."
                className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                disabled={loading}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || loading}
                className="p-2.5 bg-gradient-to-r from-primary-500 to-indigo-600 text-white rounded-xl hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex-shrink-0"
              >
                {loading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Send size={18} />
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

