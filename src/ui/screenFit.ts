// iPhone home-screen apps with a see-through status bar draw from the top of the screen but report a viewport one
// status bar short of it, so that strip stays empty at the bottom. Measure what is missing so the layout can reach
// down into it; anywhere else the gap is zero and nothing changes.
const MAX_GAP = 100;

const fitScreen = () => {
  const homeScreenApp = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  const landscape = window.matchMedia('(orientation: landscape)').matches;
  const screenHeight = landscape ? Math.min(screen.width, screen.height) : Math.max(screen.width, screen.height);
  const gap = homeScreenApp ? Math.min(MAX_GAP, Math.max(0, screenHeight - window.innerHeight)) : 0;
  const root = document.documentElement;
  root.style.setProperty('--screen-gap', `${gap}px`);
  root.classList.toggle('has-screen-gap', gap > 0);
};

fitScreen();
window.matchMedia('(orientation: landscape)').addEventListener('change', () => requestAnimationFrame(fitScreen));
