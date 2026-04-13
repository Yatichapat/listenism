"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getAccessToken, me } from "@/services/api/auth";
import { recordSongListen } from "@/services/api/music";
import {
  commentSong,
  deleteComment,
  isSongLikedInStorage,
  likeSong,
  listComments,
  markSongAsLiked,
  reportSong,
  unlikeSong,
  updateComment,
  type CommentItem,
} from "@/services/api/social";
import { type SongProps } from "@/types/songs";
import CommentDrawer from "@/app/components/CommentDrawer";
import SaveToPlaylistDropdown from "@/app/components/SaveToPlaylistDropdown";

const FALLBACK_COVER = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><rect width="400" height="400" rx="36" fill="#0f172a"/><circle cx="200" cy="152" r="64" fill="rgba(255,255,255,0.08)"/><rect x="100" y="250" width="200" height="18" rx="9" fill="#e2e8f0" fill-opacity="0.9"/><rect x="128" y="282" width="144" height="12" rx="6" fill="#e2e8f0" fill-opacity="0.55"/></svg>`,
)} `;

const LIKED_SONGS_CHANGED_EVENT = "listenism-liked-songs-changed";



export default function Song({
  id,
  title,
  artistName,
  genre,
  audioUrl,
  coverUrl,
  viewCount = 0,
  likeCount = 0,
  isLiked: initialIsLiked,
  // Controlled drawer props (provided by SongList)
  drawerOpen: controlledDrawerOpen,
  onOpenDrawer,
  onCloseDrawer,
  onPrev,
  onNext,
}: SongProps & {
  drawerOpen?: boolean;
  onOpenDrawer?: () => void;
  onCloseDrawer?: () => void;
  onPrev?: () => void;
  onNext?: () => void;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  // Initialize only from the server-provided prop so SSR and client render match.
  // The syncLikedState effect below will reconcile with localStorage after hydration.
  const [isLiked, setIsLiked] = useState(() => Boolean(initialIsLiked));
  const [likeDelta, setLikeDelta] = useState(0);
  const [liking, setLiking] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reported, setReported] = useState(false);
  const [listenRecorded, setListenRecorded] = useState(false);
  const [commenting, setCommenting] = useState(false);
  // When controlled drawer props are provided, use them; otherwise manage locally.
  const [localDrawerOpen, setLocalDrawerOpen] = useState(false);
  const commentOpen = controlledDrawerOpen ?? localDrawerOpen;
  const openDrawer = () => { onOpenDrawer ? onOpenDrawer() : setLocalDrawerOpen(true); };
  const closeDrawer = () => { onCloseDrawer ? onCloseDrawer() : setLocalDrawerOpen(false); };
  const [commentDraft, setCommentDraft] = useState("");
  const [commented, setCommented] = useState(false);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [commentActionBusy, setCommentActionBusy] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  const displayedLikeCount = likeCount + likeDelta;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    const handlePause = () => setIsPlaying(false);
    const handlePlay = () => setIsPlaying(true);
    const handleEnd = () => setIsPlaying(false);
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleDurationChange = () => setDuration(audio.duration || 0);

    audio.addEventListener("pause", handlePause);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("ended", handleEnd);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("durationchange", handleDurationChange);

    return () => {
      audio.pause();
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("ended", handleEnd);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("durationchange", handleDurationChange);
    };
  }, []);

  useEffect(() => {
    if (initialIsLiked) {
      markSongAsLiked(id);
    }
  }, [id, initialIsLiked]);

  useEffect(() => {
    function syncLikedState() {
      const nextLiked = isSongLikedInStorage(id);
      setIsLiked((currentLiked) => {
        if (currentLiked === nextLiked) {
          return currentLiked;
        }

        setLikeDelta((currentDelta) => currentDelta + (nextLiked ? 1 : -1));
        return nextLiked;
      });
    }

    syncLikedState();
    window.addEventListener(LIKED_SONGS_CHANGED_EVENT, syncLikedState);

    return () => {
      window.removeEventListener(LIKED_SONGS_CHANGED_EVENT, syncLikedState);
    };
  }, [id]);

  useEffect(() => {
    let mounted = true;

    async function loadComments() {
      if (!commentOpen) {
        return;
      }

      setCommentsLoading(true);
      try {
        const token = getAccessToken();
        const [nextComments, profile] = await Promise.all([
          listComments(id),
          token ? me(token).catch(() => null) : Promise.resolve(null),
        ]);
        if (mounted) {
          setComments(nextComments);
          setCurrentUserId(profile?.id ?? null);
        }
      } catch {
        if (mounted) {
          setComments([]);
          setCurrentUserId(null);
        }
      } finally {
        if (mounted) {
          setCommentsLoading(false);
        }
      }
    }

    void loadComments();

    return () => {
      mounted = false;
    };
  }, [commentOpen, id]);

  useEffect(() => {
    if (!commentOpen) {
      setEditingCommentId(null);
      setEditDraft("");
      setCommentActionBusy(false);
    }
  }, [commentOpen]);

  async function refreshComments(): Promise<void> {
    const nextComments = await listComments(id);
    setComments(nextComments);
  }

  async function onTogglePlay() {
    const audio = audioRef.current;
    if (!audio || !audioUrl) {
      return;
    }

    if (audio.paused) {
      try {
        await audio.play();
        if (!listenRecorded) {
          const token = getAccessToken();
          if (token) {
            try {
              await recordSongListen(token, id);
              setListenRecorded(true);
            } catch {
              // Ignore analytics failures and keep playback responsive.
            }
          }
        }
      } catch {
        setIsPlaying(false);
      }
      return;
    }

    audio.pause();
    setIsPlaying(false);
  }

  function onSeek(time: number) {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = time;
    setCurrentTime(time);
  }

  async function onReportSong() {
    const token = getAccessToken();
    if (!token || reporting || reported) {
      return;
    }

    setReporting(true);
    try {
      await reportSong(token, id, "Inappropriate or harmful song content");
      setReported(true);
    } catch {
      // Keep UI simple for now; moderation handling relies on backend reports.
    } finally {
      setReporting(false);
    }
  }

  async function onToggleLike() {
    const token = getAccessToken();
    if (!token || liking) {
      const redirectPath = pathname || "/";
      router.push(`/login?redirect=${encodeURIComponent(redirectPath)}`);
      return;
    }

    const nextLiked = !isLiked;
    const previousLiked = isLiked;
    const previousLikeDelta = likeDelta;
    setIsLiked(nextLiked);
    setLikeDelta((currentDelta) => currentDelta + (nextLiked ? 1 : -1));
    setLiking(true);

    try {
      if (nextLiked) {
        await likeSong(token, id);
      } else {
        await unlikeSong(token, id);
      }
    } catch {
      setIsLiked(previousLiked);
      setLikeDelta(previousLikeDelta);
    } finally {
      setLiking(false);
    }
  }

  async function onSubmitComment() {
    const token = getAccessToken();
    if (!token) {
      const redirectPath = pathname || "/";
      router.push(`/login?redirect=${encodeURIComponent(redirectPath)}`);
      return;
    }

    const trimmedComment = commentDraft.trim();
    if (!trimmedComment || commenting) {
      return;
    }

    setCommenting(true);
    try {
      await commentSong(token, id, trimmedComment);
      setCommented(true);
      setCommentDraft("");
      await refreshComments();
    } catch {
      // Keep the card responsive if comment submission fails.
    } finally {
      setCommenting(false);
    }
  }

  function onStartEditComment(comment: CommentItem): void {
    setEditingCommentId(comment.id);
    setEditDraft(comment.content);
  }

  function onCancelEditComment(): void {
    setEditingCommentId(null);
    setEditDraft("");
  }

  async function onSaveEditedComment(): Promise<void> {
    if (!editingCommentId) {
      return;
    }

    const token = getAccessToken();
    if (!token || commentActionBusy) {
      return;
    }

    const trimmed = editDraft.trim();
    if (!trimmed) {
      return;
    }

    setCommentActionBusy(true);
    try {
      await updateComment(token, editingCommentId, trimmed);
      await refreshComments();
      onCancelEditComment();
    } catch {
      // Keep UX non-blocking on API errors.
    } finally {
      setCommentActionBusy(false);
    }
  }

  async function onDeleteExistingComment(commentId: number): Promise<void> {
    const token = getAccessToken();
    if (!token || commentActionBusy) {
      return;
    }

    setCommentActionBusy(true);
    try {
      await deleteComment(token, commentId);
      await refreshComments();
      if (editingCommentId === commentId) {
        onCancelEditComment();
      }
    } catch {
      // Keep UX non-blocking on API errors.
    } finally {
      setCommentActionBusy(false);
    }
  }

  return (
    <article
      className="group flex w-48 shrink-0 snap-start flex-col gap-3 transition-transform hover:-translate-y-1 cursor-pointer"
      onClick={openDrawer}
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-xl shadow-md transition-shadow group-hover:shadow-xl group-hover:shadow-indigo-500/20">
        <img
          src={coverUrl || FALLBACK_COVER}
          alt={title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={(event) => {
            event.currentTarget.src = FALLBACK_COVER;
          }}
        />
        <div className={`absolute inset-0 bg-black/40 ${isPlaying ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300 group-hover:opacity-100 flex items-center justify-center backdrop-blur-[2px]`}>
          <button
           onClick={(e) => { e.stopPropagation(); void onTogglePlay(); }}
           disabled={!audioUrl}
           className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500 text-white shadow-lg shadow-blue-500/40 hover:scale-105 transition-transform disabled:opacity-50 cursor-pointer">
            {isPlaying ? (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                 <path fillRule="evenodd" d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 ml-1">
                <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        </div>
      </div>
      <div>
        <h3 className="truncate font-semibold text-slate-900 dark:text-white text-base">{title}</h3>
        <div className="flex justify-between items-center mt-0.5">
           <p className="truncate text-sm text-slate-500 dark:text-slate-400">{artistName}</p>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); void onReportSong(); }}
              disabled={reporting || reported}
              className="rounded-md border border-amber-200/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-amber-500/40 dark:text-amber-300"
            >
              {reported ? "Reported" : reporting ? "Reporting" : "Report"}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); void onToggleLike(); }}
              disabled={liking}
              className={`transition-colors ${isLiked ? "text-rose-500 drop-shadow-md cursor-pointer" : "text-slate-400 hover:text-slate-300 dark:text-slate-500 dark:hover:text-slate-400 cursor-pointer"} disabled:cursor-not-allowed disabled:opacity-60`}
            >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path d="m11.645 20.91-.007-.003-.022-.012a15.247 15.247 0 0 1-.383-.218 25.18 25.18 0 0 1-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0 1 12 5.052 5.5 5.5 0 0 1 16.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 0 1-4.244 3.17 15.247 15.247 0 0 1-.383.219l-.022.012-.007.004-.003.001a.752.752 0 0 1-.704 0l-.003-.001Z" />
                </svg>
            </button>
            <div onClick={(e) => e.stopPropagation()}>
              <SaveToPlaylistDropdown songId={id} />
            </div>
          </div>
        </div>
      </div>

      <CommentDrawer
        open={commentOpen}
        onClose={closeDrawer}
        songTitle={title}
        artistName={artistName}
        coverUrl={coverUrl ?? undefined}
        isPlaying={isPlaying}
        hasAudio={Boolean(audioUrl)}
        currentTime={currentTime}
        duration={duration}
        onTogglePlay={() => void onTogglePlay()}
        onSeek={onSeek}
        onPrev={onPrev}
        onNext={onNext}
        commentDraft={commentDraft}
        onCommentDraftChange={setCommentDraft}
        onSubmitComment={() => void onSubmitComment()}
        commenting={commenting}
        commented={commented}
        comments={comments}
        commentsLoading={commentsLoading}
        currentUserId={currentUserId}
        editingCommentId={editingCommentId}
        editDraft={editDraft}
        commentActionBusy={commentActionBusy}
        onStartEditComment={onStartEditComment}
        onCancelEditComment={onCancelEditComment}
        onEditDraftChange={setEditDraft}
        onSaveEditedComment={() => void onSaveEditedComment()}
        onDeleteComment={(commentId) => void onDeleteExistingComment(commentId)}
      />

      {audioUrl ? (
        <audio ref={audioRef} src={audioUrl} preload="none" className="hidden" aria-label={`song-${id}`} />
      ) : null}
    </article>
  );
}
