export type AuthTokenStore = {
  clearToken: () => void;
  getToken: () => string | undefined;
  saveToken: (token: string) => void;
};

let currentToken: string | undefined;

export const playgroundAuthTokenStore: AuthTokenStore = {
  clearToken: () => {
    currentToken = undefined;
  },
  getToken: () => currentToken,
  saveToken: token => {
    currentToken = token;
  },
};

export function clearAuthToken() {
  playgroundAuthTokenStore.clearToken();
}

export function getAuthToken() {
  return playgroundAuthTokenStore.getToken();
}

export function saveAuthToken(token: string) {
  playgroundAuthTokenStore.saveToken(token);
}
