# Sales Analytics & Catch-Up Model Implementation

This implementation provides a comprehensive analytics and prediction system for sales performance with data-driven catch-up recommendations.

## 🎯 Core Features

### 1. **Performance Analytics Engine** (`/lib/analytics-engine.ts`)
- **Expected Units Model**: Predicts performance based on lead sources + behavior
- **Core Rate Calculations**: Contact rate, appointment rate, show rate, close rate
- **Behavioral Multipliers**: Adjustments based on individual vs. store performance
- **Anti-Gaming Protection**: Rewards quality contacts, not just volume

### 2. **Catch-Up Target System** 
- **Gap Analysis**: Measures distance from top performer
- **Progressive Closing**: 25% gap closure per month (configurable)
- **Minimum Improvement**: Ensures at least +1 unit improvement when behind
- **Realistic Targets**: Prevents impossible stretch goals

### 3. **Activity Recommendations**
- **Source Optimization**: Identifies highest-ROI lead sources
- **Contact Rate Targets**: Shows required improvement levels
- **Attempt Calculation**: Converts goals into actionable daily tasks
- **Quality Focus**: Emphasizes meaningful contacts over spam calls

### 4. **Leader Advantages** (Earned, Not Given)
- **Advanced Analytics**: Unlocked at rank #1 or 90%+ performance
- **Source Mix Optimizer**: Lead source performance analysis
- **Contact Timing Analysis**: Best hours for outreach
- **Lead Decay Curves**: Age vs. conversion probability
- **Confidence Intervals**: Sample-size based forecast accuracy

## 📊 Key Components

### Analytics Dashboard (`/app/analytics/page.tsx`)
- Complete performance breakdown
- Catch-up recommendations  
- Team leaderboard
- Interactive analysis tools

### Performance Widgets
- **`CatchUpRecommendations`**: Actionable improvement strategies
- **`PerformanceAnalytics`**: Expected vs. actual analysis
- **`LeaderAdvantages`**: Advanced insights for top performers
- **`PacingTracker`**: Real-time goal tracking

## 🔢 Algorithm Implementation

### Algorithm Set A: Core Rates
```typescript
contact_rate = contacts / unique_leads_attempted
appointment_set_rate = appointments_set / contacts
show_rate = appointments_show / appointments_set
close_from_show = units_sold / appointments_show
```

### Algorithm Set B: Expected Units
```typescript
// Source weights (store-wide)
w_s = store_sold_from_source_s / store_leads_from_source_s

// Base expected from lead mix
EU_base = SUM(leads_by_source[s] * w_s)

// Behavior multipliers (clamped)
M_contact = clamp(CR_rep / CR_store, 0.80, 1.25)
M_appt = clamp(ASR_rep / ASR_store, 0.85, 1.20)

// Final expected units
EU_final = EU_base * M_contact * M_appt
```

### Algorithm Set C: Catch-Up Target
```typescript
gap = TopPerformer - CurrentUnits
target = CurrentUnits + (gap * 0.25)  // 25% gap closure
target = max(target, CurrentUnits + 1) // Minimum improvement
```

## 🗄️ Database Schema

### Enhanced Tables
- **`activities`**: Added `outcome` field for call results
- **`deals`**: Added `lead_source` for source tracking
- **`rep_month_stats`**: Cached per-rep monthly funnel stats
- **`rep_month_forecast`**: Cached monthly projection + quota hit probability + next best action
- **Analytics Views**: Pre-calculated aggregations for performance

### Forecast-First Additions
- Run `supabase/forecast_schema.sql` to create forecast cache tables and RLS policies.
- Pure forecast domain modules live in `/lib/domain/forecast`:
   - `computeProjectedUnits.ts`
   - `computeQuotaProbability.ts`
   - `computeNextBestAction.ts`
- Server recompute path: `/lib/server/recomputeRepMonthForecast.ts`
   - Recomputes current rep/month stats from `deals` + `activities`
   - Upserts `rep_month_stats` and `rep_month_forecast`
   - Triggered from `/app/analytics/page.tsx` during analytics page load

### Key Views
- **`analytics_rep_performance`**: Monthly aggregated metrics
- **`source_performance_weights`**: Store-wide conversion rates
- **`catch_up_targets`**: Personalized monthly targets

## 🧪 Testing & Demo Data

### Mock Data Generator (`/lib/mock-data-generator.ts`)
- Creates realistic multi-rep performance data
- Varies skill levels and source preferences
- Generates historical trends for analysis

### Usage
```typescript
const generator = new MockDataGenerator()
const repData = generator.generateAllRepData()
const engine = new SalesAnalyticsEngine()
const results = engine.analyzePerformance(repData)
```

## 🚀 Getting Started

1. **Run Database Migration**:
   ```sql
   \i supabase/analytics_schema.sql
   ```

2. **Access Analytics Dashboard**:
   - Navigate to `/analytics` 
   - View your performance breakdown
   - Get personalized recommendations

3. **Unlock Advanced Features**:
   - Reach rank #1 or 90%+ performance index
   - Access source optimization tools
   - View advanced forecasting

## 📈 Key Benefits

### For Sales Reps
- **Clear improvement targets** based on top performer gap
- **Actionable daily activities** (calls, leads, contact quality)
- **Anti-gaming protection** rewards real performance
- **Progressive goals** that feel achievable

### For Managers  
- **Predictive insights** on rep potential
- **Data-driven coaching** based on core rates
- **Source allocation** optimization
- **Performance trending** and early warnings

### For Leaders
- **Advanced analytics** as earned privilege
- **Competitive advantage** through deeper insights
- **Defense strategies** to maintain top position
- **Process optimization** tools

## 🔧 Configuration

Default parameters (tunable):
- `gap_close_rate`: 0.25 (25% monthly gap closure)
- `contact_multiplier_bounds`: [0.80, 1.25] 
- `appointment_multiplier_bounds`: [0.85, 1.20]
- `confidence_tau`: 50 (sample size for confidence)
- `weights_window`: 90 days
- `rolling_avg_months`: 3

## 🛡️ Anti-Gaming Measures

1. **Quality over Quantity**: Contact rate based on unique leads, not total attempts
2. **Two-Way Contact**: Only counts when customer responds
3. **Capped Multipliers**: Prevents unrealistic behavior scoring
4. **Source-Based Expectations**: Accounts for lead quality differences
5. **Sample Size Confidence**: Lower confidence for insufficient data

The system encourages genuine improvement in sales skills and processes while providing clear, achievable targets for every team member.