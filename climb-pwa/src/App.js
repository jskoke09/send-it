import React, { useState, useEffect, useCallback } from "react";

const GRADES = ["VB", "V0", "V1", "V2", "V3", "V4", "V5", "V6", "V7", "V8", "V9", "V10", "V11", "V12"];
const COLORS = ["Red", "Orange", "Yellow", "Green", "Blue", "Purple", "Pink", "White", "Black", "Grey", "Teal", "Brown"];
const ENERGY_LEVELS = ["Exhausted", "Low", "Moderate", "Strong", "Peak"];
const SKIN_CONDITIONS = ["Fresh", "Good", "Tender", "Raw", "Wrecked"];

const defaultSession = () => ({
  id: Date.now(),
  date: new Date().toISOString().split("T")[0],
  gymName: "",
  duration: 60,
  energyBefore: 2,
  energyAfter: 2,
  skinCondition: 1,
  climbs: [],
  notes: "",
  goals: "",
  psychLevel: 3,
});

const defaultClimb = () => ({
  id: Date.now(),
  grade: "V3",
  color: "",
  attempts: 1,
  sent: false,
  flash: false,
  notes: "",
  style: "",
});

// localStorage helpers
const loadSessions = () => {
  try {
    const data = localStorage.getItem("climb-sessions");
    return data ? JSON.parse(data) : [];
  } catch { return []; }
};

const saveSessions = (sessions) => {
  try { localStorage.setItem("climb-sessions", JSON.stringify(sessions)); }
  catch (e) { console.error("Save failed:", e); }
};

const loadGoals = () => {
  try {
    const data = localStorage.getItem("climb-goals");
    return data ? JSON.parse(data) : {
      targetGrade: "V8",
      sessionsPerWeek: 3,
      compDate: "",
      compName: "",
      notes: "Get back to projecting V8-V10. Commit to training on every day off.",
    };
  } catch {
    return { targetGrade: "V8", sessionsPerWeek: 3, compDate: "", compName: "", notes: "Get back to projecting V8-V10. Commit to training on every day off." };
  }
};

const saveGoals = (goals) => {
  try { localStorage.setItem("climb-goals", JSON.stringify(goals)); }
  catch (e) { console.error("Save failed:", e); }
};

// ── Stat helpers ──
const getWeekSessions = (sessions) => {
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  return sessions.filter((s) => new Date(s.date) >= weekAgo);
};

const getStreak = (sessions) => {
  if (!sessions.length) return 0;
  const sorted = [...sessions].sort((a, b) => new Date(b.date) - new Date(a.date));
  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i < 60; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - i);
    const dateStr = checkDate.toISOString().split("T")[0];
    const hasSession = sorted.some((s) => s.date === dateStr);
    if (hasSession) { streak++; } else if (i > 0) { break; }
  }
  return streak;
};

const getHighestSend = (sessions) => {
  let highest = -1;
  sessions.forEach((s) => {
    s.climbs?.forEach((c) => {
      if (c.sent) {
        const idx = GRADES.indexOf(c.grade);
        if (idx > highest) highest = idx;
      }
    });
  });
  return highest >= 0 ? GRADES[highest] : "—";
};

// ── Micro Components ──
const GradeChip = ({ grade, small }) => {
  const idx = GRADES.indexOf(grade);
  const hue = idx <= 2 ? 140 : idx <= 5 ? 45 : idx <= 8 ? 15 : 0;
  const sat = Math.min(70, 30 + idx * 4);
  const light = idx <= 2 ? 35 : idx <= 8 ? 30 : 22;
  return (
    <span style={{
      display: "inline-block", padding: small ? "2px 8px" : "4px 12px", borderRadius: "4px",
      background: `hsl(${hue}, ${sat}%, ${light}%)`, color: "#f0ebe3",
      fontFamily: "'DM Mono', monospace", fontSize: small ? "11px" : "13px", fontWeight: 600, letterSpacing: "0.5px",
    }}>{grade}</span>
  );
};

const StatCard = ({ label, value, sub, accent }) => (
  <div style={{
    background: "rgba(240,235,227,0.04)", border: "1px solid rgba(240,235,227,0.08)",
    borderRadius: "8px", padding: "16px", flex: "1 1 140px", minWidth: "120px",
  }}>
    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "28px", fontWeight: 700, color: accent || "#e8c87a", lineHeight: 1.1 }}>{value}</div>
    <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "1.5px", color: "rgba(240,235,227,0.45)", marginTop: "6px", fontWeight: 600 }}>{label}</div>
    {sub && <div style={{ fontSize: "12px", color: "rgba(240,235,227,0.35)", marginTop: "2px" }}>{sub}</div>}
  </div>
);

const SliderInput = ({ label, value, onChange, labels, max }) => (
  <div style={{ marginBottom: "16px" }}>
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
      <span style={{ fontSize: "12px", color: "rgba(240,235,227,0.6)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px" }}>{label}</span>
      <span style={{ fontSize: "13px", color: "#e8c87a", fontFamily: "'DM Mono', monospace" }}>{labels[value]}</span>
    </div>
    <div style={{ display: "flex", gap: "4px" }}>
      {labels.map((l, i) => (
        <button key={i} onClick={() => onChange(i)} style={{
          flex: 1, padding: "8px 4px",
          background: i <= value ? `rgba(232,200,122,${0.15 + (i / max) * 0.35})` : "rgba(240,235,227,0.04)",
          border: i === value ? "1px solid rgba(232,200,122,0.6)" : "1px solid rgba(240,235,227,0.08)",
          borderRadius: "4px", color: i <= value ? "#e8c87a" : "rgba(240,235,227,0.3)",
          fontSize: "10px", cursor: "pointer", fontFamily: "'DM Mono', monospace", transition: "all 0.2s",
        }}>{l.slice(0, 4)}</button>
      ))}
    </div>
  </div>
);

// ── Main App ──
function App() {
  const [view, setView] = useState("dashboard");
  const [sessions, setSessions] = useState(() => loadSessions());
  const [goals, setGoals] = useState(() => loadGoals());
  const [currentSession, setCurrentSession] = useState(null);
  const [editingClimb, setEditingClimb] = useState(null);
  const [expandedSession, setExpandedSession] = useState(null);

  const persist = useCallback((newSessions) => {
    setSessions(newSessions);
    saveSessions(newSessions);
  }, []);

  const persistGoals = useCallback((newGoals) => {
    setGoals(newGoals);
    saveGoals(newGoals);
  }, []);

  // ── Dashboard View ──
  const renderDashboard = () => {
    const weekSessions = getWeekSessions(sessions);
    const streak = getStreak(sessions);
    const highest = getHighestSend(sessions);
    const totalSends = sessions.reduce((t, s) => t + (s.climbs?.filter((c) => c.sent).length || 0), 0);
    const totalAttempts = sessions.reduce((t, s) => t + (s.climbs?.reduce((a, c) => a + (c.attempts || 1), 0) || 0), 0);
    const weekTarget = goals?.sessionsPerWeek || 3;

    return (
      <div>
        <div style={{ marginBottom: "32px" }}>
          <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "3px", color: "rgba(240,235,227,0.3)", marginBottom: "8px", fontWeight: 600 }}>Session Tracker</div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "36px", fontWeight: 800, color: "#f0ebe3", margin: 0, lineHeight: 1.1 }}>Send It.</h1>
          {goals?.compName && (
            <div style={{ marginTop: "12px", fontSize: "13px", color: "rgba(240,235,227,0.45)" }}>
              Training for <span style={{ color: "#e8c87a" }}>{goals.compName}</span>
              {goals.compDate && <span> · {Math.ceil((new Date(goals.compDate) - new Date()) / 86400000)} days out</span>}
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: "28px" }}>
          <StatCard label="This Week" value={`${weekSessions.length}/${weekTarget}`} accent={weekSessions.length >= weekTarget ? "#7ac87a" : "#e8c87a"} />
          <StatCard label="Streak" value={`${streak}d`} />
          <StatCard label="Highest Send" value={highest} accent="#e89a7a" />
          <StatCard label="Total Sends" value={totalSends} sub={`${totalAttempts} attempts`} />
        </div>

        <div style={{ marginBottom: "28px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
            <span style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "1.5px", color: "rgba(240,235,227,0.4)", fontWeight: 600 }}>Weekly Goal</span>
            <span style={{ fontSize: "12px", color: "#e8c87a", fontFamily: "'DM Mono', monospace" }}>{weekSessions.length} / {weekTarget}</span>
          </div>
          <div style={{ height: "6px", background: "rgba(240,235,227,0.06)", borderRadius: "3px", overflow: "hidden" }}>
            <div style={{
              height: "100%", width: `${Math.min(100, (weekSessions.length / weekTarget) * 100)}%`,
              background: weekSessions.length >= weekTarget ? "linear-gradient(90deg, #7ac87a, #5ab85a)" : "linear-gradient(90deg, #e8c87a, #d4a84a)",
              borderRadius: "3px", transition: "width 0.6s ease",
            }} />
          </div>
        </div>

        {goals?.targetGrade && (
          <div style={{
            background: "rgba(232,200,122,0.06)", border: "1px solid rgba(232,200,122,0.15)",
            borderRadius: "8px", padding: "16px", marginBottom: "28px",
            display: "flex", alignItems: "center", gap: "16px",
          }}>
            <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "1.5px", color: "rgba(240,235,227,0.4)", fontWeight: 600 }}>Target Grade</div>
            <GradeChip grade={goals.targetGrade} />
            {goals.notes && <div style={{ fontSize: "12px", color: "rgba(240,235,227,0.4)", flex: 1 }}>{goals.notes}</div>}
          </div>
        )}

        <button
          onClick={() => { setCurrentSession(defaultSession()); setView("log"); }}
          style={{
            width: "100%", padding: "16px", background: "linear-gradient(135deg, #e8c87a, #d4a84a)",
            border: "none", borderRadius: "8px", color: "#1a1714", fontSize: "15px", fontWeight: 700,
            cursor: "pointer", fontFamily: "'DM Mono', monospace", letterSpacing: "1px", textTransform: "uppercase", marginBottom: "32px",
          }}
        >+ Log New Session</button>

        <div>
          <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "2px", color: "rgba(240,235,227,0.3)", marginBottom: "12px", fontWeight: 600 }}>Recent Sessions</div>
          {sessions.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "rgba(240,235,227,0.25)", fontSize: "14px", border: "1px dashed rgba(240,235,227,0.1)", borderRadius: "8px" }}>
              No sessions yet. Get after it.
            </div>
          ) : (
            [...sessions].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 20).map((session) => {
              const sends = session.climbs?.filter((c) => c.sent).length || 0;
              const total = session.climbs?.length || 0;
              const highestInSession = session.climbs?.filter((c) => c.sent).reduce((h, c) => {
                const idx = GRADES.indexOf(c.grade);
                return idx > GRADES.indexOf(h) ? c.grade : h;
              }, "VB");
              const isExpanded = expandedSession === session.id;

              return (
                <div key={session.id} style={{ marginBottom: "8px" }}>
                  <div
                    onClick={() => setExpandedSession(isExpanded ? null : session.id)}
                    style={{
                      background: "rgba(240,235,227,0.03)", border: "1px solid rgba(240,235,227,0.07)",
                      borderRadius: isExpanded ? "8px 8px 0 0" : "8px", padding: "14px 16px",
                      cursor: "pointer", display: "flex", alignItems: "center", gap: "12px",
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                        <span style={{ fontSize: "14px", color: "#f0ebe3", fontWeight: 600 }}>
                          {new Date(session.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                        </span>
                        {session.gymName && <span style={{ fontSize: "11px", color: "rgba(240,235,227,0.35)" }}>· {session.gymName}</span>}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "12px", color: "rgba(240,235,227,0.4)", fontFamily: "'DM Mono', monospace" }}>{sends}/{total} sent</span>
                        {sends > 0 && <GradeChip grade={highestInSession} small />}
                        <span style={{ fontSize: "12px", color: "rgba(240,235,227,0.3)" }}>{session.duration}min</span>
                      </div>
                    </div>
                    <div style={{ color: "rgba(240,235,227,0.25)", fontSize: "18px", transform: isExpanded ? "rotate(180deg)" : "", transition: "transform 0.2s" }}>▾</div>
                  </div>

                  {isExpanded && (
                    <div style={{
                      background: "rgba(240,235,227,0.02)", border: "1px solid rgba(240,235,227,0.07)",
                      borderTop: "none", borderRadius: "0 0 8px 8px", padding: "16px",
                    }}>
                      <div style={{ display: "flex", gap: "16px", marginBottom: "12px", flexWrap: "wrap" }}>
                        <div style={{ fontSize: "12px", color: "rgba(240,235,227,0.4)" }}>Energy: <span style={{ color: "#e8c87a" }}>{ENERGY_LEVELS[session.energyBefore]} → {ENERGY_LEVELS[session.energyAfter]}</span></div>
                        <div style={{ fontSize: "12px", color: "rgba(240,235,227,0.4)" }}>Skin: <span style={{ color: "#e8c87a" }}>{SKIN_CONDITIONS[session.skinCondition]}</span></div>
                        <div style={{ fontSize: "12px", color: "rgba(240,235,227,0.4)" }}>Psych: <span style={{ color: "#e8c87a" }}>{"★".repeat(session.psychLevel || 3)}{"☆".repeat(5 - (session.psychLevel || 3))}</span></div>
                      </div>

                      {session.climbs?.length > 0 && (
                        <div style={{ marginBottom: "12px" }}>
                          {session.climbs.map((c, i) => (
                            <div key={i} style={{
                              display: "flex", alignItems: "center", gap: "8px", padding: "6px 0",
                              borderBottom: i < session.climbs.length - 1 ? "1px solid rgba(240,235,227,0.05)" : "none",
                            }}>
                              <GradeChip grade={c.grade} small />
                              {c.color && <span style={{ fontSize: "11px", color: "rgba(240,235,227,0.35)" }}>{c.color}</span>}
                              <span style={{ fontSize: "12px", color: c.flash ? "#7ac87a" : c.sent ? "#e8c87a" : "rgba(240,235,227,0.3)", fontFamily: "'DM Mono', monospace" }}>
                                {c.flash ? "⚡ Flash" : c.sent ? "✓ Sent" : "✗ Project"}
                              </span>
                              <span style={{ fontSize: "11px", color: "rgba(240,235,227,0.25)" }}>{c.attempts}att</span>
                              {c.style && <span style={{ fontSize: "11px", color: "rgba(240,235,227,0.25)" }}>{c.style}</span>}
                              {c.notes && <span style={{ fontSize: "11px", color: "rgba(240,235,227,0.2)", fontStyle: "italic", flex: 1, textAlign: "right", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.notes}</span>}
                            </div>
                          ))}
                        </div>
                      )}

                      {session.notes && <div style={{ fontSize: "12px", color: "rgba(240,235,227,0.35)", fontStyle: "italic", marginBottom: "12px" }}>"{session.notes}"</div>}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm("Delete this session?")) {
                            const updated = sessions.filter((s) => s.id !== session.id);
                            persist(updated);
                            setExpandedSession(null);
                          }
                        }}
                        style={{
                          padding: "6px 12px", background: "rgba(200,80,80,0.1)", border: "1px solid rgba(200,80,80,0.2)",
                          borderRadius: "4px", color: "rgba(200,80,80,0.6)", fontSize: "11px", cursor: "pointer", fontFamily: "'DM Mono', monospace",
                        }}
                      >Delete Session</button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  // ── Log Session View ──
  const renderLog = () => {
    if (!currentSession) return null;
    const s = currentSession;

    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "28px" }}>
          <button onClick={() => setView("dashboard")} style={backBtnStyle}>←</button>
          <h2 style={{ ...headingStyle, margin: 0 }}>Log Session</h2>
        </div>

        <div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Date</label>
            <input type="date" value={s.date} onChange={(e) => setCurrentSession({ ...s, date: e.target.value })} style={inputStyle} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Gym</label>
            <input type="text" placeholder="Gym name..." value={s.gymName} onChange={(e) => setCurrentSession({ ...s, gymName: e.target.value })} style={inputStyle} />
          </div>
        </div>

        <div style={{ marginBottom: "16px" }}>
          <label style={labelStyle}>Duration (min)</label>
          <input type="number" value={s.duration} onChange={(e) => setCurrentSession({ ...s, duration: parseInt(e.target.value) || 0 })} style={{ ...inputStyle, width: "100px" }} />
        </div>

        <SliderInput label="Energy Before" value={s.energyBefore} onChange={(v) => setCurrentSession({ ...s, energyBefore: v })} labels={ENERGY_LEVELS} max={4} />
        <SliderInput label="Skin Condition" value={s.skinCondition} onChange={(v) => setCurrentSession({ ...s, skinCondition: v })} labels={SKIN_CONDITIONS} max={4} />

        <div style={{ marginBottom: "20px" }}>
          <label style={labelStyle}>Psych Level</label>
          <div style={{ display: "flex", gap: "6px" }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} onClick={() => setCurrentSession({ ...s, psychLevel: n })} style={{
                width: "36px", height: "36px",
                background: n <= s.psychLevel ? "rgba(232,200,122,0.2)" : "rgba(240,235,227,0.04)",
                border: n <= s.psychLevel ? "1px solid rgba(232,200,122,0.4)" : "1px solid rgba(240,235,227,0.08)",
                borderRadius: "50%", color: n <= s.psychLevel ? "#e8c87a" : "rgba(240,235,227,0.2)", fontSize: "16px", cursor: "pointer",
              }}>★</button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <label style={{ ...labelStyle, marginBottom: 0 }}>Climbs ({s.climbs.length})</label>
            <button onClick={() => setEditingClimb(defaultClimb())} style={{
              padding: "6px 14px", background: "rgba(232,200,122,0.15)", border: "1px solid rgba(232,200,122,0.3)",
              borderRadius: "4px", color: "#e8c87a", fontSize: "12px", cursor: "pointer", fontFamily: "'DM Mono', monospace",
            }}>+ Add Climb</button>
          </div>

          {s.climbs.map((c, i) => (
            <div key={c.id} style={{
              display: "flex", alignItems: "center", gap: "8px", padding: "10px 12px",
              background: "rgba(240,235,227,0.03)", border: "1px solid rgba(240,235,227,0.06)",
              borderRadius: "6px", marginBottom: "6px", cursor: "pointer",
            }} onClick={() => setEditingClimb({ ...c, _index: i })}>
              <GradeChip grade={c.grade} small />
              {c.color && <span style={{ fontSize: "11px", color: "rgba(240,235,227,0.35)" }}>{c.color}</span>}
              <span style={{ fontSize: "12px", color: c.flash ? "#7ac87a" : c.sent ? "#e8c87a" : "rgba(240,235,227,0.35)", fontFamily: "'DM Mono', monospace" }}>
                {c.flash ? "⚡Flash" : c.sent ? "✓ Sent" : "Project"}
              </span>
              <span style={{ fontSize: "11px", color: "rgba(240,235,227,0.25)" }}>{c.attempts}att</span>
              <div style={{ flex: 1 }} />
              <button onClick={(e) => {
                e.stopPropagation();
                const newClimbs = s.climbs.filter((_, j) => j !== i);
                setCurrentSession({ ...s, climbs: newClimbs });
              }} style={{ background: "none", border: "none", color: "rgba(200,80,80,0.5)", cursor: "pointer", fontSize: "14px" }}>✕</button>
            </div>
          ))}
        </div>

        <SliderInput label="Energy After" value={s.energyAfter} onChange={(v) => setCurrentSession({ ...s, energyAfter: v })} labels={ENERGY_LEVELS} max={4} />

        <div style={{ marginBottom: "16px" }}>
          <label style={labelStyle}>Session Notes</label>
          <textarea placeholder="How did it go? What did you learn? What to work on..." value={s.notes} onChange={(e) => setCurrentSession({ ...s, notes: e.target.value })} rows={3} style={{ ...inputStyle, resize: "vertical" }} />
        </div>

        <div style={{ marginBottom: "24px" }}>
          <label style={labelStyle}>Goals for Next Session</label>
          <textarea placeholder="What to focus on next time..." value={s.goals} onChange={(e) => setCurrentSession({ ...s, goals: e.target.value })} rows={2} style={{ ...inputStyle, resize: "vertical" }} />
        </div>

        <button onClick={() => {
          const newSessions = [...sessions.filter((x) => x.id !== s.id), s];
          persist(newSessions);
          setCurrentSession(null);
          setView("dashboard");
        }} style={{
          width: "100%", padding: "16px", background: "linear-gradient(135deg, #7ac87a, #5ab85a)",
          border: "none", borderRadius: "8px", color: "#1a1714", fontSize: "15px", fontWeight: 700,
          cursor: "pointer", fontFamily: "'DM Mono', monospace", letterSpacing: "1px", textTransform: "uppercase",
        }}>Save Session</button>
      </div>
    );
  };

  // ── Climb Editor Modal ──
  const renderClimbModal = () => {
    if (!editingClimb) return null;
    const c = editingClimb;

    return (
      <div onClick={() => setEditingClimb(null)} style={{
        position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(10,9,8,0.85)",
        backdropFilter: "blur(8px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px",
      }}>
        <div onClick={(e) => e.stopPropagation()} style={{
          background: "#1e1b17", border: "1px solid rgba(240,235,227,0.1)", borderRadius: "12px",
          padding: "24px", width: "100%", maxWidth: "400px", maxHeight: "80vh", overflow: "auto",
        }}>
          <h3 style={{ ...headingStyle, fontSize: "18px", marginBottom: "20px" }}>{c._index !== undefined ? "Edit Climb" : "Add Climb"}</h3>

          <label style={labelStyle}>Grade</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginBottom: "16px" }}>
            {GRADES.map((g) => (
              <button key={g} onClick={() => setEditingClimb({ ...c, grade: g })} style={{
                padding: "6px 10px", background: c.grade === g ? "rgba(232,200,122,0.25)" : "rgba(240,235,227,0.04)",
                border: c.grade === g ? "1px solid rgba(232,200,122,0.5)" : "1px solid rgba(240,235,227,0.08)",
                borderRadius: "4px", color: c.grade === g ? "#e8c87a" : "rgba(240,235,227,0.4)",
                fontSize: "12px", cursor: "pointer", fontFamily: "'DM Mono', monospace",
              }}>{g}</button>
            ))}
          </div>

          <label style={labelStyle}>Color Tag</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginBottom: "16px" }}>
            {COLORS.map((col) => (
              <button key={col} onClick={() => setEditingClimb({ ...c, color: c.color === col ? "" : col })} style={{
                padding: "5px 10px", background: c.color === col ? "rgba(232,200,122,0.2)" : "rgba(240,235,227,0.04)",
                border: c.color === col ? "1px solid rgba(232,200,122,0.4)" : "1px solid rgba(240,235,227,0.08)",
                borderRadius: "4px", color: c.color === col ? "#e8c87a" : "rgba(240,235,227,0.35)", fontSize: "11px", cursor: "pointer",
              }}>{col}</button>
            ))}
          </div>

          <label style={labelStyle}>Attempts</label>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
            <button onClick={() => setEditingClimb({ ...c, attempts: Math.max(1, c.attempts - 1) })} style={counterBtnStyle}>−</button>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "20px", color: "#f0ebe3", minWidth: "30px", textAlign: "center" }}>{c.attempts}</span>
            <button onClick={() => setEditingClimb({ ...c, attempts: c.attempts + 1 })} style={counterBtnStyle}>+</button>
          </div>

          <div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
            <button onClick={() => setEditingClimb({ ...c, sent: !c.sent, flash: !c.sent ? c.flash : false })} style={{
              flex: 1, padding: "10px", background: c.sent ? "rgba(232,200,122,0.2)" : "rgba(240,235,227,0.04)",
              border: c.sent ? "1px solid rgba(232,200,122,0.4)" : "1px solid rgba(240,235,227,0.08)",
              borderRadius: "6px", color: c.sent ? "#e8c87a" : "rgba(240,235,227,0.35)", fontSize: "13px", cursor: "pointer", fontWeight: 600,
            }}>✓ Sent</button>
            <button onClick={() => setEditingClimb({ ...c, flash: !c.flash, sent: !c.flash ? true : c.sent, attempts: !c.flash ? 1 : c.attempts })} style={{
              flex: 1, padding: "10px", background: c.flash ? "rgba(122,200,122,0.2)" : "rgba(240,235,227,0.04)",
              border: c.flash ? "1px solid rgba(122,200,122,0.4)" : "1px solid rgba(240,235,227,0.08)",
              borderRadius: "6px", color: c.flash ? "#7ac87a" : "rgba(240,235,227,0.35)", fontSize: "13px", cursor: "pointer", fontWeight: 600,
            }}>⚡ Flash</button>
          </div>

          <label style={labelStyle}>Style</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginBottom: "16px" }}>
            {["Slab", "Overhang", "Vertical", "Roof", "Arete", "Dyno", "Comp Style", "Crimpy", "Juggy", "Techy"].map((st) => (
              <button key={st} onClick={() => setEditingClimb({ ...c, style: c.style === st ? "" : st })} style={{
                padding: "5px 10px", background: c.style === st ? "rgba(232,200,122,0.15)" : "rgba(240,235,227,0.04)",
                border: c.style === st ? "1px solid rgba(232,200,122,0.35)" : "1px solid rgba(240,235,227,0.08)",
                borderRadius: "4px", color: c.style === st ? "#e8c87a" : "rgba(240,235,227,0.3)", fontSize: "11px", cursor: "pointer",
              }}>{st}</button>
            ))}
          </div>

          <label style={labelStyle}>Route Notes</label>
          <textarea placeholder="Beta, holds, crux, what worked..." value={c.notes} onChange={(e) => setEditingClimb({ ...c, notes: e.target.value })} rows={2} style={{ ...inputStyle, resize: "vertical", marginBottom: "20px" }} />

          <button onClick={() => {
            const newClimb = { ...c }; delete newClimb._index;
            let newClimbs;
            if (c._index !== undefined) { newClimbs = [...currentSession.climbs]; newClimbs[c._index] = newClimb; }
            else { newClimbs = [...currentSession.climbs, newClimb]; }
            setCurrentSession({ ...currentSession, climbs: newClimbs });
            setEditingClimb(null);
          }} style={{
            width: "100%", padding: "14px", background: "linear-gradient(135deg, #e8c87a, #d4a84a)",
            border: "none", borderRadius: "8px", color: "#1a1714", fontSize: "14px", fontWeight: 700,
            cursor: "pointer", fontFamily: "'DM Mono', monospace", letterSpacing: "1px", textTransform: "uppercase",
          }}>{c._index !== undefined ? "Update Climb" : "Add Climb"}</button>
        </div>
      </div>
    );
  };

  // ── Goals View ──
  const renderGoals = () => {
    return (
      <div>
        <h2 style={{ ...headingStyle, marginBottom: "24px" }}>Goals & Training</h2>

        <div style={{ marginBottom: "16px" }}>
          <label style={labelStyle}>Target Grade</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
            {GRADES.map((g) => (
              <button key={g} onClick={() => persistGoals({ ...goals, targetGrade: g })} style={{
                padding: "6px 10px", background: goals.targetGrade === g ? "rgba(232,200,122,0.25)" : "rgba(240,235,227,0.04)",
                border: goals.targetGrade === g ? "1px solid rgba(232,200,122,0.5)" : "1px solid rgba(240,235,227,0.08)",
                borderRadius: "4px", color: goals.targetGrade === g ? "#e8c87a" : "rgba(240,235,227,0.4)",
                fontSize: "12px", cursor: "pointer", fontFamily: "'DM Mono', monospace",
              }}>{g}</button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: "16px" }}>
          <label style={labelStyle}>Sessions Per Week Goal</label>
          <div style={{ display: "flex", gap: "6px" }}>
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <button key={n} onClick={() => persistGoals({ ...goals, sessionsPerWeek: n })} style={{
                width: "40px", height: "40px",
                background: goals.sessionsPerWeek === n ? "rgba(232,200,122,0.25)" : "rgba(240,235,227,0.04)",
                border: goals.sessionsPerWeek === n ? "1px solid rgba(232,200,122,0.5)" : "1px solid rgba(240,235,227,0.08)",
                borderRadius: "6px", color: goals.sessionsPerWeek === n ? "#e8c87a" : "rgba(240,235,227,0.35)",
                fontSize: "16px", cursor: "pointer", fontFamily: "'DM Mono', monospace", fontWeight: 700,
              }}>{n}</button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: "16px" }}>
          <label style={labelStyle}>Competition Name</label>
          <input type="text" placeholder="Competition name..." value={goals.compName} onChange={(e) => persistGoals({ ...goals, compName: e.target.value })} style={inputStyle} />
        </div>

        <div style={{ marginBottom: "16px" }}>
          <label style={labelStyle}>Competition Date</label>
          <input type="date" value={goals.compDate} onChange={(e) => persistGoals({ ...goals, compDate: e.target.value })} style={inputStyle} />
        </div>

        <div style={{ marginBottom: "16px" }}>
          <label style={labelStyle}>Training Notes / Motivation</label>
          <textarea placeholder="Your why, training plans, mantras..." value={goals.notes} onChange={(e) => persistGoals({ ...goals, notes: e.target.value })} rows={4} style={{ ...inputStyle, resize: "vertical" }} />
        </div>

        {sessions.length > 0 && (
          <div style={{ marginTop: "28px" }}>
            <label style={labelStyle}>Grade Progression (Sends)</label>
            <div style={{ display: "flex", gap: "3px", alignItems: "flex-end", height: "100px", marginTop: "8px" }}>
              {GRADES.map((g) => {
                const count = sessions.reduce((t, s) => t + (s.climbs?.filter((c) => c.sent && c.grade === g).length || 0), 0);
                const maxCount = Math.max(1, ...GRADES.map((gr) => sessions.reduce((t, s) => t + (s.climbs?.filter((c) => c.sent && c.grade === gr).length || 0), 0)));
                const height = count > 0 ? Math.max(8, (count / maxCount) * 100) : 0;
                const idx = GRADES.indexOf(g);
                const hue = idx <= 2 ? 140 : idx <= 5 ? 45 : idx <= 8 ? 15 : 0;
                return (
                  <div key={g} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                    <span style={{ fontSize: "9px", color: "rgba(240,235,227,0.3)", fontFamily: "'DM Mono', monospace" }}>{count || ""}</span>
                    <div style={{
                      width: "100%", height: `${height}%`,
                      background: count > 0 ? `hsl(${hue}, 50%, 40%)` : "rgba(240,235,227,0.04)",
                      borderRadius: "3px 3px 0 0", minHeight: count > 0 ? "8px" : "2px", transition: "height 0.4s ease",
                    }} />
                    <span style={{ fontSize: "8px", color: "rgba(240,235,227,0.25)", fontFamily: "'DM Mono', monospace" }}>{g.replace("V", "")}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={rootStyle}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=DM+Mono:wght@400;500&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <div style={{ minHeight: "100vh", overflowY: "auto", WebkitOverflowScrolling: "touch", padding: "24px 20px 100px" }}>
        {view === "dashboard" && renderDashboard()}
        {view === "log" && renderLog()}
        {view === "goals" && renderGoals()}
      </div>
      {renderClimbModal()}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, display: "flex",
        background: "rgba(26,23,20,0.95)", backdropFilter: "blur(12px)",
        borderTop: "1px solid rgba(240,235,227,0.08)", zIndex: 50,
        paddingBottom: "env(safe-area-inset-bottom)",
      }}>
        {[
          { id: "dashboard", label: "Home", icon: "◈" },
          { id: "log", label: "Log", icon: "+" },
          { id: "goals", label: "Goals", icon: "◎" },
        ].map((tab) => (
          <button key={tab.id} onClick={() => {
            if (tab.id === "log" && !currentSession) setCurrentSession(defaultSession());
            setView(tab.id);
          }} style={{
            flex: 1, padding: "12px 0 14px", background: "none", border: "none",
            color: view === tab.id ? "#e8c87a" : "rgba(240,235,227,0.3)", cursor: "pointer",
            display: "flex", flexDirection: "column", alignItems: "center", gap: "4px",
          }}>
            <span style={{ fontSize: "20px" }}>{tab.icon}</span>
            <span style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px", fontFamily: "'DM Mono', monospace" }}>{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

const rootStyle = { minHeight: "100vh", background: "#1a1714", color: "#f0ebe3", fontFamily: "'DM Sans', sans-serif", position: "relative" };
const headingStyle = { fontFamily: "'Playfair Display', serif", fontSize: "22px", fontWeight: 700, color: "#f0ebe3" };
const labelStyle = { display: "block", fontSize: "11px", textTransform: "uppercase", letterSpacing: "1.5px", color: "rgba(240,235,227,0.4)", marginBottom: "8px", fontWeight: 600 };
const inputStyle = { width: "100%", padding: "10px 12px", background: "rgba(240,235,227,0.04)", border: "1px solid rgba(240,235,227,0.1)", borderRadius: "6px", color: "#f0ebe3", fontSize: "14px", fontFamily: "'DM Sans', sans-serif", outline: "none", boxSizing: "border-box" };
const backBtnStyle = { width: "36px", height: "36px", background: "rgba(240,235,227,0.06)", border: "1px solid rgba(240,235,227,0.1)", borderRadius: "8px", color: "#f0ebe3", fontSize: "18px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" };
const counterBtnStyle = { width: "36px", height: "36px", background: "rgba(240,235,227,0.06)", border: "1px solid rgba(240,235,227,0.1)", borderRadius: "8px", color: "#e8c87a", fontSize: "18px", cursor: "pointer", fontWeight: 700 };

export default App;
