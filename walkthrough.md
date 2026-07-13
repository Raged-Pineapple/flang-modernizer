# Walkthrough - Connecting C++ Backend & GitHub Integration

We have connected the compiled C++ `flang-modernizer` static analyzer running inside WSL with the React frontend on Windows, and added a feature to pull and analyze complete GitHub repositories.

---

## 1. Connecting the Local Frontend and Backend

### Changes Made
* **Unified Express.js API Server (`server.js`):** Runs on Windows, bridging calls directly to the C++ executable inside WSL using:
  `wsl -d Ubuntu -e /home/dell/flang-modernizer/build/tools/flang-modernizer/flang-modernizer`
* **Safe Offline Fallback:** If the API server is offline or fails, the React app displays a warning message in the terminal and falls back to browser-side regex analysis.

---

## 2. GitHub Workspace Integration

We added the ability to input a public GitHub repository link, clone it, scan for all Fortran files recursively, run semantic analysis on the entire codebase, and display a report, all while streaming progress to the UI.

### Changes Made

#### A. Backend Stream API (`GET /api/analyze-github`)
* Exposes a Server-Sent Events (SSE) stream endpoint to push real-time status updates back to the browser client.
* **Verification:** Natively runs `git ls-remote <repoUrl>` using **`simple-git`** to verify remote existence in under a second before committing resources.
* **Shallow Clone (`--depth 1`):** Clones only the latest commit of the repository to a unique temp directory (`os.tmpdir()`), keeping network and disk footprints minimal.
* **Scan & Clean:** Recursively scans the directories for all files matching `.f`, `.f90`, `.f77`, `.for`, `.f95`, `.f03`, and `.f08` extensions. Executes the compiled C++ binary in WSL and deletes the temporary files immediately.

#### B. Frontend Workspace (`App.tsx`)
* Added a new **GitHub Integration** tab in the main navigation bar.
* Implemented an **Analyze Remote Repository** action card.
* Configured an `EventSource` reader that listens to the API events and updates the progress checklist overlay and sidebar terminal in real-time.
* Displays the final generated report dynamically on completion.

---

## 3. Persistent Analysis History Tab

We added a fully-featured, high-fidelity History tab that stores all generated compilation reports across sessions.

### Changes Made
* **Local Storage Persistence:** Created a custom sync listener hook that serializes and loads the analysis reports history (`reportHistory` state array) to/from `localStorage` automatically.
* **Badge Notification on Navbar:** Placed a responsive count badge (`History 1`) next to the navigation link that updates live when new reports are compiled or deleted.
* **History Management Dashboard:**
  * **Dynamic Search & Filtering:** Users can filter prior reports using the interactive search input by project title/type.
  * **Interactive Report Inspection:** Reopens the modal view for any specific report in the history using the **Open** button.
  * **Management Actions:** Supports deleting individual records or completely purging history via the **Clear History** confirmation dialog.

---

## Verification Results

### 1. GitHub Integration Verification (Local Test)
We ran an end-to-end GET request pointing to the `flang-modernizer` repository. The API:
1. Verified the repository is public and accessible.
2. Cloned the commit data.
3. Discovered 31 Fortran source files (`testcases/*.f`, `case_study/*.f`).
4. Successfully ran the static analysis binary on all 31 files at once.
5. Returned the report and closed the connection cleanly.

---

## How to Use GitHub Integration

1. Start the API server on Windows (bridging is fully managed):
   ```powershell
   cd d:\cdlabel\flang-modernizer
   node server.js
   ```
2. Start the React frontend:
   ```powershell
   cd d:\cdlabel\flang-modernizer\frontend
   npm run dev
   ```
3. Open `http://localhost:5173/` in your browser.
4. Click on the **GitHub Integration** tab in the navigation bar.
5. Paste any public Fortran repository link (e.g. `https://github.com/Raged-Pineapple/flang-modernizer`) and click **Verify & Analyze**!
