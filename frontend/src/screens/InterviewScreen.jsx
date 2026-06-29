/**
 * InterviewScreen.jsx — Phase 7
 *
 * Core interview experience loop.
 *
 * State machine (useReducer):
 *   LOADING → IDLE → LISTENING → PROCESSING → FEEDBACK → DONE
 *   (SPEAKING removed as a blocked phase — TTS plays in background while IDLE)
 *
 * Session config loaded from sessionStorage('jamie_session_config').
 * Config shape (from Phase 6 SessionConfig):
 *   { mode, categories: string[], count, voiceEnabled: bool, inputMode: 'hold'|'tap' }
 *
 * Voice (D4 graceful degradation):
 *   Level 1: voiceEnabled && user.hasElevenLabsKey → TTS plays automatically
 *   Level 2: SpeechRecognition unsupported → textarea fallback
 *
 * Skip-erasure: skipped questions are NEVER added to results[], so they
 * don't appear in any downstream calculation. See 7.6.
 *
 * Speed optimizations:
 *   - Question text shown immediately on load (TTS fetches in background)
 *   - TTS audio cached by text content (Blob cache, survives re-renders)
 *   - Next question + TTS prefetched during FEEDBACK phase
 */

import React, { useReducer, useEffect, useRef, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { apiGet, apiPost } from '../lib/api.js';
import Spinner from '../components/ui/Spinner.jsx';
import QuestionCard from '../components/interview/QuestionCard.jsx';
import JamieBlob from '../components/interview/JamieBlob.jsx';
import PushToTalkButton from '../components/interview/PushToTalkButton.jsx';
import TranscriptPreview from '../components/interview/TranscriptPreview.jsx';
import FeedbackPanel from '../components/interview/FeedbackPanel.jsx';
import SessionProgress from '../components/interview/SessionProgress.jsx';

/* ------------------------------------------------------------------ */
/* SpeechRecognition feature detection                                 */
/* ------------------------------------------------------------------ */
const SpeechRecognitionAPI =
  (typeof window !== 'undefined')
    ? (window.SpeechRecognition || window.webkitSpeechRecognition)
    : null;

const SPEECH_SUPPORTED = Boolean(SpeechRecognitionAPI);

/* ------------------------------------------------------------------ */
/* State machine reducer                                               */
/* ------------------------------------------------------------------ */

const INITIAL_STATE = {
  phase: 'LOADING',         // LOADING|IDLE|LISTENING|PROCESSING|FEEDBACK|DONE
  config: null,             // session config from sessionStorage
  mode: null,               // derived from config
  currentQuestion: null,    // { id, question, key_points, star_hints, category, ... }
  askedIds: [],             // ids sent as ?exclude= to avoid repeats
  results: [],              // { question, answer, evaluation } per completed Q
  completedCount: 0,        // number of Q's that have been answered (not skipped)
  error: null,              // error message to display
};

function interviewReducer(state, action) {
  switch (action.type) {
    case 'SET_CONFIG':
      return { ...state, config: action.config, mode: action.config.mode };

    case 'QUESTION_LOADED':
      return {
        ...state,
        currentQuestion: action.question,
        phase: action.nextPhase ?? 'IDLE',
        error: null,
      };

    case 'PHASE':
      return { ...state, phase: action.phase };

    case 'EVALUATION_DONE': {
      const result = {
        question: state.currentQuestion,
        answer: action.answer,
        evaluation: action.evaluation,
      };
      return {
        ...state,
        phase: 'FEEDBACK',
        results: [...state.results, result],
        completedCount: state.completedCount + 1,
      };
    }

    case 'QUESTION_SKIPPED':
      return {
        ...state,
        askedIds: state.currentQuestion
          ? [...state.askedIds, state.currentQuestion.id]
          : state.askedIds,
      };

    case 'NEXT_QUESTION_ASKED':
      return {
        ...state,
        phase: 'LOADING',
        askedIds: state.currentQuestion
          ? [...state.askedIds, state.currentQuestion.id]
          : state.askedIds,
        currentQuestion: null,
      };

    case 'SET_ERROR':
      return { ...state, phase: 'IDLE', error: action.error };

    case 'DONE':
      return { ...state, phase: 'DONE' };

    default:
      return state;
  }
}

/* ------------------------------------------------------------------ */
/* Main component                                                      */
/* ------------------------------------------------------------------ */

export default function InterviewScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [state, dispatch] = useReducer(interviewReducer, INITIAL_STATE);
  const { phase, config, mode, currentQuestion, askedIds, results, completedCount, error } = state;

  // Transcript state (managed outside reducer for performance)
  const [interimTranscript, setInterimTranscript] = useState('');
  const [finalTranscript, setFinalTranscript]     = useState('');
  const [textFallback, setTextFallback]           = useState('');

  // TTS playback
  const audioRef      = useRef(null);   // HTMLAudioElement for TTS
  const audioObjUrl   = useRef(null);   // object URL to revoke on cleanup
  const [isPlayingTts, setIsPlayingTts] = useState(false);

  // TTS blob cache: text → Blob (persists across re-renders, revived per playback)
  const ttsCacheRef = useRef(new Map());

  // Prefetch slot: { question, ttsBlob: Blob | null } | null
  const prefetchRef     = useRef(null);
  const prefetchingRef  = useRef(false);

  // SpeechRecognition instance
  const recognitionRef = useRef(null);
  const isRecordingRef = useRef(false);

  // MediaStream ref (passed to JamieBlob for amplitude analysis)
  const micStreamRef = useRef(null);

  /* -------- 7.1 Mount: load config + first question -------- */
  useEffect(() => {
    const raw = sessionStorage.getItem('jamie_session_config');
    if (!raw) {
      navigate('/app', { replace: true });
      return;
    }

    let cfg;
    try {
      cfg = JSON.parse(raw);
    } catch {
      navigate('/app', { replace: true });
      return;
    }

    dispatch({ type: 'SET_CONFIG', config: cfg });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!config) return;
    // Safe forward-ref: called in effect BODY (runs post-render, after
    // fetchQuestion's const is initialized) — not in a deps array, so no TDZ.
    // eslint-disable-next-line no-use-before-define, react-hooks/exhaustive-deps
    fetchQuestion(config, []);
  }, [config]);

  /* -------- TTS helpers -------- */

  // Fetch TTS audio for text, returning a Blob (cached after first fetch).
  const fetchTtsBlob = useCallback(async (text) => {
    if (ttsCacheRef.current.has(text)) {
      return ttsCacheRef.current.get(text);
    }

    const token = localStorage.getItem('jamie_token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const fetchRes = await fetch('/api/tts', {
      method: 'POST',
      headers,
      body: JSON.stringify({ text }),
    });

    if (!fetchRes.ok) return null;

    const blob = await fetchRes.blob();

    // Evict oldest entry when cache exceeds 20 items
    if (ttsCacheRef.current.size >= 20) {
      const firstKey = ttsCacheRef.current.keys().next().value;
      ttsCacheRef.current.delete(firstKey);
    }

    ttsCacheRef.current.set(text, blob);
    return blob;
  }, []);

  // Play audio from a blob URL. shouldRevoke controls whether to call
  // URL.revokeObjectURL after playback (true when the URL is ephemeral).
  const playTtsFromUrl = useCallback((url, onEnd, shouldRevoke = true) => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (shouldRevoke) {
      audioObjUrl.current = url;
    }

    const audio = new Audio(url);
    audioRef.current = audio;
    setIsPlayingTts(true);

    const cleanup = () => {
      setIsPlayingTts(false);
      if (shouldRevoke && audioObjUrl.current === url) {
        URL.revokeObjectURL(url);
        audioObjUrl.current = null;
      }
      onEnd?.();
    };

    audio.addEventListener('ended', cleanup);
    audio.addEventListener('error', cleanup);
    audio.play().catch(cleanup);
  }, []);

  // High-level: fetch (with cache) then play.
  const playTts = useCallback(async (text, onEnd) => {
    stopAudio();
    try {
      const blob = await fetchTtsBlob(text);
      if (!blob) { onEnd?.(); return; }
      const url = URL.createObjectURL(blob);
      playTtsFromUrl(url, onEnd, true);
    } catch {
      setIsPlayingTts(false);
      onEnd?.();
    }
  }, [fetchTtsBlob, playTtsFromUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  function stopAudio() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsPlayingTts(false);
    if (audioObjUrl.current) {
      URL.revokeObjectURL(audioObjUrl.current);
      audioObjUrl.current = null;
    }
  }

  /* -------- Prefetch: fetch next question + TTS during FEEDBACK -------- */
  const startPrefetch = useCallback(async (cfg, excludeIds) => {
    if (prefetchingRef.current) return;
    prefetchingRef.current = true;
    prefetchRef.current = null;

    try {
      const params = new URLSearchParams({ mode: cfg.mode });
      if (cfg.categories?.length > 0) params.set('category', cfg.categories.join(','));
      if (excludeIds?.length > 0) params.set('exclude', excludeIds.join(','));

      const res = await apiGet(`/api/question?${params.toString()}`);
      if (!res.ok || !res.data || res.data.done) return;

      // Backend returns the question object flat: { id, question, key_points, ... }
      const question = res.data;

      // Pre-warm TTS cache
      let ttsBlob = null;
      const voiceActive = cfg.voiceEnabled && user?.hasElevenLabsKey;
      if (voiceActive) {
        ttsBlob = await fetchTtsBlob(question.question).catch(() => null);
      }

      prefetchRef.current = { question, ttsBlob };
    } catch {
      // Prefetch failures are silent — fallback to normal fetch
    } finally {
      prefetchingRef.current = false;
    }
  }, [user, fetchTtsBlob]);

  // Trigger prefetch as soon as FEEDBACK phase starts
  useEffect(() => {
    if (phase !== 'FEEDBACK' || !config) return;
    const nextExclude = currentQuestion
      ? [...askedIds, currentQuestion.id]
      : askedIds;
    startPrefetch(config, nextExclude);
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  /* -------- 7.2 Fetch a question -------- */
  const fetchQuestion = useCallback(async (cfg, excludeIds) => {
    // Use prefetch slot if available
    if (prefetchRef.current) {
      const { question, ttsBlob } = prefetchRef.current;
      prefetchRef.current = null;

      dispatch({ type: 'QUESTION_LOADED', question, nextPhase: 'IDLE' });

      const voiceActive = cfg.voiceEnabled && user?.hasElevenLabsKey;
      if (voiceActive && ttsBlob) {
        const url = URL.createObjectURL(ttsBlob);
        playTtsFromUrl(url, () => {}, true);
      } else if (voiceActive) {
        // Blob wasn't ready (rare) — fetch now
        playTts(question.question, () => {});
      }

      // Kick off prefetch for the question after this one
      startPrefetch(cfg, [...excludeIds, question.id]);
      return;
    }

    dispatch({ type: 'PHASE', phase: 'LOADING' });

    const params = new URLSearchParams({ mode: cfg.mode });
    if (cfg.categories && cfg.categories.length > 0) {
      params.set('category', cfg.categories.join(','));
    }
    if (excludeIds && excludeIds.length > 0) {
      params.set('exclude', excludeIds.join(','));
    }

    const res = await apiGet(`/api/question?${params.toString()}`);

    if (!res.ok || !res.data || res.data.done) {
      // Error or bank exhausted ({ done: true }) — go to summary
      dispatch({ type: 'DONE' });
      return;
    }

    // Backend returns the question object flat: { id, question, key_points, ... }
    const question = res.data;

    // Show question text immediately — don't wait for TTS blob
    dispatch({ type: 'QUESTION_LOADED', question, nextPhase: 'IDLE' });

    const voiceActive = cfg.voiceEnabled && user?.hasElevenLabsKey;
    if (voiceActive) {
      // Fetch TTS in background; plays as soon as blob arrives
      playTts(question.question, () => {});
    }

    // Start prefetching the next question while user reads/hears this one
    startPrefetch(cfg, [...excludeIds, question.id]);
  }, [user, playTts, playTtsFromUrl, startPrefetch]);

  /* -------- Navigate to summary when phase = DONE -------- */
  useEffect(() => {
    if (phase === 'DONE') {
      navigate('/app/summary', {
        state: { results, mode, config },
        replace: false,
      });
    }
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  /* -------- 7.3 SpeechRecognition setup -------- */
  function startRecognition() {
    if (isRecordingRef.current) return;
    isRecordingRef.current = true;

    setInterimTranscript('');
    setFinalTranscript('');

    if (navigator.mediaDevices?.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => { micStreamRef.current = stream; })
        .catch(() => { micStreamRef.current = null; });
    }

    const recog = new SpeechRecognitionAPI();
    recognitionRef.current = recog;
    recog.continuous = config?.inputMode === 'hold' ? false : true;
    recog.interimResults = true;
    recog.lang = 'en-US';

    recog.onresult = (e) => {
      let interim = '';
      let finalText = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) {
          finalText += r[0].transcript;
        } else {
          interim += r[0].transcript;
        }
      }
      if (finalText) {
        setFinalTranscript(prev => (prev + ' ' + finalText).trim());
      }
      setInterimTranscript(interim);
    };

    recog.onerror = () => {
      stopRecognition(true);
    };

    recog.onend = () => {
      if (isRecordingRef.current) {
        isRecordingRef.current = false;
        dispatch({ type: 'PHASE', phase: 'IDLE' });
      }
    };

    dispatch({ type: 'PHASE', phase: 'LISTENING' });

    try {
      recog.start();
    } catch {
      isRecordingRef.current = false;
      dispatch({ type: 'PHASE', phase: 'IDLE' });
    }
  }

  function stopRecognition(skipFinalize = false) {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
    isRecordingRef.current = false;

    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(t => t.stop());
      micStreamRef.current = null;
    }

    if (!skipFinalize) {
      dispatch({ type: 'PHASE', phase: 'IDLE' });
    }
  }

  // Tracks prior phase (kept for any phase-transition logic / resets)
  const prevPhaseRef = useRef('LOADING');
  useEffect(() => {
    prevPhaseRef.current = phase;
  }, [phase]);

  /* -------- 7.4 Evaluate answer -------- */
  const evaluateAnswer = useCallback(async (answer) => {
    if (!currentQuestion || !config) return;

    dispatch({ type: 'PHASE', phase: 'PROCESSING' });

    const body = {
      question:    currentQuestion.question,
      user_answer: answer,
      mode:        config.mode,
    };

    if (currentQuestion.key_points)  body.key_points = currentQuestion.key_points;
    if (currentQuestion.star_hints)  body.star_hints  = currentQuestion.star_hints;

    const res = await apiPost('/api/evaluate', body);

    if (!res.ok || !res.data) {
      dispatch({ type: 'SET_ERROR', error: 'Evaluation failed — please try again.' });
      return;
    }

    const evaluation = res.data.evaluation ?? res.data;

    dispatch({ type: 'EVALUATION_DONE', answer, evaluation });

    if (config.voiceEnabled && user?.hasElevenLabsKey && evaluation.feedback_line) {
      playTts(evaluation.feedback_line, () => {
        setIsPlayingTts(false);
      });
    }
  }, [currentQuestion, config, user, playTts]);

  /* -------- Submit recorded answer (manual) --------
     Combines finalized + any trailing interim words so the last
     un-finalized phrase isn't dropped. Stops recognition first.
     Defined AFTER evaluateAnswer so the dependency isn't in the TDZ. */
  const handleSubmitAnswer = useCallback(() => {
    if (isRecordingRef.current) {
      stopRecognition(true);
    }
    const answer = `${finalTranscript} ${interimTranscript}`.trim();
    if (!answer) return;
    evaluateAnswer(answer);
  }, [finalTranscript, interimTranscript, evaluateAnswer]); // eslint-disable-line react-hooks/exhaustive-deps


  /* -------- 7.5 Next question -------- */
  const handleNextQuestion = useCallback(() => {
    stopAudio();
    setInterimTranscript('');
    setFinalTranscript('');
    setTextFallback('');
    prevPhaseRef.current = 'LOADING';

    const isLast = completedCount >= config.count;

    if (isLast) {
      navigate('/app/summary', {
        state: { results, mode, config },
        replace: false,
      });
      return;
    }

    const newAskedIds = currentQuestion
      ? [...askedIds, currentQuestion.id]
      : askedIds;

    dispatch({ type: 'NEXT_QUESTION_ASKED' });
    fetchQuestion({ ...config }, newAskedIds);
  }, [completedCount, config, results, mode, currentQuestion, askedIds, navigate, fetchQuestion]);

  /* -------- 7.6 Skip -------- */
  const handleSkip = useCallback(() => {
    stopAudio();
    stopRecognition(true);
    setInterimTranscript('');
    setFinalTranscript('');
    setTextFallback('');
    prevPhaseRef.current = 'LOADING';

    const newAskedIds = currentQuestion
      ? [...askedIds, currentQuestion.id]
      : askedIds;

    dispatch({ type: 'QUESTION_SKIPPED' });
    fetchQuestion({ ...config }, newAskedIds);
  }, [currentQuestion, askedIds, config, fetchQuestion]); // eslint-disable-line react-hooks/exhaustive-deps

  /* -------- 7.6 Repeat -------- */
  const handleRepeat = useCallback(() => {
    if (!currentQuestion || !config?.voiceEnabled || !user?.hasElevenLabsKey) return;
    stopAudio();
    playTts(currentQuestion.question, () => {});
  }, [currentQuestion, config, user, playTts]);

  /* -------- 7.6 End session -------- */
  const handleEndSession = useCallback(() => {
    stopAudio();
    stopRecognition(true);
    navigate('/app/summary', {
      state: { results, mode, config },
      replace: false,
    });
  }, [results, mode, config, navigate]);

  /* -------- Skip TTS playback -------- */
  const handleSkipTts = useCallback(() => {
    stopAudio();
  }, []);

  /* -------- Textarea fallback: submit -------- */
  const handleTextSubmit = useCallback(() => {
    const ans = textFallback.trim();
    if (!ans) return;
    setFinalTranscript(ans);
    evaluateAnswer(ans);
  }, [textFallback, evaluateAnswer]);

  /* ----------------------------------------------------------------
     Compute derived values
  ---------------------------------------------------------------- */
  const voiceActive    = config?.voiceEnabled && user?.hasElevenLabsKey;
  const isRecording    = phase === 'LISTENING';
  const showPtt        = SPEECH_SUPPORTED;
  const showTextarea   = !SPEECH_SUPPORTED;
  const hasTranscript  = !!(finalTranscript.trim() || interimTranscript.trim());

  const displayedQuestionNum = Math.min(completedCount + 1, config?.count ?? 1);

  // JamieBlob animation state — isPlayingTts covers TTS speaking
  const blobState =
    isPlayingTts             ? 'speaking'   :
    phase === 'LISTENING'    ? 'listening'  :
    phase === 'PROCESSING'   ? 'processing' :
                               'idle';

  const isLastQuestion = completedCount + 1 >= (config?.count ?? 1);

  /* ----------------------------------------------------------------
     Render: loading (no question yet)
  ---------------------------------------------------------------- */
  if (!config || phase === 'LOADING') {
    return (
      <div className="interview-loading">
        <Spinner />
        <p className="interview-loading-msg">Getting your next question...</p>

        <style>{`
          .interview-loading {
            min-height: 100vh;
            background-color: var(--color-bg);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 1rem;
          }

          .interview-loading-msg {
            margin: 0;
            font-size: 0.9375rem;
            color: var(--color-text-secondary);
          }
        `}</style>
      </div>
    );
  }

  /* ----------------------------------------------------------------
     Render: main interview
  ---------------------------------------------------------------- */
  return (
    <div className="interview-page">
      {/* Header */}
      <header className="interview-header">
        <div className="interview-header-inner">
          <span className="interview-wordmark">
            <span style={{ color: 'var(--color-text-primary)' }}>jamie</span>
            <span style={{ color: 'var(--color-accent)' }}>.ai</span>
          </span>
          <button
            className="btn-ghost interview-end-btn"
            onClick={handleEndSession}
          >
            End Session
          </button>
        </div>
      </header>

      <main className="interview-main">
        <div className="interview-content">
          {/* Progress bar */}
          <SessionProgress
            current={displayedQuestionNum}
            total={config.count}
          />

          {/* Question card */}
          <QuestionCard question={currentQuestion?.question} phase={phase} />

          {/* JamieBlob */}
          <JamieBlob blobState={blobState} streamRef={micStreamRef} />

          {/* aria-live region */}
          <div
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className="sr-only"
          >
            {isPlayingTts                && 'Jamie is speaking...'}
            {phase === 'LISTENING'       && 'Recording...'}
            {phase === 'PROCESSING'      && 'Evaluating your answer...'}
            {phase === 'FEEDBACK'        && 'Feedback ready.'}
          </div>

          {/* Error message */}
          {error && (
            <p className="error-text interview-error">{error}</p>
          )}

          {/* Recording UI — shown in IDLE and LISTENING */}
          {(phase === 'IDLE' || phase === 'LISTENING') && (
            <div className="interview-recording-ui">
              {showPtt && (
                <>
                  <PushToTalkButton
                    inputMode={config.inputMode}
                    isRecording={isRecording}
                    isDisabled={phase === 'PROCESSING' || isPlayingTts}
                    onStart={startRecognition}
                    onStop={() => stopRecognition(false)}
                  />

                  <TranscriptPreview
                    transcript={finalTranscript || interimTranscript}
                    isFinal={!!finalTranscript && !interimTranscript}
                  />

                  {/* Submit — appears once there's something to evaluate.
                      Manual so the user controls when the answer is graded. */}
                  {hasTranscript && (
                    <button
                      className="btn-primary interview-submit-ptt"
                      onClick={handleSubmitAnswer}
                      disabled={phase === 'PROCESSING' || isPlayingTts}
                    >
                      Submit Answer
                    </button>
                  )}
                </>
              )}

              {showTextarea && (
                <div className="interview-textarea-wrap">
                  <label htmlFor="answer-textarea" className="label">
                    Type your answer
                  </label>
                  <textarea
                    id="answer-textarea"
                    className="input-field interview-textarea"
                    value={textFallback}
                    onChange={e => setTextFallback(e.target.value)}
                    placeholder="Type your answer here..."
                    rows={5}
                    disabled={phase === 'PROCESSING'}
                  />
                  <button
                    className="btn-primary interview-submit-btn"
                    onClick={handleTextSubmit}
                    disabled={!textFallback.trim() || phase === 'PROCESSING'}
                  >
                    Submit Answer
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Processing state */}
          {phase === 'PROCESSING' && (
            <div className="interview-processing">
              <Spinner size="sm" />
              <span className="interview-processing-msg">Evaluating your answer...</span>
            </div>
          )}

          {/* Feedback panel */}
          {phase === 'FEEDBACK' && results.length > 0 && (
            <FeedbackPanel
              evaluation={results[results.length - 1].evaluation}
              mode={mode}
              onSkipTts={handleSkipTts}
              isPlayingTts={isPlayingTts}
              onNextQuestion={handleNextQuestion}
              isLastQuestion={isLastQuestion}
            />
          )}

          {/* Controls (skip question, repeat audio, end) */}
          {(phase === 'IDLE' || phase === 'LISTENING') && (
            <div className="interview-controls">
              <button
                className="btn-ghost interview-ctrl-btn"
                onClick={handleSkip}
                disabled={phase === 'PROCESSING'}
                title="Skip this question (does not count toward your score)"
              >
                Skip
              </button>

              {voiceActive && isPlayingTts && (
                <button
                  className="btn-ghost interview-ctrl-btn"
                  onClick={handleSkipTts}
                  title="Stop audio and answer now"
                >
                  Stop audio
                </button>
              )}

              {voiceActive && !isPlayingTts && (
                <button
                  className="btn-ghost interview-ctrl-btn"
                  onClick={handleRepeat}
                  title="Replay the question out loud"
                >
                  Repeat
                </button>
              )}

              <button
                className="btn-ghost interview-ctrl-btn"
                onClick={handleEndSession}
                title="End session and view summary"
              >
                End
              </button>
            </div>
          )}
        </div>
      </main>

      <style>{`
        .interview-page {
          min-height: 100vh;
          background-color: var(--color-bg);
          display: flex;
          flex-direction: column;
        }

        /* Header */
        .interview-header {
          padding: 0.875rem 1.5rem;
          border-bottom: 1px solid var(--color-border);
          background-color: var(--color-surface);
          flex-shrink: 0;
        }

        .interview-header-inner {
          max-width: 720px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .interview-wordmark {
          font-family: var(--font-serif);
          font-size: 1.25rem;
          font-weight: normal;
          letter-spacing: -0.01em;
        }

        .interview-end-btn {
          font-size: 0.875rem;
        }

        /* Main content */
        .interview-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 1.5rem 1rem 2rem;
          overflow-y: auto;
        }

        .interview-content {
          width: 100%;
          max-width: 720px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        /* Error */
        .interview-error {
          margin-bottom: 0.75rem;
          text-align: center;
        }

        /* Recording UI */
        .interview-recording-ui {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        /* Textarea fallback */
        .interview-textarea-wrap {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .interview-textarea {
          resize: vertical;
          min-height: 120px;
          font-size: 0.9375rem;
          line-height: 1.6;
        }

        .interview-submit-btn {
          align-self: flex-end;
          padding: 0.625rem 1.5rem;
        }

        /* PTT submit — centered under the transcript */
        .interview-submit-ptt {
          margin-top: 1rem;
          padding: 0.625rem 2rem;
          align-self: center;
        }

        /* Processing inline */
        .interview-processing {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          padding: 1rem 0;
          color: var(--color-text-secondary);
        }

        .interview-processing-msg {
          font-size: 0.9375rem;
        }

        /* Controls row */
        .interview-controls {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.25rem;
          margin-top: 0.5rem;
        }

        .interview-ctrl-btn {
          font-size: 0.8125rem;
          padding: 0.375rem 0.75rem;
          color: var(--color-text-muted);
        }

        .interview-ctrl-btn:hover:not(:disabled) {
          color: var(--color-text-secondary);
        }

        /* Screen-reader only */
        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }

        /* Responsive */
        @media (max-width: 480px) {
          .interview-main {
            padding: 0.75rem 0 1.5rem;
          }

          .interview-header {
            padding: 0.75rem 1rem;
          }

          .interview-content {
            padding: 0 0.75rem;
            max-width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
