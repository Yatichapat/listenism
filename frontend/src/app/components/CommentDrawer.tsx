"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { type CommentItem } from "@/services/api/social";

interface CommentDrawerProps {
  open: boolean;
  onClose: () => void;
  songTitle: string;
  artistName: string;
  coverUrl?: string;
  // Playback
  isPlaying: boolean;
  hasAudio: boolean;
  currentTime: number;
  duration: number;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  onPrev?: () => void;
  onNext?: () => void;
  // Comments
  commentDraft: string;
  onCommentDraftChange: (value: string) => void;
  onSubmitComment: () => void;
  commenting: boolean;
  commented: boolean;
  comments: CommentItem[];
  commentsLoading: boolean;
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const FALLBACK_COVER = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><rect width="400" height="400" rx="36" fill="#0f172a"/><circle cx="200" cy="152" r="64" fill="rgba(255,255,255,0.08)"/><rect x="100" y="250" width="200" height="18" rx="9" fill="#e2e8f0" fill-opacity="0.9"/><rect x="128" y="282" width="144" height="12" rx="6" fill="#e2e8f0" fill-opacity="0.55"/></svg>`,
)}`;

export default function CommentDrawer({
  open,
  onClose,
  songTitle,
  artistName,
  coverUrl,
  isPlaying,
  hasAudio,
  currentTime,
  duration,
  onTogglePlay,
  onSeek,
  onPrev,
  onNext,
  commentDraft,
  onCommentDraftChange,
  onSubmitComment,
  commenting,
  commented,
  comments,
  commentsLoading,
}: CommentDrawerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [mounted, setMounted] = useState(false);

  // Mount guard — ensures createPortal only runs client-side
  useEffect(() => { setMounted(true); }, []);

  // Focus textarea when drawer opens
  useEffect(() => {
    if (open) {
      setTimeout(() => textareaRef.current?.focus(), 300);
    }
  }, [open]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && open) onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!mounted) return null;

  return createPortal(
    <>
      {/* Backdrop — stopPropagation prevents the click from bubbling through
           the React tree to the article's openDrawer onClick handler */}
      <div
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        className="comment-drawer-backdrop"
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(4px)",
          zIndex: 9998,
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 0.35s ease",
        }}
        aria-hidden="true"
      />

      {/* Drawer panel — stopPropagation so clicks inside don't reach the article */}
      <aside
        aria-label="Comments panel"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          height: "100dvh",
          width: "min(420px, 100vw)",
          background: "linear-gradient(160deg, #0f172a 0%, #1e1b4b 100%)",
          borderLeft: "1px solid rgba(99,102,241,0.2)",
          boxShadow: open ? "-8px 0 40px rgba(0,0,0,0.5)" : "none",
          zIndex: 9999,
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.38s cubic-bezier(0.32, 0.72, 0, 1)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 20px 16px",
            borderBottom: "1px solid rgba(99,102,241,0.15)",
            background: "rgba(255,255,255,0.03)",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {/* Cover thumbnail */}
            <img
              src={coverUrl || FALLBACK_COVER}
              alt={songTitle}
              onError={(e) => { e.currentTarget.src = FALLBACK_COVER; }}
              style={{
                width: 52,
                height: 52,
                borderRadius: 10,
                objectFit: "cover",
                flexShrink: 0,
                boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
              }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "rgba(165,180,252,0.8)",
                marginBottom: 2,
              }}>
                Comments
              </p>
              <h2 style={{
                fontSize: 15,
                fontWeight: 700,
                color: "#f1f5f9",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                margin: 0,
              }}>
                {songTitle}
              </h2>
              <p style={{
                fontSize: 12,
                color: "rgba(148,163,184,0.85)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                marginTop: 1,
              }}>
                {artistName}
              </p>
            </div>
            {/* Close button */}
            <button
              onClick={onClose}
              aria-label="Close comments"
              style={{
                flexShrink: 0,
                width: 34,
                height: 34,
                borderRadius: "50%",
                border: "1px solid rgba(99,102,241,0.3)",
                background: "rgba(99,102,241,0.1)",
                color: "#a5b4fc",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "background 0.2s, color 0.2s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(99,102,241,0.25)";
                (e.currentTarget as HTMLButtonElement).style.color = "#e0e7ff";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(99,102,241,0.1)";
                (e.currentTarget as HTMLButtonElement).style.color = "#a5b4fc";
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div
          style={{
            padding: "10px 20px 0",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, color: "rgba(148,163,184,0.7)", minWidth: 32, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
              {formatTime(currentTime)}
            </span>
            {/* Track */}
            <div
              style={{
                flex: 1,
                height: 4,
                borderRadius: 9999,
                background: "rgba(255,255,255,0.1)",
                position: "relative",
                cursor: hasAudio ? "pointer" : "default",
                overflow: "hidden",
              }}
              onClick={(e) => {
                if (!hasAudio || !duration) return;
                const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                onSeek(pct * duration);
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  height: "100%",
                  width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
                  background: "linear-gradient(90deg, #6366f1, #8b5cf6)",
                  borderRadius: 9999,
                  transition: "width 0.25s linear",
                }}
              />
            </div>
            <span style={{ fontSize: 11, color: "rgba(148,163,184,0.7)", minWidth: 32, fontVariantNumeric: "tabular-nums" }}>
              {formatTime(duration)}
            </span>
          </div>
        </div>
        <div
          style={{
            padding: "14px 20px",
            borderBottom: "1px solid rgba(99,102,241,0.12)",
            background: "rgba(255,255,255,0.02)",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
          }}
        >
          {/* Previous */}
          <button
            onClick={onPrev}
            disabled={!onPrev}
            aria-label="Previous song"
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              border: "1px solid rgba(99,102,241,0.25)",
              background: onPrev ? "rgba(99,102,241,0.1)" : "transparent",
              color: onPrev ? "#a5b4fc" : "rgba(100,116,139,0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: onPrev ? "pointer" : "default",
              transition: "background 0.2s, color 0.2s, transform 0.15s",
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              if (onPrev) {
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(99,102,241,0.22)";
                (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.08)";
              }
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = onPrev ? "rgba(99,102,241,0.1)" : "transparent";
              (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 24 24" fill="currentColor">
              <path d="M9.195 18.44c1.25.714 2.805-.189 2.805-1.629v-2.34l6.945 3.968c1.25.715 2.805-.188 2.805-1.628V8.69c0-1.44-1.555-2.343-2.805-1.628L12 11.029v-2.34c0-1.44-1.555-2.343-2.805-1.628l-7.108 4.061c-1.26.72-1.26 2.536 0 3.256l7.108 4.061Z" />
            </svg>
          </button>

          {/* Play / Pause */}
          <button
            onClick={onTogglePlay}
            disabled={!hasAudio}
            aria-label={isPlaying ? "Pause" : "Play"}
            style={{
              width: 52,
              height: 52,
              borderRadius: "50%",
              border: "none",
              background: hasAudio
                ? "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)"
                : "rgba(99,102,241,0.15)",
              color: hasAudio ? "#fff" : "rgba(165,180,252,0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: hasAudio ? "pointer" : "default",
              boxShadow: hasAudio && isPlaying ? "0 0 20px rgba(99,102,241,0.5)" : "none",
              transition: "box-shadow 0.3s, transform 0.15s",
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              if (hasAudio) (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.08)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
            }}
          >
            {isPlaying ? (
              <svg xmlns="http://www.w3.org/2000/svg" width={20} height={20} viewBox="0 0 24 24" fill="currentColor">
                <path fillRule="evenodd" d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width={20} height={20} viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: 2 }}>
                <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
              </svg>
            )}
          </button>

          {/* Next */}
          <button
            onClick={onNext}
            disabled={!onNext}
            aria-label="Next song"
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              border: "1px solid rgba(99,102,241,0.25)",
              background: onNext ? "rgba(99,102,241,0.1)" : "transparent",
              color: onNext ? "#a5b4fc" : "rgba(100,116,139,0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: onNext ? "pointer" : "default",
              transition: "background 0.2s, color 0.2s, transform 0.15s",
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              if (onNext) {
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(99,102,241,0.22)";
                (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.08)";
              }
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = onNext ? "rgba(99,102,241,0.1)" : "transparent";
              (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 24 24" fill="currentColor">
              <path d="M5.055 7.06C3.805 6.347 2.25 7.25 2.25 8.69v8.122c0 1.44 1.555 2.343 2.805 1.628L12 14.471v2.34c0 1.44 1.555 2.343 2.805 1.628l7.108-4.061c1.26-.72 1.26-2.536 0-3.256l-7.108-4.06C13.555 6.346 12 7.249 12 8.689v2.34L5.055 7.061Z" />
            </svg>
          </button>
        </div>

        {/* Comment input area */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid rgba(99,102,241,0.12)",
            flexShrink: 0,
            background: "rgba(255,255,255,0.02)",
          }}
        >
          <label style={{
            display: "block",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "rgba(165,180,252,0.75)",
            marginBottom: 8,
          }}>
            Add a comment
          </label>
          <textarea
            ref={textareaRef}
            value={commentDraft}
            onChange={(e) => onCommentDraftChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                onSubmitComment();
              }
            }}
            rows={3}
            placeholder="Write your thoughts… (⌘↵ to post)"
            style={{
              width: "100%",
              resize: "none",
              borderRadius: 10,
              border: "1px solid rgba(99,102,241,0.3)",
              background: "rgba(255,255,255,0.05)",
              color: "#f1f5f9",
              fontSize: 13,
              padding: "10px 12px",
              outline: "none",
              boxSizing: "border-box",
              transition: "border-color 0.2s, box-shadow 0.2s",
              fontFamily: "inherit",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "rgba(99,102,241,0.7)";
              e.currentTarget.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.12)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "rgba(99,102,241,0.3)";
              e.currentTarget.style.boxShadow = "none";
            }}
          />
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
            <button
              onClick={onSubmitComment}
              disabled={commenting || !commentDraft.trim()}
              style={{
                background: commentDraft.trim() && !commenting
                  ? "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)"
                  : "rgba(99,102,241,0.25)",
                color: commentDraft.trim() && !commenting ? "#fff" : "rgba(165,180,252,0.5)",
                border: "none",
                borderRadius: 8,
                padding: "8px 18px",
                fontSize: 13,
                fontWeight: 600,
                cursor: commenting || !commentDraft.trim() ? "not-allowed" : "pointer",
                transition: "all 0.2s",
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontFamily: "inherit",
              }}
            >
              {commenting ? (
                <>
                  <svg style={{ animation: "spin 1s linear infinite" }} xmlns="http://www.w3.org/2000/svg" width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                  </svg>
                  Posting…
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>
                  </svg>
                  {commented ? "Post again" : "Post"}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Comments list */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "16px 20px",
          }}
        >
          <p style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "rgba(165,180,252,0.75)",
            marginBottom: 12,
          }}>
            {commentsLoading ? "Loading…" : `${comments.length} Comment${comments.length !== 1 ? "s" : ""}`}
          </p>

          {commentsLoading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[1, 2, 3].map((i) => (
                <div key={i} style={{
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.04)",
                  padding: "12px 14px",
                  animation: "pulse 1.5s ease-in-out infinite",
                }}>
                  <div style={{ width: 80, height: 10, borderRadius: 6, background: "rgba(255,255,255,0.08)", marginBottom: 8 }} />
                  <div style={{ width: "90%", height: 10, borderRadius: 6, background: "rgba(255,255,255,0.05)" }} />
                </div>
              ))}
            </div>
          ) : comments.length === 0 ? (
            <div style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              paddingTop: 48,
              gap: 12,
              color: "rgba(148,163,184,0.6)",
            }}>
              <svg xmlns="http://www.w3.org/2000/svg" width={40} height={40} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4 }}>
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              <p style={{ fontSize: 14 }}>No comments yet</p>
              <p style={{ fontSize: 12, opacity: 0.7 }}>Be the first to share your thoughts!</p>
            </div>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
              {comments.map((comment) => (
                <li
                  key={comment.id}
                  style={{
                    borderRadius: 12,
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(99,102,241,0.1)",
                    padding: "12px 14px",
                    transition: "background 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLLIElement).style.background = "rgba(99,102,241,0.08)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLLIElement).style.background = "rgba(255,255,255,0.05)";
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#a5b4fc",
                    }}>
                      {comment.user_name}
                    </span>
                    <span style={{
                      fontSize: 11,
                      color: "rgba(148,163,184,0.6)",
                    }}>
                      {comment.created_at
                        ? new Date(comment.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
                        : ""}
                    </span>
                  </div>
                  <p style={{
                    fontSize: 13,
                    color: "#cbd5e1",
                    lineHeight: 1.55,
                    margin: 0,
                    wordBreak: "break-word",
                  }}>
                    {comment.content}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </>,
    document.body
  );
}
