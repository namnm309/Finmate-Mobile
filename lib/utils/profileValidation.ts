/**
 * Validation cho các trường thông tin tài khoản
 */

/** SĐT Việt Nam: bắt đầu bằng 0, đúng 10 số */
export function validatePhoneVN(value: string): { valid: boolean; message?: string } {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 0) return { valid: false, message: 'Vui lòng nhập số điện thoại' };
  if (digits[0] !== '0') return { valid: false, message: 'Số điện thoại Việt Nam phải bắt đầu bằng 0' };
  if (digits.length !== 10) return { valid: false, message: `Số điện thoại phải đúng 10 số (hiện có ${digits.length} số)` };
  return { valid: true };
}

/** Tên: chỉ chữ cái và khoảng trắng, viết hoa chữ đầu mỗi từ */
export function validateFullName(value: string): { valid: boolean; message?: string; normalized?: string } {
  const trimmed = value.trim();
  if (trimmed.length === 0) return { valid: false, message: 'Vui lòng nhập họ và tên' };
  if (/\d/.test(trimmed)) return { valid: false, message: 'Tên không được chứa số' };
  if (/[!@#$%^&*()_+=\[\]{};':"\\|,.<>\/?`~]/.test(trimmed)) return { valid: false, message: 'Tên không được chứa ký tự đặc biệt' };
  if (!/^[\p{L}\s]+$/u.test(trimmed)) return { valid: false, message: 'Tên chỉ được chứa chữ cái và khoảng trắng' };
  const normalized = trimmed
    .split(/\s+/)
    .map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1).toLowerCase() : ''))
    .join(' ')
    .trim();
  return { valid: true, normalized };
}

/** Ngày sinh: hợp lệ, không ở tương lai, tuổi hợp lý (5-120) - so sánh theo ngày local tránh lệch múi giờ */
export function validateDateOfBirth(date: Date): { valid: boolean; message?: string } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  if (dateOnly > today) return { valid: false, message: 'Ngày sinh không được ở tương lai' };
  const age = (today.getTime() - dateOnly.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  if (age < 5) return { valid: false, message: 'Ngày sinh không hợp lệ (tuổi phải từ 5 trở lên)' };
  if (age > 120) return { valid: false, message: 'Ngày sinh không hợp lệ (tuổi không quá 120)' };
  return { valid: true };
}

/** Nghề nghiệp: chữ cái, số, khoảng trắng, dấu gạch ngang. Không ký tự đặc biệt lạ */
export function validateOccupation(value: string): { valid: boolean; message?: string } {
  const trimmed = value.trim();
  if (trimmed.length === 0) return { valid: false, message: 'Vui lòng nhập nghề nghiệp' };
  if (/[!@#$%^&*()_+=\[\]{};':"\\|<>\/?`~]/.test(trimmed)) return { valid: false, message: 'Nghề nghiệp không được chứa ký tự đặc biệt' };
  if (trimmed.length > 100) return { valid: false, message: 'Nghề nghiệp không quá 100 ký tự' };
  return { valid: true };
}

/** Format SĐT khi nhập: chỉ cho phép số, tối đa 10 ký tự */
export function formatPhoneInput(text: string): string {
  const digits = text.replace(/\D/g, '').slice(0, 10);
  return digits;
}

/** Gợi ý định dạng cho từng trường */
export const FORMAT_HINTS: Record<string, string> = {
  phoneNumber: 'Định dạng: Bắt đầu bằng 0, đúng 10 số. VD: 0912345678',
  fullName: 'Định dạng: Chỉ chữ cái, viết hoa chữ đầu. VD: Nguyễn Văn A',
  occupation: 'Định dạng: Chữ, số, khoảng trắng. Không ký tự đặc biệt',
  dateOfBirth: 'Chọn ngày trong quá khứ, tuổi từ 5-120',
};

/** Kiểm tra và trả về lỗi validation (null nếu hợp lệ) */
export function getFieldValidationError(
  fieldKey: string,
  textValue: string,
  dateValue?: Date | null
): string | null {
  if (fieldKey === 'dateOfBirth') {
    if (!dateValue) return 'Vui lòng chọn ngày sinh';
    const check = validateDateOfBirth(dateValue);
    return check.valid ? null : check.message ?? null;
  }
  if (fieldKey === 'address') return null; // Địa chỉ không validate chặt
  const raw = textValue.trim();
  if (!raw) return 'Vui lòng nhập giá trị';
  if (fieldKey === 'phoneNumber') {
    const check = validatePhoneVN(raw);
    return check.valid ? null : check.message ?? null;
  }
  if (fieldKey === 'fullName') {
    const check = validateFullName(raw);
    return check.valid ? null : check.message ?? null;
  }
  if (fieldKey === 'occupation') {
    const check = validateOccupation(raw);
    return check.valid ? null : check.message ?? null;
  }
  return null;
}
