import { type CSSProperties } from 'react';

/**
 * Login illustration: "Squirrel Chasing Acorns".
 *
 * A squirrel bounds after a trail of acorns while three triage step cards
 * (observe -> correlate -> resolve) float alongside the chase. The scene is a
 * faithful port of the Claude Design "Squirrel Chasing Acorns v2" concept,
 * adapted to the workspace design system: every colour resolves to a theme
 * token so it reads correctly in light and dark, and the ambient CSS motion is
 * neutralised under `prefers-reduced-motion`.
 */

type SignalTone = 'warning' | 'accent' | 'success';

interface StepCard {
  readonly order: string;
  readonly phase: string;
  readonly title: string;
  readonly detail: string;
  readonly signal: string;
  readonly tone: SignalTone;
  readonly x: number;
  readonly y: number;
  readonly delay: string;
}

const stepCards: readonly StepCard[] = [
  {
    order: '01',
    phase: 'OBSERVE',
    title: 'Pod events',
    detail: 'CrashLoopBackOff spike',
    signal: 'Restart surge',
    tone: 'warning',
    x: 380,
    y: 470,
    delay: '0s'
  },
  {
    order: '02',
    phase: 'CORRELATE',
    title: 'Deploy diff',
    detail: 'Memory limit reduced',
    signal: 'Limit change',
    tone: 'accent',
    x: 524,
    y: 252,
    delay: '0.9s'
  },
  {
    order: '03',
    phase: 'RESOLVE',
    title: 'Endpoints',
    detail: 'Service path clear',
    signal: 'Probe healthy',
    tone: 'success',
    x: 656,
    y: 34,
    delay: '1.8s'
  }
] as const;

const toneDot: Record<SignalTone, string> = {
  warning: 'bg-status-warning',
  accent: 'bg-accent',
  success: 'bg-status-success'
};

const toneText: Record<SignalTone, string> = {
  warning: 'text-status-warning-text',
  accent: 'text-accent-readable',
  success: 'text-status-success-text'
};

// Base card metrics (design units). CARD_SCALE grows every dimension uniformly so
// the cards enlarge proportionally. Cards are placed by explicit top-left anchor
// (card.x/card.y) into non-overlapping vertical bands, so they never collide.
const CARD_W = 190;
const CARD_H = 150;
const CARD_SCALE = 1.32;
const CARD_RENDER_W = CARD_W * CARD_SCALE;
const CARD_RENDER_H = CARD_H * CARD_SCALE;

// Every acorn is anchored to its step card by one shared offset: it sits in the
// left gutter (ACORN_GUTTER px clear of the card's left edge) and is vertically
// centred on the card. All three therefore hold an identical relationship to
// their card and form a line parallel to the evenly-stepped cards; the scale
// tapers with distance for depth. The dotted trail below threads through every
// acorn centre.
const ACORN_GUTTER = 52;
const acornStyles = [
  { scale: 1, delay: '0s' },
  { scale: 0.85, delay: '0.45s' },
  { scale: 0.72, delay: '0.9s' }
] as const;
const acorns = stepCards.map((card, index) => ({
  x: card.x - ACORN_GUTTER,
  y: card.y + CARD_RENDER_H / 2,
  ...acornStyles[index]
}));

function StepCardFrame({ card }: { card: StepCard }) {
  const width = CARD_RENDER_W;
  const height = CARD_RENDER_H;
  const px = (n: number) => `${n * CARD_SCALE}px`;

  return (
    <foreignObject x={card.x} y={card.y} width={width} height={height} style={{ overflow: 'visible' }}>
      <div
        className="login-hunt-card box-border flex flex-col border border-ui-border bg-ui-surface"
        style={{
          width: `${width}px`,
          gap: px(5),
          borderRadius: px(16),
          padding: `${px(15)} ${px(18)} ${px(14)}`,
          animationDelay: card.delay,
          boxShadow: `0 ${px(8)} ${px(22)} rgb(var(--logo-brown-rgb) / 0.12)`
        }}
      >
        <div className="flex items-baseline" style={{ gap: px(8) }}>
          <span className="font-bold text-accent-strong" style={{ fontSize: px(13) }}>{card.order}</span>
          <span className="font-semibold tracking-[0.18em] text-ui-text-muted" style={{ fontSize: px(9.5) }}>
            {card.phase}
          </span>
        </div>
        <div className="font-semibold text-ui-text" style={{ fontSize: px(15.5) }}>{card.title}</div>
        <div className="text-ui-text-muted" style={{ fontSize: px(12) }}>{card.detail}</div>
        <div className="flex items-center" style={{ gap: px(7), marginTop: px(3) }}>
          <span className={`rounded-full ${toneDot[card.tone]}`} style={{ width: px(7), height: px(7) }} />
          <span className={`font-semibold ${toneText[card.tone]}`} style={{ fontSize: px(11.5) }}>{card.signal}</span>
        </div>
      </div>
    </foreignObject>
  );
}

export interface LoginPreviewProps {
  showCards?: boolean;
  showTagline?: boolean;
}

export function LoginPreview({ showCards = true, showTagline = true }: LoginPreviewProps = {}) {
  return (
    <div
      data-login-visual-variant="hunt-chase"
      className="relative z-10 flex min-h-[40rem] w-full max-w-[42rem] flex-col px-9 py-9"
      aria-hidden="true"
    >
      <div
        className="login-hunt-bloom -right-16 -top-20 h-[300px] w-[300px]"
        style={{ background: 'radial-gradient(circle, rgb(var(--logo-cream-rgb) / 0.38), transparent 68%)' }}
      />
      <div
        className="login-hunt-bloom -bottom-[70px] -left-[50px] h-[260px] w-[260px]"
        style={{
          background: 'radial-gradient(circle, rgb(var(--brand-orange-rgb) / 0.1), transparent 70%)',
          animationDuration: '11s'
        }}
      />

      <svg
        viewBox="0 0 920 700"
        preserveAspectRatio="xMidYMid meet"
        className="login-hunt-scene relative z-[1] my-2 min-h-0 w-full grow"
        aria-hidden="true"
        style={
          {
            '--fur': 'rgb(var(--brand-orange-rgb))',
            '--fur-bright': 'rgb(var(--brand-orange-bright-rgb))',
            '--fur-strong': 'rgb(var(--brand-orange-strong-rgb))',
            '--fur-deep': 'color-mix(in oklab, rgb(var(--brand-orange-strong-rgb)), rgb(var(--text-rgb)) 24%)',
            '--belly': 'rgb(var(--logo-cream-rgb))',
            '--ink': 'rgb(var(--code-bg-rgb))',
            '--smile': 'rgb(var(--text-muted-rgb))',
            '--acorn-body': 'color-mix(in oklab, rgb(var(--brand-orange-bright-rgb)), rgb(var(--logo-cream-rgb)) 42%)',
            '--acorn-shade': 'rgb(var(--brand-orange-strong-rgb))',
            '--acorn-cap': 'rgb(var(--logo-brown-rgb))',
            '--acorn-line': 'color-mix(in oklab, rgb(var(--logo-brown-rgb)), rgb(var(--text-rgb)) 34%)',
            '--hunt': 'rgb(var(--status-warning-rgb))',
            '--dust': 'color-mix(in oklab, rgb(var(--surface-strong-rgb)), rgb(var(--logo-brown-rgb)) 14%)',
            '--shadow-fur': 'rgb(var(--logo-brown-rgb))'
          } as CSSProperties
        }
      >
        <defs>
          <linearGradient id="login-hunt-body" x1="0" y1="0" x2="0.25" y2="1">
            <stop offset="0" stopColor="var(--fur-bright)" />
            <stop offset="1" stopColor="var(--fur-strong)" />
          </linearGradient>
          <linearGradient id="login-hunt-tail-fill" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--fur-bright)" />
            <stop offset="1" stopColor="var(--fur-deep)" />
          </linearGradient>
          <filter id="login-hunt-mblur" x="-40%" y="-70%" width="180%" height="240%">
            <feGaussianBlur stdDeviation="8 1.4" />
          </filter>
          <filter id="login-hunt-softsh" x="-40%" y="-80%" width="180%" height="260%">
            <feGaussianBlur stdDeviation="5" />
          </filter>
          <symbol id="login-hunt-acorn" viewBox="0 0 60 82">
            <path d="M9 34 Q9 21 30 21 Q51 21 51 34 Q51 58 30 76 Q9 58 9 34 Z" fill="var(--acorn-body)" />
            <path d="M30 21 Q51 21 51 34 Q51 58 30 76 Q41 52 41 35 Q41 23 30 21 Z" fill="var(--acorn-shade)" opacity="0.55" />
            <ellipse cx="21" cy="42" rx="5" ry="8.5" fill="var(--belly)" opacity="0.6" />
            <path d="M5 30 Q5 9 30 7 Q55 9 55 30 Q55 36 30 36 Q5 36 5 30 Z" fill="var(--acorn-cap)" />
            <path
              d="M14 13 L20 34 M24 11 L31 35 M35 11 L42 34 M45 13 L50 32"
              stroke="var(--acorn-line)"
              strokeWidth="1.5"
              opacity="0.5"
              fill="none"
              strokeLinecap="round"
            />
            <path d="M8 20 L52 20 M9 27 L51 27" stroke="var(--acorn-line)" strokeWidth="1.3" opacity="0.38" fill="none" strokeLinecap="round" />
            <rect x="27" y="0" width="6" height="10" rx="3" fill="var(--acorn-cap)" />
          </symbol>
        </defs>

        {/* soft drop shadow under the squirrel, synced to the bound */}
        <g transform="translate(-22 8) rotate(-8 190 650)">
          <ellipse cx="190" cy="650" rx="95" ry="11" fill="var(--shadow-fur)" opacity="0.18" filter="url(#login-hunt-softsh)" className="login-hunt-shadow" />
        </g>

        {/* motion-blur speed streaks trailing behind */}
        <g filter="url(#login-hunt-mblur)" transform="translate(-22 8) rotate(-10 90 560)">
          <rect x="-18" y="512" width="106" height="6" rx="3" fill="var(--fur)" opacity="0.4" className="login-hunt-streak" />
          <rect x="-30" y="548" width="120" height="6" rx="3" fill="var(--fur-bright)" opacity="0.36" className="login-hunt-streak" style={{ animationDelay: '0.18s' }} />
          <rect x="-10" y="584" width="98" height="6" rx="3" fill="var(--fur)" opacity="0.32" className="login-hunt-streak" style={{ animationDelay: '0.34s' }} />
          <rect x="2" y="530" width="82" height="5" rx="2.5" fill="var(--belly)" opacity="0.42" className="login-hunt-streak" style={{ animationDelay: '0.25s' }} />
        </g>

        {/* dotted chase trail threading straight through the three acorn centres */}
        <path
          d="M 278 608 Q 307 606, 328 569 Q 477 511, 472 351 Q 466 198, 604 133 Q 651 133, 664 88"
          fill="none"
          stroke="var(--hunt)"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray="0.1 20"
          opacity="0.5"
          className="login-hunt-trail"
        />

        {/* kicked-up dust at push-off */}
        <g transform="translate(158,656)">
          <circle r="9" fill="var(--dust)" className="login-hunt-dust" style={{ animationDelay: '0.3s' }} />
        </g>
        <g transform="translate(120,648)">
          <circle r="7" fill="var(--dust)" className="login-hunt-dust" style={{ animationDelay: '0.55s' }} />
        </g>

        {/* the squirrel, mid bounding gallop toward the acorns */}
        <g transform="translate(8,436) scale(1.12) rotate(-10 150 110)">
          <g className="login-hunt-squirrel">
            {/* bushy tail streaming behind */}
            <g className="login-hunt-tail">
              <path d="M 74 124 C 44 116, 30 90, 42 62" fill="none" stroke="url(#login-hunt-tail-fill)" strokeWidth="38" strokeLinecap="round" />
              <path d="M 42 62 C 52 34, 84 26, 105 43" fill="none" stroke="url(#login-hunt-tail-fill)" strokeWidth="26" strokeLinecap="round" />
              <path d="M 68 112 C 50 104, 42 90, 46 72" fill="none" stroke="var(--belly)" strokeWidth="12" strokeLinecap="round" opacity="0.45" />
            </g>

            {/* far legs (behind the body) */}
            <g className="login-hunt-leg-hind" style={{ transformOrigin: '91% 3%' }}>
              <path d="M90 130 C 80 148, 68 160, 54 168 C 45 172, 46 180, 56 178 C 72 174, 88 160, 98 144 Z" fill="var(--fur-deep)" />
              <ellipse cx="56" cy="174" rx="11" ry="5" fill="var(--fur-deep)" />
            </g>
            <g className="login-hunt-leg-front" style={{ transformOrigin: '10% 5%' }}>
              <path d="M176 122 C 188 138, 202 150, 214 156 C 222 160, 220 168, 210 165 C 196 160, 182 148, 172 134 Z" fill="var(--fur-strong)" />
              <ellipse cx="213" cy="160" rx="8" ry="6" fill="var(--fur-strong)" />
            </g>

            {/* body */}
            <path d="M 196 116 C 192 88, 160 70, 124 76 C 90 82, 66 100, 68 124 C 70 148, 94 160, 126 160 C 158 160, 184 146, 196 116 Z" fill="url(#login-hunt-body)" />
            <ellipse cx="94" cy="130" rx="24" ry="21" fill="var(--fur-strong)" opacity="0.45" />
            <ellipse cx="138" cy="144" rx="38" ry="14" fill="var(--belly)" />

            {/* near hind leg */}
            <g className="login-hunt-leg-hind" style={{ transformOrigin: '88% 4%' }}>
              <path d="M98 134 C 88 152, 76 164, 62 172 C 52 177, 53 185, 64 182 C 82 177, 98 164, 108 150 Z" fill="var(--fur-strong)" />
              <ellipse cx="64" cy="179" rx="13" ry="5.5" fill="var(--fur)" />
              <path d="M55 180 h5 M64 182 h4 M72 181 h4" stroke="var(--fur-strong)" strokeWidth="2" strokeLinecap="round" />
            </g>

            {/* head */}
            <circle cx="214" cy="88" r="28" fill="url(#login-hunt-body)" />
            <path d="M196 64 Q194 42 208 40 Q214 56 205 66 Z" fill="var(--fur-strong)" />
            <ellipse cx="203" cy="52" rx="4" ry="6" fill="var(--fur-bright)" />
            <path d="M218 60 Q224 36 238 40 Q240 58 228 66 Z" fill="var(--fur)" />
            <ellipse cx="230" cy="50" rx="4.5" ry="6.5" fill="var(--belly)" />
            <ellipse cx="232" cy="102" rx="17" ry="14" fill="var(--belly)" />
            <ellipse cx="224" cy="105" rx="8" ry="5" fill="var(--fur-bright)" opacity="0.45" />
            <circle cx="218" cy="84" r="7.5" fill="var(--ink)" />
            <circle cx="220.5" cy="81" r="2.8" fill="var(--belly)" />
            <circle cx="216" cy="87" r="1.4" fill="var(--belly)" opacity="0.7" />
            <ellipse cx="247" cy="97" rx="5" ry="4.2" fill="var(--ink)" />
            <path d="M247 102 Q243 108 236 106" fill="none" stroke="var(--smile)" strokeWidth="2" strokeLinecap="round" />

            {/* near front leg reaching forward */}
            <g className="login-hunt-leg-front" style={{ transformOrigin: '8% 6%' }}>
              <path d="M182 118 C 196 134, 212 148, 226 155 C 236 160, 234 170, 222 167 C 205 162, 188 148, 178 132 Z" fill="var(--fur)" />
              <ellipse cx="225" cy="161" rx="9" ry="6.5" fill="var(--belly)" />
              <path d="M220 164 q6 2 12 1 M221 168 q6 1 11 0" fill="none" stroke="var(--fur-strong)" strokeWidth="2" strokeLinecap="round" />
            </g>
          </g>
        </g>

        {/* troubleshooting step cards along the chase */}
        {showCards && stepCards.map((card) => <StepCardFrame key={card.order} card={card} />)}

        {/* bouncing acorns between the steps, on top and clear of the cards */}
        {acorns.map((acorn) => (
          <g key={`${acorn.x}-${acorn.y}`} transform={`translate(${acorn.x},${acorn.y}) scale(${acorn.scale})`}>
            <g className="login-hunt-acorn" style={{ animationDelay: acorn.delay }}>
              <use href="#login-hunt-acorn" width="60" height="82" x="-30" y="-41" />
            </g>
          </g>
        ))}
      </svg>

      {showTagline && (
        <div className="relative z-[2] max-w-[36rem]">
          <h2 className="text-[1.9rem] font-semibold leading-[1.16] tracking-[-0.02em] text-ui-text">
            collecting <span className="text-accent-strong">acorns</span> for everything ops
          </h2>
          <p className="mt-3 max-w-[31rem] text-base leading-relaxed text-ui-text-muted">
            Turn operational knowledge into AI-powered workflows.
          </p>
        </div>
      )}
    </div>
  );
}
