# 실험데이터 통합 스킬

서로 다른 장비에서 나온 실험 결과 파일을 하나의 표준 엑셀 파일로 합치는 Codex용 스킬입니다. CSV와 XLSX가 섞여 있어도 장비별 컬럼명을 공통 스키마로 변환해서 `통합본` 시트에 모아줍니다.

## 이 스킬이 해결하는 문제

- 장비마다 컬럼명이 달라서 수작업 통합이 번거로운 경우
- 같은 날짜 실험 데이터를 장비 A, B, C 등에서 각각 받는 경우
- 원본은 보존하면서 표준화된 분석용 파일이 필요한 경우
- 누가 어떤 컬럼을 어떤 표준 필드로 매핑했는지 기록이 필요한 경우

## 생성되는 결과물

출력 워크북에는 아래 시트가 들어갑니다.

- `README`: 통합 파일 사용 안내
- `통합본`: 표준 컬럼으로 정규화된 전체 데이터
- `장비별추가항목`: 장비마다 달랐던 부가 컬럼
- `장비요약`: 장비별 건수와 평균값 요약
- `매핑로그`: 원본 컬럼과 표준 컬럼의 대응표
- `검토필요`: 비어 있는 필드나 매핑 실패 같은 점검 항목

## 폴더 구조

```text
skill/experiment-data-merge/
├─ SKILL.md
├─ README.md
└─ scripts/
   ├─ merge_experiment_results.mjs
   └─ run_merge.ps1
```

## Codex에서 사용하는 방법

Codex에 아래처럼 요청하면 됩니다.

```text
experiment-data-merge 스킬을 사용해서
C:\...\samples 폴더의 실험 파일들을 통합해줘.
결과는 C:\...\outputs 에 저장해줘.
```

또는 조금 더 구체적으로:

```text
experiment-data-merge 스킬로 최신 3개 파일만 읽어서 통합해줘.
매핑 실패가 있으면 검토필요 시트에 남겨줘.
```

## 직원들이 사용하는 방법

우리 팀은 모두 Codex를 사용하므로, 직원에게는 로컬 복사본을 따로 전달하기보다 GitHub 저장소 링크를 안내하면 됩니다.

권장 안내 문구:

```text
Codex에서 이 저장소의 클론 링크를 가져와 작업 폴더에 연결한 뒤 사용하세요.
저장소: https://github.com/jch2100/kogen_data_merge
```

직원 사용 흐름:

1. Codex에서 저장소 클론 링크를 사용해 이 프로젝트를 가져옵니다.
2. `skill/experiment-data-merge/` 폴더를 기준으로 스킬 파일을 확인합니다.
3. Codex에 아래처럼 요청합니다.

```text
experiment-data-merge 스킬을 사용해서 샘플 폴더를 통합해줘.
```

필요하면 직원 PC의 Codex 스킬 폴더로 복사해 고정 설치할 수도 있습니다.

```text
C:\Users\<사용자명>\.codex\skills\experiment-data-merge
```

## PowerShell로 직접 실행하는 방법

`run_merge.ps1`는 Codex 번들 Node 런타임을 찾아 실행하도록 만들어져 있습니다.

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\run_merge.ps1 `
  -InputDir "C:\data\samples" `
  -OutputDir "C:\data\outputs" `
  -Latest 3
```

옵션 설명:

- `InputDir`: 입력 파일 폴더
- `OutputDir`: 결과 파일 저장 폴더
- `Latest`: 최신 파일 몇 개를 읽을지
- `TodayOnly`: 오늘 수정된 파일만 대상으로 제한할지 여부

예시:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\run_merge.ps1 `
  -InputDir "C:\Lab\Experiment\2026-04-21" `
  -OutputDir "C:\Lab\Experiment\outputs" `
  -Latest 3 `
  -TodayOnly
```

## 표준 컬럼

현재 스킬은 아래 공통 컬럼으로 정규화합니다.

- `sample_id`
- `experiment_date`
- `operator`
- `device_id`
- `result_value`
- `signal_strength`
- `quality_score`

## 새 장비를 추가하는 방법

새 포맷이 들어오면 `scripts/merge_experiment_results.mjs`의 `deviceDefinitions`에 추가하면 됩니다.

추가할 때 확인할 항목:

1. 장비 식별 키
2. 시트 이름이 필요한지 여부
3. 원본 컬럼명과 표준 컬럼명의 매핑

## 운영 팁

- 파일명보다 헤더 기준 매핑이 더 중요합니다.
- 검토필요 시트에 `unmapped_file`이 나오면 새 장비 포맷일 가능성이 큽니다.
- 표준 필드가 비어 있으면 `missing_standard_field`로 표시됩니다.
- 분석 자동화로 확장하려면 통합본 뒤에 피벗, 차트, 임계치 알림 시트를 추가하면 좋습니다.
