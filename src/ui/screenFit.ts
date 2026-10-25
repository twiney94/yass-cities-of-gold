// An iPhone home-screen app with a see-through status bar fills the whole screen, but WebKit lays the page out in a
// viewport one status bar short until the first scroll, leaving that strip empty at the bottom. There the screen size
// is the app size, so pin the layout to it; a window narrower than the screen (iPad split view) keeps its own size.
const ios = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent));

const fitScreen = () => {
  const homeScreenApp = (navigator as Navigator & { standalone?: boolean }).standalone === true || window.matchMedia('(display-mode: standalone)').matches;
  const landscape = window.matchMedia('(orientation: landscape)').matches;
  const [width, height] = landscape
    ? [Math.max(screen.width, screen.height), Math.min(screen.width, screen.height)]
    : [Math.min(screen.width, screen.height), Math.max(screen.width, screen.height)];
  const fullWidth = Math.abs(window.innerWidth - width) < 2;
  const root = document.documentElement;
  const pinned = ios && homeScreenApp && fullWidth;
  root.classList.toggle('screen-pinned', pinned);
  if (pinned) root.style.setProperty('--app-height', `${height}px`);
  else root.style.removeProperty('--app-height');
};

fitScreen();
window.matchMedia('(orientation: landscape)').addEventListener('change', () => requestAnimationFrame(fitScreen));
