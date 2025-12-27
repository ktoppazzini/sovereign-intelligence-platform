# Fixes Applied - November 7, 2025 1:50 AM

## Changes Made

### 1. ✅ Reverted TypeSwitch Script to Working Version
**File**: `lib/reportGraphs.js` (lines ~138-156)
- **Reverted** the experimental CSS-only switching back to inline style manipulation
- Script now directly sets `p.style.display = match ? 'block' : 'none'`
- This is the version that was previously working

**Why**: The CSS-only approach caused conflicts. The original inline style approach works reliably.

### 2. ✅ Benchmark Data Persistence Fix (KEPT)
**File**: `lib/reportGraphs.js` (line ~558)
- Data-spec now includes: `{title, current: currentNum, benchmark: benchmarkNum, xTitle, yTitle}`
- Previously only saved `{title, yTitle}`, causing values to be lost during re-rendering

**File**: `lib/reportTemplate.js` (line ~255)
- renderDataBlocks() now uses all fields including `xTitle`

**Why**: When reports are re-rendered, the benchmark values need to be preserved in the HTML data attributes.

---

## Known Issues Still Needing Investigation

###  Phase Names Missing in Implementation Roadmap
- User reports phase names disappeared
- Need to check `derivePhasesFrom()` function and timeline HTML generation
- Located at: `app/api/reform/generate/route.js` line ~1759

### ❌ Table Running Off Page  
- One table overflows horizontally
- CSS for `.report-table` should have `overflow-x: auto` but may need wrapper
- Located at: `lib/reportTemplate.js` lines ~699-708

### ❌ TypeSwitch Script Not Loading
- Browser console shows "window.reportGraphs NOT FOUND"
- Script IS being injected (log shows it at line 723 of reportTemplate.js)
- But it's not executing in the browser
- **Possible causes**:
  1. Content Security Policy blocking inline scripts
  2. Syntax error preventing execution (though it looks valid)
  3. Script being stripped somewhere in the pipeline
  4. React/Next.js sanitizing the HTML

### ❌ Last Two KPIs Still Show Same Values
- Despite fix, benchmarks may still be rendering with fallback values
- Need to verify the renderDataBlocks() is actually being called
- Need to check if there's another render pass happening

---

## Next Steps for Testing

1. **Generate a fresh report** - old cached reports won't have the fixes
2. **Check VS Code terminal** for these logs:
   ```
   [SR:REFORM] ✅ [DROPDOWN-FIX] TypeSwitch script injected
   [SR:REFORM] 📊 [KPI-FIX] Benchmark 1 VALUES: { current: XX, benchmark: YY }
   ```

3. **Check browser console** for:
   ```
   [TypeSwitch] Script loaded and initialized
   window.reportGraphs  // Should be defined
   ```

4. **View page source** (Ctrl+U) and search for "window.reportGraphs" to confirm script is in HTML

---

## Files Modified
1. `lib/reportGraphs.js`
   - Line ~558: Benchmark data-spec includes current/benchmark values  
   - Lines ~138-156: Reverted TypeSwitch to inline style approach

2. `lib/reportTemplate.js`
   - Line ~255: renderDataBlocks uses xTitle parameter

---

## Critical Discovery

The browser console diagnostic shows:
- ✅ 17 chart cards found
- ✅ Select elements found in all cards
- ✅ Data-type attributes present
- ✅ Plots are being shown/hidden correctly based on data-type
- ❌ **window.reportGraphs is NOT defined** ← ROOT CAUSE

This means the TypeSwitch script is either:
- Not being injected into the final HTML
- Being stripped by sanitization
- Having a syntax error that prevents it from running
- Being blocked by CSP (Content Security Policy)

**Action Required**: Need to view the actual HTML source (not just inspect element) to see if the script tags are present in the delivered HTML.
