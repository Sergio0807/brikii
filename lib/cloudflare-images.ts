/**
 * Construit une URL de miniature optimisée pour Cloudflare Images.
 * Si l'URL n'est pas une URL Cloudflare Images, retourne l'URL telle quelle.
 *
 * Format Cloudflare Images : https://imagedelivery.net/<hash>/<image_id>/<variant>
 * On remplace le dernier segment (variant) par un variant flexible : "w=<width>"
 * (nécessite que "flexible variants" soit activé dans le dashboard Cloudflare)
 */
export function bienPhotoThumbUrl(
  url: string | null | undefined,
  width = 160,
): string | null {
  if (!url) return null

  if (url.includes('imagedelivery.net')) {
    const parts = url.split('/')
    // Format attendu : https: '' 'imagedelivery.net' <hash> <id> <variant>  (6 segments)
    if (parts.length >= 5) {
      parts[parts.length - 1] = `w=${width}`
      return parts.join('/')
    }
  }

  // URL R2 directe ou autre — utiliser telle quelle
  return url
}
