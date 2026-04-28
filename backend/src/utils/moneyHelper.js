// backend/src/utils/moneyHelper.js
export function moneyToWordsVn(n) {
  n = Math.round(Number(n || 0));
  if (n === 0) return "Tổng số tiền (viết bằng chữ): Không đồng";

  const units = ["", "nghìn", "triệu", "tỷ", "nghìn tỷ", "triệu tỷ"];
  const digits = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];

  function readTriple(num) {
    let str = "";
    const [hund, ten, unit] = [
      Math.floor(num / 100),
      Math.floor((num % 100) / 10),
      num % 10,
    ];
    if (hund > 0) {
      str += digits[hund] + " trăm";
      if (ten === 0 && unit > 0) str += " linh";
    }
    if (ten > 1) {
      str += " " + digits[ten] + " mươi";
      if (unit === 1) str += " mốt";
      else if (unit === 5) str += " lăm";
      else if (unit > 0) str += " " + digits[unit];
    } else if (ten === 1) {
      str += " mười";
      if (unit === 5) str += " lăm";
      else if (unit > 0) str += " " + digits[unit];
    } else if (ten === 0 && unit > 0 && hund === 0) {
      str += digits[unit];
    } else if (ten === 0 && unit > 0) {
      str += " " + digits[unit];
    }
    return str.trim();
  }

  if (n === 0) return "Tổng số tiền (viết bằng chữ): Không đồng";

  let str = "";
  let i = 0;
  while (n > 0 && i < units.length) {
    const part = n % 1000;
    if (part > 0) {
      const read = readTriple(part);
      str = read + " " + units[i] + " " + str;
    }
    n = Math.floor(n / 1000);
    i++;
  }

  str = str.trim().replace(/\s+/g, " ");
  return "Tổng số tiền (viết bằng chữ): " + str.charAt(0).toUpperCase() + str.slice(1) + " đồng";
}
