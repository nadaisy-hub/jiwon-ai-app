import React, { useState, useEffect, useRef, useCallback } from "react";

const STORAGE_KEY = "jiwon-ai-data-v1";

const getStorage = () => {
  if (typeof window === "undefined") return null;
  if (window.storage && typeof window.storage.get === "function" && typeof window.storage.set === "function") {
    return window.storage;
  }

  return {
    async get(key) {
      try {
        const value = localStorage.getItem(key);
        return { value };
      } catch {
        return { value: null };
      }
    },
    async set(key, value) {
      try {
        localStorage.setItem(key, value);
        return true;
      } catch {
        return false;
      }
    },
  };
};

const ROLES = {
  parent: { label: "보호자 (부모)", short: "보호자", color: "#6B4FA0", canSeeGuardianOnly: true },
  teacher: { label: "특수학교 교사", short: "교사", color: "#2F6B8A", canSeeGuardianOnly: false },
  aide: { label: "활동지원사", short: "활동지원", color: "#A0527A", canSeeGuardianOnly: false },
  daycare: { label: "주간활동센터", short: "센터", color: "#7A6B2F", canSeeGuardianOnly: false },
};

const CAT_STYLE = {
  "식사": { bg: "#EEF4E6", fg: "#4A6329" },
  "건강": { bg: "#FBEAE4", fg: "#9A4326" },
  "행동": { bg: "#E8EFF6", fg: "#2F5A7E" },
  "의사소통": { bg: "#F0E9F6", fg: "#5E4390" },
  "수면": { bg: "#E9EEF0", fg: "#3E5A63" },
  "이동": { bg: "#F5EFE2", fg: "#7A5F1E" },
  "기타": { bg: "#EDEDEA", fg: "#55574F" },
};

const daysAgo = (n, h = 10, m = 0) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};

function seedData() {
  return {
    child: { name: "지원", age: 14, note: "자폐성 장애, 지적장애 동반 · 특수학교 중학부 2학년" },
    profile: [
      { id: "p1", category: "안전", critical: true, content: "땅콩·견과류 알레르기 — 섭취 시 두드러기와 호흡곤란 위험. 간식 제공 전 반드시 성분 확인." },
      { id: "p2", category: "안전", critical: true, content: "발작(경련) 이력 있음. 발작 시: 주변 위험물 치우고 옆으로 눕히기, 입에 아무것도 넣지 않기, 5분 이상 지속되면 119. 발작 후 보호자에게 즉시 연락." },
      { id: "p3", category: "의료", critical: true, content: "항경련제 아침·저녁 복용 중 (등교 전 복용 완료 상태로 등교). 낮 시간 추가 복용 없음." },
      { id: "p4", category: "의사소통", critical: false, content: "짧은 문장은 이해하지만 표현은 단어 위주. 그림카드(AAC 앱 '마이토키') 병용. '싫어요'를 손을 좌우로 흔드는 동작으로 표현." },
      { id: "p5", category: "감각", critical: false, content: "큰 소리(사이렌, 확성기)에 매우 민감 — 귀를 막고 주저앉을 수 있음. 소음 예상 시 미리 헤드폰 착용시키기." },
      { id: "p6", category: "선호", critical: false, content: "좋아하는 것: 기차 영상, 파란색, 바나나. 싫어하는 것: 갑작스러운 일정 변경 (변경 시 그림 일정표로 미리 안내)." },
    ],
    entries: [
      { id: "e1", role: "parent", author: "엄마", occurredAt: daysAgo(3, 8, 20), categories: ["수면", "행동"], visibility: "all", raw: "어제 밤에 11시 넘어서 잠들었어요. 아침에 좀 피곤해 보여요.", structured: "전날 밤 11시 이후 늦게 취침함. 아침 기상 시 피로한 모습 — 낮 동안 컨디션 관찰 필요." },
      { id: "e2", role: "teacher", author: "김선생님", occurredAt: daysAgo(3, 14, 30), categories: ["행동", "의사소통"], visibility: "all", raw: "오늘 음악 시간에 새로운 악기 소리에 처음엔 귀를 막았지만, 옆에서 소리를 줄여주니 탬버린을 직접 흔들었습니다. 큰 진전이에요.", structured: "음악 수업 중 새 악기 소리에 처음 귀를 막았으나, 음량을 낮춰주자 탬버린을 스스로 연주함. 소리 자극에 대한 점진적 수용의 긍정적 신호.", },
      { id: "e3", role: "daycare", author: "박선생님", occurredAt: daysAgo(2, 16, 0), categories: ["식사", "건강"], visibility: "all", raw: "간식으로 나온 새 과자를 거부했어요. 오후에 오른쪽 귀를 자주 만졌습니다.", structured: "오후 간식(신규 과자) 거부. 오른쪽 귀를 반복적으로 만지는 행동 관찰 — 중이염 이력이 있어 지속 시 진료 권장.", alert: "오른쪽 귀 만지는 행동 반복 — 건강 이상 징후 가능성" },
      { id: "e4", role: "parent", author: "엄마", occurredAt: daysAgo(1, 20, 10), categories: ["건강"], visibility: "all", raw: "귀 만지는 얘기 듣고 이비인후과 다녀왔어요. 초기 중이염이래요. 항생제 5일치 처방받았고 아침저녁 집에서 먹여요. 낮에는 약 없어요.", structured: "이비인후과 진료 결과 초기 중이염 진단. 항생제 5일분 처방 — 아침·저녁 가정에서 복용, 낮 시간 복용 없음. 귀에 물 들어가지 않게 주의." },
      { id: "e5", role: "aide", author: "이지원사님", occurredAt: daysAgo(1, 17, 40), categories: ["이동", "행동"], visibility: "all", raw: "하교 후 공원 산책했는데 구급차 사이렌 소리에 놀라서 주저앉았어요. 헤드폰 씌워주니 금방 진정됐습니다.", structured: "하교 후 산책 중 구급차 사이렌에 놀라 주저앉음. 휴대한 헤드폰 착용 후 빠르게 진정 — 외출 시 헤드폰 상시 지참이 효과적임을 재확인." },
      { id: "e6", role: "parent", author: "엄마", occurredAt: daysAgo(0, 8, 0), categories: ["건강", "기타"], visibility: "all", raw: "오늘 아침 약(항경련제+항생제) 먹였어요. 컨디션 좋아 보여요. 다음주 화요일 오후에 치과 예약 있어서 그날은 센터 일찍 하원해요.", structured: "아침 약(항경련제·항생제) 복용 완료, 컨디션 양호. 다음주 화요일 오후 치과 예약으로 당일 센터 조기 하원 예정." },
    ],
    briefings: {},
  };
}

async function callClaude(system, messages, maxTokens = 1000) {
  try {
    const res = await fetch("/api/claude", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ system, messages, max_tokens: maxTokens }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(text || "AI API 호출에 실패했습니다.");
    }

    const data = await res.json();
    if (!data?.text) throw new Error("AI 응답이 비어 있습니다.");
    return data.text;
  } catch {
    return fallbackClaudeReply(system, messages);
  }
}

const fallbackClaudeReply = (system, messages) => {
  const lastUser = [...(messages || [])].reverse().find((m) => m.role === "user")?.content || "";
  const raw = String(lastUser).replace(/^돌봄자 메모:\s*"?|"?$/g, "").trim();
  const lowerSystem = String(system || "").toLowerCase();

  if (lowerSystem.includes("json")) {
    const structured = raw ? `${raw.slice(0, 100)} — 오늘의 돌봄 기록을 간단하고 명확하게 정리했습니다.` : "오늘의 돌봄 기록을 간단하고 명확하게 정리했습니다.";
    return JSON.stringify({ categories: ["기타"], structured, polished: fallbackPolishedMessage(raw), alert: null });
  }

  if (lowerSystem.includes("브리핑")) {
    return "· 안전과 건강 정보를 우선 확인하세요.\n· 오늘의 컨디션과 약 복용 상태를 체크하세요.\n· 소음에 민감하면 미리 헤드폰과 예고를 준비하세요.\n· 일정 변경이 있으면 그림 일정표로 알려 주세요.";
  }

  if (raw) {
    return `기록을 보면 ${raw.slice(0, 140)} 와 관련된 부분이 중요해 보입니다. 특히 안전과 일상 루틴을 함께 확인하는 것이 가장 중요합니다.`;
  }

  return "기록을 확인했습니다. 안전과 일상 루틴을 우선으로 점검해 주세요.";
};

const fallbackPolishedMessage = (raw) => {
  if (!raw) return "보호자님, 안녕하세요. 오늘 전달드릴 특이사항은 없습니다. 감사합니다.";
  const diaper = raw.match(/([가-힣]+?)(?:이|가)\s*오늘\s*(?:기저귀가|기저귀)\s*다\s*떨어졌/);
  if (diaper) return `보호자님, 안녕하세요. ${diaper[1]}이가 사용할 기저귀가 모두 소진되었습니다. 새 기저귀 한 통을 보내주시면 감사하겠습니다. 좋은 하루 보내세요.`;
  const cleaned = raw
    .replace(/^(야|저기|있잖아)[,\s]*/g, "")
    .replace(/(?:말해줘|말씀해줘|전해줘)[.?!]?/g, "")
    .replace(/\s+/g, " ")
    .replace(/[.!?]+$/g, "")
    .trim();
  return `보호자님, 안녕하세요. ${cleaned}에 관하여 안내드립니다. 확인해 주시면 감사하겠습니다. 좋은 하루 보내세요.`;
};

const stripJson = (t) => {
  const text = String(t ?? "");
  const cleaned = text.replace(/```json|```/g, "").trim();
  const s = cleaned.indexOf("{");
  const e = cleaned.lastIndexOf("}");
  if (s === -1 || e === -1 || e < s) throw new Error("JSON 형식이 올바르지 않습니다");
  return JSON.parse(cleaned.slice(s, e + 1));
};

const fmtDate = (iso) => {
  const d = new Date(iso);
  const today = new Date();
  const diff = Math.floor((new Date(today.toDateString()) - new Date(d.toDateString())) / 86400000);
  const time = `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
  if (diff === 0) return `오늘 ${time}`;
  if (diff === 1) return `어제 ${time}`;
  return `${d.getMonth() + 1}/${d.getDate()} ${time}`;
};

function visibleEntries(data, role) {
  return data.entries.filter((e) => e.visibility !== "guardian" || ROLES[role].canSeeGuardianOnly);
}

function buildContext(data, role) {
  const prof = data.profile
    .map((p) => `[${p.category}${p.critical ? "·중요" : ""}] ${p.content}`)
    .join("\n");
  const ent = visibleEntries(data, role)
    .slice()
    .sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt))
    .slice(0, 30)
    .map((e) => `(${fmtDate(e.occurredAt)}, ${ROLES[e.role].short} ${e.author}) ${e.structured}`)
    .join("\n");
  return { prof, ent };
}

const Chip = ({ cat }) => {
  const s = CAT_STYLE[cat] || CAT_STYLE["기타"];
  return (
    <span style={{ background: s.bg, color: s.fg, borderRadius: 20, padding: "2px 9px", fontSize: 11.5, fontWeight: 600 }}>
      {cat}
    </span>
  );
};

const RoleBadge = ({ role, author }) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: "#55574F", fontWeight: 600 }}>
    <span style={{ width: 8, height: 8, borderRadius: 4, background: ROLES[role].color }} />
    {ROLES[role].short} · {author}
  </span>
);

const Spinner = ({ text }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#6B7A6F", fontSize: 13.5, padding: "10px 2px" }}>
    <span className="jw-spin" style={{ width: 14, height: 14, border: "2px solid #C9D6CC", borderTopColor: "#2F6B54", borderRadius: 8, display: "inline-block" }} />
    {text}
  </div>
);

export default function App() {
  const [data, setData] = useState(null);
  const [role, setRole] = useState(null);
  const [tab, setTab] = useState("home");
  const [loadErr, setLoadErr] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const storage = getStorage();
        if (!storage) {
          setData(seedData());
          return;
        }

        const r = await storage.get(STORAGE_KEY);
        const saved = r?.value ? JSON.parse(r.value) : null;
        setData(saved ?? seedData());

        if (!saved) {
          try {
            await storage.set(STORAGE_KEY, JSON.stringify(seedData()));
          } catch {
            setLoadErr(true);
          }
        }
      } catch {
        const seeded = seedData();
        setData(seeded);
        try {
          const storage = getStorage();
          if (storage) await storage.set(STORAGE_KEY, JSON.stringify(seeded));
        } catch {
          setLoadErr(true);
        }
      }
    })();
  }, []);

  const save = useCallback(async (next) => {
    setData(next);
    try {
      const storage = getStorage();
      if (storage) await storage.set(STORAGE_KEY, JSON.stringify(next));
      else setLoadErr(true);
    } catch {
      setLoadErr(true);
    }
  }, []);

  const resetAll = async () => {
    const fresh = seedData();
    await save(fresh);
    setTab("home");
  };

  if (!data) {
    return (
      <Frame>
        <div style={{ padding: 60, textAlign: "center", color: "#6B7A6F" }}>불러오는 중…</div>
      </Frame>
    );
  }

  if (!role) {
    return (
      <Frame>
        <RolePicker onPick={setRole} child={data.child} />
      </Frame>
    );
  }

  return (
    <Frame>
      <Header child={data.child} role={role} onSwitchRole={() => setRole(null)} />
      <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
        {tab === "home" && <Home data={data} role={role} save={save} />}
        {tab === "journal" && <Journal data={data} role={role} save={save} />}
        {tab === "ask" && <Ask data={data} role={role} />}
        {tab === "profile" && <Profile data={data} role={role} save={save} onReset={resetAll} />}
      </div>
      <TabBar tab={tab} setTab={setTab} />
      {loadErr && (
        <div style={{ position: "absolute", bottom: 70, left: 12, right: 12, background: "#FBF3E4", color: "#7A5F1E", borderRadius: 12, padding: "8px 12px", fontSize: 12.5 }}>
          저장소 연결에 실패해 데이터가 이 화면에서만 유지됩니다.
        </div>
      )}
    </Frame>
  );
}

const Frame = ({ children }) => (
  <div style={{ minHeight: "100vh", background: "#EDF1EC", display: "flex", justifyContent: "center", fontFamily: "'Apple SD Gothic Neo','Pretendard','Noto Sans KR',sans-serif" }}>
    <style>{`
      * { box-sizing: border-box; margin: 0; }
      .jw-spin { animation: jwspin 0.8s linear infinite; }
      @keyframes jwspin { to { transform: rotate(360deg); } }
      textarea, input { font-family: inherit; }
      button { font-family: inherit; cursor: pointer; }
      @media (prefers-reduced-motion: reduce) { .jw-spin { animation-duration: 2s; } }
    `}</style>
    <div style={{ width: "100%", maxWidth: 460, minHeight: "100vh", background: "#F6F8F4", display: "flex", flexDirection: "column", position: "relative" }}>
      {children}
    </div>
  </div>
);

function RolePicker({ onPick, child }) {
  return (
    <div style={{ padding: "56px 24px 32px", display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
      <div style={{ width: 76, height: 76, borderRadius: 26, background: "linear-gradient(150deg,#3D7A61,#2A5443)", display: "flex", alignItems: "center", justifyContent: "center", color: "#F2F7F0", fontSize: 32, fontWeight: 800, marginBottom: 18 }}>
        지
      </div>
      <h1 style={{ fontSize: 26, fontWeight: 800, color: "#22332C", lineHeight: 1.3 }}>
        {child.name}이를 함께<br />돌보는 분이시군요
      </h1>
      <p style={{ color: "#5C6B60", fontSize: 14.5, lineHeight: 1.6, marginBottom: 20 }}>
        오늘 어떤 역할로 오셨나요? 역할에 따라 볼 수 있는 기록의 범위가 달라져요. 모든 접근은 보호자의 승인 아래 이루어지고 기록으로 남습니다.
      </p>
      {Object.entries(ROLES).map(([key, r]) => (
        <button key={key} onClick={() => onPick(key)} style={{ display: "flex", alignItems: "center", gap: 14, background: "#FFFFFF", border: "1.5px solid #DDE5DC", borderRadius: 16, padding: "15px 18px", fontSize: 15.5, fontWeight: 700, color: "#2C3A31", textAlign: "left" }}>
          <span style={{ width: 12, height: 12, borderRadius: 6, background: r.color, flexShrink: 0 }} />
          {r.label}
          {key === "parent" && <span style={{ marginLeft: "auto", fontSize: 11.5, color: "#6B7A6F", fontWeight: 600 }}>관리자</span>}
        </button>
      ))}
      <p style={{ marginTop: "auto", fontSize: 12, color: "#8A968C", lineHeight: 1.55 }}>
        프로토타입입니다 — 실제 서비스에서는 초대·본인인증을 거친 사용자만 접근할 수 있습니다.
      </p>
    </div>
  );
}

function Header({ child, role, onSwitchRole }) {
  return (
    <div style={{ padding: "16px 20px 12px", display: "flex", alignItems: "center", gap: 12, background: "#F6F8F4", borderBottom: "1px solid #E2E8E0" }}>
      <div style={{ width: 42, height: 42, borderRadius: 15, background: "linear-gradient(150deg,#3D7A61,#2A5443)", display: "flex", alignItems: "center", justifyContent: "center", color: "#F2F7F0", fontSize: 19, fontWeight: 800 }}>
        지
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 17, fontWeight: 800, color: "#22332C" }}>{child.name}이 AI</div>
        <div style={{ fontSize: 12, color: "#6B7A6F" }}>{child.note}</div>
      </div>
      <button onClick={onSwitchRole} style={{ background: "#FFFFFF", border: "1px solid #DDE5DC", borderRadius: 20, padding: "6px 12px", fontSize: 12, fontWeight: 700, color: ROLES[role].color }}>
        {ROLES[role].short} ▾
      </button>
    </div>
  );
}

function Home({ data, role, save }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const todayKey = `${new Date().toDateString()}-${role}`;
  const briefing = data.briefings[todayKey];
  const alerts = visibleEntries(data, role).filter((e) => e.alert && Date.now() - new Date(e.occurredAt) < 3 * 86400000);
  const criticals = data.profile.filter((p) => p.critical);

  const makeBriefing = async () => {
    setBusy(true);
    setErr(null);
    try {
      const { prof, ent } = buildContext(data, role);
      const text = await callClaude(
        `너는 발달장애 청소년 '지원'이의 돌봄 인수인계 도우미다. 지금 인수인계를 받는 사람은 ${ROLES[role].label}이다.
아래 프로필과 최근 기록을 바탕으로, 오늘 지원이를 돌보기 전에 꼭 알아야 할 것을 브리핑하라.
규칙: 기록에 있는 내용만 사용. 4~6개의 짧은 항목으로, 각 항목은 한 문장. 가장 중요한 안전·건강 사항을 맨 위에. 항목 앞에 '·' 사용. 인사말이나 맺음말 없이 항목만 출력.`,
        [{ role: "user", content: `[프로필]\n${prof}\n\n[최근 기록]\n${ent}\n\n오늘의 인수인계 브리핑을 작성해줘.` }],
        600,
      );
      await save({ ...data, briefings: { ...data.briefings, [todayKey]: { text, at: new Date().toISOString() } } });
    } catch {
      setErr("브리핑 생성에 실패했어요. 네트워크 확인 후 다시 시도해 주세요.");
    }
    setBusy(false);
  };

  return (
    <div style={{ padding: "18px 20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
      {alerts.length > 0 && (
        <div style={{ background: "#FBF3E4", border: "1px solid #EAD9B0", borderRadius: 16, padding: "13px 16px" }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#7A5F1E", marginBottom: 6 }}>지금 주의할 것</div>
          {alerts.map((a) => (
            <div key={a.id} style={{ fontSize: 13.5, color: "#6B531A", lineHeight: 1.55 }}>
              · {a.alert} <span style={{ color: "#A08B4E", fontSize: 12 }}>({fmtDate(a.occurredAt)})</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ background: "#FFFFFF", border: "1px solid #E2E8E0", borderRadius: 18, padding: "16px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ fontSize: 15.5, fontWeight: 800, color: "#22332C" }}>오늘의 인수인계 브리핑</div>
          {briefing && (
            <button onClick={makeBriefing} disabled={busy} style={{ background: "none", border: "none", fontSize: 12.5, color: "#2F6B54", fontWeight: 700 }}>
              새로고침
            </button>
          )}
        </div>
        {busy ? (
          <Spinner text="최근 기록을 정리하는 중…" />
        ) : briefing ? (
          <div style={{ fontSize: 14.5, color: "#33413A", lineHeight: 1.75, whiteSpace: "pre-wrap" }}>{briefing.text}</div>
        ) : (
          <>
            <p style={{ fontSize: 13.5, color: "#6B7A6F", lineHeight: 1.6, marginBottom: 12 }}>
              최근 기록을 바탕으로 {ROLES[role].label}님이 오늘 알아야 할 내용을 한 장으로 정리해 드려요.
            </p>
            <button onClick={makeBriefing} style={{ width: "100%", background: "#2F6B54", color: "#F2F7F0", border: "none", borderRadius: 13, padding: "13px 0", fontSize: 15, fontWeight: 800 }}>
              브리핑 받기
            </button>
          </>
        )}
        {err && <div style={{ marginTop: 8, fontSize: 12.5, color: "#9A4326" }}>{err}</div>}
      </div>

      <div style={{ background: "#FFFFFF", border: "1px solid #E2E8E0", borderRadius: 18, padding: "16px 18px" }}>
        <div style={{ fontSize: 15.5, fontWeight: 800, color: "#22332C", marginBottom: 10 }}>항상 기억해 주세요</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {criticals.map((p) => (
            <div key={p.id} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <span style={{ marginTop: 5, width: 7, height: 7, borderRadius: 4, background: "#B9452C", flexShrink: 0 }} />
              <div style={{ fontSize: 13.5, color: "#33413A", lineHeight: 1.6 }}>{p.content}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Journal({ data, role, save }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [guardianOnly, setGuardianOnly] = useState(false);
  const [err, setErr] = useState(null);
  const authorName = { parent: "엄마", teacher: "김선생님", aide: "이지원사님", daycare: "박선생님" }[role];
  const [listening, setListening] = useState(false);
  const [voiceError, setVoiceError] = useState(null);
  const recognitionRef = useRef(null);
  const toggleVoice = () => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      setVoiceError("이 브라우저에서는 음성 입력을 지원하지 않아요. Chrome 또는 Edge에서 시도해 주세요.");
      return;
    }
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const recognition = new Recognition();
    recognition.lang = "ko-KR";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onstart = () => { setVoiceError(null); setListening(true); };
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results).map((result) => result[0].transcript).join(" ");
      setText((current) => `${current}${current ? " " : ""}${transcript}`.trim());
    };
    recognition.onerror = (event) => {
      setListening(false);
      setVoiceError(event.error === "not-allowed" ? "마이크 사용 권한이 필요해요." : "음성을 듣지 못했어요. 다시 시도해 주세요.");
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
  };

  useEffect(() => () => recognitionRef.current?.stop(), []);

  const addEntry = async () => {
    if (!text.trim() || busy) return;
    setBusy(true);
    setErr(null);
    try {
      const out = await callClaude(
        `너는 발달장애 아동 돌봄 기록을 정리하는 도우미다. 돌봄자가 말하거나 적은 날것의 메모를 인수인계용 기록과 보호자에게 바로 보낼 메시지로 각각 새롭게 작성한다.
반드시 아래 JSON 형식으로만 응답하라. 다른 텍스트, 마크다운 금지.
      {"categories": ["식사"|"건강"|"행동"|"의사소통"|"수면"|"이동"|"기타" 중 1~3개], "structured": "다른 돌봄자가 읽을 것을 전제로 한 격식 있는 1~2문장 정리", "polished": "보호자에게 바로 보낼 수 있는 자연스럽고 정중한 2~4문장 메시지", "alert": "다른 돌봄자가 즉시 주의해야 할 사항이 있으면 한 문장, 없으면 null"}
      작성 규칙:
      - 원문 문장 구조, 말투, 어순을 그대로 유지하거나 직역하지 말고 핵심 의미와 사실만 보존하여 문장을 새로 구성한다.
      - 반말, 구어체, 명령조, 반복 표현은 모두 제거하고 격식 있는 문어체로 작성한다.
      - 보호자 메시지는 상황에 맞는 자연스러운 인사말로 시작하고, 필요한 요청이나 안내를 분명하게 전달한 뒤 부담스럽지 않은 감사 또는 마무리 인사로 끝낸다.
      - 원문에 없는 사실, 감정, 약속, 날짜는 추가하지 않는다. 호칭이 불명확하면 '보호자님'을 사용한다.`,
        [{ role: "user", content: `돌봄자 메모: "${text.trim()}"` }],
        400,
      );
      const parsed = stripJson(out);
      const entry = {
        id: `e${Date.now()}`,
        role,
        author: authorName,
        occurredAt: new Date().toISOString(),
        categories: (parsed.categories || ["기타"]).filter((c) => CAT_STYLE[c]),
        visibility: guardianOnly ? "guardian" : "all",
        raw: text.trim(),
        structured: parsed.structured || text.trim(),
        polished: parsed.polished || fallbackPolishedMessage(text.trim()),
        ...(parsed.alert ? { alert: parsed.alert } : {}),
      };
      if (entry.categories.length === 0) entry.categories = ["기타"];
      await save({ ...data, entries: [...data.entries, entry], briefings: {} });
      setText("");
      setGuardianOnly(false);
    } catch {
      setErr("기록 정리에 실패했어요. 잠시 후 다시 시도해 주세요.");
    }
    setBusy(false);
  };

  const list = visibleEntries(data, role).slice().sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt));

  return (
    <div style={{ padding: "18px 20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ background: "#FFFFFF", border: "1px solid #E2E8E0", borderRadius: 18, padding: "14px 16px" }}>
        <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={`오늘 있었던 일을 편하게 적어 주세요.\n예) "점심 반찬 새로운 거 잘 먹었어요. 낮잠은 안 잤어요."`} rows={3} style={{ width: "100%", border: "none", outline: "none", resize: "none", fontSize: 14.5, lineHeight: 1.6, color: "#22332C", background: "transparent" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
          <button onClick={toggleVoice} disabled={busy} aria-label="음성으로 입력" style={{ display: "flex", alignItems: "center", gap: 5, background: listening ? "#FBEAE4" : "#F0F3EF", border: "none", borderRadius: 10, padding: "8px 10px", fontSize: 12.5, color: listening ? "#9A4326" : "#2F6B54", fontWeight: 800 }}>
            <span style={{ fontSize: 15 }}>{listening ? "■" : "●"}</span>{listening ? "듣는 중" : "말로 입력"}
          </button>
          {role === "parent" && (
            <button onClick={() => setGuardianOnly(!guardianOnly)} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", fontSize: 12.5, color: guardianOnly ? "#6B4FA0" : "#8A968C", fontWeight: 700, padding: 0 }}>
              <span style={{ width: 15, height: 15, borderRadius: 5, border: `1.5px solid ${guardianOnly ? "#6B4FA0" : "#B8C2BA"}`, background: guardianOnly ? "#6B4FA0" : "transparent", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 10 }}>
                {guardianOnly ? "✓" : ""}
              </span>
              보호자만 보기
            </button>
          )}
          <button onClick={addEntry} disabled={busy || !text.trim()} style={{ marginLeft: "auto", background: text.trim() ? "#2F6B54" : "#C9D6CC", color: "#F2F7F0", border: "none", borderRadius: 12, padding: "9px 20px", fontSize: 14, fontWeight: 800 }}>
            {busy ? "정리 중…" : "기록 남기기"}
          </button>
        </div>
        {busy && <Spinner text="AI가 기록을 인수인계용으로 정리하고 있어요…" />}
        {listening && <div style={{ marginTop: 6, fontSize: 12.5, color: "#2F6B54" }}>편하게 말씀해 주세요. 말씀을 마치면 격식 있는 문장으로 정리해 드려요.</div>}
        {voiceError && <div style={{ marginTop: 6, fontSize: 12.5, color: "#9A4326" }}>{voiceError}</div>}
        {err && <div style={{ marginTop: 6, fontSize: 12.5, color: "#9A4326" }}>{err}</div>}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {list.map((e) => (
          <div key={e.id} style={{ background: "#FFFFFF", border: "1px solid #E2E8E0", borderRadius: 16, padding: "13px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
              <RoleBadge role={e.role} author={e.author} />
              <span style={{ marginLeft: "auto", fontSize: 11.5, color: "#8A968C" }}>{fmtDate(e.occurredAt)}</span>
            </div>
            <div style={{ fontSize: 14, color: "#33413A", lineHeight: 1.65 }}>{e.structured}</div>
            {e.polished && (
              <div style={{ marginTop: 10, background: "#F0F6F1", borderRadius: 12, padding: "10px 12px" }}>
                <div style={{ fontSize: 11.5, color: "#5C6B60", fontWeight: 800, marginBottom: 4 }}>보호자에게 보낼 문장</div>
                <div style={{ fontSize: 13.5, color: "#2F5E47", lineHeight: 1.65 }}>{e.polished}</div>
              </div>
            )}
            {e.alert && (
              <div style={{ marginTop: 7, fontSize: 12.5, color: "#7A5F1E", background: "#FBF3E4", borderRadius: 9, padding: "6px 10px" }}>
                주의 · {e.alert}
              </div>
            )}
            <div style={{ display: "flex", gap: 5, marginTop: 9, flexWrap: "wrap" }}>
              {e.categories.map((c) => <Chip key={c} cat={c} />)}
              {e.visibility === "guardian" && (
                <span style={{ background: "#F0E9F6", color: "#5E4390", borderRadius: 20, padding: "2px 9px", fontSize: 11.5, fontWeight: 600 }}>보호자만</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Ask({ data, role }) {
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, busy]);

  const suggestions = ["요즘 지원이 어때요?", "밥은 잘 먹고 있나요?", "발작하면 어떻게 해야 해요?", "제가 처음인데 브리핑해 주세요"];

  const send = async (q) => {
    const question = (q ?? input).trim();
    if (!question || busy) return;
    setInput("");
    const nextMsgs = [...msgs, { role: "user", content: question }];
    setMsgs(nextMsgs);
    setBusy(true);
    try {
      const { prof, ent } = buildContext(data, role);
      const answer = await callClaude(
        `너는 발달장애 청소년 '지원'이의 돌봄 기록 도우미 '지원이 AI'다. 질문자는 ${ROLES[role].label}이다.
규칙:
- 아래 프로필과 기록에 있는 내용만 근거로 답한다. 기록에 없으면 "그 부분은 아직 기록이 없어요"라고 말한다.
- 의료적 판단이나 진단은 하지 않는다. 기록된 사실과 보호자가 정한 대응법만 전달한다.
- 답변에 근거가 된 기록의 날짜와 작성자를 자연스럽게 언급한다. 예: "어제 박선생님 기록을 보면…"
- 따뜻하고 간결하게, 3~5문장 이내로 답한다.

[지원이 프로필]
${prof}

[최근 돌봄 기록 — 최신순]
${ent}`,
        nextMsgs.map((m) => ({ role: m.role, content: m.content })),
        700,
      );
      setMsgs([...nextMsgs, { role: "assistant", content: answer }]);
    } catch {
      setMsgs([...nextMsgs, { role: "assistant", content: "죄송해요, 지금 답변을 만들지 못했어요. 잠시 후 다시 물어봐 주세요." }]);
    }
    setBusy(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100%", padding: "18px 20px 14px" }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
        {msgs.length === 0 && (
          <div style={{ marginTop: 8 }}>
            <p style={{ fontSize: 14.5, color: "#5C6B60", lineHeight: 1.65, marginBottom: 14 }}>
              지원이에 대해 궁금한 걸 편하게 물어보세요. 여러 돌봄 선생님들이 남긴 기록을 바탕으로 대답해 드려요.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {suggestions.map((s) => (
                <button key={s} onClick={() => send(s)} style={{ textAlign: "left", background: "#FFFFFF", border: "1px solid #DDE5DC", borderRadius: 14, padding: "11px 15px", fontSize: 14, color: "#2C3A31", fontWeight: 600 }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "88%" }}>
            <div style={{ background: m.role === "user" ? "#2F6B54" : "#FFFFFF", color: m.role === "user" ? "#F2F7F0" : "#33413A", border: m.role === "user" ? "none" : "1px solid #E2E8E0", borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px", padding: "11px 15px", fontSize: 14.5, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
              {m.content}
            </div>
          </div>
        ))}
        {busy && <Spinner text="기록을 살펴보는 중…" />}
        <div ref={endRef} />
      </div>
      <div style={{ display: "flex", gap: 8, paddingTop: 12, position: "sticky", bottom: 0, background: "#F6F8F4" }}>
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") send(); }} placeholder="지원이에게 물어보기…" style={{ flex: 1, border: "1.5px solid #DDE5DC", borderRadius: 14, padding: "12px 15px", fontSize: 14.5, outline: "none", background: "#FFFFFF", color: "#22332C" }} />
        <button onClick={() => send()} disabled={busy || !input.trim()} style={{ background: input.trim() ? "#2F6B54" : "#C9D6CC", color: "#F2F7F0", border: "none", borderRadius: 14, padding: "0 18px", fontSize: 14.5, fontWeight: 800 }}>
          전송
        </button>
      </div>
    </div>
  );
}

function Profile({ data, role, save, onReset }) {
  const [adding, setAdding] = useState(false);
  const [newCat, setNewCat] = useState("안전");
  const [newContent, setNewContent] = useState("");
  const [newCritical, setNewCritical] = useState(false);
  const isParent = role === "parent";
  const cats = ["안전", "의료", "의사소통", "감각", "선호"];
  const grouped = cats.map((c) => ({ cat: c, items: data.profile.filter((p) => p.category === c) })).filter((g) => g.items.length);

  const addFact = async () => {
    if (!newContent.trim()) return;
    const fact = { id: `p${Date.now()}`, category: newCat, critical: newCritical, content: newContent.trim() };
    await save({ ...data, profile: [...data.profile, fact], briefings: {} });
    setNewContent(""); setNewCritical(false); setAdding(false);
  };

  const removeFact = async (id) => {
    await save({ ...data, profile: data.profile.filter((p) => p.id !== id), briefings: {} });
  };

  return (
    <div style={{ padding: "18px 20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
      <p style={{ fontSize: 13.5, color: "#6B7A6F", lineHeight: 1.6 }}>
        지원이를 처음 만나는 분도 꼭 알아야 할, 항상 유효한 정보예요. 빨간 점은 안전과 직결된 항목이라 모든 답변과 브리핑에 반드시 포함돼요.
      </p>
      {grouped.map((g) => (
        <div key={g.cat} style={{ background: "#FFFFFF", border: "1px solid #E2E8E0", borderRadius: 18, padding: "15px 17px" }}>
          <div style={{ fontSize: 14.5, fontWeight: 800, color: "#22332C", marginBottom: 10 }}>{g.cat}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
            {g.items.map((p) => (
              <div key={p.id} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <span style={{ marginTop: 6, width: 7, height: 7, borderRadius: 4, background: p.critical ? "#B9452C" : "#B8C2BA", flexShrink: 0 }} />
                <div style={{ fontSize: 13.5, color: "#33413A", lineHeight: 1.6, flex: 1 }}>{p.content}</div>
                {isParent && (
                  <button onClick={() => removeFact(p.id)} style={{ background: "none", border: "none", color: "#B8C2BA", fontSize: 15, padding: "0 2px", lineHeight: 1 }}>×</button>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {isParent && !adding && (
        <button onClick={() => setAdding(true)} style={{ background: "#FFFFFF", border: "1.5px dashed #B8C2BA", borderRadius: 16, padding: "13px 0", fontSize: 14, fontWeight: 700, color: "#2F6B54" }}>
          + 프로필 정보 추가
        </button>
      )}
      {isParent && adding && (
        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8E0", borderRadius: 18, padding: "15px 17px", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {cats.map((c) => (
              <button key={c} onClick={() => setNewCat(c)} style={{ background: newCat === c ? "#2F6B54" : "#F0F3EF", color: newCat === c ? "#F2F7F0" : "#55574F", border: "none", borderRadius: 20, padding: "6px 13px", fontSize: 12.5, fontWeight: 700 }}>
                {c}
              </button>
            ))}
          </div>
          <textarea value={newContent} onChange={(e) => setNewContent(e.target.value)} placeholder="예) 물을 무서워해요. 세면 시 미리 말로 알려주고 천천히 진행해 주세요." rows={2} style={{ border: "1px solid #DDE5DC", borderRadius: 12, padding: "10px 12px", fontSize: 14, outline: "none", resize: "none", lineHeight: 1.6, color: "#22332C" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={() => setNewCritical(!newCritical)} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", fontSize: 12.5, color: newCritical ? "#B9452C" : "#8A968C", fontWeight: 700, padding: 0 }}>
              <span style={{ width: 15, height: 15, borderRadius: 5, border: `1.5px solid ${newCritical ? "#B9452C" : "#B8C2BA"}`, background: newCritical ? "#B9452C" : "transparent", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 10 }}>
                {newCritical ? "✓" : ""}
              </span>
              안전 필수 항목
            </button>
            <button onClick={() => setAdding(false)} style={{ marginLeft: "auto", background: "none", border: "none", fontSize: 13.5, color: "#8A968C", fontWeight: 700 }}>취소</button>
            <button onClick={addFact} disabled={!newContent.trim()} style={{ background: newContent.trim() ? "#2F6B54" : "#C9D6CC", color: "#F2F7F0", border: "none", borderRadius: 11, padding: "8px 18px", fontSize: 13.5, fontWeight: 800 }}>
              저장
            </button>
          </div>
        </div>
      )}

      <button onClick={onReset} style={{ marginTop: 8, background: "none", border: "none", fontSize: 12.5, color: "#8A968C", textDecoration: "underline" }}>
        데모 데이터 초기화
      </button>
    </div>
  );
}

function TabBar({ tab, setTab }) {
  const tabs = [
    { key: "home", label: "브리핑", icon: "◆" },
    { key: "journal", label: "기록", icon: "✎" },
    { key: "ask", label: "물어보기", icon: "💬" },
    { key: "profile", label: "프로필", icon: "☰" },
  ];
  return (
    <div style={{ display: "flex", borderTop: "1px solid #E2E8E0", background: "#FCFDFB" }}>
      {tabs.map((t) => (
        <button key={t.key} onClick={() => setTab(t.key)} style={{ flex: 1, background: "none", border: "none", padding: "10px 0 12px", display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
          <span style={{ fontSize: 16, opacity: tab === t.key ? 1 : 0.35 }}>{t.icon}</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: tab === t.key ? "#2F6B54" : "#9AA69C" }}>{t.label}</span>
        </button>
      ))}
    </div>
  );
}
