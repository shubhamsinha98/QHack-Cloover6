import { useEffect, useMemo, useRef, useState } from "react";
import { callGPT, callGPTMultiTurn, parseModelJson } from "../lib/openai";
import { getDerivedElectricityMonthlyCost } from "../lib/propertyMetrics";

const OBJECTION_OPTIONS = [
  "The weather is not favourable in my region",
  "I do not want to leave debt to my children and grandchildren",
  "I do not want to change the facade of my building",
  "I am worried the installation will disrupt my home life",
  "I do not think the savings are real enough",
  "I do not trust government subsidies to stay in place",
  "I worry maintenance and repairs will become my problem",
  "I already have a working system, why change now?",
  "My roof is too awkward or shaded for this to work",
  "I do not want sales pressure, I need more time",
];

const PERSONA_OPTIONS = [
  "Skeptical homeowner",
  "Analytical homeowner",
  "Price-sensitive homeowner",
  "Heritage and facade-conscious homeowner",
  "Family legacy focused homeowner",
  "Weather-skeptical homeowner",
];

const objectionPrompt = `You are an elite AI sales coach for German residential clean energy installers.
Return valid JSON only with this shape:
{
  "script": "A concise ready-to-say response in quotes.",
  "why_it_works": "One short paragraph.",
  "follow_up_question": "One practical next question for the homeowner.",
  "risk_to_watch": "One short sentence on what the rep should avoid saying."
}`;

const audioBriefingPrompt = `You are creating a spoken briefing for a German clean energy sales rep.
Return plain text only.
Write a concise audio briefing script that sounds natural when read aloud in under 90 seconds.
Include:
- who the customer is
- the core opportunity
- the biggest objection risks
- the best next talking point
Keep it direct, practical, and conversational.`;

const leadUpdatePrompt = `You extract customer data updates from a sales conversation.
Return valid JSON only with this shape:
{
  "lead_updates": {
    "monthlyEnergyBill": "string or empty",
    "customerAge": "string or empty",
    "householdSize": "string or empty",
    "houseBuildYear": "string or empty",
    "existingAssets": "string or empty",
    "houseType": "string or empty",
    "roofType": "string or empty",
    "floors": "string or empty",
    "electricityUsageTime": "string or empty",
    "customerConcerns": "string or empty"
  },
  "reason": "short explanation"
}
Only include values that are explicitly stated or strongly implied.
If the message contains a euro monthly bill like 450 euros, set monthlyEnergyBill to 450.
Use customerConcerns for objections or qualitative concerns that should be saved to the CRM record.
Use empty strings for fields that are not updated.`;

function Spinner() {
  return <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />;
}

function ChatBubble({ role, content, tone = "default" }) {
  const isUser = role === "user";
  const isCoach = tone === "coach";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[88%] rounded-3xl px-4 py-3 text-sm leading-6 shadow-sm ${
          isUser
            ? "bg-slate-900 text-white"
            : isCoach
              ? "border border-brand-line bg-brand-soft text-slate-800"
              : "border border-slate-200 bg-white text-slate-700"
        }`}
      >
        {content}
      </div>
    </div>
  );
}

function buildCustomerContext(selectedCustomer, leadData, briefing) {
  const activeLead = leadData || {};
  const derivedElectricityMonthlyCost = getDerivedElectricityMonthlyCost(activeLead);
  const parts = [];

  if (selectedCustomer?.customerCode) {
    parts.push(`Customer ID: ${selectedCustomer.customerCode}`);
  }
  if (activeLead.postcode) {
    parts.push(`Postcode: ${activeLead.postcode}`);
  }
  if (activeLead.productInterest) {
    parts.push(`Product interest: ${activeLead.productInterest}`);
  }
  if (activeLead.householdSize) {
    parts.push(`Household size: ${activeLead.householdSize}`);
  }
  if (activeLead.customerAge) {
    parts.push(`Customer age: ${activeLead.customerAge}`);
  }
  if (activeLead.houseType) {
    parts.push(`House type: ${activeLead.houseType}`);
  }
  if (activeLead.roofType) {
    parts.push(`Roof type: ${activeLead.roofType}`);
  }
  parts.push(`Monthly electricity baseline: EUR ${derivedElectricityMonthlyCost}`);
  if (activeLead.existingAssets) {
    parts.push(`Existing assets: ${activeLead.existingAssets}`);
  }
  if (briefing?.market_context?.urgency_level) {
    parts.push(`Urgency level: ${briefing.market_context.urgency_level}`);
  }
  if (briefing?.offers?.length) {
    parts.push(
      `Offer tiers: ${briefing.offers.map((offer) => `${offer.tier} (${offer.assets?.join(", ") || "no assets"})`).join("; ")}`,
    );
  }

  return parts.length ? parts.join(" | ") : "No active customer context.";
}

function getLeadUpdateFallback(messageText) {
  const text = String(messageText || "");
  const lower = text.toLowerCase();
  const amountMatches = [...text.matchAll(/(?:€|eur?\s*)?(\d{2,5})/gi)];
  const latestAmount = amountMatches.length
    ? amountMatches[amountMatches.length - 1][1]
    : "";

  return {
    lead_updates: {
      monthlyEnergyBill:
        /(monthly|energy bill|bill)/i.test(text) && latestAmount ? latestAmount : "",
      customerAge:
        /(age|years old|year-old)/i.test(text) && latestAmount ? latestAmount : "",
      householdSize: "",
      houseBuildYear: "",
      existingAssets: "",
      houseType: "",
      roofType: "",
      floors: "",
      electricityUsageTime: "",
      customerConcerns:
        lower.includes("worry") ||
        lower.includes("concern") ||
        lower.includes("don't want") ||
        lower.includes("do not want") ||
        lower.includes("too")
          ? text.trim()
          : "",
    },
    reason: "Recovered the most likely customer update from the latest coach-chat message.",
  };
}

export default function SalesCoach({ selectedCustomer, leadData, briefing, onApplyLeadUpdates }) {
  const [activeSubTab, setActiveSubTab] = useState("objection");
  const [objection, setObjection] = useState(OBJECTION_OPTIONS[0]);
  const [customObjection, setCustomObjection] = useState("");
  const [responseStyle, setResponseStyle] = useState("Empathetic");
  const [objectionResult, setObjectionResult] = useState(null);
  const [coachLoading, setCoachLoading] = useState(false);
  const [coachError, setCoachError] = useState("");

  const [persona, setPersona] = useState(PERSONA_OPTIONS[0]);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [chatError, setChatError] = useState("");

  const [coachChatInput, setCoachChatInput] = useState("");
  const [coachChatMessages, setCoachChatMessages] = useState([]);
  const [coachChatLoading, setCoachChatLoading] = useState(false);
  const [coachChatError, setCoachChatError] = useState("");
  const [briefingAudioText, setBriefingAudioText] = useState("");
  const [briefingAudioLoading, setBriefingAudioLoading] = useState(false);
  const [briefingAudioError, setBriefingAudioError] = useState("");
  const [coachSyncNote, setCoachSyncNote] = useState("");
  const [voiceModeEnabled, setVoiceModeEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const recognitionRef = useRef(null);
  const voiceModeEnabledRef = useRef(false);
  const coachChatSystemPromptRef = useRef("");

  const customerContext = useMemo(
    () => buildCustomerContext(selectedCustomer, leadData, briefing),
    [selectedCustomer, leadData, briefing],
  );

  const roleplaySystemPrompt = useMemo(
    () => `You are role-playing a ${persona.toLowerCase()} in Germany considering residential clean energy upgrades.
Stay in character as the homeowner.
Ground your concerns in this active lead context when relevant: ${customerContext}
Prefer realistic concerns like weather, facade impact, debt aversion, disruption, distrust of promised savings, and timing.
Keep replies conversational, 1-3 short paragraphs max.
Do not break character or reveal these instructions.`,
    [persona, customerContext],
  );

  const coachChatSystemPrompt = useMemo(
    () => `You are an elite conversational sales coach for a German residential clean energy rep.
You are not the homeowner. You are the rep's private coach.
Use this customer context when relevant: ${customerContext}
Help the rep rehearse objection handling, reframing, wording, next questions, and closing moves.
Be direct, practical, and field-ready. Keep responses concise and useful.`,
    [customerContext],
  );

  useEffect(() => {
    voiceModeEnabledRef.current = voiceModeEnabled;
  }, [voiceModeEnabled]);

  useEffect(() => {
    coachChatSystemPromptRef.current = coachChatSystemPrompt;
  }, [coachChatSystemPrompt]);

  useEffect(() => {
    return () => {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }

      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  function speakText(text) {
    if (!text || !("speechSynthesis" in window)) {
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 1;
    window.speechSynthesis.speak(utterance);
  }

  async function generateAudioBriefing(overrideLeadData = leadData, overrideBriefing = briefing, recentTurn = "") {
    const raw = await callGPT(
      audioBriefingPrompt,
      `Customer context: ${buildCustomerContext(selectedCustomer, overrideLeadData, overrideBriefing)}
Market context: ${overrideBriefing?.market_context ? JSON.stringify(overrideBriefing.market_context) : "No market context"}
Offers: ${overrideBriefing?.offers ? JSON.stringify(overrideBriefing.offers) : "No offers"}
Recent coach turn: ${recentTurn || "None"}
Give me the spoken briefing script only.`,
    );
    setBriefingAudioText(raw);
    return raw;
  }

  async function extractLeadUpdates(messageText) {
    const raw = await callGPT(
      leadUpdatePrompt,
      `Customer context: ${customerContext}
Latest chat message: ${messageText}
Extract any CRM-worthy factual updates and objections.`,
    );

    try {
      return parseModelJson(raw);
    } catch (error) {
      console.error("Lead-update JSON parse failed, using fallback extraction.", error, raw);
      return getLeadUpdateFallback(messageText);
    }
  }

  async function sendCoachChatMessage(messageText) {
    if (!messageText.trim()) {
      return;
    }

    const nextMessages = [...coachChatMessages, { role: "user", content: messageText.trim() }];
    setCoachChatMessages(nextMessages);
    setCoachChatLoading(true);
    setCoachChatError("");
    setCoachSyncNote("");

    try {
      let refreshedLeadData = leadData;
      let refreshedBriefing = briefing;

      const extracted = await extractLeadUpdates(messageText);
      const proposedUpdates = extracted?.lead_updates || {};

      if (onApplyLeadUpdates) {
        const mergedConcerns =
          proposedUpdates.customerConcerns && leadData?.customerConcerns
            ? `${leadData.customerConcerns}; ${proposedUpdates.customerConcerns}`
            : proposedUpdates.customerConcerns || leadData?.customerConcerns || "";

        const normalizedUpdates = {
          ...proposedUpdates,
          customerConcerns: mergedConcerns,
        };

        const hasAnyUpdate = Object.values(normalizedUpdates).some((value) => value);

        if (hasAnyUpdate) {
          const updated = await onApplyLeadUpdates(normalizedUpdates);
          refreshedLeadData = updated?.leadData || refreshedLeadData;
          refreshedBriefing = updated?.briefing || refreshedBriefing;
          setCoachSyncNote(extracted?.reason || "Customer data and briefing updated from the latest chat turn.");
        }
      }

      const assistantReply = await callGPTMultiTurn(coachChatSystemPromptRef.current, nextMessages);
      setCoachChatMessages([...nextMessages, { role: "assistant", content: assistantReply }]);

      const nextAudioText = await generateAudioBriefing(refreshedLeadData, refreshedBriefing, assistantReply);

      if (voiceModeEnabledRef.current) {
        speakText(assistantReply);
        window.setTimeout(() => speakText(nextAudioText), 400);
      }
    } catch (error) {
      console.error(error);
      setCoachChatMessages(nextMessages);
      setCoachChatError(error.message || "Unable to continue coach chat.");
    } finally {
      setCoachChatLoading(false);
    }
  }

  async function handleGetScript() {
    setCoachLoading(true);
    setCoachError("");

    try {
      const effectiveObjection = customObjection.trim() || objection;
      const raw = await callGPT(
        objectionPrompt,
        `Customer context: ${customerContext}
Homeowner objection: ${effectiveObjection}
Response style: ${responseStyle}
Give a field-ready response a German clean-energy rep can say at the door or kitchen table.`,
      );
      setObjectionResult(parseModelJson(raw));
    } catch (error) {
      console.error(error);
      setCoachError(error.message || "Unable to generate script.");
    } finally {
      setCoachLoading(false);
    }
  }

  async function handleStartSession() {
    setSessionLoading(true);
    setChatError("");
    setChatMessages([]);

    try {
      const assistantReply = await callGPTMultiTurn(roleplaySystemPrompt, [
        {
          role: "user",
          content:
            "Begin the role-play. Open with a realistic first statement as the homeowner, grounded in the active lead context if available.",
        },
      ]);

      setChatMessages([{ role: "assistant", content: assistantReply }]);
    } catch (error) {
      console.error(error);
      setChatError(error.message || "Unable to start role-play.");
    } finally {
      setSessionLoading(false);
    }
  }

  async function handleSendMessage(event) {
    event.preventDefault();

    if (!chatInput.trim()) {
      return;
    }

    const nextMessages = [...chatMessages, { role: "user", content: chatInput.trim() }];
    setChatMessages(nextMessages);
    setChatInput("");
    setSessionLoading(true);
    setChatError("");

    try {
      const assistantReply = await callGPTMultiTurn(roleplaySystemPrompt, nextMessages);
      setChatMessages([...nextMessages, { role: "assistant", content: assistantReply }]);
    } catch (error) {
      console.error(error);
      setChatMessages(nextMessages);
      setChatError(error.message || "Unable to continue role-play.");
    } finally {
      setSessionLoading(false);
    }
  }

  async function handleCoachChat(event) {
    event.preventDefault();

    if (!coachChatInput.trim()) {
      return;
    }
    const nextMessage = coachChatInput.trim();
    setCoachChatInput("");
    await sendCoachChatMessage(nextMessage);
  }

  async function handleGenerateAudioBriefing() {
    setBriefingAudioLoading(true);
    setBriefingAudioError("");

    try {
      const raw = await generateAudioBriefing();
      speakText(raw);
    } catch (error) {
      console.error(error);
      setBriefingAudioError(error.message || "Unable to generate audio briefing.");
    } finally {
      setBriefingAudioLoading(false);
    }
  }

  function handleStopAudio() {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }

  function handleVoiceToggle() {
    setVoiceModeEnabled((current) => {
      const next = !current;
      if (!next && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      return next;
    });
  }

  function handleVoiceInput() {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!Recognition) {
      setCoachChatError("Voice input is not supported in this browser.");
      return;
    }

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    const recognition = new Recognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;
    setCoachChatError("");
    setIsListening(true);

    recognition.onresult = async (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript?.trim() || "";
      setIsListening(false);

      if (!transcript) {
        return;
      }

      if (voiceModeEnabledRef.current) {
        await sendCoachChatMessage(transcript);
      } else {
        setCoachChatInput(transcript);
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
      setCoachChatError("Voice capture failed. Try again.");
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  }

  return (
    <section className="mx-auto max-w-6xl rounded-[28px] border border-slate-200 bg-white p-6 shadow-panel sm:p-8">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-deep">Sales coach</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Practice the conversation before you knock on the door.
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            Rehearse tougher objections, practice homeowner role-play, or chat directly with a private coach grounded in the active customer profile.
          </p>
        </div>

        <div className="flex gap-2 rounded-2xl bg-slate-100 p-1">
          {[
            { id: "objection", label: "Objection handler" },
            { id: "roleplay", label: "Role-play" },
            { id: "coach-chat", label: "Coach chat" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSubTab(tab.id)}
              className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                activeSubTab === tab.id ? "bg-brand text-white" : "text-slate-600 hover:bg-white hover:text-slate-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-6 rounded-3xl border border-brand-line bg-brand-soft px-5 py-4 text-sm text-slate-700">
        <span className="font-semibold text-slate-900">Active context:</span> {customerContext}
      </div>

      {coachSyncNote ? (
        <div className="mb-6 rounded-3xl border border-brand-line bg-white px-5 py-4 text-sm text-slate-700">
          <span className="font-semibold text-slate-900">Closed-loop update:</span> {coachSyncNote}
        </div>
      ) : null}

      {activeSubTab === "objection" ? (
        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
            <div className="grid gap-5">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Objection library</span>
                <select
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-brand focus:ring-4 focus:ring-brand-soft"
                  value={objection}
                  onChange={(event) => setObjection(event.target.value)}
                >
                  {OBJECTION_OPTIONS.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Custom objection</span>
                <textarea
                  rows="4"
                  value={customObjection}
                  onChange={(event) => setCustomObjection(event.target.value)}
                  placeholder="Type the exact homeowner concern you want to rehearse..."
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-brand focus:ring-4 focus:ring-brand-soft"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Response style</span>
                <select
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-brand focus:ring-4 focus:ring-brand-soft"
                  value={responseStyle}
                  onChange={(event) => setResponseStyle(event.target.value)}
                >
                  <option>Empathetic</option>
                  <option>Data-driven</option>
                  <option>Storytelling</option>
                  <option>Firm and reassuring</option>
                </select>
              </label>

              <button
                type="button"
                onClick={handleGetScript}
                disabled={coachLoading}
                className="inline-flex items-center justify-center gap-3 rounded-2xl bg-brand px-5 py-4 text-sm font-semibold text-white transition hover:bg-brand-deep disabled:cursor-not-allowed disabled:bg-blue-300"
              >
                {coachLoading ? <Spinner /> : null}
                <span>{coachLoading ? "Generating..." : "Get script"}</span>
              </button>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-5">
            {coachError ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{coachError}</div> : null}

            {objectionResult ? (
              <div className="space-y-5">
                <div className="rounded-3xl border border-brand-line bg-brand-soft px-5 py-5">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-deep">Ready-to-say script</div>
                  <p className="mt-3 text-lg font-medium leading-8 text-slate-900">{objectionResult.script}</p>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-5">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Why it works</div>
                  <p className="mt-3 text-sm leading-7 text-slate-700">{objectionResult.why_it_works}</p>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white px-5 py-5">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Follow-up question</div>
                  <p className="mt-3 text-sm font-medium leading-7 text-slate-900">{objectionResult.follow_up_question}</p>
                </div>

                <div className="rounded-3xl border border-amber-200 bg-amber-50 px-5 py-5">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">Risk to watch</div>
                  <p className="mt-3 text-sm leading-7 text-slate-800">{objectionResult.risk_to_watch}</p>
                </div>
              </div>
            ) : (
              <div className="flex min-h-[280px] items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-6 text-center text-sm leading-6 text-slate-500">
                Pick a richer objection or type your own and Cloover will generate a field-ready response.
              </div>
            )}
          </div>
        </div>
      ) : activeSubTab === "roleplay" ? (
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Homeowner persona</span>
              <select
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-brand focus:ring-4 focus:ring-brand-soft"
                value={persona}
                onChange={(event) => setPersona(event.target.value)}
              >
                {PERSONA_OPTIONS.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </label>

            <button
              type="button"
              onClick={handleStartSession}
              disabled={sessionLoading}
              className="mt-5 inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-brand px-5 py-4 text-sm font-semibold text-white transition hover:bg-brand-deep disabled:cursor-not-allowed disabled:bg-blue-300"
            >
              {sessionLoading ? <Spinner /> : null}
              <span>{sessionLoading ? "Starting..." : "Start session"}</span>
            </button>

            <p className="mt-4 text-sm leading-6 text-slate-500">
              Cloover will stay in character as the homeowner and raise realistic concerns tied to the active customer context.
            </p>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-5">
            {chatError ? <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{chatError}</div> : null}

            <div className="flex min-h-[420px] flex-col justify-between gap-4">
              <div className="space-y-4 overflow-y-auto rounded-3xl border border-slate-200 bg-slate-50 p-4">
                {chatMessages.length ? (
                  chatMessages.map((message, index) => (
                    <ChatBubble key={`${message.role}-${index}`} role={message.role} content={message.content} />
                  ))
                ) : (
                  <div className="flex min-h-[280px] items-center justify-center px-6 text-center text-sm leading-6 text-slate-500">
                    Start a role-play session to open the conversation with a richer homeowner persona.
                  </div>
                )}
              </div>

              <form onSubmit={handleSendMessage} className="flex flex-col gap-3 sm:flex-row">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(event) => setChatInput(event.target.value)}
                  placeholder="Type your pitch or question..."
                  className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-brand focus:ring-4 focus:ring-brand-soft"
                />
                <button
                  type="submit"
                  disabled={sessionLoading || !chatMessages.length}
                  className="inline-flex items-center justify-center gap-3 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {sessionLoading ? <Spinner /> : null}
                  <span>Send</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-slate-900">Direct coach chat</h3>
              <p className="text-sm leading-6 text-slate-600">
                Ask for better phrasing, closing questions, rebuttals, meeting structure, or how to handle a specific moment in the conversation.
              </p>
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-700">
                Examples:
                <div className="mt-2">How do I answer someone who says solar looks ugly on this facade?</div>
                <div>Give me a softer way to talk about financing with a 68-year-old homeowner.</div>
                <div>What is the best follow-up after they say the weather here is too weak?</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-700">
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={handleGenerateAudioBriefing}
                    disabled={briefingAudioLoading}
                    className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-blue-300"
                  >
                    {briefingAudioLoading ? "Generating audio..." : "Play briefing audio"}
                  </button>
                  <button
                    type="button"
                    onClick={handleStopAudio}
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
                  >
                    Stop audio
                  </button>
                  <button
                    type="button"
                    onClick={handleVoiceToggle}
                    className={`rounded-full px-4 py-2 text-sm font-semibold ${
                      voiceModeEnabled ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-700"
                    }`}
                  >
                    {voiceModeEnabled ? "Voice mode on" : "Voice mode off"}
                  </button>
                </div>
                {briefingAudioError ? (
                  <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {briefingAudioError}
                  </div>
                ) : null}
                {briefingAudioText ? (
                  <div className="mt-3 text-xs leading-5 text-slate-500">{briefingAudioText}</div>
                ) : (
                  <div className="mt-3 text-xs leading-5 text-slate-500">
                    Generate a spoken version of the active briefing, then use voice mode to talk directly with the coach.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-5">
            {coachChatError ? <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{coachChatError}</div> : null}

            <div className="flex min-h-[420px] flex-col justify-between gap-4">
              <div className="space-y-4 overflow-y-auto rounded-3xl border border-slate-200 bg-slate-50 p-4">
                {coachChatMessages.length ? (
                  coachChatMessages.map((message, index) => (
                    <ChatBubble
                      key={`${message.role}-${index}`}
                      role={message.role}
                      content={message.content}
                      tone={message.role === "assistant" ? "coach" : "default"}
                    />
                  ))
                ) : (
                  <div className="flex min-h-[280px] items-center justify-center px-6 text-center text-sm leading-6 text-slate-500">
                    Ask the coach anything about the active customer and Cloover will help you shape the conversation.
                  </div>
                )}
              </div>

              <form onSubmit={handleCoachChat} className="flex flex-col gap-3 sm:flex-row">
                <input
                  type="text"
                  value={coachChatInput}
                  onChange={(event) => setCoachChatInput(event.target.value)}
                  placeholder="Ask the coach what to say..."
                  className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-brand focus:ring-4 focus:ring-brand-soft"
                />
                <button
                  type="button"
                  onClick={handleVoiceInput}
                  className={`inline-flex items-center justify-center gap-3 rounded-2xl px-5 py-3 text-sm font-semibold transition ${
                    isListening ? "bg-rose-600 text-white hover:bg-rose-500" : "border border-slate-200 bg-white text-slate-700 hover:border-brand-line"
                  }`}
                >
                  {isListening ? "Listening..." : voiceModeEnabled ? "Talk to coach" : "Use mic"}
                </button>
                <button
                  type="submit"
                  disabled={coachChatLoading}
                  className="inline-flex items-center justify-center gap-3 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {coachChatLoading ? <Spinner /> : null}
                  <span>Send</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
