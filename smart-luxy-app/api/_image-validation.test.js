import test from 'node:test'
import assert from 'node:assert/strict'
import { getVerifiedImageExtension } from './_image-validation.js'

test('accepts matching image signatures and MIME types', () => {
  assert.equal(getVerifiedImageExtension(Buffer.from([255,216,255,...Array(12).fill(0)]), 'image/jpeg'), 'jpg')
  assert.equal(getVerifiedImageExtension(Buffer.from([137,80,78,71,13,10,26,10,...Array(8).fill(0)]), 'image/png'), 'png')
  assert.equal(getVerifiedImageExtension(Buffer.from('GIF89a000000'), 'image/gif'), 'gif')
  assert.equal(getVerifiedImageExtension(Buffer.from('RIFF0000WEBP'), 'image/webp'), 'webp')
  assert.equal(getVerifiedImageExtension(Buffer.from('0000ftypavif0000'), 'image/avif'), 'avif')
})

test('rejects MIME mismatches, non-image payloads and truncated files', () => {
  assert.throws(() => getVerifiedImageExtension(Buffer.from('<html>bad</html>'), 'image/jpeg'), /ne correspond pas/)
  assert.throws(() => getVerifiedImageExtension(Buffer.from('RIFF0000WEBP'), 'image/png'), /ne correspond pas/)
  assert.throws(() => getVerifiedImageExtension(Buffer.from('tiny'), 'image/jpeg'), /trop court/)
  assert.throws(() => getVerifiedImageExtension(Buffer.from('GIF89a000000'), 'text/html'), /non autorisé/)
})
