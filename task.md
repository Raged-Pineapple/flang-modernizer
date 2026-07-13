# Tasks

- [x] Implement GitHub Analysis Backend
  - [x] Add simple-git dependency
  - [x] Implement GET /api/analyze-github endpoint with SSE in server.js
  - [x] Add directory walker to find Fortran files recursively
  - [x] Integrate WSL C++ compiler execution and cleanup
- [x] Connect Frontend GitHub Tab in App.tsx
  - [x] Create GitHub tab layout matching existing UI designs
  - [x] Integrate Input validation and check remote repository existence
  - [x] Add EventSource reader for streaming terminal progress
  - [x] Display final parsed live report
- [x] Verification
  - [x] Verify cloning, scans, and analyses work end-to-end
- [x] Implement History Tab in Frontend
  - [x] Add reportHistory state and hook listener in App.tsx
  - [x] Add Navigation Link item in navbar
  - [x] Render History Page with search, list grid, view report, and delete triggers
  - [x] Verify persistence, delete, and clear actions work cleanly
