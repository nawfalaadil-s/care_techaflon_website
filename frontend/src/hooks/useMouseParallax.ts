import { useEffect, useRef, useState } from 'react';

interface MousePosition {
  x: number;
  y: number;
}

export function useMouseParallax(intensity: number = 0.05) {
  const [mousePosition, setMousePosition] = useState<MousePosition>({ x: 0, y: 0 });
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!elementRef.current) return;

      const rect = elementRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const deltaX = (e.clientX - centerX) * intensity;
      const deltaY = (e.clientY - centerY) * intensity;

      setMousePosition({ x: deltaX, y: deltaY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [intensity]);

  return { mousePosition, elementRef };
}
