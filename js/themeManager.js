/**
 * Theme Manager - Handles gradient colors from URL parameters
 * 
 * URL Parameters:
 * - bgColor1: First gradient color (hex, e.g., ?bgColor1=%23FF5733)
 * - bgColor2: Second gradient color (hex, e.g., ?bgColor2=%232E86AB)
 * 
 * Examples:
 * ?bgColor1=%23FF5733&bgColor2=%232E86AB
 * ?bgColor1=FF5733&bgColor2=2E86AB (without #)
 */

(function() {
    'use strict';

    /**
     * Parse URL parameters
     * @returns {object} Object with parameter key-value pairs
     */
    function getUrlParams() {
        const params = {};
        const queryString = window.location.search.substring(1);
        
        if (!queryString) return params;
        
        queryString.split('&').forEach(param => {
            const [key, value] = param.split('=');
            params[decodeURIComponent(key)] = decodeURIComponent(value || '');
        });
        
        return params;
    }

    /**
     * Normalize hex color to include # prefix
     * @param {string} color - Color string
     * @returns {string} Normalized hex color
     */
    function normalizeHexColor(color) {
        if (!color) return null;
        color = color.trim();
        if (!color.match(/^#?[0-9A-Fa-f]{6}$/)) return null;
        return color.startsWith('#') ? color : '#' + color;
    }

    /**
     * Initialize theme from URL parameters
     */
    function initTheme() {
        const params = getUrlParams();
        const bgColor1 = normalizeHexColor(params.bgColor1);
        const bgColor2 = normalizeHexColor(params.bgColor2);

        if (bgColor1 && bgColor2) {
            // Both colors provided
            setBackgroundGradient(bgColor1, bgColor2);
            console.log(`Theme set: ${bgColor1} to ${bgColor2}`);
        } else if (bgColor1) {
            // Only first color provided, use a lighter/darker variant
            const rgb = hexToRgb(bgColor1);
            const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
            const variantHsl = {
                ...hsl,
                l: Math.max(10, Math.min(90, hsl.l + (hsl.l > 50 ? -20 : 20)))
            };
            const variantRgb = hslToRgb(variantHsl.h, variantHsl.s, variantHsl.l);
            const bgColor2Computed = rgbToHex(variantRgb.r, variantRgb.g, variantRgb.b);
            setBackgroundGradient(bgColor1, bgColor2Computed);
            console.log(`Theme set: ${bgColor1} to ${bgColor2Computed} (computed)`);
        } else if (bgColor2) {
            // Only second color provided, use a lighter/darker variant
            const rgb = hexToRgb(bgColor2);
            const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
            const variantHsl = {
                ...hsl,
                l: Math.max(10, Math.min(90, hsl.l + (hsl.l > 50 ? -20 : 20)))
            };
            const variantRgb = hslToRgb(variantHsl.h, variantHsl.s, variantHsl.l);
            const bgColor1Computed = rgbToHex(variantRgb.r, variantRgb.g, variantRgb.b);
            setBackgroundGradient(bgColor1Computed, bgColor2);
            console.log(`Theme set: ${bgColor1Computed} (computed) to ${bgColor2}`);
        }
    }

    // Initialize theme when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initTheme);
    } else {
        initTheme();
    }

    // Expose functions globally for programmatic access
    window.themeManager = {
        initTheme,
        getUrlParams,
        setBackgroundGradient,
        getBackgroundGradient,
        getContrastingColor
    };
})();
