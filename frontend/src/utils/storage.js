import AsyncStorage from '@react-native-async-storage/async-storage';

const USER_KEY = '@maintenance_app_user';
const THEME_KEY = '@maintenance_app_theme';

export const saveUser = async (user) => {
  try {
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
    return true;
  } catch (error) {
    console.error('Error saving user:', error);
    return false;
  }
};

export const loadUser = async () => {
  try {
    const userJson = await AsyncStorage.getItem(USER_KEY);
    return userJson ? JSON.parse(userJson) : null;
  } catch (error) {
    console.error('Error loading user:', error);
    return null;
  }
};

export const removeUser = async () => {
  try {
    await AsyncStorage.removeItem(USER_KEY);
    return true;
  } catch (error) {
    console.error('Error removing user:', error);
    return false;
  }
};

export const saveTheme = async (theme) => {
  try {
    await AsyncStorage.setItem(THEME_KEY, theme);
    return true;
  } catch (error) {
    console.error('Error saving theme:', error);
    return false;
  }
};

export const loadTheme = async () => {
  try {
    return await AsyncStorage.getItem(THEME_KEY);
  } catch (error) {
    console.error('Error loading theme:', error);
    return null;
  }
};
