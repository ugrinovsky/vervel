/**
 * Сервер выдаёт служебный email вида `vk_<id>@vkid.user` для OAuth без пароля.
 * В UI это не почта — показываем нейтральные формулировки, без привязки к бренду провайдера.
 */
const OAUTH_PLACEHOLDER_EMAIL = /^vk_\d+@vkid\.user$/i;

export function isOAuthPlaceholderEmail(email: string | null | undefined): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }
  return OAUTH_PLACEHOLDER_EMAIL.test(email.trim());
}

/** Подпись под именем: реальный email или нейтральная фраза для плейсхолдера. */
export function profileEmailSubtitle(email: string | null | undefined): string | null {
  if (!email) {
    return null;
  }
  if (isOAuthPlaceholderEmail(email)) {
    return 'Вход без пароля';
  }
  return email;
}
