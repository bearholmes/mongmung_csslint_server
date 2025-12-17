import styleLint from 'stylelint';
import type { LinterResult } from 'stylelint';
import postcss from 'postcss';
import {
  LintOptions,
  LintResult,
  LintRequest,
  CssSyntax,
  OutputStyle,
  StylelintWarning,
} from '../types';
import { createStylelintConfig } from '../config/stylelint';
import { compactFormatter, nestedFormatter } from '../utils/formatters';
import { logger } from '../utils/logger';
import {
  validateCode,
  validateSyntax,
  validateRules,
  validateOutputStyle,
} from '../utils/validation';
import { LintError, ParseError } from '../errors';
import { MESSAGES, VALIDATION_ERRORS } from '../constants';
import stylelintPackage from 'stylelint/package.json' assert { type: 'json' };

/**
 * Stylelint 버전 (설치된 패키지에서 직접 읽음)
 */
const STYLELINT_VERSION = stylelintPackage.version ?? 'unknown';

/**
 * 린트 요청 유효성 검증
 *
 * @param request - 검증할 린트 요청 객체
 * @throws {ValidationError} 유효하지 않은 입력 시
 */
function validateLintRequest(request: LintRequest): void {
  const { code, syntax, config } = request;

  // 코드 검증
  validateCode(code);

  // 문법 검증
  validateSyntax(syntax);

  // 규칙 검증
  validateRules(config.rules);

  // 출력 스타일 검증 (선택적)
  validateOutputStyle(config.outputStyle);
}

/**
 * Stylelint 결과에서 경고 목록을 안전하게 추출
 *
 * @param lintResult - Stylelint 실행 결과
 * @returns 경고 목록 (없으면 빈 배열)
 */
function extractWarnings(lintResult: LinterResult): StylelintWarning[] {
  if (!lintResult.results || lintResult.results.length === 0) {
    return [];
  }

  const firstResult = lintResult.results[0];
  if (!firstResult.warnings || !Array.isArray(firstResult.warnings)) {
    return [];
  }

  return firstResult.warnings as StylelintWarning[];
}

/**
 * CSS 출력 포맷팅
 *
 * @param lintedCode - Stylelint로 수정된 CSS 코드
 * @param outputStyle - 출력 스타일 ('compact' | 'nested')
 * @param syntax - CSS 문법 타입
 * @returns 포맷팅된 CSS 문자열
 * @throws {ParseError} 파싱 오류 시
 */
function formatOutput(
  lintedCode: string,
  outputStyle: OutputStyle | undefined,
  syntax: CssSyntax,
): string {
  // HTML 문법이거나 출력 스타일이 지정되지 않은 경우 원본 반환
  if (syntax === 'html' || !outputStyle) {
    return lintedCode;
  }

  try {
    const root = postcss.parse(lintedCode);

    if (outputStyle === 'nested') {
      return nestedFormatter(root);
    } else {
      return compactFormatter(root);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('CSS parsing failed', { error: errorMessage });
    throw new ParseError(`${VALIDATION_ERRORS.PARSE_ERROR}: ${errorMessage}`);
  }
}

/**
 * CSS 코드 린트 실행
 *
 * @param request - 린트 요청 객체
 * @returns 린트 결과 (성공/실패, 경고, 포맷팅된 코드 포함)
 * @throws {ValidationError} 입력 유효성 검사 실패 시
 * @throws {LintError} 린트 실행 오류 시
 *
 * @example
 * ```typescript
 * const result = await lintCode({
 *   code: 'body { color: #FFF; }',
 *   syntax: 'css',
 *   config: {
 *     rules: { 'color-hex-case': 'lower' },
 *     outputStyle: 'nested'
 *   }
 * });
 * ```
 */
export async function lintCode(request: LintRequest): Promise<LintResult> {
  // 입력 유효성 검증
  validateLintRequest(request);

  const { code, syntax, config } = request;
  const { rules, outputStyle } = config;

  // Stylelint 설정 생성
  const stylelintConfig = createStylelintConfig(rules, syntax);
  const options: LintOptions = {
    code,
    config: stylelintConfig,
  };

  try {
    logger.debug('Running Stylelint', {
      syntax,
      rulesCount: Object.keys(rules).length,
      outputStyle,
    });

    // Stylelint 실행
    const lintResult: LinterResult = await styleLint.lint(options);

    // 경고 추출
    const warnings = extractWarnings(lintResult);

    // 출력 포맷팅
    // stylelint 16부터 output 대신 code 속성 사용 (fix: true일 때 자동 수정된 코드)
    const formattedOutput = formatOutput(
      lintResult.code ?? code,
      outputStyle,
      syntax,
    );

    logger.info('Lint completed successfully', {
      warningsCount: warnings.length,
      outputLength: formattedOutput.length,
    });

    // 성공 결과 반환
    return {
      success: true,
      message: MESSAGES.SUCCESS,
      content: {
        warnings,
        output: formattedOutput,
        info: {
          version: STYLELINT_VERSION,
          config: {
            extends: stylelintConfig.extends,
            plugins: stylelintConfig.plugins,
            customSyntax: stylelintConfig.customSyntax,
          },
        },
      },
    };
  } catch (error) {
    // ValidationError, ParseError는 그대로 전파
    if (error instanceof LintError || error instanceof ParseError) {
      throw error;
    }

    // Stylelint 내부 오류 처리
    const errorMessage =
      error instanceof Error
        ? `${VALIDATION_ERRORS.LINT_ERROR}: ${error.message}`
        : VALIDATION_ERRORS.UNKNOWN_ERROR;

    logger.error('Stylelint execution failed', {
      error: error instanceof Error ? error.message : String(error),
      syntax,
    });

    throw new LintError(errorMessage);
  }
}
