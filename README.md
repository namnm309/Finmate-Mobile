# Finmate-Mobile

#Nhật kí build ngày 1 

-Xài expo framework tạo repo 
-Refactor làm sơ route 
-Clerk authen (login with google ) [ lưu ý check có require email , username hay phone trong clerk dashboard ko nhe nếu có thì login = google mà cung cấp thiếu thì nó vẫn cho login nhưng nó ko trả ra seasionID => ko redirect vào index đc ]
-Làm các trang UI như trong figma desgin 
-Khi mà để Mobile connect với api cần lưu ý như sau : 
>Setup EXPO_PUBLIC_API_BASE_URL trong file môi trường , api của be đã deploy 
>Check xem clerk đã sync với db chưa , nếu chưa thì ko có user , mà ko có user thì ko có data =< lỗi 500 >