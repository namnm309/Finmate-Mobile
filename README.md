# Finmate-Mobile

## Mục lục

1. [Giới thiệu](#giới-thiệu)
2. [Công nghệ chính](#công-nghệ-chính)
3. [Cấu trúc thư mục chính](#cấu-trúc-thư-mục-chính)
4. [Cách chạy dự án](#cách-chạy-dự-án)
5. [Luồng xác thực với Clerk](#luồng-xác-thực-với-clerk)
	1. [Đăng nhập / Đăng ký](#1-đăng-nhập--đăng-ký)
	2. [Khi đăng nhập thành công](#2-khi-đăng-nhập-thành-công)
	3. [Nhận token từ Clerk](#3-nhận-token-từ-clerk)
	4. [Nạp token vào header khi gọi API](#4-nạp-token-vào-header-khi-gọi-api)
6. [Lưu ý quan trọng](#lưu-ý-quan-trọng)
7. [Nhật kí build ngày 1](#nhật-kí-build-ngày-1)

## Giới thiệu

Finmate-Mobile là ứng dụng quản lý tài chính cá nhân trên nền tảng Expo + React Native. Ứng dụng cung cấp các màn hình nhập liệu, phân tích tài chính, báo cáo và các trang UI theo thiết kế Figma. Xác thực người dùng sử dụng Clerk (Email/Password và Google OAuth).

## Công nghệ chính

- Expo / React Native / TypeScript
- Expo Router cho điều hướng
- Clerk cho xác thực
- API backend đã deploy

## Cấu trúc thư mục chính

- app/: routing theo Expo Router
- components/: UI components dùng chung
- lib/: cấu hình Clerk, API client
- hooks/: custom hooks (auth, theme)
- styles/: style dùng chung

## Cách chạy dự án

1) Cài dependency:

- npm install

2) Cấu hình biến môi trường:

- EXPO_PUBLIC_API_BASE_URL
- EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY

3) Chạy ứng dụng:

- npx expo start

## Luồng xác thực với Clerk

## 1) Đăng nhập / Đăng ký

- Màn hình auth nằm ở app/(auth)/sign-in.tsx
- Có 2 luồng: Email/Password và Google OAuth (startSSOFlow)

## 2) Khi đăng nhập thành công

- Clerk tạo session, app sẽ redirect qua /(protected)/(tabs)
- Các layout ở app/_layout.tsx và app/(protected)/_layout.tsx chịu trách nhiệm bảo vệ route và chuyển hướng theo trạng thái isSignedIn

## 3) Nhận token từ Clerk

- Dùng hook useAuth() để lấy token:
- Hàm getToken() sẽ trả về JWT của Clerk

Ví dụ (logic đang dùng trong lib/api.ts):

- Trước khi call API, gọi getToken()
- Nếu có token thì gắn vào header Authorization

## 4) Nạp token vào header khi gọi API

- Hàm request trong lib/api.ts tự động gắn header:

Authorization: Bearer <token>

- Với các request không cần auth có thể truyền skipAuth = true

## Lưu ý quan trọng

- Clerk Dashboard không nên bật bắt buộc thêm username/phone nếu chỉ dùng Google OAuth, vì thiếu field sẽ không tạo được sessionId.
- Clerk cần sync user với DB trước khi gọi các API dữ liệu, nếu không backend có thể trả lỗi 500.

## Nhật kí build ngày 1 

-Xài expo framework tạo repo 
-Refactor làm sơ route 
-Clerk authen (login with google ) [ lưu ý check có require email , username hay phone trong clerk dashboard ko nhe nếu có thì login = google mà cung cấp thiếu thì nó vẫn cho login nhưng nó ko trả ra seasionID => ko redirect vào index đc ]
-Làm các trang UI như trong figma desgin 
-Khi mà để Mobile connect với api cần lưu ý như sau : 
>Setup EXPO_PUBLIC_API_BASE_URL trong file môi trường , api của be đã deploy 
>Check xem clerk đã sync với db chưa , nếu chưa thì ko có user , mà ko có user thì ko có data =< lỗi 500 >

---