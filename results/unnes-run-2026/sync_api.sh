#!/bin/bash

# URL API eksternal yang lambat
API_URL="https://time.feibot.com/api/scores-data/SHHWGZsNRM"

# Lokasi penyimpanan: folder tempat script ini berada
DIR="$(cd "$(dirname "$0")" && pwd)"
TEMP_FILE="$DIR/data_temp.json"
FINAL_FILE="$DIR/data.json"

# Unduh API menggunakan curl
# -s : silent mode (tidak menampilkan progress bar)
# --max-time 60 : batasi waktu maksimal 60 detik agar script tidak menggantung jika API mati
curl -s --max-time 60 "$API_URL" > "$TEMP_FILE"

# Validasi: Pastikan file hasil download adalah JSON yang valid
if [ -s "$TEMP_FILE" ] && python3 -c "import json,sys; json.load(open(sys.argv[1]))" "$TEMP_FILE" 2>/dev/null; then
    # Timpa file lama dengan file baru secara instan
    mv "$TEMP_FILE" "$FINAL_FILE"
else
    rm -f "$TEMP_FILE"
    # Catat error ke file log jika download gagal atau bukan JSON valid
    echo "$(date): Gagal mengunduh API atau data tidak valid" >> "$DIR/error_api.log"
fi
