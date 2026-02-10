// DOM Elements
const hexDisplay = document.getElementById('hex-value');
const rSlider = document.getElementById('r-slider');
const gSlider = document.getElementById('g-slider');
const bSlider = document.getElementById('b-slider');
const paletteContainer = document.getElementById('palette-scale');
const bgSwatches = document.querySelectorAll('.bg-swatch');

// Advanced Controls Elements
const controls = {
    darkAmount: document.getElementById('ctrl-dark-amount'),
    darknessScale: document.getElementById('ctrl-darkness-scale'),
    darkHue: document.getElementById('ctrl-dark-hue'),
    darkSat: document.getElementById('ctrl-dark-sat'),
    lightAmount: document.getElementById('ctrl-light-amount'),
    lightnessScale: document.getElementById('ctrl-lightness-scale'),
    lightHue: document.getElementById('ctrl-light-hue'),
    lightSat: document.getElementById('ctrl-light-sat')
};

const displayValues = {
    darkAmount: document.getElementById('val-dark-amount'),
    darknessScale: document.getElementById('val-darkness-scale'),
    darkHue: document.getElementById('val-dark-hue'),
    darkSat: document.getElementById('val-dark-sat'),
    lightAmount: document.getElementById('val-light-amount'),
    lightnessScale: document.getElementById('val-lightness-scale'),
    lightHue: document.getElementById('val-light-hue'),
    lightSat: document.getElementById('val-light-sat')
};

// Buttons
const btnCopySvg = document.getElementById('btn-copy-svg');
const btnCopyColors = document.getElementById('btn-copy-colors');
const btnRandomizeAll = document.getElementById('btn-randomize-all');
const btnRandomizeColor = document.getElementById('btn-randomize-color');

// State
let state = {
    r: 29,
    g: 154,
    b: 108,
    settings: {
        darkAmount: 5,
        darknessScale: 10,  // % of darkness
        darkHue: 0,
        darkSat: 0,
        lightAmount: 6,
        lightnessScale: 95, // % of lightness
        lightHue: 0,
        lightSat: 0
    }
};

// --- Initialization ---
function init() {
    updateStateFromDOM();
    addEventListeners();
    render();
}

// --- Event Listeners ---
function addEventListeners() {
    // RGB Sliders
    [rSlider, gSlider, bSlider].forEach(slider => {
        slider.addEventListener('input', () => {
            state.r = parseInt(rSlider.value);
            state.g = parseInt(gSlider.value);
            state.b = parseInt(bSlider.value);
            render();
        });
    });

    // Advanced Controls
    Object.keys(controls).forEach(key => {
        controls[key].addEventListener('input', (e) => {
            state.settings[key] = parseInt(e.target.value);
            updateDisplayValue(key);
            render();
        });
    });

    // Background Swatches
    bgSwatches.forEach(swatch => {
        swatch.addEventListener('click', () => {
            document.body.style.backgroundColor = swatch.dataset.bg;
            // Adjust text color based on background brightness for visibility
            const rgb = hexToRgb(swatch.dataset.bg);
            const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
            document.documentElement.style.setProperty('--text-color', luminance > 0.5 ? '#111111' : '#ffffff');
            document.documentElement.style.setProperty('--slider-track', luminance > 0.5 ? '#e0e0e0' : '#444444');
            document.documentElement.style.setProperty('--slider-thumb', luminance > 0.5 ? '#111111' : '#ffffff');
            document.documentElement.style.setProperty('--border-color', luminance > 0.5 ? '#e0e0e0' : '#444444');
        });
    });

    // Buttons
    btnRandomizeColor.addEventListener('click', randomizeColor);
    btnRandomizeAll.addEventListener('click', randomizeAll);
    btnCopyColors.addEventListener('click', copyColorsToClipboard);
    btnCopySvg.addEventListener('click', copySvgToClipboard);
}

function updateStateFromDOM() {
    state.r = parseInt(rSlider.value);
    state.g = parseInt(gSlider.value);
    state.b = parseInt(bSlider.value);

    Object.keys(controls).forEach(key => {
        state.settings[key] = parseInt(controls[key].value);
        updateDisplayValue(key);
    });
}

function updateDisplayValue(key) {
    let val = state.settings[key];
    let suffix = '';
    if (key.includes('Scale') || key.includes('Sat')) suffix = '%';
    if (key.includes('Hue')) suffix = '°';
    displayValues[key].textContent = val + suffix;
}

// --- Core Logic ---

function render() {
    // 1. Update HEX Display
    const hex = rgbToHex(state.r, state.g, state.b);
    hexDisplay.textContent = hex;

    // 2. Generate Palette
    const palette = generatePalette(state.r, state.g, state.b, state.settings);

    // 3. Render HTML
    paletteContainer.innerHTML = '';
    palette.forEach(color => {
        const div = document.createElement('div');
        div.className = 'color-block';
        div.style.backgroundColor = color;
        div.dataset.color = color;
        div.addEventListener('click', () => {
            navigator.clipboard.writeText(color).then(() => {
                // Optional: minimal feedback?
                const originalText = div.dataset.color;
                div.dataset.color = "Copied!";
                setTimeout(() => div.dataset.color = originalText, 1000);
            });
        });
        paletteContainer.appendChild(div);
    });
}

function generatePalette(r, g, b, settings) {
    const baseHsl = rgbToHsl(r, g, b);
    const colors = [];

    // Dark Colors (prepended)
    // We want 'darkAmount' colors.
    // Target Dark Color:
    // L decreases TO (settings.darknessScale / 100 * baseL) ? No, usually "darkness %" means how much BLACK we mix interactively. 
    // Let's interpret "Darkness %" as the Limit Luminosity relative to 0. 
    // If Darkness % is 100, we go to 0L. If 0, we stay at baseL.
    // Actually, common logic: TargetL = BaseL * (1 - settings.darknessScale/100).
    // Let's stick with that.

    // Hue rotates by settings.darkHue total. 
    // Saturation shifts by settings.darkSat total.

    for (let i = settings.darkAmount; i > 0; i--) {
        const step = i / settings.darkAmount; // 1.0 (furthest) to 1/N (closest)

        // Interpolate
        let h = (baseHsl.h - (settings.darkHue * step));
        let s = (baseHsl.s - (settings.darkSat * step));

        // L interpolation can be tricky. Linear is simplest.
        // If darknessScale is small (e.g. 10%), we want the darkest color to be slightly darker.
        // If darknessScale is 100%, darkest is black.
        // Delta L = BaseL * (settings.darknessScale/100).
        // DarkestL = BaseL - DeltaL.
        // Current L = BaseL - (DeltaL * step).
        const deltaL = baseHsl.l * (settings.darknessScale / 100);
        let l = baseHsl.l - (deltaL * step);

        colors.push(hslToHex(h, s, l));
    }

    // Base Color
    colors.push(rgbToHex(r, g, b));

    // Light Colors (appended)
    for (let i = 1; i <= settings.lightAmount; i++) {
        const step = i / settings.lightAmount;

        let h = (baseHsl.h + (settings.lightHue * step));
        let s = (baseHsl.s + (settings.lightSat * step));

        // Target L = BaseL + (100 - BaseL) * (settings.lightnessScale / 100).
        const deltaL = (100 - baseHsl.l) * (settings.lightnessScale / 100);
        let l = baseHsl.l + (deltaL * step);

        colors.push(hslToHex(h, s, l));
    }

    return colors;
}

function randomizeColor() {
    state.r = Math.floor(Math.random() * 256);
    state.g = Math.floor(Math.random() * 256);
    state.b = Math.floor(Math.random() * 256);

    rSlider.value = state.r;
    gSlider.value = state.g;
    bSlider.value = state.b;

    render();
}

function randomizeAll() {
    randomizeColor();

    // Randomize settings moderately
    state.settings.darkAmount = Math.floor(Math.random() * 8) + 2;
    state.settings.lightAmount = Math.floor(Math.random() * 8) + 2;
    state.settings.darknessScale = Math.floor(Math.random() * 80) + 10;
    state.settings.lightnessScale = Math.floor(Math.random() * 80) + 10;
    state.settings.darkHue = Math.floor(Math.random() * 60) - 30;
    state.settings.lightHue = Math.floor(Math.random() * 60) - 30;

    // Update DOM
    controls.darkAmount.value = state.settings.darkAmount;
    controls.lightAmount.value = state.settings.lightAmount;
    controls.darknessScale.value = state.settings.darknessScale;
    controls.lightnessScale.value = state.settings.lightnessScale;
    controls.darkHue.value = state.settings.darkHue;
    controls.lightHue.value = state.settings.lightHue;

    Object.keys(controls).forEach(key => updateDisplayValue(key));

    render();
}

function copyColorsToClipboard() {
    const palette = generatePalette(state.r, state.g, state.b, state.settings);
    const text = palette.join(', ');
    navigator.clipboard.writeText(text).then(() => {
        btnCopyColors.textContent = "Copied!";
        setTimeout(() => btnCopyColors.textContent = "Copy colors", 1500);
    });
}

function copySvgToClipboard() {
    const palette = generatePalette(state.r, state.g, state.b, state.settings);
    const width = palette.length * 50;
    const height = 100;
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`;

    palette.forEach((color, index) => {
        svg += `<rect x="${index * 50}" y="0" width="50" height="${height}" fill="${color}" />`;
    });

    svg += `</svg>`;

    navigator.clipboard.writeText(svg).then(() => {
        const originalText = btnCopySvg.textContent;
        btnCopySvg.textContent = "Copied!";
        setTimeout(() => btnCopySvg.textContent = originalText, 1500);
    });
}

// --- Utils ---

function rgbToHex(r, g, b) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
}

function hexToRgb(hex) {
    const bigint = parseInt(hex.substring(1), 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return { r, g, b };
}

function rgbToHsl(r, g, b) {
    r /= 255, g /= 255, b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
        h = s = 0; // achromatic
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

    return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToHex(h, s, l) {
    h = h % 360;
    if (h < 0) h += 360;
    s = Math.max(0, Math.min(100, s));
    l = Math.max(0, Math.min(100, l));

    s /= 100;
    l /= 100;

    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    let r = 0, g = 0, b = 0;

    if (0 <= h && h < 60) { r = c; g = x; b = 0; }
    else if (60 <= h && h < 120) { r = x; g = c; b = 0; }
    else if (120 <= h && h < 180) { r = 0; g = c; b = x; }
    else if (180 <= h && h < 240) { r = 0; g = x; b = c; }
    else if (240 <= h && h < 300) { r = x; g = 0; b = c; }
    else if (300 <= h && h < 360) { r = c; g = 0; b = x; }

    r = Math.round((r + m) * 255);
    g = Math.round((g + m) * 255);
    b = Math.round((b + m) * 255);

    return rgbToHex(r, g, b);
}

// Start
init();
