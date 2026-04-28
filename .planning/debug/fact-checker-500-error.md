---
status: investigating
trigger: "Fact Checker returns 'Could not check this claim' even after fixing credential paths."
created: 2026-04-28
updated: 2026-04-28
symptoms:
  expected: "Fact check verdict (True/False) with explanation and sources."
  actual: "Generic frontend error: 'Could not check this claim. Please try again.'"
  errors: "500 Internal Server Error on /api/fact-check"
  timeline: "Started after localized Navi Mumbai scenario was added and credentials path was updated."
  reproduction: "Visit /fact-check, enter 'i need adhar to vote', click Check."
Current Focus:
  hypothesis: "Vertex AI API is either not enabled, or the service account lacks the 'Vertex AI User' role for project 'promptchallenge2'."
  next_action: "Examine backend logs for specific Google API error codes (e.g. 403 Permission Denied or 404 API Not Enabled)."
---

# Evidence
- Fixed UnicodeDecodeError by adding utf-8 encoding to JSON reads.
- Fixed GOOGLE_APPLICATION_CREDENTIALS path to ../credentials/service-account.json.

# Eliminated Hypotheses
- hypothesis: "Missing JSON files or Encoding issues"
  reason: "Fixed in previous turns, traceback no longer shows Unicode errors."
