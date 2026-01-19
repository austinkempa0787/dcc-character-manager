/**
 * Auto-resize utility for text inputs and textareas
 */

/**
 * Auto-resize text inputs and textareas based on content
 * @param {HTMLElement} input - The input or textarea element
 */
export function autoResizeInput(input) {
    if (input.tagName === 'TEXTAREA') {
        // For textareas, adjust height
        input.style.height = 'auto';
        input.style.height = input.scrollHeight + 'px';
    } else if (input.tagName === 'INPUT' && input.type === 'text') {
        // For text inputs, adjust width
        const minWidth = 100; // minimum width in pixels
        const padding = 20; // extra padding
        
        // Create a temporary span to measure text width
        const span = document.createElement('span');
        span.style.visibility = 'hidden';
        span.style.position = 'absolute';
        span.style.whiteSpace = 'pre';
        span.style.font = window.getComputedStyle(input).font;
        span.textContent = input.value || input.placeholder || '';
        document.body.appendChild(span);
        
        const textWidth = span.offsetWidth + padding;
        document.body.removeChild(span);
        
        input.style.width = Math.max(minWidth, textWidth) + 'px';
    }
}

/**
 * Setup auto-resize for an element
 * @param {HTMLElement} element - The element to setup
 */
export function setupAutoResize(element) {
    autoResizeInput(element);
    element.addEventListener('input', () => autoResizeInput(element));
}
