'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Footer from '@/components/Footer';
import {
  SCOREBOARD_URL,
  ROUND_LABELS,
  ROUND_RADII,
  type Match,
  type BracketNode,
  parseScoreboard,
  buildBracket,
  flattenBracket,
  topScorers,
  aliveTeamIds,
  matchWinnerId,
  etDateString,
  formatKickoffET,
  formatMoneyLine,
  matchScoreLabel,
} from './worldcup';

const REFRESH_MS = 60_000;

function Flag({ src, abbrev, size = 22 }: { src: string; abbrev: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: size,
          height: Math.round(size * 0.72),
          borderRadius: 3,
          background: 'var(--surface-hover)',
          color: 'var(--text-muted)',
          fontSize: size * 0.34,
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        {abbrev === 'TBD' ? '?' : abbrev.slice(0, 3)}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={abbrev}
      width={size}
      height={Math.round(size * 0.72)}
      style={{ objectFit: 'contain', borderRadius: 3, flexShrink: 0 }}
      onError={() => setFailed(true)}
    />
  );
}

// A single match node on the bracket wheel: two team rows (flag · abbrev · score).
function BracketMatchNode({
  node,
  selected,
  onSelect,
}: {
  node: BracketNode;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const m = node.match;
  const isFinal = node.round === 'final';
  const w = isFinal ? 118 : 92;
  const h = isFinal ? 74 : 58;
  const live = m?.state === 'in';
  const winner = m ? matchWinnerId(m) : null;

  const row = (team: Match['home'] | undefined, score: number | null, dy: number) => {
    const decided = team?.decided;
    const isWinner = decided && winner !== null && winner === team!.id;
    const dimmed = winner !== null && decided && winner !== team!.id;
    return (
      <g transform={`translate(0 ${dy})`} opacity={dimmed ? 0.45 : 1}>
        {team?.logo && decided ? (
          <image
            href={team.logo}
            x={-w / 2 + 7}
            y={-8}
            width={22}
            height={16}
            preserveAspectRatio="xMidYMid meet"
          />
        ) : (
          <rect x={-w / 2 + 7} y={-7} width={22} height={14} rx={3} fill="var(--surface-hover)" />
        )}
        <text
          x={-w / 2 + 34}
          y={4.5}
          fontSize={isFinal ? 14 : 12.5}
          fontWeight={isWinner ? 800 : 600}
          fill="var(--text-primary)"
        >
          {decided ? team!.abbrev : 'TBD'}
        </text>
        <text
          x={w / 2 - 9}
          y={4.5}
          fontSize={isFinal ? 14 : 12.5}
          fontWeight={isWinner ? 800 : 600}
          fill={live ? 'var(--accent-warm)' : 'var(--text-secondary)'}
          textAnchor="end"
        >
          {score === null ? '' : score}
        </text>
      </g>
    );
  };

  return (
    <g
      transform={`translate(${node.x} ${node.y})`}
      onClick={() => m && onSelect(m.id)}
      style={{ cursor: m ? 'pointer' : 'default' }}
      className={live ? 'wc-node wc-node-live' : 'wc-node'}
    >
      <rect
        x={-w / 2}
        y={-h / 2}
        width={w}
        height={h}
        rx={12}
        fill="var(--surface-raised)"
        stroke={selected ? 'var(--accent-primary)' : live ? 'var(--accent-warm)' : 'var(--border)'}
        strokeWidth={selected || live ? 2.5 : 1.2}
      />
      {row(m?.home, m?.homeScore ?? null, -h / 4)}
      <line
        x1={-w / 2 + 7}
        y1={0}
        x2={w / 2 - 7}
        y2={0}
        stroke="var(--border-subtle)"
        strokeWidth={1}
      />
      {row(m?.away, m?.awayScore ?? null, h / 4)}
      {live && (
        <circle cx={w / 2 - 6} cy={-h / 2 + 6} r={4} fill="var(--accent-warm)" className="wc-pulse" />
      )}
    </g>
  );
}

function CircularBracket({
  matches,
  selectedId,
  onSelect,
}: {
  matches: Match[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const root = useMemo(() => buildBracket(matches), [matches]);
  const nodes = useMemo(() => flattenBracket(root), [root]);

  const connectors: { key: string; x1: number; y1: number; x2: number; y2: number }[] = [];
  for (const n of nodes) {
    for (const c of n.children) {
      if (c) connectors.push({ key: `${n.round}-${c.match?.id ?? c.angle}`, x1: c.x, y1: c.y, x2: n.x, y2: n.y });
    }
  }

  return (
    <div className="wc-bracket-wrap">
      <svg viewBox="0 0 1000 1000" className="wc-bracket-svg" role="img" aria-label="World Cup knockout bracket">
        {(['r32', 'r16', 'qf', 'sf'] as const).map((r) => (
          <circle
            key={r}
            cx={500}
            cy={500}
            r={ROUND_RADII[r]}
            fill="none"
            stroke="var(--border-subtle)"
            strokeDasharray="3 7"
          />
        ))}
        {connectors.map((c) => (
          <line key={c.key} x1={c.x1} y1={c.y1} x2={c.x2} y2={c.y2} stroke="var(--border)" strokeWidth={1.2} />
        ))}
        {nodes.map((n, i) => (
          <BracketMatchNode
            key={n.match?.id ?? `empty-${i}`}
            node={n}
            selected={n.match?.id === selectedId}
            onSelect={onSelect}
          />
        ))}
        <text x={500} y={556} textAnchor="middle" fontSize={12} fontWeight={700} fill="var(--text-muted)" letterSpacing={2}>
          FINAL
        </text>
      </svg>
    </div>
  );
}

function TeamLine({ team, score, winner, live }: { team: Match['home']; score: number | null; winner: boolean; live: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', minWidth: 0 }}>
      <Flag src={team.decided ? team.logo : ''} abbrev={team.abbrev} size={26} />
      <span
        style={{
          fontWeight: winner ? 800 : 600,
          fontSize: '1rem',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {team.decided ? team.name : 'TBD'}
      </span>
      <span style={{ marginLeft: 'auto', fontWeight: 800, fontSize: '1.15rem', color: live ? 'var(--accent-warm)' : 'var(--text-primary)' }}>
        {score ?? ''}
      </span>
    </div>
  );
}

function MatchDetail({ match }: { match: Match }) {
  const winner = matchWinnerId(match);
  const statusLabel =
    match.state === 'in'
      ? `LIVE · ${match.clock || match.statusDetail}`
      : match.state === 'post'
        ? `Full time${match.homeShootout !== null ? ` · ${match.homeShootout}–${match.awayShootout} on penalties` : ''}`
        : formatKickoffET(match.date, { withDate: true });

  const goalsFor = (teamId: string) =>
    match.goals.filter((g) => (g.ownGoal ? g.teamId !== teamId : g.teamId === teamId));

  return (
    <div className="card wc-detail">
      <div className="wc-detail-status">
        <span className={match.state === 'in' ? 'wc-live-badge' : 'wc-round-badge'}>
          {match.state === 'in' ? '● LIVE' : ROUND_LABELS[match.round]}
        </span>
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{statusLabel}</span>
      </div>

      <div className="wc-detail-teams">
        <TeamLine team={match.home} score={match.homeScore} winner={winner === match.home.id} live={match.state === 'in'} />
        <TeamLine team={match.away} score={match.awayScore} winner={winner === match.away.id} live={match.state === 'in'} />
      </div>

      {match.goals.length > 0 && (
        <div className="wc-detail-goals">
          {[match.home, match.away].map((team) => (
            <div key={team.id || team.abbrev}>
              {goalsFor(team.id).map((g, i) => (
                <div key={i} style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  ⚽ {g.scorer} {g.minute}
                  {g.penalty ? ' (pen)' : ''}
                  {g.ownGoal ? ' (og)' : ''}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      <div className="wc-detail-meta">
        {(match.venue || match.city) && (
          <span>📍 {[match.venue, match.city].filter(Boolean).join(' · ')}</span>
        )}
        {match.broadcasts.length > 0 && <span>📺 {match.broadcasts.join(', ')}</span>}
      </div>

      {match.odds && match.state === 'pre' && (
        <div className="wc-odds-row">
          <span className="wc-odds-pill">
            {match.home.abbrev} {formatMoneyLine(match.odds.homeMoneyLine)}
          </span>
          <span className="wc-odds-pill">Draw {formatMoneyLine(match.odds.drawMoneyLine)}</span>
          <span className="wc-odds-pill">
            {match.away.abbrev} {formatMoneyLine(match.odds.awayMoneyLine)}
          </span>
          {match.odds.overUnder !== null && <span className="wc-odds-pill">O/U {match.odds.overUnder}</span>}
          {match.odds.provider && (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', alignSelf: 'center' }}>
              via {match.odds.provider}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default function WorldCupPage() {
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [aliveOnly, setAliveOnly] = useState(true);
  const didAutoSelect = useRef(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(SCOREBOARD_URL, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const parsed = parseScoreboard(await res.json());
      setMatches(parsed);
      setUpdatedAt(new Date());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, REFRESH_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') load();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [load]);

  const now = new Date();
  const todayET = etDateString(now);

  const liveMatches = useMemo(() => (matches ?? []).filter((m) => m.state === 'in'), [matches]);
  const todayMatches = useMemo(
    () => (matches ?? []).filter((m) => etDateString(m.date) === todayET),
    [matches, todayET]
  );
  const nextMatch = useMemo(
    () => (matches ?? []).find((m) => m.state === 'pre' && m.date.getTime() > now.getTime()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [matches, updatedAt]
  );
  const upNextGroup = useMemo(() => {
    if (todayMatches.length > 0 || !nextMatch) return null;
    const day = etDateString(nextMatch.date);
    return (matches ?? []).filter((m) => etDateString(m.date) === day);
  }, [matches, todayMatches, nextMatch]);

  const scorers = useMemo(() => (matches ? topScorers(matches, 12) : []), [matches]);
  const visibleScorers = aliveOnly ? scorers.filter((s) => s.alive) : scorers;
  const alive = useMemo(() => (matches ? aliveTeamIds(matches) : null), [matches]);

  const played = (matches ?? []).filter((m) => m.state === 'post').length;
  const totalGoals = (matches ?? []).reduce(
    (sum, m) => sum + (m.homeScore ?? 0) + (m.awayScore ?? 0),
    0
  );
  const bronzeMatch = (matches ?? []).find((m) => m.round === 'bronze');
  const finalMatch = (matches ?? []).find((m) => m.round === 'final');
  const championId = finalMatch ? matchWinnerId(finalMatch) : null;
  const champion =
    championId && finalMatch
      ? championId === finalMatch.home.id
        ? finalMatch.home
        : finalMatch.away
      : null;

  // Auto-select the most interesting match once: live > next up > final.
  useEffect(() => {
    if (didAutoSelect.current || !matches) return;
    const pick = liveMatches[0] ?? nextMatch ?? finalMatch;
    if (pick) {
      setSelectedId(pick.id);
      didAutoSelect.current = true;
    }
  }, [matches, liveMatches, nextMatch, finalMatch]);

  const selectedMatch = (matches ?? []).find((m) => m.id === selectedId) ?? null;
  const stripMatches = todayMatches.length > 0 ? todayMatches : upNextGroup ?? [];
  const stripTitle =
    todayMatches.length > 0
      ? 'Today in the Cup'
      : nextMatch
        ? `Up Next · ${formatKickoffET(nextMatch.date, { withDate: true }).split(' · ')[0]}`
        : 'Matches';

  return (
    <main>
      <div className="page-bg" />

      <div className="container">
        <div className="page-header">
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
            <Link href="/projects" style={{ color: 'var(--accent-secondary)' }}>Projects</Link>
            {' / '}World Cup Tracker
          </p>
          <h1 className="section-title">
            <span className="gradient-text">World Cup 2026 Tracker</span>
          </h1>
          <p className="section-subtitle" style={{ marginBottom: 0 }}>
            Live bracket, scores, kickoff times (ET), venues, and odds — refreshed every minute from ESPN.
          </p>
        </div>

        <div className="wc-status-bar">
          {liveMatches.length > 0 && (
            <span className="wc-live-badge">
              ● {liveMatches.length} LIVE
            </span>
          )}
          {updatedAt && (
            <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
              Updated {formatKickoffET(updatedAt)}
            </span>
          )}
          <button className="wc-refresh-btn" onClick={load}>Refresh</button>
          {error && (
            <span style={{ color: 'var(--accent-orange)', fontSize: '0.82rem' }}>
              Couldn&apos;t reach the scores feed ({error}) — retrying every minute
            </span>
          )}
        </div>

        {champion && (
          <div className="card card-accent-gold" style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1.5rem' }}>
            <span style={{ fontSize: '1.6rem' }}>🏆</span>
            <Flag src={champion.logo} abbrev={champion.abbrev} size={32} />
            <span style={{ fontWeight: 800, fontSize: '1.15rem' }}>{champion.name} are World Champions</span>
          </div>
        )}

        {matches && (
          <div className="wc-chips">
            <div className="wc-chip">
              <span className="wc-chip-value">{played}<span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>/{matches.length}</span></span>
              <span className="wc-chip-label">Matches played</span>
            </div>
            <div className="wc-chip">
              <span className="wc-chip-value">{totalGoals}</span>
              <span className="wc-chip-label">Goals</span>
            </div>
            <div className="wc-chip">
              <span className="wc-chip-value">{alive ? alive.size : '—'}</span>
              <span className="wc-chip-label">Teams alive</span>
            </div>
            {nextMatch && (
              <div className="wc-chip">
                <span className="wc-chip-value" style={{ fontSize: '1.02rem' }}>
                  {nextMatch.home.abbrev} v {nextMatch.away.abbrev}
                </span>
                <span className="wc-chip-label">Next · {formatKickoffET(nextMatch.date, { withDate: true })}</span>
              </div>
            )}
          </div>
        )}

        {!matches && !error && (
          <div className="card" style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
            Loading the tournament…
          </div>
        )}

        {!matches && error && (
          <div className="card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
            <p style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Couldn&apos;t load live data</p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Scores come straight from ESPN&apos;s public feed in your browser. Check your connection and hit refresh.
            </p>
          </div>
        )}

        {matches && (
          <>
            {stripMatches.length > 0 && (
              <section style={{ marginBottom: '1.8rem' }}>
                <h2 className="wc-section-heading">{stripTitle}</h2>
                <div className="wc-today-row">
                  {stripMatches.map((m) => (
                    <button
                      key={m.id}
                      className={`wc-today-card${m.id === selectedId ? ' wc-today-selected' : ''}`}
                      onClick={() => setSelectedId(m.id)}
                    >
                      <div className="wc-today-teams">
                        <Flag src={m.home.decided ? m.home.logo : ''} abbrev={m.home.abbrev} size={22} />
                        <span>{m.home.abbrev}</span>
                        <span className="wc-today-score">
                          {m.state === 'pre' ? formatKickoffET(m.date) : matchScoreLabel(m)}
                        </span>
                        <span>{m.away.abbrev}</span>
                        <Flag src={m.away.decided ? m.away.logo : ''} abbrev={m.away.abbrev} size={22} />
                      </div>
                      <div className="wc-today-sub">
                        {m.state === 'in' ? (
                          <span style={{ color: 'var(--accent-warm)', fontWeight: 700 }}>● {m.clock || 'LIVE'}</span>
                        ) : m.state === 'post' ? (
                          'FT'
                        ) : m.odds?.details ? (
                          `${m.odds.details}${m.odds.overUnder !== null ? ` · O/U ${m.odds.overUnder}` : ''}`
                        ) : (
                          ROUND_LABELS[m.round]
                        )}
                        {m.city ? ` · ${m.city}` : ''}
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}

            <section style={{ marginBottom: '1.8rem' }}>
              <h2 className="wc-section-heading">Knockout Bracket</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 0.8rem' }}>
                Round of 32 on the outer ring, spiraling in to the final at the center. Tap any match for
                kickoff time, venue, odds, and scorers.
              </p>
              <CircularBracket matches={matches} selectedId={selectedId} onSelect={setSelectedId} />

              {selectedMatch && <MatchDetail match={selectedMatch} />}

              {bronzeMatch && (
                <button
                  className={`wc-today-card${bronzeMatch.id === selectedId ? ' wc-today-selected' : ''}`}
                  style={{ marginTop: '1rem' }}
                  onClick={() => setSelectedId(bronzeMatch.id)}
                >
                  <div className="wc-today-teams">
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: 1 }}>3RD PLACE</span>
                    <Flag src={bronzeMatch.home.decided ? bronzeMatch.home.logo : ''} abbrev={bronzeMatch.home.abbrev} size={22} />
                    <span>{bronzeMatch.home.abbrev}</span>
                    <span className="wc-today-score">
                      {bronzeMatch.state === 'pre' ? formatKickoffET(bronzeMatch.date) : matchScoreLabel(bronzeMatch)}
                    </span>
                    <span>{bronzeMatch.away.abbrev}</span>
                    <Flag src={bronzeMatch.away.decided ? bronzeMatch.away.logo : ''} abbrev={bronzeMatch.away.abbrev} size={22} />
                  </div>
                </button>
              )}
            </section>

            {scorers.length > 0 && (
              <section style={{ marginBottom: '1.8rem' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem', flexWrap: 'wrap' }}>
                  <h2 className="wc-section-heading">Golden Boot Race</h2>
                  <label className="wc-toggle">
                    <input
                      type="checkbox"
                      checked={aliveOnly}
                      onChange={(e) => setAliveOnly(e.target.checked)}
                    />
                    Only players still in contention
                  </label>
                </div>
                <div className="card" style={{ padding: '0.6rem 1.1rem' }}>
                  {visibleScorers.length === 0 && (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', padding: '0.6rem 0' }}>
                      No goals logged yet.
                    </p>
                  )}
                  {visibleScorers.map((s, i) => (
                    <div key={`${s.teamId}-${s.name}`} className="wc-scorer-row" style={{ opacity: s.alive ? 1 : 0.55 }}>
                      <span style={{ width: '1.4rem', color: 'var(--text-muted)', fontWeight: 700 }}>{i + 1}</span>
                      <Flag src={s.teamLogo} abbrev={s.teamAbbrev} size={22} />
                      <span style={{ fontWeight: 600 }}>{s.name}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                        {s.teamAbbrev}
                        {!s.alive ? ' · eliminated' : ''}
                      </span>
                      <span style={{ marginLeft: 'auto', fontWeight: 800 }}>
                        {s.goals}
                        {s.penalties > 0 && (
                          <span style={{ color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.8rem' }}>
                            {' '}({s.penalties}p)
                          </span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>

      <Footer />
    </main>
  );
}
