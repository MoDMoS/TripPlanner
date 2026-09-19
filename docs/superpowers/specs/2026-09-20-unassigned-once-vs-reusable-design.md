# Step 2 — Unassigned: once vs reusable

อัปเดต: 2026-09-20  
Status: Implemented

## Goal

Split Organize Days **Unassigned** into two pools so a place can be reused across days after it has been used once.

## Behavior

| Pool | Contents | Notes |
|------|----------|--------|
| **ใช้ซ้ำได้** (บน) | `allowReuse` หรืออยู่บน ≥ 1 วัน | ลากจากครั้งเดียวมาวางได้ · ปุ่มเปิด/ปิด |
| **ใช้ครั้งเดียว** (ล่าง) | ยังไม่เคยใช้ · `allowReuse=false` | ลากไปซ้ำได้หรือไปวัน · ปุ่มเปิด/ปิด |

- Assign ไปวัน → ตั้ง `allowReuse=true` อัตโนมัติ
- Remove จากวันสุดท้าย → `allowReuse=false` กลับใช้ครั้งเดียว
- Day buttons ซ่อนวันที่มีสถานที่นั้นอยู่แล้ว

## Follow-up (2026-09-20 UI)

- **ใช้ซ้ำได้** อยู่ด้านบน · **ใช้ครั้งเดียว** ด้านล่าง
- ลากระหว่างสองบล็อกได้ (`TripPlace.allowReuse`) และลากไปวางที่วันได้
- ปุ่มเปิด/ปิดแต่ละบล็อก (จำใน `localStorage`)
- Remove จากวันสุดท้าย → `allowReuse=false` กลับใช้ครั้งเดียว
