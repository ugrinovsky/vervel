/**
 * Разрешённые хосты для photoUrl из VK (VKWebAppGetUserInfo / CDN).
 * Не принимаем произвольные URL, чтобы не подставлять tracking/редиректы.
 */
export function isTrustedVkPhotoUrl(raw: string): boolean {
  const url = String(raw).trim()
  if (!url || url.length > 2048) {
    return false
  }
  let hostname: string
  try {
    const u = new URL(url)
    if (u.protocol !== 'https:') {
      return false
    }
    hostname = u.hostname.toLowerCase()
  } catch {
    return false
  }

  return (
    hostname.endsWith('.userapi.com') ||
    hostname === 'userapi.com' ||
    hostname.endsWith('.vkuserphoto.net') ||
    hostname.endsWith('.vk-cdn.net') ||
    hostname.endsWith('.vkusercontent.com') ||
    hostname === 'vkusercontent.com'
  )
}
