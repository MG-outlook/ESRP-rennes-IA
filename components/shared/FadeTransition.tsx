"use client";

import { useEffect, useState, useRef } from "react";
import type { ReactNode } from "react";

interface FadeTransitionProps {
  phaseKey: string;
  children: ReactNode;
}

export default function FadeTransition({ phaseKey, children }: FadeTransitionProps) {
  const [visible, setVisible] = useState(true);
  const [currentChildren, setCurrentChildren] = useState(children);
  const prevKey = useRef(phaseKey);

  useEffect(() => {
    if (prevKey.current !== phaseKey) {
      prevKey.current = phaseKey;
      setVisible(false);
      const timer = setTimeout(() => {
        setCurrentChildren(children);
        setVisible(true);
      }, 150);
      return () => clearTimeout(timer);
    } else {
      setCurrentChildren(children);
    }
  }, [phaseKey, children]);

  return (
    <div
      className="transition-opacity duration-150 ease-in-out"
      style={{ opacity: visible ? 1 : 0 }}
    >
      {currentChildren}
    </div>
  );
}
