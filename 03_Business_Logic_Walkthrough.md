# 03 Business Logic Walkthrough

This document examines the core calculations, mathematical formulas, state updates, and side effects implemented in the DigitalKaam platform.

---

## 1. 10-Factor Provider Matching Algorithm

### Code Location & Functions
*   **File**: [matchingController.ts](file:///d:/DigitalKaam/backend/src/controllers/matchingController.ts)
*   **Main Function**: [processMatching()](file:///d:/DigitalKaam/backend/src/controllers/matchingController.ts#L48)
*   **Helper Functions**: `haversineKm()`, `normalize()`

### Algorithm Logic & Formula
The system filters candidates through geographic radius checking in the discovery phase, then scores them out of $1.0$ based on ten weighted performance metrics.

First, values are normalized into a $0.0 \text{ to } 1.0$ range:
$$\text{normalize}(x, \text{min}, \text{max}) = \max\left(0, \min\left(1, \frac{x - \text{min}}{\text{max} - \text{min}}\right)\right)$$

The overall matching score is calculated as:
$$\begin{aligned}
\text{MatchScore} = & \ (\text{DistanceScore} \times 0.10) \\
& + (\text{AvailabilityScore} \times 0.20) \\
& + (\text{RatingScore} \times 0.10) \\
& + (\text{RecencyScore} \times 0.10) \\
& + (\text{ReliabilityScore} \times 0.15) \\
& + (\text{SpecializationScore} \times 0.10) \\
& + (\text{PriceScore} \times 0.10) \\
& + (\text{CapacityScore} \times 0.05) \\
& + (\text{CancellationScore} \times 0.05) \\
& + (\text{PreferenceScore} \times 0.05)
\end{aligned}$$

#### Weighted Scoring Factors
1.  **DistanceScore ($10\%$)**: Closer providers score higher. Formula: $1 - \text{normalize}(\text{distanceKm}, 0, 20)$.
2.  **AvailabilityScore ($20\%$)**: $1.0$ if the provider has an unbooked slot matching the target date in the `availability` table, otherwise $0.0$.
3.  **RatingScore ($10\%$)**: Normalized rating. Formula: $\text{rating} / 5.0$.
4.  **RecencyScore ($10\%$)**: Rating recency multiplier (`review_recency_score` in DB, defaults to $0.5$, resets to $0.95$ when a new review is posted).
5.  **ReliabilityScore ($15\%$)**: Provider performance score. Formula: $\text{reliability\_score} / 100$.
6.  **SpecializationScore ($10\%$)**: Checks if the provider has a skill matching the requested service type. Matches score $1.0$, partials/non-matches score $0.5$.
7.  **PriceScore ($10\%$)**: Cheaper hourly rates score higher. Formula: $1 - \text{normalize}(\text{hourly\_rate}, \text{minRate}, \text{maxRate})$.
8.  **CapacityScore ($5\%$)**: Daily task capacity. Formula: $\text{normalize}(\text{capacity}, 1, 8)$.
9.  **CancellationScore ($5\%$)**: Low cancellations score higher. Formula: $1 - \text{cancellation\_rate}$.
10. **PreferenceScore ($5\%$)**: Checks user profile arrays. Preferred provider = $1.0$, blacklisted = $0.0$, neutral = $0.5$.

### Numerical Worked Example
Suppose we have two Electrician candidates.
The customer is in **DHA** (Coords: `24.8142, 67.0792`).
Min hourly rate in area is $600$ PKR; Max hourly rate is $1000$ PKR.
The user has provider `P1` in their preferred list, and `P2` is neutral.

#### Candidate 1 (`P1`):
*   Distance: 4.0 km
*   Available slot in DB: Yes
*   Rating: 4.8
*   Recency score: 0.95
*   Reliability score: 90
*   Specialization match: Yes (skills has "wiring")
*   Hourly rate: 900 PKR
*   Capacity: 4
*   Cancellation rate: 0.05
*   User Preference: Preferred

Calculation:
*   $\text{distScore} = 1 - (4.0 / 20) = 0.8$
*   $\text{availScore} = 1.0$
*   $\text{ratingScore} = 4.8 / 5 = 0.96$
*   $\text{recencyScore} = 0.95$
*   $\text{reliabilityScore} = 90 / 100 = 0.9$
*   $\text{specScore} = 1.0$
*   $\text{priceScore} = 1 - \text{normalize}(900, 600, 1000) = 1 - 0.75 = 0.25$
*   $\text{capScore} = \text{normalize}(4, 1, 8) = 3/7 \approx 0.43$
*   $\text{cancelScore} = 1 - 0.05 = 0.95$
*   $\text{prefScore} = 1.0$

$$\begin{aligned}
\text{Score}_{P1} = & \ (0.8 \times 0.10) + (1.0 \times 0.20) + (0.96 \times 0.10) + (0.95 \times 0.10) + (0.9 \times 0.15) \\
& + (1.0 \times 0.10) + (0.25 \times 0.10) + (0.43 \times 0.05) + (0.95 \times 0.05) + (1.0 \times 0.05) \\
= & \ 0.08 + 0.20 + 0.096 + 0.095 + 0.135 + 0.10 + 0.025 + 0.0215 + 0.0475 + 0.05 \\
= & \ \mathbf{0.850}
\end{aligned}$$

#### Candidate 2 (`P2`):
*   Distance: 12.0 km
*   Available slot in DB: Yes
*   Rating: 4.2
*   Recency score: 0.50
*   Reliability score: 95
*   Specialization match: No
*   Hourly rate: 650 PKR
*   Capacity: 6
*   Cancellation rate: 0.0
*   User Preference: Neutral

Calculation:
*   $\text{distScore} = 1 - (12.0 / 20) = 0.4$
*   $\text{availScore} = 1.0$
*   $\text{ratingScore} = 4.2 / 5 = 0.84$
*   $\text{recencyScore} = 0.50$
*   $\text{reliabilityScore} = 95 / 100 = 0.95$
*   $\text{specScore} = 0.5$
*   $\text{priceScore} = 1 - \text{normalize}(650, 600, 1000) = 1 - 0.125 = 0.875$
*   $\text{capScore} = \text{normalize}(6, 1, 8) = 5/7 \approx 0.71$
*   $\text{cancelScore} = 1.0$
*   $\text{prefScore} = 0.5$

$$\begin{aligned}
\text{Score}_{P2} = & \ (0.4 \times 0.10) + (1.0 \times 0.20) + (0.84 \times 0.10) + (0.50 \times 0.10) + (0.95 \times 0.15) \\
& + (0.5 \times 0.10) + (0.875 \times 0.10) + (0.71 \times 0.05) + (1.0 \times 0.05) + (0.5 \times 0.05) \\
= & \ 0.04 + 0.20 + 0.084 + 0.05 + 0.1425 + 0.05 + 0.0875 + 0.0355 + 0.05 + 0.025 \\
= & \ \mathbf{0.765}
\end{aligned}$$

**Result**: `P1` wins with a score of $0.850$ vs $0.765$ for `P2` despite `P2` being significantly cheaper.

---

## 2. Dynamic Pricing Engine

### Code Location & Functions
*   **File**: [pricingController.ts](file:///d:/DigitalKaam/backend/src/controllers/pricingController.ts)
*   **Function**: [processPricing()](file:///d:/DigitalKaam/backend/src/controllers/pricingController.ts#L61)
*   **Configuration Table**: `platform_config` in Supabase

### Formulas & Math
The engine loads pricing parameters from the database (falling back to defaults) and calculates fees:

1.  **Labor Fee**: 
    $$\text{laborFee} = \text{hourlyRate} \times \text{estimatedDurationHours}$$
2.  **Urgency Surcharge**: 
    $$\text{urgencySurcharge} = \begin{cases} 
      0 & \text{if severity = 'low'} \\ 
      \text{urgency\_fee\_medium} & \text{if severity = 'medium'} \ (100\text{ PKR}) \\ 
      \text{urgency\_fee\_high} & \text{if severity = 'high'} \ (250\text{ PKR}) 
    \end{cases}$$
3.  **Loyalty Discount**: 
    Each 100 points yields 50 PKR off, subject to a cap:
    $$\text{loyaltyDiscount} = \min\left(\text{loyalty\_discount\_cap}, \left\lfloor \frac{\text{loyaltyPoints}}{100} \right\rfloor \times 50 \right)$$
4.  **Platform Fee**: 
    Applied as a fixed charge plus a percentage of the subtotal:
    $$\text{serviceSubtotal} = \text{visitFee} + \text{laborFee} + \text{urgencySurcharge} - \text{loyaltyDiscount}$$
    $$\text{platformFee} = \text{platform\_fee\_fixed} + \left( \text{serviceSubtotal} \times \frac{\text{platform\_fee\_percent}}{100} \right)$$
5.  **Final Total**: 
    Bound by the base visit fee to prevent negative billing:
    $$\text{Total} = \max(\text{visitFee}, \text{serviceSubtotal} + \text{platformFee})$$

### Numerical Worked Example
Consider an AC compressor replacement (classified as `complex` $\rightarrow$ 3 hours):
*   Provider Rate: 1,000 PKR / hour
*   Severity: `high` (Urgency Surcharge: 250 PKR)
*   Customer Loyalty Points: 350 (meaning 150 PKR potential discount)
*   Platform Config DB values:
    *   `visit_fee`: 500 PKR
    *   `platform_fee_fixed`: 50 PKR
    *   `platform_fee_percent`: 5%
    *   `loyalty_discount_cap`: 200 PKR

#### Calculation steps:
1.  $\text{laborFee} = 1000 \times 3 = 3000\text{ PKR}$
2.  $\text{urgencySurcharge} = 250\text{ PKR}$
3.  $\text{loyaltyDiscount} = \min(200, \lfloor 350 / 100 \rfloor \times 50) = \min(200, 150) = 150\text{ PKR}$
4.  $\text{serviceSubtotal} = 500\text{ (visit)} + 3000\text{ (labor)} + 250\text{ (urgency)} - 150\text{ (loyalty)} = 3600\text{ PKR}$
5.  $\text{platformFee} = 50 + (3600 \times 5 / 100) = 50 + 180 = 230\text{ PKR}$
6.  $\text{Total} = \max(500, 3600 + 230) = \mathbf{3830\text{ PKR}}$

---

## 3. Reputation & Weighted Rating Updates

### Code Location & Functions
*   **File**: [reputationController.ts](file:///d:/DigitalKaam/backend/src/controllers/reputationController.ts)
*   **Function**: [updateReputation()](file:///d:/DigitalKaam/backend/src/controllers/reputationController.ts#L11)

### Execution & Logic Flow
1.  **Feedback Insertion**: Inserts review rating ($1 \text{ to } 5$ stars) and commentary into the `feedback` table.
2.  **Booking Closure**: Sets status of the target booking to `completed`.
3.  **Moving Rating Update**: Computes a weighted moving average using the provider's historical count:
    $$\text{newRating} = \frac{(\text{prevRating} \times \text{reviewCount}) + \text{incomingRating}}{\text{reviewCount} + 1}$$
    *The output is rounded to one decimal place.*
4.  **Recency Multiplier Reset**: Resets the provider's `review_recency_score` to $0.95$. Over time, if no reviews are posted, this score decays, lowering their score in matches.
5.  **Review Category Tracking**:
    *   `rating >= 4`: Increments `positive_reviews` by 1 in the `reputation` table.
    *   `rating <= 2`: Increments `negative_reviews` by 1 in the `reputation` table.

### Side Effects
*   **Future Matches**: A $5\star$ review increases the weighted score, ranking the provider higher for subsequent matching requests. A rating $\le 2$ has the opposite effect.

---

## 4. Dispute resolution & Refund Policy

### Code Location & Functions
*   **File**: [disputeController.ts](file:///d:/DigitalKaam/backend/src/controllers/disputeController.ts)
*   **Function**: [createDisputeTicket()](file:///d:/DigitalKaam/backend/src/controllers/disputeController.ts#L16)

### Business Rules & Refund Matrix
When a dispute ticket is opened, the system classifies the claim type and calculates the suggested refund and flagging actions:

| Dispute Type | Business Context | Recommended Refund | Provider Flagged |
| :--- | :--- | :--- | :--- |
| `no_show` | Provider did not arrive at location | $100\%$ of booking price | Yes |
| `price` | Customer overcharged (e.g. cash request) | $20\%$ of booking price | Yes |
| `quality` | Poor service quality / issues remain | $30\%$ of booking price | Yes |
| `cancellation` | Provider cancelled short notice | $100\%$ of booking price | No |
| `overrun` | Time overrun without prior agreement | $15\%$ of booking price | Yes |

### State Updates & Side Effects
1.  **Booking State**: Sets the booking's `status` to `disputed`.
2.  **Dispute Records**: Creates a ticket in `disputes` under status `under_review`, linking the refund amount.
3.  **Provider Penalties**: If `providerFlagged = true`, the system queries the `reputation` table for the provider and increments both `complaints` and `disputes` counters by 1. This lowers their matches rating score.
