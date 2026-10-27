-- Racetap schema (safe to run on an existing database: uses IF NOT EXISTS).
-- Covers the new photo library plus the legacy race/admin tables that may be
-- missing on a fresh development database.

CREATE TABLE IF NOT EXISTS admin_users (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  username VARCHAR(80) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(120) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  last_login_at DATETIME NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY admin_users_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS race_events (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(190) NOT NULL,
  slug VARCHAR(190) NOT NULL,
  api_url VARCHAR(1000) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  last_sync_status VARCHAR(32) NULL,
  last_sync_at DATETIME NULL,
  last_sync_message TEXT NULL,
  last_sync_count INT UNSIGNED NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY race_events_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS race_results (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  race_id INT UNSIGNED NOT NULL,
  participant_key VARCHAR(190) NOT NULL,
  external_id VARCHAR(64) NULL,
  bib VARCHAR(32) NULL,
  name VARCHAR(190) NULL,
  category VARCHAR(120) NULL,
  gender VARCHAR(32) NULL,
  age_group VARCHAR(64) NULL,
  gun_time VARCHAR(32) NULL,
  net_time VARCHAR(32) NULL,
  overall_rank INT NULL,
  gender_rank INT NULL,
  age_rank INT NULL,
  status VARCHAR(64) NULL,
  raw_json MEDIUMTEXT NULL,
  synced_at DATETIME NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY race_results_participant (race_id, participant_key),
  KEY race_results_bib (race_id, bib),
  KEY race_results_category (race_id, category),
  CONSTRAINT race_results_race_fk FOREIGN KEY (race_id) REFERENCES race_events (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS photo_events (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug VARCHAR(190) NOT NULL,
  name VARCHAR(190) NOT NULL,
  location VARCHAR(190) NOT NULL DEFAULT '',
  event_date DATE NULL,
  cover VARCHAR(255) NOT NULL DEFAULT '',
  description TEXT NULL,
  photographer VARCHAR(190) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY photo_events_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS photos (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  event_id INT UNSIGNED NOT NULL,
  file VARCHAR(255) NOT NULL,
  bib VARCHAR(32) NULL,
  ocr_text VARCHAR(190) NULL,
  ocr_confidence DECIMAL(5,2) NOT NULL DEFAULT 0,
  ocr_source VARCHAR(20) NOT NULL DEFAULT 'manual',
  ocr_indexed_at DATETIME NULL,
  captured_at VARCHAR(16) NULL,
  category VARCHAR(64) NULL,
  original_name VARCHAR(190) NULL,
  mime VARCHAR(64) NULL,
  size_bytes INT UNSIGNED NULL,
  width INT UNSIGNED NULL,
  height INT UNSIGNED NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  PRIMARY KEY (id),
  KEY photos_event (event_id),
  KEY photos_bib (event_id, bib),
  CONSTRAINT photos_event_fk FOREIGN KEY (event_id) REFERENCES photo_events (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS photo_ocr_logs (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  photo_id INT UNSIGNED NULL,
  event_id INT UNSIGNED NULL,
  source VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL,
  bib VARCHAR(32) NULL,
  confidence DECIMAL(5,2) NULL,
  raw_text MEDIUMTEXT NULL,
  error TEXT NULL,
  created_at DATETIME NOT NULL,
  PRIMARY KEY (id),
  KEY photo_ocr_logs_photo (photo_id),
  KEY photo_ocr_logs_event (event_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
