import test from 'node:test'
import assert from 'node:assert/strict'
import { assertSafeUrl, isPublicIPv4 } from './_safe-fetch.js'

test('accepts globally routable IPv4 destinations', () => {
  assert.equal(isPublicIPv4('1.1.1.1'), true)
  assert.equal(isPublicIPv4('8.8.8.8'), true)
})

test('blocks private, loopback, link-local and reserved IPv4 ranges', () => {
  const blocked = [
    '0.0.0.1', '10.0.0.1', '100.64.0.1', '127.0.0.1',
    '169.254.169.254', '172.16.0.1', '192.0.0.8',
    '192.0.2.10', '192.88.99.1', '192.168.1.1',
    '198.18.0.1', '198.51.100.10', '203.0.113.10',
    '224.0.0.1', '240.0.0.1',
  ]
  for (const address of blocked) {
    assert.equal(isPublicIPv4(address), false, address + ' must be blocked')
  }
})

test('rejects IPv6 literals, including mapped IPv4 forms', () => {
  assert.throws(() => assertSafeUrl('http://[::1]/'), /IPv6/)
  assert.throws(() => assertSafeUrl('http://[::ffff:127.0.0.1]/'), /IPv6/)
})

test('rejects private IPv4 literals and cloud metadata addresses', () => {
  assert.throws(() => assertSafeUrl('http://127.0.0.1/'), /privée ou réservée/)
  assert.throws(() => assertSafeUrl('http://169.254.169.254/latest/meta-data/'), /privée ou réservée/)
  assert.throws(() => assertSafeUrl('http://metadata.google.internal/'), /non autorisée/)
})

test('rejects unsupported protocols and URLs containing credentials', () => {
  assert.throws(() => assertSafeUrl('file:///etc/passwd'), /Protocole/)
  assert.throws(() => assertSafeUrl('https://user:pass@example.com/'), /identifiants/)
})

test('normalizes and accepts ordinary HTTPS URLs', () => {
  assert.equal(
    assertSafeUrl('https://Example.com/product?id=1'),
    'https://example.com/product?id=1'
  )
})
