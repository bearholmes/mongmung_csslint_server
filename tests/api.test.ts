import { describe, test, expect } from 'bun:test';
import { app } from '../src/index';

type HealthResponse = {
  status: string;
  timestamp: string;
  uptime: number;
  environment: string;
};

type LintResponse = {
  success: boolean;
  message?: string;
  content?: {
    output?: string;
    info?: {
      version?: string;
      config: {
        customSyntax?: string;
        extends: unknown[];
        plugins: unknown[];
      };
    };
  } | null;
};

describe('API Integration Tests', () => {
  describe('GET /', () => {
    test('should return ASCII art welcome message', async () => {
      const response = await app
        .handle(new Request('http://localhost/'))
        .then((res) => res.text());

      // Check for ASCII art content
      expect(response).toBeTruthy();
      expect(response.length).toBeGreaterThan(50);
    });
  });

  describe('GET /health', () => {
    test('should return health status', async () => {
      const response = await app.handle(new Request('http://localhost/health'));
      const data = (await response.json()) as HealthResponse;

      expect(response.status).toBe(200);
      expect(data.status).toBe('ok');
      expect(data.timestamp).toBeTruthy();
      expect(typeof data.uptime).toBe('number');
      expect(data.environment).toBeTruthy();
    });

    test('should return valid ISO timestamp', async () => {
      const response = await app.handle(new Request('http://localhost/health'));
      const data = (await response.json()) as HealthResponse;

      const timestamp = new Date(data.timestamp);
      expect(timestamp.toString()).not.toBe('Invalid Date');
    });

    test('should return positive uptime', async () => {
      const response = await app.handle(new Request('http://localhost/health'));
      const data = (await response.json()) as HealthResponse;

      expect(data.uptime).toBeGreaterThan(0);
    });
  });

  describe('POST /lint', () => {
    test('should lint valid CSS successfully', async () => {
      const request = new Request('http://localhost/lint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: 'body { color: #FFF; }',
          syntax: 'css',
          config: {
            rules: { '@stylistic/color-hex-case': 'lower' },
            outputStyle: 'compact',
          },
        }),
      });

      const response = await app.handle(request);
      const data = (await response.json()) as LintResponse;

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('성공');
      expect(data.content).toBeTruthy();
      const content = data.content!;
      expect(content.output).toContain('#fff');
    });

    test('should return nested format when requested', async () => {
      const request = new Request('http://localhost/lint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: 'body{color:red;margin:0;}',
          syntax: 'css',
          config: {
            rules: { 'color-no-invalid-hex': true },
            outputStyle: 'nested',
          },
        }),
      });

      const response = await app.handle(request);
      const data = (await response.json()) as LintResponse;

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      const content = data.content!;
      expect(content.output).toContain('{\n');
    });

    test('should return 400 for empty code', async () => {
      const request = new Request('http://localhost/lint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: '',
          syntax: 'css',
          config: {
            rules: { '@stylistic/color-hex-case': 'lower' },
          },
        }),
      });

      const response = await app.handle(request);

      // Elysia minLength validation triggers 400 or 422
      expect([400, 422]).toContain(response.status);
    });

    test('should return 400 for invalid syntax', async () => {
      const request = new Request('http://localhost/lint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: 'body { color: red; }',
          syntax: 'invalid',
          config: {
            rules: { '@stylistic/color-hex-case': 'lower' },
          },
        }),
      });

      const response = await app.handle(request);
      const data = (await response.json()) as LintResponse;

      expect([400, 422]).toContain(response.status);
      expect(data.success).toBe(false);
      expect(String(data.message)).toBeTruthy();
    });

    test('should return 400 for empty rules', async () => {
      const request = new Request('http://localhost/lint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: 'body { color: red; }',
          syntax: 'css',
          config: {
            rules: {},
          },
        }),
      });

      const response = await app.handle(request);
      const data = (await response.json()) as LintResponse;

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.message).toContain('규칙');
    });

    test('should handle HTML syntax with postcss-html', async () => {
      const request = new Request('http://localhost/lint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: '<style> body { color: #FFF; } </style>',
          syntax: 'html',
          config: {
            rules: { '@stylistic/color-hex-case': 'lower' },
          },
        }),
      });

      const response = await app.handle(request);
      const data = (await response.json()) as LintResponse;

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      const content = data.content!;
      expect(content.info?.config.customSyntax).toBe('postcss-html');
    });

    test('should include version and config info in response', async () => {
      const request = new Request('http://localhost/lint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: 'body { color: red; }',
          syntax: 'css',
          config: {
            rules: { 'color-no-invalid-hex': true },
          },
        }),
      });

      const response = await app.handle(request);
      const data = (await response.json()) as LintResponse;

      expect(response.status).toBe(200);
      const content = data.content!;
      expect(content.info?.version).toBeTruthy();
      expect(content.info?.config.extends).toBeArray();
      expect(content.info?.config.extends.length).toBeGreaterThan(0);
      expect(content.info?.config.plugins).toBeArray();
      expect(content.info?.config.plugins.length).toBeGreaterThan(0);
    });

    test('should handle complex CSS with multiple rules', async () => {
      const request = new Request('http://localhost/lint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: `
            body {
              color: #FFFFFF;
              background: #000000;
            }
            .header {
              margin: 0px;
              padding: 0px;
            }
          `,
          syntax: 'css',
          config: {
            rules: {
              '@stylistic/color-hex-case': 'lower',
              'length-zero-no-unit': true,
            },
            outputStyle: 'nested',
          },
        }),
      });

      const response = await app.handle(request);
      const data = (await response.json()) as LintResponse;

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      // Stylelint may shorten hex colors (#ffffff -> #fff)
      const content = data.content!;
      expect(content.output?.toLowerCase()).toMatch(/#f{3,6}/);
      expect(content.output?.toLowerCase()).toMatch(/#0{3,6}/);
    });
  });

  describe('Error Handling', () => {
    test('should return 404 for unknown routes', async () => {
      const response = await app.handle(
        new Request('http://localhost/unknown'),
      );
      const text = await response.text();

      expect(response.status).toBe(404);
      // ASCII art for "Not Found"
      expect(text).toBeTruthy();
      expect(text.length).toBeGreaterThan(50);
    });

    test('should handle malformed JSON', async () => {
      const request = new Request('http://localhost/lint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: 'invalid json',
      });

      const response = await app.handle(request);

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });
});
