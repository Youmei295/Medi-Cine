# Tiêu chí kiểm tra chất lượng

## Hợp đồng API

Chạy từ thư mục gốc sau khi sửa API hoặc tài liệu liên quan. Nếu môi trường Python còn thiếu thư viện, cài bằng lệnh đầu tiên.

```sh
python -m pip install PyYAML openapi-spec-validator jsonschema pypdf
python docs/api/validate_contract.py
git diff --check
```

Trình kiểm tra xác thực OpenAPI 3.1, tham chiếu, ví dụ schema, liên kết tài liệu và truy vết 20 use case cùng 90 luồng thay thế. Khi đổi hành vi, đối chiếu các mục liên quan trong [hướng dẫn API](../../docs/api/API_GUIDE.md), [truy vết](../../docs/api/TRACEABILITY.md) và [kịch bản hợp đồng](../../docs/api/CONTRACT_SCENARIOS.md).

## Backend Rust và kiểm thử tích hợp

Với thay đổi Rust, kiểm tra định dạng, build và bộ kiểm thử Cargo. Khi sửa khởi động hoặc kết nối cơ sở dữ liệu, kiểm tra `/health` và thử `/ready` khi PostgreSQL phản hồi và khi kết nối lỗi. Áp dụng các mục sau khi luồng nghiệp vụ liên quan đã được triển khai.

| Thay đổi | Bằng chứng phù hợp |
| --- | --- |
| Giao diện hoặc API | Chạy kịch bản chính và lỗi liên quan. Với thao tác có quyền hoặc quyền sở hữu, kiểm tra cả trường hợp bị từ chối. |
| Dữ liệu hoặc giao dịch | Thử migration trên dữ liệu mẫu có sẵn. Kiểm tra tính nhất quán sau lỗi, retry và tranh chấp đồng thời nếu có liên quan. |
| Tích hợp và phát hành | Ghi phiên bản, môi trường và kết quả của kịch bản liên quan. Dùng sandbox với dữ liệu mẫu cho thanh toán. Đối chiếu các NFR áp dụng trong tài liệu truy vết. |

Ghi kết quả là `PASS`, `FAIL` hoặc `NOT RUN` kèm lệnh, bằng chứng hoặc lý do. Kiểm thử HTTP, cơ sở dữ liệu, tải và độ trễ cần có luồng triển khai và môi trường tương ứng.
