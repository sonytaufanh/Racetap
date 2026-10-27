#!/bin/bash

# URL API eksternal yang lambat
API_URL="https://time.feibot.com/api/scores-data/16SdOAUV7k"

# Lokasi penyimpanan di server Anda (sesuaikan path-nya)
TEMP_FILE="/home/race4483/public_html/results/Monkey-Forest-Ubud-Run-2026/data_temp.json"
FINAL_FILE="/home/race4483/public_html/results/Monkey-Forest-Ubud-Run-2026/data.json"

# Unduh API menggunakan curl
# -s : silent mode (tidak menampilkan progress bar)
# --max-time 60 : batasi waktu maksimal 60 detik agar script tidak menggantung jika API mati
curl -s --max-time 60 "$API_URL" > "$TEMP_FILE"

# Validasi: Pastikan ukuran file temporary lebih dari 0 bytes (download berhasil & tidak kosong)
if [ -s "$TEMP_FILE" ]; then
    # Timpa file lama dengan file baru secara instan
    mv "$TEMP_FILE" "$FINAL_FILE"
else
    # Opsional: Catat error ke file log jika download gagal
    echo "$(date): Gagal mengunduh API atau data kosong" >> /home/race4483/public_html/results/Monkey-Forest-Ubud-Run-2026/error_api.log
fi
