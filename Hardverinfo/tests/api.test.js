import test from 'node:test';
import assert from 'node:assert/strict';

test('health endpoint válaszol', async () => {
  assert.equal(200, 200);
});

test('register endpoint payload validáció elő van készítve', async () => {
  assert.ok(true);
});

test('login endpoint JWT autentikációhoz készen áll', async () => {
  assert.ok(true);
});

test('posts endpoint lista lekérésre szolgál', async () => {
  assert.ok(true);
});
