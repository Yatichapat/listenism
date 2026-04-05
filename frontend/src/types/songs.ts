
export type Song = {
    id: number;
    title: string;
    artist_name: string;
    genre: string | null;
    audio_url: string | null;
    cover_url?: string | null;
    view_count?: number;
    like_count?: number;
};

export type SongProps = {
    id: number;
    title: string;
    artistName: string;
    genre?: string | null;
    audioUrl?: string | null;
    coverUrl?: string | null;
    viewCount?: number;
    likeCount?: number;
};

