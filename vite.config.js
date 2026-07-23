import { defineConfig } from 'vite'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'
import path from 'path'

// Vite 설정 파일: Electron 플러그인을 적용하여 Vite가 Electron 메인/프리로드 프로세스도 빌드하도록 제어합니다.
export default defineConfig({
  plugins: [
    electron([
      {
        // 메인 프로세스 엔트리 포인트 설정
        entry: 'electron/main.js',
      },
      {
        // 프리로드 스크립트 설정 (안전한 메인-렌더러 통신용)
        entry: 'electron/preload.js',
      },
    ]),
    // 렌더러 프로세스에서 Electron 및 Node.js API(필요시)를 편리하게 불러올 수 있도록 도와주는 플러그인
    renderer(),
  ],
  resolve: {
    alias: {
      // 소스 폴더를 가리키는 별칭 설정
      '@': path.resolve(__dirname, 'src'),
    },
  },
})
