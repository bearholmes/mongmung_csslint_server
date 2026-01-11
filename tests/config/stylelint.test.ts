import { describe, test, expect } from 'bun:test';
import {
  createStylelintConfig,
  DEFAULT_EXTENDS,
  DEFAULT_PLUGINS,
} from '../../src/config/stylelint';

describe('stylelint config', () => {
  describe('createStylelintConfig', () => {
    test('should create config with css syntax', () => {
      const rules = { 'color-hex-case': 'lower' };
      const config = createStylelintConfig(rules, 'css');

      expect(config.extends).toEqual([...DEFAULT_EXTENDS]);
      expect(config.plugins).toEqual([...DEFAULT_PLUGINS]);
      expect(config.rules).toEqual(rules);
      expect(config.customSyntax).toBeUndefined();
    });

    test('should create config with html syntax and postcss-html parser', () => {
      const rules = { 'color-hex-case': 'lower' };
      const config = createStylelintConfig(rules, 'html');

      expect(config.extends).toEqual([...DEFAULT_EXTENDS]);
      expect(config.plugins).toEqual([...DEFAULT_PLUGINS]);
      expect(config.rules).toEqual(rules);
      expect(config.customSyntax).toBe('postcss-html');
    });

    test('should preserve user rules without mutation', () => {
      const rules = { 'color-hex-case': 'lower', indentation: 2 };
      const originalRules = { ...rules };
      const config = createStylelintConfig(rules, 'css');

      expect(config.rules).toEqual(originalRules);
      expect(rules).toEqual(originalRules); // Original should not be mutated
    });

    test('should create independent config instances', () => {
      const rules1 = { 'color-hex-case': 'lower' };
      const rules2 = { 'color-hex-case': 'upper' };

      const config1 = createStylelintConfig(rules1, 'css');
      const config2 = createStylelintConfig(rules2, 'html');

      expect(config1.rules).toEqual(rules1);
      expect(config2.rules).toEqual(rules2);
      expect(config1.customSyntax).toBeUndefined();
      expect(config2.customSyntax).toBe('postcss-html');
    });

    test('should include all default extends', () => {
      const config = createStylelintConfig({}, 'css');

      expect(config.extends).toContain('stylelint-config-standard');
      expect(config.extends).toContain('stylelint-config-recommended-scss');
      expect(config.extends).toContain('stylelint-config-recommended-vue');
    });

    test('should include all default plugins', () => {
      const config = createStylelintConfig({}, 'css');

      expect(config.plugins).toContain('stylelint-order');
      expect(config.plugins).toContain('@stylistic/stylelint-plugin');
    });
  });

  describe('constants', () => {
    test('DEFAULT_EXTENDS should be readonly array', () => {
      expect(Array.isArray(DEFAULT_EXTENDS)).toBe(true);
      expect(DEFAULT_EXTENDS.length).toBe(3);
    });

    test('DEFAULT_PLUGINS should be readonly array', () => {
      expect(Array.isArray(DEFAULT_PLUGINS)).toBe(true);
      expect(DEFAULT_PLUGINS.length).toBe(2);
    });
  });
});
