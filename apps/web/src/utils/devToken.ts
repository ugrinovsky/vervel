// src/utils/devToken.ts
export function setupDevToken() {
  if (import.meta.env.DEV) {
    localStorage.setItem(
      'token',
      'oat_Mg.NU5DbTZTSTVDUktBX3FpVzVYUU9EUGEwbm5MNmNESjJ0c2pqYzM2VjM5MDU3NTkwNDM'
    );
    console.log('[DEV] Dev token устано влен в localStorage');
  }
}
