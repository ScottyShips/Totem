"use client";

import { useEffect, useState } from "react";

import { apiFetch } from "@/lib/api";
import type { Artist, ArtistSpotifyResponse } from "@/types";

interface Props {
  artist: Artist;
}

type State =
  | { kind: "idle"; spotifyId: string }
  | { kind: "loading" }
  | { kind: "missing" };

export default function SpotifyEmbed({ artist }: Props) {
  const [state, setState] = useState<State>(() =>
    artist.spotify_id ? { kind: "idle", spotifyId: artist.spotify_id } : { kind: "loading" },
  );

  useEffect(() => {
    if (artist.spotify_id) {
      setState({ kind: "idle", spotifyId: artist.spotify_id });
      return;
    }
    let cancelled = false;
    setState({ kind: "loading" });
    apiFetch<ArtistSpotifyResponse>(`/api/v1/artists/${artist.id}/spotify`)
      .then((res) => {
        if (cancelled) return;
        if (res.spotify_id) {
          setState({ kind: "idle", spotifyId: res.spotify_id });
        } else {
          setState({ kind: "missing" });
        }
      })
      .catch(() => {
        if (!cancelled) setState({ kind: "missing" });
      });
    return () => {
      cancelled = true;
    };
  }, [artist.id, artist.spotify_id]);

  if (state.kind === "missing") {
    return null;
  }

  if (state.kind === "loading") {
    return <div className="mb-4 h-[152px] rounded-xl bg-zinc-800/50 animate-pulse" />;
  }

  return (
    <div className="mb-4 rounded-xl overflow-hidden">
      <iframe
        title={`${artist.name} on Spotify`}
        src={`https://open.spotify.com/embed/artist/${state.spotifyId}?utm_source=generator&theme=0`}
        width="100%"
        height={152}
        frameBorder={0}
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        loading="lazy"
      />
    </div>
  );
}
