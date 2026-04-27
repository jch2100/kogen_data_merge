# experiment-data-merge

Codex에서 사용하는 실험데이터 통합 스킬 저장소입니다. 이 저장소는 학습자 혼동을 줄이기 위해 스킬 본체만 포함합니다.

## 팀 사용 원칙

우리 팀은 모두 Codex를 사용합니다. 따라서 파일을 따로 전달하지 말고, Codex에서 이 저장소의 클론 링크를 가져와 연결해서 사용하도록 안내하면 됩니다.

저장소 링크:

[https://github.com/jch2100/kogen_data_merge](https://github.com/jch2100/kogen_data_merge)

직원 안내 문구 예시:

```text
Codex에서 experiment-data-merge 저장소의 클론 링크를 가져와 연결한 뒤 사용하세요.
연결 후 README를 보고 바로 실행하면 됩니다.
```

## 저장소 구성

이 저장소에는 스킬에 필요한 파일만 있습니다.

```text
.
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
C:\data\samples 폴더의 실험 파일을 하나로 통합해줘.
결과는 C:\data\outputs 폴더에 저장해줘.
```

조금 더 구체적으로 요청하려면:

```text
experiment-data-merge 스킬로 최신 3개 파일만 읽어서 통합해줘.
매핑 실패가 있으면 검토필요 시트에 남겨줘.
```

## 직접 실행하는 방법

PowerShell에서 아래처럼 실행할 수 있습니다.

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\run_merge.ps1 `
  -InputDir "C:\data\samples" `
  -OutputDir "C:\data\outputs" `
  -Latest 3
```

옵션:

- `InputDir`: 입력 파일 폴더
- `OutputDir`: 결과 파일 저장 폴더
- `Latest`: 최신 파일 몇 개를 읽을지
- `TodayOnly`: 오늘 수정된 파일만 대상으로 제한할지 여부

## 스킬이 하는 일

- 장비별로 다른 CSV/XLSX 컬럼을 감지합니다.
- 공통 스키마로 정규화합니다.
- 하나의 Excel 결과 파일로 저장합니다.
- 장비별 추가 항목과 매핑 로그를 함께 남깁니다.
- 누락 필드나 매핑 실패를 검토용 시트에 기록합니다.

## 생성되는 워크북 시트

- `README`
- `통합본`
- `장비별추가항목`
- `장비요약`
- `매핑로그`
- `검토필요`

## 새 장비 포맷 추가 방법

새 장비가 들어오면 `scripts/merge_experiment_results.mjs`의 `deviceDefinitions` 객체에 매핑만 추가하면 됩니다.

확인할 항목:

1. 장비 식별 키
2. 시트 이름 필요 여부
3. 원본 컬럼명과 표준 컬럼명의 대응
