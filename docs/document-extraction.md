# Document extraction architecture

`DocumentExtractionProvider` isolates OCR vendors. The safe development provider returns candidate
fields with confidence scores and sends nothing externally. Uploads pass extension, MIME, signature,
and size validation first.

Extraction stores a source hash, provider, candidates, status, and short expiry—not a warranty
document binary. Candidates appear in a review step and are never saved as warranty facts without
customer correction and form submission.

A production adapter must define credentials, data residency, retention/deletion, timeouts, redacted
logging, and Bangla/English support. Production configuration rejects the mock provider.
