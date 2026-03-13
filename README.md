# Finmate Mobile

[![Expo](https://img.shields.io/badge/Expo-000020?logo=expo&logoColor=white)](https://expo.dev/)
[![React Native](https://img.shields.io/badge/React_Native-20232A?logo=react&logoColor=61DAFB)](https://reactnative.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Clerk](https://img.shields.io/badge/Auth-Clerk-6C47FF)](https://clerk.com/)

Ứng dụng quản lý tài chính cá nhân xây dựng bằng **Expo + React Native**, tập trung vào trải nghiệm nhập chi tiêu nhanh, theo dõi báo cáo, quản lý mục tiêu tiết kiệm và các tính năng phân tích tài chính bằng AI.

---

## 1) Tổng quan dự án

**Finmate Mobile** cung cấp một hệ sinh thái theo dõi tài chính cá nhân gồm:

- Ghi chép thu/chi theo danh mục.
- Quản lý nguồn tiền, đối tác giao dịch, công nợ, sự kiện/chuyến đi.
- Báo cáo và phân tích tài chính (thu nhập, chi tiêu, tổng quan).
- Thiết lập mục tiêu tiết kiệm và kế hoạch tiết kiệm.
- Trợ lý AI hỗ trợ tư vấn tài chính trong ứng dụng.
- Xác thực tài khoản an toàn thông qua Clerk (Email/OAuth).

---

## 2) Công nghệ sử dụng (Tech Stack)

## 2.1 Nền tảng & kiến trúc

- **Expo SDK 54**: runtime và tooling chính để phát triển app đa nền tảng.
- **React Native 0.81 + React 19**: framework giao diện mobile.
- **TypeScript**: chuẩn hóa kiểu dữ liệu, giảm lỗi runtime.
- **Expo Router**: tổ chức route theo thư mục `app/`, tách rõ auth/protected/tab flows.

## 2.2 UI/UX & tương tác

- **React Native Reanimated + Gesture Handler**: animation, tương tác mượt.
- **Expo Haptics**: phản hồi rung cho thao tác quan trọng.
- **expo-image / expo-image-picker / expo-image-manipulator**: xử lý ảnh.
- **react-native-calendars**: UI lịch cho các màn cần chọn ngày.
- **react-native-svg**: hiển thị chart/icon vector.
- **react-native-maps + expo-location**: tính năng liên quan vị trí/bản đồ (nếu bật trong màn hình tương ứng).

## 2.3 Xác thực & bảo mật

- **@clerk/clerk-expo**:
  - Đăng nhập, quản lý session.
  - Lấy token bằng `getToken()` và gắn Bearer token khi gọi API.
- **expo-secure-store**: lưu trữ an toàn thông tin nhạy cảm trên thiết bị.

## 2.4 Dữ liệu thời gian thực & API

- **Fetch API + custom API client (`lib/api.ts`)**:
  - Tự động gắn `Authorization: Bearer <token>`.
  - Chuẩn hóa xử lý lỗi, log lỗi/correlation id.
- **@microsoft/signalr** (`lib/realtime/useTransactionHub.ts`): realtime update giao dịch.

## 2.5 AI & giọng nói

- **Chat service** (`lib/services/chatService.ts`) cho tính năng trợ lý AI.
- **expo-speech-recognition** + `lib/hooks/useVoiceInput.ts` cho nhập liệu/điều khiển bằng giọng nói.

---

## 3) Cấu trúc thư mục chính

```text
app/                # Màn hình theo chuẩn Expo Router
  (auth)/           # Luồng đăng nhập/xác thực
  (protected)/      # Luồng sau đăng nhập
    (tabs)/         # Các tab chính
    (other-pages)/  # Các màn hình phụ
components/         # UI component tái sử dụng
contexts/           # State toàn cục bằng React Context
lib/
  services/         # Service gọi API theo domain
  storage/          # Local storage theo module
  types/            # Type definitions
  utils/            # Hàm tiện ích
hooks/              # Custom hooks
constants/          # Theme, hằng số dùng chung
styles/             # Style dùng chung
```

---

## 4) Danh sách màn hình (Screens)

## 4.1 Nhóm Authentication

- `app/index.tsx`: entry/splash routing.
- `app/(auth)/sign-in.tsx`: đăng nhập.
- `app/(auth)/verify-email.tsx`: xác thực email.

## 4.2 Nhóm Tab chính (sau đăng nhập)

- `app/(protected)/(tabs)/index.tsx`: dashboard/home tài chính.
- `app/(protected)/(tabs)/add.tsx`: thêm giao dịch nhanh.
- `app/(protected)/(tabs)/manual-input.tsx`: nhập tay chi tiết.
- `app/(protected)/(tabs)/report.tsx`: tổng hợp báo cáo.
- `app/(protected)/(tabs)/ai-assistant.tsx`: trợ lý AI.
- `app/(protected)/(tabs)/account.tsx`: thông tin & cấu hình tài khoản.
- `app/(protected)/(tabs)/other.tsx`: điều hướng sang nhóm tính năng mở rộng.

## 4.3 Nhóm màn hình mở rộng (Other Pages)

- Quản lý danh mục: `add-category`, `edit-categories`, `select-category`.
- Quản lý nguồn tiền: `add-money-source`, `edit-money-source`.
- Phân tích dữ liệu: `financial-analysis`, `income-analysis`, `expense-analysis`, `counterparty-analysis`.
- Mục tiêu tiết kiệm: `saving-goals`, `create-saving-goal`, `saving-plan`.
- Công nợ & sự kiện: `debt-tracking`, `trip-event`, `trip-event-detail`.
- Tiện ích bổ sung: `investment-suggestions`, `community`, `help`, `notifications`, `transaction-history`, `account-settings`, `theme-settings`.

---

## 5) Chức năng chính (Functions)

- **Đăng nhập/xác thực người dùng** bằng Clerk.
- **Ghi nhận giao dịch thu/chi** với danh mục và nguồn tiền.
- **Quản lý lịch sử giao dịch** và các bản ghi liên quan.
- **Báo cáo trực quan** qua biểu đồ/tổng quan thu chi.
- **Phân tích tài chính nâng cao** theo nhiều chiều dữ liệu.
- **Theo dõi mục tiêu tiết kiệm** và tiến độ thực hiện.
- **Quản lý công nợ** và đối tượng giao dịch.
- **Theo dõi chi tiêu theo chuyến đi/sự kiện**.
- **Trợ lý AI** hỗ trợ hỏi đáp tài chính và gợi ý.
- **Realtime cập nhật giao dịch** (SignalR).
- **Tùy chỉnh giao diện/theme** và thiết lập tài khoản.

---

## 6) Luồng xác thực & gọi API

1. Người dùng đăng nhập tại `sign-in`.
2. Clerk tạo session và app chuyển vào luồng `(protected)`.
3. API client gọi `getToken()` từ Clerk.
4. Token được gắn vào header:

```http
Authorization: Bearer <token>
```

5. Request gửi tới backend thông qua `EXPO_PUBLIC_API_BASE_URL`.

---

## 7) Cài đặt và chạy dự án

## 7.1 Yêu cầu môi trường

- Node.js LTS (khuyến nghị >= 18)
- npm
- Expo CLI (chạy qua `npx`)

## 7.2 Cài dependency

```bash
npm install
```

## 7.3 Cấu hình biến môi trường

Tạo file `.env.local` (hoặc cấu hình env tương đương) với các biến:

```env
EXPO_PUBLIC_API_BASE_URL=<backend_base_url>
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=<clerk_publishable_key>
```

## 7.4 Chạy ứng dụng

```bash
npm run start
```

Chạy theo nền tảng:

```bash
npm run android
npm run ios
npm run web
```

---

## 8) Scripts hữu ích

- `npm run start`: chạy Expo dev server.
- `npm run android`: mở app trên Android.
- `npm run ios`: mở app trên iOS simulator.
- `npm run web`: chạy bản web.
- `npm run lint`: kiểm tra lint theo cấu hình Expo ESLint.
- `npm run reset-project`: reset scaffold (script nội bộ của repo).

---

## 9) Lưu ý khi tích hợp backend/auth

- Cần đảm bảo backend đã deploy và đúng `EXPO_PUBLIC_API_BASE_URL`.
- Nếu thiếu `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` hoặc `EXPO_PUBLIC_API_BASE_URL`, app sẽ cảnh báo ở runtime.
- Luồng dữ liệu phụ thuộc user đã được đồng bộ giữa Clerk và backend; nếu backend chưa nhận diện user, một số API có thể trả lỗi.

---

## 10) Định hướng mở rộng

- Bổ sung test tự động (unit/integration) cho service layer.
- Hoàn thiện analytics nâng cao cho từng nhóm người dùng.
- Mở rộng AI assistant theo ngữ cảnh dữ liệu cá nhân hóa sâu hơn.

