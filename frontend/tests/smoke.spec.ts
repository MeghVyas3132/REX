import { test, expect } from '@playwright/test';

const mockUser = {
  id: 'test-user',
  email: 'test@example.com',
  name: 'Test User',
  createdAt: new Date().toISOString(),
};

const jsonHeaders = { 'content-type': 'application/json' };

test.beforeEach(async ({ page }) => {
  await page.addInitScript(({ user, token }) => {
    window.localStorage.setItem('auth_token', token);
    window.localStorage.setItem('refresh_token', 'refresh-token');
    window.localStorage.setItem('auth_user', JSON.stringify(user));

    class MockEventSource {
      url: string;
      readyState = 1;
      private listeners: Record<string, ((event: MessageEvent) => void)[]> = {};

      constructor(url: string) {
        this.url = url;
        setTimeout(() => {
          this.dispatch('connected', {});
          this.dispatch('workflow:start', { runId: 'mock-run', data: {} });
          this.dispatch('node:start', { nodeId: 'manual-node', data: {} });
          this.dispatch('node:success', { nodeId: 'manual-node', data: { result: { message: 'hello' } } });
          this.dispatch('workflow:complete', { runId: 'mock-run', data: {} });
          this.dispatch('run:complete', { runId: 'mock-run', data: { nodeResults: {} } });
        }, 50);
      }

      addEventListener(type: string, callback: (event: MessageEvent) => void) {
        if (!this.listeners[type]) {
          this.listeners[type] = [];
        }
        this.listeners[type].push(callback);
      }

      removeEventListener(type: string, callback: (event: MessageEvent) => void) {
        if (!this.listeners[type]) return;
        this.listeners[type] = this.listeners[type].filter((cb) => cb !== callback);
      }

      dispatch(type: string, payload: any) {
        const event = { data: JSON.stringify(payload) } as MessageEvent;
        (this.listeners[type] || []).forEach((cb) => cb(event));
      }

      close() {
        this.readyState = 2;
      }
    }

    // @ts-ignore override global EventSource for deterministic tests
    window.EventSource = MockEventSource;
  }, { user: mockUser, token: 'test-token' });

  await page.route('**/api/auth/verify', (route) =>
    route.fulfill({ status: 200, headers: jsonHeaders, body: JSON.stringify({ ok: true }) }),
  );

  await page.route('**/api/**', async (route) => {
    const url = route.request().url();
    if (url.includes('/api/workflows/runs/stream')) {
      await route.fulfill({ status: 200, body: '' });
      return;
    }

    if (url.includes('/api/workflows/nodes') && url.endsWith('/schema')) {
      await route.fulfill({
        status: 200,
        headers: jsonHeaders,
        body: JSON.stringify({ data: { fields: [] } }),
      });
      return;
    }

    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 200,
        headers: jsonHeaders,
        body: JSON.stringify({ data: { ok: true } }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      headers: jsonHeaders,
      body: JSON.stringify({ data: {} }),
    });
  });
});

test('user can create and run a simple manual workflow', async ({ page }) => {
  await page.goto('/studio');

  await expect(page.getByTestId('create-workflow-button')).toBeVisible();
  await page.getByTestId('create-workflow-button').click();

  await expect(page.getByTestId('workflow-studio-view')).toBeVisible();
  await expect(page.getByTestId('start-building-button')).toBeVisible();
  await page.getByTestId('start-building-button').click();
  await expect(page.getByTestId('workflow-canvas')).toBeVisible();

  const sidebar = page.getByTestId('node-sidebar');
  await expect(sidebar).toBeVisible();

  const manualNodeCard = page.getByTestId('node-card-manual');
  await manualNodeCard.dragTo(page.getByTestId('workflow-canvas'));

  const configPanel = page.getByTestId('node-config-panel');
  await expect(configPanel).toBeVisible();
  await configPanel.getByLabel('Button Text').fill('Run Smoke');
  await configPanel.getByLabel('Input Data (JSON)').fill('{"message":"hello"}');
  await configPanel.getByTestId('save-node-config-button').click();
  await expect(configPanel).toBeHidden();

  await page.getByTestId('run-workflow-button').click();

  const outputPanel = page.getByTestId('output-panel');
  await expect(outputPanel).toBeVisible();
  await expect(outputPanel).toContainText('Workflow Execution');
});

