#!/bin/zsh
cd -- "${0:A:h}"
export PATH="/opt/anaconda3/bin:/usr/local/bin:/opt/homebrew/bin:/usr/bin:$PATH"

port=8000
while nc -z 127.0.0.1 "$port" >/dev/null 2>&1; do
  (( port += 1 ))
done

(sleep 1 && open "http://127.0.0.1:${port}/") &
echo "保持此視窗開啟；按 Control-C 停止預覽。"
python3 preview.py "$port"
