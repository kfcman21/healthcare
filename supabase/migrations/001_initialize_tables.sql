-- 001_initialize_tables.sql
-- 보건실 운영에 필요한 필수 테이블(방문 일지, 요보호 학생, 의약품 재고)들을 초기 생성하는 스키마 파일입니다.
-- (사용되는 모든 텍스트 기반 민감 데이터는 데이터베이스 저장 전 암호화되어 TEXT 필드에 저장됩니다.)

-- 1. 보건실 방문 일지 테이블
CREATE TABLE IF NOT EXISTS visits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_name TEXT NOT NULL,         -- 학생 이름 (암호화)
    grade TEXT,                         -- 학년 (암호화)
    class_room TEXT,                    -- 반 (암호화)
    number_code TEXT,                   -- 번호 (암호화)
    symptoms TEXT,                      -- 증상 (암호화)
    treatment TEXT,                     -- 조치 내용 (암호화)
    visited_at TEXT DEFAULT (datetime('now', 'localtime')), -- 방문 일시 (YYYY-MM-DD HH:MM:SS)
    remarks TEXT                        -- 비고 (암호화)
);

-- 2. 요보호 학생 관리 테이블 (천식, 당뇨, 심장질환 등)
CREATE TABLE IF NOT EXISTS protected_students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_name TEXT NOT NULL,         -- 학생 이름 (암호화)
    grade TEXT,                         -- 학년 (암호화)
    class_room TEXT,                    -- 반 (암호화)
    number_code TEXT,                   -- 번호 (암호화)
    disease_name TEXT,                  -- 질환명 (암호화)
    emergency_action TEXT,              -- 응급조치 요령 (암호화)
    contact_parent TEXT,                -- 학부모 연락처 (암호화)
    contact_teacher TEXT,               -- 담임교사 연락처 (암호화)
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

-- 3. 의약품 및 물품 재고 관리 테이블
CREATE TABLE IF NOT EXISTS inventories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_name TEXT NOT NULL,            -- 품목명
    category TEXT,                      -- 카테고리 (내복약, 외용약, 방역물품 등)
    quantity INTEGER DEFAULT 0,         -- 현재 재고 수량
    unit TEXT,                          -- 단위 (알, 개, 병 등)
    expiration_date TEXT,               -- 유통기한 (YYYY-MM-DD)
    location TEXT,                      -- 보관 위치
    remarks TEXT,                       -- 특이사항
    updated_at TEXT DEFAULT (datetime('now', 'localtime'))
);
