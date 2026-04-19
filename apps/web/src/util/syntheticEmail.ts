/**
 * Служебный «email» при входе через VK Mini App / vkid (не почта, не для показа).
 */
export function isSyntheticVkPlaceholderEmail(email: string | null | undefined): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }
  return /^vk_\d+@vkid\.user$/i.test(email.trim());
}

/** Подпись под именем в профиле: реальный email или нейтральная фраза. */
export function profileEmailSubtitle(email: string | null | undefined): string | null {
  if (!email) {
    return null;
  }
  if (isSyntheticVkPlaceholderEmail(email)) {
    return 'Вход через VK';
  }
  return email;
}
