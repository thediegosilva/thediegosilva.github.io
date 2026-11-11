// Gerado por scripts/make-duck-sprites.py — não edite à mão.
export const DUCK_CELL = 32;
export const DUCK_COLS = 38;
/** linhas da folha: 0=E, 1=SE, 2=S, 3=SW, 4=W, 5=NW, 6=N, 7=NE */
export const DUCK_DIRS = ["E", "SE", "S", "SW", "W", "NW", "N", "NE"] as const;
export const DUCK_ANIMS = {"idle": [0, 1, 2], "walk": [3, 4, 5, 6], "fly": [7, 8, 9], "quack": [10, 11], "eat": [12, 13], "tired": [14, 15], "tilt": [16], "cover": [17, 18], "model": [19], "pointUp": [20], "pointDown": [21], "pointFwd": [22], "pointEye": [23], "tap": [24, 25], "think": [26], "cry": [27], "cross": [28], "loud": [29], "watch": [30], "measure": [31], "lie": [32], "sit": [33, 34], "carry": [35, 36, 37]} as const;
export const DUCK_SHEET = { w: 1216, h: 256 };
export const PROP_CELL = 16;
export const DUCK_PROPS = {"question": 0, "exclaim": 1, "sweat": 2, "tear": 3, "note": 4, "sparkle": 5, "heart": 6, "zzz": 7, "dots": 8, "magnifier": 9, "sign7": 10} as const;
export type DuckProp = keyof typeof DUCK_PROPS;
