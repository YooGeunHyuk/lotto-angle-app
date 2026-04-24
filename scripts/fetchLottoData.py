import requests
import json
import time
import os

OUTPUT_PATH = os.path.join(os.path.dirname(__file__), '../data/lotto_history.json')
DELAY = 0.15

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://www.dhlottery.co.kr/gameResult.do?method=byWin',
    'Accept': 'application/json, text/javascript, */*; q=0.01',
}

def fetch_draw(draw_no, retries=3):
    url = f'https://www.dhlottery.co.kr/common.do?method=getLottoNumber&drwNo={draw_no}'
    for attempt in range(retries):
        try:
            res = requests.get(url, headers=HEADERS, timeout=10)
            data = res.json()
            if data.get('returnValue') != 'success':
                return None
            return {
                'drwNo': data['drwNo'],
                'drwNoDate': data['drwNoDate'],
                'numbers': [data['drwtNo1'], data['drwtNo2'], data['drwtNo3'], data['drwtNo4'], data['drwtNo5'], data['drwtNo6']],
                'bonus': data['bnusNo'],
                'firstWinamnt': data['firstWinamnt'],
                'firstPrzwnerCo': data['firstPrzwnerCo'],
            }
        except Exception as e:
            if attempt < retries - 1:
                print(f' [재시도 {attempt+1}]', end='', flush=True)
                time.sleep(1 * (attempt + 1))
    return None

def get_latest_draw_no():
    lo, hi = 1100, 1300
    while lo < hi:
        mid = (lo + hi + 1) // 2
        data = fetch_draw(mid)
        if data:
            lo = mid
        else:
            hi = mid - 1
        time.sleep(DELAY)
    return lo

def main():
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)

    existing = []
    if os.path.exists(OUTPUT_PATH):
        with open(OUTPUT_PATH) as f:
            existing = json.load(f)
        print(f'기존 데이터: {len(existing)}회차')

    start_from = existing[-1]['drwNo'] + 1 if existing else 1

    print('최신 회차 확인 중...')
    latest_no = get_latest_draw_no()
    print(f'최신 회차: {latest_no}회')
    print(f'{start_from}회차부터 {latest_no}회차까지 수집 시작...')

    results = list(existing)
    for i in range(start_from, latest_no + 1):
        draw = fetch_draw(i)
        if draw:
            results.append(draw)
        if i % 50 == 0 or i == latest_no:
            print(f'\r{i}/{latest_no}회차 완료', end='', flush=True)
            with open(OUTPUT_PATH, 'w') as f:
                json.dump(results, f, ensure_ascii=False, indent=2)
        time.sleep(DELAY)

    print(f'\n완료! 총 {len(results)}회차 저장 → {OUTPUT_PATH}')

if __name__ == '__main__':
    main()
