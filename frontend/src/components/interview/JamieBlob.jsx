/**
 * JamieBlob — Phase 7
 *
 * Visual state indicator for Jamie.
 * States: 'idle' | 'speaking' | 'listening' | 'processing'
 *
 * idle:       slow breathing pulse (CSS animation)
 * speaking:   wave-bar animation (5 bars, varying heights)
 * listening:  green hue + amplitude-reactive scale
 *             (Web Audio AnalyserNode on mic MediaStream if granted;
 *              fall back to generic pulse animation if mic denied)
 * processing: spinner ring animation (gold)
 *
 * Props:
 *   blobState   — 'idle' | 'speaking' | 'listening' | 'processing'
 *   streamRef   — optional ref to MediaStream for amplitude analysis (listening)
 */
import React, { useEffect, useRef } from 'react';

export default function JamieBlob({ blobState = 'idle', streamRef }) {
  const canvasRef = useRef(null);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);
  const audioCtxRef = useRef(null);
  const sourceRef = useRef(null);

  // Set up Web Audio AnalyserNode when listening state + stream available
  useEffect(() => {
    if (blobState !== 'listening') {
      // Clean up audio analysis when not listening
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      if (sourceRef.current) {
        try { sourceRef.current.disconnect(); } catch {}
        sourceRef.current = null;
      }
      if (audioCtxRef.current) {
        try { audioCtxRef.current.close(); } catch {}
        audioCtxRef.current = null;
      }
      analyserRef.current = null;
      return;
    }

    // Try to attach AnalyserNode
    const stream = streamRef?.current;
    if (!stream) return;

    try {
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      const src = ctx.createMediaStreamSource(stream);
      sourceRef.current = src;
      src.connect(analyser);

      const canvas = canvasRef.current;
      if (!canvas) return;
      const bufLen = analyser.frequencyBinCount;
      const dataArr = new Uint8Array(bufLen);

      function draw() {
        animFrameRef.current = requestAnimationFrame(draw);
        analyser.getByteFrequencyData(dataArr);

        const avg = dataArr.slice(0, 20).reduce((a, b) => a + b, 0) / 20;
        const scale = 1 + (avg / 255) * 0.4;

        const blob = canvas.parentElement?.querySelector('.jamie-blob-circle');
        if (blob) {
          blob.style.transform = `scale(${scale})`;
        }
      }
      draw();
    } catch {
      // Mic denied or AudioContext unavailable — fall back to CSS pulse
      analyserRef.current = null;
    }

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      if (sourceRef.current) {
        try { sourceRef.current.disconnect(); } catch {}
        sourceRef.current = null;
      }
      if (audioCtxRef.current) {
        try { audioCtxRef.current.close(); } catch {}
        audioCtxRef.current = null;
      }
    };
  }, [blobState, streamRef]);

  const stateLabel = {
    idle:       'Ready',
    speaking:   'Jamie is speaking...',
    listening:  'Listening...',
    processing: 'Evaluating...',
  }[blobState] ?? 'Ready';

  return (
    <div className={`jamie-blob-container jamie-blob--${blobState}`} aria-live="polite" aria-label={stateLabel}>
      <div className="jamie-blob-wrap" ref={canvasRef} data-state={blobState}>
        {/* Circle blob */}
        <div className="jamie-blob-circle" />

        {/* Speaking: wave bars */}
        {blobState === 'speaking' && (
          <div className="jamie-blob-bars" aria-hidden="true">
            <div className="jamie-bar jamie-bar-1" />
            <div className="jamie-bar jamie-bar-2" />
            <div className="jamie-bar jamie-bar-3" />
            <div className="jamie-bar jamie-bar-4" />
            <div className="jamie-bar jamie-bar-5" />
          </div>
        )}

        {/* Processing: spinner ring */}
        {blobState === 'processing' && (
          <div className="jamie-blob-shimmer" aria-hidden="true" />
        )}
      </div>

      <p className="jamie-blob-label">{stateLabel}</p>

      <style>{`
        .jamie-blob-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
          margin: 1.5rem 0;
          user-select: none;
        }

        .jamie-blob-wrap {
          position: relative;
          width: 96px;
          height: 96px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .jamie-blob-circle {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: radial-gradient(circle at 35% 35%, #e8c96a, var(--color-accent));
          box-shadow: 0 0 24px rgba(26, 122, 74, 0.35);
          transition: transform 0.1s ease, box-shadow var(--transition);
        }

        /* Idle: slow breathing pulse */
        .jamie-blob--idle .jamie-blob-circle {
          animation: blob-breathe 3s ease-in-out infinite;
        }

        @keyframes blob-breathe {
          0%, 100% { transform: scale(1);    box-shadow: 0 0 24px rgba(26,122,74,0.35); }
          50%       { transform: scale(1.07); box-shadow: 0 0 36px rgba(26,122,74,0.55); }
        }

        /* Speaking: pulsing glow */
        .jamie-blob--speaking .jamie-blob-circle {
          background: radial-gradient(circle at 35% 35%, #f0d98a, var(--color-accent));
          animation: blob-speak 0.6s ease-in-out infinite alternate;
        }

        @keyframes blob-speak {
          0%   { transform: scale(0.97); box-shadow: 0 0 28px rgba(26,122,74,0.45); }
          100% { transform: scale(1.03); box-shadow: 0 0 44px rgba(26,122,74,0.65); }
        }

        /* Listening: green hue + pulse */
        .jamie-blob--listening .jamie-blob-circle {
          background: radial-gradient(circle at 35% 35%, #5ce87a, #34A853);
          box-shadow: 0 0 24px rgba(52, 168, 83, 0.5);
          animation: blob-listen-pulse 1.2s ease-in-out infinite;
        }

        @keyframes blob-listen-pulse {
          0%, 100% { transform: scale(1);    box-shadow: 0 0 24px rgba(52,168,83,0.4); }
          50%       { transform: scale(1.06); box-shadow: 0 0 40px rgba(52,168,83,0.65); }
        }

        /* Processing: gold shimmer */
        .jamie-blob--processing .jamie-blob-circle {
          background: radial-gradient(circle at 35% 35%, #e8c96a, #145C38);
          animation: blob-process 1.2s ease-in-out infinite;
        }

        @keyframes blob-process {
          0%, 100% { transform: scale(1);    box-shadow: 0 0 24px rgba(26,122,74,0.35); }
          50%       { transform: scale(1.04); box-shadow: 0 0 40px rgba(26,122,74,0.55); }
        }

        /* Speaking: wave bars overlay */
        .jamie-blob-bars {
          position: absolute;
          bottom: -16px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          align-items: flex-end;
          gap: 3px;
          height: 20px;
        }

        .jamie-bar {
          width: 4px;
          border-radius: 2px;
          background-color: var(--color-accent);
          transform-origin: bottom;
        }

        .jamie-bar-1 { animation: bar-wave 0.8s ease-in-out 0.0s infinite alternate; }
        .jamie-bar-2 { animation: bar-wave 0.8s ease-in-out 0.1s infinite alternate; }
        .jamie-bar-3 { animation: bar-wave 0.8s ease-in-out 0.2s infinite alternate; }
        .jamie-bar-4 { animation: bar-wave 0.8s ease-in-out 0.3s infinite alternate; }
        .jamie-bar-5 { animation: bar-wave 0.8s ease-in-out 0.4s infinite alternate; }

        @keyframes bar-wave {
          0%   { height: 4px; }
          100% { height: 18px; }
        }

        /* Processing: spinner ring */
        .jamie-blob-shimmer {
          position: absolute;
          inset: -8px;
          border-radius: 50%;
          border: 3px solid transparent;
          border-top-color: var(--color-accent);
          border-right-color: rgba(45, 106, 79, 0.35);
          animation: shimmer-spin 0.8s linear infinite;
        }

        @keyframes shimmer-spin {
          to { transform: rotate(360deg); }
        }

        .jamie-blob-label {
          margin: 0;
          font-size: 0.8125rem;
          color: var(--color-text-muted);
          letter-spacing: 0.03em;
          text-align: center;
          min-height: 1.2em;
        }
      `}</style>
    </div>
  );
}
