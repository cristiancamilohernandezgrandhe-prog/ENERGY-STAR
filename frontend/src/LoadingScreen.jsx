import { useEffect, useState } from "react";
import EnergyStarLogo from "./EnergyStarLogo";

const taglines = [
  "Iluminamos el camino de nuestra comunidad.",
  "Tecnología inteligente para San Pelayo.",
  "Más eficiencia, mejor alumbrado para todos.",
];

function LoadingScreen() {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [changing, setChanging] = useState(false);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setChanging(true);
      window.setTimeout(() => {
        setPhraseIndex((current) => (current + 1) % taglines.length);
        setChanging(false);
      }, 380);
    }, 2000);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <main className="energy-loading" role="status" aria-live="polite">
      <div className="loading-glow loading-glow-one" />
      <div className="loading-glow loading-glow-two" />
      <div className="loading-content">
        <EnergyStarLogo className="loading-logo" />
        <p className="loading-kicker">ENERGY STAR · SAN PELAYO</p>
        <h1>Cargando <span>Energy Star</span></h1>
        <div className="loading-progress" aria-hidden="true"><span /></div>
        <div className="loading-phrase-window" aria-hidden="true">
          <p className={changing ? "loading-phrase is-leaving" : "loading-phrase is-entering"} key={phraseIndex}>
            {taglines[phraseIndex]}
          </p>
        </div>
      </div>
    </main>
  );
}

export default LoadingScreen;

