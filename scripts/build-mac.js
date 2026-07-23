// scripts/build-mac.js
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

const tempOutputDir = path.join(os.tmpdir(), 'healthcare_electron_build_mac_out')
const finalDistDir = path.join(rootDir, 'dist_setup_mac')

async function runMacBuild() {
  console.log('🧹 0. 맥용 임시 및 최종 빌드 폴더(dist_setup_mac)를 정리합니다...')
  if (fs.existsSync(tempOutputDir)) {
    try { fs.rmSync(tempOutputDir, { recursive: true, force: true }) } catch (e) {}
  }
  if (fs.existsSync(finalDistDir)) {
    try { fs.rmSync(finalDistDir, { recursive: true, force: true }) } catch (e) {}
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

  console.log('📦 2. Electron-Builder macOS (ZIP & App) 패키징을 시작합니다...')

  await builder.build({
    targets: builder.Platform.MAC.createTarget(['zip', 'dir'], builder.Arch.x64, builder.Arch.arm64),
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
      mac: {
        category: "public.app-category.healthcare-and-fitness",
        icon: "public/favicon.svg"
      }
    }
  })

  console.log('🚚 3. 생성된 macOS 아티팩트를 dist_setup_mac 폴더로 복사합니다...')
  
  const files = fs.readdirSync(tempOutputDir)
  for (const file of files) {
    const srcPath = path.join(tempOutputDir, file)
    const destPath = path.join(finalDistDir, file)
    if (fs.statSync(srcPath).isFile()) {
      fs.copyFileSync(srcPath, destPath)
      console.log(`  -> 맥용 압축/아티팩트 파일 복사: ${file}`)
    } else {
      fs.cpSync(srcPath, destPath, { recursive: true })
      console.log(`  -> 맥용 실행 앱/폴더 복사: ${file}`)
    }
  }

  console.log('🎉 ✅ 맥북용(macOS) 실행 및 설치용 압축 파일(dist_setup_mac) 생성이 완벽히 성공했습니다!')
}

runMacBuild().catch(err => {
  console.error('❌ 맥용 빌드 도중 오류가 발생했습니다:', err)
  process.exit(1)
})
