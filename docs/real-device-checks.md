# Checks that need actual devices or assistive technology

These are pending checks, not completed results. On October 29 the connected Windows device had no authorized Android device and no NVDA executable at standard installation paths or command lookup; no iOS/VoiceOver device was available. Use the deployed release, record device/OS/browser versions and keep a pass/fail note with evidence for each step.

## iPhone / VoiceOver

1. Open the website in Safari. Rotate between portrait and landscape and check 200% text zoom and the bottom safe area.
2. With VoiceOver enabled, navigate headings, the main tab bar, catalog search, result buttons and the Saved controls. Check that the visible label matches the spoken name and active tabs are announced.
3. Search, save, reload, switch grid/list, filter the collection and download/import a collection through Files. Verify the downloaded file on a second physical device. Create an optional cloud collection, connect its private key on a second device, verify add/remove synchronization and ensure disconnect/delete preserve the promised local items. Do not record the key in evidence.
4. Open Sources & privacy. Verify that focus moves into the dialog, stays inside it and returns to the opening control after closing.
5. In Together, leave a participant empty, enter an invalid duration, then find a shared title. Confirm that errors and results are spoken once without losing the current field.
6. Run one valid Qloo discovery journey after the production error is fixed. Check the loading, success, no-match and rate-limited messages without exhausting the provider quota.

## Windows / NVDA

1. Repeat the main journey in Chrome or Firefox with NVDA, using headings, landmarks, form-field navigation and browse/focus modes.
2. Check tab order, visible keyboard focus, Space/Enter actions and Escape to close the privacy dialog.
3. Verify the collection import status, empty results and discovery status announcements.

## Android / TalkBack

Repeat the catalog, collection transfer and group flows in Chrome with TalkBack and a physical touch screen. Check keyboard obstruction, reachability and the fixed tab bar.

A screen-reader accessibility tree or an automated axe pass does not count as performing these checks. Do not mark them passed until they have been observed on the stated device/tool.
