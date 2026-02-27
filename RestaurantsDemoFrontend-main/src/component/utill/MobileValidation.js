

export const isValidMobileInput = (value) => {
    if (!/^\d*$/.test(value)) return false;
    if (value.length === 1 && value !== "0") return false;
    if (value.length > 10) return false;
    return true;
};


export const isAllowedKey = (key) => {
    const allowedKeys = [
        "Backspace",
        "Delete",
        "Tab",
        "ArrowLeft",
        "ArrowRight",
        "Enter",
        "Escape"
    ];
    return allowedKeys.includes(key) || /^[0-9]$/.test(key);
};
