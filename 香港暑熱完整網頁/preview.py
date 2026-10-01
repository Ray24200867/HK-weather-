"""數據新聞本地預覽伺服器：提供整個項目文件夾，並代理天文台 HKHI 數據。"""
import os
import sys
import threading
import time
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.abspath(__file__))
MAP_DIST = "/香港暑熱指數/dist"
HKHI_URL = "https://data.weather.gov.hk/weatherAPI/hko_data/regional-weather/recent10_10min_hkhi.csv"


_cache = {"time": 0, "body": None}
_lock = threading.Lock()


def fetch_hkhi():
    """同一分鐘內的請求共用一份數據；失敗時重試一次。"""
    with _lock:
        if _cache["body"] and time.time() - _cache["time"] < 60:
            return _cache["body"]
        for attempt in range(2):
            try:
                with urllib.request.urlopen(HKHI_URL, timeout=15) as upstream:
                    _cache.update(time=time.time(), body=upstream.read())
                return _cache["body"]
            except Exception:
                if attempt == 1:
                    raise


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        # 預覽時不要快取，改完檔案刷新就能看到最新版
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_GET(self):
        # 地圖網站向 /api/hkhi 取數據，由這裡轉發到天文台
        # 網站讀 data/hkhi-latest.csv；本地預覽時直接轉發天文台最新數據
        # （放上 GitHub 後由 .github/workflows/hkhi.yml 每 10 分鐘更新這個文件）
        if self.path.split("?")[0] in ("/api/hkhi", "/data/hkhi-latest.csv"):
            try:
                body = fetch_hkhi()
                self.send_response(200)
                self.send_header("Content-Type", "text/csv; charset=utf-8")
                self.send_header("Cache-Control", "no-store")
                self.end_headers()
                self.wfile.write(body)
            except Exception as error:
                self.send_error(502, str(error))
            return
        # 地圖網站用絕對路徑 /assets/... 載入程式和底圖
        if self.path.startswith("/assets/"):
            self.path = urllib.request.quote(MAP_DIST) + self.path
        super().do_GET()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    print(f"數據新聞預覽：http://127.0.0.1:{port}/")
    ThreadingHTTPServer(("127.0.0.1", port), Handler).serve_forever()
