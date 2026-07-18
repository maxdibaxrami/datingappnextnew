import {
  setDebug,
  backButton,
  mainButton,
  secondaryButton,
  locationManager,
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
  try {
    backButton.mount();
  } catch (e) {
    console.error('Failed to mount backButton', e);
  }
  try {
    mainButton.mount();
  } catch (e) {
    console.error('Failed to mount mainButton', e);
  }
  try {
    secondaryButton.mount();
  } catch (e) {
    console.error('Failed to mount secondaryButton', e);
  }
  try {
    locationManager.mount();
  } catch (e) {
    console.error('Failed to mount locationManager', e);
  }

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
