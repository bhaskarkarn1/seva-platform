# SEVA Platform — Instructions to Run

## Live Deployment (Recommended)
- **Frontend**: https://seva-ui.vercel.app
- **Backend API**: https://seva-backend.onrender.com

No setup needed — open the frontend URL and use Mission Control to generate a deployment brief.

---

## Local Setup

### Prerequisites
- Python 3.11+
- Node.js 18+
- pip / npm

### 1. Backend (FastAPI)
```bash
cd seva-platform/backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
Backend runs at http://localhost:8000
API docs at http://localhost:8000/docs

### 2. Frontend (React + Vite)
```bash
cd seva-platform/seva-ui
npm install
npm run dev
```
Frontend runs at http://localhost:5173

### 3. Quick Test
1. Open Mission Control page
2. Select: Event Type = "IPL Match", Location = "M.Chinnaswamy Stadium", Time = any evening
3. Click "Generate Brief"
4. View: Risk assessment, officer deployment, barricade zones, diversion routes, and citizen advisory

### Key Pages
- **Mission Control**: Generate deployment briefs for any event scenario
- **Data Explorer**: Interactive EDA of 8,057 ASTraM events
- **Model Performance**: ML model metrics (LightGBM closure/priority/resolution)
- **Vulnerability Intel**: Station-level risk profiles across 54 stations
- **Post-Event Learning**: Feedback loop for continuous improvement

### Tech Stack
- Backend: FastAPI, LightGBM, Google OR-Tools (MILP), OSMnx, SHAP
- Frontend: React 19, Recharts, Leaflet, MapmyIndia SDK
- Deployment: Vercel (frontend) + Render (backend)
