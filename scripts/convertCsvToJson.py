import csv
import json
import os

INPUT = os.path.join(os.path.dirname(__file__), '../data/Lottery.csv')
OUTPUT = os.path.join(os.path.dirname(__file__), '../data/lotto_history.json')

results = []
with open(INPUT, encoding='utf-8-sig') as f:
    reader = csv.DictReader(f)
    for row in reader:
        try:
            drw_no = int(str(row['prize_num']).strip())
            numbers = sorted([
                int(str(row['1']).strip()),
                int(str(row['2']).strip()),
                int(str(row['3']).strip()),
                int(str(row['4']).strip()),
                int(str(row['5']).strip()),
                int(str(row['6']).strip()),
            ])
            results.append({
                'drwNo': drw_no,
                'drwNoDate': str(row['date']).strip(),
                'numbers': numbers,
                'bonus': int(str(row['Bonus']).strip()),
            })
        except:
            continue

results.sort(key=lambda x: x['drwNo'])

with open(OUTPUT, 'w', encoding='utf-8') as f:
    json.dump(results, f, ensure_ascii=False, indent=2)

print(f'완료! {len(results)}회차 변환 → {OUTPUT}')
print(f'첫 회차: {results[0]}')
print(f'마지막 회차: {results[-1]}')
