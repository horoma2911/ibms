# Changelog

All notable changes to this project.

## [Unreleased]
- Fixed role-check logic in `AttendanceController` and `EmployeeController` to use Eloquent attributes.
- Added global `ibmsFetch` wrapper for consistent API headers, auth tokens, and 401 handling.
- Replaced scattered `fetch` calls to use `ibmsFetch` in kiosk/attendance/QR/admin scripts.
- Implemented responsive sidebar toggler with desktop collapse and mobile slide-in overlay.
- Polished CSS (font smoothing, hover fallbacks, UI shadows, card styles) for a more professional look.
- Added Capacitor scaffold (`capacitor.config.json`) and `MOBILE_SETUP.md`.
- Built frontend assets and verified Laravel dev server serves frontend and API.
- Ran PHPUnit feature tests (all passing).

