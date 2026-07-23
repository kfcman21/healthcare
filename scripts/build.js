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

async function runBuild() {
  console.log('🧹 0. 임시 및 최종 빌드 폴더를 정리합니다...')
  if (fs.existsSync(tempOutputDir)) {
    try {
      fs.rmSync(tempOutputDir, { recursive: true, force: true })
    } catch (e) {}
  }
  if (fs.existsSync(finalDistDir)) {
    try {
      fs.rmSync(finalDistDir, { recursive: true, force: true })
    } catch (e) {}
  }
  fs.mkdirSync(tempOutputDir, { recursive: true })
  fs.mkdirSync(finalDistDir, { recursive: true })

  console.log('🚀 1. Vite 프론트엔드 및 Electron 프로세스 빌드를 시작합니다...')

  await viteBuild({
    root: rootDir,
    configFile: false,
    plugins: [
      electron([
        { entry: path.join(rootDir, 'electron/main.js') },
        { entry: path.join(rootDir, 'electron/preload.js') }
      ]),
      renderer()
    ],
    resolve: {
      alias: {
        '@': path.join(rootDir, 'src')
      }
    }
  })

  console.log('📦 2. Electron-Builder 로컬 패키징을 시작합니다...')

  await builder.build({
    config: {
      productName: "스마트 보건실 업무지원 시스템",
      appId: "com.healthcare.smartapp",
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
        shortcutName: "스마트 보건실 업무지원 시스템"
      }
    }
  })

  console.log('🚚 3. 생성된 아티팩트 및 마이그레이션 리소스를 최종 dist_setup으로 복사합니다...')
  
  const files = fs.readdirSync(tempOutputDir)
  for (const file of files) {
    const srcPath = path.join(tempOutputDir, file)
    const destPath = path.join(finalDistDir, file)
    if (fs.statSync(srcPath).isFile()) {
      fs.copyFileSync(srcPath, destPath)
      console.log(`  -> 설치파일/압축파일 복사: ${file}`)
    } else if (file === 'win-unpacked' || file.startsWith('mac')) {
      fs.cpSync(srcPath, destPath, { recursive: true })
      console.log(`  -> 실행 폴더 복사: ${file}`)
    }
  }

  const migrationsSrc = path.join(rootDir, 'supabase', 'migrations')
  const migrationsDestInUnpacked = path.join(finalDistDir, 'win-unpacked', 'resources', 'supabase', 'migrations')
  if (fs.existsSync(migrationsSrc) && fs.existsSync(path.join(finalDistDir, 'win-unpacked'))) {
    fs.mkdirSync(migrationsDestInUnpacked, { recursive: true })
    fs.cpSync(migrationsSrc, migrationsDestInUnpacked, { recursive: true })
    console.log(`  -> 마이그레이션 SQL 리소스 포함 완료`)
  }

  console.log('🎉 ✅ 스마트 보건실 업무지원 시스템 배포용 실행/설치파일(dist_setup) 생성이 완벽히 성공했습니다!')
}

runBuild().catch(err => {
  console.error('❌ 빌드 도중 오류가 발생했습니다:', err)
  process.exit(1)
})
