# 코젠바이오텍 실험데이터 통합

장비별로 서로 다른 형식의 실험 결과 파일을 하나의 표준 엑셀 파일로 통합하는 Codex 기반 실습/운영 저장소입니다.

## Codex 사용 원칙

우리 팀은 모두 Codex를 사용하는 것을 기본 규칙으로 합니다. 따라서 파일을 메신저로 전달하지 말고, Codex에서 GitHub 클론 링크를 가져와 저장소를 연결해 사용하는 방식으로 안내하면 됩니다.

직원 안내 문구 예시:

```text
Codex에서 아래 GitHub 저장소의 클론 링크를 가져와 연결한 뒤 사용하세요.
https://github.com/jch2100/kogen_data_merge
```

## 이 저장소에 들어있는 것

- `samples/`: 입력 예시 파일
- `outputs/`: 통합 결과 예시 파일
- `skill/experiment-data-merge/`: Codex 스킬 패키지
- `merge_experiment_results.mjs`: 실습용 병합 스크립트
- `run_latest_experiment_merge.ps1`: 최신 파일 병합 실행 스크립트
- `04_*.md` ~ `07_*.md`: 실습/강의 문서

## 직원이 Codex에서 사용하는 방법

1. Codex에서 저장소 클론 링크를 사용해 이 저장소를 가져옵니다.
2. 필요하면 `skill/experiment-data-merge/README.md`를 먼저 읽습니다.
3. Codex에 아래처럼 요청합니다.

```text
experiment-data-merge 스킬을 사용해서
samples 폴더의 파일들을 하나로 통합해줘.
결과는 outputs 폴더에 저장해줘.
```

## 스킬 위치

주요 스킬 문서는 아래 경로에 있습니다.

- `skill/experiment-data-merge/SKILL.md`
- `skill/experiment-data-merge/README.md`
- `skill/experiment-data-merge/scripts/merge_experiment_results.mjs`
- `skill/experiment-data-merge/scripts/run_merge.ps1`

## 직접 실행하는 방법

PowerShell에서 아래처럼 실행할 수 있습니다.

```powershell
powershell -ExecutionPolicy Bypass -File .\skill\experiment-data-merge\scripts\run_merge.ps1 `
  -InputDir ".\samples" `
  -OutputDir ".\outputs" `
  -Latest 3
```

## 출력 결과

생성되는 통합 워크북에는 아래 시트가 포함됩니다.

- `README`
- `통합본`
- `장비별추가항목`
- `장비요약`
- `매핑로그`
- `검토필요`
