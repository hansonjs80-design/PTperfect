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

## Git 자동 푸시(업스트림 자동 연결) 설정

처음 푸시할 때마다 `--set-upstream`을 붙이지 않도록 저장소 로컬 Git 설정을 자동 구성합니다.

1. 설정 스크립트 실행:
   `npm run setup:auto-push`
2. 이후 현재 브랜치에서 바로 푸시:
   `git push`

해당 스크립트는 아래 설정을 적용합니다.
- `push.autoSetupRemote=true`
- `push.default=current`


## 디자인 안전 순차 적용 가이드

디자인 반영은 `docs/design-rollout-playbook.md` 기준으로 단계별(모바일 → 태블릿 → 데스크탑) 적용하세요.

