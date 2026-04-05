"use client";

import { useEffect } from "react";

export default function AudioPlaybackCoordinator() {
  useEffect(() => {
    function handlePlay(event: Event) {
      const currentAudio = event.target;
      if (!(currentAudio instanceof HTMLAudioElement)) {
        return;
      }

      const allAudioElements = document.querySelectorAll("audio");
      allAudioElements.forEach((audioElement) => {
        if (audioElement !== currentAudio && !audioElement.paused) {
          audioElement.pause();
        }
      });
    }

    // Use capture phase so we react immediately when any audio starts.
    document.addEventListener("play", handlePlay, true);

    return () => {
      document.removeEventListener("play", handlePlay, true);
    };
  }, []);

  return null;
}
