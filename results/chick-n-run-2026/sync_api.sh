#!/bin/bash

# Syncs the public scores feed into data.json for this event directory.
# Paths are resolved from the script location, so the directory can be moved.
#
#   ./sync_api.sh
#
# Cron example (every 5 minutes):
#   */5 * * * * /path/to/results/<slug>/sync_api.sh >/dev/null 2>&1

set -u

API_URL="https://time.feibot.com/api/scores-data/CmG4rWafvp"

DIR="$(cd "$(dirname "$0")" && pwd)"
TEMP_FILE="$DIR/data_temp.json"
FINAL_FILE="$DIR/data.json"
LOG_FILE="$DIR/error_api.log"

# Download the (slow) upstream feed; give up after 60 seconds.
curl -s --max-time 60 "$API_URL" > "$TEMP_FILE"

# Only replace data.json when the download is non-empty and valid JSON.
if [ -s "$TEMP_FILE" ] && python3 -c "import json,sys; json.load(open(sys.argv[1]))" "$TEMP_FILE" 2>/dev/null; then
    mv "$TEMP_FILE" "$FINAL_FILE"
else
    rm -f "$TEMP_FILE"
    echo "$(date): Gagal mengunduh API atau data tidak valid" >> "$LOG_FILE"
fi