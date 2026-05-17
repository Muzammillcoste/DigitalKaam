import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'dk_access_token';
const USER_ID_KEY = 'dk_user_id';

export const storage = {
  setToken: (token: string) => SecureStore.setItemAsync(TOKEN_KEY, token),
  getToken: () => SecureStore.getItemAsync(TOKEN_KEY),
  deleteToken: () => SecureStore.deleteItemAsync(TOKEN_KEY),

  setUserId: (id: string) => SecureStore.setItemAsync(USER_ID_KEY, id),
  getUserId: () => SecureStore.getItemAsync(USER_ID_KEY),
  deleteUserId: () => SecureStore.deleteItemAsync(USER_ID_KEY),

  clearAll: async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_ID_KEY);
  },
};
