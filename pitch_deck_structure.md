# SEVA - Pitch Deck Structure (Flipkart Gridlock Hackathon 2.0)

To secure a Top 10 finish, your pitch must focus on **mathematical rigor, defensible data, and operational reality**. Do not use buzzwords without backing them up. Speak directly to the Bengaluru Traffic Police and Flipkart Engineering Leadership.

## Slide 1: The Title & The Problem
- **Title:** SEVA (Smart Event Vulnerability & Action)
- **Subtitle:** Data-Driven Resource Optimization for Event-Induced Congestion
- **The Core Problem:** Currently, ASTraM relies on intuition for deploying officers to events. This leads to under-staffing at high-risk spillover junctions and over-staffing at low-risk areas. Event impact isn't mathematically quantified beforehand.

## Slide 2: The Fallacy of "Fake Intelligence" (The Hook)
- **The Trap:** Most solutions invent arbitrary "Severity Scores" out of thin air without ground truth.
- **The SEVA Approach:** We built a strictly data-driven architecture. Every metric, priority level, and closure probability is derived *only* from the historical 8,173 ASTraM events provided. If it's not in the data, SEVA doesn't guess.

## Slide 3: The Architecture (How it Works)
- **Data Foundation:** Spatial imputation (K-NN) and strict temporal splitting (Train: Nov-Feb, Test: Mar-Apr) to prevent data leakage.
- **ML Engine (LightGBM):**
  - Model 1: Road Closure Probability (Handles 8.3% extreme imbalance).
  - Model 2: High/Low Priority Classification (ROC-AUC: 0.99).
  - Model 3: Resolution Time Quantile Regression (Provides confidence bounds: 25th, 50th, 75th percentiles).
- **The Optimizer (Google OR-Tools):** Uses Mixed Integer Linear Programming (MILP) to map active events to the 54 known police stations based on a 5km haversine constraint and historical station capacity.

## Slide 4: The Chinnaswamy Stadium Scenario (The Demo)
- **Context:** An IPL match ends. 40,000 people enter the surrounding grid.
- **Without SEVA (Intuition):** 3 officers are scattered evenly across MG Road, Queens Road, and Chinnaswamy. The result? A 41% coverage score and massive spillover congestion.
- **With SEVA (Optimized):** The MILP optimizer dynamically pulls 9 officers from nearby, capable stations (like Cubbon Park and Shivajinagar) based on historical severity and exact haversine distances. 
- **Result:** 100% targeted coverage, neutralizing the spillover effect before it breaks down the network.

## Slide 5: The Dashboard (Live Product)
- Include a 30-second recording of your Streamlit Dashboard here.
- Show the 3-tier deployment drop-down (Conservative, Expected, Peak) representing the quantile regression confidence bounds.
- Emphasize the "Live Replay" mode, demonstrating that this is not demo-ware; it ingests data sequentially exactly like a live production system.

## Slide 6: Business Value & Scalability
- **For ASTraM:** Moves enforcement from reactive to predictive. Maximizes the utility of limited officer headcount.
- **For Flipkart Logistics:** A 15% reduction in event-driven delays around major hubs translates to massive SLA compliance improvements during peak sale days (BBD).
- **Tech Stack:** Python, FastAPI, LightGBM, Google OR-Tools, Streamlit. 

## Slide 7: Conclusion & Q&A
- "SEVA doesn't just predict where the crowd will be. It mathematically guarantees that our officers are already there."
