export type Service = {
  id: string;
  name: string;
  description: string;
  href: string;
  permission: string;
};

/** Same-origin MoDMoS service links for the 9-dot launcher */
export const services: Service[] = [
  {
    id: 'admin',
    name: 'Admin',
    description: 'จัดการผู้ใช้ บทบาท และสิทธิ์',
    href: '/admin',
    permission: 'admin:access',
  },
  {
    id: 'investment',
    name: 'บันทึกการลงทุน',
    description: 'แลกเงิน ซื้อขายหุ้น ปันผล',
    href: '/Investment/',
    permission: 'service:investment',
  },
  {
    id: 'gold-agent',
    name: 'Gold Agent',
    description: 'ราคาทองคำ สัญญาณเทรด',
    href: '/gold/',
    permission: 'service:gold-agent',
  },
  {
    id: 'trip-planner',
    name: 'Trip Planner',
    description: 'วางแผนทริปหลายวัน ส่งออก Word',
    href: '/trip/',
    permission: 'service:trip-planner',
  },
  {
    id: 'discord',
    name: 'Discord Bot',
    description: 'สถานะบอทและล็อก',
    href: '/discord',
    permission: 'service:discord',
  },
];
