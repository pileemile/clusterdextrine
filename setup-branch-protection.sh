set -euo pipefail

REPO="${1:?Usage: $0 owner/repo}"

gh api --method POST "repos/${REPO}/rulesets" --input - <<'JSON'
{
  "name": "Protect main and dev (AISlop)",
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

echo "Ruleset créé sur ${REPO} pour main et dev."
