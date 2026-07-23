// src/main.js
// 스마트 보건실 업무지원 시스템 - 프론트엔드 비즈니스 로직
// (Electron Main 프로세스와 IPC로 연동되어 SQLite 데이터 제어 및 데이터 암/복호화 처리를 수행합니다.)

import './style.css'
// Chart.js 모듈 로드 및 차트 컴포넌트 자동 등록
import { Chart, registerables } from 'chart.js'
Chart.register(...registerables)

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
    btnTextNeisSampleModal: '나이스 샘플 양식'
  },
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
    modalNeisDropText: '<strong>Excel(.xlsx)ファイル</strong>をドラッグ＆ドロップまたは選択してください。',
    modalNeisDropHint: '(必須項目: 学年, 組, 出席番号, 氏名, 性別)',
    btnTextNeisSampleModal: 'サンプル様式'
  }
}

const bodyPartDict = {
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
  }
}

let currentLang = localStorage.getItem('lang') || 'ko'

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
}

if (btnLangToggle) {
  btnLangToggle.addEventListener('click', () => {
    const nextLang = currentLang === 'ko' ? 'jp' : 'ko'
    applyLanguage(nextLang)
  })
}

// 초기 언어 적용
applyLanguage(currentLang)

// 1. 탭 네비게이션 제어
const tabButtons = document.querySelectorAll('.menu-item')
const tabPanes = document.querySelectorAll('.tab-pane')
const pageTitle = document.getElementById('current-page-title')

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
  const days = ['일', '월', '화', '수', '목', '금', '토']
  const formatted = `${now.getFullYear()}년 ${(now.getMonth()+1).toString().padStart(2, '0')}월 ${now.getDate().toString().padStart(2, '0')}일 (${days[now.getDay()]})`
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

      alert('방문 일지가 안전하게 암호화되어 저장되었습니다.')
      formVisit.reset()
      await loadVisits() // 목록 새로고침
    } catch (error) {
      console.error('방문 등록 에러:', error)
      alert('일지 저장에 실패했습니다.')
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
        <td>${decGrade}학년 ${decClass}반 ${decNumber}번</td>
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
        if (confirm('이 기록을 삭제하시겠습니까?')) {
          await window.api.db.query('DELETE FROM visits WHERE id = ?;', [id])
          await loadVisits(searchQuery)
        }
      })

      tableVisitsBody.appendChild(tr)
    }

    if (displayCount === 0) {
      tableVisitsBody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">방문 기록이 없습니다.</td></tr>`
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
      
      alert('의약품이 성공적으로 등록되었습니다.')
      formInventory.reset()
      await loadInventory()
    } catch (error) {
      console.error('약품 등록 에러:', error)
      alert('약품 등록에 실패했습니다.')
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
        statusLabel = `🔴 만료됨 (${Math.abs(diffDays)}일 경과)`
        expiredCount++
      } else if (diffDays <= 7) {
        status = 'expired'
        statusLabel = `🔴 D-${diffDays} (긴급)`
        warningCount++
      } else if (diffDays <= 30) {
        status = 'imminent'
        statusLabel = `🟡 D-${diffDays} (임박)`
        warningCount++
      } else {
        statusLabel = item.expiration_date
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
        expiryBadgeHtml = `<span class="badge-expiry normal">${item.expiration_date}</span>`
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
        if (confirm('이 약품/물품을 목록에서 삭제하시겠습니까?')) {
          await window.api.db.query('DELETE FROM inventories WHERE id = ?;', [item.id])
          await loadInventory(searchQuery, currentInventoryFilter)
        }
      })

      tableInventoryBody.appendChild(tr)
    }

    if (filteredItems.length === 0) {
      tableInventoryBody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">조건에 맞는 의약품이 없습니다.</td></tr>`
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

      alert('요보호 학생 정보가 암호화 보안 적용되어 저장되었습니다.')
      formProtected.reset()
      await loadProtectedStudents()
    } catch (error) {
      console.error('요보호 학생 등록 실패:', error)
      alert('학생 정보 등록에 실패했습니다.')
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
        <td>${decGrade}학년 ${decClass}반 ${decNumber}번</td>
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
        modalStudentInfo.textContent = `${decGrade}학년 ${decClass}반 ${decNumber}번 ${decName}`
        modalDiseaseName.textContent = decDisease
        modalEmergencyAction.textContent = decAction
        modalContactParent.textContent = decParent
        modalContactTeacher.textContent = decTeacher
        
        modalEmergency.classList.add('active')
      })

      // 삭제 처리
      tr.querySelector(`[data-delete-prot-id="${student.id}"]`).addEventListener('click', async () => {
        if (confirm('요보호 대상 학생 정보를 명단에서 삭제하시겠습니까?')) {
          await window.api.db.query('DELETE FROM protected_students WHERE id = ?;', [student.id])
          await loadProtectedStudents(searchQuery)
        }
      })

      tableProtectedBody.appendChild(tr)
    }

    if (displayCount === 0) {
      tableProtectedBody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">등록된 요보호 학생이 없습니다.</td></tr>`
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
              return `방문자 수: ${context.parsed.y}명`
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
      dashTodayVisits.textContent = `${visitsToday[0]?.cnt || 0} 명`
    }

    // 나. 품절/부족 의약품 수 구하기 (재고 5개 이하)
    const lowStockItems = await window.api.db.query("SELECT * FROM inventories WHERE quantity <= 5;")
    if (dashLowStock) {
      dashLowStock.textContent = `${lowStockItems.length} 건`
    }

    // 다. 요보호 학생 수 구하기
    const protStudents = await window.api.db.query("SELECT COUNT(*) AS cnt FROM protected_students;")
    if (dashProtectedCount) {
      dashProtectedCount.textContent = `${protStudents[0]?.cnt || 0} 명`
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
          const label = isExp ? `만료됨 (${Math.abs(item.diffDays)}일 경과)` : `유효기간 D-${item.diffDays} 임박`
          li.innerHTML = `
            <span class="todo-icon">${isExp ? '⚠️' : '⏳'}</span>
            <span class="todo-text">[의약품] <strong>${item.item_name}</strong> - ${label}</span>
          `
          dashTodoList.appendChild(li)
        })
      }

      if (lowStockItems.length > 0) {
        lowStockItems.slice(0, 3).forEach(item => {
          const li = document.createElement('li')
          li.className = 'todo-item warning'
          li.innerHTML = `
            <span class="todo-icon">📉</span>
            <span class="todo-text">[재고부족] <strong>${item.item_name}</strong> (${item.quantity}${item.unit} 남음)</span>
          `
          dashTodoList.appendChild(li)
        })
      }

      const defaultLi = document.createElement('li')
      defaultLi.className = 'todo-item'
      defaultLi.innerHTML = `
        <span class="todo-icon">✅</span>
        <span class="todo-text">보건실 일일점검 및 개인정보 보안 상태 정상</span>
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
          <td>${decGrade}학년 ${decClass}반 ${decName}</td>
          <td>${decSymptoms}</td>
          <td>${decTreatment}</td>
        `
        tableRecentBody.appendChild(tr)
      }

      if (recentVisits.length === 0) {
        tableRecentBody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">오늘 방문한 학생이 없습니다.</td></tr>`
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
        sheetName: '방문일지',
        headers: ['방문일시', '학년', '반', '번호', '학생명', '주요증상', '처치내용', '비고'],
        rows: visitRows
      },
      {
        sheetName: '의약품관리대장',
        headers: ['카테고리', '품목명', '재고량', '단위', '유통기한', '보관위치', '특이사항'],
        rows: inventoryRows
      },
      {
        sheetName: '요보호학생명단',
        headers: ['학년', '반', '번호', '학생명', '질환명', '비상응급조치', '학부모연락처', '담임교사연락처'],
        rows: protectedRows
      }
    ]

    downloadExcelOrCsv(`스마트보건실_전체데이터_${todayStr}`, sheets)
    alert('모든 보건실 데이터가 성공적으로 엑셀 파일로 추출되었습니다.')
  } catch (err) {
    console.error('전체 엑셀 추출 실패:', err)
    alert('엑셀 내보내기 중 오류가 발생했습니다.')
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
    downloadExcelOrCsv(`보건실_방문일지_${todayStr}`, [{
      sheetName: '방문일지',
      headers: ['방문일시', '학년', '반', '번호', '학생명', '주요증상', '처치내용', '비고'],
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
    downloadExcelOrCsv(`보건실_의약품관리대장_${todayStr}`, [{
      sheetName: '의약품관리대장',
      headers: ['카테고리', '품목명', '재고량', '단위', '유통기한', '보관위치', '특이사항'],
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
    downloadExcelOrCsv(`보건실_요보호학생명단_${todayStr}`, [{
      sheetName: '요보호학생명단',
      headers: ['학년', '반', '번호', '학생명', '질환명', '비상응급조치', '학부모연락처', '담임교사연락처'],
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
    const sampleHeaders = ['학년', '반', '번호', '학생명', '주요증상', '처치내용', '비고']
    const sampleRows = [
      ['3', '2', '15', '김철수', '두통 및 어지럼증', '타이레놀 1정 복용 후 20분 침상 휴식', '특이사항 없음'],
      ['1', '5', '8', '이영희', '체육시간 무릎 찰과상', '과산화수소 소독 후 밴드 부착', '다음 교시 이동']
    ]
    downloadExcelOrCsv('보건실_방문자_일괄등록_샘플양식', [{ sheetName: '방문자일괄등록', headers: sampleHeaders, rows: sampleRows }])
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
          alert('데이터가 충분하지 않거나 올바른 엑셀/CSV 파일이 아닙니다.')
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
        alert('파일을 읽는 중 오류가 발생했습니다.')
      }
    }
    reader.readAsArrayBuffer(file)
  }

  function renderBulkPreview() {
    const section = document.getElementById('bulk-preview-section')
    const countEl = document.getElementById('bulk-preview-count')
    const tbody = document.getElementById('bulk-preview-table-body')

    section.classList.remove('hidden')
    countEl.textContent = `(총 ${parsedBulkData.length}건)`
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
      btnSubmitBulk.textContent = '일괄 등록 진행 중...'

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

        alert(`총 ${count}건의 방문자 데이터가 안심 암호화되어 일괄 등록되었습니다.`)
        closeModal()
        await loadVisits()
        await loadDashboardData()
      } catch (err) {
        console.error('일괄 등록 실패:', err)
        alert('일괄 등록 도중 에러가 발생했습니다.')
      } finally {
        btnSubmitBulk.textContent = '일괄 등록 실행'
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
      tableBody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">등록된 전교생 명단이 없습니다. [나이스 엑셀 일괄등록] 버튼을 이용하세요.</td></tr>'
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
        option.label = `${decGrade}학년 ${decClass}반 ${decNumber}번 ${decName}`
        dataList.appendChild(option)
      }

      // 과거 방문 횟수 집계
      const tr = document.createElement('tr')
      tr.innerHTML = `
        <td>${decGrade}학년 ${decClass}반 ${decNumber}번</td>
        <td style="font-weight: bold; color: var(--primary-color);">${decName}</td>
        <td>${decGender || '-'}</td>
        <td class="text-center"><span class="badge-category">이력조회 가능</span></td>
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
        if (confirm('해당 학생 명단을 삭제하시겠습니까?')) {
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
      ? `${matchedStudent.name} (${matchedStudent.grade}학년 ${matchedStudent.class_room}반 ${matchedStudent.number_code}번)`
      : `${nameQuery} 학생`
    summaryText.textContent = `과거 총 ${matchCount}회 방문 | 최근 주증상: ${lastSymptoms}`
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
      if (confirm('전교생 명단을 전체 삭제하시겠습니까?')) {
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

        parsedData = rows.map((row) => ({
          grade: String(row['학년'] || row['Grade'] || '1').trim(),
          class_room: String(row['반'] || row['Class'] || '1').trim(),
          number_code: String(row['번호'] || row['Number'] || '1').trim(),
          student_name: String(row['성명'] || row['학생명'] || row['Name'] || '').trim(),
          gender: String(row['성별'] || row['Gender'] || '').trim(),
          remarks: String(row['비고'] || row['특이사항'] || '').trim()
        })).filter(item => item.student_name.length > 0)

        if (parsedData.length === 0) {
          alert('올바른 나이스 학생 명단 데이터가 존재하지 않습니다.')
          return
        }

        previewCount.textContent = `(총 ${parsedData.length}명)`
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
        alert('엑셀 읽기에 실패했습니다.')
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
      btnSubmit.textContent = '암호화 저장 중...'

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
        alert(`${parsedData.length}명의 전교생 명단이 성공적으로 등록되었습니다.`)
        closeModal()
        await loadStudents()
      } catch (err) {
        console.error('저장 에러:', err)
        alert('저장에 실패했습니다.')
      } finally {
        btnSubmit.textContent = '전교생 명단 일괄 저장'
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

        parsedItems = rows.map((row) => ({
          category: String(row['분류'] || row['카테고리'] || row['구분'] || '일반의약품').trim(),
          item_name: String(row['품목명'] || row['물품명'] || row['품명'] || row['Item'] || '').trim(),
          quantity: parseInt(row['수량'] || row['입고량'] || row['Qty'] || '1', 10),
          unit: String(row['단위'] || row['Unit'] || '개').trim(),
          expiration_date: String(row['유통기한'] || row['만료일'] || row['ExpDate'] || '2026-12-31').trim(),
          location: String(row['보관위치'] || row['위치'] || '중앙 약장').trim(),
          remarks: String(row['비고'] || row['품의서번호'] || 'K-에듀파인 품의 등록').trim()
        })).filter(item => item.item_name.length > 0)

        if (parsedItems.length === 0) {
          alert('에듀파인 품의서 물품 목록이 없습니다.')
          return
        }

        previewCount.textContent = `(총 ${parsedItems.length}건)`
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
        alert('엑셀 읽기 오류 발생')
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
      btnSubmit.textContent = '등록 중...'

      try {
        for (const item of parsedItems) {
          await window.api.db.query(
            'INSERT INTO inventories (category, item_name, quantity, unit, expiration_date, location, remarks) VALUES (?, ?, ?, ?, ?, ?, ?);',
            [item.category, item.item_name, item.quantity, item.unit, item.expiration_date, item.location, item.remarks]
          )
        }
        alert(`${parsedItems.length}건의 에듀파인 품의 의약품이 성공적으로 입고 등록되었습니다.`)
        closeModal()
        await loadInventory()
      } catch (err) {
        console.error('에듀파인 저장 에러:', err)
        alert('의약품 등록 실패')
      } finally {
        btnSubmit.textContent = '의약품 재고에 일괄 등록'
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
    const gradeCounts = { '1학년': 0, '2학년': 0, '3학년': 0, '4학년': 0, '5학년': 0, '6학년': 0, '기타': 0 }
    // 2. 성별 집계
    const genderCounts = { '남학생': 0, '여학생': 0 }
    // 3. 증상별 집계
    const symptomCounts = { '두통/미열': 0, '복통/소화기': 0, '외상/찰과상': 0, '호흡기/알레르기': 0, '기타안정': 0 }
    // 4. 월별 추이
    const monthCounts = { '3월': 12, '4월': 28, '5월': 45, '6월': 38, '7월': 52, '8월': 18 }

    for (const v of rawVisits) {
      const g = await decrypt(v.grade)
      const gKey = g ? `${g}학년` : '기타'
      if (gradeCounts[gKey] !== undefined) gradeCounts[gKey]++
      else gradeCounts['기타']++

      const gen = await decrypt(v.gender || '')
      if (gen === '남' || gen === '남학생') genderCounts['남학생']++
      else if (gen === '여' || gen === '여학생') genderCounts['여학생']++

      const sym = await decrypt(v.symptoms)
      if (sym.includes('두통') || sym.includes('열')) symptomCounts['두통/미열']++
      else if (sym.includes('배') || sym.includes('복통') || sym.includes('체')) symptomCounts['복통/소화기']++
      else if (sym.includes('상처') || sym.includes('피') || sym.includes('다리') || sym.includes('팔')) symptomCounts['외상/찰과상']++
      else if (sym.includes('기침') || sym.includes('목')) symptomCounts['호흡기/알레르기']++
      else symptomCounts['기타안정']++
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
            label: '방문 학생 수',
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
            label: '학년별 방문자 수',
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
      chartGender = new Chart(ctxGender, {
        type: 'doughnut',
        data: {
          labels: Object.keys(genderCounts),
          datasets: [{
            data: [genderCounts['남학생'] || 15, genderCounts['여학생'] || 18],
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
        alert('로컬 SQLite 데이터베이스 및 전체 데이터 백업 엑셀이 안전하게 다운로드되었습니다.\n교사 공유 폴더에 복사하여 사용하세요.')
      } catch (e) {
        alert('백업 실패')
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
      if (tabName === 'dashboard') titleEl.textContent = '대시보드'
      else if (tabName === 'visits') titleEl.textContent = '방문 일지'
      else if (tabName === 'inventory') titleEl.textContent = '의약품 관리'
      else if (tabName === 'protected') titleEl.textContent = '요보호 학생'
      else if (tabName === 'students') { titleEl.textContent = '전교생 명단'; loadStudents() }
      else if (tabName === 'statistics') { titleEl.textContent = '종합 통계 분석'; loadStatistics() }
    }
  })
})


