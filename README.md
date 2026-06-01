# NHCX Hospital Cashless Portal

A modern React application for hospitals to manage the end-to-end cashless insurance workflow on the NHCX network.

## 🚀 Key Features
- **End-to-End Workflow**: Walk through patient selection, preauthorization, claims submission, and payment reconciliation.
- **Dual API Mode**: Toggle between static mock data (for testing/design) and real network calls to a backend.
- **Workflow Persistence**: Automatically saves your progress. If you close the tab, you can resume exactly where you left off from the dashboard.
- **Modern UI**: Built with React, Framer Motion, and Lucide icons, featuring a sleek, responsive design.

---

## 🔄 The Cashless Workflow

The application guides the hospital user through a linear step-by-step process:

### 1. Dashboard (`/`)
- **Overview**: View statistics and a list of all current cashless claims.
- **Patient Detail**: Click a patient's name to view full demographics, past visits, invoices, and claims.
- **Action**: Click "Start Workflow" on a patient to begin a new claim, or click "Resume" on the banner to continue an interrupted workflow.

### 2. Payer & Policy Selection (`/claims/:id/payer`)
- **Discovery**: Searches for the patient's linked active health policies.
- **Action**: Select the correct payer and policy to use for this specific admission.

### 3. Eligibility & Preparation (`/claims/:id/prep`)
- **Clinical Entry**: Enter admission details, diagnosis codes (ICD-10), and procedure codes.
- **Financials**: Add bill items (room charges, ICU, surgery, etc.) to calculate the estimated total amount.
- **Action**: Generate the preauthorization draft.

### 4. Preauthorization Review (`/claims/:id/review`)
- **Review**: Ensure all clinical and financial details are mapped correctly in the NHCX format.
- **Documentation**: Attach required supporting documents (ID proofs, prescriptions, clinical notes).
- **Action**: Submit the preauthorization to the payer.

### 5. Preauthorization Status (`/claims/:id/status`)
- **Adjudication**: Polls the gateway for the payer's decision (`APPROVED`, `PARTIALLY_APPROVED`, `QUERIED`, `REJECTED`).
- **Actions available based on decision**:
  - `APPROVED`: Request **Enhancement** (add new procedures) or proceed to **Prepare Claim**.
  - `QUERIED`: Respond to the query with notes/documents, or **Resubmit**.
  - `REJECTED`: Resubmit or start an appeal/reprocess.

### 6. Claim Submission Wizard (`/claims/:id/claim`)
A strict 4-step wizard that handles the final billing phase:
1. **Draft**: Review the final bill items and diagnoses. 
2. **Discharge Claim**: Submit a provisional claim (Workflow 14) the moment the patient is discharged.
3. **Final Claim**: Once billing is finalized, submit the full claim (Workflow 5) referencing the discharge correlation ID.
4. **Decision**: Wait for final adjudication and approved amounts.

### 7. Post-Claim
- **Reprocess/Appeal** (`/claims/:id/reprocess`): Submit corrections if a claim is rejected or under-paid.
- **Payments** (`/claims/:id/payment`): View UTR numbers and payment reconciliation.

---

## 🛠 Technical Details

### API Layer (`src/api.js`)
The application can run without a backend for demonstration purposes.
- Open `src/api.js`.
- Set `const USE_MOCK = true;` to use instant dummy data.
- Set `const USE_MOCK = false;` to send real HTTP requests to the backend defined in `.env` (`VITE_API_BASE_URL`).
- The top-bar UI shows a badge (**⚡ MOCK** or **🟢 LIVE**) indicating the current mode.

### Workflow State & Storage (`src/workflowStorage.js`)
All workflow state (selected patient, preauth drafts, claim stepper positions) is hoisted to `App.jsx` and continuously persisted to `localStorage`.
- **App-level State**: `nhcx_workflow_<child_id>` stores the current route and case data.
- **Claims Wizard State**: `nhcx_claims_<claim_id>` stores which steps of the final claim have been completed.

### Styling
- All styling is handled via pure CSS in `App.css`. 
- No external UI libraries (like Tailwind or Bootstrap) are used, ensuring maximum customizability.

## 📦 Running Locally

```bash
# Install dependencies
npm install

# Start the Vite development server
npm run dev
```
