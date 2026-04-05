export type Album = {
    id: number;
    title: string;
    artist_name: string;
    cover_url: string | null;
};

export type AlbumDetail = Album & {
    songs: {
        id: number;
        title: string;
        artist_name: string;
        genre: string | null;
        audio_url: string | null;
        cover_url?: string | null;
        view_count?: number;
        like_count?: number;
    }[];
};
