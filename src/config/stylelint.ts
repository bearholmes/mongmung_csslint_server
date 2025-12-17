import { StylelintConfig, CssSyntax, StylelintRuleValue } from '../types';

/**
 * Stylelint 기본 확장 설정 목록
 * - stylelint-config-standard: 표준 CSS 규칙
 * - stylelint-config-recommended-scss: SCSS 권장 규칙
 * - stylelint-config-recommended-vue: Vue 파일 권장 규칙
 */
export const DEFAULT_EXTENDS = [
  'stylelint-config-standard',
  'stylelint-config-recommended-scss',
  'stylelint-config-recommended-vue',
] as const;

/**
 * Stylelint 기본 플러그인 목록
 * - stylelint-order: CSS 속성 정렬
 * - @stylistic/stylelint-plugin: 스타일 관련 규칙 (stylelint 16부터)
 */
export const DEFAULT_PLUGINS = [
  'stylelint-order',
  '@stylistic/stylelint-plugin',
] as const;

/**
 * 문법별 커스텀 파서 매핑
 */
const SYNTAX_PARSER_MAP: Record<CssSyntax, string | undefined> = {
  css: undefined,
  html: 'postcss-html',
};

/**
 * Stylelint 설정 객체 생성
 *
 * @param rules - 사용자 정의 린트 규칙
 * @param syntax - CSS 문법 타입 ('css' 또는 'html')
 * @returns 완전한 Stylelint 설정 객체
 *
 * @example
 * ```typescript
 * const config = createStylelintConfig(
 *   { 'color-hex-case': 'lower' },
 *   'css'
 * );
 * ```
 */
export function createStylelintConfig(
  rules: Record<string, StylelintRuleValue>,
  syntax: CssSyntax,
): StylelintConfig {
  // stylelint v16에서 스타일 규칙이 @stylistic/*으로 이동했으므로 호환 매핑 처리
  const normalizedRules: Record<string, StylelintRuleValue> = { ...rules };
  if (normalizedRules['color-hex-case'] !== undefined) {
    normalizedRules['@stylistic/color-hex-case'] =
      normalizedRules['color-hex-case'];
    delete normalizedRules['color-hex-case'];
  }

  const config: StylelintConfig = {
    extends: [...DEFAULT_EXTENDS],
    fix: true,
    plugins: [...DEFAULT_PLUGINS],
    rules: normalizedRules,
  };

  const customSyntax = SYNTAX_PARSER_MAP[syntax];
  if (customSyntax) {
    config.customSyntax = customSyntax;
  }

  return config;
}
