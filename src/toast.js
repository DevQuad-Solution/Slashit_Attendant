/**
 * toast.js — lightweight notification singleton.
 *
 * Import this in feature pages instead of importing from App.jsx.
 * App.jsx imports this too, wiring up the actual display function.
 * This breaks the App ↔ features circular dependency.
 *
 * Usage:
 *   import { toast } from '../../toast';       // from components/layout/
 *   import { toast } from '../../../toast';     // from features/*\/pages/
 *
 *   toast.success('Saved');
 *   toast.error('Something went wrong');
 */

let _show = null;

export const toast = {
  success: (m) => _show?.({ m, t: 'success' }),
  error:   (m) => _show?.({ m, t: 'error' }),
};

/** Called once by ToastProvider in App.jsx to wire up the display function. */
export const _wireToast = (fn) => { _show = fn; };
