/**
 * @file content.js
 * @description This script runs on Instagram pages to enable automatic and voice-controlled scrolling of Reels.
 * @version 1.3 - Added voice command "next" to scroll reels.
 */

console.log("Instagram Auto-Reel Scroller v1.3: Content script loaded.");

// --- CONFIGURATION --- //

const NEXT_BUTTON_SELECTOR = '[aria-label*="Next"]';
const REEL_VIDEO_SELECTOR = 'video';
const OBSERVER_CONFIG = { childList: true, subtree: true };

// --- CORE SCROLLING LOGIC --- //

/**
 * Scrolls to the next reel using a multi-step, robust strategy.
 * This function is now generic and can be called by any event (video ending or voice command).
 */
function scrollToNextReel() {
    console.log("Scroll triggered. Attempting to find next reel.");

    // --- Method 1: Try to find and click the 'Next' button ---
    const nextButton = document.querySelector(NEXT_BUTTON_SELECTOR);
    if (nextButton) {
        console.log("Success (Method 1): Found 'Next' button. Clicking it.", nextButton);
        nextButton.click();
        return;
    }

    // --- Method 2: Find the currently visible video and scroll its container ---
    console.warn("Could not find 'Next' button. Trying Method 2: Find and scroll container.");

    // Find the video that is currently most visible in the viewport.
    let currentVideo = null;
    const videos = document.querySelectorAll(REEL_VIDEO_SELECTOR);
    let maxVisibility = 0;

    for (const video of videos) {
        const rect = video.getBoundingClientRect();
        const visibleHeight = Math.max(0, Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0));
        const visibility = visibleHeight / rect.height;

        if (visibility > maxVisibility) {
            maxVisibility = visibility;
            currentVideo = video;
        }
    }

    if (!currentVideo) {
        console.error("Method 2 Failed: Could not find a visible video to scroll from.");
        // --- Method 3: Final fallback (less reliable) ---
        console.warn("Using Method 3: Final fallback scroll.");
        window.scrollBy(0, window.innerHeight);
        return;
    }

    let parent = currentVideo.parentElement;
    let scrollableContainer = null;
    for (let i = 0; i < 15 && parent; i++) {
        if (parent.scrollHeight > parent.clientHeight + 50) {
            scrollableContainer = parent;
            break;
        }
        parent = parent.parentElement;
    }

    if (scrollableContainer) {
        const scrollAmount = scrollableContainer.clientHeight;
        console.log(`Success (Method 2): Found scrollable container. Scrolling by ${scrollAmount}px.`, scrollableContainer);
        scrollableContainer.scrollBy({ top: scrollAmount, left: 0, behavior: 'smooth' });
    } else {
        console.error("Method 2 Failed: Could not find a scrollable container for the visible video.");
    }
}


// --- EVENT & OBSERVER SETUP --- //

/**
 * Attaches the 'ended' event listener to a video element.
 * @param {HTMLVideoElement} videoElement - The video element to attach the listener to.
 */
function addListenerToVideo(videoElement) {
    if (videoElement.dataset.autoScrollListenerAttached) {
        return;
    }
    console.log("Attaching 'ended' listener to new video.", videoElement);
    // The function is wrapped in an arrow function so it's called without passing the event object.
    videoElement.addEventListener('ended', () => scrollToNextReel());
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

// --- VOICE COMMAND INITIALIZATION --- //

function setupVoiceCommands() {
    // Check if the browser supports the Web Speech API
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        console.error("Speech Recognition API not supported in this browser.");
        return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true; // Keep listening even after a command
    recognition.lang = 'en-US';    // Set language
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    // Fired when the user speaks
    recognition.onresult = (event) => {
        const last = event.results.length - 1;
        const command = event.results[last][0].transcript.trim().toLowerCase();

        console.log(`Voice command heard: "${command}"`);

        if (command === 'next') {
            console.log("'Next' command recognized. Scrolling...");
            scrollToNextReel();
        }
    };

    // Fired when the recognition service ends
    recognition.onend = () => {
        console.log("Speech recognition service ended. Restarting...");
        recognition.start(); // Always restart it
    };
    
    // Fired on error
    recognition.onerror = (event) => {
        // 'not-allowed' is a common error when the user denies microphone permission
        if (event.error == 'not-allowed') {
            console.error("Microphone access denied. Voice commands will not work.");
        } else {
            console.error("Speech recognition error:", event.error);
        }
    };

    try {
        recognition.start();
        console.log("🎤 Voice recognition started. Say 'next' to scroll.");
    } catch (e) {
        console.error("Could not start voice recognition:", e);
    }
}


// --- SCRIPT INITIALIZATION --- //

// Start observing for new Reels being added to the page
const observer = new MutationObserver(handleDomChanges);
observer.observe(document.body, OBSERVER_CONFIG);

// Find any videos that are already on the page when the script loads
document.querySelectorAll(REEL_VIDEO_SELECTOR).forEach(addListenerToVideo);

// Start the voice command listener
setupVoiceCommands();
