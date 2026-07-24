import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import fs from 'fs'
import initSqlJs from 'sql.js'
import CryptoJS from 'crypto-js'
import { fileURLToPath } from 'url'

// ESM 및 번들링 환경에서의 __dirname 안전한 대체 정의
const __filename = typeof __filename !== 'undefined' ? __filename : (import.meta.url ? fileURLToPath(import.meta.url) : '')
const __dirname = typeof __dirname !== 'undefined' ? __dirname : (__filename ? path.dirname(__filename) : process.cwd())
if (typeof globalThis.__dirname === 'undefined') {
  globalThis.__dirname = __dirname
}

// 1. 개인정보 보호를 위한 대칭키 암호화 설정
// (보안 최우선 과제: 실제 서비스에서는 이 암호화 키가 소스코드 내에 노출되지 않도록 OS 환경변수 또는 하드웨어 보안 영역에 저장해야 합니다.)
const SECRET_KEY = 'HEALTHCARE_SECURE_SECRET_KEY_1234!' 

// 2. 데이터베이스 설정 (SQLite Wasm 기반)
const isDev = !app.isPackaged
const dbDir = path.join(app.getPath('userData'), 'healthcare_app')
const dbPath = path.join(dbDir, 'healthcare.db')
let dbInstance = null

// 데이터베이스 인스턴스를 디스크(파일)로 저장하는 함수
// sql.js는 메모리 상에서 작동하므로 쓰기 작업 후 반드시 이 함수를 통해 파일로 백업해 주어야 합니다.
function saveDatabase() {
  if (!dbInstance) return
  const data = dbInstance.export()
  const buffer = Buffer.from(data)
  fs.writeFileSync(dbPath, buffer)
}

// 3. 암호화 및 복호화 헬퍼 함수
function encryptData(text) {
  if (!text) return ''
  return CryptoJS.AES.encrypt(String(text), SECRET_KEY).toString()
}

function decryptData(cipherText) {
  if (!cipherText) return ''
  try {
    const bytes = CryptoJS.AES.decrypt(cipherText, SECRET_KEY)
    return bytes.toString(CryptoJS.enc.Utf8)
  } catch (error) {
    console.error('Decryption failed:', error)
    return '[복호화 실패]'
  }
}

// 4. 데이터베이스 및 마이그레이션 초기화 함수
async function initializeDatabase() {
  try {
    // DB 저장 디렉토리가 없으면 생성합니다.
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true })
    }

    const SQL = await initSqlJs()

    if (fs.existsSync(dbPath)) {
      // 이미 DB 파일이 존재하면 읽어와서 메모리에 올립니다.
      const fileBuffer = fs.readFileSync(dbPath)
      dbInstance = new SQL.Database(fileBuffer)
      console.log('기존 데이터베이스를 로드했습니다:', dbPath)
    } else {
      // 새로운 데이터베이스 인스턴스를 생성합니다.
      dbInstance = new SQL.Database()
      console.log('새로운 데이터베이스를 생성했습니다.')
      saveDatabase()
    }

    // 마이그레이션(초기 테이블 세팅) 실행
    await runMigrations()

  } catch (error) {
    console.error('데이터베이스 초기화 에러:', error)
  }
}

// 마이그레이션 폴더 내의 SQL 파일들을 순서대로 실행해주는 함수
async function runMigrations() {
  try {
    // 렌더러가 리소스를 바라보는 방식을 고려하여,
    // 개발 환경과 패키징된 환경에서 마이그레이션 파일 경로를 적절히 획득합니다.
    let migrationsDir = ''
    if (isDev) {
      migrationsDir = path.join(process.cwd(), 'supabase', 'migrations')
    } else {
      // 빌드 시 리소스로 패키징된 경로
      migrationsDir = path.join(process.resourcesPath, 'supabase', 'migrations')
    }

    if (!fs.existsSync(migrationsDir)) {
      console.warn('마이그레이션 디렉토리가 존재하지 않습니다:', migrationsDir)
      return
    }

    const files = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort() // 파일명 정렬 (001_, 002_ 등 번호 순)

    // SQLite의 현재 DB 버전 조회
    let currentVersion = 0
    try {
      const res = dbInstance.exec('PRAGMA user_version;')
      if (res.length > 0 && res[0].values.length > 0) {
        currentVersion = res[0].values[0][0]
      }
    } catch (e) {
      console.error('user_version 조회 에러:', e)
    }

    for (const file of files) {
      const fileVersion = parseInt(file.split('_')[0], 10)
      if (isNaN(fileVersion)) continue

      // 현재 DB 버전보다 최신인 SQL 파일만 순차적으로 적용합니다.
      if (fileVersion > currentVersion) {
        const filePath = path.join(migrationsDir, file)
        const sqlContent = fs.readFileSync(filePath, 'utf8')
        console.log(`마이그레이션 실행 중: ${file} (버전: ${fileVersion})`)
        
        // 다중 쿼리 실행을 위해 세미콜론 기준으로 파싱하여 개별 실행
        dbInstance.run(sqlContent)
        
        // 데이터베이스의 user_version 업데이트
        dbInstance.run(`PRAGMA user_version = ${fileVersion};`)
        currentVersion = fileVersion
      }
    }

    saveDatabase()
    console.log(`데이터베이스 마이그레이션이 성공적으로 완료되었습니다. 현재 버전: ${currentVersion}`)

  } catch (error) {
    console.error('마이그레이션 실행 에러:', error)
  }
}

// 5. 브라우저 창 생성 및 라이프사이클 정의
let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    title: '스마트 보건실 업무지원 시스템',
    icon: path.join(process.cwd(), 'public', 'favicon.svg')
  })

  // 개발 환경에서는 Vite 개발 서버 주소를 로드하고,
  // 프로덕션 빌드 환경에서는 dist/index.html 파일을 로드합니다.
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// App 기동
app.whenReady().then(async () => {
  // DB 로드 및 생성
  await initializeDatabase()
  
  // 메인 창 생성
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// 6. IPC 통신 처리기 (렌더러 프로세스 요청 수신)

// [보안 API] 암/복호화 위임 처리
ipcMain.handle('security:encrypt', (event, text) => {
  return encryptData(text)
})

ipcMain.handle('security:decrypt', (event, cipherText) => {
  return decryptData(cipherText)
})

// [DB API] 쿼리 실행 처리기
ipcMain.handle('db:query', (event, { sql, params }) => {
  if (!dbInstance) {
    throw new Error('데이터베이스가 아직 준비되지 않았습니다.')
  }

  try {
    // SELECT 쿼리 등 데이터 반환이 있는 경우
    const isSelect = sql.trim().toUpperCase().startsWith('SELECT') || sql.trim().toUpperCase().startsWith('PRAGMA')
    
    if (isSelect) {
      const res = dbInstance.exec(sql, params)
      if (res.length === 0) return []
      
      const { columns, values } = res[0]
      // 컬럼명과 값을 쌍으로 하는 객체 리스트로 매핑하여 반환
      return values.map(row => {
        const obj = {}
        columns.forEach((col, i) => {
          obj[col] = row[i]
        })
        return obj
      })
    } else {
      // INSERT, UPDATE, DELETE 등 데이터를 수정하는 경우
      dbInstance.run(sql, params)
      
      // DB가 수정되면 디스크에 파일로 백업합니다.
      saveDatabase()
      
      // 마지막 삽입 행 ID와 변경된 행 수 반환 (선택 사항)
      let lastID = 0
      let changes = 0
      try {
        const idRes = dbInstance.exec("SELECT last_insert_rowid() AS id;")
        if (idRes.length > 0) {
          lastID = idRes[0].values[0][0]
        }
        const changesRes = dbInstance.exec("SELECT changes() AS changes;")
        if (changesRes.length > 0) {
          changes = changesRes[0].values[0][0]
        }
      } catch (e) {
        console.error('변경 내용 상세 획득 실패:', e)
      }
      
      return { success: true, lastInsertRowid: lastID, changes: changes }
    }
  } catch (error) {
    console.error('SQL 실행 실패:', sql, error)
    throw error
  }
})
