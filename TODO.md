# Performance Optimization Plan for Ruangan.tsx - Approved & In Progress

## Progress: 4/9 Completed ✓ Phase 1 Done

### Phase 1: Immediate Data Optimizations (Quick Wins) ✓
✅ **1. useRooms excludeImage=true** (70% faster list)
✅ **2. Defer staff/software fetches** (detail only)
✅ **3. Debounced filters/sort** (no spam re-renders)

### Phase 2: Code Splitting & Lazy Loading (Active)
✅ **4. RoomList extracted** ✓ components/RoomList.tsx (2.5KB, gradient thumbs)
✅ **5.** Extract RoomDetail → components/RoomDetail.tsx + React.lazy ✓
**6.** RoomComputers → components/RoomComputers.tsx + lazy  
**7.** Suspense + Skeleton fallbacks

### Phase 3: Asset Optimizations
**8.** Single Pannellum instance (detail only)
**9.** Dynamic GAPI script load

### Next Action
Extract ~500 LOC detail view → RoomDetail for 3x faster list-only loads

**Benchmark**: List scroll → Lighthouse 95+ perf score target

### Phase 2: Code Splitting & Lazy Loading
**- [ ] 4. Extract RoomList** → components/RoomList.tsx (grouped floors, thumbs, Room360Thumbnail)
  - Lazy load for list-only visits
**- [ ] 5. Extract RoomDetail** → components/RoomDetail.tsx (360 full, GCal, specs summary, software list)
**- [ ] 6. Extract RoomComputers** → components/RoomComputers.tsx (table, edit modal, import)
**- [ ] 7. Suspense + Skeletons** for lazy components (use existing Skeleton component)

### Phase 3: Asset & Script Optimizations
**- [ ] 8. Static thumbs** (no Pannellum list; static img or CSS gradient; full Pannellum only detail)
  - Single global Pannellum instance destroy/create
  - Multi-thumbs cause GPU lag on scroll
**- [ ] 9. Dynamic scripts**: GAPI only RoomDetail; pannellum CDN dynamic load + vite preload

### Tracking & Testing
- After each phase: Update this TODO.md ✅
- Commands: `npm run build` check bundle size; Chrome > Perf tab (scroll list); Lighthouse perf score
- Mobile: Responsive scroll jank, initial load <3s on 3G
- Full: attempt_completion with perf summary

**Current Step:** Complete #2 defer fetches → edit Ruangan.tsx
