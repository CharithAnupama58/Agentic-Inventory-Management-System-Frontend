import { useState, useRef, useEffect, useCallback } from "react";
import {
  sendChatMessage, getCampaigns,
  cancelCampaign, deleteCampaign,
  getSuggestions, generateSuggestions,
  acceptSuggestion, dismissSuggestion,
} from "../api/services";

const SUGGESTIONS_PROMPTS = [
  { icon: "📊", text: "How are my sales this week?"                        },
  { icon: "💰", text: "What is my profit this month?"                      },
  { icon: "🏆", text: "What are my top selling products?"                  },
  { icon: "📦", text: "How is my inventory status?"                        },
  { icon: "🎯", text: "Create a discount campaign for slow products"       },
  { icon: "📈", text: "Why are my sales low? Fix it"                       },
  { icon: "💹", text: "How can I improve my profit margin?"                },
  { icon: "⚡", text: "Sales are down this week, do something"             },
];

const PRIORITY_STYLE = {
  CRITICAL: "bg-red-50 border-red-300 text-red-800",
  HIGH:     "bg-orange-50 border-orange-300 text-orange-800",
  MEDIUM:   "bg-yellow-50 border-yellow-300 text-yellow-800",
  LOW:      "bg-blue-50 border-blue-300 text-blue-800",
};

const PRIORITY_BADGE = {
  CRITICAL: "bg-red-600 text-white",
  HIGH:     "bg-orange-500 text-white",
  MEDIUM:   "bg-yellow-500 text-white",
  LOW:      "bg-blue-500 text-white",
};

const STATUS_STYLE = {
  ACTIVE:    "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-600",
  EXPIRED:   "bg-gray-100 text-gray-500",
  SCHEDULED: "bg-blue-100 text-blue-700",
};

const INTENT_STYLE = {
  QUERY:  { bg: "bg-blue-100 text-blue-600",   icon: "🔍", label: "Query"  },
  ACTION: { bg: "bg-purple-100 text-purple-600", icon: "⚙️", label: "Action" },
  HYBRID: { bg: "bg-orange-100 text-orange-600", icon: "🔥", label: "Hybrid" },
};

// ── Campaign Card ─────────────────────────────────────────────────────────────
function CampaignCard({ campaign, onCancel, onDelete }) {
  const [confirming, setConfirming] = useState(null);
  const isActive = campaign.status === "ACTIVE";

  return (
    <div className={`rounded-xl border p-3 mb-2
      ${isActive
        ? "bg-purple-50 border-purple-200"
        : "bg-gray-50 border-gray-200 opacity-70"}`}>

      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-xs font-semibold text-gray-800">
              {campaign.name}
            </p>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium
              ${STATUS_STYLE[campaign.status]
                ?? "bg-gray-100 text-gray-600"}`}>
              {campaign.status}
            </span>
            {campaign.createdByAi && (
              <span className="text-xs bg-indigo-100 text-indigo-600
                px-1.5 py-0.5 rounded-full">
                🤖 AI
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            {campaign.discountValue}% off ·{" "}
            {campaign.productIds?.length ?? 0} products ·{" "}
            {campaign.endDate ? `Ends ${campaign.endDate}` : "No end date"}
          </p>
        </div>
      </div>

      {/* Confirmation */}
      {confirming && (
        <div className={`mt-2 p-2 rounded-lg text-xs
          ${confirming === "delete"
            ? "bg-red-50 border border-red-200"
            : "bg-orange-50 border border-orange-200"}`}>
          <p className={`font-medium mb-2
            ${confirming === "delete"
              ? "text-red-700" : "text-orange-700"}`}>
            {confirming === "delete"
              ? "⚠️ Permanently delete this campaign?"
              : "⚠️ Stop campaign? Discount removed from POS instantly."}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                confirming === "delete"
                  ? onDelete(campaign.id)
                  : onCancel(campaign.id);
                setConfirming(null);
              }}
              className={`px-3 py-1 rounded-lg text-white font-medium
                text-xs ${confirming === "delete"
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-orange-500 hover:bg-orange-600"}`}>
              Confirm
            </button>
            <button onClick={() => setConfirming(null)}
              className="px-3 py-1 rounded-lg bg-gray-200
                hover:bg-gray-300 text-gray-700 font-medium text-xs">
              Keep it
            </button>
          </div>
        </div>
      )}

      {/* Action buttons */}
      {!confirming && (
        <div className="flex gap-1.5 mt-2">
          {isActive && (
            <button onClick={() => setConfirming("cancel")}
              className="text-xs bg-orange-100 hover:bg-orange-200
                text-orange-700 px-2 py-1 rounded-lg transition-colors">
              ⏹ Stop
            </button>
          )}
          <button onClick={() => setConfirming("delete")}
            className="text-xs bg-red-100 hover:bg-red-200 text-red-700
              px-2 py-1 rounded-lg transition-colors">
            🗑 Delete
          </button>
        </div>
      )}
    </div>
  );
}

// ── Suggestion Card ───────────────────────────────────────────────────────────
function SuggestionCard({ suggestion, onAccept, onDismiss, onAction }) {
  const style = PRIORITY_STYLE[suggestion.priority] ?? PRIORITY_STYLE.LOW;
  const badge = PRIORITY_BADGE[suggestion.priority] ?? PRIORITY_BADGE.LOW;
  return (
    <div className={`rounded-xl border p-3 ${style} mb-2`}>
      <div className="flex items-start justify-between gap-2 mb-1">
        <p className="font-semibold text-sm flex-1">{suggestion.title}</p>
        <span className={`text-xs px-2 py-0.5 rounded-full font-bold
          flex-shrink-0 ${badge}`}>
          {suggestion.priority}
        </span>
      </div>
      <p className="text-xs opacity-80 mb-2">{suggestion.description}</p>
      {suggestion.estimatedImpact && (
        <p className="text-xs font-medium opacity-90 mb-2">
          💡 {suggestion.estimatedImpact}
        </p>
      )}
      <div className="flex gap-1.5 flex-wrap">
        {suggestion.suggestedAction && (
          <button onClick={() => onAction(suggestion.suggestedAction)}
            className="text-xs bg-white bg-opacity-70
              hover:bg-opacity-100 border border-current px-2 py-1
              rounded-lg font-medium">
            ▶ Take Action
          </button>
        )}
        <button onClick={() => onAccept(suggestion.id)}
          className="text-xs bg-white bg-opacity-50
            hover:bg-opacity-80 px-2 py-1 rounded-lg">
          ✓ Accept
        </button>
        <button onClick={() => onDismiss(suggestion.id)}
          className="text-xs opacity-50 hover:opacity-100
            px-2 py-1 rounded-lg">
          ✕
        </button>
      </div>
    </div>
  );
}

// ── Action Result Card ────────────────────────────────────────────────────────
function ActionCard({ action, result }) {
  const [expanded, setExpanded] = useState(false);
  const typeColor = {
    CREATE_CAMPAIGN:   "bg-purple-100 text-purple-700 border-purple-200",
    ADJUST_STOCK:      "bg-blue-100 text-blue-700 border-blue-200",
    GET_SLOW_PRODUCTS: "bg-orange-100 text-orange-700 border-orange-200",
    GET_LOW_STOCK:     "bg-red-100 text-red-700 border-red-200",
    GET_TOP_PRODUCTS:  "bg-green-100 text-green-700 border-green-200",
    GET_CAMPAIGNS:     "bg-indigo-100 text-indigo-700 border-indigo-200",
    ANALYZE_REORDERS:  "bg-yellow-100 text-yellow-700 border-yellow-200",
  }[action.type] ?? "bg-gray-100 text-gray-700 border-gray-200";

  return (
    <div className={`rounded-lg border px-3 py-2 text-xs
      ${typeColor} mt-2`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-bold">
            {action.status === "EXECUTED" ? "✅" : "❌"}
          </span>
          <span className="font-semibold">{action.description}</span>
        </div>
        {result?.data && (
          <button onClick={() => setExpanded(!expanded)}
            className="opacity-60 hover:opacity-100">
            {expanded ? "▲" : "▼"}
          </button>
        )}
      </div>
      {result?.message && (
        <p className="mt-1 opacity-80">{result.message}</p>
      )}
      {expanded && result?.data && (
        <div className="mt-2 bg-white bg-opacity-60 rounded p-2
          overflow-auto max-h-40 font-mono">
          {Array.isArray(result.data)
            ? result.data.map((item, i) => (
                <div key={i} className="mb-1">
                  {item.name && (
                    <span className="font-semibold">{item.name}</span>
                  )}
                  {item.stock   !== undefined && (
                    <span> · Stock: {item.stock}</span>
                  )}
                  {item.soldQty !== undefined && (
                    <span> · Sold: {item.soldQty}</span>
                  )}
                  {item.revenue !== undefined && (
                    <span> · ${item.revenue}</span>
                  )}
                  {item.discount && <span> · {item.discount}</span>}
                </div>
              ))
            : Object.entries(result.data).map(([k, v]) => (
                <div key={k}>
                  <span className="opacity-60">{k}:</span> {String(v)}
                </div>
              ))
          }
        </div>
      )}
    </div>
  );
}

// ── Chat Bubble ───────────────────────────────────────────────────────────────
function ChatBubble({ msg }) {
  const isUser  = msg.role === "user";
  const intent  = msg.intent
    ? INTENT_STYLE[msg.intent.toUpperCase()]
    : null;

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-indigo-600 flex
          items-center justify-center text-white text-sm
          flex-shrink-0 mr-2 mt-1">
          🤖
        </div>
      )}

      <div className={`max-w-[80%] flex flex-col
        ${isUser ? "items-end" : "items-start"}`}>

        {/* Message bubble */}
        <div className={`rounded-2xl px-4 py-3 text-sm
          ${isUser
            ? "bg-indigo-600 text-white rounded-tr-none"
            : "bg-white border border-gray-200 text-gray-800 rounded-tl-none"}`}>
          {msg.content.split("\n").map((line, i) => (
            <p key={i} className={line === "" ? "h-2" : ""}>
              {line.startsWith("**") && line.endsWith("**")
                ? <strong>{line.slice(2, -2)}</strong>
                : line}
            </p>
          ))}
        </div>

        {/* Action cards */}
        {msg.actions?.length > 0 && (
          <div className="w-full mt-1">
            {msg.actions.map((action, i) => (
              <ActionCard key={i} action={action}
                result={msg.results?.[i]} />
            ))}
          </div>
        )}

        {/* Footer: intent badge + timestamp */}
        <div className="flex items-center gap-2 mt-1">
          {/* Intent badge — only on assistant messages */}
          {!isUser && intent && (
            <span className={`text-xs px-2 py-0.5 rounded-full
              font-medium ${intent.bg}`}>
              {intent.icon} {intent.label}
            </span>
          )}
          {msg.timestamp && (
            <p className="text-xs text-gray-400">
              {new Date(msg.timestamp).toLocaleTimeString()}
            </p>
          )}
        </div>
      </div>

      {isUser && (
        <div className="w-8 h-8 rounded-full bg-gray-300 flex
          items-center justify-center text-sm flex-shrink-0 ml-2 mt-1">
          👤
        </div>
      )}
    </div>
  );
}

// ── Typing Indicator ──────────────────────────────────────────────────────────
function TypingIndicator({ lastUserMessage }) {
  const lower = (lastUserMessage || "").toLowerCase();

  // Decide what label to show based on last user message
  const label = lower.includes("how") || lower.includes("what")
    || lower.includes("show") || lower.includes("profit")
    || lower.includes("sales") || lower.includes("revenue")
    || lower.includes("which") || lower.includes("status")
      ? "Querying business data..."
      : lower.includes("create") || lower.includes("make")
      || lower.includes("discount") || lower.includes("campaign")
      || lower.includes("adjust") || lower.includes("run")
        ? "Planning & executing..."
        : "Thinking...";

  return (
    <div className="flex items-center gap-2 text-gray-400 text-sm mb-4">
      <div className="w-8 h-8 rounded-full bg-indigo-100 flex
        items-center justify-center">🤖</div>
      <div className="bg-gray-100 rounded-2xl px-4 py-3">
        <div className="flex gap-1 mb-1">
          {[0, 150, 300].map(d => (
            <span key={d}
              className="animate-bounce text-indigo-500 text-xs"
              style={{ animationDelay: `${d}ms` }}>
              ●
            </span>
          ))}
        </div>
        <p className="text-xs text-gray-400">{label}</p>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ChatAgentPage() {
  const [messages, setMessages] = useState([{
    role: "assistant",
    content: "👋 I'm your **Business Intelligence + Action Agent**.\n\n"
           + "I can:\n"
           + "🔍 Answer any business question with real data\n"
           + "⚙️ Execute business operations\n"
           + "🔥 Do both at once\n\n"
           + "Try: 'What is my profit this week?' or 'Sales are low, fix it'",
    timestamp: new Date(),
  }]);

  const [input, setInput]           = useState("");
  const [loading, setLoading]       = useState(false);
  const [sessionId, setSessionId]   = useState(null);
  const [campaigns, setCampaigns]   = useState([]);
  const [proactiveSuggestions, setProactiveSuggestions] = useState([]);
  const [activeTab, setActiveTab]   = useState("chat");
  const [generatingSuggestions, setGeneratingSuggestions] = useState(false);
  const [campaignFilter, setCampaignFilter] = useState("ACTIVE");
  const messagesEndRef = useRef(null);

  // Track last user message for typing indicator label
  const lastUserMessage = messages
    .filter(m => m.role === "user")
    .slice(-1)[0]?.content ?? "";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadData = useCallback(async () => {
    try {
      const [camRes, sugRes] = await Promise.all([
        getCampaigns(),
        getSuggestions(),
      ]);
      setCampaigns(camRes.data ?? []);
      setProactiveSuggestions(sugRes.data ?? []);
    } catch {}
  }, []);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { loadData(); }, [messages, loadData]);

  const handleCancelCampaign = async (id) => {
    try { await cancelCampaign(id); await loadData(); }
    catch (err) { console.error("Cancel failed:", err); }
  };

  const handleDeleteCampaign = async (id) => {
    try { await deleteCampaign(id); await loadData(); }
    catch (err) { console.error("Delete failed:", err); }
  };

  const handleGenerateSuggestions = async () => {
    setGeneratingSuggestions(true);
    try {
      const res = await generateSuggestions();
      setProactiveSuggestions(res.data ?? []);
    } catch {}
    finally { setGeneratingSuggestions(false); }
  };

  const handleAccept = async (id) => {
    await acceptSuggestion(id); loadData();
  };
  const handleDismiss = async (id) => {
    await dismissSuggestion(id);
    setProactiveSuggestions(prev => prev.filter(s => s.id !== id));
  };

  const sendMessage = async (text) => {
    const userText = text || input.trim();
    if (!userText || loading) return;
    setInput("");
    setLoading(true);

    setMessages(prev => [...prev, {
      role: "user", content: userText, timestamp: new Date()
    }]);

    try {
      const history = messages.slice(-6).map(m => ({
        role: m.role, content: m.content,
      }));
      const response = await sendChatMessage({
        message: userText, history, sessionId,
      });
      const data = response.data;
      if (!sessionId) setSessionId(data.sessionId);

      setMessages(prev => [...prev, {
        role:      "assistant",
        content:   data.message,
        actions:   data.actions,
        results:   data.results,
        intent:    data.intent,
        timestamp: new Date(),
      }]);
    } catch {
      setMessages(prev => [...prev, {
        role:    "assistant",
        content: "❌ Something went wrong. Please try again.",
        timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  const filteredCampaigns = campaigns.filter(c =>
    campaignFilter === "ALL" ? true : c.status === campaignFilter);

  return (
    <div className="flex gap-4" style={{ height: "100%" }}>

      {/* ── Chat Panel ────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-sm
        border border-gray-100 overflow-hidden min-h-0">

        {/* Header */}
        <div className="px-5 py-4 flex justify-between items-center
          bg-gradient-to-r from-indigo-600 to-purple-600 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white bg-opacity-20
              flex items-center justify-center text-xl">🤖</div>
            <div>
              <h1 className="font-bold text-white">
                BI + Action Agent
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs bg-white bg-opacity-20
                  text-white px-2 py-0.5 rounded-full">
                  🔍 Query
                </span>
                <span className="text-xs bg-white bg-opacity-20
                  text-white px-2 py-0.5 rounded-full">
                  ⚙️ Action
                </span>
                <span className="text-xs bg-white bg-opacity-20
                  text-white px-2 py-0.5 rounded-full">
                  🔥 Hybrid
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400
              animate-pulse"/>
            <span className="text-xs text-indigo-200">Active</span>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 min-h-0">
          {messages.map((msg, i) => (
            <ChatBubble key={i} msg={msg} />
          ))}

          {/* Typing indicator with smart label */}
          {loading && (
            <TypingIndicator lastUserMessage={lastUserMessage} />
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggested prompts */}
        {messages.length <= 1 && (
          <div className="px-4 pb-2 flex-shrink-0">
            <div className="flex items-center gap-2 mb-2">
              <p className="text-xs text-gray-400">Try these:</p>
              <span className="text-xs bg-blue-100 text-blue-600
                px-2 py-0.5 rounded-full">🔍 Questions</span>
              <span className="text-xs bg-purple-100 text-purple-600
                px-2 py-0.5 rounded-full">⚙️ Actions</span>
              <span className="text-xs bg-orange-100 text-orange-600
                px-2 py-0.5 rounded-full">🔥 Both</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTIONS_PROMPTS.map((s, i) => (
                <button key={i} onClick={() => sendMessage(s.text)}
                  className="text-xs bg-indigo-50 hover:bg-indigo-100
                    text-indigo-700 px-3 py-1.5 rounded-full border
                    border-indigo-200 transition-colors flex
                    items-center gap-1">
                  <span>{s.icon}</span>
                  <span>{s.text}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="px-4 pb-4 pt-2 border-t border-gray-100
          flex-shrink-0">
          <div className="flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter"
                && !e.shiftKey && sendMessage()}
              placeholder="Ask anything or request an action..."
              disabled={loading}
              className="flex-1 border border-gray-300 rounded-xl px-4
                py-3 text-sm focus:outline-none focus:ring-2
                focus:ring-indigo-500 disabled:opacity-50"
            />
            <button onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              className="bg-indigo-600 hover:bg-indigo-700
                disabled:opacity-50 text-white px-4 py-3
                rounded-xl transition-colors">
              ➤
            </button>
          </div>
        </div>
      </div>

      {/* ── Right Panel ──────────────────────────────────────────────────── */}
      <div className="w-72 flex flex-col gap-3 overflow-y-auto min-h-0">

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl flex-shrink-0">
          {[
            { key: "chat",        label: "🤖 Agent"     },
            { key: "campaigns",   label: "🎯 Campaigns" },
            { key: "suggestions", label: "💡 Insights"  },
          ].map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium
                transition-colors
                ${activeTab === t.key
                  ? "bg-white shadow text-gray-800"
                  : "text-gray-500 hover:text-gray-700"}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Tab: Agent ────────────────────────────────────────────────── */}
        {activeTab === "chat" && (
          <>
            {/* Mode explainer */}
            <div className="bg-white rounded-xl shadow-sm border
              border-gray-100 p-4">
              <h2 className="font-semibold text-gray-700 mb-3 text-sm">
                🧠 3 Intelligence Modes
              </h2>
              <div className="space-y-2">
                {[
                  {
                    icon: "🔍",
                    label: "Query Mode",
                    desc: "Answers questions with real data",
                    color: "bg-blue-50 border-blue-200",
                    examples: ["What is my profit?", "How are my sales?"],
                  },
                  {
                    icon: "⚙️",
                    label: "Action Mode",
                    desc: "Executes business operations",
                    color: "bg-purple-50 border-purple-200",
                    examples: ["Create a campaign", "Adjust stock"],
                  },
                  {
                    icon: "🔥",
                    label: "Hybrid Mode",
                    desc: "Answers + takes action",
                    color: "bg-orange-50 border-orange-200",
                    examples: ["Sales low, fix it", "Help my business"],
                  },
                ].map((m, i) => (
                  <div key={i} className={`rounded-lg border p-2 ${m.color}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span>{m.icon}</span>
                      <span className="text-xs font-semibold
                        text-gray-800">
                        {m.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mb-1">{m.desc}</p>
                    {m.examples.map((e, j) => (
                      <button key={j}
                        onClick={() => sendMessage(e)}
                        disabled={loading}
                        className="text-xs text-gray-600 hover:text-indigo-600
                          block truncate disabled:opacity-50">
                        → "{e}"
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Quick actions */}
            <div className="bg-white rounded-xl shadow-sm border
              border-gray-100 p-4">
              <h2 className="font-semibold text-gray-700 mb-3 text-sm
                flex items-center gap-1">
                <span>⚡</span> Quick Queries
              </h2>
              <div className="space-y-1.5">
                {[
                  { icon: "📊", label: "Today's summary",
                    msg: "Give me today's sales and profit summary" },
                  { icon: "📈", label: "Weekly performance",
                    msg: "How is my business performing this week?" },
                  { icon: "💹", label: "Margin analysis",
                    msg: "Analyze my profit margins and what to improve" },
                  { icon: "🕐", label: "Peak hours",
                    msg: "What are my busiest hours?" },
                  { icon: "🔥", label: "Full audit + fix",
                    msg: "Audit my business and fix the top issues" },
                ].map((q, i) => (
                  <button key={i} onClick={() => sendMessage(q.msg)}
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
          </>
        )}

        {/* ── Tab: Campaigns ────────────────────────────────────────────── */}
        {activeTab === "campaigns" && (
          <div className="bg-white rounded-xl shadow-sm border
            border-gray-100 p-4 flex-1">

            <div className="flex justify-between items-center mb-3">
              <h2 className="font-semibold text-gray-700 text-sm">
                🎯 Campaigns
              </h2>
              <span className="text-xs bg-purple-100 text-purple-700
                px-2 py-0.5 rounded-full font-medium">
                {campaigns.filter(c => c.status === "ACTIVE").length} active
              </span>
            </div>

            {/* POS integration note */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg
              px-3 py-2 mb-3 text-xs text-blue-700">
              <p className="font-medium">🛒 POS Live Sync</p>
              <p className="mt-0.5 opacity-80">
                Stopping a campaign removes the discount
                from POS checkout immediately.
              </p>
            </div>

            {/* Filter */}
            <div className="flex gap-1 mb-3">
              {["ACTIVE", "CANCELLED", "ALL"].map(f => (
                <button key={f} onClick={() => setCampaignFilter(f)}
                  className={`flex-1 py-1 rounded-lg text-xs font-medium
                    transition-colors
                    ${campaignFilter === f
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                  {f === "ALL" ? "All"
                    : f === "ACTIVE" ? "Active"
                    : "Stopped"}
                </button>
              ))}
            </div>

            {/* Campaign list */}
            {filteredCampaigns.length === 0
              ? <div className="text-center py-6">
                  <div className="text-3xl mb-2">🎯</div>
                  <p className="text-xs text-gray-400 mb-3">
                    {campaignFilter === "ACTIVE"
                      ? "No active campaigns."
                      : "No campaigns found."}
                  </p>
                  <button onClick={() => sendMessage(
                      "Create a discount campaign for slow products")}
                    disabled={loading}
                    className="text-xs bg-indigo-600 text-white px-3
                      py-2 rounded-lg disabled:opacity-50">
                    Ask Agent to Create One
                  </button>
                </div>
              : filteredCampaigns.map(c => (
                  <CampaignCard key={c.id} campaign={c}
                    onCancel={handleCancelCampaign}
                    onDelete={handleDeleteCampaign}
                  />
                ))
            }
          </div>
        )}

        {/* ── Tab: Suggestions ─────────────────────────────────────────── */}
        {activeTab === "suggestions" && (
          <div className="bg-white rounded-xl shadow-sm border
            border-gray-100 p-4 flex-1">
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-semibold text-gray-700 text-sm">
                💡 AI Insights
              </h2>
              <button onClick={handleGenerateSuggestions}
                disabled={generatingSuggestions}
                className="text-xs bg-indigo-600 text-white px-2 py-1
                  rounded-lg disabled:opacity-50 hover:bg-indigo-700">
                {generatingSuggestions ? "⏳" : "🔄 Refresh"}
              </button>
            </div>
            {proactiveSuggestions.length === 0
              ? <div className="text-center py-6">
                  <div className="text-3xl mb-2">💡</div>
                  <p className="text-xs text-gray-400 mb-3">
                    Click Refresh to generate AI insights
                  </p>
                  <button onClick={handleGenerateSuggestions}
                    disabled={generatingSuggestions}
                    className="text-xs bg-indigo-600 text-white
                      px-3 py-2 rounded-lg disabled:opacity-50">
                    Generate Insights
                  </button>
                </div>
              : proactiveSuggestions.map(s => (
                  <SuggestionCard key={s.id} suggestion={s}
                    onAccept={handleAccept}
                    onDismiss={handleDismiss}
                    onAction={(text) => {
                      setActiveTab("chat");
                      sendMessage(text);
                    }}
                  />
                ))
            }
          </div>
        )}
      </div>
    </div>
  );
}
