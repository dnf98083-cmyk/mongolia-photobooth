# 인생네컷 📸

자양교회 몽골 선교를 위한 오프라인 포토부스 웹앱입니다.  
노트북 한 대로 인생네컷처럼 사진을 찍고, QR코드로 스마트폰에 다운로드할 수 있습니다.

---

## 어떻게 사용하나요?

```
노트북에서 앱 실행
       ↓
노트북 WiFi 핫스팟 켜기
       ↓
참가자 폰을 핫스팟에 연결
       ↓
포토부스에서 6장 촬영 + 영상 자동 녹화
       ↓
마음에 드는 4장 선택 → 세로 스트립 자동 합성
       ↓
QR코드 생성 → 폰으로 스캔 → 사진·영상 다운로드
```

---

## 설치 및 실행

```bash
# 1. 의존성 설치
npm install

# 2. 개발 서버 실행 (로컬 네트워크 전체 공개)
npm run dev -- --hostname 0.0.0.0

# 3. 브라우저에서 열기
# http://localhost:3000
```

> **WiFi 핫스팟 설정 (Windows)**  
> 설정 → 네트워크 및 인터넷 → 모바일 핫스팟 → 켜기  
> 인터넷 연결이 없어도 핫스팟은 동작합니다.

---

## 페이지 구조

| 경로 | 설명 |
|------|------|
| `/` | 홈 — 촬영 시작 버튼, 서버 접속 QR |
| `/booth/[sessionId]` | 포토부스 — 카메라 촬영 + 영상 녹화 |
| `/select/[sessionId]` | 사진 선택 — 6장 중 4장 고르기, 스트립 합성 |
| `/download/[sessionId]` | 다운로드 — 폰 최적화, 스트립·영상 다운로드 |

---

## 사용한 기술

### 프론트엔드
| 기술 | 역할 |
|------|------|
| **Next.js 15 (App Router)** | 페이지 라우팅, SSR/CSR 혼합 |
| **TypeScript** | 타입 안전성 |
| **Tailwind CSS** | 빠른 UI 스타일링 |
| **WebRTC (getUserMedia)** | 브라우저 카메라 접근 |
| **MediaRecorder API** | 촬영 과정 영상 녹화 (WebM 포맷) |
| **Canvas API** | 사진 캡처, 4컷 스트립 이미지 합성 |
| **qrcode** | QR코드 이미지 생성 |

### 백엔드 (Next.js API Routes)
| 기술 | 역할 |
|------|------|
| **Next.js API Routes** | REST API 엔드포인트 |
| **Node.js fs** | 사진·영상 파일 로컬 저장 |
| **Node.js os** | 서버 로컬 IP 자동 감지 |
| **uuid** | 세션 ID 생성 |

---

## 코드 설명

### 핵심 흐름

#### 1. 세션 생성 (`/api/sessions`)
촬영을 시작하면 서버에서 UUID로 세션 ID를 발급합니다.  
세션 정보는 `uploads/sessions/[sessionId]/session.json`에 저장됩니다.

```typescript
// POST /api/sessions
const sessionId = uuidv4()
saveSessionData(sessionId, { id, createdAt, photoCount: 0, status: 'capturing' })
```

#### 2. 카메라 촬영 (`src/app/booth/[sessionId]/page.tsx`)
브라우저의 `getUserMedia`로 카메라를 열고, `MediaRecorder`로 전체 세션을 녹화합니다.  
3-2-1 카운트다운 후 `canvas.drawImage(video)`로 현재 프레임을 캡처합니다.

```typescript
// 카메라 스트림 열기
const stream = await navigator.mediaDevices.getUserMedia({ video: true })

// 영상 녹화 시작
const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8' })

// 사진 캡처
canvas.getContext('2d').drawImage(videoElement, 0, 0)
const photo = canvas.toDataURL('image/jpeg', 0.9)
```

#### 3. 사진 서버 저장 (`/api/sessions/[sessionId]/photo`)
base64 인코딩된 이미지를 받아 JPEG 파일로 디코딩해서 저장합니다.

```typescript
const base64 = data.replace(/^data:image\/\w+;base64,/, '')
fs.writeFileSync(filepath, Buffer.from(base64, 'base64'))
```

#### 4. 스트립 합성 (`src/app/select/[sessionId]/page.tsx`)
선택된 4장을 Canvas로 세로로 쌓고, 하단에 날짜와 브랜딩을 추가합니다.

```typescript
// Canvas 420×1400px 생성
const scale = Math.max(PHOTO_W / img.width, PHOTO_H / img.height)
ctx.drawImage(img, sx, sy, sw, sh, PAD_SIDE, y, PHOTO_W, PHOTO_H)
```

#### 5. QR코드 생성 및 다운로드
`qrcode` 라이브러리로 다운로드 URL을 QR이미지로 변환합니다.  
폰이 노트북 핫스팟에 연결된 상태에서 스캔하면 `/download/[sessionId]` 페이지가 열립니다.

```typescript
const qrDataUrl = await QRCode.toDataURL(`http://192.168.137.1:3000/download/${sessionId}`)
```

#### 6. 로컬 IP 자동 감지 (`src/lib/storage.ts`)
`os.networkInterfaces()`로 노트북의 실제 로컬 IP를 자동으로 찾습니다.

```typescript
for (const alias of iface) {
  if (alias.family === 'IPv4' && !alias.internal) return alias.address
}
```

---

## 파일 저장 구조

```
uploads/
└── sessions/
    └── [sessionId]/
        ├── session.json    # 세션 메타데이터
        ├── photo_0.jpg     # 1번째 촬영 사진
        ├── photo_1.jpg     # 2번째 촬영 사진
        │   ...
        ├── photo_5.jpg     # 6번째 촬영 사진
        ├── strip.png       # 선택된 4장 합성 스트립
        └── video.webm      # 전체 촬영 영상
```

> `uploads/sessions/` 폴더는 `.gitignore`에 포함되어 있어 실제 사진·영상은 GitHub에 올라가지 않습니다.

---

## 주의사항

- 브라우저 카메라 권한이 필요합니다 (HTTPS 또는 localhost에서만 작동)
- 영상은 WebM 포맷으로 저장됩니다 (Android/Chrome 완전 지원, iPhone은 QuickTime으로 변환 필요)
- 많은 인원이 동시에 촬영할 경우 노트북 저장 공간을 확인하세요
- WiFi 핫스팟 연결 후 `npm run dev -- --hostname 0.0.0.0` 으로 실행해야 폰에서 접속 가능합니다

---

## 제작

자양교회 몽골 선교팀을 위해 제작되었습니다.
