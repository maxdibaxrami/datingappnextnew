import {
  setDebug,
  backButton,
  initData,
  init as initSDK,
  miniApp,
  viewport,
  themeParams,
} from '@tma.js/sdk-react';

/**
 * Initializes the application and configures its dependencies.
 */
export async function init(options: {
  debug: boolean;
  eruda: boolean;
}): Promise<void> {
  // Set @tma.js/sdk-react debug mode and initialize it.
  setDebug(options.debug);
  initSDK();

  // Add Eruda if needed.
  if (options.eruda) {
    void import('eruda').then(({ default: eruda }) => {
      eruda.init();
      eruda.position({ x: window.innerWidth - 50, y: 0 });
    });
  }

  // Mount all components used in the project.
  backButton.mount();
  initData.restore();

  try {
    miniApp.mount();
    themeParams.bindCssVars();
  } catch {
    // miniApp not available
  }

  try {
    viewport.mount().then(() => {
      viewport.bindCssVars();
    });
  } catch {
    // viewport not available
  }
}
