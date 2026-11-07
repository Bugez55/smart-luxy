export function getVerifiedImageExtension(buffer, contentType) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) throw new Error('Fichier image invalide ou trop court')
  const mime = String(contentType || '').split(';')[0].trim().toLowerCase()
  const signatures = {
    'image/jpeg': buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255,
    'image/png': buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
    'image/webp': buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP',
    'image/gif': ['GIF87a', 'GIF89a'].includes(buffer.subarray(0, 6).toString('ascii')),
    'image/avif': buffer.subarray(4, 8).toString('ascii') === 'ftyp' && ['avif', 'avis'].includes(buffer.subarray(8, 12).toString('ascii')),
  }
  const extensions = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/avif': 'avif' }
  if (!Object.prototype.hasOwnProperty.call(extensions, mime)) throw new Error('Type MIME image non autorisé')
  if (!signatures[mime]) throw new Error('Le contenu du fichier ne correspond pas au type MIME annoncé')
  return extensions[mime]
}
