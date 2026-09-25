import React, { useState } from 'react';
import { 
  Bot, 
  Send, 
  Sparkles, 
  ShieldCheck, 
  Database,
  CheckCircle2
} from 'lucide-react';
import type { AIDetectiveAnswer } from '../api/client';
import { api } from '../api/client';

interface AIDetectiveViewProps {
  buildingId?: string;
  buildingName?: string;
}

export const AIDetectiveView: React.FC<AIDetectiveViewProps> = ({ buildingId, buildingName }) => {
  const activeBuildingId = buildingId || 'bldg-technova-01';
  const displayName = buildingName || 'your facility';

  const [query, setQuery] = useState<string>('');
  const [messages, setMessages] = useState<Array<{
    role: 'user' | 'assistant';
    content: string;
    details?: AIDetectiveAnswer;
  }>>([
    {
      role: 'assistant',
      content: `Hello! I am your ECO ⚡ VOLT Energy Forensics Detective. I investigate submeter telemetry across ${displayName} to answer 'Why did that watt get spent?'. Ask me about anomalous spikes, after-hours waste, weather impact, or verified savings opportunities.`
    }
  ]);
  const [loading, setLoading] = useState<boolean>(false);

  const suggestedQuestions = [
    "Why did energy spike yesterday?",
    "Which floor is wasting the most energy?",
    "Was yesterday's high consumption actually waste or weather?",
    "How much money could we save by fixing the HVAC schedule?",
    "What caused the peak demand event at 14:00?"
  ];

  const handleSend = async (qToSend?: string) => {
    const text = qToSend || query;
    if (!text.trim() || loading) return;

    // Add user message
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setQuery('');
    setLoading(true);

    try {
      const response = await api.askAIDetective(activeBuildingId, text);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: response.answer,
          details: response
        }
      ]);
    } catch (err) {
      console.error("AI Detective error:", err);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: "I encountered an error querying the PostgreSQL telemetry engine. Please ensure the backend is running at http://localhost:8000."
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">AI Energy Detective</h2>
            <span className="px-2.5 py-0.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-full">
              PostgreSQL Grounded Forensics
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Zero hallucinations. All statements are grounded strictly in real building telemetry, PIR occupancy sensors, and calibrated baselines.
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs text-slate-600 font-mono">
          <Database className="w-4 h-4 text-blue-600" />
          <span>Active Context: TechNova (4 Floors, 40 Zones)</span>
        </div>
      </div>

      {/* Suggested Quick Prompt Chips */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 text-xs">
        <span className="text-slate-500 text-[11px] whitespace-nowrap font-medium flex items-center space-x-1">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>Suggested:</span>
        </span>
        {suggestedQuestions.map((q, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(q)}
            className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium transition-all shadow-xs whitespace-nowrap hover:border-blue-400 cursor-pointer"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Chat Messages Log */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs min-h-[480px] max-h-[600px] overflow-y-auto space-y-4">
        {messages.map((m, idx) => {
          const isUser = m.role === 'user';
          return (
            <div
              key={idx}
              className={`flex items-start space-x-3 ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}
            >
              {/* Avatar */}
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                isUser 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-slate-100 text-blue-600 border border-slate-200'
              }`}>
                {isUser ? <span className="text-[10px] font-bold font-mono">YOU</span> : <Bot className="w-4 h-4" />}
              </div>

              {/* Message Bubble */}
              <div className={`max-w-2xl rounded-2xl p-4 text-xs leading-relaxed ${
                isUser
                  ? 'bg-blue-600 text-white font-medium shadow-xs'
                  : 'bg-slate-50 text-slate-800 border border-slate-200/80 shadow-xs'
              }`}>
                <p className="whitespace-pre-wrap">{m.content}</p>

                {/* Grounded Evidence Box if assistant provided details */}
                {m.details && (
                  <div className="mt-3.5 pt-3 border-t border-slate-200 space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-emerald-700 font-mono flex items-center space-x-1">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Verified Evidence Basis:</span>
                      </span>
                      <span className="text-slate-500 font-mono text-[10px]">
                        Engine: {m.details.engine_used}
                      </span>
                    </div>

                    <ul className="space-y-1 text-slate-700 text-xs">
                      {m.details.supporting_evidence.map((ev, i) => (
                        <li key={i} className="flex items-start space-x-1.5">
                          <span className="text-emerald-600 font-bold">•</span>
                          <span>{ev}</span>
                        </li>
                      ))}
                    </ul>

                    {/* Source Anomaly Pills */}
                    {m.details.source_entity_ids.length > 0 && (
                      <div className="flex items-center space-x-1.5 pt-1 text-[10px] text-slate-500 font-mono">
                        <span>Database Records:</span>
                        {m.details.source_entity_ids.map((id, i) => (
                          <span key={i} className="px-1.5 py-0.5 rounded bg-white text-blue-700 border border-slate-200">
                            {id}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-blue-600 animate-ping"></div>
              <span>Analyzing PostgreSQL submeter tables & contextual models...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input Field */}
      <form 
        onSubmit={(e) => { e.preventDefault(); handleSend(); }}
        className="flex items-center space-x-2"
      >
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask AI Detective a question (e.g. 'Why was Floor 3 flagged yesterday?')"
          className="flex-1 px-4 py-3 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-medium shadow-xs"
        />
        <button
          type="submit"
          disabled={!query.trim() || loading}
          className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-xs disabled:opacity-40 cursor-pointer"
        >
          <span>Ask</span>
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};
