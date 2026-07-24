// scripts/build.js
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

import { build as viteBuild } from 'vite'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'
import path from 'path'
import fs from 'fs'
import os from 'os'
import { fileURLToPath } from 'url'
import builder from 'electron-builder'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

const tempOutputDir = path.join(os.tmpdir(), 'healthcare_electron_build_out')
const finalDistDir = path.join(rootDir, 'dist_setup')

const mainJsPath = path.join(rootDir, 'src', 'main.js')

async function runBuild() {
  console.log('🧹 0. 최종 빌드 폴더를 정리합니다...')
  if (fs.existsSync(finalDistDir)) {
    try {
      fs.rmSync(finalDistDir, { recursive: true, force: true })
    } catch (e) {}
  }
  fs.mkdirSync(finalDistDir, { recursive: true })

  // 원본 main.js 백업
  const originalMainJs = fs.readFileSync(mainJsPath, 'utf8')

  const targetLangs = ['ko', 'jp', 'en']

  try {
    for (const lang of targetLangs) {
      const upperLang = lang.toUpperCase()
      console.log(`\n==================================================`)
      console.log(`🚀 [${upperLang} 전용 버전] 빌드 및 패키징을 시작합니다...`)
      console.log(`==================================================`)

      // 임시 빌드 폴더 정리
      if (fs.existsSync(tempOutputDir)) {
        try {
          fs.rmSync(tempOutputDir, { recursive: true, force: true })
        } catch (e) {}
      }
      fs.mkdirSync(tempOutputDir, { recursive: true })

      // 1. 소스코드 변조: 기본 언어 강제 지정, 타 언어 리소스 및 지구본 토글 버튼 감춤
      console.log(`⚙️ 1-1. main.js 소스코드를 단일 언어 전용 모드로 변조합니다...`)
      
      // A. 디폴트 언어 및 로컬 스토리지 강제 고정 (타국어 캐시 오염 차단)
      let modifiedMainJs = originalMainJs.replace(
        /let currentLang = localStorage\.getItem\('lang'\) \|\| 'jp'/,
        `localStorage.setItem('lang', '${lang}');\nlet currentLang = '${lang}';`
      )

      // B. 빌드 대상이 아닌 타국어 마커 블록을 소스 코드 상에서 물리적으로 완전 소거
      const langsToRemove = targetLangs.filter(l => l !== lang)
      for (const removeLang of langsToRemove) {
        console.log(`   -> [물리 제거] '${removeLang}' 번역 블록을 소스에서 삭제합니다.`);
        
        // i18nDict 내부 타국어 블록 매칭 및 제거
        const i18nRegex = new RegExp(`\\/\\/ @i18n-${removeLang}-start[\\s\\S]*?\\/\\/ @i18n-${removeLang}-end,?`, 'g')
        modifiedMainJs = modifiedMainJs.replace(i18nRegex, '')

        // bodyPartDict 내부 타국어 블록 매칭 및 제거
        const bodyRegex = new RegExp(`\\/\\/ @body-${removeLang}-start[\\s\\S]*?\\/\\/ @body-${removeLang}-end,?`, 'g')
        modifiedMainJs = modifiedMainJs.replace(bodyRegex, '')
      }

      // C. undefined 런타임 에러 가드 및 지구본 버튼 강제 감춤 코드 주입
      const guardAndPurgeCode = `
  // [단일 언어 빌드 가드] 타 언어 참조 시 undefined 에러 방지용 더미 객체 할당
  if (typeof i18nDict !== 'undefined') {
    if (!i18nDict.ko) i18nDict.ko = {};
    if (!i18nDict.jp) i18nDict.jp = {};
    if (!i18nDict.en) i18nDict.en = {};
  }
  if (typeof bodyPartDict !== 'undefined') {
    if (!bodyPartDict.ko) bodyPartDict.ko = {};
    if (!bodyPartDict.jp) bodyPartDict.jp = {};
    if (!bodyPartDict.en) bodyPartDict.en = {};
  }
  // 지구본 언어 전환 토글 단추 UI 완전 감춤 및 강제 비활성화
  const btnLangToggleEl = document.getElementById('btn-lang-toggle');
  if (btnLangToggleEl) btnLangToggleEl.style.display = 'none';
      `
      
      modifiedMainJs = modifiedMainJs.replace(
        /\/\/ 초기 언어 적용\s+applyLanguage\(currentLang\)/,
        `${guardAndPurgeCode}\n  // 초기 언어 적용\n  applyLanguage(currentLang)`
      )

      fs.writeFileSync(mainJsPath, modifiedMainJs, 'utf8')

      // 2. Vite 프론트엔드 및 Electron 프로세스 빌드
      console.log('⚙️ 1-2. Vite 프론트엔드 및 Electron 번들링 중...')
      await viteBuild({
        root: rootDir,
        configFile: false,
        plugins: [
          electron([
            { entry: path.join(rootDir, 'electron/main.js') },
            { entry: path.join(rootDir, 'electron/preload.js') }
          ]),
          renderer(),
          {
            name: 'copy-sql-wasm',
            closeBundle() {
              const wasmSrc = path.resolve(rootDir, 'node_modules/sql.js/dist/sql-wasm.wasm')
              const wasmDest = path.resolve(rootDir, 'dist-electron/sql-wasm.wasm')
              if (fs.existsSync(wasmSrc)) {
                fs.mkdirSync(path.dirname(wasmDest), { recursive: true })
                fs.copyFileSync(wasmSrc, wasmDest)
                console.log('  -> Copied sql-wasm.wasm to dist-electron')
              }
            }
          }
        ],
        resolve: {
          alias: {
            '@': path.join(rootDir, 'src')
          }
        }
      })

      // 3. Electron-Builder 패키징 진행
      console.log('📦 2. Electron-Builder 로컬 패키징을 시작합니다...')
      const prodName = `Smart Healthroom Support System ${upperLang}`
      await builder.build({
        config: {
          productName: prodName,
          appId: `com.healthcare.smartapp.${lang}`,
          directories: {
            output: tempOutputDir
          },
          files: [
            "dist/**/*",
            "dist-electron/**/*",
            "package.json"
          ],
          win: {
            target: [
              {
                target: "nsis",
                arch: ["x64"]
              }
            ],
            icon: "public/favicon.svg"
          },
          mac: {
            target: [
              {
                target: "dmg",
                arch: ["x64", "arm64"]
              },
              {
                target: "zip",
                arch: ["x64", "arm64"]
              }
            ],
            icon: "public/favicon.svg",
            category: "public.app-category.healthcare-and-fitness"
          },
          nsis: {
            oneClick: false,
            allowToChangeInstallationDirectory: true,
            shortcutName: prodName
          }
        }
      })

      // 4. 생성된 아티팩트를 목적지 이름 규칙에 맞춰 복사
      console.log(`🚚 3. 빌드 완료된 [${upperLang}] 결과물을 dist_setup으로 복사 및 재명명합니다...`)
      const tempFiles = fs.readdirSync(tempOutputDir)
      
      for (const file of tempFiles) {
        const srcPath = path.join(tempOutputDir, file)
        
        if (fs.statSync(srcPath).isFile()) {
          // 인스톨러 Setup 파일명 재정의: Smart Healthroom Support System Setup 1.0.0-KR.exe 형식
          let destFileName = file
          if (file.endsWith('.exe') && file.includes('Setup')) {
            destFileName = `Smart Healthroom Support System Setup 1.0.0-${upperLang}.exe`
          } else if (file.endsWith('.blockmap') && file.includes('Setup')) {
            destFileName = `Smart Healthroom Support System Setup 1.0.0-${upperLang}.exe.blockmap`
          }
          
          const destPath = path.join(finalDistDir, destFileName)
          fs.copyFileSync(srcPath, destPath)
          console.log(`  -> 파일 복사 완료: ${destFileName}`)
        } else if (file === 'win-unpacked') {
          // 무설치 실행 폴더 복사: win-unpacked-KR 형태
          const destDirName = `win-unpacked-${upperLang}`
          const destPath = path.join(finalDistDir, destDirName)
          fs.cpSync(srcPath, destPath, { recursive: true })
          console.log(`  -> 실행 폴더 복사 완료: ${destDirName}`)

          // 마이그레이션 SQL 복사 포함
          const migrationsSrc = path.join(rootDir, 'supabase', 'migrations')
          const migrationsDestInUnpacked = path.join(destPath, 'resources', 'supabase', 'migrations')
          if (fs.existsSync(migrationsSrc)) {
            fs.mkdirSync(migrationsDestInUnpacked, { recursive: true })
            fs.cpSync(migrationsSrc, migrationsDestInUnpacked, { recursive: true })
            console.log(`  -> [${upperLang}] 마이그레이션 SQL 리소스 포함 완료`)
          }
        }
      }
    }
    console.log('\n🎉 ✅ 단일 언어 전용(소스 상에서 타국어 리소스 완전 삭제) 3종 개별 배포 파일 생성이 대성공했습니다!')
  } catch (error) {
    console.error('❌ 다중 언어 빌드 도중 오류 발생:', error)
    throw error;
  } finally {
    // 빌드가 성공하든 실패하든 무조건 main.js 소스코드 원본 복원
    console.log('🧹 4. 소스코드 원본 main.js를 깨끗이 복원합니다...')
    fs.writeFileSync(mainJsPath, originalMainJs, 'utf8')
  }
}

runBuild().catch(err => {
  console.error('❌ 빌드 스크립트 실행 실패:', err)
  process.exit(1)
})
