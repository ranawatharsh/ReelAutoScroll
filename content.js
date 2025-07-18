/**
 * @file content.js
 * @description This script runs on Instagram pages to enable automatic scrolling of Reels.
 * @version 1.2 - Implemented a much more robust scrolling logic.
 */

console.log("Instagram Auto-Reel Scroller v1.2: Content script loaded.");

// --- CONFIGURATION --- //

// Using a "contains" selector for the aria-label to be more flexible.
const NEXT_BUTTON_SELECTOR = '[aria-label*="Next"]';
const REEL_VIDEO_SELECTOR = 'video';
const REELS_CONTAINER_SELECTOR = 'main';

const OBSERVER_CONFIG = {
    childList: true,
    subtree: true
};

// --- CORE LOGIC --- //

/**
 * Scrolls to the next reel using a multi-step, robust strategy.
 * @param {Event} event - The 'ended' event from the video element.
 */
function scrollToNextReel(event) {
    console.log("Reel finished. Attempting smart scroll.");

    // --- Method 1: Try to find and click the 'Next' button ---
    const nextButton = document.querySelector(NEXT_BUTTON_SELECTOR);
    if (nextButton) {
        console.log("Success (Method 1): Found 'Next' button. Clicking it.", nextButton);
        nextButton.click();
        return;
    }

    // --- Method 2: Find the scrollable container and scroll it manually ---
    console.warn("Could not find 'Next' button. Trying Method 2: Find and scroll container.");
    
    // The event.target is the video that just ended.
    const currentVideo = event.target; 
    if (!currentVideo) {
        console.error("Could not identify the video that ended.");
        return;
    }

    let parent = currentVideo.parentElement;
    let scrollableContainer = null;

    // Traverse up the DOM tree from the video to find the first parent that is scrollable.
    // A scrollable element has a scrollHeight greater than its visible clientHeight.
    // We'll also cap the search at 15 levels up to prevent an infinite loop.
    for (let i = 0; i < 15 && parent; i++) {
        if (parent.scrollHeight > parent.clientHeight + 50) { // +50px buffer for accuracy
            scrollableContainer = parent;
            break;
        }
        parent = parent.parentElement;
    }

    if (scrollableContainer) {
        const scrollAmount = scrollableContainer.clientHeight;
        console.log(`Success (Method 2): Found scrollable container. Scrolling by ${scrollAmount}px.`, scrollableContainer);
        scrollableContainer.scrollBy({
            top: scrollAmount,
            left: 0,
            behavior: 'smooth'
        });
        return;
    }

    // --- Method 3: Final fallback (less reliable) ---
    console.warn("Could not find scrollable container. Using Method 3: Final fallback scroll.");
    window.scrollBy(0, window.innerHeight);
}

/**
 * Attaches the 'ended' event listener to a video element.
 * @param {HTMLVideoElement} videoElement - The video element to attach the listener to.
 */
function addListenerToVideo(videoElement) {
    if (videoElement.dataset.autoScrollListenerAttached) {
        return;
    }
    
    console.log("Found a new Reel video. Attaching 'ended' event listener.", videoElement);
    videoElement.addEventListener('ended', scrollToNextReel);
    videoElement.dataset.autoScrollListenerAttached = 'true';
}

/**
 * The callback for the MutationObserver.
 * @param {MutationRecord[]} mutationsList - A list of mutations that occurred.
 */
function handleDomChanges(mutationsList) {
    for (const mutation of mutationsList) {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            mutation.addedNodes.forEach(node => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    if (node.matches(REEL_VIDEO_SELECTOR)) {
                        addListenerToVideo(node);
                    } else {
                        const videos = node.querySelectorAll(REEL_VIDEO_SELECTOR);
                        videos.forEach(addListenerToVideo);
                    }
                }
            });
        }
    }
}

// --- INITIALIZATION --- //

const reelsPageContainer = document.querySelector(REELS_CONTAINER_SELECTOR);

if (reelsPageContainer) {
    console.log("Main container found. Initializing observer and performing initial scan.");
    const observer = new MutationObserver(handleDomChanges);
    observer.observe(document.body, OBSERVER_CONFIG); // Observe the whole body for max compatibility
    document.querySelectorAll(REEL_VIDEO_SELECTOR).forEach(addListenerToVideo);
} else {
    // Fallback if the 'main' container isn't there on page load.
    // This can happen on some navigation types.
    console.warn("Could not find main container on load. Will rely solely on MutationObserver.");
    const observer = new MutationObserver(handleDomChanges);
    observer.observe(document.body, OBSERVER_CONFIG);
}
