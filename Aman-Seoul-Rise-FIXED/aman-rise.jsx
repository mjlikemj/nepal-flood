/* eslint-disable */
const { useComposition, animate, interpolate, Easing, clamp, CompositionStage } = window;

// ---- plate geometry (photo 2486x1360 fitted to a 1920x1080 stage by height) ----
const S = 1080 / 1360;
const PLATE_W = 2486 * S;           // 1974.1
const PLATE_H = 1080;
const OFF_X = (1920 - PLATE_W) / 2; // -27.05
// tower bounding box in photo pixels -> plate-local px
const BOX = { l: 1760 * S, r: 2062 * S, t: 276 * S, b: 1288 * S };
const BOX_W = BOX.r - BOX.l;
const CX = (BOX.l + BOX.r) / 2 + OFF_X;

const CREAM = '#f5ead8';
const ACCENT = '#c67139';

const MOTION = {
  glide: Easing.easeInOutCubic,
  settle: Easing.easeOutQuart,
  pop: Easing.easeOutBack,
};

const smooth = (T, a, b) => {
  const x = clamp((T - a) / (b - a), 0, 1);
  return x * x * (3 - 2 * x);
};
const lerp = (a, b, w) => a + (b - a) * w;

function Piece({ tweaks }) {
  const { T, CUES, authoredTotal } = useComposition();
  const tw = tweaks || {};
  const FLOORS = Math.max(6, Math.round(tw.floors || 38));

  // ---- construction progress (quantised into floors) ----
  const growEnd = CUES.Crown + 0.8;
  const p = animate({ from: 0, to: 1, start: CUES.Rise, end: growEnd, ease: Easing.easeInOutSine })(T);
  const stepF = p * FLOORS;
  const step = Math.min(FLOORS, Math.floor(stepF) + (p >= 1 ? 0 : 0)) / FLOORS;
  const frac = stepF - Math.floor(stepF);
  const topY = BOX.b - step * (BOX.b - BOX.t);   // plate-local y of the current roof
  const built = p > 0.0001;

  // ---- camera: LOCKED. The reference photo never pans or zooms. ----
  const cam = {
    position: 'absolute', left: 0, top: 0, width: 1920, height: 1080,
    transform: 'none', transformOrigin: '0 0',
  };

  // ---- layers ----
  const plate = { position: 'absolute', left: OFF_X, top: 0, width: PLATE_W, height: PLATE_H, display: 'block' };
  const revealClip = `inset(${topY.toFixed(2)}px ${(PLATE_W - BOX.r).toFixed(2)}px ${(PLATE_H - BOX.b).toFixed(2)}px ${BOX.l.toFixed(2)}px)`;
  // After construction, fade to the COMPLETE original reference image and hold it.
  // This guarantees the last frame is the supplied aman-seoul.jpg, not a reconstruction.
  const finalLock = smooth(T, CUES.Reveal + 0.15, CUES.Reveal + 0.55);

  // guide envelope
  const guideOp = tw.guides === false ? 0
    : smooth(T, 0.7, 1.6) * (1 - smooth(T, growEnd - 0.5, growEnd + 0.5));
  const guideDraw = animate({ from: 0, to: 1, start: 0.7, end: 2.4, ease: MOTION.settle })(T);

  // active construction edge
  const edgeOp = (built ? 1 : 0) * smooth(T, CUES.Rise, CUES.Rise + 0.5) * (1 - smooth(T, growEnd - 0.35, growEnd + 0.45));

  // crown flash when the top block lands
  const flash = (1 - Math.abs(clamp((T - growEnd) / 0.55, -1, 1))) * 0.5;

  // ---- end title ----
  const titleOn = tw.title === false ? 0 : 1;
  const tIn = animate({ from: 0, to: 1, start: CUES.Reveal + 1.5, end: CUES.Reveal + 2.9, ease: MOTION.settle })(T);
  const sIn = animate({ from: 0, to: 1, start: CUES.Reveal + 2.1, end: CUES.Reveal + 3.4, ease: MOTION.settle })(T);
  const outFade = 1 - smooth(T, authoredTotal - 0.55, authoredTotal - 0.12);

  // cream wipe covers the loop seam
  const seam = 0;

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: CREAM }}>
      <div style={cam}>
        <img src={(window.__resources&&window.__resources.plateEmpty)||'assets/aman-empty.jpg'} style={plate} alt="" />
        <img src={(window.__resources&&window.__resources.plateFull)||'assets/aman-seoul.jpg'} style={{ ...plate, clipPath: revealClip, WebkitClipPath: revealClip }} alt="" />

        {/* construction envelope */}
        <div style={{
          position: 'absolute', left: BOX.l + OFF_X, top: BOX.t, width: BOX_W,
          height: (BOX.b - BOX.t) * guideDraw, transform: `translateY(${(BOX.b - BOX.t) * (1 - guideDraw)}px)`,
          border: `1.5px dashed ${ACCENT}`, borderBottom: 'none', opacity: guideOp * 0.85,
          borderRadius: '2px',
        }} />
        <div style={{
          position: 'absolute', left: BOX.l + OFF_X - 26, top: BOX.t - 1, width: BOX_W + 52, height: 2,
          background: ACCENT, opacity: guideOp * guideDraw, boxShadow: `0 0 14px ${ACCENT}`,
        }} />

        {/* the floor currently being placed */}
        <div style={{
          position: 'absolute', left: BOX.l + OFF_X - 5, top: topY - 5 - 5 * (1 - frac), width: BOX_W + 10, height: 7,
          background: `linear-gradient(90deg, rgba(198,113,57,.25), ${ACCENT} 30%, #f0c48a 60%, rgba(198,113,57,.25))`,
          opacity: edgeOp * (0.55 + 0.45 * (1 - frac)),
          boxShadow: `0 0 26px 6px rgba(198,113,57,.45)`, borderRadius: 4,
        }} />
        <div style={{
          position: 'absolute', left: BOX.l + OFF_X, top: topY, width: BOX_W, height: 120,
          background: 'linear-gradient(180deg, rgba(255,232,200,.34), rgba(255,232,200,0))',
          opacity: edgeOp, mixBlendMode: 'screen',
        }} />

        {/* crown completion flash */}
        <div style={{
          position: 'absolute', left: BOX.l + OFF_X - 40, top: BOX.t - 40, width: BOX_W + 80, height: 200,
          background: 'radial-gradient(closest-side, rgba(255,240,214,.85), rgba(255,240,214,0))',
          opacity: clamp(flash, 0, 1), mixBlendMode: 'screen',
        }} />


        {/* exact final-frame lock: full reference image, same fixed geometry */}
        <img
          src={(window.__resources&&window.__resources.plateFull)||'assets/aman-seoul.jpg'}
          style={{ ...plate, opacity: finalLock, pointerEvents: 'none' }}
          alt=""
        />
      </div>

      {/* bottom scrim + title */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, height: 460,
        background: 'linear-gradient(180deg, rgba(32,30,29,0), rgba(32,30,29,.62))',
        opacity: titleOn * tIn * outFade,
      }} />
      <div style={{ position: 'absolute', left: 112, bottom: 118, opacity: titleOn * outFade }}>
        <div style={{
          overflow: 'hidden', height: 128,
        }}>
          <div style={{
            fontFamily: '"Noto Serif KR", serif', fontWeight: 300, fontSize: 104, lineHeight: '128px',
            color: CREAM, letterSpacing: '0.06em', whiteSpace: 'nowrap',
            transform: `translateY(${(1 - tIn) * 128}px)`, opacity: tIn,
          }}>아만 서울</div>
        </div>
        <div style={{
          width: 96 * sIn, height: 2, background: ACCENT, margin: '22px 0 20px', opacity: sIn,
        }} />
        <div style={{
          fontFamily: '"Noto Serif KR", serif', fontWeight: 300, fontSize: 30, color: 'rgba(245,234,216,.86)',
          letterSpacing: '0.24em', opacity: sIn, transform: `translateY(${(1 - sIn) * 14}px)`,
        }}>서울 청담동 · 신세계프라퍼티</div>
      </div>

      <div style={{ position: 'absolute', inset: 0, background: CREAM, opacity: seam, pointerEvents: 'none' }} />
    </div>
  );
}

function AmanApp() {
  const { useTweaks, TweaksPanel, TweakSection, TweakToggle, TweakSlider } = window;
  const [t, setTweak] = useTweaks(window.TWEAK_DEFAULTS || {});
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <CompositionStage width={1920} height={1080} scenes={window.OM_SCENES} playback={window.OM_PLAYBACK} bg={CREAM}>
        <Piece tweaks={t} />
      </CompositionStage>
      <TweaksPanel>
        <TweakSection label="Build" />
        <TweakSlider label="Floors" value={t.floors} min={12} max={80} step={1} onChange={(v) => setTweak('floors', v)} />
        <TweakToggle label="Construction guides" value={t.guides} onChange={(v) => setTweak('guides', v)} />
        <TweakToggle label="End title" value={t.title} onChange={(v) => setTweak('title', v)} />
        <TweakSection label="Editing" />
        <TweakToggle label="Motion editor" value={t.motionEditor} onChange={(v) => setTweak('motionEditor', v)} />
      </TweaksPanel>
    </div>
  );
}

window.AmanApp = AmanApp;
