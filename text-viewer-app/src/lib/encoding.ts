import { Buffer } from 'buffer';
import iconv from 'iconv-lite';

export interface DecodedText {
  text: string;
  encoding: string;
}

/**
 * base64로 읽은 파일 내용을 인코딩 자동 감지 후 문자열로 디코딩한다.
 * 감지 순서: BOM(UTF-16LE/BE, UTF-8) → UTF-8 유효성 검사 → CP949(EUC-KR 확장) 폴백.
 * 국내 텍스트 파일 대부분이 UTF-8 아니면 CP949라서 이 두 단계로 충분하다.
 */
export function decodeTextFromBase64(base64: string): DecodedText {
  const buf = Buffer.from(base64, 'base64');

  if (buf.length >= 2) {
    if (buf[0] === 0xff && buf[1] === 0xfe) {
      return { text: iconv.decode(buf.subarray(2), 'utf16-le'), encoding: 'UTF-16LE' };
    }
    if (buf[0] === 0xfe && buf[1] === 0xff) {
      return { text: iconv.decode(buf.subarray(2), 'utf16-be'), encoding: 'UTF-16BE' };
    }
  }
  if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    return { text: buf.subarray(3).toString('utf8'), encoding: 'UTF-8' };
  }
  if (isValidUtf8(buf)) {
    return { text: buf.toString('utf8'), encoding: 'UTF-8' };
  }
  return { text: iconv.decode(buf, 'cp949'), encoding: 'CP949' };
}

function isValidUtf8(buf: Buffer): boolean {
  let i = 0;
  const len = buf.length;
  while (i < len) {
    const b = buf[i];
    if (b < 0x80) {
      i += 1;
      continue;
    }
    let extra: number;
    if ((b & 0xe0) === 0xc0) {
      extra = 1;
      if (b < 0xc2) return false; // overlong
    } else if ((b & 0xf0) === 0xe0) {
      extra = 2;
    } else if ((b & 0xf8) === 0xf0) {
      extra = 3;
      if (b > 0xf4) return false;
    } else {
      return false;
    }
    // 파일 끝에서 잘린 멀티바이트는 무효로 처리
    if (i + extra > len - 1) return false;
    for (let j = 1; j <= extra; j++) {
      if ((buf[i + j] & 0xc0) !== 0x80) return false;
    }
    i += extra + 1;
  }
  return true;
}
