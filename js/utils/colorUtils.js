/**
 * Color utility functions for dynamic theme management
 */

/**
 * Convert hex color to RGB
 * @param {string} hex - Hex color code (e.g., '#FF5733')
 * @returns {object} RGB object with r, g, b properties
 */
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

/**
 * Convert RGB to hex color
 * @param {number} r - Red (0-255)
 * @param {number} g - Green (0-255)
 * @param {number} b - Blue (0-255)
 * @returns {string} Hex color code
 */
function rgbToHex(r, g, b) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

/**
 * Convert RGB to HSL
 * @param {number} r - Red (0-255)
 * @param {number} g - Green (0-255)
 * @param {number} b - Blue (0-255)
 * @returns {object} HSL object with h, s, l properties (0-360, 0-100, 0-100)
 */
function rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
        h = s = 0;
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    return {
        h: h * 360,
        s: s * 100,
        l: l * 100
    };
}

/**
 * Convert HSL to RGB
 * @param {number} h - Hue (0-360)
 * @param {number} s - Saturation (0-100)
 * @param {number} l - Lightness (0-100)
 * @returns {object} RGB object with r, g, b properties
 */
function hslToRgb(h, s, l) {
    h /= 360;
    s /= 100;
    l /= 100;
    
    let r, g, b;
    if (s === 0) {
        r = g = b = l;
    } else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }

    return {
        r: Math.round(r * 255),
        g: Math.round(g * 255),
        b: Math.round(b * 255)
    };
}

/**
 * Compute a contrasting color based on input color
 * Uses HSL adjustments to create a color that stands out with good contrast
 * Avoids muddy brown/beige tones by strategic hue selection
 * @param {string} hexColor - Hex color code
 * @returns {string} Contrasting hex color code
 */
function getContrastingColor(hexColor) {
    const rgb = hexToRgb(hexColor);
    if (!rgb) return '#d85e26'; // fallback
    
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    
    // Use WCAG relative luminance to determine contrast strategy
    const luminance = (rgb.r * 0.299 + rgb.g * 0.587 + rgb.b * 0.114) / 255;
    
    let newHsl = { ...hsl };
    
    // Prefer vibrant hues: blues, cyans, magentas, bright greens
    // Avoid: yellows, oranges, browns (yellow range 30-60 degrees)
    const preferredHues = [210, 250, 290, 330, 30]; // cyan, blue, magenta, red, lime
    const currentHue = hsl.h;
    
    // Find the nearest preferred hue
    let bestHue = preferredHues[0];
    let minDiff = 360;
    
    preferredHues.forEach(ph => {
        const diff = Math.abs(ph - currentHue);
        const wrappedDiff = diff > 180 ? 360 - diff : diff;
        if (wrappedDiff < minDiff) {
            minDiff = wrappedDiff;
            bestHue = ph;
        }
    });
    
    newHsl.h = bestHue;
    
    if (luminance < 0.35) {
        // Very dark background: use bright, saturated colors
        newHsl.l = 70;
        newHsl.s = 95;
    } else if (luminance > 0.65) {
        // Very light background: use dark, saturated colors
        newHsl.l = 40;
        newHsl.s = 90;
    } else {
        // Medium background: good contrast
        newHsl.s = 85;
        if (hsl.l > 50) {
            newHsl.l = Math.max(35, hsl.l - 25);
        } else {
            newHsl.l = Math.min(75, hsl.l + 25);
        }
    }
    
    const newRgb = hslToRgb(newHsl.h, newHsl.s, newHsl.l);
    return rgbToHex(newRgb.r, newRgb.g, newRgb.b);
}

/**
 * Set the gradient background colors and compute contrasting highlight color
 * @param {string} color1 - First gradient color (hex)
 * @param {string} color2 - Second gradient color (hex)
 */
function setBackgroundGradient(color1, color2) {
    const root = document.documentElement;
    root.style.setProperty('--gradient-color-1', color1);
    root.style.setProperty('--gradient-color-2', color2);
    
    // Average the two colors for contrast computation
    const rgb1 = hexToRgb(color1);
    const rgb2 = hexToRgb(color2);
    
    if (!rgb1 || !rgb2) return;
    
    const avgRgb = {
        r: Math.round((rgb1.r + rgb2.r) / 2),
        g: Math.round((rgb1.g + rgb2.g) / 2),
        b: Math.round((rgb1.b + rgb2.b) / 2)
    };
    
    const avgHex = rgbToHex(avgRgb.r, avgRgb.g, avgRgb.b);
    const contrastColor = getContrastingColor(avgHex);
    root.style.setProperty('--appointment-new-color', contrastColor);
    
    // Also set RGB version for use in rgba() in CSS
    const contrastRgb = hexToRgb(contrastColor);
    root.style.setProperty('--appointment-new-rgb', `${contrastRgb.r}, ${contrastRgb.g}, ${contrastRgb.b}`);
}

/**
 * Get the current gradient colors
 * @returns {object} Object with color1 and color2 properties
 */
function getBackgroundGradient() {
    const root = document.documentElement;
    const color1 = root.style.getPropertyValue('--gradient-color-1').trim() || '#020738';
    const color2 = root.style.getPropertyValue('--gradient-color-2').trim() || '#4e395c';
    return { color1, color2 };
}
