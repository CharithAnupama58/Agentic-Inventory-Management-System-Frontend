import { useState, useRef, useEffect } from "react";
import { sendChatMessage, getCampaigns } from "../api/services";

// ── Suggested prompts ─────────────────────────────────────────────────────────
const SUGGESTIONS = [
  { icon: "🎯", text: "Create discount campaign for slow products" },
  { icon: "📦", text: "Which products are running low on stock?" },
  { icon: "🏆", text: "What are my top selling products this month?" },
  { icon: "🔄", text: "Analyze my reorder situation" },
  { icon: "📊", text: "Give me a quick business summary" },
  { icon: "💰", text: "Create 15% off campaign for all slow movers for 14 days" },
];

// ── Action result card ────────────────────────────────────────────────────────
function ActionCard({ action, result }) {
  const [expanded, setExpanded] = useState(false);

  const typeColors = {
    CREATE_CAMPAIGN:  "bg-purple-100 text-purple-700 border-purple-200",
    ADJUST_STOCK:     "bg-blue-100 text-blue-700 border-blue-200",
    GET_SLOW_PRODUCTS:"bg-orange-100 text-orange-700 border-orange-200",
    GET_LOW_STOCK:    "bg-red-100 text-red-700 border-red-200",
    GET_TOP_PRODUCTS: "bg-green-100 text-green-700 border-green-200",
    GET_CAMPAIGNS:    "bg-indigo-100 text-indigo-700 border-indigo-200",
    ANALYZE_REORDERS: "bg-yellow-100 text-yellow-700 border-yellow-200",
  };

  const style = typeColors[action.type] ?? "bg-gray-100 text-gray-700";

  return (
    <div className={`rounded-lg border px-3 py-2 text-xs ${style} mt-2`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-bold">{action.status === "EXECUTED" ? "✅" : "❌"}</span>
          <span className="font-semibold">{action.description}</span>
        </div>
        {result?.data && (
          <button onClick={() => setExpanded(!expanded)}
            className="text-xs opacity-60 hover:opacity-100">
            {expanded ? "▲" : "▼"}
          </button>
        )}
      </div>
      {result?.message && (
        <p className="mt-1 opacity-80">{result.message}</p>
      )}
      {expanded && result?.data && (
        <div className="mt-2 bg-white bg-opacity-50 rounded p-2
          text-xs font-mono overflow-auto max-h-40">
          {Array.isArray(result.data)
            ? result.data.map((item, i) => (
                <div key={i} className="mb-1">
                  {item.name && <span className="font-semibold">{item.name}</span>}
                  {item.stock !== undefined && <span> · Stock: {item.stock}</span>}
                  {item.soldQty !== undefined && <span> · Sold: {item.soldQty}</span>}
                  {item.revenue !== undefined && <span> · ${item.revenue}</span>}
                  {item.discount && <span> · {item.discount}</span>}
                </div>
              ))
            : <div>
                {Object.entries(result.data).map(([k, v]) => (
                  <div key={k}>
                    <span className="opacity-60">{k}:</span> {String(v)}
                  </div>
                ))}
              </div>
          }
        </div>
      )}
    </div>
  );
}

// ── Chat bubble ───────────────────────────────────────────────────────────────
function ChatBubble({ msg }) {
  const isUser = msg.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center
          justify-center text-white text-sm flex-shrink-0 mr-2 mt-1">
          🤖
        </div>
      )}
      <div className={`max-w-[80%] ${isUser ? "items-end" : "items-start"}
        flex flex-col`}>
        <div className={`rounded-2xl px-4 py-3 text-sm
          ${isUser
            ? "bg-indigo-600 text-white rounded-tr-none"
            : "bg-white border border-gray-200 text-gray-800 rounded-tl-none"}`}>
          {/* Render message with markdown-like formatting */}
          {msg.content.split("\n").map((line, i) => (
            <p key={i} className={line === "" ? "h-2" : ""}>
              {line.startsWith("**") && line.endsWith("**")
                ? <strong>{line.slice(2, -2)}</strong>
                : line.startsWith("- ")
                ? <span className="block">• {line.slice(2)}</span>
                : line}
            </p>
          ))}
        </div>

        {/* Action cards */}
        {msg.actions?.length > 0 && (
          <div className="w-full mt-1">
            {msg.actions.map((action, i) => (
              <ActionCard
                key={i}
                action={action}
                result={msg.results?.[i]}
              />
            ))}
          </div>
        )}

        {msg.timestamp && (
          <p className="text-xs text-gray-400 mt-1">
            {new Date(msg.timestamp).toLocaleTimeString()}
          </p>
        )}
      </div>
      {isUser && (
        <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center
          justify-center text-sm flex-shrink-0 ml-2 mt-1">
          👤
        </div>
      )}
    </div>
  );
}

export default function ChatAgentPage() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "👋 Hi! I'm your AI Business Agent.\n\nI can **take actions** for you, not just answer questions. Try asking me to:\n- Create discount campaigns\n- Check stock levels\n- Analyze your business\n\nWhat would you like me to do?",
      timestamp: new Date(),
    }
  ]);
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [showCampaigns, setShowCampaigns] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load campaigns
  useEffect(() => {
    getCampaigns()
      .then(r => setCampaigns(r.data))
      .catch(() => {});
  }, [messages]); // refresh after each message

  const sendMessage = async (text) => {
    const userText = text || input.trim();
    if (!userText || loading) return;

    setInput("");
    setLoading(true);

    // Add user message
    const userMsg = { role: "user", content: userText,
                      timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);

    try {
      // Build history for context
      const history = messages.slice(-6).map(m => ({
        role:    m.role,
        content: m.content,
      }));

      const response = await sendChatMessage({
        message:   userText,
        history,
        sessionId,
      });

      const data = response.data;

      if (!sessionId) setSessionId(data.sessionId);

      // Add assistant message
      setMessages(prev => [...prev, {
        role:      "assistant",
        content:   data.message,
        actions:   data.actions,
        results:   data.results,
        intent:    data.intent,
        timestamp: new Date(),
      }]);

    } catch (err) {
      setMessages(prev => [...prev, {
        role:    "assistant",
        content: "❌ Sorry, I encountered an error. Please try again.",
        timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full gap-4" style={{ height: "calc(100vh - 80px)" }}>

      {/* ── Chat Panel ───────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-sm
        border border-gray-100 overflow-hidden">

        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex justify-between
          items-center bg-gradient-to-r from-indigo-600 to-purple-600">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white bg-opacity-20
              flex items-center justify-center text-xl">
              🤖
            </div>
            <div>
              <h1 className="font-bold text-white">Business Agent</h1>
              <p className="text-xs text-indigo-200">
                Autonomous AI — takes actions, not just answers
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400
              animate-pulse"></div>
            <span className="text-xs text-indigo-200">Active</span>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          {messages.map((msg, i) => (
            <ChatBubble key={i} msg={msg} />
          ))}

          {/* Typing indicator */}
          {loading && (
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex
                items-center justify-center text-sm">🤖</div>
              <div className="bg-gray-100 rounded-2xl px-4 py-3 flex gap-1">
                <span className="animate-bounce" style={{ animationDelay:"0ms"}}>●</span>
                <span className="animate-bounce" style={{ animationDelay:"150ms"}}>●</span>
                <span className="animate-bounce" style={{ animationDelay:"300ms"}}>●</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggestions */}
        {messages.length <= 1 && (
          <div className="px-4 pb-2">
            <p className="text-xs text-gray-400 mb-2">Try asking:</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s, i) => (
                <button key={i}
                  onClick={() => sendMessage(s.text)}
                  className="text-xs bg-indigo-50 hover:bg-indigo-100
                    text-indigo-700 px-3 py-1.5 rounded-full transition-colors
                    flex items-center gap-1 border border-indigo-200">
                  <span>{s.icon}</span>
                  <span>{s.text}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="px-4 pb-4 pt-2 border-t border-gray-100">
          <div className="flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter"
                && !e.shiftKey && sendMessage()}
              placeholder="Ask me to do something..."
              disabled={loading}
              className="flex-1 border border-gray-300 rounded-xl px-4 py-3
                text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500
                disabled:opacity-50"
            />
            <button
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50
                text-white px-4 py-3 rounded-xl transition-colors">
              {loading ? "⏳" : "➤"}
            </button>
          </div>
        </div>
      </div>

      {/* ── Right Panel ──────────────────────────────────────────────────── */}
      <div className="w-72 flex flex-col gap-4 overflow-y-auto">

        {/* What I can do */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <h2 className="font-semibold text-gray-700 mb-3 flex
            items-center gap-2">
            <span>⚡</span> Agent Capabilities
          </h2>
          <div className="space-y-2 text-xs text-gray-600">
            {[
              { icon: "🎯", label: "Create discount campaigns" },
              { icon: "📦", label: "Check & adjust stock levels" },
              { icon: "🏆", label: "Analyze top/slow products" },
              { icon: "🔔", label: "Review reorder status" },
              { icon: "📊", label: "Business summaries" },
              { icon: "💰", label: "Campaign management" },
            ].map((c, i) => (
              <div key={i} className="flex items-center gap-2
                bg-gray-50 rounded-lg px-2 py-1.5">
                <span>{c.icon}</span>
                <span>{c.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Active Campaigns */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-semibold text-gray-700 flex items-center gap-2">
              <span>🎯</span> Active Campaigns
            </h2>
            <span className="text-xs bg-purple-100 text-purple-700
              px-2 py-0.5 rounded-full font-medium">
              {campaigns.filter(c => c.status === "ACTIVE").length}
            </span>
          </div>
          {campaigns.filter(c => c.status === "ACTIVE").length === 0
            ? <p className="text-xs text-gray-400">
                No active campaigns. Ask me to create one!
              </p>
            : <div className="space-y-2">
                {campaigns
                  .filter(c => c.status === "ACTIVE")
                  .slice(0, 5)
                  .map((c, i) => (
                    <div key={i} className="bg-purple-50 border
                      border-purple-100 rounded-lg p-2">
                      <p className="text-xs font-semibold text-purple-800">
                        {c.name}
                      </p>
                      <p className="text-xs text-purple-600 mt-0.5">
                        {c.discountValue}% off ·
                        Ends {c.endDate ?? "ongoing"}
                      </p>
                      {c.createdByAi && (
                        <span className="text-xs bg-indigo-100
                          text-indigo-600 px-1.5 py-0.5 rounded-full">
                          🤖 AI Created
                        </span>
                      )}
                    </div>
                  ))}
              </div>
          }
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <h2 className="font-semibold text-gray-700 mb-3 flex
            items-center gap-2">
            <span>⚡</span> Quick Actions
          </h2>
          <div className="space-y-2">
            {[
              { icon: "🎯", label: "Create flash sale",
                msg: "Create a 25% discount campaign for slow moving products for 3 days" },
              { icon: "📦", label: "Check stock alerts",
                msg: "Show me all products running low on stock" },
              { icon: "📊", label: "Business summary",
                msg: "Give me a complete business summary with key metrics" },
              { icon: "🔄", label: "Reorder analysis",
                msg: "Analyze my reorder situation and tell me what to order" },
            ].map((q, i) => (
              <button key={i}
                onClick={() => sendMessage(q.msg)}
                disabled={loading}
                className="w-full text-left text-xs bg-gray-50
                  hover:bg-indigo-50 hover:border-indigo-200
                  border border-gray-200 rounded-lg px-3 py-2
                  transition-colors flex items-center gap-2
                  disabled:opacity-50">
                <span>{q.icon}</span>
                <span className="text-gray-600">{q.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
