const { contextBridge, ipcRenderer } = require('electron')

// contextBridge를 사용하여 렌더러 프로세스(화면)와 메인 프로세스(시스템 제어) 간 안전한 통신 통로를 정의합니다.
// 렌더러 프로세스에서는 window.api를 통해 아래 함수들을 호출할 수 있게 됩니다.
contextBridge.exposeInMainWorld('api', {
  /**
   * 데이터베이스 관련 IPC 통신 API
   */
  db: {
    // SQL 쿼리를 실행하고 결과를 반환받는 함수
    query: (sql, params = []) => ipcRenderer.invoke('db:query', { sql, params }),
    
    // DB 마이그레이션(초기화)을 실행하는 함수
    runMigrations: (migrations) => ipcRenderer.invoke('db:run-migrations', migrations),
  },

  /**
   * 개인정보 보호용 암호화/복호화 API
   * (안전을 위해 키 관리는 메인 프로세스에서 수행하며, 렌더러는 메인에 암/복호화를 위임합니다.)
   */
  security: {
    // 텍스트를 암호화하여 반환받는 함수
    encrypt: (text) => ipcRenderer.invoke('security:encrypt', text),
    
    // 암호화된 텍스트를 복호화하여 반환받는 함수
    decrypt: (cipherText) => ipcRenderer.invoke('security:decrypt', cipherText),
  }
})
