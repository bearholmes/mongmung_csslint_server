/**
 * CSS 문법 타입
 * - css: 순수 CSS 파일
 * - html: HTML 내 <style> 태그
 */
export type CssSyntax = 'css' | 'html';

/**
 * CSS 출력 포맷 스타일
 * - compact: 한 줄로 압축된 형식
 * - nested: 들여쓰기가 적용된 중첩 형식
 */
export type OutputStyle = 'compact' | 'nested';

/**
 * Stylelint 규칙 값 타입
 * 규칙은 다양한 형태를 가질 수 있음:
 * - boolean: true/false
 * - string: 문자열 값
 * - number: 숫자 값
 * - array: 복잡한 규칙 설정
 * - null: 규칙 비활성화
 */
export type StylelintRuleValue =
  | null
  | boolean
  | string
  | number
  | Array<string | number | boolean | Record<string, unknown>>;

/**
 * Stylelint 경고 정보
 */
export interface StylelintWarning {
  /** 경고가 발생한 줄 번호 */
  line: number;
  /** 경고가 발생한 열 번호 */
  column: number;
  /** 위반된 규칙 이름 */
  rule: string;
  /** 경고의 심각도 (error, warning) */
  severity: 'error' | 'warning';
  /** 경고 메시지 */
  text: string;
}

/**
 * Stylelint 설정 인터페이스
 */
export interface StylelintConfig {
  /** 확장할 기본 설정 목록 */
  extends: string[];
  /** 사용할 플러그인 목록 */
  plugins: string[];
  /** 린트 규칙 설정 */
  rules: Record<string, StylelintRuleValue>;
  /** 커스텀 문법 파서 (예: postcss-html) */
  customSyntax?: string;
}

/**
 * Stylelint 실행 옵션
 */
export interface LintOptions {
  /** 린트할 CSS 코드 */
  code: string;
  /** Stylelint 설정 */
  config: StylelintConfig;
  /** 자동 수정 활성화 여부 */
  fix?: boolean;
}

/**
 * 린트 결과 정보
 */
export interface LintResultInfo {
  /** Stylelint 버전 */
  version: string;
  /** 사용된 설정 정보 */
  config: {
    /** 확장된 설정 목록 */
    extends: string[];
    /** 사용된 플러그인 목록 */
    plugins: string[];
    /** 커스텀 문법 파서 */
    customSyntax?: string;
  };
}

/**
 * 린트 결과 콘텐츠
 */
export interface LintResultContent {
  /** 경고 및 오류 목록 */
  warnings: StylelintWarning[];
  /** 포맷팅된 CSS 출력 */
  output: string;
  /** 버전 및 설정 정보 */
  info: LintResultInfo;
}

/**
 * API 응답: 린트 결과
 */
export interface LintResult {
  /** 성공 여부 */
  success: boolean;
  /** 응답 메시지 */
  message: string;
  /** 린트 결과 데이터 (실패 시 null) */
  content: LintResultContent | null;
}

/**
 * API 요청: 린트 요청
 */
export interface LintRequest {
  /** 린트할 CSS 코드 */
  code: string;
  /** CSS 문법 타입 */
  syntax: CssSyntax;
  /** 린트 설정 */
  config: {
    /** Stylelint 규칙 */
    rules: Record<string, StylelintRuleValue>;
    /** 출력 포맷 스타일 (선택사항) */
    outputStyle?: OutputStyle;
  };
}
