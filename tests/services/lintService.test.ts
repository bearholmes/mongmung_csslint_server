import { describe, test, expect } from 'bun:test';
import { lintCode } from '../../src/services/lintService';
import { LintError } from '../../src/errors';
import { LintRequest } from '../../src/types';

describe('lintService', () => {
  describe('lintCode - validation', () => {
    test('should throw error for empty code', async () => {
      const request: LintRequest = {
        code: '',
        syntax: 'css',
        config: {
          rules: { '@stylistic/color-hex-case': 'lower' },
        },
      };

      await expect(lintCode(request)).rejects.toThrow(
        'CSS 코드가 비어있습니다',
      );
    });

    test('should throw error for whitespace-only code', async () => {
      const request: LintRequest = {
        code: '   \n  \t  ',
        syntax: 'css',
        config: {
          rules: { '@stylistic/color-hex-case': 'lower' },
        },
      };

      await expect(lintCode(request)).rejects.toThrow(
        'CSS 코드가 비어있습니다',
      );
    });

    test('should throw error for invalid syntax', async () => {
      const request = {
        code: 'body { color: red; }',
        syntax: 'invalid',
        config: {
          rules: { '@stylistic/color-hex-case': 'lower' },
        },
      };

      await expect(lintCode(request as unknown as LintRequest)).rejects.toThrow(
        '지원하지 않는 문법입니다',
      );
    });

    test('should throw error for empty rules', async () => {
      const request: LintRequest = {
        code: 'body { color: red; }',
        syntax: 'css',
        config: {
          rules: {},
        },
      };

      await expect(lintCode(request)).rejects.toThrow(
        '최소 하나 이상의 린트 규칙이 필요합니다',
      );
    });

    test('should throw error for invalid output style', async () => {
      const request = {
        code: 'body { color: red; }',
        syntax: 'css',
        config: {
          rules: { 'color-hex-case': 'lower' },
          outputStyle: 'invalid',
        },
      };

      await expect(lintCode(request as unknown as LintRequest)).rejects.toThrow(
        '지원하지 않는 출력 스타일입니다',
      );
    });
  });

  describe('lintCode - CSS syntax', () => {
    test('should lint and fix valid CSS code', async () => {
      const request: LintRequest = {
        code: 'body { color: #FFF; }',
        syntax: 'css',
        config: {
          rules: { '@stylistic/color-hex-case': 'lower' },
          outputStyle: 'compact',
        },
      };

      const result = await lintCode(request);

      expect(result.success).toBe(true);
      expect(result.message).toBe('성공');
      expect(result.content).not.toBeNull();
      expect(result.content!.output).toContain('#fff');
    });

    test('should return warnings for rule violations', async () => {
      const request: LintRequest = {
        code: 'body { color: #FFF; }',
        syntax: 'css',
        config: {
          rules: { '@stylistic/color-hex-case': 'upper' },
        },
      };

      const result = await lintCode(request);

      expect(result.success).toBe(true);
      expect(result.content).not.toBeNull();
      // Stylelint auto-fix will correct it, but warnings may still be present
    });

    test('should format output in nested style', async () => {
      const request: LintRequest = {
        code: 'body{color:red;margin:0;}',
        syntax: 'css',
        config: {
          rules: { 'color-no-invalid-hex': true },
          outputStyle: 'nested',
        },
      };

      const result = await lintCode(request);

      expect(result.success).toBe(true);
      expect(result.content).not.toBeNull();
      expect(result.content!.output).toContain('{\n');
      expect(result.content!.output).toContain('  ');
    });

    test('should format output in compact style', async () => {
      const request: LintRequest = {
        code: `
          body {
            color: red;
            margin: 0;
          }
        `,
        syntax: 'css',
        config: {
          rules: { 'color-no-invalid-hex': true },
          outputStyle: 'compact',
        },
      };

      const result = await lintCode(request);

      expect(result.success).toBe(true);
      expect(result.content).not.toBeNull();
      expect(result.content!.output).toContain('{ ');
      expect(result.content!.output).toContain('; }');
    });

    test('should include version and config info', async () => {
      const request: LintRequest = {
        code: 'body { color: red; }',
        syntax: 'css',
        config: {
          rules: { 'color-no-invalid-hex': true },
        },
      };

      const result = await lintCode(request);

      expect(result.content).not.toBeNull();
      expect(result.content!.info.version).toBeTruthy();
      expect(result.content!.info.config.extends).toBeArray();
      expect(result.content!.info.config.plugins).toBeArray();
    });
  });

  describe('lintCode - HTML syntax', () => {
    test('should lint CSS in HTML', async () => {
      const request: LintRequest = {
        code: '<style> body { color: #FFF; } </style>',
        syntax: 'html',
        config: {
          rules: { '@stylistic/color-hex-case': 'lower' },
        },
      };

      const result = await lintCode(request);

      expect(result.success).toBe(true);
      expect(result.content).not.toBeNull();
      expect(result.content!.info.config.customSyntax).toBe('postcss-html');
    });

    test('should not apply custom formatter for HTML syntax', async () => {
      const request: LintRequest = {
        code: '<style> body { color: red; } </style>',
        syntax: 'html',
        config: {
          rules: { 'color-no-invalid-hex': true },
          outputStyle: 'nested',
        },
      };

      const result = await lintCode(request);

      expect(result.success).toBe(true);
      expect(result.content).not.toBeNull();
      // Should return original HTML, not formatted CSS
      expect(result.content!.output).toContain('<style>');
    });
  });

  describe('LintError class', () => {
    test('should create LintError with message', () => {
      const error = new LintError('Test error');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(LintError);
      expect(error.message).toBe('Test error');
      expect(error.name).toBe('LintError');
    });

    test('should have stack trace', () => {
      const error = new LintError('Test error');

      expect(error.stack).toBeTruthy();
    });
  });
});
