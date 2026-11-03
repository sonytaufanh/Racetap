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
  ocr_indexed_at?: string | null;
  captured_at: string;
  category: string;
  bibs?: string[];
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
  ocr_rule?: OcrRule;
}

export interface PhotoEventDetail extends PhotoEventSummary {
  photos: Photo[];
  match_count: number;
  vision_enabled?: boolean;
  ocr?: OcrModeInfo;
  /** Official bib list for the event, used by the browser OCR pre-pick. */
  known_bibs?: string[];
}

export interface OcrModeInfo {
  mode: 'server' | 'browser';
  engine: string;
  label: string;
  /** Engine that must be used (RapidOCR); empty when any engine is allowed. */
  required_engine?: string;
  /** False when the required engine is unreachable. */
  primary_ready?: boolean;
  /** Actionable message shown to the admin when the primary engine is down. */
  warning?: string;
  available: Record<string, boolean>;
}

export interface OcrWordPayload {
  text: string;
  confidence?: number;
  box?: [number, number, number, number] | null;
}

export interface OcrResultDetail {
  ok: boolean;
  engine: string;
  text: string;
  confidence: number;
  bibs: string[];
  primary: string;
  ocr_rule?: OcrRule;
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
  role?: string;
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

/**
 * Per-event OCR rule. `digitsOnly` rejects alphanumeric candidates (letters are
 * still mapped to their digit look-alikes before matching) and `digits` pins the
 * exact bib length; 0 keeps the legacy 3-6 digit range.
 */
export interface OcrRule {
  digitsOnly: boolean;
  digits: number;
}

export interface OcrResult {
  ok: boolean;
  engine?: string;
  bib: string;
  text: string;
  confidence: number;
  bibs?: string[];
  primary?: string;
  ocr_rule?: OcrRule;
  error: string;
}

export interface OcrPhotoResponse {
  photo: Photo;
  result: OcrResult;
}

export interface OcrBatchResponse {
  engine: string;
  label: string;
  processed: number;
  indexed: number;
  multi: number;
  remaining: number;
  /** Rows already walked past in force mode (client sends it back as `seen`). */
  seen?: number;
  /** Size of the queue the server built for this call. */
  total?: number;
  batch_size?: number;
  ocr_rule?: OcrRule;
  errors: Array<{ id: number; file: string; error: string }>;
}

export interface OcrSubmitResponse {
  photo: Photo;
  result: OcrResultDetail;
}

export interface UploadResponse {
  created: number;
  photos: Photo[];
  errors: string[];
  vision_enabled?: boolean;
  ocr?: OcrModeInfo;
  ocr_indexed?: number;
}

export interface Pagination {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

export interface AdminStats {
  photo_events: number;
  photos: number;
  photos_with_bib: number;
  ocr_indexed: number;
  races: number;
  race_results: number;
  leads_new: number;
}

export interface SyncSummary {
  id: number;
  name: string;
  slug: string;
  is_active: number;
  last_sync_status: string | null;
  last_sync_at: string | null;
  last_sync_message: string | null;
  last_sync_count: number | null;
}

export interface ActivityEntry {
  admin_username: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  detail: string | null;
  created_at: string;
}

export interface AdminStatsPayload {
  stats: AdminStats;
  recent_syncs: SyncSummary[];
  recent_activity: ActivityEntry[];
}

export interface AuditEntry extends ActivityEntry {
  id: number;
  ip: string | null;
}

export interface AuditPayload {
  entries: AuditEntry[];
  pagination: Pagination;
}

export interface AdminUserRecord {
  id: number;
  username: string;
  display_name: string;
  role: string;
  is_active: number;
  last_login_at: string | null;
  created_at: string | null;
}

export interface UsersPayload {
  users: AdminUserRecord[];
  roles: string[];
}

export interface SettingsPayload {
  settings: Record<string, string>;
  saved?: string[];
}

export interface Lead {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  event_name: string | null;
  message: string | null;
  source: string;
  status: string;
  created_at: string;
}

export interface LeadsPayload {
  leads: Lead[];
  statuses?: string[];
  pagination: Pagination;
}

export interface RaceResultPreviewRow {
  bib: string | null;
  name: string | null;
  category: string | null;
  gender: string | null;
  age_group: string | null;
  gun_time: string | null;
  net_time: string | null;
  overall_rank: number | null;
  status: string | null;
}

export interface RaceResultsPreview {
  race: RaceSummary;
  results: RaceResultPreviewRow[];
  pagination: Pagination;
}

export interface MediaCheckItem {
  kind: 'photo' | 'cover';
  id: number;
  file: string;
}

export interface MediaCheckPayload {
  checked: number;
  total_missing: number;
  missing: MediaCheckItem[];
  truncated: boolean;
}