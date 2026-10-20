"""Allow the demo domain `@lms.local`.

email-validator rejects special-use TLDs by default; removing 'local' from the
module-level list is the documented escape hatch (seed accounts use lms.local).
"""

import email_validator

if "local" in email_validator.SPECIAL_USE_DOMAIN_NAMES:
    email_validator.SPECIAL_USE_DOMAIN_NAMES.remove("local")
