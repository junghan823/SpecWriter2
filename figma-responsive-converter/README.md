# 🔄 PC to Mobile Converter - Figma Plugin

PC 프레임을 모바일 프레임으로 자동 변환하는 Figma 플러그인입니다.

## ✨ 주요 기능

### 자동 변환 규칙

1. **GNB (Global Navigation Bar)**
   - 높이: 60px → 50px
   - 패딩: 24px → 16px
   - 메뉴: 수평 텍스트 → 햄버거 아이콘

2. **타이포그래피**
   - 메인 타이틀: title1 (28px) → title2 (22px)
   - 서브타이틀: bodyB (15px/Bold) → captionM (13px/Medium)
   - 버튼 라벨: subTitle3 (16px) 유지

3. **레이아웃**
   - 좌우 패딩: 24px → 16px
   - 콘텐츠 최대 너비: 1200px → 제약 없음
   - 모바일 너비: 기본 375px (설정 가능)

4. **버튼 하단 고정**
   - 조건: lg 사이즈 이상 (52px+) & 화면에 1개만 존재
   - 동작: 하단 고정 (position: fixed)
   - 패딩: 콘텐츠 하단 여백 추가

5. **Footer**
   - 레이아웃: 5단 수평 → 세로 스택
   - 패딩: 40px 60px → 20px 16px
   - 정보: 전체 → 필수만

6. **FAB (Floating Action Button)**
   - 위치: right 40px → 16px, bottom 조정

## 🚀 설치 방법

### 1. 로컬 개발 모드

```bash
# 의존성 설치
cd figma-responsive-converter
npm install

# TypeScript 빌드
npm run build

# 또는 Watch 모드
npm run watch
```

### 2. Figma에서 플러그인 불러오기

1. Figma Desktop App 실행
2. 메뉴: `Plugins` > `Development` > `Import plugin from manifest...`
3. `manifest.json` 파일 선택
4. 플러그인이 `Development` 섹션에 추가됨

## 📖 사용 방법

### 기본 사용

1. **PC 프레임 선택**
   - 변환할 PC 프레임을 선택합니다

2. **플러그인 실행**
   - `Plugins` > `Development` > `PC to Mobile Converter`

3. **옵션 설정**
   - 모바일 프레임 너비 (기본 375px)
   - 변환 옵션 체크박스 선택

4. **변환 실행**
   - "변환하기" 버튼 클릭
   - 모바일 프레임이 PC 프레임 옆에 생성됩니다

### 고급 옵션

- **프레임 너비**: 320px ~ 428px 사이 설정 가능
- **GNB 변환**: GNB 컴포넌트 자동 변환
- **타이포그래피 변환**: 텍스트 크기 자동 조정
- **버튼 하단 고정**: lg 이상 버튼 하단 배치
- **Footer 변환**: Footer 축소 및 재구성

## 🎯 변환 전후 비교

### Before (PC - 1440px)
```
GNB: 60px height, 수평 메뉴
Title: 28px (title1)
Padding: 24px
Button: 우측 상단, 120px width
Footer: 5단 레이아웃
```

### After (Mobile - 375px)
```
GNB: 50px height, 햄버거 메뉴
Title: 22px (title2)
Padding: 16px
Button: 하단 고정, 100% width
Footer: 세로 스택
```

## 🛠️ 프로젝트 구조

```
figma-responsive-converter/
├── manifest.json      # 플러그인 설정
├── code.ts           # 메인 로직 (TypeScript)
├── code.js           # 컴파일된 JavaScript
├── ui.html           # 플러그인 UI
├── package.json      # 의존성 정보
├── tsconfig.json     # TypeScript 설정
└── README.md         # 문서
```

## 🔧 개발 가이드

### 빌드

```bash
# 한 번만 빌드
npm run build

# Watch 모드 (파일 변경 시 자동 빌드)
npm run watch
```

### 디버깅

1. Figma에서 플러그인 실행
2. `Plugins` > `Development` > `Open Console`
3. `console.log()` 출력 확인

## 📝 변환 규칙 커스터마이징

`code.ts` 파일에서 규칙 수정:

```typescript
// Breakpoints 수정
const BREAKPOINTS = {
  mobile: { min: 360, max: 819, padding: 16 },
  tablet: { min: 820, max: 1023, padding: 16 },
  pc: { min: 1024, max: null, padding: 24, maxContent: 1200 }
};

// 타이포그래피 매핑 수정
const TYPOGRAPHY_MAP = {
  'title1': { from: 28, to: 22, ... },
  'bodyB': { from: 15, to: 13, ... },
  // ...
};
```

## ⚠️ 주의사항

1. **프레임 선택 필수**: 변환 전 PC 프레임을 선택해야 합니다
2. **네이밍 규칙**: GNB, Footer 등 컴포넌트 이름이 일치해야 정확한 변환이 가능합니다
3. **폰트 로드**: Pretendard 폰트가 Figma 파일에 있어야 합니다
4. **백업 권장**: 변환 전 원본 프레임 백업을 권장합니다

## 🐛 문제 해결

### "PC 프레임을 선택해주세요" 에러
- 프레임(Frame)을 선택했는지 확인하세요
- 그룹이나 다른 요소가 아닌 Frame이어야 합니다

### 타이포그래피가 변환되지 않음
- Pretendard 폰트가 설치되어 있는지 확인하세요
- 텍스트 스타일 이름이 정확한지 확인하세요

### 버튼이 하단에 고정되지 않음
- 버튼 높이가 52px 이상인지 확인하세요
- 화면에 lg 이상 버튼이 1개만 있는지 확인하세요

## 📄 라이선스

MIT License

## 👨‍💻 개발자

Figma Plugin for Responsive Design Automation

---

**Version**: 1.0.0
**Last Updated**: 2024-12-24
