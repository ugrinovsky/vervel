import { createApi } from './baseApi';

// withCredentials is set in baseApi — the auth_token httpOnly cookie
// is sent automatically on every request to the API.
export const privateApi = createApi({ redirectOn401: true });
