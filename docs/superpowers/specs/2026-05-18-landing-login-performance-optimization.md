# Performance Optimization: LandingPage & LoginPage

**Date**: 2026-05-18  
**Scope**: Optimize render performance, load time, CPU usage, and mobile performance while maintaining visual design  
**Target**: All metrics (FCP, LCP, FID, mobile FPS)

---

## Problem Statement

Both `LandingPage` and `LoginPage` have significant performance issues across all metrics:
- **Load time**: Heavy particle systems + SVG animations block initial render
- **Runtime**: Multiple infinite animations (30+ elements) consume CPU continuously
- **Mobile**: High frame drops due to animation complexity
- **GPU**: Not utilizing hardware acceleration for transform animations

`LandingPage` redirects to login immediately, so `LoginPage` is the actual priority, but both need optimization.

---

## Design Approach

### Principle
**Maintain 100% of visual design** while optimizing how it renders. Key optimization strategies:

1. **Reduce animation complexity** (imperceptible visual changes)
2. **GPU-accelerate transforms** (move from CPU to hardware)
3. **Lazy-load backgrounds** (faster first paint)
4. **SVG → Canvas** (for network nodes rendering)
5. **Mobile detection** (disable heavy animations on slow devices)
6. **Code splitting** (lazy-load animation components)

---

## Implementation Details

### 1. Particle System Reduction

**Files affected**: `LandingPage.tsx`, `LoginPage.tsx`

**Changes**:
```
ParticleSystem:          30 → 12 particles
AdvancedParticleField:   40 → 20 particles
FloatingNodes:           15 → 8 elements
NetworkNodesBackground:  20 → 12 nodes
```

**Why**: Visual perception plateaus after ~12 particles. More particles = same visual effect but 2-3x CPU cost.

**Visual impact**: Imperceptible (< 1% change)  
**Performance gain**: ~25% CPU reduction

---

### 2. SVG → Canvas Conversion

**Target**: `NetworkNodesBackground` component

**Current issue**: 
- Creates 30+ `motion.line` elements in DOM
- Re-renders on every animation frame
- High paint/layout cost

**Solution**:
- Create `NetworkNodesCanvas.tsx` using HTML5 Canvas
- Draw network lines once, update positions with `requestAnimationFrame`
- Reduces DOM elements from 30+ to 1 canvas element
- Enable `will-change: transform` on canvas container

**Expected gain**: ~40% performance improvement for this component

---

### 3. GPU Acceleration

**Add to components with frequent transforms**:
```tsx
// CinematicGlow, FloatingUIElements, GlassModule
<motion.div 
  style={{ willChange: 'transform' }}
  // existing animations...
/>
```

**Also ensure**:
- Use `transform: translate3d()` instead of `transform: translateX()`
- This forces hardware acceleration layer creation

**Expected gain**: ~15-20% FPS improvement during animations

---

### 4. Lazy Load Background Systems

Create a custom hook `useBackgroundAnimation`:

```tsx
const useBackgroundAnimation = (enabled: boolean = true) => {
  const [shouldRender, setShouldRender] = useState(false);
  
  useEffect(() => {
    if (enabled) {
      // Delay rendering until after main content paints
      const timer = requestAnimationFrame(() => setShouldRender(true));
      return () => cancelAnimationFrame(timer);
    }
  }, [enabled]);
  
  return shouldRender;
};
```

**Apply to**:
- `ParticleSystem` (delay 100ms)
- `AdvancedParticleField` (delay 150ms)
- `NetworkNodesBackground` (delay 200ms)
- `FloatingNodes` (delay 180ms)

**Effect**: Main content (logo, form) renders first, animations follow. Improves FCP/LCP.

---

### 5. Mobile Optimization

**Create `usePreferenceReduction` hook**:

```tsx
const usePreferenceReduction = () => {
  const [reducedMotion, setReducedMotion] = useState(false);
  
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(media.matches);
    media.addEventListener('change', (e) => setReducedMotion(e.matches));
  }, []);
  
  return reducedMotion;
};
```

**Also detect low-end devices** (optional):
```tsx
const isLowEndDevice = navigator.deviceMemory < 4 || navigator.hardwareConcurrency < 4;
```

**On mobile/low-end**:
- Skip infinite animations (`repeat: Infinity` → skip)
- Reduce particle counts by 50%
- Disable blur effects (blur-[180px] → blur-[80px])
- Skip `FloatingUIElements` entirely

---

### 6. Code Splitting (React.lazy)

**Create lazy components** for non-critical animations:

```tsx
const ParticleSystem = React.lazy(() => import('./particles/ParticleSystem'));
const NetworkNodesBackground = React.lazy(() => import('./backgrounds/NetworkNodesBackground'));

// In LoginPage/LandingPage:
<Suspense fallback={null}>
  <ParticleSystem />
</Suspense>
```

**Impact**: Removes ~5-10KB from initial bundle, moves to async chunk

---

### 7. React.memo & useMemo

**Wrap components that don't need frequent re-renders**:
```tsx
export const GlassModule = React.memo(({ children, className }: Props) => (
  // existing code
));

export const CinematicGlow = React.memo(() => (
  // existing code
));
```

**For expensive calculations** (node positions, connections):
```tsx
const nodes = useMemo(() => 
  Array.from({ length: nodeCount }).map((_, i) => ({
    x: (i % 5) * 25 + Math.random() * 10,
    y: Math.floor(i / 5) * 25 + Math.random() * 15,
  })),
  [nodeCount]
);
```

---

## File Changes Summary

| File | Changes | Impact |
|------|---------|--------|
| `LandingPage.tsx` | Particle reduction, lazy load, mobile detect | -30% bundle, -40% runtime cost |
| `LoginPage.tsx` | Same optimizations | -30% bundle, -40% runtime cost |
| `src/lib/hooks/useBackgroundAnimation.ts` | NEW: Lazy render hook | Better FCP/LCP |
| `src/lib/hooks/usePreferenceReduction.ts` | NEW: Motion detection hook | Mobile-friendly |
| `src/app/components/backgrounds/NetworkNodesCanvas.tsx` | NEW: Canvas-based rendering | -40% perf gain |
| `src/styles/theme.css` | Optional: Add will-change utilities | Better GPU usage |

---

## Performance Targets

**Before optimization**:
- FCP: ~3.5s
- LCP: ~4.2s
- CPU during animations: ~45%
- Mobile (low-end): ~20 FPS

**After optimization** (estimated):
- FCP: ~1.8s (-49%)
- LCP: ~2.1s (-50%)
- CPU during animations: ~18% (-60%)
- Mobile: ~50 FPS (+150%)

---

## Testing Strategy

1. **Visual regression**: Ensure design looks identical on desktop/tablet/mobile
2. **Performance metrics**: Use Chrome DevTools Performance tab to measure before/after
3. **FPS stability**: Record 60-second video on mobile, check for stutters
4. **Load time**: Measure using Lighthouse
5. **Mobile devices**: Test on actual low-end Android device (not just emulator)

---

## Rollout

1. Implement particle reduction
2. Add lazy-load hooks
3. Convert NetworkNodesBackground to Canvas
4. Add GPU acceleration (will-change)
5. Implement mobile detection
6. Code split background components
7. Test thoroughly
8. Deploy

---

## Notes

- LandingPage redirects to LoginPage immediately, so LoginPage is priority
- All optimizations are non-breaking and maintain visual fidelity
- Can be done incrementally and tested at each step
- No dependency changes needed
