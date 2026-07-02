import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { type AnimationSequence, useAnimate, useReducedMotion } from 'framer-motion';
import { ICONS } from '@/constants';

/**
 * Right-side login visual: an "evidence run" where a squirrel scampers along the
 * troubleshooting path, gathering a scattered acorn (signal) at each node until the
 * fix is ready. Acorns are the AcornOps brand identity; a squirrel chasing acorns is
 * the metaphor for finding the evidence that resolves an incident.
 *
 * Motion is one coherent ~9s loop driven by Framer Motion. It fades out and back in
 * so the loop is seamless (no snap-back). Honours reduced-motion by rendering the
 * final, gathered state with no animation.
 */

const EASE = [0.22, 1, 0.36, 1] as const;

const evidenceAcorns = [
  {
    order: '01',
    stage: 'Observe',
    label: 'Pod events',
    value: 'CrashLoopBackOff spike',
    state: 'restart surge',
    detail: 'restart surge',
    toneClass: 'border-status-warning/25 bg-status-warning-soft text-status-warning-text',
    className: 'left-0 bottom-[2.5rem]',
    posClass: 'left-[4.75rem] bottom-[11rem]'
  },
  {
    order: '02',
    stage: 'Correlate',
    label: 'Deploy diff',
    value: 'Memory limit reduced',
    state: 'limit change',
    detail: 'rollout window',
    toneClass: 'border-accent/25 bg-accent-soft text-accent-strong',
    className: 'left-[13.75rem] bottom-[4.85rem]',
    posClass: 'left-1/2 -translate-x-1/2 bottom-[11rem]'
  },
  {
    order: '03',
    stage: 'Resolve',
    label: 'Endpoints',
    value: 'Service path clear',
    state: 'probe healthy',
    detail: 'blast radius',
    toneClass: 'border-status-success/25 bg-status-success-soft text-status-success-text',
    className: 'right-0 bottom-[2.5rem]',
    posClass: 'right-[4.75rem] bottom-[11rem]'
  }
] as const;

function SquirrelRunner() {
  return (
    <svg
      className="login-squirrel-svg"
      viewBox="0 0 82 66"
      fill="none"
      aria-hidden="true"
      style={
        {
          '--sq': 'rgb(var(--logo-brown-rgb))',
          '--sq-dark': 'color-mix(in oklab, rgb(var(--logo-brown-rgb)), #000 24%)',
          '--sq-lite': 'color-mix(in oklab, rgb(var(--logo-brown-rgb)), #fff 18%)'
        } as CSSProperties
      }
    >
      {/* bushy tail */}
      <path
        className="login-squirrel-tail"
        d="M29 52 C16 53 5 44 3 26 C1 11 13 1 31 1 C41 1 49 9 46 18 C44 25 38 24 36 19 C34 28 33 37 30 45 C29 48 29 50 29 52 Z"
        fill="var(--sq)"
      />
      <path
        d="M14 30 C13 20 20 11 30 9"
        stroke="var(--sq-lite)"
        strokeWidth="4"
        strokeLinecap="round"
      />
      {/* back leg */}
      <path d="M36 49 C34 53 33 55 31 56" stroke="var(--sq-dark)" strokeWidth="5.5" strokeLinecap="round" />
      {/* body */}
      <ellipse cx="44" cy="43" rx="16" ry="12.5" fill="var(--sq)" transform="rotate(-7 44 43)" />
      {/* belly */}
      <ellipse cx="49" cy="49" rx="8.5" ry="6" fill="rgb(var(--surface-strong-rgb))" opacity="0.5" />
      {/* head */}
      <circle cx="60" cy="32" r="9.8" fill="var(--sq)" />
      {/* snout */}
      <ellipse className="login-squirrel-face" cx="68" cy="35" rx="4.6" ry="3.8" fill="var(--sq)" />
      {/* ear */}
      <circle cx="57" cy="21" r="4.3" fill="var(--sq)" />
      <circle cx="57" cy="21.5" r="2" fill="var(--sq-lite)" />
      {/* front leg */}
      <path d="M62 44 C65 48 67 50 69 51" stroke="var(--sq-dark)" strokeWidth="5" strokeLinecap="round" />
      {/* eye + nose */}
      <circle cx="62.5" cy="29" r="1.7" fill="rgb(var(--text-rgb))" />
      <circle cx="71.5" cy="35" r="1.7" fill="rgb(var(--brand-orange-rgb))" />
    </svg>
  );
}

function AcornToken() {
  return (
    <svg width="16" height="20" viewBox="0 0 28 32" fill="none" aria-hidden="true">
      <path d="M13.5 3 C13.5 0.5 15.5 0.5 15 3" stroke="#6b3b1a" strokeWidth="1.8" strokeLinecap="round" />
      <path
        d="M4 11 C4 5 9 2.5 14 2.5 C19 2.5 24 5 24 11 C24 13.2 22 14.5 19.5 14.5 L8.5 14.5 C6 14.5 4 13.2 4 11 Z"
        fill="#6b3b1a"
      />
      <path
        d="M6.5 14.5 L21.5 14.5 C21.5 23 17.5 30 14 30 C10.5 30 6.5 23 6.5 14.5 Z"
        fill="rgb(var(--brand-orange-rgb))"
      />
      <ellipse cx="11" cy="20" rx="1.6" ry="3.2" fill="rgb(var(--surface-rgb))" opacity="0.32" />
    </svg>
  );
}

export function LoginPreview() {
  const prefersReducedMotion = useReducedMotion();
  const [scope, animate] = useAnimate();
  const homeRef = useRef<HTMLSpanElement>(null);
  const nodeRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const [nodeOffsets, setNodeOffsets] = useState<number[] | null>(null);

  // Measure each node's horizontal centre relative to the squirrel's home so the
  // runner tracks the path regardless of the panel width.
  useLayoutEffect(() => {
    if (prefersReducedMotion) return;
    const home = homeRef.current;
    const root = scope.current;
    if (!home || !root) return;

    const measure = () => {
      const homeBox = home.getBoundingClientRect();
      const homeCentre = homeBox.left + homeBox.width / 2;
      const offsets = nodeRefs.current.map((node) => {
        if (!node) return 0;
        const box = node.getBoundingClientRect();
        return box.left + box.width / 2 - homeCentre;
      });
      setNodeOffsets(offsets);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    return () => observer.disconnect();
  }, [prefersReducedMotion, scope]);

  useEffect(() => {
    if (prefersReducedMotion || !nodeOffsets || !scope.current) return;

    const RUN = 0.9; // squirrel travel per segment
    const STAGE_GAP = 1.9; // time between stage starts
    const firstStage = 1.05;
    const fixStart = firstStage + STAGE_GAP * 2 + 1.35; // after the third gather
    const outStart = fixStart + 1.25;

    const sequence: AnimationSequence = [
      // --- reset to the "scattered, undiscovered" state (instant) ---
      ['[data-rail]', { scaleX: 0, opacity: 0.9 }, { duration: 0, at: 0 }],
      ['[data-squirrel]', { x: 0, y: 0, opacity: 0 }, { duration: 0, at: 0 }],
      ['[data-acorn]', { opacity: 0.32, scale: 1, y: 0 }, { duration: 0, at: 0 }],
      ['[data-node]', { boxShadow: '0 0 0 0 rgb(var(--brand-orange-rgb) / 0)', scale: 1 }, { duration: 0, at: 0 }],
      ['[data-signal]', { opacity: 0, y: 14, scale: 0.98 }, { duration: 0, at: 0 }],
      ['[data-resolution]', { opacity: 0.4, y: 12, scale: 0.98 }, { duration: 0, at: 0 }],
      ['[data-detail]', { opacity: 0.25, scale: 0.6 }, { duration: 0, at: 0 }],
      // --- setup: the path draws in, the squirrel arrives ---
      ['[data-rail]', { scaleX: 1, opacity: 1 }, { duration: 0.6, ease: EASE, at: 0 }],
      ['[data-squirrel]', { opacity: 1 }, { duration: 0.4, ease: 'easeOut', at: 0.3 }]
    ];

    evidenceAcorns.forEach((_, index) => {
      const start = firstStage + STAGE_GAP * index;
      // run to the node
      sequence.push([
        '[data-squirrel]',
        { x: nodeOffsets[index] },
        { duration: RUN, ease: EASE, at: start }
      ]);
      // the acorn brightens as the squirrel approaches, then is gathered
      sequence.push([`[data-acorn="${index}"]`, { opacity: 1 }, { duration: 0.3, at: start + 0.15 }]);
      sequence.push([
        `[data-acorn="${index}"]`,
        { scale: [1, 1.2, 0.15], y: [0, -4, 14], opacity: [1, 1, 0] },
        { duration: 0.5, ease: EASE, at: start + RUN - 0.15 }
      ]);
      // the node ignites
      sequence.push([
        `[data-node="${index}"]`,
        { boxShadow: '0 0 0 6px rgb(var(--brand-orange-rgb) / 0.14)', scale: [1, 1.15, 1.06] },
        { duration: 0.45, ease: EASE, at: start + RUN - 0.1 }
      ]);
      // the matching signal card rises in
      sequence.push([
        `[data-signal="${index}"]`,
        { opacity: 1, y: 0, scale: [0.98, 1.02, 1] },
        { duration: 0.55, ease: EASE, at: start + RUN }
      ]);
      // earlier cards recede so the active one leads
      if (index > 0) {
        sequence.push([
          `[data-signal="${index - 1}"]`,
          { opacity: 0.62, scale: 0.965 },
          { duration: 0.4, ease: EASE, at: start + RUN }
        ]);
      }
    });

    // --- fix ready: a small hop, the resolution blooms, checks light up ---
    sequence.push(['[data-squirrel]', { y: [0, -10, 0] }, { duration: 0.55, ease: EASE, at: fixStart }]);
    // the full body of gathered evidence shines behind the resolution
    sequence.push([
      '[data-signal]',
      { opacity: 1, scale: 1 },
      { duration: 0.45, ease: EASE, at: fixStart }
    ]);
    sequence.push([
      '[data-resolution]',
      { opacity: 1, y: 0, scale: [0.98, 1.01, 1] },
      { duration: 0.6, ease: EASE, at: fixStart }
    ]);
    [0, 1, 2].forEach((dot) => {
      sequence.push([
        `[data-detail="${dot}"]`,
        { opacity: 1, scale: [0.6, 1.25, 1] },
        { duration: 0.35, ease: EASE, at: fixStart + 0.25 + dot * 0.12 }
      ]);
    });

    // --- loop out: everything eases back to rest, then the loop restarts seamlessly ---
    sequence.push(['[data-squirrel]', { opacity: 0 }, { duration: 0.5, ease: 'easeIn', at: outStart }]);
    sequence.push(['[data-signal]', { opacity: 0, y: 14, scale: 0.98 }, { duration: 0.5, ease: EASE, at: outStart }]);
    sequence.push(['[data-acorn]', { opacity: 0.32, scale: 1, y: 0 }, { duration: 0.45, ease: EASE, at: outStart }]);
    sequence.push([
      '[data-node]',
      { boxShadow: '0 0 0 0 rgb(var(--brand-orange-rgb) / 0)', scale: 1 },
      { duration: 0.45, ease: EASE, at: outStart }
    ]);
    sequence.push(['[data-resolution]', { opacity: 0.4, y: 12, scale: 0.98 }, { duration: 0.5, ease: EASE, at: outStart }]);
    sequence.push(['[data-detail]', { opacity: 0.25, scale: 0.6 }, { duration: 0.4, at: outStart }]);
    sequence.push(['[data-rail]', { scaleX: 0, opacity: 0.9 }, { duration: 0.45, ease: EASE, at: outStart + 0.1 }]);

    const controls = animate(sequence, { repeat: Infinity, repeatDelay: 0.35 });
    const bob = animate('[data-squirrel-bob]', { y: [0, -2.5, 0] }, { duration: 0.52, repeat: Infinity, ease: 'easeInOut' });

    return () => {
      controls.stop();
      bob.stop();
    };
  }, [prefersReducedMotion, nodeOffsets, animate, scope]);

  // Static styles used before animation begins (and permanently under reduced motion).
  const initial = (animated: CSSProperties, rest: CSSProperties): CSSProperties =>
    prefersReducedMotion ? rest : animated;

  const railStyle: CSSProperties = { transformOrigin: 'left center', ...initial({ transform: 'scaleX(0)' }, {}) };
  const homePosClass = prefersReducedMotion ? 'right-[2.5rem] bottom-[12.9rem]' : 'left-[2.25rem] bottom-[12.9rem]';

  return (
    <div
      ref={scope}
      data-login-visual-variant="evidence-run"
      className="relative z-10 w-full max-w-[42rem] px-6 py-10 xl:px-10"
      aria-hidden="true"
    >
      <div className="login-evidence-glow" aria-hidden="true" />

      <div className="relative z-10 mb-10 max-w-[30rem]">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-ui-border bg-ui-surface px-3 py-1 text-ui-text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          <span className="type-caption">Evidence run</span>
        </div>
        <h2 className="type-section-title">Kubernetes restart loop</h2>
        <p className="type-body mt-2">
          AcornOps gathers scattered cluster signals into a readable path from symptom to fix.
        </p>
      </div>

      <div className="relative z-10 min-h-[32rem]">
        <div className="absolute left-0 top-5 z-10 w-56 rounded-lg border border-ui-border bg-ui-surface p-5 shadow-sm">
          <p className="type-micro-label">Troubleshooting path</p>
          <p className="type-caption mt-2 text-ui-text-muted">Events, rollout history, service probes, and blast radius stay together.</p>
        </div>

        <div className="login-path-rail absolute left-12 right-12 bottom-[11.65rem] z-0 h-[2px] rounded" data-rail style={railStyle} />

        {/* path nodes + the acorn that waits at each one */}
        {evidenceAcorns.map((item, index) => (
          <span key={item.stage} className={`absolute z-[15] ${item.posClass}`}>
            <span
              ref={(el) => {
                nodeRefs.current[index] = el;
              }}
              data-node={index}
              className="login-path-node flex h-6 w-6 items-center justify-center rounded-full"
            >
              <span className="type-micro-label text-[0.58rem] leading-none text-accent-strong">{item.order}</span>
            </span>
            <span
              data-acorn={index}
              className="absolute -top-7 left-1/2 block -translate-x-1/2"
              style={initial({ opacity: 0.32 }, {})}
            >
              <AcornToken />
            </span>
          </span>
        ))}

        {/* the squirrel that runs the path */}
        <span ref={homeRef} className={`absolute z-[25] w-[4.6rem] ${homePosClass}`}>
          <span data-squirrel className="block will-change-transform">
            <span data-squirrel-bob className="block">
              <SquirrelRunner />
            </span>
          </span>
        </span>

        {/* evidence signal cards, revealed as each acorn is gathered */}
        {evidenceAcorns.map((item, index) => (
          <div
            key={item.label}
            data-signal={index}
            className={`login-signal-card absolute z-20 w-44 rounded-lg border bg-ui-surface p-4 shadow-sm ${item.className}`}
            style={initial({ opacity: 0, transform: 'translateY(14px) scale(0.98)' }, {})}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className="type-micro-label rounded-full border border-ui-border bg-ui-bg px-2.5 py-1 text-ui-text-muted">
                {item.order} {item.stage}
              </span>
              <span className="block h-5 w-4 rounded-[50%_50%_45%_45%] bg-accent shadow-sm shadow-accent/20" />
            </div>
            <p className="type-row-title min-w-0 text-ui-text">{item.label}</p>
            <p className="type-caption mt-1 min-w-0 truncate text-ui-text-muted">{item.value}</p>
            <span className={`type-micro-label mt-3 inline-flex rounded-full border px-2.5 py-1 ${item.toneClass}`}>
              {item.state}
            </span>
          </div>
        ))}

        <div
          data-resolution
          className="login-resolution-card absolute z-[16] right-4 top-[3rem] w-56 p-4"
          style={initial({ opacity: 0.4, transform: 'translateY(12px) scale(0.98)' }, {})}
        >
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-status-success/25 bg-status-success-soft text-status-success-text">
              <ICONS.CheckCircle2 className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="type-panel-title">Fix ready</p>
              <p className="type-caption mt-1 text-ui-text-muted">raise memory limit</p>
            </div>
          </div>
          <div className="grid gap-2">
            {evidenceAcorns.map((item, index) => (
              <div key={item.detail} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                <span className="type-caption min-w-0 truncate text-ui-text-muted">{item.detail}</span>
                <span
                  data-detail={index}
                  className="h-1.5 w-1.5 rounded-full bg-status-success"
                  style={initial({ opacity: 0.25 }, {})}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
