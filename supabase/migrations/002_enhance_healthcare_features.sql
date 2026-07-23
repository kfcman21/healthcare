-- 002_enhance_healthcare_features.sql
-- 1. 전교생 인적사항 (나이스 엑셀 다운로드 기반) 테이블 생성
CREATE TABLE IF NOT EXISTS students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  grade TEXT NOT NULL,
  class_room TEXT NOT NULL,
  number_code TEXT NOT NULL,
  student_name TEXT NOT NULL,
  gender TEXT,
  remarks TEXT,
  created_at DATETIME DEFAULT (datetime('now', 'localtime'))
);

-- 2. visits (방문 일지) 테이블 구조 확장
ALTER TABLE visits ADD COLUMN injury_site TEXT;
ALTER TABLE visits ADD COLUMN bed_in_time TEXT;
ALTER TABLE visits ADD COLUMN bed_out_time TEXT;
ALTER TABLE visits ADD COLUMN vital_temp TEXT;
ALTER TABLE visits ADD COLUMN vital_bp TEXT;
ALTER TABLE visits ADD COLUMN vital_hr TEXT;
ALTER TABLE visits ADD COLUMN vital_spo2 TEXT;
ALTER TABLE visits ADD COLUMN pain_scale INTEGER DEFAULT 0;
ALTER TABLE visits ADD COLUMN gender TEXT;
