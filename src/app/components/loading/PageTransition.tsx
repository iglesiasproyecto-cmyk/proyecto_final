import { motion, AnimatePresence } from "motion/react";
import { useLocation } from "react-router";
import { useEffect, useState } from "react";

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  slide?: boolean;
}

export function PageTransition({
  children,
  className = "",
  delay = 0,
  slide = false,
}: PageTransitionProps) {
  const location = useLocation();
  const [displayLocation, setDisplayLocation] = useState(location);
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(false);
    const timer = setTimeout(() => {
      setDisplayLocation(location);
      setShow(true);
    }, 50);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={displayLocation.pathname}
        initial={{
          opacity: 0,
          y: slide ? 8 : 0,
        }}
        animate={{
          opacity: show ? 1 : 0,
          y: show ? 0 : 8,
        }}
        exit={{
          opacity: 0,
          y: slide ? -8 : 0,
        }}
        transition={{
          duration: 0.25,
          delay: show ? delay : 0,
          ease: [0.23, 1, 0.32, 1],
        }}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

interface FadeInProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
}

export function FadeIn({
  children,
  className = "",
  delay = 0,
  duration = 0.3,
}: FadeInProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration,
        delay,
        ease: [0.23, 1, 0.32, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

interface StaggeredListProps {
  children: React.ReactNode;
  className?: string;
  itemClassName?: string;
  staggerDelay?: number;
}

export function StaggeredList({
  children,
  className = "",
  itemClassName = "",
  staggerDelay = 0.04,
}: StaggeredListProps) {
  const items = Array.isArray(children) ? children : [children];

  return (
    <div className={className}>
      {items.map((child, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.3,
            delay: index * staggerDelay,
            ease: [0.23, 1, 0.32, 1],
          }}
          className={itemClassName}
        >
          {child}
        </motion.div>
      ))}
    </div>
  );
}

interface SkeletonLoaderProps {
  active?: boolean;
  children: React.ReactNode;
  skeleton: React.ReactNode;
  className?: string;
}

export function SkeletonLoader({
  active = true,
  children,
  skeleton,
  className = "",
}: SkeletonLoaderProps) {
  const [showSkeleton, setShowSkeleton] = useState(false);

  useEffect(() => {
    if (active) {
      const timer = setTimeout(() => {
        setShowSkeleton(true);
      }, 200);
      return () => clearTimeout(timer);
    } else {
      setShowSkeleton(false);
    }
  }, [active]);

  if (showSkeleton && active) {
    return <div className={className}>{skeleton}</div>;
  }

  return (
    <div className={className}>
      {children}
    </div>
  );
}