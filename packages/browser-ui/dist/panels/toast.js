/**
 * Toast notification component
 */
import { TOAST_ID } from '../diana/constants.js';
const TOAST_DURATION = 3000;
/**
 * Show toast notification
 */
export function showToast(options) {
    const { message, duration = TOAST_DURATION, state = 'info' } = options;
    let toast = document.getElementById(TOAST_ID);
    if (!toast) {
        toast = document.createElement('div');
        toast.id = TOAST_ID;
        Object.assign(toast.style, {
            position: 'fixed',
            zIndex: '2147483647',
            right: '22px',
            bottom: '112px',
            maxWidth: 'min(300px, calc(100vw - 44px))',
            border: '1px solid rgba(96,165,250,0.42)',
            borderRadius: '8px',
            background: 'rgba(15,23,42,0.94)',
            color: '#dbeafe',
            padding: '8px 10px',
            font: '12px/1.45 ui-sans-serif,system-ui,sans-serif',
            fontWeight: '800',
            boxShadow: '0 14px 36px rgba(15,23,42,0.36)',
            opacity: '0',
            transition: 'opacity 0.2s',
        });
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.style.opacity = '1';
    // Auto-hide after duration
    setTimeout(() => {
        toast.style.opacity = '0';
    }, duration);
}
/**
 * Hide toast notification
 */
export function hideToast() {
    const toast = document.getElementById(TOAST_ID);
    if (toast) {
        toast.style.opacity = '0';
    }
}
/**
 * Remove toast element
 */
export function removeToast() {
    const toast = document.getElementById(TOAST_ID);
    if (toast && toast.parentNode) {
        toast.parentNode.removeChild(toast);
    }
}
//# sourceMappingURL=toast.js.map