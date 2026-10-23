import '@fontsource/cinzel/600.css';
import '@fontsource/cinzel/700.css';
import '@fontsource/cinzel-decorative/900.css';
import { createRoot } from 'react-dom/client';
import '../../src/index.css';
import { ALL_CARDS } from '../../src/engine/cards';
import { CardView } from '../../src/ui/CardView';

createRoot(document.getElementById('root')!).render(
  <div className="gallery">
    {ALL_CARDS.map((card) => (
      <CardView key={card.type} type={card.type} />
    ))}
  </div>,
);
