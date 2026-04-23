/**
 * Smart back-navigation for all Kairox destination screens (hidden tabs +
 * modal-ish routes). `router.back()` follows the expo-router history stack
 * so if the user arrived at the app on `chat`, switched to `dashboard`, then
 * tapped a card that pushed into `/budget`, `router.back()` sends them back
 * to `chat` (their first tab) — confusing.
 *
 * This helper prefers a direct replace to `/dashboard` when we know that's
 * the logical parent.
 */
import { router } from 'expo-router';

export const backToDashboard = () => {
  try {
    router.replace('/(main)/(tabs)/dashboard');
  } catch {
    router.back();
  }
};
