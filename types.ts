export interface AnimeImages {
  jpg: {
    image_url: string;
    large_image_url: string;
  };
  webp: {
    image_url: string;
    large_image_url: string;
  };
}

export interface AnimeTrailer {
  youtube_id: string;
  url: string;
  embed_url: string;
  images: {
    image_url: string;
    small_image_url: string;
    medium_image_url: string;
    large_image_url: string;
    maximum_image_url: string;
  };
}

export interface AnimeGenre {
  mal_id: number;
  type: string;
  name: string;
  url: string;
}

export interface Anime {
  mal_id: number;
  url: string;
  images: AnimeImages;
  trailer: AnimeTrailer;
  approved: boolean;
  titles: { type: string; title: string }[];
  title: string;
  title_english: string;
  title_japanese: string;
  type: string;
  source: string;
  episodes: number;
  status: string;
  airing: boolean;
  duration: string;
  rating: string;
  score: number;
  scored_by: number;
  rank: number;
  popularity: number;
  members: number;
  favorites: number;
  synopsis: string;
  background: string;
  season: string;
  year: number;
  genres: AnimeGenre[];
  studios: AnimeGenre[];
}

export interface JikanResponse<T> {
  data: T;
  pagination: {
    last_visible_page: number;
    has_next_page: boolean;
    current_page: number;
    items: {
      count: number;
      total: number;
      per_page: number;
    };
  };
}

export interface Episode {
  mal_id: number;
  url: string;
  title: string;
  title_japanese: string;
  title_romanji: string;
  aired: string;
  score: number;
  filler: boolean;
  recap: boolean;
  forum_url: string;
}

export enum StreamingServer {
  TRAILER = 'Official Trailer (Jikan)',
  KURAMA = 'Kuramanime (Scrape)',
  SAMEHADAKU = 'Samehadaku (Scrape)',
  MOVIEBOX = 'MovieBox (Scrape)',
}
