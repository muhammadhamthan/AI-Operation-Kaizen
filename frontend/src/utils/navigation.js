/**
 * Smart back-navigation for all Kairox destination screens (hidden tabs +
 * modal-ish routes). Plain `router.back()` follows the expo-router history
 * stack, so if the user opened the app on Chat, switched tabs to Dashboard,
 * then tapped a card that pushed `/budget`, `router.back()` sends them to
 * Chat (their first tab) — confusing.
 *
 * These helpers force the logical parent.
 */
import { router } from 'expo-router';

const DASHBOARD = '/(main)/(tabs)/dashboard';

/**
 * Go back to the main Dashboard tab, regardless of history stack.
 * Preferred for every screen reached from a dashboard card.
 */
export const backToDashboard = () => {
  try {
    router.replace(DASHBOARD);
  } catch {
    try {
      router.back();
    } catch {
      /* noop */
    }
  }
};
