
// Helper function to normalize a value within a given range
export const normalizeValue = (value: number, min: number, max: number): number => {
    if (max === min) {
        return 0.5; // Avoid division by zero, return midpoint
    }
    const clampedValue = Math.max(min, Math.min(value, max));
    return (clampedValue - min) / (max - min);
};

// Helper function to get a heatmap color (blue -> yellow -> red) for a normalized value (0-1)
export const getHeatmapColor = (value: number): string => {
    // Ensure value is clamped between 0 and 1
    const clampedValue = Math.max(0, Math.min(1, value));
    // Simple gradient: Blue (hsl(240, 100%, 50%)) -> Red (hsl(0, 100%, 50%))
    // Hue ranges from 240 (blue) down to 0 (red)
    const hue = (1 - clampedValue) * 240;
    return `hsl(${hue}, 100%, 50%)`;
};
