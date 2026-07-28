import { useEffect, useMemo, useState } from 'react';
import Lottie from 'lottie-react';
import { Loader2 } from 'lucide-react';

// Every .json in src/animations is bundled lazily and discovered here at
// build time. Drop a file in the folder and it joins the rotation.
const animationModules = import.meta.glob('../animations/*.json');

export default function LottieLoader({ className = 'w-40 h-40', interval = 3000 }) {
  const loaders = useMemo(() => Object.values(animationModules), []);
  const [index, setIndex] = useState(() =>
    loaders.length ? Math.floor(Math.random() * loaders.length) : 0
  );
  const [animationData, setAnimationData] = useState(null);

  // Rotate through the available animations while visible.
  useEffect(() => {
    if (loaders.length < 2) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % loaders.length), interval);
    return () => clearInterval(timer);
  }, [loaders.length, interval]);

  useEffect(() => {
    if (!loaders.length) return;
    let cancelled = false;
    loaders[index]()
      .then((mod) => {
        if (!cancelled) setAnimationData(mod.default);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [index, loaders]);

  if (!animationData) {
    return <Loader2 className="w-8 h-8 animate-spin text-primary" />;
  }

  return <Lottie animationData={animationData} loop className={className} />;
}
