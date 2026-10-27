export interface AppPayload {
  baseUrl: string;
  apiUrl: string;
  basename: string;
  initialPath: string;
  appName: string;
}

export interface Photo {
  id: number;
  file: string;
  bib: string;
  ocr_text: string;
  ocr_confidence: number;
  ocr_source?: string;
  captured_at: string;
  category: string;
}

export interface PhotoEventSummary {
  id: number;
  slug: string;
  name: string;
  location: string;
  event_date: string;
  cover: string;
  description: string;
  photographer: string;
  is_active: number;
  photo_count: number;
  bib_count: number;
  ocr_indexed: number;
}

export interface PhotoEventDetail extends PhotoEventSummary {
  photos: Photo[];
  match_count: number;
}

export interface PhotoStats {
  events: number;
  photos: number;
  bibs: number;
  ocr_indexed: number;
}

export interface PhotoListPayload {
  events: PhotoEventSummary[];
  stats: PhotoStats;
}

export interface PhotoEventPayload {
  event: PhotoEventDetail;
  photos: Photo[];
  bib: string;
  match_count: number;
}

export interface AdminUser {
  id: number;
  username: string;
  display_name: string;
}

export interface SessionPayload {
  admin: AdminUser | null;
  has_admin: boolean;
  csrf_token: string;
}

export interface RaceSummary {
  id: number;
  name: string;
  slug: string;
  api_url?: string;
  is_active: number;
  last_sync_status: string | null;
  last_sync_at: string | null;
  last_sync_message: string | null;
  last_sync_count: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface RaceResultRow {
  bib: string | null;
  name: string | null;
  category: string | null;
  gender: string | null;
  age_group: string | null;
  gun_time: string | null;
  net_time: string | null;
  overall_rank: number | null;
  gender_rank: number | null;
  age_rank: number | null;
  status: string | null;
}

export interface Pagination {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

export interface RaceDetailPayload {
  race: { name: string; slug: string; last_sync_at: string | null };
  results: RaceResultRow[];
  categories: string[];
  filters: { q: string; category: string; per_page: number };
  pagination: Pagination;
}

export interface LiveRow {
  [key: string]: string | number;
}

export interface LiveResultsPayload {
  columns: string[];
  category_column: string | null;
  time_column: string | null;
  name_column: string | null;
  bib_column: string | null;
  results: LiveRow[];
  categories: string[];
  filters: { q: string; category: string; per_page: number };
  pagination: Pagination;
}

export interface OcrResult {
  ok: boolean;
  bib: string;
  text: string;
  confidence: number;
  error: string;
}

export interface OcrPhotoResponse {
  photo: Photo;
  result: OcrResult;
}

export interface OcrBatchResponse {
  processed: number;
  indexed: number;
  remaining: number;
  errors: Array<{ id: number; file: string; error: string }>;
}

export interface UploadResponse {
  created: number;
  photos: Photo[];
  errors: string[];
}
