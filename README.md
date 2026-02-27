<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1R6GGAmI39JrqHJJa66By00Q4UT_eg2fy

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`


## 개발하면서 미리보기(핫리로드)

코드 수정 내용을 브라우저에서 바로 확인하려면 아래 명령을 사용하세요.

```bash
npm install
npm run dev
```

- 기본 개발 서버: `http://localhost:5173` (포트 고정)
- 파일을 저장하면 화면이 자동 갱신됩니다(HMR).

브라우저를 자동으로 열고 싶다면:

```bash
npm run dev:open
```

외부 기기(같은 네트워크의 모바일/태블릿)에서 확인하려면:
- `http://<내 PC IP>:5173` 로 접속 (예: `http://192.168.0.10:5173`)
- PC/모바일이 같은 Wi-Fi인지 확인
- 방화벽에서 5173 포트 허용

### 안 보일 때 빠른 점검

1. 서버가 실제로 떴는지 확인
```bash
npm run dev
```
2. 브라우저 주소를 정확히 입력
- PC: `http://localhost:5173`
- 모바일: `http://<내 PC IP>:5173`
3. 캐시 문제 제거
- 강력 새로고침(`Ctrl+F5`) 또는 시크릿 창으로 접속
- PWA라서 이전 캐시가 남아있을 수 있음
4. 포트 충돌 확인
- 이 프로젝트는 `5173` 고정(`--strictPort`)이라, 포트를 못 쓰면 에러가 뜹니다.
- 이 경우 5173을 점유한 프로세스를 종료 후 다시 실행하세요.
