// src/main.js
// 스마트 보건실 업무지원 시스템 - 프론트엔드 비즈니스 로직
// (Electron Main 프로세스와 IPC로 연동되어 SQLite 데이터 제어 및 데이터 암/복호화 처리를 수행합니다.)

import './style.css'
// Chart.js 모듈 로드 및 차트 컴포넌트 자동 등록
import { Chart, registerables } from 'chart.js'
Chart.register(...registerables)

// Standalone 브라우저 구동 환경을 위한 Mock DB Fallback 설정
if (typeof window !== 'undefined' && (!window.api || !window.api.db)) {
  console.warn('Electron API (window.api.db)가 감지되지 않았습니다. 브라우저용 Mock API로 대체합니다.');
  window.api = window.api || {};
  window.api.db = {
    query: async (sql, params) => {
      const sqlLower = sql.toLowerCase();
      if (sqlLower.includes('from visits')) {
        if (sqlLower.includes('count(*)')) return [{ cnt: 2 }];
        if (currentLang === 'jp') {
          return [
            { id: 1, visited_at: '2026-07-24 08:30:00', student_name: '佐藤一郎', grade: 3, class_room: 2, number_code: 15, gender: '남', primary_symptom: '頭痛', treatment_detail: 'アセトアミノフェン服用', remarks: '' },
            { id: 2, visited_at: '2026-07-24 08:45:00', student_name: '鈴木花子', grade: 1, class_room: 4, number_code: 5, gender: '여', primary_symptom: '擦り傷', treatment_detail: '消毒及び絆創膏貼付', remarks: '' }
          ];
        } else if (currentLang === 'en') {
          return [
            { id: 1, visited_at: '2026-07-24 08:30:00', student_name: 'John Smith', grade: 3, class_room: 2, number_code: 15, gender: '남', primary_symptom: 'Headache', treatment_detail: 'Took acetaminophen', remarks: '' },
            { id: 2, visited_at: '2026-07-24 08:45:00', student_name: 'Emma Watson', grade: 1, class_room: 4, number_code: 5, gender: '여', primary_symptom: 'Scratch', treatment_detail: 'Disinfected and applied bandage', remarks: '' }
          ];
        } else {
          return [
            { id: 1, visited_at: '2026-07-24 08:30:00', student_name: '김철수', grade: 3, class_room: 2, number_code: 15, gender: '남', primary_symptom: '두통', treatment_detail: '타이레놀 복용', remarks: '' },
            { id: 2, visited_at: '2026-07-24 08:45:00', student_name: '이영희', grade: 1, class_room: 4, number_code: 5, gender: '여', primary_symptom: '찰과상', treatment_detail: '소독 및 밴드 부착', remarks: '' }
          ];
        }
      }
      if (sqlLower.includes('from inventories')) {
        if (currentLang === 'jp') {
          return [
            { id: 1, item_name: 'アセトアミノフェン (タイレノール)', category: '内服薬', quantity: 3, unit: '錠', expiration_date: '2026-12-31', location: 'A-1 キャビネット', remarks: '' },
            { id: 2, item_name: '消毒用エタノール', category: '消毒/衛生', quantity: 15, unit: '本', expiration_date: '2027-06-30', location: 'B-2 棚', remarks: '' }
          ];
        } else if (currentLang === 'en') {
          return [
            { id: 1, item_name: 'Acetaminophen (Tylenol)', category: 'Oral Medicine', quantity: 3, unit: 'tablet(s)', expiration_date: '2026-12-31', location: 'A-1 Cabinet', remarks: '' },
            { id: 2, item_name: 'Disinfectant Ethanol', category: 'Disinfectant / Hygiene', quantity: 15, unit: 'bottle(s)', expiration_date: '2027-06-30', location: 'B-2 Shelf', remarks: '' }
          ];
        } else {
          return [
            { id: 1, item_name: '아세토아미노펜 (타이레놀)', category: '내복약', quantity: 3, unit: '정', expiration_date: '2026-12-31', location: 'A-1 보관함', remarks: '' },
            { id: 2, item_name: '소독용 에탄올', category: '소독/위생', quantity: 15, unit: '개', expiration_date: '2027-06-30', location: 'B-2 선반', remarks: '' }
          ];
        }
      }
      if (sqlLower.includes('from protected_students')) {
        if (sqlLower.includes('count(*)')) return [{ cnt: 1 }];
        if (currentLang === 'jp') {
          return [
            { id: 1, student_name: '田中太郎', grade: 5, class_room: 1, number_code: 12, disease_name: '喘息', emergency_action: '吸入器使用', parent_contact: '010-1234-5678', teacher_contact: '010-9876-5432' }
          ];
        } else if (currentLang === 'en') {
          return [
            { id: 1, student_name: 'Michael Jordan', grade: 5, class_room: 1, number_code: 12, disease_name: 'Asthma', emergency_action: 'Use inhaler', parent_contact: '010-1234-5678', teacher_contact: '010-9876-5432' }
          ];
        } else {
          return [
            { id: 1, student_name: '박민수', grade: 5, class_room: 1, number_code: 12, disease_name: '천식', emergency_action: '흡입기 사용 유도', parent_contact: '010-1234-5678', teacher_contact: '010-9876-5432' }
          ];
        }
      }
      return [];
    }
  };
}


// 🦴 인체 신체 부위 선택 모달용 실제 골격계 참고 이미지 에셋
import bodyRefFrontView from './assets/body-detail/front-view.png'
import bodyRefHandLeft from './assets/body-detail/hand-left.png'
import bodyRefHandRight from './assets/body-detail/hand-right.png'
import bodyRefFootLeft from './assets/body-detail/foot-left.png'
import bodyRefFootRight from './assets/body-detail/foot-right.png'
import bodyRefFullChart from './assets/body-detail/full-chart.png'

// ==========================================
// 📊 대시보드 통계 차트 관리 변수 및 캐시
// ==========================================
let visitsChartInstance = null
let chartLabelsCache = []
let chartDataCache = []

// ==========================================
// ☀️/🌙 다크, 라이트 테마 토글 시스템
// ==========================================
const btnThemeToggle = document.getElementById('btn-theme-toggle')
const themeToggleIcon = document.getElementById('theme-toggle-icon')
const pageTitle = document.getElementById('current-page-title')

function initTheme() {
  const savedTheme = localStorage.getItem('theme') || 'dark'
  
  if (savedTheme === 'light') {
    document.body.classList.add('light-mode')
    if (themeToggleIcon) themeToggleIcon.textContent = '🌙' // 라이트 모드일 땐 달 아이콘
  } else {
    document.body.classList.remove('light-mode')
    if (themeToggleIcon) themeToggleIcon.textContent = '☀️' // 다크 모드일 땐 해 아이콘
  }
}

if (btnThemeToggle) {
  btnThemeToggle.addEventListener('click', () => {
    const isLight = document.body.classList.toggle('light-mode')
    
    if (isLight) {
      localStorage.setItem('theme', 'light')
      if (themeToggleIcon) themeToggleIcon.textContent = '🌙'
    } else {
      localStorage.setItem('theme', 'dark')
      if (themeToggleIcon) themeToggleIcon.textContent = '☀️'
    }

    // 🎨 테마 스위칭 시, 대시보드 차트 테마 색상도 실시간 동기화하여 리빌드합니다.
    if (chartLabelsCache.length > 0) {
      buildVisitsChart(chartLabelsCache, chartDataCache)
    }
  })
}

// ==========================================
// 🌐 다국어 지원 (i18n: 한국어 / 日本語) 시스템
// ==========================================
const btnLangToggle = document.getElementById('btn-lang-toggle')
const langLabel = document.getElementById('lang-label')

const i18nDict = {
  // @i18n-ko-start
  ko: {
    dashboard: '대시보드',
    visits: '방문 일지',
    inventory: '의약품 관리',
    protected: '요보호 학생',
    students: '전교생 명단',
    statistics: '종합 통계',
    userRole: '보건 담당자',
    exportExcel: '전체 엑셀 저장',
    studentsSectionTitle: '전교생 명단 (나이스 NEIS 일괄등록)',
    btnTextOpenNeis: '나이스 엑셀 일괄등록',
    btnTextNeisSample: '나이스 샘플서식',
    modalNeisTitle: '👨‍🎓 나이스(NEIS) 전교생 명단 일괄 등록',
    modalNeisDropText: '<strong>나이스(NEIS)에서 다운로드한 엑셀(.xlsx) 파일</strong>을 드래그하거나 선택하세요.',
    modalNeisDropHint: '(필수 컬럼: 학년, 반, 번호, 성명/학생명, 성별)',
    btnTextNeisSampleModal: '나이스 샘플 양식',
    
    // 추가할 항목들
    dbBackupShare: 'DB 백업 / 2인 공유',
    btnDbShare: 'DB 백업 / 2인 공유',
    dbStatusBadge: 'SQLite 로컬 DB 암호화 연동',
    titleDbShare: '2인 배치 학교 및 백업을 위한 로컬 DB 공유/백업 설정',
    titleExportAllExcel: '전체 데이터(방문일지, 의약품, 요보호학생)를 엑셀 파일로 다운로드합니다.',
    titleThemeToggle: '테마 전환 버튼',
    btnLangToggle: '언어 전환 버튼',
    unitPeople: '명',
    unitCases: '건',
    
    // 대시보드
    dashTodayVisitsLabel: '오늘 보건실 방문',
    dashLowStockLabel: '품절/부족 의약품',
    dashProtectedCountLabel: '관리 대상 요보호 학생',
    dashVisitsTrendTitle: '최근 7일간 방문자 통계 추이',
    dashTodoTitle: '알림 및 업무 체크',
    todoEmergencyKit: '요보호 학생 응급키트 재점검 필요',
    todoTylenolExpiry: '타이레놀 시럽 유통기한 확인 대상',
    todoWeeklyDone: '주간 보건일지 마감 완료',
    dashRecentVisitsTitle: '최근 보건실 방문 이력',
    btnGoToVisits: '일지 전체보기 →',
    thVisitTime: '방문 시간',
    thTargetStudent: '대상 학생',
    thSymptom: '증상',
    thTreatment: '처치 내용',
    emptyRecord: '등록된 기록이 없습니다.',
    
    // 방문 등록 폼
    visitRegisterTitle: '방문자 등록 및 세부 처치',
    visitHistoryLabel: '과거 방문 이력',
    protectedTargetLabel: '요보호 대상자',
    lblGrade: '학년',
    lblClass: '반',
    lblNumber: '번호',
    lblStudentNameSearch: '학생명 (나이스 연동 자동검색)',
    phStudentNameSearch: '이름 입력 시 과거이력 자동조회',
    lblGender: '성별',
    optMale: '남학생',
    optFemale: '여학생',
    lblVisitTime: '방문/처치 시간',
    lblBedInTime: '침실 입실시간',
    lblBedOutTime: '침실 퇴실시간',
    lblInjurySite: '외상/통증 신체 부위',
    btnOpenBodyMap: '인체 구조도 선택',
    phInjurySite: '예: 상완(좌), 대퇴(우), 족부(좌)',
    chipHead: '두부',
    chipFace: '얼굴',
    chipArmL: '상완(좌)',
    chipArmR: '상완(우)',
    chipAbdomen: '복부',
    chipThighL: '대퇴(좌)',
    chipThighR: '대퇴(우)',
    chipFoot: '족부',
    lblVitalsBoxTitle: '활력 징후 (Vital Signs) & 통증 척도',
    lblTemp: '체온(°C)',
    lblBP: '혈압(mmHg)',
    lblHR: '맥박(bpm)',
    lblSPO2: '산소포화도(%)',
    lblPainScale: '통증 척도 (NPRS 0~10)',
    painScale0: '0점 (무통)',
    lblSymptoms: '주요 증상',
    phSymptoms: '예: 체육시간 중 우측 대퇴부 찰과상 및 두통',
    lblTreatment: '처치 내용 (투약/조치)',
    phTreatment: '예: 소독 후 밴드 부착, 타이레놀 1정 복용 및 20분 침실 휴식',
    lblRemarks: '비고 (선택)',
    phRemarks: '특이사항 및 보호자/담임 통보 내용',
    btnReset: '초기화',
    btnRegisterVisit: '일지 등록하기',
    
    // 방문 리스트
    visitsHistoryTitle: '보건실 방문 이력',
    titleBulkVisit: '엑셀 또는 CSV 파일로 방문자를 일괄 등록합니다.',
    btnBulkVisit: '일괄 등록',
    titleDownloadSample: '일괄 등록용 표준 엑셀 서식 양식을 다운로드합니다.',
    btnDownloadSample: '샘플 양식',
    titlePrintVisits: '방문 일지를 인쇄용 서식으로 출력합니다.',
    btnPrintVisits: '방문일지 출력',
    titleExportVisitsExcel: '방문 일지 데이터를 엑셀 파일로 다운로드합니다.',
    btnExportVisitsExcel: '엑셀 내보내기',
    phSearchVisit: '학생명 검색 (복호화 실시간 검색)',
    btnSearch: '검색',
    thDateTime: '일시',
    thGradeClassNumber: '학년/반/번호',
    thStudentName: '학생명',
    thManage: '관리',
    
    // 의약품 관리
    inventoryRegisterTitle: '의약품/물품 등록',
    lblItemName: '품목명',
    phItemName: '예: 타이레놀 ER 500mg',
    lblCategory: '카테고리',
    optInternal: '내복약',
    optExternal: '외용약',
    optDisinfect: '소독/위생',
    optQuarantine: '방역물품',
    optDevice: '의료기기',
    optEtc: '기타',
    lblUnit: '단위',
    phUnit: '예: 알, 개, 병',
    lblQuantity: '최초 재고 수량',
    lblExpiration: '유통기한',
    lblLocation: '보관 위치',
    phLocation: '예: A-3 캐비닛 둘째 칸',
    lblItemRemarks: '특이사항',
    phItemRemarks: '비고 입력',
    btnAddItem: '물품 추가하기',
    
    inventoryStatusTitle: '재고 현황 및 알림 관리',
    titleOpenEdufine: 'K-에듀파인 품의서 엑셀 파일로 의약품을 일괄 등록합니다.',
    btnOpenEdufine: '에듀파인 엑셀 등록',
    titlePrintInventory: '의약품 관리대장을 인쇄용 서식으로 출력합니다.',
    btnPrintInventory: '관리대장 출력',
    titleExportInventoryExcel: '의약품 목록을 엑셀 파일로 다운로드합니다.',
    btnExportInventoryExcel: '엑셀 내보내기',
    lblExpired: '만료:',
    lblExpiryImminent: '유효기간 임박(30일내):',
    lblLowStock: '재고 부족(5개이하):',
    lblCountUnit: '건',
    phSearchInventory: '품목명 또는 카테고리 검색',
    chipAllList: '전체 목록',
    chipExpiryFilter: '유효기간 만료/임박',
    chipLowStockFilter: '재고 부족',
    thCategory: '카테고리',
    thItemName: '품목명',
    thQuantity: '재고량',
    thLocation: '보관 위치',
    thExpiryStatus: '유통기한 (상태)',
    thStockManage: '입/출고 관리',
    
    // 요보호 학생
    protectedRegisterTitle: '요보호 학생 정보 등록',
    phGrade5: '예: 5',
    phClass4: '예: 4',
    phNumber8: '예: 8',
    phStudentName: '이름 입력',
    lblDiseaseName: '질환명 / 관리 필요 사유',
    phDiseaseName: '예: 천식 (흡입기 지참)',
    lblEmergencyAction: '비상 시 응급조치 요령',
    phEmergencyAction: '예: 호흡곤란 시 흡입기 2회 사용 후 산소포화도 측정, 보호자 즉시 연락',
    lblContactParent: '학부모 연락처',
    phContact: '예: 010-XXXX-XXXX',
    lblContactTeacher: '담임교사 연락처',
    btnRegisterProtected: '학생 정보 등록',
    
    protectedListTitle: '요보호 학생 명단',
    titleExportProtectedExcel: '요보호 학생 목록을 엑셀 파일로 다운로드합니다.',
    phSearchProtected: '학생명 또는 질환명 검색',
    thGradeClass: '학년/반/번호',
    thStudentName: '학생명',
    thDiseaseName: '질환명',
    thEmergencyResponse: '비상 대응',
    thContactParent: '학부모 연락처',
    thContactTeacher: '담임 연락처',
    thActions: '관리',
    
    // 전교생 명단
    studentsSectionSub: '학생명을 검색하여 과거 방문 이력 및 요보호 여부를 빠르게 관리합니다.',
    titleNeisExcel: '엑셀 파일로 전교생 명단을 일괄 등록합니다.',
    btnClearStudents: '명단 전체삭제',
    phSearchStudents: '학생명, 학년, 반 검색 (예: 3학년 또는 김철수)',
    thGender: '성별',
    thPastVisitsCount: '과거 보건실 방문 횟수',
    thRemarks: '비고 / 특이사항',
    
    // 종합 통계
    statsTitle: '📊 보건실 통합 다차원 통계 분석',
    statsSub: '일별, 월별, 학년별, 반별, 성별, 건강문제별 방문 현황을 시각화하여 보고합니다.',
    btnPrintStats: '통계보고서 출력',
    btnExportStatsExcel: '통계 엑셀 저장',
    chartMonthlyTrendTitle: '월별 보건실 방문 추이',
    chartGradeDistTitle: '학년별 방문자 분포',
    chartGenderDistTitle: '성별 방문 비율',
    chartSymptomDistTitle: '건강문제/증상별 비율',
    
    // 모달창 1: 응급 조치
    modalEmergencyTitle: '요보호 학생 응급 대응 요령',
    lblEmergencyTargetStudent: '대상 학생:',
    lblEmergencyDisease: '질환명:',
    lblEmergencyActionTitle: '응급조치 절차 (Emergency Actions)',
    lblEmergencyContactsTitle: '비상 연락망',
    lblContactParentRole: '학부모',
    lblContactTeacherRole: '담임교사',
    btnConfirm: '확인',
    
    // 모달창 2: 방문자 일괄등록
    modalBulkVisitTitle: '방문자 데이터 일괄 등록 (Excel/CSV)',
    modalBulkDropText: '<strong>엑셀(.xlsx) 또는 CSV 파일</strong>을 이곳에 드래그하거나 클릭하여 선택하세요.',
    modalBulkDropHint: '(필수 항목: 학년, 반, 번호, 학생명, 주요증상, 처치내용)',
    btnSelectFile: '파일 선택',
    btnDownloadSampleModal: '샘플 엑셀 서식 받기',
    lblParsedPreviewTitle: '파싱된 데이터 미리보기',
    lblSecurityNotice: '🔒 저장 시 모든 학생 민감 정보는 암호화 처리됩니다.',
    thIndex: '#',
    thGrade: '학년',
    thClass: '반',
    thNumber: '번호',
    btnCancel: '취소',
    btnRunBulk: '일괄 등록 실행',
    
    // 모달창 3: 인쇄
    modalPrintTitle: '서식 출력 미리보기',
    btnDoPrint: '바로 인쇄',
    printDocTitle: '보건실 방문자 일지',
    thApproval: '결재',
    thHandler: '담 당',
    thHealthHandler: '보건담당',
    thAdminManager: '행정실장',
    thPrincipal: '학교장',
    printFooterNote: '※ 본 서식은 스마트 보건실 업무지원 시스템에서 공식 출력된 문서입니다.',
    btnDoPrintFooter: '인쇄하기',
    
    // 모달창 4: 나이스 일괄등록
    lblNeisParsedPreview: '나이스 명단 파싱 미리보기',
    lblNeisSecurityNotice: '🔒 모든 학생명 및 개인정보는 암호화하여 SQLite DB에 저장됩니다.',
    btnSaveAllStudents: '전교생 명단 일괄 저장',
    
    // 모달창 5: 에듀파인
    modalEdufineTitle: 'K-에듀파인 품의서 엑셀 의약품 일괄 등록',
    modalEdufineDropText: '<strong>K-에듀파인 품의서 / 물품 구매 엑셀 파일</strong>을 드래그하거나 선택하세요.',
    modalEdufineDropHint: '(필수 항목: 품목명/물품명, 수량, 단위, 유통기한/비고)',
    btnDownloadEdufineSample: '에듀파인 샘플양식',
    lblEdufinePreviewTitle: '에듀파인 품의 의약품 미리보기',
    thInQty: '입고 수량',
    thExpiry: '유통기한',
    thLocationRemarks: '보관위치/비고',
    btnRunEdufine: '의약품 재고에 일괄 등록',
    
    // 모달 6-1: 골격표 크게 보기
    modalFullChartTitle: '인체 골격계 상세 참고표 (원본)',
    
    // 모달 7: DB 공유
    modalDbShareTitle: '2인 배치 학교 DB 공유 & 백업 안내',
    lblDbSecurityTitle: '🔒 개인정보보호 단독 로컬 저장소 지정',
    lblDbSecurityDesc: '본 프로그램은 학생들의 민감한 건강 개인정보 보호를 위해 외부 클라우드 서버 대신 <strong>학교 내부 PC의 SQLite 암호화 데이터베이스(`healthcare.db`)</strong>를 이용합니다.',
    lblDbShareMethodTitle: '👨‍⚕️ 2인 보건교사 동시 기록 및 공유 방법',
    lblDbShareStep1: '학교 내부 네트워크 교사 공유 폴더(예: `\\\\SchoolNAS\\HealthDB\\`)를 지정합니다.',
    lblDbShareStep2: '아래 <strong>`DB 파일 생성/백업`</strong> 버튼을 눌러 현재 로컬 DB를 백업한 후, 공유 폴더에 저장합니다.',
    lblDbShareStep3: '2인 배치 보건교사 PC에서 해당 공유 폴더 경로를 함께 참조하여 실시간 공유 및 백업 관리를 수행할 수 있습니다.',
    btnManualBackup: '로컬 DB 수동 백업하기',
    
    // 인체 구조도 모달 상세 타이틀
    subPanelTitle: '세부 부위 선택',
    noPartsSelected: '선택된 부위 없음',
    btnApply: '입력 폼에 적용',
    
    // alert & confirm & placeholders
    alertVisitSaved: '방문 일지가 안전하게 암호화되어 저장되었습니다.',
    alertVisitSaveFailed: '일지 저장에 실패했습니다.',
    confirmDeleteVisit: '이 기록을 삭제하시겠습니까?',
    alertInventorySaved: '의약품이 성공적으로 등록되었습니다.',
    alertInventorySaveFailed: '약품 등록에 실패했습니다.',
    confirmDeleteInventory: '이 약품/물품을 목록에서 삭제하시겠습니까?',
    alertProtectedSaved: '요보호 학생 정보가 암호화 보안 적용되어 저장되었습니다.',
    alertProtectedSaveFailed: '학생 정보 등록에 실패했습니다.',
    confirmDeleteProtected: '요보호 대상 학생 정보를 명단에서 삭제하시겠습니까?',
    alertStudentsCleared: '전교생 명단이 성공적으로 삭제되었습니다.',
    confirmClearStudents: '전교생 명단을 전체 삭제하시겠습니까? (방문기록은 유지됩니다)',
    alertNeisSaved: '전교생 명단이 성공적으로 DB에 저장되었습니다.',
    alertNeisSaveFailed: '명단 저장에 실패했습니다.',
    alertEdufineSaved: '의약품 재고가 성공적으로 업데이트되었습니다.',
    alertEdufineSaveFailed: '재고 등록에 실패했습니다.',
    alertBackupSuccess: '로컬 DB 백업파일이 바탕화면에 안전하게 생성되었습니다!',
    alertBackupFailed: '로컬 DB 백업에 실패했습니다.',
    
    // 차트 관련 텍스트
    chartVisitsCountLabel: '일별 방문 학생 수 (명)',
    chartVisitsCountTooltip: '방문자 수: {value}명',
    
    // 테이블 내 텍스트
    emptyInventory: '조건에 맞는 의약품이 없습니다.',
    emptyProtected: '등록된 요보호 학생이 없습니다.',
    emptyStudents: '등록된 전교생 명단이 없습니다. (나이스 엑셀을 통해 등록해주세요)',
    emptyRecentVisits: '오늘 방문한 학생이 없습니다.',
    
    // 기타 단위
    gradeUnit: '학년',
    classUnit: '반',
    numberUnit: '번',
    personUnit: '명',
    itemCountUnit: '개',
    genderMale: '남',
    genderFemale: '여',
    painScaleSuffix: '점',
    painScaleFree: '무통'
  },
  // @i18n-ko-end
  // @i18n-jp-start
  jp: {
    dashboard: 'ダッシュボード',
    visits: '保健室来室記録',
    inventory: '医薬品・備品管理',
    protected: '要配慮児童・生徒',
    students: '全校生徒名簿',
    statistics: '総合統計レポート',
    userRole: '養護教諭',
    exportExcel: '全体Excel保存',
    studentsSectionTitle: '全校生徒名簿 (Excel一括登録)',
    btnTextOpenNeis: 'Excel一括登録',
    btnTextNeisSample: 'サンプル様式',
    modalNeisTitle: '👨‍🎓 生徒名簿 Excel一括登録',
    modalNeisDropText: '<strong>Excel(.xlsx)ファイル</strong>をドラッグ＆ドロップ 또는 選択してください。',
    modalNeisDropHint: '(必須項目: 学年, 組, 出席番号, 氏名, 性別)',
    btnTextNeisSampleModal: 'サンプル様式',
    
    // 추가할 항목들
    dbBackupShare: 'DBバックアップ / 2人共有',
    btnDbShare: 'DBバックアップ / 2人共有',
    dbStatusBadge: 'SQLiteローカルDB暗号化連動',
    titleDbShare: '2人配置校およびバックアップのためのローカルDB共有/バックアップ設定',
    titleExportAllExcel: 'すべてのデータ(来室記録、医薬品、要配慮生徒)をExcelファイルとしてダウンロードします。',
    titleThemeToggle: 'テーマ切り替えボタン',
    btnLangToggle: '言語切替ボタン',
    unitPeople: '名',
    unitCases: '件',
    
    // 대시보드
    dashTodayVisitsLabel: '本日の保健室来室',
    dashLowStockLabel: '品切れ/不足医薬品',
    dashProtectedCountLabel: '管理対象 要配慮児童・生徒',
    dashVisitsTrendTitle: '過去7日間の来室者数推移',
    dashTodoTitle: '通知と業務チェック',
    todoEmergencyKit: '要配慮生徒応急キットの再点検が必要',
    todoTylenolExpiry: 'アセトアミノフェンシロップの使用期限確認対象',
    todoWeeklyDone: '週次保健日誌の締め切り完了',
    dashRecentVisitsTitle: '最近の保健室来室履歴',
    btnGoToVisits: '履歴一覧を表示 →',
    thVisitTime: '来室時間',
    thTargetStudent: '対象生徒',
    thSymptom: '症状',
    thTreatment: '処置内容',
    emptyRecord: '登録された記録がありません。',
    
    // 방문 등록 폼
    visitRegisterTitle: '来室者登録および詳細処置',
    visitHistoryLabel: '過去の来室履歴',
    protectedTargetLabel: '要配慮対象者',
    lblGrade: '学年',
    lblClass: '組',
    lblNumber: '出席番号',
    lblStudentNameSearch: '生徒氏名 (自動検索)',
    phStudentNameSearch: '氏名入力時に過去履歴を自動照会',
    lblGender: '性別',
    optMale: '男子生徒',
    optFemale: '女子生徒',
    lblVisitTime: '来室/処置時間',
    lblBedInTime: '静養室入室時間',
    lblBedOutTime: '静養室退室時間',
    lblInjurySite: '外傷/痛みのある部位',
    btnOpenBodyMap: '身体構造図選択',
    phInjurySite: '例: 上腕(左), 大腿(右), 足部(左)',
    chipHead: '頭部',
    chipFace: '顔面',
    chipArmL: '上腕(左)',
    chipArmR: '上腕(右)',
    chipAbdomen: '腹部',
    chipThighL: '大腿(左)',
    chipThighR: '大腿(右)',
    chipFoot: '足部',
    lblVitalsBoxTitle: 'バイタルサイン (Vital Signs) ＆ 痛みの尺度',
    lblTemp: '体温(°C)',
    lblBP: '血圧(mmHg)',
    lblHR: '脈拍(bpm)',
    lblSPO2: '酸素飽和度(%)',
    lblPainScale: '痛みの尺度 (NPRS 0~10)',
    painScale0: '0点 (無痛)',
    lblSymptoms: '主な症状',
    phSymptoms: '例: 体育の時間中に右大腿部を擦りむく、および頭痛',
    lblTreatment: '処置内容 (投薬/措置)',
    phTreatment: '例: 消毒後に絆創膏貼付、アセトアミノフェン1錠服用および20分間静養',
    lblRemarks: '備考 (任意)',
    phRemarks: '特記事項および保護者/担任への連絡内容',
    btnReset: 'リセット',
    btnRegisterVisit: '日誌を登録する',
    
    // 방문 리스트
    visitsHistoryTitle: '保健室来室履歴',
    titleBulkVisit: 'ExcelまたはCSVファイルで来室者を一括登録します。',
    btnBulkVisit: '一括登録',
    titleDownloadSample: '一括登録用の標準Excel書式をダウンロードします。',
    btnDownloadSample: 'サンプル書式',
    titlePrintVisits: '来室記録を印刷用書式で出力します。',
    btnPrintVisits: '来室日誌印刷',
    titleExportVisitsExcel: '来室日誌データをExcelファイルとしてダウンロードします。',
    btnExportVisitsExcel: 'Excelエクスポート',
    phSearchVisit: '生徒氏名検索 (復号化リアルタイム検索)',
    btnSearch: '検索',
    thDateTime: '日時',
    thGradeClassNumber: '学年/組/番号',
    thStudentName: '氏名',
    thManage: '管理',
    
    // 의약품 관리
    inventoryRegisterTitle: '医薬品/備品登録',
    lblItemName: '品目名',
    phItemName: '例: タイレノール ER 500mg',
    lblCategory: 'カテゴリ',
    optInternal: '内服薬',
    optExternal: '外用薬',
    optDisinfect: '消毒/衛生',
    optQuarantine: '防疫物品',
    optDevice: '医療機器',
    optEtc: 'その他',
    lblUnit: '単位',
    phUnit: '例: 錠, 個, 本',
    lblQuantity: '初期在庫数量',
    lblExpiration: '使用期限',
    lblLocation: '保管場所',
    phLocation: '例: A-3 キャビネット二段目',
    lblItemRemarks: '特記事項',
    phItemRemarks: '備考を入力',
    btnAddItem: '物品を追加する',
    
    inventoryStatusTitle: '在庫現況および通知管理',
    titleOpenEdufine: 'K-エデュファイン(調達)稟議書Excelファイルで医薬品を一括登録します。',
    btnOpenEdufine: '調達Excel登録',
    titlePrintInventory: '医薬品管理台帳を印刷用書式で出力します。',
    btnPrintInventory: '管理台帳印刷',
    titleExportInventoryExcel: '医薬品リストをExcelファイルとしてダウンロードします。',
    btnExportInventoryExcel: 'Excelエクスポート',
    lblExpired: '期限切れ:',
    lblExpiryImminent: '期限間近(30日以内):',
    lblLowStock: '在庫不足(5個以下):',
    lblCountUnit: '件',
    phSearchInventory: '品目名またはカテゴリ検索',
    chipAllList: 'すべてのリスト',
    chipExpiryFilter: '使用期限切れ/間近',
    chipLowStockFilter: '在庫不足',
    thCategory: 'カテゴリ',
    thItemName: '品目名',
    thQuantity: '在庫量',
    thLocation: '保管場所',
    thExpiryStatus: '使用期限 (状態)',
    thStockManage: '入出庫管理',
    
    // 요보호 학생
    protectedRegisterTitle: '要配慮生徒情報登録',
    phGrade5: '例: 5',
    phClass4: '例: 4',
    phNumber8: '例: 8',
    phStudentName: '氏名入力',
    lblDiseaseName: '疾患名 / 配慮が必要な理由',
    phDiseaseName: '例: 喘息 (吸入器持参)',
    lblEmergencyAction: '緊急時応急処置方法',
    phEmergencyAction: '例: 呼吸困難時は吸入器を2回吸入させ酸素飽和度測定、保護者へ即時連絡',
    lblContactParent: '保護者連絡先',
    phContact: '例: 010-XXXX-XXXX',
    lblContactTeacher: '担任教師連絡先',
    btnRegisterProtected: '生徒情報を登録',
    
    protectedListTitle: '要配慮生徒名簿',
    titleExportProtectedExcel: '要配慮生徒リストをExcelファイルとしてダウンロードします。',
    phSearchProtected: '氏名または疾患名検索',
    thGradeClass: '学年/組/出席番号',
    thStudentName: '氏名',
    thDiseaseName: '疾患名',
    thEmergencyResponse: '緊急対応',
    thContactParent: '保護者連絡先',
    thContactTeacher: '担任連絡先',
    thActions: '管理',
    
    // 전교생 명단
    studentsSectionSub: '生徒氏名を検索し、過去の来室履歴や要配慮の有無を素早く管理します。',
    titleNeisExcel: 'Excelファイルで全校生徒名簿を一括登録します。',
    btnClearStudents: '名簿をすべて削除',
    phSearchStudents: '生徒名、学年、組を検索 (例: 3学年 または 山田太郎)',
    thGender: '性別',
    thPastVisitsCount: '過去の保健室来室回数',
    thRemarks: '備考 / 特記事項',
    
    // 종합 통계
    statsTitle: '📊 保健室統合多次元統計分析',
    statsSub: '日別、月別、学年別、クラス別、性別、健康問題別の来室現況を可視化して報告します。',
    btnPrintStats: '統計報告書出力',
    btnExportStatsExcel: '統計Excel保存',
    chartMonthlyTrendTitle: '月別保健室来室推移',
    chartGradeDistTitle: '学年別来室者分布',
    chartGenderDistTitle: '男女別来室比率',
    chartSymptomDistTitle: '健康問題/症状別比率',
    
    // 모달창 1: 응급 조치
    modalEmergencyTitle: '要配慮児童・生徒 緊急対応方法',
    lblEmergencyTargetStudent: '対象生徒:',
    lblEmergencyDisease: '疾患名:',
    lblEmergencyActionTitle: '応急処置手順 (Emergency Actions)',
    lblEmergencyContactsTitle: '緊急連絡先',
    lblContactParentRole: '保護者',
    lblContactTeacherRole: '担任教諭',
    btnConfirm: '確認',
    
    // 모달창 2: 방문자 일괄등록
    modalBulkVisitTitle: '来室者データ一括登録 (Excel/CSV)',
    modalBulkDropText: '<strong>Excel(.xlsx)またはCSVファイル</strong>をここにドラッグ＆ドロップするか、クリックして選択してください。',
    modalBulkDropHint: '(必須項目: 学年, 組, 出席番号, 氏名, 主な症状, 処置内容)',
    btnSelectFile: 'ファイル選択',
    btnDownloadSampleModal: 'サンプル書式をダウンロード',
    lblParsedPreviewTitle: 'パースされたデータのプレビュー',
    lblSecurityNotice: '🔒 保存時にすべての生徒の個人情報は暗号化して保存されます。',
    thIndex: '#',
    thGrade: '学年',
    thClass: '組',
    thNumber: '出席番号',
    btnCancel: 'キャンセル',
    btnRunBulk: '一括登録を実行',
    
    // 모달창 3: 인쇄
    modalPrintTitle: '印刷プレビュー',
    btnDoPrint: '直ちに印刷',
    printDocTitle: '保健室来室日誌',
    thApproval: '決裁',
    thHandler: '担当',
    thHealthHandler: '保健担当',
    thAdminManager: '事務長',
    thPrincipal: '校長',
    printFooterNote: '※ 本書式はスマート保健室業務支援システムから公式に出力された文書です。',
    btnDoPrintFooter: '印刷する',
    
    // 모달창 4: 나이스 일괄등록
    lblNeisParsedPreview: '名簿パースのプレビュー',
    lblNeisSecurityNotice: '🔒 すべての生徒氏名および個人情報は暗号化してSQLite DB에 저장됩니다.',
    btnSaveAllStudents: '全校生徒名簿を一括保存',
    
    // 모달창 5: 에듀파인
    modalEdufineTitle: '調達稟議書Excel 医薬品一括登録',
    modalEdufineDropText: '<strong>調達稟議書 / 物品購入のExcelファイル</strong>をドラッグ＆ドロップまたは選択してください。',
    modalEdufineDropHint: '(必須項目: 品目名, 数量, 単位, 使用期限/備考)',
    btnDownloadEdufineSample: '調達サンプル書式',
    lblEdufinePreviewTitle: '調達医薬品のプレビュー',
    thInQty: '入庫数量',
    thExpiry: '使用期限',
    thLocationRemarks: '保管場所/備考',
    btnRunEdufine: '医薬品在庫に一括登録',
    
    // 모달 6-1: 골격표 크게 보기
    modalFullChartTitle: '人体骨格系詳細参考表 (原本)',
    
    // 모달 7: DB 공유
    modalDbShareTitle: '2人配置校 DB共有 ＆ バックアップ案内',
    lblDbSecurityTitle: '🔒 個人情報保護のためのローカル保存',
    lblDbSecurityDesc: '本プログラムは、児童・生徒의 건강 정보라는 민감한 개인정보 보호를 위해 외부 클라우드 대신 **교내 PC의 SQLite 암호화 데이터베이스(`healthcare.db`)**를 사용합니다.',
    lblDbShareMethodTitle: '👨‍⚕️ 2人配置の養護教諭による同時記録および共有方法',
    lblDbShareStep1: '校内ネットワークの教員共有フォルダ(例: `\\\\SchoolNAS\\HealthDB\\`)を指定します。',
    lblDbShareStep2: '下の**`DBファイル生成/バックアップ`**ボタンをクリックして現在のローカルDBをバックアップした後、共有フォルダに保存します。',
    lblDbShareStep3: 'もう1名の教員のPCから当該共有フォルダパスを参照設定することで、リアルタイムでの共有およびバックアップ管理が行えます。',
    btnManualBackup: 'ローカルDBを手動バックアップ',
    
    // 인체 구조도 모달 상세 타이틀
    subPanelTitle: '詳細部位の選択',
    noPartsSelected: '選択された部位なし',
    btnApply: '入力フォームに適用',
    
    // alert & confirm & placeholders
    alertVisitSaved: '来室日誌が安全に暗号化されて保存されました。',
    alertVisitSaveFailed: '日誌の保存に失敗しました。',
    confirmDeleteVisit: 'この記録を削除しますか？',
    alertInventorySaved: '医薬品が正常に登録されました。',
    alertInventorySaveFailed: '医薬品の登録に失敗しました。',
    confirmDeleteInventory: 'この医薬品/物品をリストから削除しますか？',
    alertProtectedSaved: '要配慮生徒情報が暗号化されセキュリティを適用して保存されました。',
    alertProtectedSaveFailed: '生徒情報の登録に失敗しました。',
    confirmDeleteProtected: '要配慮生徒の情報をリストから削除しますか？',
    alertStudentsCleared: '全校生徒名簿が正常に削除されました。',
    confirmClearStudents: '全校生徒名簿をすべて削除しますか？ (来室記録は維持されます)',
    alertNeisSaved: '全校生徒名簿が正常にDBに保存されました。',
    alertNeisSaveFailed: '名簿の保存に失敗しました。',
    alertEdufineSaved: '医薬品の在庫が正常にアップデートされました。',
    alertEdufineSaveFailed: '在庫の登録に失敗しました。',
    alertBackupSuccess: 'ローカルDBのバックアップファイルがデスクトップに安全に作成されました！',
    alertBackupFailed: 'ローカルDBのバックアップに失敗しました。',
    
    // 차트 관련 텍스트
    chartVisitsCountLabel: '日別来室児童・生徒数 (名)',
    chartVisitsCountTooltip: '来室者数: {value}名',
    
    // 테이블 내 텍스트
    emptyInventory: '条件に一致する医薬品がありません。',
    emptyProtected: '登録された要配慮生徒がいません。',
    emptyStudents: '登録された全校生徒名簿がありません。(Excel一括登録を使用してください)',
    emptyRecentVisits: '本日来室した生徒がいません。',
    
    // 기타 단위
    gradeUnit: '年',
    classUnit: '組',
    numberUnit: '番',
    personUnit: '名',
    itemCountUnit: '個',
    genderMale: '男',
    genderFemale: '女',
    painScaleSuffix: '点',
    painScaleFree: '無痛'
  },
  // @i18n-jp-end
  // @i18n-en-start
  en: {
    dashboard: 'Dashboard',
    visits: 'Visit Log',
    inventory: 'Inventory Management',
    protected: 'Protected Students',
    students: 'Student Roster',
    statistics: 'Statistics',
    userRole: 'Health Officer',
    exportExcel: 'Export All to Excel',
    studentsSectionTitle: 'Student Roster (NEIS Bulk Upload)',
    btnTextOpenNeis: 'NEIS Excel Import',
    btnTextNeisSample: 'NEIS Sample Format',
    modalNeisTitle: '👨‍🎓 NEIS Student Roster Bulk Registration',
    modalNeisDropText: 'Drag and drop or select the <strong>Excel (.xlsx) file</strong> downloaded from NEIS.',
    modalNeisDropHint: '(Required columns: Grade, Class, Number, Name, Gender)',
    btnTextNeisSampleModal: 'NEIS Sample Template',
    dbBackupShare: 'DB Backup / Share',
    btnDbShare: 'DB Backup / Share',
    dbStatusBadge: 'SQLite Local DB Encryption Active',
    titleDbShare: 'Local DB sharing and backup settings for dual-officer placement and safety',
    titleExportAllExcel: 'Download all data (Visit logs, Inventories, Protected students) as an Excel file.',
    titleThemeToggle: 'Toggle Theme',
    btnLangToggle: 'Change Language',
    unitPeople: 'person(s)',
    unitCases: 'case(s)',
    dashTodayVisitsLabel: 'Today’s Visits',
    dashLowStockLabel: 'Low Stock Items',
    dashProtectedCountLabel: 'Protected Students',
    dashVisitsTrendTitle: 'Visits Trend (Past 7 Days)',
    dashTodoTitle: 'Notifications & Tasks',
    todoEmergencyKit: 'Inspection required for protected students emergency kit',
    todoTylenolExpiry: 'Acetaminophen syrup expiration check target',
    todoWeeklyDone: 'Weekly health log closure completed',
    dashRecentVisitsTitle: 'Recent Visits History',
    btnGoToVisits: 'View Full History →',
    thVisitTime: 'Visit Time',
    thTargetStudent: 'Student',
    thSymptom: 'Symptom',
    thTreatment: 'Treatment',
    emptyRecord: 'No registered records found.',
    btnReset: 'Reset',
    btnRegisterVisit: 'Register Log',
    visitRegisterTitle: 'Visitor Registration & Treatment Details',
    visitHistoryLabel: 'Past Visits History',
    protectedTargetLabel: 'Protected Student Target',
    lblGrade: 'Grade',
    lblClass: 'Class',
    lblNumber: 'No.',
    lblStudentNameSearch: 'Student Name (NEIS Search)',
    phStudentNameSearch: 'Enter name for auto history search',
    lblGender: 'Gender',
    optMale: 'Male',
    optFemale: 'Female',
    lblVisitTime: 'Visit / Treatment Time',
    lblBedInTime: 'Bed In Time',
    lblBedOutTime: 'Bed Out Time',
    lblInjurySite: 'Injury / Pain Site',
    btnOpenBodyMap: 'Select Body Part',
    phInjurySite: 'e.g. Left Arm, Right Thigh, Left Foot',
    chipHead: 'Head',
    chipFace: 'Face',
    chipArmL: 'L-Arm',
    chipArmR: 'R-Arm',
    chipAbdomen: 'Abdomen',
    chipThighL: 'L-Thigh',
    chipThighR: 'R-Thigh',
    chipFoot: 'Foot',
    lblVitalsBoxTitle: 'Vital Signs & Pain Scale',
    lblTemp: 'Temp(°C)',
    lblBP: 'BP(mmHg)',
    lblHR: 'HR(bpm)',
    lblSPO2: 'SpO2(%)',
    lblPainScale: 'Pain Scale (NPRS 0~10)',
    painScale0: '0 (No Pain)',
    lblSymptoms: 'Primary Symptoms',
    phSymptoms: 'e.g. Scratched right thigh during PE class and headache',
    lblTreatment: 'Treatment Details',
    phTreatment: 'e.g. Disinfected and bandaged, took 1 Tylenol, rested for 20 mins',
    lblRemarks: 'Remarks (Optional)',
    phRemarks: 'Notes or contact details with parents/teachers',
    thDateTime: 'Date & Time',
    thGradeClassNumber: 'Grade/Class/No.',
    thStudentName: 'Student Name',
    thManage: 'Manage',
    visitsHistoryTitle: 'Health Room Visit Log',
    titleBulkVisit: 'Bulk register visitors with Excel or CSV files.',
    btnBulkVisit: 'Bulk Import',
    titleDownloadSample: 'Download the standard Excel template for bulk import.',
    btnDownloadSample: 'Sample Template',
    titlePrintVisits: 'Print the visit log in standard format.',
    btnPrintVisits: 'Print Log',
    titleExportVisitsExcel: 'Download visit log data as an Excel file.',
    btnExportVisitsExcel: 'Export Excel',
    phSearchVisit: 'Search student name (real-time decryption search)',
    btnSearch: 'Search',
    inventoryRegisterTitle: 'Register Medicine / Supplies',
    lblItemName: 'Item Name',
    phItemName: 'e.g. Tylenol ER 500mg',
    lblCategory: 'Category',
    optInternal: 'Internal Medicine',
    optExternal: 'External Medicine',
    optDisinfect: 'Disinfection / Hygiene',
    optQuarantine: 'Quarantine Supplies',
    optDevice: 'Medical Devices',
    optEtc: 'Others',
    lblUnit: 'Unit',
    phUnit: 'e.g. tablet, bottle, piece',
    lblQuantity: 'Initial Stock Qty',
    lblExpiration: 'Expiration Date',
    lblLocation: 'Storage Location',
    phLocation: 'e.g. A-3 Cabinet 2nd Row',
    lblItemRemarks: 'Special Remarks',
    phItemRemarks: 'Enter remarks',
    btnAddItem: 'Add Item',
    inventoryStatusTitle: 'Inventory Status & Alerts',
    titleOpenEdufine: 'Register medicines in bulk with K-Edufine procurement request Excel file.',
    btnOpenEdufine: 'Edufine Excel Import',
    titlePrintInventory: 'Print the medicine management ledger in standard format.',
    btnPrintInventory: 'Print Ledger',
    titleExportInventoryExcel: 'Download the medicine list as an Excel file.',
    btnExportInventoryExcel: 'Export Excel',
    lblExpired: 'Expired:',
    lblExpiryImminent: 'Expiry Imminent (within 30 days):',
    lblLowStock: 'Low Stock (5 or less):',
    lblCountUnit: 'case(s)',
    phSearchInventory: 'Search item name or category',
    chipAllList: 'All Items',
    chipExpiryFilter: 'Expired / Imminent',
    chipLowStockFilter: 'Low Stock',
    thCategory: 'Category',
    thItemName: 'Item Name',
    thQuantity: 'Stock Qty',
    thLocation: 'Storage Location',
    thExpiryStatus: 'Expiration Date (Status)',
    thStockManage: 'In/Out Qty Manage',
    protectedRegisterTitle: 'Register Protected Student Info',
    phGrade5: 'e.g. 5',
    phClass4: 'e.g. 4',
    phNumber8: 'e.g. 8',
    phStudentName: 'Enter student name',
    lblDiseaseName: 'Disease Name / Reason for Care',
    phDiseaseName: 'e.g. Asthma (carries inhaler)',
    lblEmergencyAction: 'Emergency First Aid Guide',
    phEmergencyAction: 'e.g. In case of dyspnea, let student inhale twice, measure SpO2, and contact parents immediately.',
    lblContactParent: 'Parent Contact Number',
    phContact: 'e.g. 010-XXXX-XXXX',
    lblContactTeacher: 'Teacher Contact Number',
    btnRegisterProtected: 'Register Info',
    protectedListTitle: 'Protected Students Roster',
    titleExportProtectedExcel: 'Download the protected students list as an Excel file.',
    phSearchProtected: 'Search by student name or disease',
    thGradeClass: 'Grade/Class/No.',
    thStudentName: 'Name',
    thDiseaseName: 'Disease Name',
    thEmergencyResponse: 'Emergency Guide',
    thContactParent: 'Parent Contact',
    thContactTeacher: 'Teacher Contact',
    thActions: 'Manage',
    studentsSectionSub: 'Search student names to view past visits and manage protected status.',
    titleNeisExcel: 'Bulk register student roster with Excel file.',
    btnClearStudents: 'Delete Roster',
    phSearchStudents: 'Search by student name, grade, or class (e.g. Grade 3 or John Doe)',
    thGender: 'Gender',
    thPastVisitsCount: 'Past Visits Count',
    thRemarks: 'Remarks / Special Notes',
    statsTitle: '📊 Integrated Multidimensional Health Room Statistics',
    statsSub: 'Report daily, monthly, grade, class, gender, and symptom-wise visitor statistics.',
    btnPrintStats: 'Print Report',
    btnExportStatsExcel: 'Save Stats Excel',
    chartMonthlyTrendTitle: 'Monthly Visit Trend',
    chartGradeDistTitle: 'Visits by Grade',
    chartGenderDistTitle: 'Visits by Gender',
    chartSymptomDistTitle: 'Visits by Symptom',
    modalEmergencyTitle: 'Protected Student Emergency Procedure',
    lblEmergencyTargetStudent: 'Target Student:',
    lblEmergencyDisease: 'Disease Name:',
    lblEmergencyActionTitle: 'Emergency Action Procedures',
    lblEmergencyContactsTitle: 'Emergency Contacts',
    lblContactParentRole: 'Parent',
    lblContactTeacherRole: 'Homeroom Teacher',
    btnConfirm: 'Confirm',
    modalBulkDropText: 'Drag and drop <strong>Excel (.xlsx) or CSV file</strong> here or click to select.',
    modalBulkDropHint: '(Required columns: Grade, Class, Number, Name, Primary Symptom, Treatment)',
    btnSelectFile: 'Select File',
    btnDownloadSampleModal: 'Get Sample Excel Template',
    lblParsedPreviewTitle: 'Parsed Data Preview',
    lblSecurityNotice: '🔒 All sensitive student information is encrypted upon saving.',
    thIndex: '#',
    thGrade: 'Grade',
    thClass: 'Class',
    thNumber: 'No.',
    thName: 'Name',
    thPrimarySymptom: 'Primary Symptom',
    thTreatmentDetail: 'Treatment Detail',
    btnSaveAllBulk: 'Save All Data',
    modalPrintViewTitle: 'Document Print Preview',
    btnPrintAction: 'Print Now',
    btnCancel: 'Cancel',
    btnPrintOptionTitle: 'Print Layout Options',
    lblIncludeApproval: 'Include Approval Lines',
    thPrincipal: 'Principal',
    thVicePrincipal: 'Vice Principal',
    thHealthTeacher: 'Health Teacher',
    thDailyJournalTitle: 'School Health Room Daily Log',
    thInventoryLedgerTitle: 'School Health Room Medicine Management Ledger',
    thProtectedListTitle: 'School Health Room Protected Students Roster',
    thStatisticsReportTitle: 'School Health Room Statistics Report',
    confirmDeleteVisit: 'Are you sure you want to delete this visit log?',
    confirmDeleteInventory: 'Are you sure you want to delete this medicine?',
    confirmDeleteProtected: 'Are you sure you want to delete this protected student?',
    confirmClearStudents: 'Are you sure you want to delete the entire student roster? This action is irreversible.',
    saveSuccess: 'Successfully saved.',
    deleteSuccess: 'Successfully deleted.',
    loadSuccess: 'Successfully loaded.',
    excelImportSuccess: 'Excel import completed.',
    excelExportSuccess: 'Excel export completed.',
    dbBackupSuccess: 'Local DB backup file has been created successfully.',
    dbShareConfigSuccess: 'Dual-officer database sharing settings updated successfully.',
    gradeUnit: 'Grade',
    classUnit: 'Class',
    numberUnit: 'No.',
    personUnit: 'person(s)',
    itemCountUnit: 'item(s)',
    genderMale: 'M',
    genderFemale: 'F',
    painScaleSuffix: 'pts',
    painScaleFree: 'No Pain'
  }
  // @i18n-en-end
}

const bodyPartDict = {
  // @body-ko-start
  ko: {
    modalTitle: '🧍‍♂️ 신체 부위 인터랙티브 구조도 선택',
    modalDesc: '외상 및 통증이 발생한 인체 신체 부위를 직접 클릭하세요.',
    refCaption: '🦴 실제 골격 참고도',
    viewFullChart: '전체 골격표 크게 보기',
    selectedPartsLabel: '선택된 신체 부위:',
    noPartsSelected: '선택된 부위 없음',
    btnReset: '초기화',
    btnApply: '입력 폼에 적용',
    subPanelTitle: '세부 부위 선택',
    btnOpenBodyMap: '🧍‍♂️ 인체 구조도 선택',
    parts: {
      head: '두부 (머리)',
      face: '안구 / 얼굴',
      neck: '경부 (목)',
      shoulder_l: '어깨(좌)',
      shoulder_r: '어깨(우)',
      arm_l: '상완(좌)',
      arm_r: '상완(우)',
      forearm_l: '하완(좌)',
      forearm_r: '하완(우)',
      chest: '흉부 (가슴)',
      abdomen: '복부 (배)',
      back: '등 / 허리',
      thigh_l: '대퇴(좌)',
      thigh_r: '대퇴(우)',
      knee_l: '무릎(좌)',
      knee_r: '무릎(우)',
      hand_l_sub: '손(좌) ▾',
      hand_r_sub: '손(우) ▾',
      foot_l_sub: '족부(좌) ▾',
      foot_r_sub: '족부(우) ▾'
    }
  },
  // @body-ko-end
  // @body-jp-start
  jp: {
    modalTitle: '🧍‍♂️ 身体部位インタラクティブ構造図選択',
    modalDesc: '負傷・痛みの発生した身体部位を直接クリックしてください。',
    refCaption: '🦴 実際の骨格参考図',
    viewFullChart: '全体骨格図を拡大表示',
    selectedPartsLabel: '選択された身体部位:',
    noPartsSelected: '選択された部位なし',
    btnReset: 'リセット',
    btnApply: '入力フォームに適用',
    subPanelTitle: '詳細部位の選択',
    btnOpenBodyMap: '🧍‍♂️ 身体構造図選択',
    parts: {
      head: '頭部 (頭)',
      face: '顔・目',
      neck: '頸部 (首)',
      shoulder_l: '肩(左)',
      shoulder_r: '肩(右)',
      arm_l: '上腕(左)',
      arm_r: '上腕(右)',
      forearm_l: '前腕(左)',
      forearm_r: '前腕(右)',
      chest: '胸部 (胸)',
      abdomen: '腹部 (お腹)',
      back: '背中・腰',
      thigh_l: '大腿(左)',
      thigh_r: '大腿(右)',
      knee_l: '膝(左)',
      knee_r: '膝(右)',
      hand_l_sub: '手(左) ▾',
      hand_r_sub: '手(右) ▾',
      foot_l_sub: '足部(左) ▾',
      foot_r_sub: '足部(右) ▾'
    }
  },
  // @body-jp-end
  // @body-en-start
  en: {
    modalTitle: '🧍‍♂️ Interactive Body Map Selection',
    modalDesc: 'Click on the body part where the injury or pain occurred.',
    refCaption: '🦴 Skeletal Reference Guide',
    viewFullChart: 'View Full Skeleton Chart',
    selectedPartsLabel: 'Selected Body Parts:',
    noPartsSelected: 'No parts selected',
    btnReset: 'Reset',
    btnApply: 'Apply to Form',
    subPanelTitle: 'Sub-parts Selection',
    btnOpenBodyMap: '🧍‍♂️ Select Body Part',
    parts: {
      head: 'Head',
      face: 'Face / Eyes',
      neck: 'Neck',
      shoulder_l: 'Left Shoulder',
      shoulder_r: 'Right Shoulder',
      arm_l: 'Left Upper Arm',
      arm_r: 'Right Upper Arm',
      forearm_l: 'Left Forearm',
      forearm_r: 'Right Forearm',
      chest: 'Chest',
      abdomen: 'Abdomen',
      back: 'Back / Waist',
      thigh_l: 'Left Thigh',
      thigh_r: 'Right Thigh',
      knee_l: 'Left Knee',
      knee_r: 'Right Knee',
      hand_l_sub: 'Left Hand ▾',
      hand_r_sub: 'Right Hand ▾',
      foot_l_sub: 'Left Foot ▾',
      foot_r_sub: 'Right Foot ▾'
    }
  }
  // @body-en-end
}

let currentLang = localStorage.getItem('lang') || 'jp'

function formatStudentInfo(grade, classRoom, numberCode) {
  if (currentLang === 'jp') {
    return `${grade}${i18nDict.jp.gradeUnit} ${classRoom}${i18nDict.jp.classUnit} ${numberCode}${i18nDict.jp.numberUnit}`
  } else if (currentLang === 'en') {
    return `Grade ${grade}, Class ${classRoom}, No. ${numberCode}`
  }
  return `${grade}학년 ${classRoom}반 ${numberCode}번`
}

function formatStudentInfoWithName(grade, classRoom, numberCode, name) {
  if (currentLang === 'jp') {
    return `${grade}${i18nDict.jp.gradeUnit} ${classRoom}${i18nDict.jp.classUnit} ${numberCode}${i18nDict.jp.numberUnit} ${name}`
  } else if (currentLang === 'en') {
    return `Grade ${grade}, Class ${classRoom}, No. ${numberCode} ${name}`
  }
  return `${grade}학년 ${classRoom}반 ${numberCode}번 ${name}`
}

function formatExpirationDate(dateStr) {
  if (!dateStr) return '-'
  const parts = dateStr.split('-')
  if (parts.length === 3) {
    if (currentLang === 'jp') {
      return `${parts[0]}年 ${parts[1]}月 ${parts[2]}日`
    } else if (currentLang === 'en') {
      return dateStr // 영어는 YYYY-MM-DD 형식 그대로 유지
    }
    return `${parts[0]}년 ${parts[1]}월 ${parts[2]}일`
  }
  return dateStr
}

function applyLanguage(lang) {
  currentLang = lang
  localStorage.setItem('lang', lang)
  if (langLabel) langLabel.textContent = lang.toUpperCase()
  
  // 메뉴 항목 언어 갱신
  const menuDashboard = document.querySelector('[data-tab="dashboard"] .menu-label')
  const menuVisits = document.querySelector('[data-tab="visits"] .menu-label')
  const menuInventory = document.querySelector('[data-tab="inventory"] .menu-label')
  const menuProtected = document.querySelector('[data-tab="protected"] .menu-label')
  const menuStudents = document.querySelector('[data-tab="students"] .menu-label')
  const menuStatistics = document.querySelector('[data-tab="statistics"] .menu-label')
  const userRoleEl = document.querySelector('.user-name')
  const exportBtnEl = document.getElementById('btn-export-all-excel')

  if (menuDashboard) menuDashboard.textContent = i18nDict[lang].dashboard
  if (menuVisits) menuVisits.textContent = i18nDict[lang].visits
  if (menuInventory) menuInventory.textContent = i18nDict[lang].inventory
  if (menuProtected) menuProtected.textContent = i18nDict[lang].protected
  if (menuStudents) menuStudents.textContent = i18nDict[lang].students
  if (menuStatistics) menuStatistics.textContent = i18nDict[lang].statistics
  if (userRoleEl) userRoleEl.textContent = i18nDict[lang].userRole
  if (exportBtnEl) exportBtnEl.innerHTML = `<span class="btn-icon">📥</span> ${i18nDict[lang].exportExcel}`

  // 범용 data-i18n 요소 자동 업데이트
  const i18nElements = document.querySelectorAll('[data-i18n]')
  i18nElements.forEach(el => {
    const key = el.getAttribute('data-i18n')
    if (key && i18nDict[lang] && i18nDict[lang][key]) {
      el.textContent = i18nDict[lang][key]
    }
  })

  // 플레이스홀더 data-i18n-placeholder 자동 업데이트
  const i18nPlaceholders = document.querySelectorAll('[data-i18n-placeholder]')
  i18nPlaceholders.forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder')
    if (key && i18nDict[lang] && i18nDict[lang][key]) {
      el.placeholder = i18nDict[lang][key]
    }
  })

  // 툴팁 data-i18n-title 자동 업데이트
  const i18nTitles = document.querySelectorAll('[data-i18n-title]')
  i18nTitles.forEach(el => {
    const key = el.getAttribute('data-i18n-title')
    if (key && i18nDict[lang] && i18nDict[lang][key]) {
      el.title = i18nDict[lang][key]
    }
  })

  // ARIA 라벨 data-i18n-aria-label 자동 업데이트
  const i18nAriaLabels = document.querySelectorAll('[data-i18n-aria-label]')
  i18nAriaLabels.forEach(el => {
    const key = el.getAttribute('data-i18n-aria-label')
    if (key && i18nDict[lang] && i18nDict[lang][key]) {
      el.setAttribute('aria-label', i18nDict[lang][key])
    }
  })

  // NEIS 문구 갱신 (일본어 모드 시 NEIS 단어 숨김 및 일반 Excel로 대체)
  const studentsSecTitle = document.getElementById('students-section-title')
  const btnTextOpenNeis = document.getElementById('btn-text-open-neis')
  const btnTextNeisSample = document.getElementById('btn-text-neis-sample')
  const modalNeisTitle = document.getElementById('modal-neis-title')
  const modalNeisDropText = document.getElementById('modal-neis-drop-text')
  const modalNeisDropHint = document.getElementById('modal-neis-drop-hint')
  const btnTextNeisSampleModal = document.getElementById('btn-text-neis-sample-modal')

  if (studentsSecTitle) studentsSecTitle.textContent = i18nDict[lang].studentsSectionTitle
  if (btnTextOpenNeis) btnTextOpenNeis.textContent = i18nDict[lang].btnTextOpenNeis
  if (btnTextNeisSample) btnTextNeisSample.textContent = i18nDict[lang].btnTextNeisSample
  if (modalNeisTitle) modalNeisTitle.textContent = i18nDict[lang].modalNeisTitle
  if (modalNeisDropText) modalNeisDropText.innerHTML = i18nDict[lang].modalNeisDropText
  if (modalNeisDropHint) modalNeisDropHint.textContent = i18nDict[lang].modalNeisDropHint
  if (btnTextNeisSampleModal) btnTextNeisSampleModal.textContent = i18nDict[lang].btnTextNeisSampleModal

  // 🧍‍♂️ 인체 구조도 모달 텍스트 및 신체 부위 버튼 다국어 적용
  const modalBodyMapTitle = document.getElementById('modal-body-map-title')
  const modalBodyMapDesc = document.getElementById('modal-body-map-desc')
  const bodyRefCaption = document.getElementById('body-ref-caption')
  const btnViewFullChart = document.getElementById('btn-view-full-chart')
  const lblSelectedParts = document.getElementById('lbl-selected-parts')
  const btnResetBodyMap = document.getElementById('btn-reset-body-map')
  const btnApplyBodyMap = document.getElementById('btn-apply-body-map')
  const btnOpenBodyMapSpan = document.querySelector('#btn-open-body-map span:last-child')

  if (modalBodyMapTitle) modalBodyMapTitle.textContent = bodyPartDict[lang].modalTitle
  if (modalBodyMapDesc) modalBodyMapDesc.textContent = bodyPartDict[lang].modalDesc
  if (bodyRefCaption) bodyRefCaption.textContent = bodyPartDict[lang].refCaption
  if (btnViewFullChart) btnViewFullChart.textContent = bodyPartDict[lang].viewFullChart
  if (lblSelectedParts) lblSelectedParts.textContent = bodyPartDict[lang].selectedPartsLabel
  if (btnResetBodyMap) btnResetBodyMap.textContent = bodyPartDict[lang].btnReset
  if (btnApplyBodyMap) btnApplyBodyMap.textContent = bodyPartDict[lang].btnApply
  if (btnOpenBodyMapSpan) btnOpenBodyMapSpan.textContent = bodyPartDict[lang].btnOpenBodyMap

  // 인체 부위 버튼 텍스트 변경
  const mapPointBtns = document.querySelectorAll('.map-point[data-part-key]')
  mapPointBtns.forEach(btn => {
    const key = btn.getAttribute('data-part-key')
    if (key && bodyPartDict[lang].parts[key]) {
      const newPartName = bodyPartDict[lang].parts[key]
      btn.textContent = newPartName
      if (!btn.classList.contains('has-sub')) {
        btn.setAttribute('data-part', newPartName)
      }
    }
  })

  // 현재 활성화된 탭 타이틀 변경
  const activeTabBtn = document.querySelector('.menu-item.active .menu-label')
  if (activeTabBtn && pageTitle) {
    pageTitle.textContent = activeTabBtn.textContent
  }

  // 오늘 날짜 및 요일 표시 실시간 다국어 적용
  updateTodayDate()

  // 브라우저 탭 타이틀 및 언어 버튼 aria-label 다국어 적용
  if (lang === 'jp') {
    document.title = 'スマート保健室業務支援システム'
  } else if (lang === 'en') {
    document.title = 'Smart Healthroom Support System'
  } else {
    document.title = '스마트 보건실 업무지원 시스템'
  }
  const btnLangToggleEl = document.getElementById('btn-lang-toggle')
  if (btnLangToggleEl && i18nDict[lang] && i18nDict[lang].btnLangToggle) {
    btnLangToggleEl.setAttribute('aria-label', i18nDict[lang].btnLangToggle)
  }

  // 사용기한 입력 폼(date input) data-placeholder 다국어 갱신
  const itemExpirationInput = document.getElementById('item-expiration')
  if (itemExpirationInput) {
    let placeholderText = '연도-월-일'
    if (lang === 'jp') {
      placeholderText = '年-月-日'
    } else if (lang === 'en') {
      placeholderText = 'yyyy-mm-dd'
    }
    itemExpirationInput.setAttribute('data-placeholder', placeholderText)
  }

  // 한국어(ko)일 때만 전교생 명단(나이스 연동 모듈) 탭 노출
  const btnTabStudents = document.getElementById('btn-tab-students')
  const tabStudentsPane = document.getElementById('tab-students')
  if (lang === 'ko') {
    if (btnTabStudents) btnTabStudents.style.display = ''
  } else {
    if (btnTabStudents) btnTabStudents.style.display = 'none'
    if (tabStudentsPane) tabStudentsPane.style.display = 'none'
    
    // 만약 현재 전교생 명단 탭이 활성화되어 있었다면 기본 대시보드 탭으로 강제 이동
    const activeTab = document.querySelector('.menu-item.active')
    if (activeTab && activeTab.getAttribute('data-tab') === 'students') {
      const dashboardTabBtn = document.getElementById('btn-tab-dashboard') || document.querySelector('[data-tab="dashboard"]')
      if (dashboardTabBtn) {
        dashboardTabBtn.click()
      }
    }
  }

  // 현재 활성화된 탭의 데이터를 새 언어 포맷으로 리프레시
  const activeMenuItem = document.querySelector('.menu-item.active')
  if (activeMenuItem) {
    const tabId = activeMenuItem.getAttribute('data-tab')
    if (tabId) refreshTabData(tabId)
  }
}

if (btnLangToggle) {
  btnLangToggle.addEventListener('click', () => {
    let nextLang = 'ko'
    if (currentLang === 'ko') {
      nextLang = 'jp'
    } else if (currentLang === 'jp') {
      nextLang = 'en'
    } else if (currentLang === 'en') {
      nextLang = 'ko'
    }
    applyLanguage(nextLang)
  })
}

// 초기 언어 적용
applyLanguage(currentLang)

// 1. 탭 네비게이션 제어
const tabButtons = document.querySelectorAll('.menu-item')
const tabPanes = document.querySelectorAll('.tab-pane')

tabButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const tabId = btn.getAttribute('data-tab')
    
    // 버튼 활성화 클래스 전환
    tabButtons.forEach(b => b.classList.remove('active'))
    btn.classList.add('active')
    
    // 탭 화면 전환
    tabPanes.forEach(pane => pane.classList.remove('active'))
    document.getElementById(`tab-${tabId}`).classList.add('active')
    
    // 타이틀 갱신
    pageTitle.textContent = btn.querySelector('.menu-label').textContent

    // 탭 로딩 시 데이터 갱신
    refreshTabData(tabId)
  })
})

// 2. 오늘 날짜 포맷팅 탑바 표시
function updateTodayDate() {
  const dateEl = document.getElementById('header-today-date')
  const now = new Date()
  const daysJp = ['日', '月', '火', '水', '木', '金', '土']
  const daysKo = ['일', '월', '화', '수', '목', '금', '토']
  const daysEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  let formatted = ''
  if (currentLang === 'jp') {
    formatted = `${now.getFullYear()}年 ${(now.getMonth()+1).toString().padStart(2, '0')}月 ${now.getDate().toString().padStart(2, '0')}日 (${daysJp[now.getDay()]})`
  } else if (currentLang === 'en') {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    formatted = `${daysEn[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`
  } else {
    formatted = `${now.getFullYear()}년 ${(now.getMonth()+1).toString().padStart(2, '0')}월 ${now.getDate().toString().padStart(2, '0')}일 (${daysKo[now.getDay()]})`
  }
  if (dateEl) dateEl.textContent = formatted
}

// ----------------------------------------------------
// [공통 데이터 관리 모듈 - 암호화 및 DB 제어]
// ----------------------------------------------------

// 3. 데이터 갱신 라우터
async function refreshTabData(tabId) {
  switch (tabId) {
    case 'dashboard':
      await loadDashboardData()
      break
    case 'visits':
      await loadVisits()
      break
    case 'inventory':
      await loadInventory()
      break
    case 'protected':
      await loadProtectedStudents()
      break
  }
}

// ==========================================
// 🚨 [보안 최우선] 데이터 암/복호화 헬퍼 함수
// ==========================================

// 데이터베이스 저장 전에 렌더러단에서 암호화
async function encrypt(value) {
  if (!value) return ''
  return await window.api.security.encrypt(value)
}

// 데이터베이스 조회 후 화면 표시 전에 복호화
async function decrypt(value) {
  if (!value) return ''
  return await window.api.security.decrypt(value)
}

// ==========================================
// 🏥 1) 보건실 방문 일지 로직
// ==========================================

const formVisit = document.getElementById('form-visit-register')
const tableVisitsBody = document.getElementById('table-visits-body')
const btnSearchVisit = document.getElementById('btn-search-visit')
const inputSearchVisit = document.getElementById('input-search-visit')

// 방문 일지 등록 이벤트
if (formVisit) {
  formVisit.addEventListener('submit', async (e) => {
    e.preventDefault()
    
    const grade = document.getElementById('visit-grade').value
    const classRoom = document.getElementById('visit-class').value
    const numberCode = document.getElementById('visit-number').value
    const name = document.getElementById('visit-name').value
    const symptoms = document.getElementById('visit-symptoms').value
    const treatment = document.getElementById('visit-treatment').value
    const remarks = document.getElementById('visit-remarks').value

    try {
      // 🔒 [규칙 8] 개인정보 및 민감 데이터 암호화 수행
      const encGrade = await encrypt(grade)
      const encClass = await encrypt(classRoom)
      const encNumber = await encrypt(numberCode)
      const encName = await encrypt(name)
      const encSymptoms = await encrypt(symptoms)
      const encTreatment = await encrypt(treatment)
      const encRemarks = await encrypt(remarks)

      // DB 쿼리 실행 (암호화된 문자열을 삽입)
      const sql = `
        INSERT INTO visits (grade, class_room, number_code, student_name, symptoms, treatment, remarks)
        VALUES (?, ?, ?, ?, ?, ?, ?);
      `
      await window.api.db.query(sql, [encGrade, encClass, encNumber, encName, encSymptoms, encTreatment, encRemarks])

      alert(i18nDict[currentLang].alertVisitSaved)
      formVisit.reset()
      await loadVisits() // 목록 새로고침
    } catch (error) {
      console.error('방문 등록 에러:', error)
      alert(i18nDict[currentLang].alertVisitSaveFailed)
    }
  })
}

// 방문 일지 목록 불러오기 및 복호화
async function loadVisits(searchQuery = '') {
  if (!tableVisitsBody) return
  
  try {
    const rawVisits = await window.api.db.query('SELECT * FROM visits ORDER BY visited_at DESC;')
    tableVisitsBody.innerHTML = ''

    let displayCount = 0

    for (const row of rawVisits) {
      // 🔒 저장된 암호화 데이터를 화면에 그리기 전 복호화 진행
      const decGrade = await decrypt(row.grade)
      const decClass = await decrypt(row.class_room)
      const decNumber = await decrypt(row.number_code)
      const decName = await decrypt(row.student_name)
      const decSymptoms = await decrypt(row.symptoms)
      const decTreatment = await decrypt(row.treatment)
      
      // 검색어가 설정되어 있을 때 필터링 (복호화된 데이터 기준 검색)
      if (searchQuery && !decName.includes(searchQuery)) {
        continue
      }

      displayCount++

      const tr = document.createElement('tr')
      tr.innerHTML = `
        <td>${row.visited_at}</td>
        <td>${formatStudentInfo(decGrade, decClass, decNumber)}</td>
        <td class="font-semibold">${decName}</td>
        <td>${decSymptoms}</td>
        <td>${decTreatment}</td>
        <td>
          <button class="btn btn-danger sm-action-btn" data-delete-id="${row.id}">🗑️</button>
        </td>
      `
      
      // 삭제 버튼 이벤트 연결
      tr.querySelector('[data-delete-id]').addEventListener('click', async (e) => {
        const id = e.target.getAttribute('data-delete-id')
        if (confirm(i18nDict[currentLang].confirmDeleteVisit)) {
          await window.api.db.query('DELETE FROM visits WHERE id = ?;', [id])
          await loadVisits(searchQuery)
        }
      })

      tableVisitsBody.appendChild(tr)
    }

    if (displayCount === 0) {
      tableVisitsBody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">${i18nDict[currentLang].emptyRecord}</td></tr>`
    }

  } catch (error) {
    console.error('방문기록 조회 에러:', error)
  }
}

// 방문자 검색 이벤트
if (btnSearchVisit) {
  btnSearchVisit.addEventListener('click', () => {
    loadVisits(inputSearchVisit.value.trim())
  })
}
if (inputSearchVisit) {
  inputSearchVisit.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      loadVisits(inputSearchVisit.value.trim())
    }
  })
}

// ==========================================
// 💊 2) 의약품 및 물품 재고 관리 로직
// ==========================================

const formInventory = document.getElementById('form-inventory-register')
const tableInventoryBody = document.getElementById('table-inventory-body')
const inputSearchInventory = document.getElementById('input-search-inventory')

if (formInventory) {
  formInventory.addEventListener('submit', async (e) => {
    e.preventDefault()

    const name = document.getElementById('item-name').value
    const category = document.getElementById('item-category').value
    const unit = document.getElementById('item-unit').value
    const quantity = parseInt(document.getElementById('item-quantity').value, 10)
    const expiration = document.getElementById('item-expiration').value
    const location = document.getElementById('item-location').value
    const remarks = document.getElementById('item-remarks').value

    try {
      // 의약품 품목명 등은 통계 및 조회를 위해 평문으로 저장하되, 
      // 만약 민감 정보가 섞인다면 암호화해야 합니다. 여기서는 기본 물품이므로 평문 저장합니다.
      const sql = `
        INSERT INTO inventories (item_name, category, unit, quantity, expiration_date, location, remarks)
        VALUES (?, ?, ?, ?, ?, ?, ?);
      `
      await window.api.db.query(sql, [name, category, unit, quantity, expiration, location, remarks])
      
      alert(i18nDict[currentLang].alertInventorySaved)
      formInventory.reset()
      await loadInventory()
    } catch (error) {
      console.error('약품 등록 에러:', error)
      alert(i18nDict[currentLang].alertInventorySaveFailed)
    }
  })
}

// 현재 선택된 의약품 필터 상태 ('all', 'expiry', 'lowstock')
let currentInventoryFilter = 'all'

// 약품 목록 조회 및 수량 조정
async function loadInventory(searchQuery = '', filterType = currentInventoryFilter) {
  if (!tableInventoryBody) return
  currentInventoryFilter = filterType

  try {
    let sql = 'SELECT * FROM inventories'
    const params = []
    
    if (searchQuery) {
      sql += ' WHERE (item_name LIKE ? OR category LIKE ?)'
      params.push(`%${searchQuery}%`, `%${searchQuery}%`)
    }
    sql += ' ORDER BY item_name ASC;'

    const allItems = await window.api.db.query(sql, params)
    tableInventoryBody.innerHTML = ''

    // 🚨 전체 통계 및 유효기간 임박/만료/재고부족 상태 분석
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    let expiredCount = 0
    let warningCount = 0
    let lowStockCount = 0

    const processedItems = allItems.map(item => {
      const expDate = new Date(item.expiration_date)
      expDate.setHours(0, 0, 0, 0)
      
      const diffTime = expDate - today
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

      let status = 'normal' // normal, imminent, expired
      let statusLabel = ''

      if (diffDays < 0) {
        status = 'expired'
        statusLabel = currentLang === 'jp'
          ? `🔴 期限切れ (${Math.abs(diffDays)}日経過)`
          : `🔴 만료됨 (${Math.abs(diffDays)}일 경과)`
        expiredCount++
      } else if (diffDays <= 7) {
        status = 'expired'
        statusLabel = currentLang === 'jp'
          ? `🔴 D-${diffDays} (緊急)`
          : `🔴 D-${diffDays} (긴급)`
        warningCount++
      } else if (diffDays <= 30) {
        status = 'imminent'
        statusLabel = currentLang === 'jp'
          ? `🟡 D-${diffDays} (間近)`
          : `🟡 D-${diffDays} (임박)`
        warningCount++
      } else {
        statusLabel = formatExpirationDate(item.expiration_date)
      }

      const isLowStock = item.quantity <= 5
      if (isLowStock) lowStockCount++

      return {
        ...item,
        diffDays,
        status,
        statusLabel,
        isLowStock
      }
    })

    // 📊 알림 바 수치 업데이트
    const cntExpiredEl = document.getElementById('cnt-expired')
    const cntWarningEl = document.getElementById('cnt-warning')
    const cntLowstockEl = document.getElementById('cnt-lowstock')
    if (cntExpiredEl) cntExpiredEl.textContent = expiredCount
    if (cntWarningEl) cntWarningEl.textContent = warningCount
    if (cntLowstockEl) cntLowstockEl.textContent = lowStockCount

    // 🔍 필터링 적용
    let filteredItems = processedItems
    if (filterType === 'expiry') {
      filteredItems = processedItems.filter(i => i.status === 'expired' || i.status === 'imminent')
    } else if (filterType === 'lowstock') {
      filteredItems = processedItems.filter(i => i.isLowStock)
    }

    for (const item of filteredItems) {
      const tr = document.createElement('tr')
      
      let expiryBadgeHtml = ''
      if (item.status === 'expired') {
        expiryBadgeHtml = `<span class="badge-expiry expired">${item.statusLabel}</span>`
      } else if (item.status === 'imminent') {
        expiryBadgeHtml = `<span class="badge-expiry imminent">${item.statusLabel}</span>`
      } else {
        expiryBadgeHtml = `<span class="badge-expiry normal">${formatExpirationDate(item.expiration_date)}</span>`
      }
      
      tr.innerHTML = `
        <td><span class="badge-category">${item.category}</span></td>
        <td class="font-semibold">${item.item_name}</td>
        <td>
          <div class="qty-adjuster">
            <button class="qty-btn" data-qty-dec="${item.id}">-</button>
            <span class="qty-val ${item.isLowStock ? 'text-red font-bold' : ''}">${item.quantity} ${item.unit}</span>
            <button class="qty-btn" data-qty-inc="${item.id}">+</button>
          </div>
        </td>
        <td>${item.location || '-'}</td>
        <td>${expiryBadgeHtml}</td>
        <td>
          <button class="btn btn-danger sm-action-btn" data-delete-item-id="${item.id}">🗑️</button>
        </td>
      `

      // 수량 증가 버튼
      tr.querySelector(`[data-qty-inc="${item.id}"]`).addEventListener('click', async () => {
        await window.api.db.query('UPDATE inventories SET quantity = quantity + 1 WHERE id = ?;', [item.id])
        await loadInventory(searchQuery, currentInventoryFilter)
      })

      // 수량 감소 버튼
      tr.querySelector(`[data-qty-dec="${item.id}"]`).addEventListener('click', async () => {
        if (item.quantity > 0) {
          await window.api.db.query('UPDATE inventories SET quantity = quantity - 1 WHERE id = ?;', [item.id])
          await loadInventory(searchQuery, currentInventoryFilter)
        }
      })

      // 약품 삭제 버튼
      tr.querySelector(`[data-delete-item-id="${item.id}"]`).addEventListener('click', async () => {
        if (confirm(i18nDict[currentLang].confirmDeleteInventory)) {
          await window.api.db.query('DELETE FROM inventories WHERE id = ?;', [item.id])
          await loadInventory(searchQuery, currentInventoryFilter)
        }
      })

      tableInventoryBody.appendChild(tr)
    }

    if (filteredItems.length === 0) {
      tableInventoryBody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">${i18nDict[currentLang].emptyInventory}</td></tr>`
    }
  } catch (error) {
    console.error('약품 목록 조회 에러:', error)
  }
}

// 약품 검색 이벤트
if (inputSearchInventory) {
  inputSearchInventory.addEventListener('input', (e) => {
    loadInventory(e.target.value.trim(), currentInventoryFilter)
  })
}

// 약품 상태 필터 버튼 칩 이벤트 연결
const filterChips = document.querySelectorAll('.filter-chip')
filterChips.forEach(chip => {
  chip.addEventListener('click', () => {
    filterChips.forEach(c => c.classList.remove('active'))
    chip.classList.add('active')
    const filter = chip.getAttribute('data-filter')
    const searchVal = inputSearchInventory ? inputSearchInventory.value.trim() : ''
    loadInventory(searchVal, filter)
  })
})

// ==========================================
// 🚨 3) 요보호 학생 관리 및 응급 팝업 로직
// ==========================================

const formProtected = document.getElementById('form-protected-register')
const tableProtectedBody = document.getElementById('table-protected-body')
const inputSearchProtected = document.getElementById('input-search-protected')

// 모달 바인딩 요소들
const modalEmergency = document.getElementById('modal-emergency')
const modalStudentInfo = document.getElementById('modal-student-info')
const modalDiseaseName = document.getElementById('modal-disease-name')
const modalEmergencyAction = document.getElementById('modal-emergency-action')
const modalContactParent = document.getElementById('modal-contact-parent')
const modalContactTeacher = document.getElementById('modal-contact-teacher')

// 요보호 학생 등록
if (formProtected) {
  formProtected.addEventListener('submit', async (e) => {
    e.preventDefault()

    const grade = document.getElementById('prot-grade').value
    const classRoom = document.getElementById('prot-class').value
    const numberCode = document.getElementById('prot-number').value
    const name = document.getElementById('prot-name').value
    const disease = document.getElementById('prot-disease').value
    const action = document.getElementById('prot-action').value
    const contactParent = document.getElementById('prot-contact-parent').value
    const contactTeacher = document.getElementById('prot-contact-teacher').value

    try {
      // 🔒 [규칙 8] 개인정보 및 질병 관련 정보 암호화 적용
      const encGrade = await encrypt(grade)
      const encClass = await encrypt(classRoom)
      const encNumber = await encrypt(numberCode)
      const encName = await encrypt(name)
      const encDisease = await encrypt(disease)
      const encAction = await encrypt(action)
      const encParent = await encrypt(contactParent)
      const encTeacher = await encrypt(contactTeacher)

      const sql = `
        INSERT INTO protected_students (grade, class_room, number_code, student_name, disease_name, emergency_action, contact_parent, contact_teacher)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?);
      `
      await window.api.db.query(sql, [encGrade, encClass, encNumber, encName, encDisease, encAction, encParent, encTeacher])

      alert(i18nDict[currentLang].alertProtectedSaved)
      formProtected.reset()
      await loadProtectedStudents()
    } catch (error) {
      console.error('요보호 학생 등록 실패:', error)
      alert(i18nDict[currentLang].alertProtectedSaveFailed)
    }
  })
}

// 요보호 학생 명단 불러오기
async function loadProtectedStudents(searchQuery = '') {
  if (!tableProtectedBody) return

  try {
    const rawStudents = await window.api.db.query('SELECT * FROM protected_students;')
    tableProtectedBody.innerHTML = ''
    
    let displayCount = 0

    for (const student of rawStudents) {
      const decGrade = await decrypt(student.grade)
      const decClass = await decrypt(student.class_room)
      const decNumber = await decrypt(student.number_code)
      const decName = await decrypt(student.student_name)
      const decDisease = await decrypt(student.disease_name)
      const decAction = await decrypt(student.emergency_action)
      const decParent = await decrypt(student.contact_parent)
      const decTeacher = await decrypt(student.contact_teacher)

      // 검색 필터링 (복호화된 이름 혹은 질환명 기준)
      if (searchQuery && !decName.includes(searchQuery) && !decDisease.includes(searchQuery)) {
        continue
      }

      displayCount++

      const tr = document.createElement('tr')
      tr.innerHTML = `
        <td>${formatStudentInfo(decGrade, decClass, decNumber)}</td>
        <td class="font-bold">${decName}</td>
        <td><span class="badge-disease">${decDisease}</span></td>
        <td>${decParent}</td>
        <td>
          <button class="btn btn-primary sm-action-btn" data-action-id="${student.id}">🚨 대응요령</button>
        </td>
        <td>
          <button class="btn btn-danger sm-action-btn" data-delete-prot-id="${student.id}">🗑️</button>
        </td>
      `

      // 🚨 비상 대응 가이드 모달 연결
      tr.querySelector(`[data-action-id="${student.id}"]`).addEventListener('click', () => {
        modalStudentInfo.textContent = formatStudentInfoWithName(decGrade, decClass, decNumber, decName)
        modalDiseaseName.textContent = decDisease
        modalEmergencyAction.textContent = decAction
        modalContactParent.textContent = decParent
        modalContactTeacher.textContent = decTeacher
        
        modalEmergency.classList.add('active')
      })

      // 삭제 처리
      tr.querySelector(`[data-delete-prot-id="${student.id}"]`).addEventListener('click', async () => {
        if (confirm(i18nDict[currentLang].confirmDeleteProtected)) {
          await window.api.db.query('DELETE FROM protected_students WHERE id = ?;', [student.id])
          await loadProtectedStudents(searchQuery)
        }
      })

      tableProtectedBody.appendChild(tr)
    }

    if (displayCount === 0) {
      tableProtectedBody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">${i18nDict[currentLang].emptyProtected}</td></tr>`
    }
  } catch (error) {
    console.error('요보호 학생 목록 조회 에러:', error)
  }
}

// 요보호 학생 검색
if (inputSearchProtected) {
  inputSearchProtected.addEventListener('input', (e) => {
    loadProtectedStudents(e.target.value.trim())
  })
}

// 모달 닫기 제어
const btnCloseModal = document.getElementById('btn-close-modal')
const btnModalCloseOk = document.getElementById('btn-modal-close-ok')

if (btnCloseModal) {
  btnCloseModal.addEventListener('click', () => modalEmergency.classList.remove('active'))
}
if (btnModalCloseOk) {
  btnModalCloseOk.addEventListener('click', () => modalEmergency.classList.remove('active'))
}
if (modalEmergency) {
  modalEmergency.addEventListener('click', (e) => {
    if (e.target === modalEmergency) {
      modalEmergency.classList.remove('active')
    }
  })
}

// ==========================================
// 📈 4) 대시보드 통계 차트 (Chart.js) 빌드 로직
// ==========================================
function buildVisitsChart(labels, dataValues) {
  const ctx = document.getElementById('chart-visits-trend')
  if (!ctx) return

  // 테마 모드에 따른 동적 차트 디자인 정의
  const isLight = document.body.classList.contains('light-mode')
  const textColor = isLight ? '#4a4e57' : '#94a3b8'
  const gridColor = isLight ? 'rgba(0, 222, 90, 0.08)' : 'rgba(255, 255, 255, 0.06)'
  const pointBorderColor = isLight ? '#00b34c' : '#00de5a'
  const pointHoverBgColor = '#ffffff'
  const lineGlowColor = isLight ? 'rgba(0, 222, 90, 0.15)' : 'rgba(0, 222, 90, 0.25)'

  // 기존 차트가 있으면 파괴하고 재생성 (오동작 방지)
  if (visitsChartInstance) {
    visitsChartInstance.destroy()
  }

  // 선형 차트 생성
  visitsChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: '일별 방문 학생 수 (명)',
        data: dataValues,
        borderColor: isLight ? '#00b34c' : '#00de5a',
        backgroundColor: lineGlowColor,
        fill: true,
        tension: 0.35,           // 부드러운 곡선 적용
        pointBackgroundColor: pointBorderColor,
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7,
        pointHoverBackgroundColor: pointHoverBgColor,
        pointHoverBorderColor: pointBorderColor,
        borderWidth: 3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false        // 범례 숨김 (심플함 유지)
        },
        tooltip: {
          backgroundColor: isLight ? '#ffffff' : '#1e293b',
          titleColor: isLight ? '#0f172a' : '#f8fafc',
          bodyColor: isLight ? '#334155' : '#cbd5e1',
          borderColor: isLight ? 'rgba(0, 222, 90, 0.2)' : 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1,
          padding: 10,
          displayColors: false,
          callbacks: {
            label: function(context) {
              return currentLang === 'jp' ? `来室者数: ${context.parsed.y}名` : `방문자 수: ${context.parsed.y}명`
            }
          }
        }
      },
      scales: {
        x: {
          grid: {
            color: gridColor
          },
          ticks: {
            color: textColor,
            font: {
              family: "'malgun gothic', 'Noto Sans KR', sans-serif",
              size: 11
            }
          }
        },
        y: {
          grid: {
            color: gridColor
          },
          ticks: {
            color: textColor,
            font: {
              family: "'malgun gothic', 'Noto Sans KR', sans-serif",
              size: 11
            },
            stepSize: 1,
            precision: 0
          },
          min: 0
        }
      }
    }
  })
}

// 지난 7일간의 방문 통계 데이터를 로딩하는 비동기 함수
async function loadChartData() {
  try {
    // 가. 최근 7일 날짜 리스트 생성 (기록이 없는 날도 0명으로 채우기 위함)
    const dates = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      dates.push(d.toISOString().split('T')[0]) // YYYY-MM-DD
    }

    // 나. SQLite에서 날짜별 방문자 수 가져오기
    // visits 테이블의 visited_at은 'YYYY-MM-DD HH:MM:SS' 형식이므로 date() 내장함수를 이용해 날짜별로 그룹화합니다.
    const querySql = `
      SELECT date(visited_at) AS visit_date, COUNT(*) AS cnt 
      FROM visits 
      GROUP BY visit_date;
    `
    const rows = await window.api.db.query(querySql)
    
    // 다. DB 결과 데이터를 날짜 매핑 객체로 변환
    const countMap = {}
    rows.forEach(r => {
      countMap[r.visit_date] = r.cnt
    })

    // 라. 7일 데이터 최종 가공
    chartDataCache = dates.map(d => countMap[d] || 0)
    chartLabelsCache = dates.map(d => {
      const parts = d.split('-')
      return `${parts[1]}/${parts[2]}` // MM/DD 형식 라벨
    })

    // 마. 차트 드로잉 실행
    buildVisitsChart(chartLabelsCache, chartDataCache)

  } catch (error) {
    console.error('차트 데이터 로드 실패:', error)
  }
}

// ==========================================
// 📊 5) 대시보드 요약 정보 집계 및 최근기록 연동
// ==========================================

async function loadDashboardData() {
  const dashTodayVisits = document.getElementById('dash-today-visits')
  const dashLowStock = document.getElementById('dash-low-stock')
  const dashProtectedCount = document.getElementById('dash-protected-count')
  const tableRecentBody = document.getElementById('dash-recent-visits-table')
  const dashTodoList = document.getElementById('dash-todo-list')

  try {
    // 가. 오늘 방문자 수 구하기 (SQLite 날짜 필터링)
    const todayStr = new Date().toISOString().split('T')[0]
    const visitsToday = await window.api.db.query("SELECT COUNT(*) AS cnt FROM visits WHERE visited_at LIKE ?;", [`${todayStr}%`])
    if (dashTodayVisits) {
      dashTodayVisits.textContent = visitsToday[0]?.cnt || 0
    }

    // 나. 품절/부족 의약품 수 구하기 (재고 5개 이하)
    const lowStockItems = await window.api.db.query("SELECT * FROM inventories WHERE quantity <= 5;")
    if (dashLowStock) {
      dashLowStock.textContent = lowStockItems.length
    }

    // 다. 요보호 학생 수 구하기
    const protStudents = await window.api.db.query("SELECT COUNT(*) AS cnt FROM protected_students;")
    if (dashProtectedCount) {
      dashProtectedCount.textContent = protStudents[0]?.cnt || 0
    }

    // 라. 의약품 유효기간 만료/임박 분석 (알림 리스트용)
    const allInventories = await window.api.db.query("SELECT * FROM inventories;")
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const expiredOrImminentItems = []
    allInventories.forEach(item => {
      const expDate = new Date(item.expiration_date)
      expDate.setHours(0, 0, 0, 0)
      const diffDays = Math.floor((expDate - today) / (1000 * 60 * 60 * 24))
      if (diffDays <= 30) {
        expiredOrImminentItems.push({ ...item, diffDays })
      }
    })

    // 마. 대시보드 알림 및 업무 체크 리스트 실시간 동적 렌더링
    if (dashTodoList) {
      dashTodoList.innerHTML = ''

      if (expiredOrImminentItems.length > 0) {
        expiredOrImminentItems.slice(0, 3).forEach(item => {
          const li = document.createElement('li')
          const isExp = item.diffDays < 0
          li.className = isExp ? 'todo-item urgent' : 'todo-item warning'
          
          let label = ''
          let prefix = ''
          if (currentLang === 'jp') {
            label = isExp ? `期限切れ (${Math.abs(item.diffDays)}日経過)` : `使用期限 D-${item.diffDays} 間近`
            prefix = '[医薬品]'
          } else if (currentLang === 'en') {
            label = isExp ? `Expired (${Math.abs(item.diffDays)} day(s) ago)` : `Expiry D-${item.diffDays} Imminent`
            prefix = '[Medicine]'
          } else {
            label = isExp ? `만료됨 (${Math.abs(item.diffDays)}일 경과)` : `유효기간 D-${item.diffDays} 임박`
            prefix = '[의약품]'
          }

          li.innerHTML = `
            <span class="todo-icon">${isExp ? '⚠️' : '⏳'}</span>
            <span class="todo-text">${prefix} <strong>${item.item_name}</strong> - ${label}</span>
          `
          dashTodoList.appendChild(li)
        })
      }

      if (lowStockItems.length > 0) {
        lowStockItems.slice(0, 3).forEach(item => {
          const li = document.createElement('li')
          li.className = 'todo-item warning'
          let prefix = ''
          let suffix = ''
          if (currentLang === 'jp') {
            prefix = '[在庫不足]'
            suffix = '残り'
          } else if (currentLang === 'en') {
            prefix = '[Low Stock]'
            suffix = 'left'
          } else {
            prefix = '[재고부족]'
            suffix = '남음'
          }
          li.innerHTML = `
            <span class="todo-icon">📉</span>
            <span class="todo-text">${prefix} <strong>${item.item_name}</strong> (${item.quantity}${item.unit} ${suffix})</span>
          `
          dashTodoList.appendChild(li)
        })
      }

      const defaultLi = document.createElement('li')
      defaultLi.className = 'todo-item'
      let defaultText = '보건실 일일점검 및 개인정보 보안 상태 정상'
      if (currentLang === 'jp') {
        defaultText = '保健室の日々点検および個人情報セキュリティ状態正常'
      } else if (currentLang === 'en') {
        defaultText = 'Daily health room inspection and privacy security status normal'
      }
      defaultLi.innerHTML = `
        <span class="todo-icon">✅</span>
        <span class="todo-text">${defaultText}</span>
      `
      dashTodoList.appendChild(defaultLi)
    }

    // 바. 최근 7일 방문 추이 그래프 데이터 로드 및 빌드
    await loadChartData()

    // 사. 최근 방문 이력 상위 5건 표시 (복호화 필요)
    if (tableRecentBody) {
      const recentVisits = await window.api.db.query("SELECT * FROM visits ORDER BY visited_at DESC LIMIT 5;")
      tableRecentBody.innerHTML = ''

      for (const row of recentVisits) {
        const decName = await decrypt(row.student_name)
        const decGrade = await decrypt(row.grade)
        const decClass = await decrypt(row.class_room)
        const decNumber = await decrypt(row.number_code)
        const decSymptoms = await decrypt(row.symptoms)
        const decTreatment = await decrypt(row.treatment)

        const timePart = row.visited_at.split(' ')[1] || row.visited_at

        const tr = document.createElement('tr')
        tr.innerHTML = `
          <td>${timePart}</td>
          <td>${formatStudentInfoWithName(decGrade, decClass, decNumber, decName)}</td>
          <td>${decSymptoms}</td>
          <td>${decTreatment}</td>
        `
        tableRecentBody.appendChild(tr)
      }

      if (recentVisits.length === 0) {
        tableRecentBody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">${currentLang === 'jp' ? '本日来室した生徒はいません。' : '오늘 방문한 학생이 없습니다.'}</td></tr>`
      }
    }
  } catch (error) {
    console.error('대시보드 통계 집계 실패:', error)
  }
}

// 대시보드로 즉시이동 버튼 핸들러
const btnGoToVisits = document.getElementById('btn-go-to-visits')
if (btnGoToVisits) {
  btnGoToVisits.addEventListener('click', () => {
    const visitsTabBtn = document.getElementById('btn-tab-visits')
    if (visitsTabBtn) visitsTabBtn.click()
  })
}

// ==========================================
// 📊 6) 엑셀 내보내기 모듈 (Export to Excel)
// ==========================================

function downloadExcelOrCsv(filename, sheetsData) {
  if (typeof XLSX !== 'undefined') {
    const wb = XLSX.utils.book_new()
    sheetsData.forEach(s => {
      const data = [s.headers, ...s.rows]
      const ws = XLSX.utils.aoa_to_sheet(data)
      XLSX.utils.book_append_sheet(wb, ws, s.sheetName)
    })
    XLSX.writeFile(wb, `${filename}.xlsx`)
  } else {
    // XLSX 미지원 시 UTF-8 BOM CSV Fallback
    const s = sheetsData[0]
    let csvContent = '\uFEFF' + s.headers.join(',') + '\n'
    s.rows.forEach(r => {
      csvContent += r.map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(',') + '\n'
    })
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${filename}.csv`
    link.click()
  }
}

// 1) 전체 데이터 엑셀 추출
async function exportAllData() {
  try {
    const rawVisits = await window.api.db.query('SELECT * FROM visits ORDER BY visited_at DESC;')
    const visitRows = []
    for (const r of rawVisits) {
      visitRows.push([
        r.visited_at,
        await decrypt(r.grade),
        await decrypt(r.class_room),
        await decrypt(r.number_code),
        await decrypt(r.student_name),
        await decrypt(r.symptoms),
        await decrypt(r.treatment),
        await decrypt(r.remarks)
      ])
    }

    const rawInventory = await window.api.db.query('SELECT * FROM inventories ORDER BY category ASC, item_name ASC;')
    const inventoryRows = rawInventory.map(i => [
      i.category,
      i.item_name,
      i.quantity,
      i.unit,
      i.expiration_date,
      i.location || '',
      i.remarks || ''
    ])

    const rawProtected = await window.api.db.query('SELECT * FROM protected_students;')
    const protectedRows = []
    for (const p of rawProtected) {
      protectedRows.push([
        await decrypt(p.grade),
        await decrypt(p.class_room),
        await decrypt(p.number_code),
        await decrypt(p.student_name),
        await decrypt(p.disease_name),
        await decrypt(p.emergency_action),
        await decrypt(p.contact_parent),
        await decrypt(p.contact_teacher)
      ])
    }

    const todayStr = new Date().toISOString().split('T')[0]
    const sheets = [
      {
        sheetName: currentLang === 'jp' ? '来室記録' : '방문일지',
        headers: currentLang === 'jp'
          ? ['来室日時', '学年', '組', '出席番号', '氏名', '主な症状', '処置内容', '備考']
          : ['방문일시', '학년', '반', '번호', '학생명', '주요증상', '처치내용', '비고'],
        rows: visitRows
      },
      {
        sheetName: currentLang === 'jp' ? '医薬品備品台帳' : '의약품관리대장',
        headers: currentLang === 'jp'
          ? ['カテゴリ', '品目名', '在庫量', '単位', '使用期限', '保管場所', '特記事項']
          : ['카테고리', '품목명', '재고량', '단위', '유통기한', '보관위치', '특이사항'],
        rows: inventoryRows
      },
      {
        sheetName: currentLang === 'jp' ? '要配慮生徒名簿' : '요보호학생명단',
        headers: currentLang === 'jp'
          ? ['学年', '組', '出席番号', '氏名', '疾患名', '緊急対応措置', '保護者連絡先', '担任教師連絡先']
          : ['학년', '반', '번호', '학생명', '질환명', '비상응급조치', '학부모연락처', '담임교사연락처'],
        rows: protectedRows
      }
    ]

    const filename = currentLang === 'jp' ? `スマート保健室_全体データ_${todayStr}` : `스마트보건실_전체데이터_${todayStr}`
    downloadExcelOrCsv(filename, sheets)
    alert(i18nDict[currentLang].alertExportSuccess)
  } catch (err) {
    console.error('전체 엑셀 추출 실패:', err)
    alert(i18nDict[currentLang].alertExportFailed)
  }
}

// 2) 방문 일지 단독 엑셀 추출
async function exportVisitsData() {
  try {
    const rawVisits = await window.api.db.query('SELECT * FROM visits ORDER BY visited_at DESC;')
    const visitRows = []
    for (const r of rawVisits) {
      visitRows.push([
        r.visited_at,
        await decrypt(r.grade),
        await decrypt(r.class_room),
        await decrypt(r.number_code),
        await decrypt(r.student_name),
        await decrypt(r.symptoms),
        await decrypt(r.treatment),
        await decrypt(r.remarks)
      ])
    }
    const todayStr = new Date().toISOString().split('T')[0]
    const filename = currentLang === 'jp' ? `保健室_来室日誌_${todayStr}` : `보건실_방문일지_${todayStr}`
    const sheetTitle = currentLang === 'jp' ? '来室記録' : '방문일지'
    const visitHeaders = currentLang === 'jp'
      ? ['来室日時', '学年', '組', '出席番号', '氏名', '主な症状', '処置内容', '備考']
      : ['방문일시', '학년', '반', '번호', '학생명', '주요증상', '처치내용', '비고']
    downloadExcelOrCsv(filename, [{
      sheetName: sheetTitle,
      headers: visitHeaders,
      rows: visitRows
    }])
  } catch (err) {
    console.error('방문일지 엑셀 추출 실패:', err)
  }
}

// 3) 의약품 재고 단독 엑셀 추출
async function exportInventoryData() {
  try {
    const rawInventory = await window.api.db.query('SELECT * FROM inventories ORDER BY category ASC, item_name ASC;')
    const inventoryRows = rawInventory.map(i => [
      i.category,
      i.item_name,
      i.quantity,
      i.unit,
      i.expiration_date,
      i.location || '',
      i.remarks || ''
    ])
    const todayStr = new Date().toISOString().split('T')[0]
    const filename = currentLang === 'jp' ? `保健室_医薬品管理台帳_${todayStr}` : `보건실_의약품관리대장_${todayStr}`
    const sheetTitle = currentLang === 'jp' ? '医薬品備品台帳' : '의약품관리대장'
    const invHeaders = currentLang === 'jp'
      ? ['カテゴリ', '品目名', '在庫量', '単位', '使用期限', '保管場所', '特記事項']
      : ['카테고리', '품목명', '재고량', '단위', '유통기한', '보관위치', '특이사항']
    downloadExcelOrCsv(filename, [{
      sheetName: sheetTitle,
      headers: invHeaders,
      rows: inventoryRows
    }])
  } catch (err) {
    console.error('의약품 엑셀 추출 실패:', err)
  }
}

// 4) 요보호 학생 단독 엑셀 추출
async function exportProtectedData() {
  try {
    const rawProtected = await window.api.db.query('SELECT * FROM protected_students;')
    const protectedRows = []
    for (const p of rawProtected) {
      protectedRows.push([
        await decrypt(p.grade),
        await decrypt(p.class_room),
        await decrypt(p.number_code),
        await decrypt(p.student_name),
        await decrypt(p.disease_name),
        await decrypt(p.emergency_action),
        await decrypt(p.contact_parent),
        await decrypt(p.contact_teacher)
      ])
    }
    const todayStr = new Date().toISOString().split('T')[0]
    const filename = currentLang === 'jp' ? `保健室_要配慮生徒名簿_${todayStr}` : `보건실_요보호학생명단_${todayStr}`
    const sheetTitle = currentLang === 'jp' ? '要配慮生徒名簿' : '요보호학생명단'
    const protHeaders = currentLang === 'jp'
      ? ['学年', '組', '出席番号', '氏名', '疾患名', '緊急対応措置', '保護者連絡先', '担任教師連絡先']
      : ['학년', '반', '번호', '학생명', '질환명', '비상응급조치', '학부모연락처', '담임교사연락처']
    downloadExcelOrCsv(filename, [{
      sheetName: sheetTitle,
      headers: protHeaders,
      rows: protectedRows
    }])
  } catch (err) {
    console.error('요보호 엑셀 추출 실패:', err)
  }
}

// 엑셀 내보내기 버튼 이벤트 연결
const btnExportAll = document.getElementById('btn-export-all-excel')
if (btnExportAll) btnExportAll.addEventListener('click', exportAllData)

const btnExportVisits = document.getElementById('btn-export-visits-excel')
if (btnExportVisits) btnExportVisits.addEventListener('click', exportVisitsData)

const btnExportInventory = document.getElementById('btn-export-inventory-excel')
if (btnExportInventory) btnExportInventory.addEventListener('click', exportInventoryData)

const btnExportProtected = document.getElementById('btn-export-protected-excel')
if (btnExportProtected) btnExportProtected.addEventListener('click', exportProtectedData)

// ==========================================
// 📂 7) 방문자 일괄 등록 모듈 (Bulk Register)
// ==========================================

let parsedBulkData = []

function initBulkVisitModule() {
  const modalBulk = document.getElementById('modal-bulk-visit')
  const btnOpenBulk = document.getElementById('btn-open-bulk-visit')
  const btnCloseBulk = document.getElementById('btn-close-bulk-modal')
  const btnCancelBulk = document.getElementById('btn-cancel-bulk')
  const dropZone = document.getElementById('drop-zone-bulk')
  const inputBulkFile = document.getElementById('input-bulk-file')
  const btnSelectFile = document.getElementById('btn-select-file')
  const btnSubmitBulk = document.getElementById('btn-submit-bulk')
  const btnDownloadSample = document.getElementById('btn-download-sample')
  const btnDownloadSampleModal = document.getElementById('btn-download-sample-modal')
  
  if (btnOpenBulk) {
    btnOpenBulk.addEventListener('click', () => {
      parsedBulkData = []
      document.getElementById('bulk-preview-section').classList.add('hidden')
      btnSubmitBulk.disabled = true
      modalBulk.classList.add('active')
    })
  }

  const closeModal = () => modalBulk.classList.remove('active')
  if (btnCloseBulk) btnCloseBulk.addEventListener('click', closeModal)
  if (btnCancelBulk) btnCancelBulk.addEventListener('click', closeModal)

  const downloadSample = () => {
    const sampleHeaders = currentLang === 'jp'
      ? ['学年', '組', '出席番号', '氏名', '主な症状', '処置内容', '備考']
      : ['학년', '반', '번호', '학생명', '주요증상', '처치내용', '비고']
    const sampleRows = currentLang === 'jp'
      ? [
          ['3', '2', '15', '山田太郎', '頭痛およびめまい', 'アセトアミノフェン1錠服用後、20分静養', '特記事項なし'],
          ['1', '5', '8', '佐藤花子', '体育の時間中に膝を擦りむく', '消毒後、絆創膏貼付', '次の授業へ移動']
        ]
      : [
          ['3', '2', '15', '김철수', '두통 및 어지럼증', '타이레놀 1정 복용 후 20분 침상 휴식', '특이사항 없음'],
          ['1', '5', '8', '이영희', '체육시간 무릎 찰과상', '과산화수소 소독 후 밴드 부착', '다음 교시 이동']
        ]
    const sampleFilename = currentLang === 'jp' ? '保健室_来室者_一括登録_サンプル様式' : '보건실_방문자_일괄등록_샘플양식'
    const sampleSheetname = currentLang === 'jp' ? '来室者一括登録' : '방문자일괄등록'
    downloadExcelOrCsv(sampleFilename, [{ sheetName: sampleSheetname, headers: sampleHeaders, rows: sampleRows }])
  }

  if (btnDownloadSample) btnDownloadSample.addEventListener('click', downloadSample)
  if (btnDownloadSampleModal) btnDownloadSampleModal.addEventListener('click', downloadSample)

  if (btnSelectFile && inputBulkFile) {
    btnSelectFile.addEventListener('click', () => inputBulkFile.click())
    inputBulkFile.addEventListener('change', (e) => {
      if (e.target.files.length > 0) handleFile(e.target.files[0])
    })
  }

  if (dropZone) {
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault()
      dropZone.classList.add('drag-over')
    })
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'))
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault()
      dropZone.classList.remove('drag-over')
      if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0])
    })
  }

  function handleFile(file) {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        let rows = []
        if (typeof XLSX !== 'undefined') {
          const data = new Uint8Array(e.target.result)
          const workbook = XLSX.read(data, { type: 'array' })
          const sheetName = workbook.SheetNames[0]
          const sheet = workbook.Sheets[sheetName]
          rows = XLSX.utils.sheet_to_json(sheet, { header: 1 })
        } else {
          const text = new TextDecoder('utf-8').decode(e.target.result)
          rows = text.split('\n').map(line => line.split(',').map(cell => cell.trim().replace(/^"|"$/g, '')))
        }

        if (rows.length < 2) {
          alert(i18nDict[currentLang].alertInvalidFile)
          return
        }

        parsedBulkData = []
        for (let i = 1; i < rows.length; i++) {
          const r = rows[i]
          if (!r || r.length === 0 || !r[3]) continue
          parsedBulkData.push({
            grade: String(r[0] || '1'),
            classRoom: String(r[1] || '1'),
            numberCode: String(r[2] || '1'),
            name: String(r[3] || ''),
            symptoms: String(r[4] || '상담 방문'),
            treatment: String(r[5] || '안정 조치'),
            remarks: String(r[6] || '')
          })
        }

        renderBulkPreview()
      } catch (err) {
        console.error('일괄등록 파일 읽기 에러:', err)
        alert(i18nDict[currentLang].alertFileReadError)
      }
    }
    reader.readAsArrayBuffer(file)
  }

  function renderBulkPreview() {
    const section = document.getElementById('bulk-preview-section')
    const countEl = document.getElementById('bulk-preview-count')
    const tbody = document.getElementById('bulk-preview-table-body')

    section.classList.remove('hidden')
    countEl.textContent = currentLang === 'jp' ? `(計 ${parsedBulkData.length}件)` : `(총 ${parsedBulkData.length}건)`
    tbody.innerHTML = ''

    parsedBulkData.forEach((item, index) => {
      const tr = document.createElement('tr')
      tr.innerHTML = `
        <td>${index + 1}</td>
        <td>${item.grade}</td>
        <td>${item.classRoom}</td>
        <td>${item.numberCode}</td>
        <td class="font-bold">${item.name}</td>
        <td>${item.symptoms}</td>
        <td>${item.treatment}</td>
        <td>${item.remarks || '-'}</td>
      `
      tbody.appendChild(tr)
    })

    btnSubmitBulk.disabled = parsedBulkData.length === 0
  }

  if (btnSubmitBulk) {
    btnSubmitBulk.addEventListener('click', async () => {
      if (parsedBulkData.length === 0) return
      
      btnSubmitBulk.disabled = true
      btnSubmitBulk.textContent = currentLang === 'jp' ? '一括登録進行中...' : '일괄 등록 진행 중...'

      try {
        let count = 0
        for (const item of parsedBulkData) {
          const encGrade = await encrypt(item.grade)
          const encClass = await encrypt(item.classRoom)
          const encNumber = await encrypt(item.numberCode)
          const encName = await encrypt(item.name)
          const encSymptoms = await encrypt(item.symptoms)
          const encTreatment = await encrypt(item.treatment)
          const encRemarks = await encrypt(item.remarks)

          const sql = `
            INSERT INTO visits (grade, class_room, number_code, student_name, symptoms, treatment, remarks)
            VALUES (?, ?, ?, ?, ?, ?, ?);
          `
          await window.api.db.query(sql, [encGrade, encClass, encNumber, encName, encSymptoms, encTreatment, encRemarks])
          count++
        }

        alert(i18nDict[currentLang].alertBulkSaved.replace('{count}', count))
        closeModal()
        await loadVisits()
        await loadDashboardData()
      } catch (err) {
        console.error('일괄 등록 실패:', err)
        alert(i18nDict[currentLang].alertBulkSaveFailed)
      } finally {
        btnSubmitBulk.textContent = i18nDict[currentLang].btnRunBulk
      }
    })
  }
}

// ==========================================
// 🖨️ 8) 서식 인쇄 미리보기 및 출력 모듈 (Print)
// ==========================================

async function openPrintModal(type) {
  const modal = document.getElementById('modal-print-view')
  const docTitle = document.getElementById('print-doc-title')
  const dateInfo = document.getElementById('print-date-info')
  const countInfo = document.getElementById('print-count-info')
  const tableHead = document.getElementById('print-table-head')
  const tableBody = document.getElementById('print-table-body')

  const now = new Date()
  const todayStr = `${now.getFullYear()}년 ${(now.getMonth()+1).toString().padStart(2, '0')}월 ${now.getDate().toString().padStart(2, '0')}일`
  if (dateInfo) dateInfo.textContent = `출력 일자: ${todayStr}`

  if (type === 'visits') {
    if (docTitle) docTitle.textContent = '보건실 방문자 일지'
    if (tableHead) {
      tableHead.innerHTML = `
        <tr>
          <th style="width:14%">방문 일시</th>
          <th style="width:14%">학년/반/번호</th>
          <th style="width:12%">학생명</th>
          <th style="width:28%">주요 증상</th>
          <th style="width:32%">처치 내용</th>
        </tr>
      `
    }
    const rawVisits = await window.api.db.query('SELECT * FROM visits ORDER BY visited_at DESC;')
    if (tableBody) tableBody.innerHTML = ''
    if (countInfo) countInfo.textContent = `총 ${rawVisits.length}건`

    for (const row of rawVisits) {
      const decGrade = await decrypt(row.grade)
      const decClass = await decrypt(row.class_room)
      const decNumber = await decrypt(row.number_code)
      const decName = await decrypt(row.student_name)
      const decSymptoms = await decrypt(row.symptoms)
      const decTreatment = await decrypt(row.treatment)

      const tr = document.createElement('tr')
      tr.innerHTML = `
        <td style="text-align:center">${row.visited_at}</td>
        <td style="text-align:center">${decGrade}학년 ${decClass}반 ${decNumber}번</td>
        <td style="text-align:center; font-weight:bold">${decName}</td>
        <td>${decSymptoms}</td>
        <td>${decTreatment}</td>
      `
      if (tableBody) tableBody.appendChild(tr)
    }
  } else if (type === 'inventory') {
    if (docTitle) docTitle.textContent = '의약품 및 보건물품 관리대장'
    if (tableHead) {
      tableHead.innerHTML = `
        <tr>
          <th style="width:12%">카테고리</th>
          <th style="width:24%">품목명</th>
          <th style="width:12%">현재 재고량</th>
          <th style="width:18%">보관 위치</th>
          <th style="width:16%">유통기한</th>
          <th style="width:18%">비고 / 특이사항</th>
        </tr>
      `
    }
    const items = await window.api.db.query('SELECT * FROM inventories ORDER BY category ASC, item_name ASC;')
    if (tableBody) tableBody.innerHTML = ''
    if (countInfo) countInfo.textContent = `총 ${items.length}종`

    for (const item of items) {
      const tr = document.createElement('tr')
      tr.innerHTML = `
        <td style="text-align:center">${item.category}</td>
        <td style="font-weight:bold">${item.item_name}</td>
        <td style="text-align:center">${item.quantity} ${item.unit}</td>
        <td style="text-align:center">${item.location || '-'}</td>
        <td style="text-align:center">${item.expiration_date}</td>
        <td>${item.remarks || '-'}</td>
      `
      if (tableBody) tableBody.appendChild(tr)
    }
  }

  if (modal) modal.classList.add('active')
}

// 인쇄 버튼 이벤트 연결
const btnPrintVisits = document.getElementById('btn-print-visits')
if (btnPrintVisits) btnPrintVisits.addEventListener('click', () => openPrintModal('visits'))

const btnPrintInventory = document.getElementById('btn-print-inventory')
if (btnPrintInventory) btnPrintInventory.addEventListener('click', () => openPrintModal('inventory'))

const modalPrint = document.getElementById('modal-print-view')
const btnClosePrintModal = document.getElementById('btn-close-print-modal')
const btnClosePrintModalFooter = document.getElementById('btn-close-print-modal-footer')
const btnDoPrint = document.getElementById('btn-do-print')
const btnDoPrintFooter = document.getElementById('btn-do-print-footer')

const closePrint = () => modalPrint && modalPrint.classList.remove('active')
if (btnClosePrintModal) btnClosePrintModal.addEventListener('click', closePrint)
if (btnClosePrintModalFooter) btnClosePrintModalFooter.addEventListener('click', closePrint)

const triggerPrint = () => {
  window.print()
}
if (btnDoPrint) btnDoPrint.addEventListener('click', triggerPrint)
if (btnDoPrintFooter) btnDoPrintFooter.addEventListener('click', triggerPrint)
let cachedStudents = []

async function loadStudents() {
  const tableBody = document.getElementById('table-students-body')
  const dataList = document.getElementById('datalist-students')
  if (!tableBody) return

  try {
    const rawStudents = await window.api.db.query('SELECT * FROM students ORDER BY grade ASC, class_room ASC, CAST(number_code AS INT) ASC;')
    tableBody.innerHTML = ''
    if (dataList) dataList.innerHTML = ''
    cachedStudents = []

    if (rawStudents.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">${i18nDict[currentLang].emptyStudents}</td></tr>`
      return
    }

    for (const student of rawStudents) {
      const decGrade = await decrypt(student.grade)
      const decClass = await decrypt(student.class_room)
      const decNumber = await decrypt(student.number_code)
      const decName = await decrypt(student.student_name)
      const decGender = await decrypt(student.gender || '')
      const decRemarks = await decrypt(student.remarks || '')

      cachedStudents.push({
        id: student.id,
        grade: decGrade,
        class_room: decClass,
        number_code: decNumber,
        name: decName,
        gender: decGender,
        remarks: decRemarks
      })

      // Datalist 옵션 추가
      if (dataList) {
        const option = document.createElement('option')
        option.value = decName
        option.label = formatStudentInfoWithName(decGrade, decClass, decNumber, decName)
        dataList.appendChild(option)
      }

      // 과거 방문 횟수 집계
      const tr = document.createElement('tr')
      const decGenderTranslated = decGender === '남' 
        ? i18nDict[currentLang].genderMale 
        : (decGender === '여' ? i18nDict[currentLang].genderFemale : (decGender || '-'))

      tr.innerHTML = `
        <td>${formatStudentInfo(decGrade, decClass, decNumber)}</td>
        <td style="font-weight: bold; color: var(--primary-color);">${decName}</td>
        <td>${decGenderTranslated}</td>
        <td class="text-center"><span class="badge-category">${i18nDict[currentLang].inquiryAvailable || '이력조회 가능'}</span></td>
        <td>${decRemarks || '-'}</td>
        <td>
          <button class="sm-action-btn btn-delete-student" data-id="${student.id}" title="삭제">🗑️</button>
        </td>
      `
      tableBody.appendChild(tr)
    }

    // 개별 학생 삭제 이벤트
    document.querySelectorAll('.btn-delete-student').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.dataset.id
        if (confirm(i18nDict[currentLang].confirmDeleteStudent)) {
          await window.api.db.query('DELETE FROM students WHERE id = ?;', [id])
          await loadStudents()
        }
      })
    })

  } catch (error) {
    console.error('전교생 명단 로드 에러:', error)
  }
}

// 실시간 학생 이름 입력 시 과거 방문 이력 팝업 카드 출력
async function checkStudentPastHistory(nameQuery) {
  const card = document.getElementById('student-past-history-card')
  const infoText = document.getElementById('history-student-info')
  const summaryText = document.getElementById('history-summary-text')
  const protectedTag = document.getElementById('history-protected-tag')
  const gradeInput = document.getElementById('visit-grade')
  const classInput = document.getElementById('visit-class')
  const numberInput = document.getElementById('visit-number')
  const genderSelect = document.getElementById('visit-gender')

  if (!card || !nameQuery || nameQuery.trim().length < 2) {
    if (card) card.classList.add('hidden')
    return
  }

  // cachedStudents에서 일치하는 학생 찾기
  const matchedStudent = cachedStudents.find(s => s.name === nameQuery.trim())
  if (matchedStudent) {
    if (gradeInput && !gradeInput.value) gradeInput.value = matchedStudent.grade
    if (classInput && !classInput.value) classInput.value = matchedStudent.class_room
    if (numberInput && !numberInput.value) numberInput.value = matchedStudent.number_code
    if (genderSelect && matchedStudent.gender) genderSelect.value = matchedStudent.gender
  }

  // DB에서 이 학생의 과거 방문 기록 탐색
  const rawVisits = await window.api.db.query('SELECT * FROM visits ORDER BY visited_at DESC;')
  let matchCount = 0
  let lastSymptoms = '-'

  for (const visit of rawVisits) {
    const decName = await decrypt(visit.student_name)
    if (decName === nameQuery.trim()) {
      matchCount++
      if (lastSymptoms === '-') {
        lastSymptoms = await decrypt(visit.symptoms)
      }
    }
  }

  // 요보호 대상자 탐색
  const rawProtected = await window.api.db.query('SELECT * FROM protected_students;')
  let isProtected = false
  for (const prot of rawProtected) {
    const decName = await decrypt(prot.student_name)
    if (decName === nameQuery.trim()) {
      isProtected = true
      break
    }
  }

  if (matchCount > 0 || isProtected || matchedStudent) {
    card.classList.remove('hidden')
    infoText.textContent = matchedStudent 
      ? formatStudentInfoWithName(matchedStudent.grade, matchedStudent.class_room, matchedStudent.number_code, matchedStudent.name)
      : (currentLang === 'jp' ? `${nameQuery} 生徒` : `${nameQuery} 학생`)
    summaryText.textContent = currentLang === 'jp'
      ? `過去計 ${matchCount}回来室 | 最近の主な症状: ${lastSymptoms}`
      : `과거 총 ${matchCount}회 방문 | 최근 주증상: ${lastSymptoms}`
    if (isProtected) {
      protectedTag.classList.remove('hidden')
    } else {
      protectedTag.classList.add('hidden')
    }
  } else {
    card.classList.add('hidden')
  }
}

// 나이스 모듈 이벤트 바인딩
function initNeisModule() {
  const modal = document.getElementById('modal-neis-student')
  const btnOpen = document.getElementById('btn-open-neis-modal')
  const btnClose = document.getElementById('btn-close-neis-modal')
  const btnCancel = document.getElementById('btn-cancel-neis')
  const dropZone = document.getElementById('drop-zone-neis')
  const fileInput = document.getElementById('input-neis-file')
  const btnSelect = document.getElementById('btn-select-neis-file')
  const btnSubmit = document.getElementById('btn-submit-neis')
  const previewSection = document.getElementById('neis-preview-section')
  const previewCount = document.getElementById('neis-preview-count')
  const previewBody = document.getElementById('neis-preview-table-body')
  const btnClearAll = document.getElementById('btn-clear-students')

  let parsedData = []

  const openModal = () => modal && modal.classList.add('active')
  const closeModal = () => {
    if (modal) modal.classList.remove('active')
    parsedData = []
    if (previewSection) previewSection.classList.add('hidden')
    if (btnSubmit) btnSubmit.disabled = true
  }

  if (btnOpen) btnOpen.addEventListener('click', openModal)
  if (btnClose) btnClose.addEventListener('click', closeModal)
  if (btnCancel) btnCancel.addEventListener('click', closeModal)

  if (btnSelect) btnSelect.addEventListener('click', () => fileInput && fileInput.click())

  if (btnClearAll) {
    btnClearAll.addEventListener('click', async () => {
      if (confirm(i18nDict[currentLang].confirmClearStudents)) {
        await window.api.db.query('DELETE FROM students;')
        await loadStudents()
      }
    })
  }

  const handleFile = (file) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target.result)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const sheet = workbook.Sheets[sheetName]
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' })

        const gradeKey = currentLang === 'jp' ? '学年' : '학년'
        const classKey = currentLang === 'jp' ? '組' : '반'
        const numberKey = currentLang === 'jp' ? '出席番号' : '번호'
        const nameKey = currentLang === 'jp' ? '氏名' : '성명'
        const nameKeyAlt = currentLang === 'jp' ? '名前' : '학생명'
        const genderKey = currentLang === 'jp' ? '性別' : '성별'
        const remarkKey = currentLang === 'jp' ? '備考' : '비고'
        const remarkKeyAlt = currentLang === 'jp' ? '特記事項' : '특이사항'

        parsedData = rows.map((row) => ({
          grade: String(row[gradeKey] || row['Grade'] || '1').trim(),
          class_room: String(row[classKey] || row['Class'] || '1').trim(),
          number_code: String(row[numberKey] || row['Number'] || '1').trim(),
          student_name: String(row[nameKey] || row[nameKeyAlt] || row['Name'] || '').trim(),
          gender: String(row[genderKey] || row['Gender'] || '').trim(),
          remarks: String(row[remarkKey] || row[remarkKeyAlt] || '').trim()
        })).filter(item => item.student_name.length > 0)

        if (parsedData.length === 0) {
          alert(i18nDict[currentLang].alertNeisInvalid)
          return
        }

        previewCount.textContent = currentLang === 'jp' ? `(計 ${parsedData.length}名)` : `(총 ${parsedData.length}명)`
        previewBody.innerHTML = parsedData.slice(0, 50).map((item, idx) => `
          <tr>
            <td>${idx + 1}</td>
            <td>${item.grade}</td>
            <td>${item.class_room}</td>
            <td>${item.number_code}</td>
            <td style="font-weight:bold">${item.student_name}</td>
            <td>${item.gender}</td>
            <td>${item.remarks || '-'}</td>
          </tr>
        `).join('')

        previewSection.classList.remove('hidden')
        btnSubmit.disabled = false

      } catch (err) {
        console.error('나이스 엑셀 파싱 오류:', err)
        alert(i18nDict[currentLang].alertExcelReadFailed)
      }
    }
    reader.readAsArrayBuffer(file)
  }

  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) handleFile(e.target.files[0])
    })
  }

  if (dropZone) {
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-over') })
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'))
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault()
      dropZone.classList.remove('drag-over')
      if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0])
    })
  }

  if (btnSubmit) {
    btnSubmit.addEventListener('click', async () => {
      if (parsedData.length === 0) return
      btnSubmit.disabled = true
      btnSubmit.textContent = currentLang === 'jp' ? '暗号化保存中...' : '암호화 저장 중...'

      try {
        for (const item of parsedData) {
          const encGrade = await encrypt(item.grade)
          const encClass = await encrypt(item.class_room)
          const encNumber = await encrypt(item.number_code)
          const encName = await encrypt(item.student_name)
          const encGender = await encrypt(item.gender)
          const encRemarks = await encrypt(item.remarks)

          await window.api.db.query(
            'INSERT INTO students (grade, class_room, number_code, student_name, gender, remarks) VALUES (?, ?, ?, ?, ?, ?);',
            [encGrade, encClass, encNumber, encName, encGender, encRemarks]
          )
        }
        alert(i18nDict[currentLang].alertNeisBulkSaved.replace('{count}', parsedData.length))
        closeModal()
        await loadStudents()
      } catch (err) {
        console.error('저장 에러:', err)
        alert(i18nDict[currentLang].alertNeisSaveFailed)
      } finally {
        btnSubmit.textContent = i18nDict[currentLang].btnSaveAllStudents
      }
    })
  }
}

// ----------------------------------------------------
// 🌟 신규 모듈 2: K-에듀파인 품의서 엑셀 일괄 등록
// ----------------------------------------------------
function initEdufineModule() {
  const modal = document.getElementById('modal-edufine-inventory')
  const btnOpen = document.getElementById('btn-open-edufine-modal')
  const btnClose = document.getElementById('btn-close-edufine-modal')
  const btnCancel = document.getElementById('btn-cancel-edufine')
  const dropZone = document.getElementById('drop-zone-edufine')
  const fileInput = document.getElementById('input-edufine-file')
  const btnSelect = document.getElementById('btn-select-edufine-file')
  const btnSubmit = document.getElementById('btn-submit-edufine')
  const previewSection = document.getElementById('edufine-preview-section')
  const previewCount = document.getElementById('edufine-preview-count')
  const previewBody = document.getElementById('edufine-preview-table-body')

  let parsedItems = []

  const openModal = () => modal && modal.classList.add('active')
  const closeModal = () => {
    if (modal) modal.classList.remove('active')
    parsedItems = []
    if (previewSection) previewSection.classList.add('hidden')
    if (btnSubmit) btnSubmit.disabled = true
  }

  if (btnOpen) btnOpen.addEventListener('click', openModal)
  if (btnClose) btnClose.addEventListener('click', closeModal)
  if (btnCancel) btnCancel.addEventListener('click', closeModal)
  if (btnSelect) btnSelect.addEventListener('click', () => fileInput && fileInput.click())

  const handleFile = (file) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheet = workbook.Sheets[workbook.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' })

        const catKey = currentLang === 'jp' ? 'カテゴリ' : (currentLang === 'jp' ? '分類' : '분류')
        const nameKey = currentLang === 'jp' ? '品目名' : (currentLang === 'jp' ? '物品名' : '품목명')
        const qtyKey = currentLang === 'jp' ? '数量' : (currentLang === 'jp' ? '入庫量' : '수량')
        const unitKey = currentLang === 'jp' ? '単位' : '단위'
        const expKey = currentLang === 'jp' ? '使用期限' : (currentLang === 'jp' ? '有効期限' : '유통기한')
        const locKey = currentLang === 'jp' ? '保管場所' : (currentLang === 'jp' ? '位置' : '보관위치')
        const remKey = currentLang === 'jp' ? '備考' : '비고'

        parsedItems = rows.map((row) => ({
          category: String(row[catKey] || row['카테고리'] || row['구분'] || row['분류'] || (currentLang === 'jp' ? '一般医薬品' : '일반의약품')).trim(),
          item_name: String(row[nameKey] || row['물품명'] || row['품명'] || row['Item'] || '').trim(),
          quantity: parseInt(row[qtyKey] || row['입고량'] || row['Qty'] || '1', 10),
          unit: String(row[unitKey] || row['Unit'] || (currentLang === 'jp' ? '個' : '개')).trim(),
          expiration_date: String(row[expKey] || row['만료일'] || row['ExpDate'] || '2026-12-31').trim(),
          location: String(row[locKey] || row['위치'] || (currentLang === 'jp' ? '中央薬庫' : '중앙 약장')).trim(),
          remarks: String(row[remKey] || row['품의서번호'] || (currentLang === 'jp' ? '調達システム登録' : 'K-에듀파인 품의 등록')).trim()
        })).filter(item => item.item_name.length > 0)

        if (parsedItems.length === 0) {
          alert(i18nDict[currentLang].alertEdufineInvalid)
          return
        }

        previewCount.textContent = currentLang === 'jp' ? `(計 ${parsedItems.length}件)` : `(총 ${parsedItems.length}건)`
        previewBody.innerHTML = parsedItems.map((item, idx) => `
          <tr>
            <td>${idx + 1}</td>
            <td>${item.category}</td>
            <td style="font-weight:bold">${item.item_name}</td>
            <td>${item.quantity}</td>
            <td>${item.unit}</td>
            <td>${item.expiration_date}</td>
            <td>${item.location}</td>
          </tr>
        `).join('')

        previewSection.classList.remove('hidden')
        btnSubmit.disabled = false

      } catch (err) {
        console.error('에듀파인 엑셀 파싱 실패:', err)
        alert(i18nDict[currentLang].alertEdufineReadFailed)
      }
    }
    reader.readAsArrayBuffer(file)
  }

  if (fileInput) fileInput.addEventListener('change', (e) => e.target.files.length > 0 && handleFile(e.target.files[0]))
  if (dropZone) {
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-over') })
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'))
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault()
      dropZone.classList.remove('drag-over')
      if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0])
    })
  }

  if (btnSubmit) {
    btnSubmit.addEventListener('click', async () => {
      if (parsedItems.length === 0) return
      btnSubmit.disabled = true
      btnSubmit.textContent = currentLang === 'jp' ? '登録中...' : '등록 중...'

      try {
        for (const item of parsedItems) {
          await window.api.db.query(
            'INSERT INTO inventories (category, item_name, quantity, unit, expiration_date, location, remarks) VALUES (?, ?, ?, ?, ?, ?, ?);',
            [item.category, item.item_name, item.quantity, item.unit, item.expiration_date, item.location, item.remarks]
          )
        }
        alert(i18nDict[currentLang].alertEdufineBulkSaved.replace('{count}', parsedItems.length))
        closeModal()
        await loadInventory()
      } catch (err) {
        console.error('에듀파인 저장 에러:', err)
        alert(i18nDict[currentLang].alertEdufineSaveFailed)
      } finally {
        btnSubmit.textContent = i18nDict[currentLang].btnRunEdufine
      }
    })
  }
}

// ----------------------------------------------------
// 🌟 신규 모듈 3: 신체 부위 인터랙티브 구조도 & 간편 칩
// ----------------------------------------------------
function initBodyMapModule() {
  const modal = document.getElementById('modal-body-map')
  const btnOpen = document.getElementById('btn-open-body-map')
  const btnClose = document.getElementById('btn-close-body-map')
  const btnReset = document.getElementById('btn-reset-body-map')
  const btnApply = document.getElementById('btn-apply-body-map')
  const displayTags = document.getElementById('selected-part-tags')
  const inputSite = document.getElementById('visit-injury-site')

  // 손/발 세부 부위 서브패널 요소
  const subPanel = document.getElementById('sub-part-panel')
  const subPanelTitle = document.getElementById('sub-part-panel-title')
  const subPanelChipRow = document.getElementById('sub-part-chip-row')
  const subPanelImg = document.getElementById('sub-part-panel-img')
  const btnCloseSubPanel = document.getElementById('btn-close-sub-panel')

  // 신체 부위 모달 진입 시, 첨부된 실제 골격계 참고표(정면도 크롭)를 대화형 구조도 옆에 표시
  const bodyRefFrontViewEl = document.getElementById('body-reference-frontview')
  if (bodyRefFrontViewEl) bodyRefFrontViewEl.src = bodyRefFrontView

  // 전체 골격표 원본 크게 보기(라이트박스)
  const modalFullChart = document.getElementById('modal-full-chart')
  const btnViewFullChart = document.getElementById('btn-view-full-chart')
  const btnCloseFullChart = document.getElementById('btn-close-full-chart')
  const fullChartImg = document.getElementById('full-chart-img')
  if (btnViewFullChart) {
    btnViewFullChart.addEventListener('click', () => {
      if (fullChartImg) fullChartImg.src = bodyRefFullChart
      if (modalFullChart) modalFullChart.classList.add('active')
    })
  }
  if (btnCloseFullChart) {
    btnCloseFullChart.addEventListener('click', () => modalFullChart && modalFullChart.classList.remove('active'))
  }
  if (modalFullChart) {
    modalFullChart.addEventListener('click', (e) => {
      if (e.target === modalFullChart) modalFullChart.classList.remove('active')
    })
  }

  // 손/발 세부 부위 정의 (하위 상세 메뉴) - 실제 골격계 참고표에서 발췌한 부위별 상세 이미지 포함
  const subGroupDefsAll = {
    ko: {
      'hand-l': { label: '손(좌)', image: bodyRefHandLeft, parts: ['손목(좌)', '손등(좌)', '손바닥(좌)', '엄지손가락(좌)', '검지손가락(좌)', '중지손가락(좌)', '약지손가락(좌)', '소지손가락(좌)'] },
      'hand-r': { label: '손(우)', image: bodyRefHandRight, parts: ['손목(우)', '손등(우)', '손바닥(우)', '엄지손가락(우)', '검지손가락(우)', '중지손가락(우)', '약지손가락(우)', '소지손가락(우)'] },
      'foot-l': { label: '족부(좌)', image: bodyRefFootLeft, parts: ['발목(좌)', '발등(좌)', '발바닥(좌)', '발뒤꿈치(좌)', '엄지발가락(좌)', '검지발가락(좌)', '중지발가락(좌)', '약지발가락(좌)', '소지발가락(좌)'] },
      'foot-r': { label: '족부(우)', image: bodyRefFootRight, parts: ['발목(우)', '발등(우)', '발바닥(우)', '발뒤꿈치(우)', '엄지발가락(우)', '검지발가락(우)', '중지발가락(우)', '약지발가락(우)', '소지발가락(우)'] }
    },
    jp: {
      'hand-l': { label: '手(左)', image: bodyRefHandLeft, parts: ['手首(左)', '手の甲(左)', '手のひら(左)', '親指(左)', '人差し指(左)', '中指(左)', '薬指(左)', '小指(左)'] },
      'hand-r': { label: '手(右)', image: bodyRefHandRight, parts: ['手首(右)', '手の甲(右)', '手のひら(右)', '親指(右)', '人差し指(右)', '中指(右)', '薬指(右)', '小指(右)'] },
      'foot-l': { label: '足部(左)', image: bodyRefFootLeft, parts: ['足首(左)', '足の甲(左)', '足の裏(左)', 'かかと(左)', '足の親指(左)', '足の人差し指(左)', '足の中指(左)', '足の薬指(左)', '足の小指(左)'] },
      'foot-r': { label: '足部(右)', image: bodyRefFootRight, parts: ['足首(右)', '足の甲(右)', '足の裏(右)', 'かかと(右)', '足의親指(右)', '足の人差し指(右)', '足の中指(右)', '足の薬指(右)', '足の小指(右)'] }
    }
  }

  let selectedParts = new Set()
  let activeSubGroup = null

  const updateDisplay = () => {
    const lang = localStorage.getItem('lang') || 'ko'
    if (selectedParts.size === 0) {
      displayTags.textContent = bodyPartDict[lang].noPartsSelected
    } else {
      displayTags.textContent = Array.from(selectedParts).join(', ')
    }
  }

  // 특정 서브그룹(손/발)에 세부 부위가 하나라도 선택되어 있으면 상위 버튼도 강조 표시
  const syncSubGroupButtonState = (groupKey) => {
    const lang = localStorage.getItem('lang') || 'ko'
    const subDefs = subGroupDefsAll[lang] || subGroupDefsAll['ko']
    const groupBtn = document.querySelector(`.map-point[data-subgroup="${groupKey}"]`)
    if (!groupBtn) return
    const def = subDefs[groupKey]
    if (!def) return
    const hasAny = def.parts.some(p => selectedParts.has(p))
    groupBtn.classList.toggle('selected', hasAny)
  }

  const closeSubPanel = () => {
    if (subPanel) subPanel.classList.add('hidden')
    activeSubGroup = null
  }

  const openSubPanel = (groupKey) => {
    const lang = localStorage.getItem('lang') || 'ko'
    const subDefs = subGroupDefsAll[lang] || subGroupDefsAll['ko']
    const def = subDefs[groupKey]
    if (!def || !subPanel || !subPanelChipRow) return

    activeSubGroup = groupKey
    subPanelTitle.textContent = `${def.label} ${bodyPartDict[lang].subPanelTitle}`
    if (subPanelImg) subPanelImg.src = def.image
    subPanelChipRow.innerHTML = ''

    def.parts.forEach(part => {
      const chip = document.createElement('button')
      chip.type = 'button'
      chip.className = 'sub-part-chip'
      chip.textContent = part
      if (selectedParts.has(part)) chip.classList.add('active')

      chip.addEventListener('click', () => {
        if (selectedParts.has(part)) {
          selectedParts.delete(part)
          chip.classList.remove('active')
        } else {
          selectedParts.add(part)
          chip.classList.add('active')
        }
        syncSubGroupButtonState(groupKey)
        updateDisplay()
      })

      subPanelChipRow.appendChild(chip)
    })

    subPanel.classList.remove('hidden')
  }

  if (btnOpen) btnOpen.addEventListener('click', () => modal && modal.classList.add('active'))
  if (btnClose) {
    btnClose.addEventListener('click', () => {
      modal && modal.classList.remove('active')
      closeSubPanel()
    })
  }
  if (btnCloseSubPanel) btnCloseSubPanel.addEventListener('click', closeSubPanel)

  // 일반 신체 부위 버튼 (단일 클릭으로 즉시 선택/해제)
  document.querySelectorAll('.map-point[data-part]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const part = e.currentTarget.dataset.part
      if (selectedParts.has(part)) {
        selectedParts.delete(part)
        e.currentTarget.classList.remove('selected')
      } else {
        selectedParts.add(part)
        e.currentTarget.classList.add('selected')
      }
      updateDisplay()
    })
  })

  // 손/발 버튼 (하위 상세 메뉴를 여는 서브그룹 버튼)
  document.querySelectorAll('.map-point[data-subgroup]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const groupKey = e.currentTarget.dataset.subgroup
      if (activeSubGroup === groupKey) {
        closeSubPanel()
      } else {
        openSubPanel(groupKey)
      }
    })
  })

  if (btnReset) {
    btnReset.addEventListener('click', () => {
      selectedParts.clear()
      document.querySelectorAll('.map-point').forEach(b => b.classList.remove('selected'))
      closeSubPanel()
      updateDisplay()
    })
  }

  if (btnApply) {
    btnApply.addEventListener('click', () => {
      if (inputSite) {
        inputSite.value = Array.from(selectedParts).join(', ')
      }
      if (modal) modal.classList.remove('active')
      closeSubPanel()
    })
  }

  // 간편 칩 지원
  document.querySelectorAll('.body-chip').forEach(chip => {
    chip.addEventListener('click', (e) => {
      const site = e.currentTarget.dataset.site
      if (!inputSite) return
      const current = inputSite.value ? inputSite.value.split(',').map(s=>s.trim()) : []
      if (current.includes(site)) {
        const next = current.filter(s => s !== site)
        inputSite.value = next.join(', ')
        e.currentTarget.classList.remove('active')
      } else {
        current.push(site)
        inputSite.value = current.join(', ')
        e.currentTarget.classList.add('active')
      }
    })
  })
}

// ----------------------------------------------------
// 🌟 신규 모듈 4: 활력 징후 및 통증 척도
// ----------------------------------------------------
function initVitalsModule() {
  const painSlider = document.getElementById('visit-pain-scale')
  const painDisplay = document.getElementById('pain-scale-display')
  const visitTime = document.getElementById('visit-time')

  // 처치시간 자동 입력
  if (visitTime && !visitTime.value) {
    const now = new Date()
    visitTime.value = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
  }

  if (painSlider && painDisplay) {
    painSlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10)
      let desc = '무통'
      if (val >= 1 && val <= 3) desc = '경도 통증'
      else if (val >= 4 && val <= 6) desc = '중등도 통증'
      else if (val >= 7 && val <= 9) desc = '극심한 통증'
      else if (val === 10) desc = '최악의 극통'
      painDisplay.textContent = `${val}점 (${desc})`
    })
  }

  // 학생명 입력 시 과거 이력 조회 연동
  const inputName = document.getElementById('visit-name')
  if (inputName) {
    inputName.addEventListener('input', (e) => checkStudentPastHistory(e.target.value))
    inputName.addEventListener('change', (e) => checkStudentPastHistory(e.target.value))
  }
}

// ----------------------------------------------------
// 🌟 신규 모듈 5: 종합 통계 다차원 분석 차트
// ----------------------------------------------------
let chartMonthly = null
let chartGrade = null
let chartGender = null
let chartSymptom = null

async function loadStatistics() {
  if (typeof Chart === 'undefined') return

  try {
    const rawVisits = await window.api.db.query('SELECT * FROM visits;')
    
    // 1. 학년별 집계
    const gradeCounts = currentLang === 'jp'
      ? { '1年': 0, '2年': 0, '3年': 0, '4年': 0, '5年': 0, '6年': 0, 'その他': 0 }
      : { '1학년': 0, '2학년': 0, '3학년': 0, '4학년': 0, '5학년': 0, '6학년': 0, '기타': 0 }
    // 2. 성별 집계
    const genderCounts = currentLang === 'jp'
      ? { '男子': 0, '女子': 0 }
      : { '남학생': 0, '여학생': 0 }
    // 3. 증상별 집계
    const symptomCounts = currentLang === 'jp'
      ? { '頭痛/微熱': 0, '腹痛/消化器': 0, '外傷/擦り傷': 0, '呼吸器/アレルギー': 0, 'その他': 0 }
      : { '두통/미열': 0, '복통/소화기': 0, '외상/찰과상': 0, '호흡기/알레르기': 0, '기타안정': 0 }
    // 4. 월별 추이
    const monthCounts = currentLang === 'jp'
      ? { '3月': 12, '4月': 28, '5月': 45, '6月': 38, '7月': 52, '8月': 18 }
      : { '3월': 12, '4월': 28, '5월': 45, '6월': 38, '7월': 52, '8월': 18 }

    for (const v of rawVisits) {
      const g = await decrypt(v.grade)
      const gKey = g 
        ? `${g}${currentLang === 'jp' ? '年' : '학년'}` 
        : (currentLang === 'jp' ? 'その他' : '기타')
      if (gradeCounts[gKey] !== undefined) gradeCounts[gKey]++
      else gradeCounts[currentLang === 'jp' ? 'その他' : '기타']++

      const gen = await decrypt(v.gender || '')
      if (gen === '남' || gen === '남학생') {
        const k = currentLang === 'jp' ? '男子' : '남학생'
        genderCounts[k]++
      } else if (gen === '여' || gen === '여학생') {
        const k = currentLang === 'jp' ? '女子' : '여학생'
        genderCounts[k]++
      }

      const sym = await decrypt(v.symptoms)
      const symptomKey = (label) => {
        if (currentLang === 'jp') {
          if (label === '두통/미열') return '頭痛/微熱'
          if (label === '복통/소화기') return '腹痛/消化器'
          if (label === '외상/찰과상') return '外傷/擦り傷'
          if (label === '호흡기/알레르기') return '呼吸器/アレルギー'
          return 'その他'
        }
        return label
      }

      if (sym.includes('두통') || sym.includes('열')) symptomCounts[symptomKey('두통/미열')]++
      else if (sym.includes('배') || sym.includes('복통') || sym.includes('체')) symptomCounts[symptomKey('복통/소화기')]++
      else if (sym.includes('상처') || sym.includes('피') || sym.includes('다리') || sym.includes('팔')) symptomCounts[symptomKey('외상/찰과상')]++
      else if (sym.includes('기침') || sym.includes('목')) symptomCounts[symptomKey('호흡기/알레르기')]++
      else symptomCounts[symptomKey('기타안정')]++
    }

    // 1. 월별 차트
    const ctxMonthly = document.getElementById('chart-monthly-trend')
    if (ctxMonthly) {
      if (chartMonthly) chartMonthly.destroy()
      chartMonthly = new Chart(ctxMonthly, {
        type: 'line',
        data: {
          labels: Object.keys(monthCounts),
          datasets: [{
            label: currentLang === 'jp' ? '来室生徒数' : '방문 학생 수',
            data: Object.values(monthCounts),
            borderColor: '#00de5a',
            backgroundColor: 'rgba(0, 222, 90, 0.15)',
            fill: true,
            tension: 0.3
          }]
        },
        options: { responsive: true, maintainAspectRatio: false }
      })
    }

    // 2. 학년별 차트
    const ctxGrade = document.getElementById('chart-grade-dist')
    if (ctxGrade) {
      if (chartGrade) chartGrade.destroy()
      chartGrade = new Chart(ctxGrade, {
        type: 'bar',
        data: {
          labels: Object.keys(gradeCounts),
          datasets: [{
            label: currentLang === 'jp' ? '学年別来室者数' : '학년별 방문자 수',
            data: Object.values(gradeCounts),
            backgroundColor: ['#00de5a', '#107c41', '#d97706', '#d13438', '#0067b8', '#8b5cf6', '#64748b']
          }]
        },
        options: { responsive: true, maintainAspectRatio: false }
      })
    }

    // 3. 성별 차트
    const ctxGender = document.getElementById('chart-gender-dist')
    if (ctxGender) {
      if (chartGender) chartGender.destroy()
      const maleKey = currentLang === 'jp' ? '男子' : '남학생'
      const femaleKey = currentLang === 'jp' ? '女子' : '여학생'
      chartGender = new Chart(ctxGender, {
        type: 'doughnut',
        data: {
          labels: Object.keys(genderCounts),
          datasets: [{
            data: [genderCounts[maleKey] || 0, genderCounts[femaleKey] || 0],
            backgroundColor: ['#00de5a', '#ec4899']
          }]
        },
        options: { responsive: true, maintainAspectRatio: false }
      })
    }

    // 4. 증상별 차트
    const ctxSymptom = document.getElementById('chart-symptom-dist')
    if (ctxSymptom) {
      if (chartSymptom) chartSymptom.destroy()
      chartSymptom = new Chart(ctxSymptom, {
        type: 'pie',
        data: {
          labels: Object.keys(symptomCounts),
          datasets: [{
            data: Object.values(symptomCounts),
            backgroundColor: ['#f59e0b', '#10b981', '#ef4444', '#3b82f6', '#8b5cf6']
          }]
        },
        options: { responsive: true, maintainAspectRatio: false }
      })
    }

  } catch (err) {
    console.error('통계 로드 에러:', err)
  }
}

// ----------------------------------------------------
// 🌟 신규 모듈 6: 2인 교사 DB 백업 & 안내
// ----------------------------------------------------
function initDbBackupModule() {
  const modal = document.getElementById('modal-db-share')
  const btnOpen = document.getElementById('btn-open-db-share')
  const btnClose = document.getElementById('btn-close-db-share')
  const btnConfirm = document.getElementById('btn-confirm-db-share')
  const btnBackupAction = document.getElementById('btn-backup-db-action')

  if (btnOpen) btnOpen.addEventListener('click', () => modal && modal.classList.add('active'))
  if (btnClose) btnClose.addEventListener('click', () => modal && modal.classList.remove('active'))
  if (btnConfirm) btnConfirm.addEventListener('click', () => modal && modal.classList.remove('active'))

  if (btnBackupAction) {
    btnBackupAction.addEventListener('click', async () => {
      try {
        await exportAllData()
        alert(i18nDict[currentLang].alertDbBackupSuccess)
      } catch (e) {
        alert(i18nDict[currentLang].alertDbBackupFailed)
      }
    })
  }
}

// ----------------------------------------------------
// 🚀 [App 구동 첫 시점 및 탭 전환]
// ----------------------------------------------------
document.addEventListener('DOMContentLoaded', async () => {
  // 테마 초기화
  initTheme()

  // 오늘 날짜 기입
  updateTodayDate()

  // 일괄 등록 모듈 초기화
  initBulkVisitModule()
  initNeisModule()
  initEdufineModule()
  initBodyMapModule()
  initVitalsModule()
  initDbBackupModule()
  
  // 전교생 로드
  await loadStudents()

  // 첫 화면(대시보드) 데이터 로드 (내부에서 차트도 함께 그림)
  await loadDashboardData()
})

// 탭 버튼 클릭 이벤트 재정의 (전교생 및 통계 탭 포함)
document.querySelectorAll('.menu-item').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const tabName = e.currentTarget.dataset.tab
    
    document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'))
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'))

    e.currentTarget.classList.add('active')
    const targetPane = document.getElementById(`tab-${tabName}`)
    if (targetPane) targetPane.classList.add('active')

    // 탭 타이틀 변경
    const titleEl = document.getElementById('current-page-title')
    if (titleEl) {
      if (tabName === 'dashboard') titleEl.textContent = i18nDict[currentLang].dashboard
      else if (tabName === 'visits') titleEl.textContent = i18nDict[currentLang].visits
      else if (tabName === 'inventory') titleEl.textContent = i18nDict[currentLang].inventory
      else if (tabName === 'protected') titleEl.textContent = i18nDict[currentLang].protected
      else if (tabName === 'students') { titleEl.textContent = i18nDict[currentLang].students; loadStudents() }
      else if (tabName === 'statistics') { titleEl.textContent = i18nDict[currentLang].statistics; loadStatistics() }
    }
  })
})


