# 고구마 안내 사이트 스타터

상품별 사진과 사용 안내를 링크로 전달하는 모바일용 사이트예요. 겨울 배너, 상품 탭, 안내 문구 복사, 사진마다 원본 다운로드를 바로 써 볼 수 있어요. 예제 콘텐츠와 그림을 넣어 두었어요.

## 1. GPT에게 맡기기

코드 편집과 터미널 실행이 가능한 GPT에 이 저장소 주소를 보내고 아래 문장을 붙여넣으세요. 휴대폰 채팅에서 답변만 받는 경우에는 내 PC의 터미널에서 안내된 명령을 실행해야 해요.

> 이 저장소의 README.md와 AGENTS.md를 읽고 고구마 안내 사이트를 내 PC에서 실행해 줘. 먼저 예제로 열어 보고, 내가 보내는 제목·안내 문구·상품 링크·사진을 로컬 설정에 반영해 줘. 연결 확인 뒤 휴대폰으로 공유하는 법도 알려줘.

[전체 복사 프롬프트와 자료 작성 양식](GPT-PROMPT.md)

## 2. 내 PC에서 직접 시작하기

Windows PowerShell 기준이에요. [Node.js LTS](https://nodejs.org/) 22 이상과 [Git](https://git-scm.com/)을 설치하세요. Git을 설치하지 않았다면 GitHub의 **Code → Download ZIP**으로 받아 압축을 풀고 그 폴더에서 PowerShell을 열어도 돼요.

```powershell
git clone https://github.com/xogus6510/goguma-guide-starter.git
cd goguma-guide-starter
npm run setup
npm start
```

`npm run setup`은 처음 한 번 실행해요. `npm start`가 출력한 주소를 PC 브라우저에서 열면 돼요. 별도 패키지 설치나 DB 연결은 필요 없어요.

## 3. 사진과 안내 바꾸기

1. 공개해도 되는 사진을 `private-media/` 폴더에 넣어요. `front.jpg`, `how-to.png`, `banner.webp`처럼 영문 파일명을 쓰세요. PNG·JPG·WebP를 지원하고 파일당 20MB까지 표시해요.
2. `site.local.json`에서 `title`, `intro`, `products`를 바꿔요. 각 상품에는 `name`, `url`, `cards`가 있어요. 카드의 `title`·`text`가 안내 제목·본문이고, 사진은 `"photos": [{ "file": "front.jpg", "alt": "제품 정면" }]`처럼 연결해요. 배너는 `"banner": { "file": "banner.webp", "alt": "행사 배너" }`로 연결하고, 배너 없이 쓰려면 `null`로 설정해요.
3. 저장하고 브라우저를 새로고침해요. 상품 탭, 링크, 복사, 사진 다운로드를 확인하세요. 예제 구조는 [site.example.json](site.example.json)에 있어요. 실제 운영 내용은 `site.local.json`에만 저장해요.

## 4. 휴대폰이나 다른 장소에서 보기

이 사이트를 실행하는 **본인 PC가 서버**예요. 공유하는 동안 **PC 전원과 인터넷을 유지하고 절전 모드를 끄고**, 사이트와 터널 터미널을 모두 열어 두세요.

1. 사이트를 실행한 상태에서 [cloudflared](https://developers.cloudflare.com/tunnel/downloads/)를 설치해요.
2. 새 PowerShell 창을 열고 아래 명령을 실행해요.

   ```powershell
   cloudflared tunnel --url http://127.0.0.1:3210
   ```

3. 두 번째 창에 출력된 HTTPS 주소 뒤에 첫 번째 창의 `/p/...` 경로를 붙여요. 휴대폰의 모바일 데이터에서 접속을 확인한 뒤 그 주소를 필요한 사람에게만 보내요.

[Cloudflare Quick Tunnel](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/)은 테스트용 임시 주소예요. 터널을 다시 켜면 도메인이 달라질 수 있어요. 장기 운영은 본인 Cloudflare 계정의 관리형 터널과 접근 인증으로 설정해요.

- **링크 교체**는 `npm run rotate`예요. 기존 링크는 바로 닫히고 새 링크는 7일 동안 유효해요. 서버 터미널에서 Ctrl+C 후 `npm start`를 실행하면 새 주소를 확인할 수 있어요.
- **안내 마감**은 `site.local.json`의 `expiresAt`을 지난 시각으로 바꾸거나 서버·터널을 종료하면 돼요. `2026-12-31T23:59:59+09:00`처럼 날짜에 시간대를 붙일 수 있어요.

## 공개 전에 확인하기

- 이 저장소에는 예제 코드·예제 이미지·문서만 커밋해요. 실제 링크, `site.local.json`, `private-media/`, 주문 내역, 연락처, 계정 정보는 내 PC에만 두세요. `git status --short`와 `git diff --cached --name-only`로 올릴 파일을 확인하세요.
- 공유 링크를 받은 사람은 페이지와 연결된 사진을 열고 내려받을 수 있어요. 사진 속 얼굴, 영수증, 주소 라벨을 가리고, 촬영 위치 같은 메타데이터를 지운 사본을 사용하세요. 사진을 내려받으면 등록한 파일 그대로 저장돼요.
- 본인이 촬영했거나 공유에 동의받은 자료만 사용하고, 공개 후기나 별점은 참여자가 실제 사용 경험에 따라 직접 작성하게 하세요. 테스트 문구와 예제 이미지는 실제 고객 경험을 나타내지 않아요.
- 링크를 교체하면 이전 주소의 열람은 중단돼요. 이미 저장하거나 캡처한 자료는 회수할 수 없어요.

## 파일 안내

| 파일 | 용도 |
|---|---|
| `README.md` | 설치, 수정, 휴대폰 공유 |
| `GPT-PROMPT.md` | GPT 복사 프롬프트와 사진·문구 제출 예시 |
| `AGENTS.md` | GPT가 작업할 때 따라야 할 경로와 공개 기준 |
| `site.example.json` | 공개 예제 설정 |
| `setup.mjs`, `server.mjs` | 초대 링크 생성과 로컬 서버 |
| `public/`, `test/` | 화면 소스와 서버 테스트 |

`npm test`로 초대 링크, 만료·교체, 다운로드와 비공개 파일 차단을 확인할 수 있어요.
