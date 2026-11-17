#!/usr/bin/env bash
# Interdit les push directs sur main et dev : PR obligatoire + check "aislop" vert.
# Usage : bash scripts/setup-branch-protection.sh owner/repo   (nécessite gh authentifié, admin du repo)
set -euo pipefail

REPO="${1:?Usage: $0 owner/repo}"
NAME="Protect main and dev (AISlop)"

PAYLOAD=$(cat <<JSON
{
  "name": "${NAME}",
  "target": "branch",
  "enforcement": "active",
  "bypass_actors": [],
  "conditions": {
    "ref_name": {
      "include": ["refs/heads/main", "refs/heads/dev"],
      "exclude": []
    }
  },
  "rules": [
    { "type": "deletion" },
    { "type": "non_fast_forward" },
    {
      "type": "pull_request",
      "parameters": {
        "required_approving_review_count": 0,
        "dismiss_stale_reviews_on_push": false,
        "require_code_owner_review": false,
        "require_last_push_approval": false,
        "required_review_thread_resolution": false
      }
    },
    {
      "type": "required_status_checks",
      "parameters": {
        "strict_required_status_checks_policy": true,
        "required_status_checks": [{ "context": "aislop" }]
      }
    }
  ]
}
JSON
)

EXISTING_ID=$(gh api "repos/${REPO}/rulesets" --jq ".[] | select(.name == \"${NAME}\") | .id" | head -n1)

if [ -n "${EXISTING_ID}" ]; then
  echo "${PAYLOAD}" | gh api --method PUT "repos/${REPO}/rulesets/${EXISTING_ID}" --input - > /dev/null
  echo "Ruleset #${EXISTING_ID} mis à jour sur ${REPO} pour main et dev."
else
  echo "${PAYLOAD}" | gh api --method POST "repos/${REPO}/rulesets" --input - > /dev/null
  echo "Ruleset créé sur ${REPO} pour main et dev."
fi
